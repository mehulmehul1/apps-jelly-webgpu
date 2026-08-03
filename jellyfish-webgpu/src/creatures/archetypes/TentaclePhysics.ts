/**
 * TentaclePhysics.ts
 * 
 * Faithful implementation of:
 * "Physically based animation of sea anemones in real-time"
 * Larboulette, Aliaga, & Fabris (2009)
 * https://oa.upm.es/5789/2/INVE_MEM_2009_73302.pdf
 * 
 * Algorithm (Section 4):
 *   Each fiber = articulated skeleton of fixed-length segments.
 *   Fluid forces computed from 4 singularity types.
 *   Force decomposed: F = FL (along fiber) + FT (perpendicular) - only FT bends.
 *   Bending angle: tan(theta_i) = FT / (k_i * L_i)
 *   Moment propagates down chain: M(Ni) = FT x Li -> FM(Ni-1) = M(Ni) / Li-1
 *   Base node is fixed.
 */

import * as THREE from 'three/webgpu';

// ============================================================
// Constants - Sea water properties (paper Section 4.1)
// ============================================================

// Paper eq. 6->9: Linearized drag: Ff = A * V(Ni), A = 0.5 * rho * L * r
// (paper eq. 9: A = 0.5 * rho * L * r, Cd is absorbed into linear approximation)
const RHO_SCENE = 0.5;       // fluid density (tuned for engine unit scale)
// Clamp bending angle to prevent instability (radians)
const MAX_BEND_ANGLE = 0.35;

// ============================================================
// Types - Paper Sections 3.1, 4
// ============================================================

export type SingularityType = 'source' | 'hole' | 'whirlwind' | 'directional';

export interface Singularity {
  type: SingularityType;
  position: THREE.Vector3;
  strength: number;
  maxIntensity: number;
  direction?: THREE.Vector3;
}

export interface SkeletonNode {
  position: THREE.Vector3;
  positionPrev: THREE.Vector3;
  direction: THREE.Vector3;
  segmentLength: number;
  radius: number;
}

export interface TentacleParams {
  segments: number;
  length: number;
  baseRadius: number;
  tipRadius: number;
  /** Material stiffness at base (paper Section 4.2: k_i = stiffnessBase * (r_i / baseRadius)^stiffnessExponent) */
  stiffnessBase: number;
  /** Exponent for radius in stiffness computation */
  stiffnessExponent: number;
  radialSegments: number;
}

export interface FluidField {
  singularities: Singularity[];
  /** Compute velocity at a point in space at a given time */
  getVelocityAt(point: THREE.Vector3, time: number): THREE.Vector3;
}

export interface TentacleInstance {
  id: string;
  params: TentacleParams;
  nodes: SkeletonNode[];
  basePosition: THREE.Vector3;
  baseDirection: THREE.Vector3;
  profileKey: string;
}

export interface TentacleController {
  tentacles: TentacleInstance[];
  fluidField: FluidField;
  update(dt: number, time: number): void;
  setBehavior(behavior: keyof typeof BEHAVIOR_SINGULARITIES): void;
  setMouseTarget(worldPos: THREE.Vector3 | null): void;
  getMeshes(): {
    positions: Float32Array;
    positionsPrev: Float32Array;
    indices: Uint16Array;
    uvs: Float32Array;
    normals: Float32Array;
  }[];
}

// ============================================================
// Species-specific tentacle profiles
// ============================================================

export const TENTACLE_PROFILES = {
  // Actinia fragacea — Strawberry: short, thick, blunt, many
  actinia: {
    segments: 8, length: 10, baseRadius: 1.4, tipRadius: 0.3,
    stiffnessBase: 4.0, stiffnessExponent: 2.0,
    radialSegments: 8,
  },
  // Metridium senile — Plumose: many fine feathery tentacles, very mobile
  metridium: {
    segments: 10, length: 6, baseRadius: 0.3, tipRadius: 0.03,
    stiffnessBase: 1.5, stiffnessExponent: 1.5,
    radialSegments: 6,
  },
  // Anthopleura xanthogrammica — Giant green: medium, bulbous tips
  anthopleura: {
    segments: 8, length: 8, baseRadius: 0.6, tipRadius: 0.3,
    stiffnessBase: 3.0, stiffnessExponent: 1.8,
    radialSegments: 7,
  },
  // Edwardsia — Burrowing: few, very long, worm-like
  edwardsia: {
    segments: 12, length: 14, baseRadius: 0.4, tipRadius: 0.08,
    stiffnessBase: 2.0, stiffnessExponent: 1.2,
    radialSegments: 6,
  },
} as const;

