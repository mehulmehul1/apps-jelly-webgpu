/**
 * CoralArchetype.ts
 *
 * Concrete CreatureArchetype for coral colonies using the
 * Kaandorp (2013) accretive growth model with Laplacian branching.
 *
 * The growth algorithm:
 * 1. Start with triangulated icosphere
 * 2. Voxelize mesh into 3D lattice
 * 3. Solve ∇²c = 0 via Jacobi iteration (nutrient field)
 * 4. Compute vertex displacement: V_new = V + n̂ · c_total · s
 * 5. Recompute normals from triangle connectivity
 * 6. Repeat until stopping criterion
 *
 * Branching emerges spontaneously from Mullins-Sekerka instability —
 * no explicit curvature rule is needed.
 *
 * Based on:
 * - Kaandorp 2013: ISRN Biomathematics, 10.1155/2013/159170
 * - Merks et al. 2003: J. Theor. Biol. 224:153-166
 *
 * Topology: Triangulated surface mesh rendered as solid geometry.
 * No Particulate.js — coral uses surface-mesh architecture while
 * other archetypes (jellyfish, anemone) keep Particulate.js.
 *
 * Registered once on import so getArchetype('coral') resolves immediately.
 */

import * as THREE from 'three/webgpu';
import {
  CreatureArchetype,
  BodyData,
  PhysicsConfig,
  SeededRNG,
  UnitMaterialPack,
  MeshOptions,
  UnitRuntime,
} from './CreatureArchetype';
import type { CreatureSpec, CoralSpec } from '../../jellyfish/creatures/CreatureSpec';
import { BulbNodeMaterial, GelNodeMaterial, InterpolatedPhysicalMaterial } from '../../jellyfish/materials';
import { LookConfig } from '../../editor/look-presets';
import { registerArchetype } from './archetypeRegistry';
import { uniform, uv, float, color } from 'three/tsl';
import {
  growthStep,
  recomputeNormals,
  KaandorpGrowthPipeline,
  GrowthConfig,
  DEFAULT_GRID_SIZE,
  MAX_EDGE_LENGTH,
  CURVATURE_REFINE_THRESHOLD,
  REFINE_JITTER,
} from './coral-growth-compute';

// ── Data Structures ────────────────────────────────────────────────────────

/** Growth state for the Kaandorp accretive model. */
interface CoralGrowthState {
  /** Current vertex positions (CPU-side). */
  positions: Float32Array;
  /** Current triangle indices (CPU-side). */
  indices: Uint32Array;
  /** Vertex normals (CPU-side). */
  normals: Float32Array;
  /** Number of active vertices. */
  vertexCount: number;
  /** Number of active triangles. */
  triangleCount: number;
  /** Growth generation counter. */
  generation: number;
  /** Root vertex index (base of coral). */
  rootVertex: number;
}

/** Full geometry data produced by buildBody and consumed by buildMeshes/animateBody. */
interface CoralGeometryData {
  spec: CoralSpec;
  /** Growth state (positions, indices, normals). */
  growthState: CoralGrowthState;
  /** Growth simulation config. */
  growthConfig: GrowthConfig;
  /** Three.js BufferGeometry for rendering. */
  meshGeometry: THREE.BufferGeometry;
  /** Shared buffer attributes for rendering. */
  positionAttr: THREE.BufferAttribute;
  positionPrevAttr: THREE.BufferAttribute;
  normalAttr: THREE.BufferAttribute;
  uvAttr: THREE.BufferAttribute;
  /** Number of growth steps to perform per frame. */
  stepsPerFrame: number;
  /** Maximum growth generation before stopping. */
  maxGenerations: number;
  /** World-space bounds for voxelization. */
  boundsMin: [number, number, number];
  boundsMax: [number, number, number];
}

// ── Archetype ──────────────────────────────────────────────────────────────

