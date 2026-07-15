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
import { InterpolatedLineMaterial } from '../../jellyfish/materials';
import { LookConfig } from '../../editor/look-presets';
import { registerArchetype } from './archetypeRegistry';

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

interface TentacleChainData {
  /** Vertex index of the first particle in this chain. */
  start: number;
  /** Number of particles in this chain. */
  count: number;
  /** Vertex index of the stalk particle this chain attaches to. */
  baseIndex: number;
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
  /** Per-tentacle-chain metadata used by animateBody. */
  tentacleChains: TentacleChainData[];
  /** Vertex index of the pinned base-center particle. */
  pinCenter: number;
  /** Number of particles in each ring (uniform across all rings). */
  particlesPerRing: number;
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
    const tentacleChains: TentacleChainData[] = [];

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
    const chainLength = Math.max(3, tentacles.count);
    const tentacleSpacing = tentacles.length / Math.max(1, chainLength);

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

    for (const baseIdx of attachIndices) {
      const chainStart = verts.length / 3;

      // Read the attachment particle position to seed initial positions.
      const bx = verts[baseIdx * 3];
      const by = verts[baseIdx * 3 + 1];
      const bz = verts[baseIdx * 3 + 2];

      // Direction: outward from centre and slightly downward.
      const outX = bx;
      const outZ = bz;
      const outLen = Math.sqrt(outX * outX + outZ * outZ) || 1;
      const nx = outX / outLen;
      const nz = outZ / outLen;

      for (let k = 0; k < chainLength; k++) {
        verts.push(
          bx + nx * (k * tentacleSpacing),
          by - k * tentacleSpacing * 0.5,
          bz + nz * (k * tentacleSpacing),
        );
      }

      tentacleChains.push({ start: chainStart, count: chainLength, baseIndex: baseIdx });

      // Chain segment constraints.
      for (let k = 0; k < chainLength - 1; k++) {
        const a = chainStart + k;
        const b = chainStart + k + 1;
        queuedConstraints.push(
          Particulate.DistanceConstraint.create(
            [tentacleSpacing * 0.4, tentacleSpacing * 1.8],
            [a, b],
          ),
        );
        linksTentacles.push(a, b);
        linksInner.push(a, b);
      }

      // Connection from tentacle base to stalk attachment particle.
      queuedConstraints.push(
        Particulate.DistanceConstraint.create(
          [tentacleSpacing * 0.3, tentacleSpacing * 2.0],
          [baseIdx, chainStart],
        ),
      );
      linksTentacles.push(baseIdx, chainStart);
      linksInner.push(baseIdx, chainStart);
    }

    // ── 4. Create particle system ─────────────────────────────────────────
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

    // Tentacle tips are light and responsive.
    for (const chain of tentacleChains) {
      for (let k = 0; k < chain.count; k++) {
        const t = k / Math.max(1, chain.count - 1);
        system.setWeight(chain.start + k, 1.0 + t * 3.0);
      }
    }

    // Base pin constraint.
    const pinConstraint = Particulate.PointConstraint.create([0, 0, 0], pinCenter);
    system.addPinConstraint(pinConstraint);