export type TentacleProfileKey = keyof typeof TENTACLE_PROFILES;

// ============================================================
// Fluid Field - Paper Section 2: 4 Singularity Types
// ============================================================

export function createFluidField(singularities: Singularity[]): FluidField {
  return {
    singularities,
    getVelocityAt(point: THREE.Vector3, time: number): THREE.Vector3 {
      const velocity = new THREE.Vector3(0, 0, 0);
      const tmp = new THREE.Vector3();

      for (const s of singularities) {
        tmp.copy(s.position);
        const toPoint = tmp.sub(point);
        const dist = toPoint.length();

        // Falloff: alpha_max / (alpha_max + d^2) — paper eq. 2, 3, 4
        // Only applies to LOCAL fields (source, hole, whirlwind)
        const falloff = s.maxIntensity / (s.maxIntensity + dist * dist);

        switch (s.type) {
          case 'source': {
            // Paper eq. 2: S(p) = alpha * falloff * (C-p)/||C-p||
            if (dist > 1e-8) {
              const dir = toPoint.normalize();
              velocity.x += s.strength * falloff * dir.x;
              velocity.y += s.strength * falloff * dir.y;
              velocity.z += s.strength * falloff * dir.z;
            }
            break;
          }
          case 'hole': {
            // Paper eq. 3: H(p) = -S(p)
            if (dist > 1e-8) {
              const dir = toPoint.normalize();
              velocity.x -= s.strength * falloff * dir.x;
              velocity.y -= s.strength * falloff * dir.y;
              velocity.z -= s.strength * falloff * dir.z;
            }
            break;
          }
          case 'whirlwind': {
            // Paper eq. 4: W(p) = alpha * falloff * ((C-p) x R_hat) / ||(C-p) x R_hat||
            const axis = s.direction || new THREE.Vector3(0, 1, 0);
            const cross = new THREE.Vector3().crossVectors(toPoint, axis);
            const crossLen = cross.length();
            if (crossLen > 1e-8 && dist > 1e-8) {
              const dir = cross.normalize();
              velocity.x += s.strength * falloff * dir.x;
              velocity.y += s.strength * falloff * dir.y;
              velocity.z += s.strength * falloff * dir.z;
            }
            break;
          }
          case 'directional': {
            // Paper eq. 5: D(p) = phi(p,t) * v_hat
            // Directional is GLOBAL — no distance falloff. Intensity modulated by sine for wave effect.
            // phi(p,t) = A0 + A1 * sin(kx * x + kz * z + omega * t + phase)
            const dir = s.direction || new THREE.Vector3(1, 0, 0);
            // Traveling wave modulation: different frequencies create organic sway
            const wave1 = Math.sin(point.x * 0.3 + point.z * 0.2 + time * 0.6);
            const wave2 = Math.sin(point.x * 0.15 - point.z * 0.25 + time * 0.4 + 1.2);
            const mod = 0.5 + 0.5 * (0.6 * wave1 + 0.4 * wave2);
            velocity.x += s.strength * mod * dir.x;
            velocity.y += s.strength * mod * dir.y;
            velocity.z += s.strength * mod * dir.z;
            break;
          }
        }
      }

      return velocity;
    },
  };
}

// ============================================================
// Behavior presets
// ============================================================

export const BEHAVIOR_SINGULARITIES: Record<string, Singularity[]> = {
  // Gentle ambient — no constant directional bias so tentacles don't all lean one way
  ambient: [
    // Gentle whirlwind at crown height for organic swirling motion
    { type: 'whirlwind', position: new THREE.Vector3(0, 12, 0), strength: 0.5, maxIntensity: 0.6, direction: new THREE.Vector3(0, 1, 0) },
    // Very weak ambient current (barely perceptible, just enough to prevent total stillness)
    { type: 'directional', position: new THREE.Vector3(0, 0, 0), strength: 0.15, maxIntensity: 1, direction: new THREE.Vector3(0.5, 0, 0.2).normalize() },
  ],
  feeding: [
    { type: 'hole', position: new THREE.Vector3(0, 20, 0), strength: 4.0, maxIntensity: 10 },
    { type: 'directional', position: new THREE.Vector3(0, 0, 0), strength: 0.3, maxIntensity: 1, direction: new THREE.Vector3(0.1, -0.2, 0).normalize() },
  ],
  withdrawal: [
    { type: 'hole', position: new THREE.Vector3(0, 5, 0), strength: 8.0, maxIntensity: 20 },
    { type: 'directional', position: new THREE.Vector3(0, 0, 0), strength: 0.2, maxIntensity: 1, direction: new THREE.Vector3(0, -1, 0) },
  ],
  agonistic: [
    { type: 'source', position: new THREE.Vector3(0, 10, 0), strength: 5.0, maxIntensity: 15 },
    { type: 'whirlwind', position: new THREE.Vector3(0, 12, 0), strength: 3.0, maxIntensity: 5, direction: new THREE.Vector3(0, 1, 0) },
  ],
};

