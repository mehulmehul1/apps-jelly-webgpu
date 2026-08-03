/**
 * AnemoneArchetype.ts
 *
 * Concrete CreatureArchetype for sea anemone creatures with column stalk +
 * tentacle crown topology.  Uses Particulate.js for soft-body physics and
 * Three.js for rendering.
 *
 * Stalk:   stacked rings from base disc to crown (taper-controlled).
 * Crown:   tentacle chains radiating from the top ring(s).
 * Motion:  sinusoidal stalk sway + traveling tentacle wave.
 *
 * Tier 1 (Anatomy): mesenteries (radial septa), sphincter ring, column
 *   regions (scapus/scapulus/capitulum), oral disc (peristome + actinopharynx),
 *   and pre-allocated acontia chains.
 * Tier 2 (Behavior): IDLE/FEEDING/WITHDRAWING/AGONISTIC state machine with
 *   hysteresis, driving sphincter contraction and acontia ejection.
 *
 * Registered once on import so getArchetype('anemone') resolves immediately.
 */

import * as THREE from 'three/webgpu';
import * as Particulate from 'particulate';
import {
  CreatureArchetype,
  BodyData,
  PhysicsConfig,
  SeededRNG,
  UnitMaterialPack,
  MeshOptions,
  UnitRuntime,
} from './CreatureArchetype';
import type { CreatureSpec, AnemoneSpec } from '../../jellyfish/creatures/CreatureSpec';
import { InterpolatedPhysicalMaterial, InterpolatedLineMaterial } from '../../jellyfish/materials';
import { LookConfig } from '../../editor/look-presets';
import { registerArchetype } from './archetypeRegistry';
import {
  createTentacleController,
  TentacleController,
  TentacleProfileKey,
  TENTACLE_PROFILES,
} from './TentaclePhysics';
import { computeNormals } from './computeNormals';

// ── Data structures ───────────────────────────────────────────────────────

interface RingData {
  /** Vertex index of the first particle in this ring. */
  start: number;
  /** Number of particles in this ring (= particlesPerRing). */
  count: number;
  /** Y-position of the ring in world space. */
  yPos: number;
  /** Base radius of this ring. */
  radius: number;
}

/** A single radial septum (mesentery) spanning the column. */
interface MesenteryData {
  /** Ordinal index of this mesentery (used for phase offsets). */
  index: number;
  /** Retractor muscle morphology. */
  retractorType: 'diffuse' | 'restricted' | 'circumscribed' | 'palmate';
  /** Particle indices along the septum, ordered pedal → oral. */
  particleIndices: number[];
  /** True when this mesentery reaches the actinopharynx ring. */
  perfect: boolean;
}

/** Dynamic sphincter ring at the oral-disc margin. */
interface SphincterData {
  type: 'endodermal' | 'mesogleal' | 'absent' | 'marginal';
  /** Contraction strength 0.0-1.0. */
  strength: number;
  /** Uncontracted ring radius. */
  restRadius: number;
  /** Current animated ring radius. */
  currentRadius: number;
  /** The ring DistanceConstraint mutated by setDistance(). */
  constraint: Particulate.DistanceConstraint;
  /** Hard contraction flag (set externally). */
  isContracted: boolean;
  /** Smoothed contraction target (driven by state machine). */
  targetContracted: boolean;
}

/** One differentiated column region. */
interface ColumnRegionData {
  type: 'scapus' | 'scapulus' | 'capitulum';
  /** Particle indices belonging to this region. */
  particleIndices: number[];
  /** Particle weight for this region. */
  weight: number;
  /** Relative constraint density (informational; drives verrucae). */
  constraintDensity: number;
  /** Optional verrucae particle indices on the scapus. */
  verrucae?: { particleIndices: number[] };
}

/** Oral-disc anatomy. */
interface OralDiscData {
  /** Particles forming the mouth slit / opening. */
  mouthParticleIndices: number[];
  /** Elevated peristome ring particles. */
  peristomeParticleIndices: number[];
  /** Siphonoglyph groove particles (UV-only, no extra geometry). */
  siphonoglyphParticleIndices: number[];
  /** Internal actinopharynx tube constraint. */
  actinopharynxConstraint?: Particulate.DistanceConstraint;
}

/** Pre-allocated folded acontia chain at a cinclide row. */
interface AcontiaChainData {
  /** First particle index of the folded chain. */
  startIndex: number;
  /** Number of particles in the chain. */
  count: number;
  /** Whether the chain is currently ejecting. */
  isEjected: boolean;
  /** 0..1 ejection progress. */
  ejectionProgress: number;
  /** Direction + magnitude of the ejection force. */
  ejectionForce: THREE.Vector3;
}

// ── Tier 2: Behavioral state machine ──────────────────────────────────────

type AnemoneState = 'IDLE' | 'FEEDING' | 'WITHDRAWING' | 'AGONISTIC';
type AnemoneTrigger = 'none' | 'prey_contact' | 'threat' | 'disturbance' | 'recovery';

interface AnemoneBehaviorState {
  currentState: AnemoneState;
  stateTimer: number;
  /** Prevents rapid state flipping. */
  hysteresisTimer: number;
  trigger: AnemoneTrigger;
  /** Accumulated interaction force (sustained-contact detection). */
  interactionAccumulator: number;
  lastInteractionForce: number;
  /** Guards acontia ejection to once per AGONISTIC episode. */
  acontiaTriggered: boolean;
}

