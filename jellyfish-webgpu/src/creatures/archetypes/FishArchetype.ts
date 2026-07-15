/**
 * FishArchetype.ts
 *
 * Concrete CreatureArchetype for fish creatures with bilateral ring topology
 * (vertebra spine), traveling-sine undulation animation, and fin meshes.
 *
 * Registered once on import so getArchetype('fish') resolves immediately.
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
import type {
  CreatureSpec,
  FishSpec,
  FishFinConfig,
} from '../../jellyfish/creatures/CreatureSpec';
import { evalRadiusProfile } from '../../jellyfish/creatures/RadiusProfileCurve';
import { evalSpineOffset } from '../../jellyfish/creatures/SpineCurve';
import { LookConfig } from '../../editor/look-presets';
import { registerArchetype } from './archetypeRegistry';

// ── Constants ──────────────────────────────────────────────────────────────

/** Particles per vertebra ring.  12 gives a clean elliptical cross-section. */
const PARTICLES_PER_RING = 12;

// ── Data structures ────────────────────────────────────────────────────────

interface FishGeometryData {
  spec: FishSpec;
  system: Particulate.ParticleSystem;
  /** Undeformed pose; animation is evaluated from this every physics tick. */
  restPositions: Float32Array;
  /** Shared buffer attribute backed by system.positions. */
  position: THREE.BufferAttribute;
  /** Shared buffer attribute backed by system.positionsPrev. */
  positionPrev: THREE.BufferAttribute;
  faces: {
    /** Index buffer for the body triangle mesh. */
    body: number[];
    /** Index buffer for the fin triangle mesh. */
    fins: number[];
    /** Combined index buffer (body + fins) for single-mesh rendering. */
    combined: number[];
  };
  pinConstraints: {
    head: Particulate.PointConstraint;
    mid: Particulate.PointConstraint;
    tail: Particulate.PointConstraint;
  };
  pins: {
    head: number;
    mid: number;
    tail: number;
  };
  /** Start index of each vertebra ring in the particle array (for undulation). */
  ringStartIndices: number[];
  vertebraCount: number;
  particlesPerRing: number;
  /** Y-positions of each vertebra for t-mapping in undulation. */
  vertebraY: Float64Array;
  /** Fin mesh metadata for per-frame flutter. */
  finData: FinBuildData[];
}

interface FinBuildData {
  /** Start index of the fin tip vertices in the particle array. */
  tipStart: number;
  /** Number of tip vertices. */
  tipCount: number;
  /** Kind of fin (for flutter direction). */
  kind: string;
  /** Attachment vertebra indices (body side). */
  attachIndices: number[];
  /** Flutter amplitude scaling. */
  flutterAmp: number;
  /** Flutter speed scaling. */
  flutterSpeed: number;
}

// ── Geometry helpers (mutable array pattern) ───────────────────────────────

function pushPoint(x: number, y: number, z: number, verts: number[]): void {
  verts.push(x, y, z);
}

/** Push an elliptical ring of particles at (cx, y, cz) into verts. */
function pushRing(
  verts: number[],
  cx: number, y: number, cz: number,
  radiusX: number, radiusZ: number,
  segments: number,
  rotation: number,
): void {
  const step = (Math.PI * 2) / segments;
  for (let i = 0; i < segments; i++) {
    const angle = i * step + rotation;
    verts.push(
      cx + Math.cos(angle) * radiusX,
      y,
      cz + Math.sin(angle) * radiusZ,
    );
  }
}

/** Closed-loop edge indices for a ring. */
function pushLoopIndices(start: number, n: number, out: number[]): void {
  for (let i = 0; i < n; i++) {
    out.push(start + i, start + (i + 1) % n);
  }
}

/** Pairwise connection indices between two rings (spine). */
function pushRingPairs(r0: number, r1: number, n: number, out: number[]): void {
  for (let i = 0; i < n; i++) {
    out.push(r0 + i, r1 + i);
  }
}

/** Triangle faces for a quad strip between two rings. */
function pushRingFaces(r0: number, r1: number, n: number, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a = r0 + i;
    const b = r0 + (i + 1) % n;
    const c = r1 + (i + 1) % n;
    const d = r1 + i;
    out.push(a, b, c, c, d, a);
  }
}

/** Radial connection indices from a center to ring. */
function pushRadialPairs(center: number, start: number, n: number, out: number[]): void {
  for (let i = 0; i < n; i++) {
    out.push(center, start + i);
  }
}