// ============================================================
// Articulated Skeleton - Paper Section 3.1
// ============================================================

export function createSkeleton(
  params: TentacleParams,
  basePosition: THREE.Vector3,
  baseDirection: THREE.Vector3
): SkeletonNode[] {
  const segmentLength = params.length / params.segments;
  const direction = baseDirection.clone().normalize();
  const nodes: SkeletonNode[] = [];

  let pos = basePosition.clone();

  for (let i = 0; i <= params.segments; i++) {
    const t = i / params.segments;
    const radius = params.baseRadius + (params.tipRadius - params.baseRadius) * t;

    nodes.push({
      position: pos.clone(),
      positionPrev: pos.clone(),
      direction: direction.clone(),
      segmentLength,
      radius,
    });

    pos.addScaledVector(direction, segmentLength);

    if (i < params.segments) {
      const curveAngle = 0.015 * Math.sin(t * Math.PI);
      const up = Math.abs(direction.y) > 0.9
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(direction, up).normalize();
      const binormal = new THREE.Vector3().crossVectors(direction, normal);
      direction.addScaledVector(binormal, curveAngle * 0.5);
      direction.addScaledVector(normal, curveAngle * 0.3);
      direction.normalize();
    }
  }

  return nodes;
}

// ============================================================
// Paper Algorithm - Section 4: Deformation of a Fiber
// ============================================================

export function updateSkeleton(
  nodes: SkeletonNode[],
  fluidVelocity: (point: THREE.Vector3, time: number) => THREE.Vector3,
  params: TentacleParams,
  time: number,
): void {
  const n = nodes.length - 1;

  const _tmpV = new THREE.Vector3();
  const _cross = new THREE.Vector3();
  const FT_vec = new THREE.Vector3();
  const FL_vec = new THREE.Vector3();
  const momentForce = new THREE.Vector3();

  let incomingMomentForce = new THREE.Vector3(0, 0, 0);
  let incomingFL = new THREE.Vector3(0, 0, 0);

  // Iterate from tip (n) down to node 1 (base N0 is fixed)
  for (let i = n; i >= 1; i--) {
    const node = nodes[i];

    // Step 1: Fluid force - paper eq. 9: Ff = 0.5 * rho * L * r * V(Ni)
    const A = 0.5 * RHO_SCENE * node.segmentLength * node.radius;
    const vel = fluidVelocity(node.position, time);
    const fluidForce = _tmpV.copy(vel).multiplyScalar(A);

    // Step 2: Net force - paper eq. 13
    const netForce = new THREE.Vector3()
      .copy(fluidForce)
      .add(incomingFL)
      .add(incomingMomentForce);

    // Step 3: Decompose into FL (along) and FT (perp)
    const dir = node.direction;
    const dotFL = netForce.dot(dir);
    FL_vec.copy(dir).multiplyScalar(dotFL);
    FT_vec.copy(netForce).sub(FL_vec);

    const ftMag = FT_vec.length();

    // Step 4: Bending angle - paper eq. 10->11
    // k_i = stiffnessBase * (r_i / baseRadius)^stiffnessExponent  (paper Section 6)
    const radiusRatio = node.radius / params.baseRadius;
    const k = params.stiffnessBase * Math.pow(radiusRatio, params.stiffnessExponent);
    // tan(theta_i) = FT / (k_i * L_i). Small-angle: theta_i ~= FT / (k_i * L_i)
    const bendAngle = ftMag / (k * node.segmentLength);
    const clampedAngle = Math.min(bendAngle, MAX_BEND_ANGLE);

    // Step 5: Apply bending
    if (ftMag > 1e-10 && clampedAngle > 1e-8) {
      // Paper eq. 10: rotate segment direction around axis perpendicular to both dir and FT.
      // cross(dir, FT) ensures the segment bends TOWARD the force, not away from it.
      const bendAxis = _cross.crossVectors(dir, FT_vec).normalize();
      const rot = new THREE.Quaternion().setFromAxisAngle(bendAxis, clampedAngle);
      nodes[i].direction.copy(dir).applyQuaternion(rot).normalize();
      nodes[i].positionPrev.copy(nodes[i].position);
    } else {
      nodes[i].positionPrev.copy(nodes[i].position);
    }

    // Step 6-7: Moment propagation - paper eq. 12
    const momentMag = ftMag * node.segmentLength;
    if (i > 1) {
      const prevLen = nodes[i - 1].segmentLength;
      if (prevLen > 1e-10 && ftMag > 1e-10) {
        momentForce.copy(FT_vec).normalize().multiplyScalar(momentMag / prevLen * 0.5);
        incomingMomentForce.copy(momentForce);
      } else {
        incomingMomentForce.set(0, 0, 0);
      }
    } else {
      incomingMomentForce.set(0, 0, 0);
    }

    // Step 8: Transmit FL
    incomingFL.copy(FL_vec);
  }

  // Reconstruct positions from base to maintain segment lengths
  reconstructPositions(nodes);
}