export const coralArchetype: CreatureArchetype = {
  id: 'coral',
  label: 'Coral',

  // ── buildBody ──────────────────────────────────────────────────────────
  buildBody(spec: CreatureSpec, _config: PhysicsConfig, _rng: SeededRNG): BodyData {
    const coralSpec = spec as CoralSpec;

    // ── Create initial icosphere with surface noise ────────────────────
    // Noise breaks symmetry so Mullins-Sekerka instability can trigger branching
    const initialRadius = 2.0;
    const subdivisions = 3; // 642 verts — higher resolution for finer branching
    const noiseAmount = 0.25; // 25% radius perturbation
    const seed = 42 + coralSpec.id.charCodeAt(0); // Per-species seed
    const { positions: initPositions, indices: initIndices, uvs: initUVs } =
      KaandorpGrowthPipeline.createIcosphere(initialRadius, subdivisions, noiseAmount, seed);

    // ── Apply preset-specific seed shape ─────────────────────────────────
    // The icosphere is scaled non-uniformly per growth axis so each preset
    // starts with a recognisably different geometry instead of the same ball.
    const seedScale = getSeedScale(coralSpec);
    if (seedScale[0] !== 1 || seedScale[1] !== 1 || seedScale[2] !== 1) {
      for (let i = 0; i < initPositions.length; i += 3) {
        initPositions[i]     *= seedScale[0];  // x
        initPositions[i + 1] *= seedScale[1];  // y
        initPositions[i + 2] *= seedScale[2];  // z
      }
    }

    let vertexCount = initPositions.length / 3;
    let triangleCount = initIndices.length / 3;

    // ── Compute initial normals ─────────────────────────────────────────
    const normals = new Float32Array(initPositions.length);
    recomputeNormals(initPositions, normals, initIndices, vertexCount, triangleCount);

    // ── Initialize growth state ─────────────────────────────────────────
    const growthState: CoralGrowthState = {
      positions: new Float32Array(initPositions),
      indices: new Uint32Array(initIndices),
      normals,
      vertexCount,
      triangleCount,
      generation: 0,
      rootVertex: 0,
    };

    // ── Growth config from preset ───────────────────────────────────────
    // Use larger grid for better Laplacian resolution (Merks 2003: high precision needed)
    const gridSize = coralSpec.resources.diffusionLength > 40 ? DEFAULT_GRID_SIZE : 48;
    const meshExtent = initialRadius * 2.5; // More margin for branching growth
    const growthConfig: GrowthConfig = {
      alpha: coralSpec.resources.alpha,
      ambientLight: coralSpec.resources.ambientLight,
      lightDir: [0, 1, 0],
      maxThickness: coralSpec.morphology.branchThickness * 0.6,
      growthRate: coralSpec.resources.growthRate,
      phototropism: coralSpec.growth.phototropism,
      bifurcationThreshold: coralSpec.resources.bifurcationThreshold,
      randomFactor: coralSpec.growth.randomFactor,
      gridSize,
      boundsMin: [-meshExtent, -meshExtent, -meshExtent],
      boundsMax: [meshExtent, meshExtent, meshExtent],
      seed,
      maxEdgeLength: MAX_EDGE_LENGTH,
      curvatureThreshold: CURVATURE_REFINE_THRESHOLD,
      refineJitter: REFINE_JITTER,
    };

    // ── Growth parameters from preset ───────────────────────────────────
    const growthAxis = coralSpec.morphology.growthAxis;
    let stepsPerFrame = 1;
    let maxGenerations = coralSpec.growth.maxGenerations;

    if (growthAxis === 'hemispherical') {
      // Brain coral: slow, compact dome — many steps, fewer generations
      stepsPerFrame = 1;
      maxGenerations = Math.min(maxGenerations, 5);
    } else if (growthAxis === 'fan') {
      // Sea fan: planar lattice, moderate speed
      stepsPerFrame = 2;
      maxGenerations = Math.min(maxGenerations, 6);
    } else if (growthAxis === 'vertical') {
      // Staghorn/organ pipe: fast vertical branching
      stepsPerFrame = 2;
      maxGenerations = Math.max(maxGenerations, 10);
    }

    // ── Create Three.js BufferGeometry ──────────────────────────────────
    const meshGeometry = new THREE.BufferGeometry();

    const positionArray = new Float32Array(growthState.positions);
    const positionPrevArray = new Float32Array(growthState.positions);
    const normalArray = new Float32Array(growthState.normals);

    const positionAttr = new THREE.BufferAttribute(positionArray, 3);
    const positionPrevAttr = new THREE.BufferAttribute(positionPrevArray, 3);
    const normalAttr = new THREE.BufferAttribute(normalArray, 3);
    const uvAttr = new THREE.BufferAttribute(new Float32Array(initUVs), 2);
    const indexAttr = new THREE.BufferAttribute(new Uint32Array(growthState.indices), 1);

    meshGeometry.setAttribute('position', positionAttr);
    meshGeometry.setAttribute('positionPrev', positionPrevAttr);
    meshGeometry.setAttribute('normal', normalAttr);
    meshGeometry.setAttribute('uv', uvAttr);
    meshGeometry.setIndex(indexAttr);

    // ── Geometry data ───────────────────────────────────────────────────
    const geometryData: CoralGeometryData = {
      spec: coralSpec,
      growthState,
      growthConfig,
      meshGeometry,
      positionAttr,
      positionPrevAttr,
      normalAttr,
      uvAttr,
      stepsPerFrame,
      maxGenerations,
      boundsMin: growthConfig.boundsMin,
      boundsMax: growthConfig.boundsMax,
    };

    return {
      geometryData,
      physicsComponents: {},
      animationState: {
        swayAmplitude: coralSpec.sway.amplitude,
        swayFrequency: coralSpec.sway.frequency,
      },
    } as BodyData;
  },

  // ── createMaterials ────────────────────────────────────────────────────
  createMaterials(lookConfig: LookConfig, refractionTarget: unknown): UnitMaterialPack {
    // ── Branch bulb material (surface shader) ──────────────────────────
    const bulbMaterial = new BulbNodeMaterial();
    bulbMaterial.setDiffuse(new THREE.Color(lookConfig.bulb.colorA));
    bulbMaterial.setDiffuseB(new THREE.Color(lookConfig.bulb.colorB));
    bulbMaterial.setOpacity(lookConfig.bulb.opacity);
    bulbMaterial.setPatternScale0(lookConfig.bulb.patternScale0);
    bulbMaterial.setPatternScale1(lookConfig.bulb.patternScale1);
    bulbMaterial.setRimBoost(lookConfig.bulb.rimBoost);

    // Wire refraction target if provided (RenderTarget → extract .texture)
    if (refractionTarget) {
      const rt = refractionTarget as THREE.RenderTarget;
      bulbMaterial.setRefractionTexture(rt.texture);
      bulbMaterial.setRefractionStrength(6.0);
      bulbMaterial.setRefractionResolution(rt.width, rt.height);
    }

    // ── Gel overlay material ──────────────────────────────────────────
    const gelMaterial = new GelNodeMaterial({
      diffuse: new THREE.Color(lookConfig.gel.color),
      opacity: lookConfig.gel.opacity,
    });

    // ── Tip glow material ─────────────────────────────────────────────
    const tipMat = new InterpolatedPhysicalMaterial({
      color: new THREE.Color(lookConfig.tentacle.color),
      transparent: true,
      opacity: lookConfig.tentacle.opacity,
      roughness: 0.3,
      metalness: 0.0,
      transmission: 0.2,
      thickness: 0.5,
      ior: 1.33,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    // Traveling shimmer along surface
    const tipTimeUniform = uniform(float(0.0));
    const tipColor = new THREE.Color(lookConfig.tentacle.color);
    const emissiveUniform = uniform(color(tipColor));

    const waveNode = uv().y.mul(8.0).sub(tipTimeUniform.mul(3.0)).sin().mul(0.5).add(0.5);
    const shimmerNode = uv().y.pow(3.0).mul(waveNode.mul(1.2).add(0.8));
    tipMat.emissiveNode = emissiveUniform.mul(shimmerNode).mul(2.5);

    (tipMat as any).setDiffuse = (c: THREE.Color) => {
      tipMat.color.copy(c);
      emissiveUniform.value.copy(c);
    };
    (tipMat as any).setOpacity = (o: number) => {
      tipMat.opacity = o;
    };
    (tipMat as any).setTime = (t: number) => {
      tipTimeUniform.value = t;
    };

    return {
      bulb: bulbMaterial,
      gel: gelMaterial,
      tip: tipMat,
      tipTimeUniform,
      emissiveUniform,
    } as unknown as UnitMaterialPack;
  },

  // ── buildMeshes ────────────────────────────────────────────────────────
  buildMeshes(
    data: BodyData,
    materials: UnitMaterialPack,
    _options: MeshOptions,
  ): UnitRuntime[] {
    const d = data as any;
    const gd = d.geometryData as CoralGeometryData;
    const mp = materials as any;

    const bulbMaterial = mp.bulb as BulbNodeMaterial;
    const gelMaterial = mp.gel as GelNodeMaterial;
    const tipMat = mp.tip as any;

    const group = new THREE.Group();

    // ── Create surface meshes ───────────────────────────────────────────
    // Coral uses a single opaque surface mesh (no gel/tip overlays — those
    // are jellyfish features; on coral they create a distracting ghost shell).
    const mainMesh = new THREE.Mesh(gd.meshGeometry, bulbMaterial);
    group.add(mainMesh);

    // Store time uniform reference on data so animateBody can update it
    (gd as any).__tipTimeUniform = mp.tipTimeUniform;

    return [
      {
        id: 'coral',
        geometryData: gd,
        group,
        bulbMaterial,
        gelMaterial,
        tentMaterial: tipMat,
        tipTimeUniform: mp.tipTimeUniform,
        emissiveUniform: mp.emissiveUniform,
      } as unknown as UnitRuntime,
    ];
  },

  // ── animateBody ────────────────────────────────────────────────────────
  animateBody(data: BodyData, time: number, _delta: number, amplitude: number): void {
    const d = data as any;
    const gd = d.geometryData as CoralGeometryData;
    const spec = gd.spec;
    const state = gd.growthState;
    const positions = state.positions;
    // previous tracks positions from last frame for velocity damping
    const previous = gd.positionPrevAttr.array as Float32Array;

    const swayAmp = spec.sway.amplitude * amplitude;
    const swayFreq = spec.sway.frequency;

    // Update tip glow animation time
    if ((gd as any).__tipTimeUniform) {
      (gd as any).__tipTimeUniform.value = time;
    }

    // ── 1. Save velocity reference (pre-growth/anim positions) ──────────
    // Copy current positions to previous BEFORE any mutation this frame
    const vCount = state.vertexCount;
    if (previous.length !== positions.length) {
      // Handle mesh refinement: reallocate prev buffer if needed
      const newPrev = new Float32Array(positions.length);
      const copyLen = Math.min(previous.length, positions.length);
      for (let i = 0; i < copyLen; i++) newPrev[i] = previous[i];
      gd.positionPrevAttr.array = newPrev;
      gd.positionPrevAttr.needsUpdate = true;
    }

    // ── 2. Growth step (if not at max generation) ───────────────────────
    if (state.generation < gd.maxGenerations) {
      // Save current positions as prev BEFORE growth modifies them
      const prev = gd.positionPrevAttr.array as Float32Array;
      for (let i = 0; i < vCount * 3; i++) prev[i] = positions[i];

      for (let step = 0; step < gd.stepsPerFrame; step++) {
        if (state.generation >= gd.maxGenerations) break;
        const result = growthStep(
          state.positions,
          state.normals,
          state.indices,
          state.vertexCount,
          gd.growthConfig,
        );
        // Handle mesh refinement (arrays may have been reallocated)
        state.positions = result.positions;
        state.normals = result.normals;
        state.indices = result.indices;
        state.vertexCount = result.vertexCount;
        state.triangleCount = result.triangleCount;
        state.generation++;
      }

      // Update Three.js geometry attributes for new vertex count.
      // IMPORTANT: replace the entire BufferAttribute (not just .array) on resize so the
      // WebGPU backend detects the larger size and reallocates its GPU buffer.
      const posCount = state.positions.length / 3;
      if (gd.positionAttr.count !== posCount) {
        gd.positionAttr = new THREE.BufferAttribute(state.positions, 3);
        gd.normalAttr = new THREE.BufferAttribute(state.normals, 3);
        gd.meshGeometry.setAttribute('position', gd.positionAttr);
        gd.meshGeometry.setAttribute('normal', gd.normalAttr);

        // Resize & copy previous positions
        const curPrev = gd.positionPrevAttr.array as Float32Array;
        const newPrev = new Float32Array(state.positions.length);
        const copyLen = Math.min(curPrev.length, state.positions.length);
        for (let i = 0; i < copyLen; i++) newPrev[i] = curPrev[i];
        gd.positionPrevAttr = new THREE.BufferAttribute(newPrev, 3);
        gd.meshGeometry.setAttribute('positionPrev', gd.positionPrevAttr);

        // Recompute UVs from vertex positions (spherical projection) so the
        // procedural BulbNodeMaterial pattern maps correctly on refined geometry.
        const uvs = new Float32Array(posCount * 2);
        computeUVs(state.positions, uvs, posCount);
        gd.uvAttr = new THREE.BufferAttribute(uvs, 2);
        gd.meshGeometry.setAttribute('uv', gd.uvAttr);
      } else {
        gd.positionAttr.array = state.positions;
        gd.positionAttr.needsUpdate = true;
        gd.normalAttr.array = state.normals;
        gd.normalAttr.needsUpdate = true;
      }

      // Only update index buffer when topology actually changes
      if ((gd as any).lastIndexCount !== state.indices.length) {
        gd.meshGeometry.setIndex(new THREE.BufferAttribute(
          new Uint32Array(state.indices),
          1,
        ));
        (gd as any).lastIndexCount = state.indices.length;
        gd.meshGeometry.computeBoundingSphere();
      }
    }

    // ── 3. Velocity-based physics (water viscosity) ─────────────────────
    // After growth, apply inertial velocity with damping
    // skip if no previous data
    if ((gd.positionPrevAttr.array as Float32Array).length >= vCount * 3) {
      const prevPos = gd.positionPrevAttr.array as Float32Array;
      const viscosity = 0.92;

      for (let i = 1; i < vCount; i++) {
        const idx = i * 3;
        // Velocity = current - last-frame position
        const vx = (positions[idx] - prevPos[idx]) * viscosity;
        const vy = (positions[idx + 1] - prevPos[idx + 1]) * viscosity;
        const vz = (positions[idx + 2] - prevPos[idx + 2]) * viscosity;

        // Store current as prev for next frame BEFORE we add sway
        prevPos[idx] = positions[idx];
        prevPos[idx + 1] = positions[idx + 1];
        prevPos[idx + 2] = positions[idx + 2];

        // Apply damped velocity (keeps interaction momentum alive)
        positions[idx] += vx;
        positions[idx + 1] += vy;
        positions[idx + 2] += vz;
      }
    }

    // ── 4. Additive current sway ────────────────────────────────────────
    // Sway is computed as an OFFSET from the neutral (post-growth, post-interaction) position
    // stored in positionAttr.array (= state.positions).
    // We compute the sway displacement and ADD it to the current position,
    // preserving growth + interaction displacements.
    const rest = gd.positionAttr.array as Float32Array;
    const prevPos = gd.positionPrevAttr.array as Float32Array;

    for (let i = 1; i < vCount; i++) {
      const idx = i * 3;
      // Rest = current neutral position (post-growth + post-interaction)
      const rx = rest[idx];
      const ry = rest[idx + 1];
      const rz = rest[idx + 2];
      const heightFrac = Math.min(1, Math.max(0, (ry + 5) / 25));

      const swayX = Math.sin(time * swayFreq + ry * 0.1) * swayAmp * heightFrac;
      const swayZ = Math.cos(time * swayFreq * 0.7 + ry * 0.08) * swayAmp * heightFrac * 0.7;

      const phaseOffset = Math.atan2(rz, rx) * 0.3;
      const swayX2 = Math.sin(time * swayFreq * 0.5 + phaseOffset) * swayAmp * heightFrac * 0.3;

      // Additive: current position = rest + sway (preserving growth + interaction)
      positions[idx] = rx + swayX + swayX2;
      positions[idx + 1] = ry;
      positions[idx + 2] = rz + swayZ;

      // Sync prev array to new position for next frame's velocity calc
      if (prevPos.length > idx + 2) {
        prevPos[idx] = positions[idx];
        prevPos[idx + 1] = positions[idx + 1];
        prevPos[idx + 2] = positions[idx + 2];
      }
    }

    // Root stays pinned
    positions[0] = 0;
    positions[1] = 0;
    positions[2] = 0;

    // ── 5. Mark dirty ───────────────────────────────────────────────────
    gd.positionAttr.needsUpdate = true;
    gd.positionPrevAttr.needsUpdate = true;
    gd.normalAttr.needsUpdate = true;
  },

  // ── applyInteraction ───────────────────────────────────────────────────
  applyInteraction(data: BodyData, force: number, origin: THREE.Vector3): void {
    const d = data as any;
    const gd = d.geometryData as CoralGeometryData;
    const positions = gd.growthState.positions;
    const particleCount = gd.growthState.vertexCount;

    for (let i = 1; i < particleCount; i++) {
      const idx = i * 3;
      const dx = origin.x - positions[idx];
      const dy = origin.y - positions[idx + 1];
      const dz = origin.z - positions[idx + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 0.01 && dist < 40) {
        const falloff = 1 - dist / 40;
        const factor = falloff * falloff * force * 0.5;
        positions[idx] += (dx / dist) * factor;
        positions[idx + 1] += (dy / dist) * factor;
        positions[idx + 2] += (dz / dist) * factor;
      }
    }
  },

  // ── dispose ────────────────────────────────────────────────────────────
  dispose(_data: BodyData): void {
    // GPU resources are cleaned up by Three.js renderer.
    // No explicit teardown needed.
  },
};

/**
 * Map each coral preset to a non-uniform seed scale so presets start with
 * recognisably different shapes instead of the same ball.
 *
 *   growthAxis   | compactness | scale (x, y, z)   | target shape
 *   ─────────────┼─────────────┼───────────────────┼─────────────────
 *   fan          | 0.20        | (1.0, 0.8, 0.15)  | flat vertical fan
 *   hemispherical| 0.80        | (1.0, 0.35, 1.0)  | flat dome
 *   vertical     | 0.36        | (0.6, 2.0, 0.6)   | tall stalk (staghorn)
 *   vertical     | 0.50        | (0.5, 1.8, 0.5)   | thin tube (organ pipe)
 *   vertical     | 0.85        | (1.3, 1.4, 1.3)   | thick column (pillar)
 */
function getSeedScale(spec: CoralSpec): [number, number, number] {
  const axis = spec.morphology.growthAxis;
  const c = spec.morphology.compactness;

  if (axis === 'fan')          return [1.0,    0.75,  Math.max(0.1, 0.4 - c * 1.2)];
  if (axis === 'hemispherical') return [1.0,    Math.max(0.25, 0.75 - c * 0.5), 1.0];
  // vertical axis: compactness drives thickness
  const thin = 0.4 + (1 - c) * 0.5;     // 0.4→0.9 (low compactness = thinner)
  const tall = 1.2 + c * 0.8;           // 1.2→2.0 (higher compactness = taller)
  return [thin, tall, thin];
}

/**
 * Compute UV coordinates from vertex positions using spherical projection.
 * Each vertex's XZ angle maps to U, and Y-height maps to V, giving a
 * consistent 2D parameterization across the coral surface mesh.
 */
function computeUVs(positions: Float32Array, out: Float32Array, count: number): void {
  // Find Y range for V-mapping
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    const y = positions[i * 3 + 1];
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const yRange = maxY - minY || 1;

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const x = positions[idx];
    const y = positions[idx + 1];
    const z = positions[idx + 2];

    // U: horizontal angle around Y axis → [0, 1]
    const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
    // V: height along Y axis → [0, 1]
    const v = (y - minY) / yRange;

    out[i * 2] = u;
    out[i * 2 + 1] = v;
  }
}

// Register so getArchetype('coral') resolves immediately.
registerArchetype(coralArchetype);