// ── Fin geometry ───────────────────────────────────────────────────────────

/**
 * For a given fin kind, determine the ring particle offset (which particle
 * on the ring the fin attaches to) and the outward direction (dx, dz).
 *
 * Ring particle 0 is at angle 0 → +X axis (right side).
 * Ring particle n/4 is at angle PI/2 → +Z axis (top / dorsal).
 */
function finAttachmentConfig(kind: string): {
  /** Angular offset on the ring cross-section, in ring-particle units (0..ppRing). */
  ringOffset: number;
  /** Outward direction in world X. */
  dirX: number;
  /** Outward direction in world Z. */
  dirZ: number;
  /** Whether to mirror bilaterally (left + right). */
  bilateral: boolean;
} {
  switch (kind) {
    case 'dorsal':
      return { ringOffset: PARTICLES_PER_RING * 0.25, dirX: 0, dirZ: 1, bilateral: false };
    case 'anal':
      return { ringOffset: PARTICLES_PER_RING * 0.75, dirX: 0, dirZ: -1, bilateral: false };
    case 'pectoral':
      return { ringOffset: 0, dirX: 1, dirZ: 0, bilateral: true };
    case 'pelvic':
      return { ringOffset: PARTICLES_PER_RING * 0.875, dirX: 0.7, dirZ: -0.7, bilateral: true };
    case 'caudal':
      return { ringOffset: 0, dirX: 0, dirZ: 0, bilateral: false };
    default:
      return { ringOffset: 0, dirX: 0, dirZ: 1, bilateral: false };
  }
}

/**
 * Build fin tip vertices + faces for a single fin config.
 * Returns the data needed for flutter animation and disposes of mutables.
 */
function buildFinMesh(
  fin: FishFinConfig,
  ringStartIndices: number[],
  ppRing: number,
  vCount: number,
  verts: number[],
  queuedConstraints: Particulate.Constraint[],
  bodyFaces: number[],
  headY: number,
  bodyLen: number,
  bodyWidth: number,
  bodyDepth: number,
  bodyProfile: FishSpec['bodyProfile'],
  sideMultiplier: number,
): FinBuildData | null {
  const cfg = finAttachmentConfig(fin.kind);
  if (!cfg) return null;

  // Clamp attachment range along body.
  const vCenter = fin.attachmentT * (vCount - 1);
  const vHalf = Math.max(1, Math.ceil(fin.length * 0.5));
  const vStart = Math.max(0, Math.round(vCenter - vHalf));
  const vEnd = Math.min(vCount - 1, Math.round(vCenter + vHalf));
  const numAttach = vEnd - vStart + 1;
  if (numAttach < 2) return null;

  // Snap ringOffset to nearest particle.
  const offsetRaw = cfg.ringOffset % ppRing;
  const offset = Math.round(offsetRaw) % ppRing;

  // Collect attachment particle indices from each ring.
  const attachIndices: number[] = [];
  const attachY: number[] = [];
  for (let vi = vStart; vi <= vEnd; vi++) {
    const ringStart = ringStartIndices[vi];
    const idx = ringStart + (offset % ppRing);
    attachIndices.push(idx);
    attachY.push(verts[idx * 3 + 1]);
  }

  // Outward direction (normalized).
  const dirLen = Math.sqrt(cfg.dirX * cfg.dirX + cfg.dirZ * cfg.dirZ) || 1;

  // Generate tip vertices — one per attachment point.
  const tipStart = verts.length / 3;

  for (let i = 0; i < numAttach; i++) {
    const vi = vStart + i;
    const t = vi / (vCount - 1);
    const yPos = headY - t * bodyLen;

    // Radius at this vertebra.
    const radiusScale = evalRadiusProfile(bodyProfile, t);
    const rX = radiusScale * bodyWidth * 0.5;
    const rZ = radiusScale * bodyDepth * 0.5;

    // Outward direction: the fin extends from the body surface.
    // For dorsal: straight up (+Z). For pectoral: right (+X) * sideMultiplier.
    const nx = cfg.dirX / dirLen * sideMultiplier;
    const nz = cfg.dirZ / dirLen;

    // The fin tip position = body surface position + outward * height + lateral spread.
    const surfaceX = nx * rX;
    const surfaceZ = nz * rZ;

    // Lateral spread (span) at the tip — 0 at base, full at tip.
    // We taper the spread along the outward direction for a triangular look.
    const lateralSpread = fin.span * 0.5 * (i / Math.max(1, numAttach - 1) - 0.5);

    // Compute perpendicular direction to outward along the ring surface.
    // For dorsal (dz=1): spread in X.
    // For pectoral (dx=1, side>0): spread in Z.
    let perpX = 0;
    let perpZ = 0;
    if (Math.abs(cfg.dirZ) > 0.5) {
      perpX = 1; // spread laterally
    } else {
      perpZ = 1; // spread vertically
    }

    const tipX = surfaceX + nx * fin.height + perpX * lateralSpread;
    const tipZ = surfaceZ + nz * fin.height + perpZ * lateralSpread;

    verts.push(tipX, yPos, tipZ);
  }

  // Constraints: each tip → its body attachment.
  for (let i = 0; i < numAttach; i++) {
    const bodyIdx = attachIndices[i];
    const tipIdx = tipStart + i;
    queuedConstraints.push(
      Particulate.DistanceConstraint.create(
        [fin.height * 0.2, fin.height * 1.8],
        [bodyIdx, tipIdx],
      ),
    );
  }

  // Adjacent tips connected to each other (for structural integrity).
  for (let i = 0; i < numAttach - 1; i++) {
    queuedConstraints.push(
      Particulate.DistanceConstraint.create(
        [0.1, 3.0],
        [tipStart + i, tipStart + i + 1],
      ),
    );
  }

  // Triangle faces: body[i]-body[i+1]-tip[i+1] and body[i]-tip[i+1]-tip[i].
  for (let i = 0; i < numAttach - 1; i++) {
    const a = attachIndices[i];
    const b = attachIndices[i + 1];
    const c = tipStart + i + 1;
    const d = tipStart + i;
    bodyFaces.push(a, b, c, c, d, a);
  }

  return {
    tipStart,
    tipCount: numAttach,
    kind: fin.kind,
    attachIndices,
    flutterAmp: fin.flutterAmplitude ?? 0.3,
    flutterSpeed: fin.flutterSpeed ?? 1.0,
  };
}