function reconstructPositions(nodes: SkeletonNode[]): void {
  // Determine stalk radius from the base node's attachment position.
  // nodes[0] sits exactly on the stalk surface, so its radial distance IS the stalk radius.
  const baseRadial = Math.sqrt(
    nodes[0].position.x * nodes[0].position.x +
    nodes[0].position.z * nodes[0].position.z
  );
  // Hard collision boundary: tentacle stays OUTSIDE the stalk, clamped to the surface.
  // Using baseRadial directly — the base IS the stalk radius at the attachment height.
  const MIN_RADIAL = baseRadial;

  const _newDir = new THREE.Vector3();

  for (let i = 1; i < nodes.length; i++) {
    nodes[i].positionPrev.copy(nodes[i].position);
    const prev = nodes[i - 1];
    const dir = nodes[i].direction.clone().normalize();
    dir.multiplyScalar(nodes[i].segmentLength);
    nodes[i].position.copy(prev.position).add(dir);

    // Stalk collision: prevent tentacle from penetrating the stalk column.
    // The stalk is a vertical cylinder centered at (0, y, 0). Clamp each node's
    // radial distance to stay AT or OUTSIDE the stalk surface.
    const radial = Math.sqrt(
      nodes[i].position.x * nodes[i].position.x +
      nodes[i].position.z * nodes[i].position.z
    );
    if (radial < MIN_RADIAL && radial > 0.001) {
      const scale = MIN_RADIAL / radial;
      nodes[i].position.x *= scale;
      nodes[i].position.z *= scale;

      // Update direction to match corrected position so the next frame doesn't
      // snap back into the stalk (direction continuity)
      _newDir.copy(nodes[i].position).sub(prev.position).normalize();
      nodes[i].direction.copy(_newDir);
    }
  }
}

// ============================================================
// Generalized Cylinder Mesh - Paper Section 3.2
// ============================================================