/** Transition helper with hysteresis guard. */
function transitionTo(
  b: AnemoneBehaviorState,
  to: AnemoneState,
  trigger: AnemoneTrigger,
): void {
  if (b.currentState === to) return;
  b.currentState = to;
  b.stateTimer = 0;
  b.trigger = trigger;
  b.hysteresisTimer = 1.5;
}

interface AnemoneGeometryData {
  spec: AnemoneSpec;
  system: Particulate.ParticleSystem;
  /** Undeformed pose; waves are evaluated from this every physics tick. */
  restPositions: Float32Array;
  /** Shared buffer attribute backed by system.positions. */
  position: THREE.BufferAttribute;
  /** Shared buffer attribute backed by system.positionsPrev. */
  positionPrev: THREE.BufferAttribute;
  /** Persistent smoothed normal buffer for the stalk; refreshed per frame. */
  normalAttr?: THREE.BufferAttribute;
  faces: {
    /** Index buffer for the stalk triangle mesh. */
    stalk: number[];
    /** Index buffer for tentacle line segments. */
    tentacles: number[];
  };
  links: {
    /** Ring-to-ring skin edge indices. */
    stalk: number[];
    /** Tentacle chain edge indices. */
    tentacles: number[];
    /** All structural constraint indices (inner framework). */
    inner: number[];
  };
  /** Per-ring metadata used by animateBody. */
  rings: RingData[];
  /** Vertex index of the pinned base-center particle. */
  pinCenter: number;
  /** Number of particles in each ring (uniform across all rings). */
  particlesPerRing: number;

  // Tier 2: Tentacle Physics (Larboulette et al. 2009)
  /** Tentacle physics controller using articulated skeletons + fluid singularities. */
  tentacleController?: TentacleController;
  /** References to tentacle meshes for positionPrev updates. */
  tentacleMeshRefs?: THREE.LineSegments[];
  /** Tentacle configs consumed by createTentacleController. */
  tentacleConfigs: Array<{
    id: string;
    basePosition: THREE.Vector3;
    baseTangent: THREE.Vector3;
    profileKey: TentacleProfileKey;
  }>;

  // Tier 1: Anatomy
  /** Radial septa (mesenteries). */
  mesenteries?: MesenteryData[];
  /** Oral-disc margin sphincter ring. */
  sphincter?: SphincterData;
  /** Differentiated column regions. */
  columnRegions?: ColumnRegionData[];
  /** Oral-disc anatomy. */
  oralDisc?: OralDiscData;
  /** Pre-allocated folded acontia chains. */
  acontiaChains?: AcontiaChainData[];

  // Tier 2: Behavior
  /** Behavioral state machine. */
  behavior?: AnemoneBehaviorState;
}

// ── Geometry helpers (mutable array pattern from JellyfishGeometry) ───────

/** Push a ring of particles centred at (cx, cy, cz) into `verts`. */
function pushRing(
  verts: number[],
  cx: number, cy: number, cz: number,
  radius: number,
  segments: number,
): void {
  const step = (Math.PI * 2) / segments;
  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    verts.push(
      cx + Math.cos(angle) * radius,
      cy,
      cz + Math.sin(angle) * radius,
    );
  }
}

/** Triangulate a quad strip between two rings into `out`. */
function pushRingFaces(r0: number, r1: number, n: number, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a = r0 + i;
    const b = r0 + (i + 1) % n;
    const c = r1 + (i + 1) % n;
    const d = r1 + i;
    out.push(a, b, c, c, d, a);
  }
}

/** Fan triangles from a center vertex to a ring. */
function pushRadialFan(center: number, ringStart: number, n: number, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a = ringStart + i;
    const b = ringStart + (i + 1) % n;
    out.push(center, a, b);
  }
}

/** Indices for a closed loop (a-b-c-...-z-a). */
function pushLoopIndices(start: number, count: number, out: number[]): void {
  for (let i = 0; i < count; i++) {
    const a = start + i;
    const b = start + (i + 1) % count;
    out.push(a, b);
  }
}

/** Pairwise indices connecting two rings. */
function pushRingPairIndices(r0: number, r1: number, n: number, out: number[]): void {
  for (let i = 0; i < n; i++) {
    out.push(r0 + i, r1 + i);
  }
}

/** Vertical spine indices: connect each particle to the one directly above. */
function pushVerticalSpineIndices(
  ring0Start: number,
  ring1Start: number,
  n: number,
  out: number[],
): void {
  for (let i = 0; i < n; i++) {
    out.push(ring0Start + i, ring1Start + i);
  }
}

// ── Archetype ─────────────────────────────────────────────────────────────