/**
 * Special handling for caudal (tail) fin — creates a forked fan at the
 * last vertebra ring.
 */
function buildCaudalFin(
  fin: FishFinConfig,
  ringStartIndices: number[],
  ppRing: number,
  vCount: number,
  verts: number[],
  queuedConstraints: Particulate.Constraint[],
  bodyFaces: number[],
  headY: number,
  bodyLen: number,
  _bodyWidth: number,
  _bodyDepth: number,
  _bodyProfile: FishSpec['bodyProfile'],
): FinBuildData | null {
  const lastRingIdx = ringStartIndices[vCount - 1];
  const yPos = headY - bodyLen;

  // Use 4 attachment points around the last ring: top, right, bottom, left.
  const attachOffsets = [ppRing * 0.25, 0, ppRing * 0.75, ppRing * 0.5];
  const attachIndices: number[] = [];
  for (const off of attachOffsets) {
    attachIndices.push(lastRingIdx + (Math.round(off) % ppRing));
  }

  // Calculate their world positions for tip placement.
  const getPos = (idx: number) => ({
    x: verts[idx * 3],
    y: verts[idx * 3 + 1],
    z: verts[idx * 3 + 2],
  });

  const topPos = getPos(attachIndices[0]);
  const bottomPos = getPos(attachIndices[2]);

  // Create 3 tip vertices for a forked tail:
  // tip0 — upper lobe, tip1 — mid point (furthest back), tip2 — lower lobe.
  const tipStart = verts.length / 3;

  const halfSpan = fin.span * 0.5;
  const tipHeight = fin.height;
  const caudalBack = -bodyLen * 0.15; // extends past the last vertebra

  // Upper lobe tip.
  verts.push(
    topPos.x - halfSpan * 0.5,
    yPos + caudalBack,
    topPos.z + tipHeight * 0.6,
  );
  // Mid tip (furthest back, center).
  verts.push(
    0,
    yPos + caudalBack * 1.4,
    0,
  );
  // Lower lobe tip.
  verts.push(
    bottomPos.x + halfSpan * 0.5,
    yPos + caudalBack,
    bottomPos.z - tipHeight * 0.6,
  );

  // Upper fork tip (wider).
  verts.push(
    topPos.x - halfSpan,
    yPos + caudalBack * 0.7,
    topPos.z + tipHeight * 0.8,
  );
  // Lower fork tip (wider).
  verts.push(
    bottomPos.x + halfSpan,
    yPos + caudalBack * 0.7,
    bottomPos.z - tipHeight * 0.8,
  );

  // Constraints: each tip to its nearest body attachment.
  const tipConnections = [
    [attachIndices[0], tipStart],
    [attachIndices[1], tipStart + 1],
    [attachIndices[2], tipStart + 2],
    [attachIndices[1], tipStart + 3],
    [attachIndices[2], tipStart + 4],
  ];
  for (const [body, tip] of tipConnections) {
    // Compute distance for constraint bounds.
    const dx = verts[body * 3] - verts[tip * 3];
    const dy = verts[body * 3 + 1] - verts[tip * 3 + 1];
    const dz = verts[body * 3 + 2] - verts[tip * 3 + 2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    queuedConstraints.push(
      Particulate.DistanceConstraint.create(
        [dist * 0.3, dist * 1.8],
        [body, tip],
      ),
    );
  }

  // Inter-tip connections for structural integrity.
  queuedConstraints.push(
    Particulate.DistanceConstraint.create([1, 15], [tipStart, tipStart + 1]),
    Particulate.DistanceConstraint.create([1, 15], [tipStart + 1, tipStart + 2]),
    Particulate.DistanceConstraint.create([1, 15], [tipStart + 3, tipStart + 4]),
    Particulate.DistanceConstraint.create([1, 15], [tipStart, tipStart + 3]),
    Particulate.DistanceConstraint.create([1, 15], [tipStart + 2, tipStart + 4]),
  );

  // Faces: upper lobe triangle.
  bodyFaces.push(
    attachIndices[0], attachIndices[1], tipStart + 3,    // top-right to upper fork
    tipStart + 3, tipStart, attachIndices[0],              // upper fork to top to tip
  );

  // Center lobe.
  bodyFaces.push(
    attachIndices[1], tipStart + 3, tipStart + 1,
    tipStart + 1, tipStart + 4, attachIndices[2],
  );

  // Lower lobe.
  bodyFaces.push(
    attachIndices[2], tipStart + 4, tipStart + 2,
    tipStart + 2, attachIndices[3], attachIndices[2],
  );

  return {
    tipStart,
    tipCount: 5,
    kind: 'caudal',
    attachIndices,
    flutterAmp: fin.flutterAmplitude ?? 0.2,
    flutterSpeed: fin.flutterSpeed ?? 1.0,
  };
}

// ── Archetype ──────────────────────────────────────────────────────────────

export const fishArchetype: CreatureArchetype = {
  id: 'fish',
  label: 'Fish',

  // ── buildBody ──────────────────────────────────────────────────────────
  buildBody(spec: CreatureSpec, _config: PhysicsConfig, _rng: SeededRNG): BodyData {
    const fishSpec = spec as FishSpec;
    const vCount = fishSpec.vertebraCount;
    const ppRing = PARTICLES_PER_RING;
    const bodyLen = fishSpec.bodyLength;
    const headY = bodyLen * 0.5;

    // Mutable arrays (pattern from JellyfishGeometry / AnemoneArchetype).
    const verts: number[] = [];
    const queuedConstraints: Particulate.Constraint[] = [];
    const bodyFaces: number[] = [];
    const ringStartIndices: number[] = [];
    const vertebraY = new Float64Array(vCount);

    // ── Pin indices (first 3 particles) ──────────────────────────────────
    const pinHead = 0;
    const pinMid = 1;
    const pinTail = 2;
    let nextIndex = 3;

    // Head pin at top of fish.
    pushPoint(0, headY, 0, verts);
    // Mid-body pin at center.
    pushPoint(0, 0, 0, verts);
    // Tail pin at bottom.
    pushPoint(0, -headY, 0, verts);

    // ── Generate vertebra rings ──────────────────────────────────────────
    for (let i = 0; i < vCount; i++) {
      const t = vCount > 1 ? i / (vCount - 1) : 0;
      const radiusScale = evalRadiusProfile(fishSpec.bodyProfile, t);

      // Elliptical cross-section modulated by bodyWidth / bodyDepth.
      const radiusX = radiusScale * fishSpec.bodyWidth * 0.5;
      const radiusZ = radiusScale * fishSpec.bodyDepth * 0.5;

      // Y position: head (+y) to tail (-y).
      const yPos = headY - t * bodyLen;
      vertebraY[i] = yPos;

      // Spine offset (optional XZ curve).
      const spineOff = evalSpineOffset(fishSpec.spineCurve, t);

      // Cross-section rotation (optional twist).
      const csRot = (fishSpec.crossSection?.rotation ?? 0)
                  + (fishSpec.crossSection?.twist ?? 0) * t;

      const ringStart = nextIndex;
      ringStartIndices.push(ringStart);

      // Generate ring vertices.
      pushRing(
        verts,
        spineOff.x, yPos, spineOff.z,
        radiusX, radiusZ,
        ppRing,
        csRot,
      );

      nextIndex += ppRing;

      // ── Ring-edge constraints (loop) ─────────────────────────────────
      const loopIdx: number[] = [];
      pushLoopIndices(ringStart, ppRing, loopIdx);

      // Compute approximate segment length for constraint bounds.
      const segAngle = (Math.PI * 2) / ppRing;
      const avgRadius = (radiusX + radiusZ) * 0.5;
      const chordLen = 2 * avgRadius * Math.sin(segAngle * 0.5);
      const ringMin = Math.max(0.3, chordLen * 0.3);
      const ringMax = chordLen * 2.0;
      queuedConstraints.push(
        Particulate.DistanceConstraint.create([ringMin, ringMax], loopIdx),
      );

      // ── Spine connections to previous ring ──────────────────────────
      if (i > 0) {
        const prevStart = ringStartIndices[i - 1];

        // Vertical spine pairs.
        const spineIdx: number[] = [];
        pushRingPairs(prevStart, ringStart, ppRing, spineIdx);

        const ringDist = Math.abs(yPos - vertebraY[i - 1]);
        queuedConstraints.push(
          Particulate.DistanceConstraint.create(
            [ringDist * 0.2, ringDist * 1.8],
            spineIdx,
          ),
        );

        // Body skin faces (triangle mesh).
        pushRingFaces(prevStart, ringStart, ppRing, bodyFaces);
      }

      // ── Connect first/last rings to pins ────────────────────────────
      if (i === 0) {
        const headPair: number[] = [];
        pushRadialPairs(pinHead, ringStart, ppRing, headPair);
        queuedConstraints.push(
          Particulate.DistanceConstraint.create(
            [radiusX * 0.2, Math.max(radiusX, radiusZ) * 2.5],
            headPair,
          ),
        );
        // Cap the head with a fan.
        for (let j = 0; j < ppRing; j++) {
          const a = ringStart + j;
          const b = ringStart + (j + 1) % ppRing;
          bodyFaces.push(pinHead, a, b);
        }
      }
      if (i === vCount - 1) {
        const tailPair: number[] = [];
        pushRadialPairs(pinTail, ringStart, ppRing, tailPair);
        queuedConstraints.push(
          Particulate.DistanceConstraint.create(
            [radiusX * 0.2, Math.max(radiusX, radiusZ) * 2.5],
            tailPair,
          ),
        );
      }
    }

    // ── Mid-body spine to pin ────────────────────────────────────────────
    const midRingIdx = Math.floor(vCount * 0.5);
    const midRingStart = ringStartIndices[midRingIdx];
    const midPairs: number[] = [];
    pushRadialPairs(pinMid, midRingStart, ppRing, midPairs);
    queuedConstraints.push(
      Particulate.DistanceConstraint.create(
        [0.5, 4.0],
        midPairs,
      ),
    );

    // ── Generate fins ────────────────────────────────────────────────────
    const finData: FinBuildData[] = [];

    for (const fin of fishSpec.fins) {
      if (fin.kind === 'caudal') {
        const result = buildCaudalFin(
          fin, ringStartIndices, ppRing, vCount,
          verts, queuedConstraints, bodyFaces,
          headY, bodyLen, fishSpec.bodyWidth, fishSpec.bodyDepth,
          fishSpec.bodyProfile,
        );
        if (result) finData.push(result);
      } else {
        const cfg = finAttachmentConfig(fin.kind);
        // Generate on one side (or both for bilateral fins).
        const sides = cfg.bilateral ? [-1, 1] : [1];
        for (const side of sides) {
          const result = buildFinMesh(
            fin, ringStartIndices, ppRing, vCount,
            verts, queuedConstraints, bodyFaces,
            headY, bodyLen, fishSpec.bodyWidth, fishSpec.bodyDepth,
            fishSpec.bodyProfile,
            side,
          );
          if (result) finData.push(result);
        }
      }
    }

    // ── Create particle system ───────────────────────────────────────────
    const system = Particulate.ParticleSystem.create(verts, 2);

    for (const constraint of queuedConstraints) {
      system.addConstraint(constraint);
    }

    // Pin weights = 0 (immovable).
    system.setWeight(pinHead, 0);
    system.setWeight(pinMid, 0);
    system.setWeight(pinTail, 0);

    // Slightly heavier particles toward the head, lighter toward tail
    // for natural undulation feel.
    const tailWeight = 2.0; // lighter = more movement
    const headWeight = 1.0; // heavier = stiffer
    for (let i = 3; i < nextIndex; i++) {
      // Determine which vertebra ring this particle belongs to.
      let ringI = -1;
      for (let ri = 0; ri < vCount; ri++) {
        if (i >= ringStartIndices[ri] && i < ringStartIndices[ri] + ppRing) {
          ringI = ri;
          break;
        }
      }
      if (ringI >= 0) {
        const t = ringI / (vCount - 1);
        const w = headWeight + (tailWeight - headWeight) * t;
        system.setWeight(i, w);
      }
    }

    // Set fin tip weights (lighter = more flutter).
    for (const fd of finData) {
      for (let i = 0; i < fd.tipCount; i++) {
        system.setWeight(fd.tipStart + i, 1.5);
      }
    }

    // ── Pin constraints ──────────────────────────────────────────────────
    const headSpineOff = evalSpineOffset(fishSpec.spineCurve, 0);
    const midSpineOff = evalSpineOffset(fishSpec.spineCurve, 0.5);
    const tailSpineOff = evalSpineOffset(fishSpec.spineCurve, 1);

    const pinConstraintHead = Particulate.PointConstraint.create(
      [headSpineOff.x, headY, headSpineOff.z],
      pinHead,
    );
    const pinConstraintMid = Particulate.PointConstraint.create(
      [midSpineOff.x, 0, midSpineOff.z],
      pinMid,
    );
    const pinConstraintTail = Particulate.PointConstraint.create(
      [tailSpineOff.x, -headY, tailSpineOff.z],
      pinTail,
    );

    system.addPinConstraint(pinConstraintHead);
    system.addPinConstraint(pinConstraintMid);
    system.addPinConstraint(pinConstraintTail);

    // ── Build buffer geometry ────────────────────────────────────────────
    const position = new THREE.BufferAttribute(system.positions, 3);
    const positionPrev = new THREE.BufferAttribute(system.positionsPrev, 3);

    // Empty normal attribute to satisfy TSL requirements.
    const normals = new Float32Array(system.positions.length);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', position);
    geometry.setAttribute('positionPrev', positionPrev);
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    const geometryData: FishGeometryData = {
      spec: fishSpec,
      system,
      restPositions: new Float32Array(system.positions),
      position,
      positionPrev,
      faces: {
        body: bodyFaces,
        fins: [], // fins are already merged into bodyFaces
        combined: bodyFaces,
      },
      pinConstraints: {
        head: pinConstraintHead,
        mid: pinConstraintMid,
        tail: pinConstraintTail,
      },
      pins: {
        head: pinHead,
        mid: pinMid,
        tail: pinTail,
      },
      ringStartIndices,
      vertebraCount: vCount,
      particlesPerRing: ppRing,
      vertebraY,
      finData,
    };

    return {
      geometryData,
      physicsComponents: {},
      animationState: {
        undulationAmplitude: fishSpec.undulation.amplitude,
        undulationFrequency: fishSpec.undulation.frequency,
        undulationSpeed: fishSpec.undulation.speed,
        finFlutter: fishSpec.undulation.finFlutter,
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
    const gd = d.geometryData as FishGeometryData;
    const look = (materials as any).lookConfig as LookConfig | undefined;

    const group = new THREE.Group();

    // ── Body mesh (with fins merged) ────────────────────────────────────
    const bodyGeo = new THREE.BufferGeometry();
    bodyGeo.setAttribute('position', gd.position);
    bodyGeo.setAttribute('positionPrev', gd.positionPrev);
    bodyGeo.setIndex(gd.faces.combined);
    bodyGeo.computeVertexNormals();

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: look?.bulb.colorA ?? 0x6BA3D6,
      emissive: look?.bulb.colorB ?? 0x10233d,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: look?.bulb.opacity ?? 0.9,
      roughness: 0.28,
      metalness: 0.18,
      clearcoat: 0.55,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
      flatShading: false,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
    group.add(bodyMesh);

    return [
      {
        id: 'fish',
        geometryData: gd,
        group,
        bodyMaterial,
      } as unknown as UnitRuntime,
    ];
  },

  // ── animateBody ────────────────────────────────────────────────────────
  animateBody(data: BodyData, time: number, delta: number, amplitude: number): void {
    const d = data as any;
    const gd = d.geometryData as FishGeometryData;
    const spec = gd.spec;
    const positions = gd.system.positions;
    const previous = gd.system.positionsPrev;
    const rest = gd.restPositions;
    const particleCount = positions.length / 3;

    const undAmp = spec.undulation.amplitude * amplitude;
    const undFreq = spec.undulation.frequency;
    const undSpeed = spec.undulation.speed;

    // ── Traveling sine wave undulation ────────────────────────────────────
    // Displace laterally (X axis) with a traveling wave from head to tail.
    for (let i = 0; i < particleCount; i++) {
      // Skip pin particles.
      if (i === gd.pins.head || i === gd.pins.mid || i === gd.pins.tail) continue;

      const idx = i * 3;
      const yPos = rest[idx + 1];

      // Map Y position to body t (0 = head, 1 = tail).
      const bodyLen = spec.bodyLength;
      const headY = bodyLen * 0.5;
      const t = Math.max(0, Math.min(1, (headY - yPos) / bodyLen));

      // Traveling wave: sin(time * freq - t * speed) * t^power
      // t^power ensures the head moves less and tail moves more.
      const tPower = t * t * t; // cubic for more tail emphasis
      const wave = Math.sin(time * undFreq - t * undSpeed * 4.0);
      const displacement = wave * undAmp * tPower;

      positions[idx] = rest[idx] + displacement;
      positions[idx + 1] = rest[idx + 1];
      positions[idx + 2] = rest[idx + 2];
    }

    // ── Fin flutter ───────────────────────────────────────────────────────
    for (const fd of gd.finData) {
      for (let i = 0; i < fd.tipCount; i++) {
        const tipIdx = (fd.tipStart + i) * 3;
        const yPos = rest[tipIdx + 1];
        const bodyLen = spec.bodyLength;
        const headY = bodyLen * 0.5;
        const t = Math.max(0, Math.min(1, (headY - yPos) / bodyLen));

        const flutter = Math.sin(
          time * undFreq * fd.flutterSpeed * 1.5 + t * 20 + fd.tipStart,
        ) * undAmp * fd.flutterAmp * 0.5;

        positions[tipIdx] = rest[tipIdx] + flutter;
        positions[tipIdx + 1] = rest[tipIdx + 1];
        positions[tipIdx + 2] = rest[tipIdx + 2] + flutter * 0.3;
      }
    }

    // The physics solver treats position deltas as velocity. Synchronizing the
    // previous buffer makes this a bounded pose animation, not an accumulating
    // force that launches the creature out of view.
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
    const gd = d.geometryData as FishGeometryData;
    const positions = gd.system.positions;
    const particleCount = positions.length / 3;

    // Move pin constraints toward interaction origin.
    gd.pinConstraints.head.setPosition(origin.x, origin.y + gd.spec.bodyLength * 0.3, origin.z);
    gd.pinConstraints.mid.setPosition(origin.x, origin.y, origin.z);
    gd.pinConstraints.tail.setPosition(origin.x, origin.y - gd.spec.bodyLength * 0.3, origin.z);

    // Apply nudge force to non-pin particles.
    for (let i = 3; i < particleCount; i++) {
      const idx = i * 3;
      const px = positions[idx];
      const py = positions[idx + 1];
      const pz = positions[idx + 2];

      const dx = origin.x - px;
      const dy = origin.y - py;
      const dz = origin.z - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 0.01 && dist < 50) {
        const falloff = 1 - dist / 50;
        const factor = falloff * falloff * force * 0.5;
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
    // references are dropped. No explicit teardown required.
  },
};

// Register so getArchetype('fish') resolves immediately.
registerArchetype(fishArchetype);