export function generateTentacleMesh(
  nodes: SkeletonNode[],
  params: TentacleParams
): {
  positions: Float32Array;
  positionsPrev: Float32Array;
  indices: Uint16Array;
  uvs: Float32Array;
  normals: Float32Array;
} {
  const n = nodes.length - 1;
  const radialSegs = params.radialSegments;
  const vertexCount = nodes.length * radialSegs;
  const indexCount = n * radialSegs * 6;

  const positions = new Float32Array(vertexCount * 3);
  const positionsPrev = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint16Array(indexCount);

  const _up = new THREE.Vector3(0, 1, 0);
  const _normal = new THREE.Vector3();
  const _binormal = new THREE.Vector3();
  const _worldPos = new THREE.Vector3();
  const _worldNormal = new THREE.Vector3();

  let pi = 0, ni = 0, ui = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const dir = node.direction;
    const t = i / n;

    if (Math.abs(dir.y) > 0.95) {
      _normal.set(1, 0, 0);
      _binormal.crossVectors(dir, _normal).normalize();
      _normal.crossVectors(_binormal, dir).normalize();
    } else {
      _normal.crossVectors(dir, _up).normalize();
      _binormal.crossVectors(dir, _normal).normalize();
    }

    for (let j = 0; j < radialSegs; j++) {
      const angle = (j / radialSegs) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      _worldPos
        .copy(node.position)
        .addScaledVector(_normal, cosA * node.radius)
        .addScaledVector(_binormal, sinA * node.radius);

      positions[pi] = _worldPos.x;
      positions[pi + 1] = _worldPos.y;
      positions[pi + 2] = _worldPos.z;
      positionsPrev[pi] = _worldPos.x;
      positionsPrev[pi + 1] = _worldPos.y;
      positionsPrev[pi + 2] = _worldPos.z;
      pi += 3;

      _worldNormal
        .copy(node.position)
        .addScaledVector(_normal, cosA * node.radius)
        .addScaledVector(_binormal, sinA * node.radius);
      _worldNormal.sub(node.position).normalize();

      normals[ni] = _worldNormal.x;
      normals[ni + 1] = _worldNormal.y;
      normals[ni + 2] = _worldNormal.z;
      ni += 3;

      uvs[ui] = j / radialSegs;
      uvs[ui + 1] = t;
      ui += 2;
    }
  }

  let idx = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const jNext = (j + 1) % radialSegs;
      const a = i * radialSegs + j;
      const b = i * radialSegs + jNext;
      const c = (i + 1) * radialSegs + jNext;
      const d = (i + 1) * radialSegs + j;

      indices[idx++] = a;
      indices[idx++] = b;
      indices[idx++] = c;
      indices[idx++] = c;
      indices[idx++] = d;
      indices[idx++] = a;
    }
  }

  return { positions, positionsPrev, indices, uvs, normals };
}

// ============================================================
// Tentacle Controller
// ============================================================

export function createTentacleController(
  tentacleConfigs: Array<{
    id: string;
    basePosition: THREE.Vector3;
    baseTangent: THREE.Vector3;
    profileKey: TentacleProfileKey;
    /** Optional inline params; if omitted, params are looked up from TENTACLE_PROFILES by profileKey */
    params?: TentacleParams;
  }>
): TentacleController {
  const tentacles: TentacleInstance[] = tentacleConfigs.map(cfg => {
    const params = cfg.params ?? TENTACLE_PROFILES[cfg.profileKey];
    const nodes = createSkeleton(params, cfg.basePosition, cfg.baseTangent);

    return {
      id: cfg.id,
      params,
      nodes,
      basePosition: cfg.basePosition.clone(),
      baseDirection: cfg.baseTangent.clone(),
      profileKey: cfg.profileKey,
    };
  });

  const fluidField = createFluidField(BEHAVIOR_SINGULARITIES.ambient);
  let mouseTarget: THREE.Vector3 | null = null;

  return {
    tentacles,
    fluidField,

    setMouseTarget(worldPos: THREE.Vector3 | null) {
      mouseTarget = worldPos ? new THREE.Vector3().copy(worldPos) : null;
    },

    update(_dt: number, time: number) {
      const _toMouse = new THREE.Vector3();
      for (const tentacle of tentacles) {
        updateSkeleton(
          tentacle.nodes,
          (p, t) => {
            const baseVel = fluidField.getVelocityAt(p, t);
            // Add mouse attraction if mouse is hovering nearby
            if (mouseTarget) {
              _toMouse.copy(mouseTarget).sub(p);
              const dist = _toMouse.length();
              if (dist > 0.1 && dist < 80) {
                const falloff = Math.max(0, 1 - dist / 80);
                const influence = falloff * falloff * 1.2;
                _toMouse.normalize().multiplyScalar(influence);
                baseVel.add(_toMouse);
              }
            }
            return baseVel;
          },
          tentacle.params,
          time,
        );
      }
    },

    setBehavior(behavior: keyof typeof BEHAVIOR_SINGULARITIES) {
      const singularities = BEHAVIOR_SINGULARITIES[behavior];
      this.fluidField = createFluidField(singularities);
    },

    getMeshes() {
      return tentacles.map(t =>
        generateTentacleMesh(t.nodes, t.params)
      );
    },
  };
}

export default {
  createSkeleton,
  updateSkeleton,
  generateTentacleMesh,
  createFluidField,
  createTentacleController,
  TENTACLE_PROFILES,
  BEHAVIOR_SINGULARITIES,
};