    // ── 5. Build buffer geometry ──────────────────────────────────────────
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
      tentacleChains,
      pinCenter,
      particlesPerRing,
    };

    return {
      geometryData,
      physicsComponents: {},
      animationState: {
        swayAmplitude: sway.amplitude,
        swayFrequency: sway.frequency,
        swayPhase: sway.phase,
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
    const d = data as any;
    const gd = d.geometryData as AnemoneGeometryData;
    const look = (materials as any).lookConfig as LookConfig | undefined;

    const group = new THREE.Group();

    // ── Stalk mesh ──────────────────────────────────────────────────────
    const stalkGeo = new THREE.BufferGeometry();
    stalkGeo.setAttribute('position', gd.position);
    stalkGeo.setAttribute('positionPrev', gd.positionPrev);
    stalkGeo.setIndex(gd.faces.stalk);
    stalkGeo.computeVertexNormals();

    const stalkMaterial = new THREE.MeshPhysicalMaterial({
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
      flatShading: false,
    });
    const stalkMesh = new THREE.Mesh(stalkGeo, stalkMaterial);
    group.add(stalkMesh);

    // ── Tentacle lines ──────────────────────────────────────────────────
    let tentMaterial: InterpolatedLineMaterial | undefined;
    if (gd.links.tentacles.length > 0) {
      const tentGeo = new THREE.BufferGeometry();
      tentGeo.setAttribute('position', gd.position);
      tentGeo.setAttribute('positionPrev', gd.positionPrev);
      // Tentacles need normals for the InterpolatedLineMaterial check.
      const tentNormals = new Float32Array(gd.position.count * 3);
      tentGeo.setAttribute('normal', new THREE.BufferAttribute(tentNormals, 3));
      tentGeo.setIndex(gd.links.tentacles);

      tentMaterial = new InterpolatedLineMaterial({
        color: look?.tentacle.color ?? 0xFDA4BA,
        transparent: true,
        opacity: look?.tentacle.opacity ?? 0.55,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
      });
      group.add(new THREE.LineSegments(tentGeo, tentMaterial));
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
    const d = data as any;
    const gd = d.geometryData as AnemoneGeometryData;
    const spec = gd.spec;
    const positions = gd.system.positions;
    const previous = gd.system.positionsPrev;
    const rest = gd.restPositions;
    const particleCount = positions.length / 3;

    // ── Stalk sway — sinusoidal column bend ─────────────────────────────
    // Apply a gentle horizontal force proportional to height so the crown
    // sweeps and the base stays relatively still.
    const swayAmp = spec.sway.amplitude * amplitude * 0.4;
    const swayFreq = spec.sway.frequency;
    const swayPh = spec.sway.phase;
    const stalkHeight = Math.max(1, spec.stalk.height);

    for (let i = 0; i < particleCount; i++) {
      if (i === gd.pinCenter) continue;

      const idx = i * 3;
      const py = rest[idx + 1];
      const heightFrac = Math.min(1, Math.max(0, py / stalkHeight));

      if (heightFrac > 0.01) {
        const force = Math.sin(time * swayFreq + py * swayPh * 0.01) * swayAmp * heightFrac;
        positions[idx] = rest[idx] + force;
        positions[idx + 1] = rest[idx + 1];
        // Subtle Z component for a more organic sway.
        positions[idx + 2] = rest[idx + 2]
          + Math.cos(time * swayFreq * 0.7 + py * 0.005) * swayAmp * heightFrac * 0.4;
      } else {
        positions[idx] = rest[idx];
        positions[idx + 1] = rest[idx + 1];
        positions[idx + 2] = rest[idx + 2];
      }
    }

    // ── Tentacle wave — traveling base-to-tip ───────────────────────────
    for (const chain of gd.tentacleChains) {
      for (let k = 1; k < chain.count; k++) {
        const t = k / Math.max(1, chain.count - 1);
        const idx = (chain.start + k) * 3;
        const wave = Math.sin(
          time * swayFreq * 1.3 - t * Math.PI * 3 + chain.start * 0.1,
        ) * swayAmp * 1.2 * t;
        positions[idx] += wave;
        positions[idx + 2] += Math.cos(
          time * swayFreq * 1.1 - t * Math.PI * 2.5 + chain.start * 0.07,
        ) * swayAmp * 0.8 * t;
      }
    }

    // Do not let procedural sway become solver velocity from one tick to the
    // next; that was the source of the runaway lines.
    previous.set(positions);

    // ── Tick physics ────────────────────────────────────────────────────
    gd.system.tick(delta * 0.001);

    // ── Mark dirty ──────────────────────────────────────────────────────
    gd.position.needsUpdate = true;
    gd.positionPrev.needsUpdate = true;
  },

  // ── applyInteraction ───────────────────────────────────────────────────
  applyInteraction(data: BodyData, force: number, origin: THREE.Vector3): void {
    const d = data as any;
    const gd = d.geometryData as AnemoneGeometryData;
    const positions = gd.system.positions;
    const particleCount = positions.length / 3;

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