export const anemoneArchetype: CreatureArchetype = {
  id: 'anemone',
  label: 'Anemone',

  // ── buildBody ──────────────────────────────────────────────────────────
  buildBody(spec: CreatureSpec, _config: PhysicsConfig, rng: SeededRNG): BodyData {
    const anemoneSpec = spec as AnemoneSpec;
    const { stalk, tentacles, sway, baseShape } = anemoneSpec;
    const stalkHeight = Math.max(1, stalk.height);
    const stalkWidth = Math.max(0.5, stalk.width);

    // Clamp particle budget.  Wider stalks = more rim particles.
    const particlesPerRing = Math.max(8, Math.min(16, Math.round(stalk.width * 0.6 + 6)));
    const ringCount = Math.max(2, stalk.segments);
    const ringHeight = stalk.height / Math.max(1, ringCount - 1);

    // Temporary mutable arrays (same pattern as JellyfishGeometry).
    const verts: number[] = [];
    const queuedConstraints: Particulate.Constraint[] = [];
    const facesStalk: number[] = [];
    const facesTentacles: number[] = [];
    const linksStalk: number[] = [];
    const linksTentacles: number[] = [];
    const linksInner: number[] = [];
    const rings: RingData[] = [];

    // ── 1. Base center pin ──────────────────────────────────────────────
    const pinCenter = 0;
    verts.push(0, 0, 0);

    // ── 2. Stalk rings ──────────────────────────────────────────────────
    for (let i = 0; i < ringCount; i++) {
      const t = ringCount > 1 ? i / (ringCount - 1) : 0;

      // Taper: 0 = column, >0 = narrower at top, <0 = wider at top.
      const taperFactor = 1 - t * Math.max(-0.8, Math.min(0.9, stalk.taper));
      const radius = Math.max(0.5, stalk.width * taperFactor);
      const yPos = i * ringHeight;

      const start = verts.length / 3;
      pushRing(verts, 0, yPos, 0, radius, particlesPerRing);
      rings.push({ start, count: particlesPerRing, yPos, radius });

      // Ring perimeter constraint (loop).
      const loopIdx: number[] = [];
      pushLoopIndices(start, particlesPerRing, loopIdx);
      queuedConstraints.push(
        Particulate.DistanceConstraint.create([radius * 0.05, radius * 3.0], loopIdx),
      );
      pushLoopIndices(start, particlesPerRing, linksInner);

      // Ring-to-ring skin (horizontal adjacency).
      if (i > 0) {
        const prev = rings[i - 1];
        const dy = yPos - prev.yPos;
        const dr = radius - prev.radius;
        const dist = Math.sqrt(dy * dy + dr * dr) || 0.001;
        const skinIdx: number[] = [];
        pushRingPairIndices(prev.start, start, particlesPerRing, skinIdx);
        queuedConstraints.push(
          Particulate.DistanceConstraint.create([dist * 0.25, dist * 1.8], skinIdx),
        );
        pushRingPairIndices(prev.start, start, particlesPerRing, linksStalk);
        pushRingPairIndices(prev.start, start, particlesPerRing, linksInner);

        // Stalk quad faces.
        pushRingFaces(prev.start, start, particlesPerRing, facesStalk);

        // Vertical spine (connect corresponding particles between rings).
        const spineIdx: number[] = [];
        pushVerticalSpineIndices(prev.start, start, particlesPerRing, spineIdx);
        queuedConstraints.push(
          Particulate.DistanceConstraint.create([ringHeight * 0.3, ringHeight * 2.0], spineIdx),
        );
        pushVerticalSpineIndices(prev.start, start, particlesPerRing, linksInner);
      }

      // Base disc / pedestal.
      if (i === 0) {
        if (baseShape === 'flat' || baseShape === 'conical') {
          const radialIdx: number[] = [];
          for (let j = 0; j < particlesPerRing; j++) {
            radialIdx.push(pinCenter, start + j);
          }
          const baseRadius = baseShape === 'conical' ? radius * 0.6 : radius;
          queuedConstraints.push(
            Particulate.DistanceConstraint.create(
              [baseRadius * 0.2, baseRadius * 1.6],
              radialIdx,
            ),
          );
          // Fan faces for the base disc.
          pushRadialFan(pinCenter, start, particlesPerRing, facesStalk);
        } else {
          // 'columnar': just connect bottom ring directly to pin with short radial constraints.
          const radialIdx: number[] = [];
          for (let j = 0; j < particlesPerRing; j++) {
            radialIdx.push(pinCenter, start + j);
          }
          queuedConstraints.push(
            Particulate.DistanceConstraint.create([radius * 0.3, radius * 1.5], radialIdx),
          );
          pushRadialFan(pinCenter, start, particlesPerRing, facesStalk);
        }
      }
    }

    // ── 3. Tentacle crown ────────────────────────────────────────────────
    const topRing = rings[ringCount - 1];

    // Collect attachment indices based on arrangement.
    let attachIndices: number[] = [];

    if (tentacles.arrangement === 'ring') {
      // One tentacle per top-ring particle.
      for (let j = 0; j < particlesPerRing; j++) {
        attachIndices.push(topRing.start + j);
      }
    } else if (tentacles.arrangement === 'rows' && (tentacles.rows ?? 0) > 0) {
      // Multiple rows: use the top N rings.
      const rows = Math.min(tentacles.rows!, ringCount);
      for (let r = 0; r < rows; r++) {
        const ri = ringCount - 1 - r; // top-most ring first
        if (ri < 0) break;
        const ringData = rings[ri];
        for (let j = 0; j < particlesPerRing; j++) {
          attachIndices.push(ringData.start + j);
        }
      }
    } else {
      // 'random' (or fallback): distribute over top-ring particles.
      const count = Math.min(particlesPerRing * 2, 24);
      const used = new Set<number>();
      for (let t = 0; t < count && used.size < particlesPerRing; t++) {
        const idx = Math.floor(rng.random() * particlesPerRing);
        const particleIdx = topRing.start + idx;
        if (!used.has(idx)) {
          used.add(idx);
          attachIndices.push(particleIdx);
        }
      }
    }

    // Deduplicate and limit.
    attachIndices = [...new Set(attachIndices)];

    // ════════════════════════════════════════════════════════════════════════════
    // Tier 2: Tentacle Physics (Larboulette et al. 2009) — Articulated Skeleton + Fluid Singularities
    // ════════════════════════════════════════════════════════════════════════════

    // Create tentacle configs for the new physics system.
    const tentacleConfigs: Array<{
      id: string;
      basePosition: THREE.Vector3;
      baseTangent: THREE.Vector3;
      profileKey: TentacleProfileKey;
    }> = [];

    // Profile is derived from the preset id (matches TENTACLE_PROFILES keys).
    const profileKey: TentacleProfileKey = anemoneSpec.id in TENTACLE_PROFILES
      ? (anemoneSpec.id as TentacleProfileKey)
      : 'actinia';

    for (const baseIdx of attachIndices) {
      // Direction: outward from centre.
      const outX = verts[baseIdx * 3];
      const outZ = verts[baseIdx * 3 + 2];
      const outLen = Math.sqrt(outX * outX + outZ * outZ) || 1;
      const nx = outX / outLen;
      const nz = outZ / outLen;

      tentacleConfigs.push({
        id: `tentacle_${attachIndices.indexOf(baseIdx)}`,
        basePosition: new THREE.Vector3(verts[baseIdx * 3], verts[baseIdx * 3 + 1], verts[baseIdx * 3 + 2]),
        baseTangent: new THREE.Vector3(nx, 0, nz).normalize(),
        profileKey,
      });
    }

    // ── 4. Tier 1: Mesenteries (radial septa) ────────────────────────────
    const mesenteries: MesenteryData[] = [];
    if (anemoneSpec.mesenteries) {
      const cycles = Math.max(1, anemoneSpec.mesenteries.cycles);
      const perfectCycles = Math.max(0, Math.min(cycles, anemoneSpec.mesenteries.perfectCycles));
      const retractorType = anemoneSpec.mesenteries.retractorType;
      const mesenteryCount = cycles * 2;
      const mesenterySegments = 4; // particles per septum chain

      for (let m = 0; m < mesenteryCount; m++) {
        const angle = (m / mesenteryCount) * Math.PI * 2;
        const isPerfect = m < perfectCycles * 2;
        // Perfect mesenteries reach the actinopharynx ring; imperfect terminate mid-column.
        const topY = isPerfect ? stalkHeight : stalkHeight * 0.5;
        const start = verts.length / 3;
        const particleIndices: number[] = [];
        const chainIdx: number[] = [];
        let prevX = 0, prevY = 0, prevZ = 0;

        for (let s = 0; s < mesenterySegments; s++) {
          const t = s / (mesenterySegments - 1);
          const y = t * topY;
          const r = Math.max(0.5, stalkWidth * 0.5 * (1 - t * 0.25));
          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          verts.push(x, y, z);
          particleIndices.push(start + s);
          if (s > 0) {
            chainIdx.push(start + s - 1, start + s);
            const dx = x - prevX, dy = y - prevY, dz = z - prevZ;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
            queuedConstraints.push(
              Particulate.DistanceConstraint.create([dist * 0.5, dist * 1.5], [start + s - 1, start + s]),
            );
          }
          prevX = x; prevY = y; prevZ = z;
        }

        mesenteries.push({ index: m, retractorType, particleIndices, perfect: isPerfect });
      }
    }

    // ── 5. Tier 1: Sphincter ring ────────────────────────────────────────
    let sphincter: SphincterData | undefined;
    if (anemoneSpec.sphincter && anemoneSpec.sphincter.type !== 'absent') {
      const sphCount = Math.min(16, particlesPerRing);
      const sphStart = verts.length / 3;
      const sphRadius = Math.max(0.5, topRing.radius);
      const sphY = topRing.yPos;
      pushRing(verts, 0, sphY, 0, sphRadius, sphCount);

      const loopIdx: number[] = [];
      pushLoopIndices(sphStart, sphCount, loopIdx);
      // Type-dependent initial range (overwritten each frame by setDistance).
      const range = anemoneSpec.sphincter.type === 'endodermal'
        ? [sphRadius * 0.15, sphRadius * 0.25]
        : anemoneSpec.sphincter.type === 'mesogleal'
          ? [sphRadius * 0.3, sphRadius * 0.6]
          : [sphRadius * 0.2, sphRadius * 0.4];
      const sphConstraint = Particulate.DistanceConstraint.create(range, loopIdx);
      queuedConstraints.push(sphConstraint);

      sphincter = {
        type: anemoneSpec.sphincter.type,
        strength: anemoneSpec.sphincter.strength,
        restRadius: sphRadius,
        currentRadius: sphRadius,
        constraint: sphConstraint,
        isContracted: false,
        targetContracted: false,
      };
    }

    // ── 6. Tier 1: Acontia chains (pre-allocated folded) ─────────────────
    const acontiaChains: AcontiaChainData[] = [];
    if (anemoneSpec.acontia?.present && anemoneSpec.acontia.cinclideRows > 0) {
      const rows = Math.min(anemoneSpec.acontia.cinclideRows, 4);
      const perRow = 4;
      const chainLen = 4;
      const ejectionForce = Math.max(0.1, anemoneSpec.acontia.ejectionForce);
      for (let r = 0; r < rows; r++) {
        for (let p = 0; p < perRow; p++) {
          const angle = (p / perRow) * Math.PI * 2;
          const y = stalkHeight * (0.3 + 0.15 * r);
          const start = verts.length / 3;
          // Folded chain: particles clustered near the column surface.
          for (let k = 0; k < chainLen; k++) {
            const r0 = stalkWidth * 0.5 * (0.9 + 0.05 * k);
            verts.push(Math.cos(angle) * r0, y, Math.sin(angle) * r0);
          }
          acontiaChains.push({
            startIndex: start,
            count: chainLen,
            isEjected: false,
            ejectionProgress: 0,
            ejectionForce: new THREE.Vector3(Math.cos(angle), 0.5, Math.sin(angle)).multiplyScalar(ejectionForce),
          });
        }
      }
    }

    // ── 7. Tier 1: Oral disc (peristome + actinopharynx) ─────────────────
    let oralDisc: OralDiscData | undefined;
    if (anemoneSpec.oralDisc) {
      const peristomeCount = Math.min(12, particlesPerRing);
      const peristomeStart = verts.length / 3;
      const peristomeRadius = Math.max(0.5, topRing.radius * 0.5);
      const peristomeY = topRing.yPos + anemoneSpec.oralDisc.peristomeHeight * stalkHeight;
      pushRing(verts, 0, peristomeY, 0, peristomeRadius, peristomeCount);

      const peristomeIdx: number[] = [];
      for (let j = 0; j < peristomeCount; j++) peristomeIdx.push(peristomeStart + j);
      const loopIdx: number[] = [];
      pushLoopIndices(peristomeStart, peristomeCount, loopIdx);
      queuedConstraints.push(
        Particulate.DistanceConstraint.create([peristomeRadius * 0.2, peristomeRadius * 1.5], loopIdx),
      );

      // Actinopharynx: internal tube from peristome down to cavity floor.
      const tubeSegments = 3;
      const tubeStart = verts.length / 3;
      const tubeIdx: number[] = [];
      const tubeDepth = anemoneSpec.oralDisc.actinopharynxDepth * stalkHeight;
      for (let s = 0; s < tubeSegments; s++) {
        const t = s / (tubeSegments - 1);
        const y = peristomeY - t * tubeDepth;
        verts.push(0, y, 0);
        if (s > 0) tubeIdx.push(tubeStart + s - 1, tubeStart + s);
      }
      const tubeConstraint = Particulate.DistanceConstraint.create(
        [tubeDepth * 0.2, tubeDepth * 1.2],
        tubeIdx,
      );
      queuedConstraints.push(tubeConstraint);

      // Mouth slit = the peristome ring (the opening). Siphonoglyphs are UV-only.
      oralDisc = {
        mouthParticleIndices: peristomeIdx,
        peristomeParticleIndices: peristomeIdx,
        siphonoglyphParticleIndices: [],
        actinopharynxConstraint: tubeConstraint,
      };
    }

    // ── 8. Create particle system ────────────────────────────────────────
    const system = Particulate.ParticleSystem.create(verts, 2);

    for (const constraint of queuedConstraints) {
      system.addConstraint(constraint);
    }

    // Set weights — base pinned, stalk gets lighter toward the top,
    // tentacle tips are lightest.
    for (let i = 0; i < verts.length / 3; i++) {
      system.setWeight(i, 1.0);
    }
    system.setWeight(pinCenter, 0); // immovable

    // ── 9. Tier 1: Column regions (distinct weights + constraint density) ─
    const columnRegions: ColumnRegionData[] = [];
    if (anemoneSpec.columnRegions) {
      const { scapusHeightRatio, scapulusHeightRatio, capitulumHeightRatio } = anemoneSpec.columnRegions;
      const total = (scapusHeightRatio + scapulusHeightRatio + capitulumHeightRatio) || 1;
      const scapusTop = scapusHeightRatio / total;
      const scapulusTop = (scapusHeightRatio + scapulusHeightRatio) / total;

      const scapusIdx: number[] = [];
      const scapulusIdx: number[] = [];
      const capitulumIdx: number[] = [];

      for (const ring of rings) {
        const frac = ring.yPos / stalkHeight;
        for (let j = 0; j < ring.count; j++) {
          const idx = ring.start + j;
          if (frac <= scapusTop) {
            scapusIdx.push(idx);
            system.setWeight(idx, 1.5);
          } else if (frac <= scapulusTop) {
            scapulusIdx.push(idx);
            system.setWeight(idx, 1.0);
          } else {
            capitulumIdx.push(idx);
            system.setWeight(idx, 0.6);
          }
        }
      }

      let verrucae: { particleIndices: number[] } | undefined;
      if (anemoneSpec.columnRegions.verrucae?.present) {
        verrucae = { particleIndices: scapusIdx.filter((_, i) => i % 2 === 0) };
      }

      columnRegions.push(
        { type: 'scapus', particleIndices: scapusIdx, weight: 1.5, constraintDensity: 1.0, verrucae },
        { type: 'scapulus', particleIndices: scapulusIdx, weight: 1.0, constraintDensity: 0.8 },
        { type: 'capitulum', particleIndices: capitulumIdx, weight: 0.6, constraintDensity: 0.5 },
      );
    }

    // Base pin constraint.
    const pinConstraint = Particulate.PointConstraint.create([0, 0, 0], pinCenter);
    system.addPinConstraint(pinConstraint);

    // ── 10. Build buffer geometry ────────────────────────────────────────
    const geometry = new THREE.BufferGeometry();
    const position = new THREE.BufferAttribute(system.positions, 3);
    const positionPrev = new THREE.BufferAttribute(system.positionsPrev, 3);

    geometry.setAttribute('position', position);
    geometry.setAttribute('positionPrev', positionPrev);

    // Empty normal attribute to satisfy TSL requirements.
    const normals = new Float32Array(system.positions.length);
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    const geometryData: AnemoneGeometryData = {
      spec: anemoneSpec,
      system,
      restPositions: new Float32Array(system.positions),
      position,
      positionPrev,
      faces: {
        stalk: facesStalk,
        tentacles: facesTentacles,
      },
      links: {
        stalk: linksStalk,
        tentacles: linksTentacles,
        inner: linksInner,
      },
      rings,
      pinCenter,
      particlesPerRing,
      tentacleConfigs,
      mesenteries,
      sphincter,
      columnRegions,
      oralDisc,
      acontiaChains,
      behavior: {
        currentState: 'IDLE',
        stateTimer: 0,
        hysteresisTimer: 0,
        trigger: 'none',
        interactionAccumulator: 0,
        lastInteractionForce: 0,
        acontiaTriggered: false,
      },
    };

    return {
      geometryData,
      physicsComponents: {},
      animationState: {
        swayAmplitude: sway.amplitude,
        swayFrequency: sway.frequency,
        swayPhase: sway.phase,
        pulseAmplitude: 1.0,  // full sway; the spec already controls amplitude
      },
    } as BodyData;
  },

  // ── createMaterials ────────────────────────────────────────────────────
  createMaterials(lookConfig: LookConfig, refractionTarget: unknown): UnitMaterialPack {
    return { lookConfig, refractionTarget } as unknown as UnitMaterialPack;
  },

  // ── buildMeshes ────────────────────────────────────────────────────────
  buildMeshes(
    data: BodyData,
    materials: UnitMaterialPack,
    _options: MeshOptions,
  ): UnitRuntime[] {
    const gd = data.geometryData as AnemoneGeometryData;
    const look = materials.lookConfig as LookConfig | undefined;

    const group = new THREE.Group();

    // ── Stalk mesh ──────────────────────────────────────────────────────
    const stalkGeo = new THREE.BufferGeometry();
    stalkGeo.setAttribute('position', gd.position);
    stalkGeo.setAttribute('positionPrev', gd.positionPrev);
    stalkGeo.setIndex(gd.faces.stalk);
    stalkGeo.computeVertexNormals();
    // Keep the shared normal buffer so animateBody can refresh it every frame
    // as the stalk sways. The stalk mesh references this attribute directly.
    gd.normalAttr = stalkGeo.attributes.normal as THREE.BufferAttribute;

    const stalkMaterial = new InterpolatedPhysicalMaterial({
      color: look?.bulb.colorA ?? 0xE87A9B,
      emissive: look?.bulb.colorB ?? 0x3d1025,
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: look?.bulb.opacity ?? 0.85,
      roughness: 0.36,
      metalness: 0.05,
      clearcoat: 0.4,
      clearcoatRoughness: 0.28,
      side: THREE.DoubleSide,
    });
    const stalkMesh = new THREE.Mesh(stalkGeo, stalkMaterial);
    group.add(stalkMesh);

    // ── Tentacle mesh using new TentaclePhysics (Larboulette et al. 2009) ────────
    let tentMaterial: InterpolatedLineMaterial | undefined;
    const tentacleConfigs = gd.tentacleConfigs;

    if (tentacleConfigs && tentacleConfigs.length > 0) {
      // Create tentacle controller with articulated skeletons + fluid singularities.
      const tentacleController = createTentacleController(tentacleConfigs);
      tentacleController.setBehavior('ambient');

      // Store controller on geometry data for animateBody.
      gd.tentacleController = tentacleController;

      // Create meshes from controller.
      const meshes = tentacleController.getMeshes();
      const tentacleMeshRefs: THREE.LineSegments[] = [];
      for (const meshData of meshes) {
        const tentGeo = new THREE.BufferGeometry();
        tentGeo.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
        tentGeo.setAttribute('positionPrev', new THREE.BufferAttribute(meshData.positionsPrev, 3));
        tentGeo.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
        tentGeo.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
        tentGeo.setIndex(new THREE.BufferAttribute(meshData.indices, 1));

        const tentMaterial = new InterpolatedLineMaterial({
          color: look?.tentacle.color ?? 0xFDA4BA,
          transparent: true,
          opacity: look?.tentacle.opacity ?? 0.55,
          blending: THREE.AdditiveBlending,
          depthTest: true,
          depthWrite: false,
        });
        const tentMesh = new THREE.LineSegments(tentGeo, tentMaterial);
        group.add(tentMesh);
        tentacleMeshRefs.push(tentMesh);
      }

      // Store mesh refs on geometry data for animateBody positionPrev updates.
      gd.tentacleMeshRefs = tentacleMeshRefs;
    }

    return [
      {
        id: 'anemone',
        geometryData: gd,
        group,
        stalkMaterial,
        tentMaterial,
      } as unknown as UnitRuntime,
    ];
  },

  // ── animateBody ────────────────────────────────────────────────────────
  animateBody(data: BodyData, time: number, delta: number, amplitude: number): void {
    const gd = data.geometryData as AnemoneGeometryData;
    const spec = gd.spec;
    const positions = gd.system.positions;
    const previous = gd.system.positionsPrev;
    const rest = gd.restPositions;
    const particleCount = positions.length / 3;

    const swayAmp = spec.sway.amplitude * amplitude * 0.4;
    const swayFreq = spec.sway.frequency;
    const stalkHeight = Math.max(1, spec.stalk.height);
    const dt = delta * 0.001;

    // ════════════════════════════════════════════════════════════════════════════
    // Tier 2: Behavioral state machine (hysteresis-guarded)
    // ════════════════════════════════════════════════════════════════════════════
    const behavior = gd.behavior;
    if (behavior) {
      behavior.stateTimer += dt;
      behavior.hysteresisTimer = Math.max(0, behavior.hysteresisTimer - dt);
      // Decay sustained-interaction accumulator so it only stays high under
      // continuous contact.
      behavior.interactionAccumulator = Math.max(0, behavior.interactionAccumulator - dt * 0.4);

      // Time-based exits back to IDLE (recovery is slow).
      switch (behavior.currentState) {
        case 'FEEDING':
          if (behavior.stateTimer > 12) transitionTo(behavior, 'IDLE', 'recovery');
          break;
        case 'WITHDRAWING':
          if (behavior.stateTimer > 8) transitionTo(behavior, 'IDLE', 'recovery');
          break;
        case 'AGONISTIC':
          if (behavior.stateTimer > 30) transitionTo(behavior, 'IDLE', 'recovery');
          // Re-arm the acontia capsule flag the moment defense ends (handled on
          // exit below), but never retrigger mid-episode.
          break;
        default:
          break;
      }

      // Tier 2: acontia ejection. While defensive (AGONISTIC) we fire the
      // pre-allocated folded acontia chains out through the cinclides exactly
      // once per episode, then re-arm once the anemone leaves defense.
      if (behavior.currentState === 'AGONISTIC') {
        if (!behavior.acontiaTriggered && gd.acontiaChains) {
          for (const acontium of gd.acontiaChains) acontium.isEjected = true;
          behavior.acontiaTriggered = true;
        }
      } else {
        behavior.acontiaTriggered = false;
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Tier 2: Tentacle Physics (Larboulette et al. 2009) — Articulated Skeleton + Fluid Singularities
    // ════════════════════════════════════════════════════════════════════════════

    // Update tentacle physics controller (articulated skeletons + fluid singularities).
    if (gd.tentacleController) {
      gd.tentacleController.update(delta * 0.001, time);

      // Regenerate mesh data from updated skeleton and upload to buffer geometries.
      const tentacleMeshRefs = gd.tentacleMeshRefs;
      const newMeshes = gd.tentacleController.getMeshes();
      if (tentacleMeshRefs && newMeshes.length === tentacleMeshRefs.length) {
        for (let ti = 0; ti < tentacleMeshRefs.length; ti++) {
          const mesh = tentacleMeshRefs[ti];
          const meshData = newMeshes[ti];
          if (mesh && mesh.geometry) {
            const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | null;
            const posPrevAttr = mesh.geometry.getAttribute('positionPrev') as THREE.BufferAttribute | null;
            const normAttr = mesh.geometry.getAttribute('normal') as THREE.BufferAttribute | null;
            if (posAttr && posPrevAttr) {
              // Copy current position to positionPrev (for interpolation).
              posPrevAttr.copyArray(posAttr.array);
              posPrevAttr.needsUpdate = true;
              // Upload new positions from updated skeleton.
              posAttr.copyArray(meshData.positions);
              posAttr.needsUpdate = true;
            }
            if (normAttr) {
              normAttr.copyArray(meshData.normals);
              normAttr.needsUpdate = true;
            }
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════
    // Tier 1: Anatomical Animation — Stalk Sway (Kinematic + Verlet overshoot)
    // ════════════════════════════════════════════════════════════════════════════

    // Hard-set positions to the sway target. We DON'T update `previous` (except
    // for pinCenter), so Particulate's Verlet sees velocity = this frame's
    // displacement and adds it back → overshoot → constraints resist → wobble.
    for (let i = 0; i < particleCount; i++) {
      if (i === gd.pinCenter) {
        const idx = i * 3;
        positions[idx] = 0;
        positions[idx + 1] = 0;
        positions[idx + 2] = 0;
        previous[idx] = 0;
        previous[idx + 1] = 0;
        previous[idx + 2] = 0;
        continue;
      }

      const idx = i * 3;
      const py = rest[idx + 1];
      const heightFrac = Math.min(1, Math.max(0, py / stalkHeight));

      const swayX = Math.sin(time * swayFreq + py * 0.15) * swayAmp * heightFrac;
      const swayZ = Math.cos(time * swayFreq * 0.8 + py * 0.1) * swayAmp * heightFrac * 0.6;

      // Hard-set to target. previous trails → Verlet overshoot → constraint wobble.
      positions[idx] = rest[idx] + swayX;
      positions[idx + 1] = rest[idx + 1];
      positions[idx + 2] = rest[idx + 2] + swayZ;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Tier 1: Anatomical Animation — Mesenteries, Sphincter, Column Regions, Acontia
    // ════════════════════════════════════════════════════════════════════════════

    // Mesentery retractor muscle contraction.
    if (gd.mesenteries) {
      for (const mesentery of gd.mesenteries) {
        const retractorStrength = {
          diffuse: 0.02,
          restricted: 0.03,
          circumscribed: 0.04,
          palmate: 0.05,
        }[mesentery.retractorType] ?? 0.02;

        for (let pi = 1; pi < mesentery.particleIndices.length; pi += 2) {
          const idx = mesentery.particleIndices[pi] * 3;
          const outerIdx = mesentery.particleIndices[pi - 1] * 3;

          const dx = positions[outerIdx] - positions[idx];
          const dy = positions[outerIdx + 1] - positions[idx + 1];
          const dz = positions[outerIdx + 2] - positions[idx + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

          const force = retractorStrength * swayAmp * (1 + Math.sin(time * 2 + mesentery.index));
          positions[idx] += (dx / dist) * force * dt;
          positions[idx + 1] += (dy / dist) * force * dt;
          positions[idx + 2] += (dz / dist) * force * dt;
        }
      }
    }

    // Sphincter animation — driven by the behavioral state machine.
    if (gd.sphincter) {
      const sph = gd.sphincter;
      const shouldContract = sph.isContracted ||
        (behavior !== undefined &&
          (behavior.currentState === 'WITHDRAWING' || behavior.currentState === 'AGONISTIC'));

      if (shouldContract !== sph.targetContracted) {
        sph.targetContracted = shouldContract;
      }

      const targetRadius = sph.targetContracted
        ? sph.restRadius * (1 - sph.strength * 0.7)
        : sph.restRadius;

      const contractionSpeed = sph.type === 'endodermal' ? 3.0 :
        sph.type === 'mesogleal' ? 0.8 : 1.5;

      sph.currentRadius += (targetRadius - sph.currentRadius) * contractionSpeed * dt;

      sph.constraint.setDistance(sph.currentRadius * 0.9, sph.currentRadius * 1.1);
    }

    // Column region physics updates (verrucae jitter).
    if (gd.columnRegions) {
      for (const region of gd.columnRegions) {
        if (region.verrucae && region.verrucae.particleIndices) {
          for (const idx of region.verrucae.particleIndices) {
            const pIdx = idx * 3;
            const noiseX = (Math.random() - 0.5) * 0.01 * swayAmp;
            const noiseZ = (Math.random() - 0.5) * 0.01 * swayAmp;
            positions[pIdx] += noiseX * dt;
            positions[pIdx + 2] += noiseZ * dt;
          }
        }
      }
    }

    // Acontia ejection system.
    if (gd.acontiaChains) {
      for (const acontium of gd.acontiaChains) {
        if (acontium.isEjected) {
          acontium.ejectionProgress = Math.min(1, acontium.ejectionProgress + dt * 2.0);

          for (let k = 0; k < acontium.count; k++) {
            const idx = (acontium.startIndex + k) * 3;
            const t = k / Math.max(1, acontium.count - 1);

            const force = acontium.ejectionForce.clone().multiplyScalar(t * acontium.ejectionProgress);
            positions[idx] += force.x * dt;
            positions[idx + 1] += force.y * dt;
            positions[idx + 2] += force.z * dt;
          }

          if (acontium.ejectionProgress >= 1) {
            acontium.isEjected = false;
            acontium.ejectionProgress = 0;
          }
        }
      }
    }

    // Tick physics (Verlet integrate + constraint solving).
    gd.system.tick(dt);

    // ── Refresh smoothed stalk normals from the newly-deformed column ────
    // The stalk is a soft-body: without per-frame recompute, the TSL physical
    // shading lights the undeformed shape and the anemone looks wrong as it
    // sways and the sphincter contracts.
    if (gd.normalAttr) {
      computeNormals(positions, gd.faces.stalk, gd.normalAttr.array as Float32Array);
      gd.normalAttr.needsUpdate = true;
    }

    // Mark dirty.
    gd.position.needsUpdate = true;
    gd.positionPrev.needsUpdate = true;
  },

  // ── applyInteraction ───────────────────────────────────────────────────
  applyInteraction(data: BodyData, force: number, origin: THREE.Vector3): void {
    const gd = data.geometryData as AnemoneGeometryData;
    const positions = gd.system.positions;
    const particleCount = positions.length / 3;

    // Tier 2: interaction-driven state transitions.
    const behavior = gd.behavior;
    if (behavior) {
      behavior.interactionAccumulator += force;
      behavior.lastInteractionForce = force;
      if (behavior.hysteresisTimer <= 0) {
        if (behavior.interactionAccumulator > 6) {
          // Sustained contact → AGONISTIC.
          transitionTo(behavior, 'AGONISTIC', 'disturbance');
        } else if (force >= 0.5) {
          // Strong / rapid → WITHDRAWING.
          transitionTo(behavior, 'WITHDRAWING', 'threat');
        } else if (force > 0.05) {
          // Light touch → FEEDING.
          transitionTo(behavior, 'FEEDING', 'prey_contact');
        }
      }
    }

    // Route the interaction origin to the tentacle controller (mouse target).
    gd.tentacleController?.setMouseTarget(origin);

    for (let i = 1; i < particleCount; i++) {
      const idx = i * 3;
      const px = positions[idx];
      const py = positions[idx + 1];
      const pz = positions[idx + 2];

      const dx = origin.x - px;
      const dy = origin.y - py;
      const dz = origin.z - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 0.01 && dist < 40) {
        const falloff = 1 - dist / 40;
        const factor = falloff * falloff * force * 0.6;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        positions[idx] += nx * factor;
        positions[idx + 1] += ny * factor;
        positions[idx + 2] += nz * factor;
      }
    }
  },

  // ── dispose ────────────────────────────────────────────────────────────
  dispose(_data: BodyData): void {
    // Particle systems are owned by the geometry data and will be GC'd once
    // references are dropped.  No explicit teardown required.
  },
};

// Register so getArchetype('anemone') resolves immediately.
registerArchetype(anemoneArchetype);