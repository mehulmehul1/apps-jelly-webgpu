/**
 * CoralArchetype.ts
 *
 * Rebuilt concrete CreatureArchetype for coral colonies using the emergent
 * accretive-growth model in coral-growth-compute.ts (Kaandorp 2013 +
 * Merks 2003 Laplacian branching).
 *
 * Design notes
 * ------------
 * - The colony is a SINGLE watertight surface mesh grown by the
 *   accretive-growth model. Branching is emergent (Mullins-Sekerka
 *   instability + resource-gated refinement), not a hand-built tree.
 * - Distinct morphology is driven by the spec's growthAxis via a
 *   morphology-aware growth-axis field (fan / hemispherical / vertical /
 *   encrusting), so every preset reads as a different form.
 * - Polyp tips are represented by a small, additive POINT cloud (glowing
 *   polyp tips) rather than a translucent shell. No gel/emissive overlay is
 *   put over the body mesh, which permanently removes the "ghost shell"
 *   artifact (jellyfish-only features leaking onto the coral surface).
 * - Gentle current-driven sway is added as a bounded additive offset to the
 *   neutral (grown) positions each frame; the root stays pinned.
 * - Growth is bounded by a strict vertex budget, a per-step displacement cap
 *   and soft world clamps, so the model stays finite and NaN-free.
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
import { BulbNodeMaterial } from '../../jellyfish/materials';
import { LookConfig } from '../../editor/look-presets';
import { registerArchetype } from './archetypeRegistry';
import {
  growthStep,
  growthStepFromGrid,
  voxelizeVertices,
  computeTips,
  recomputeNormals,
  KaandorpGrowthPipeline,
  GrowthConfig,
  GrowthResult,
  DEFAULT_MAX_VERTICES,
  MAX_EDGE_LENGTH,
  CURVATURE_REFINE_THRESHOLD,
  REFINE_JITTER,
} from './coral-growth-compute';
import {
  getLaplacianSolver,
  isGPUSolverAvailable,
  GPU_JACOBI_ITERATIONS,
  LaplacianSolver,
} from './coral-laplacian-solver';

// ── Data structures ────────────────────────────────────────────────────────

/** Growth state for the accretive model. */
interface CoralGrowthState {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  vertexCount: number;
  triangleCount: number;
  /** Growth generation counter. */
  generation: number;
  /** Root vertex index (base of the colony, pinned). */
  rootVertex: number;
  /** Per-vertex resource from the last solve (used for tip detection). */
  resource: Float32Array;
}

/** Full geometry data produced by buildBody, consumed by buildMeshes/animateBody. */
interface CoralGeometryData {
  spec: CoralSpec;
  growthState: CoralGrowthState;
  growthConfig: GrowthConfig;
  meshGeometry: THREE.BufferGeometry;
  positionAttr: THREE.BufferAttribute;
  positionPrevAttr: THREE.BufferAttribute;
  normalAttr: THREE.BufferAttribute;
  uvAttr: THREE.BufferAttribute;
  /** Growth steps to run per frame. */
  stepsPerFrame: number;
  /** Total growth generation cap. */
  maxGenerations: number;
  /** Field solver (GPU when the WebGPU device is present, else CPU). */
  solver: LaplacianSolver;
  /** True while an async GPU growth batch is in flight (avoids re-entry). */
  growthBusy: boolean;
  /** Polyp-tip glow point cloud. */
  tipPoints: THREE.Points;
  tipAttr: THREE.BufferAttribute;
  tipMaterial: THREE.PointsMaterial;
  /** Current frame time (for tip pulse). */
  time: number;
}

// ── Archetype ──────────────────────────────────────────────────────────────

export const coralArchetype: CreatureArchetype = {
  id: 'coral',
  label: 'Coral',

  // ── buildBody ──────────────────────────────────────────────────────────
  buildBody(spec: CreatureSpec, _config: PhysicsConfig, _rng: SeededRNG): BodyData {
    const coralSpec = spec as CoralSpec;

    // Seed geometry: a noise-perturbed icosphere, non-uniformly scaled so each
    // preset already starts as a recognisably different blob.
    const initialRadius = 2.0;
    const subdivisions = 3;
    const noiseAmount = 0.22;
    const seed = 42 + (coralSpec.id.charCodeAt(0) | 0);
    const { positions: initPositions, indices: initIndices } =
      KaandorpGrowthPipeline.createIcosphere(initialRadius, subdivisions, noiseAmount, seed);

    const seedScale = getSeedScale(coralSpec);
    for (let i = 0; i < initPositions.length; i += 3) {
      initPositions[i] *= seedScale[0];
      initPositions[i + 1] *= seedScale[1];
      initPositions[i + 2] *= seedScale[2];
    }

    let vertexCount = initPositions.length / 3;
    let triangleCount = initIndices.length / 3;
    const normals = new Float32Array(initPositions.length);
    recomputeNormals(initPositions, normals, initIndices, vertexCount, triangleCount);

    // GPU field solve available? If so we run ~16× more, thinner growth steps
    // on a 64³ grid (smooth accretive branching like the Houdini reference).
    const gpu = isGPUSolverAvailable();
    const growthConfig = buildGrowthConfig(coralSpec, seedScale, initialRadius, seed, gpu);

    const growthState: CoralGrowthState = {
      positions: new Float32Array(initPositions),
      indices: new Uint32Array(initIndices),
      normals,
      vertexCount,
      triangleCount,
      generation: 0,
      rootVertex: 0,
      resource: new Float32Array(vertexCount),
    };

    // Pre-grow a few generations so the colony starts with its habit, then let
    // animateBody continue. Each preset gets its own emergent initial form.
    const initialSteps = Math.min(3, Math.max(1, Math.floor(coralSpec.growth.maxGenerations / 2)));
    runGrowthSteps(growthState, growthConfig, initialSteps);

    const stepsPerFrame = getStepsPerFrame(coralSpec);
    // Thin-step mode (GPU): ~16× the spec generations for smooth accretion.
    const maxGenerations = gpu
      ? Math.min(160, Math.max(16, coralSpec.growth.maxGenerations * 16))
      : coralSpec.growth.maxGenerations;

    // ── Three.js BufferGeometry for the single body surface mesh ────────
    const meshGeometry = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(new Float32Array(growthState.positions), 3);
    const positionPrevAttr = new THREE.BufferAttribute(new Float32Array(growthState.positions), 3);
    const normalAttr = new THREE.BufferAttribute(new Float32Array(growthState.normals), 3);
    const uvAttr = new THREE.BufferAttribute(computeUVs(growthState.positions), 2);
    const indexAttr = new THREE.BufferAttribute(new Uint32Array(growthState.indices), 1);

    meshGeometry.setAttribute('position', positionAttr);
    meshGeometry.setAttribute('positionPrev', positionPrevAttr);
    meshGeometry.setAttribute('normal', normalAttr);
    meshGeometry.setAttribute('uv', uvAttr);
    meshGeometry.setIndex(indexAttr);

    // ── Polyp-tip glow point cloud ──────────────────────────────────────
    const maxTips = Math.min(160, Math.max(40, Math.floor((coralSpec.budget?.maxParticles ?? 4000) * 0.035)));
    const tips = computeTips(growthState.positions, growthState.resource, growthState.vertexCount, growthConfig, maxTips);

    // Create material + points later in buildMeshes; here we only store geometry data.
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
      solver: getLaplacianSolver(),
      growthBusy: false,
      tipPoints: undefined as unknown as THREE.Points,
      tipAttr: new THREE.BufferAttribute(tips.positions, 3),
      tipMaterial: undefined as unknown as THREE.PointsMaterial,
      time: 0,
    };
    (geometryData as any).__tipPositions = tips.positions;

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
    // Body surface: opaque branch material (NO gel/tip overlay — that was the
    // ghost-shell leak). Polyp tips get their own point-glow material below.
    const bulbMaterial = new BulbNodeMaterial();
    bulbMaterial.setDiffuse(new THREE.Color(lookConfig.bulb.colorA));
    bulbMaterial.setDiffuseB(new THREE.Color(lookConfig.bulb.colorB));
    bulbMaterial.setOpacity(lookConfig.bulb.opacity);
    bulbMaterial.setPatternScale0(lookConfig.bulb.patternScale0);
    bulbMaterial.setPatternScale1(lookConfig.bulb.patternScale1);
    bulbMaterial.setRimBoost(lookConfig.bulb.rimBoost);

    if (refractionTarget) {
      const rt = refractionTarget as THREE.RenderTarget;
      bulbMaterial.setRefractionTexture(rt.texture);
      bulbMaterial.setRefractionStrength(6.0);
      bulbMaterial.setRefractionResolution(rt.width, rt.height);
    }

    // Polyp-tip glow: tiny additive points (bloomed in post-processing).
    const tipColor = new THREE.Color(lookConfig.tentacle.color);
    const tipMaterial = new THREE.PointsMaterial({
      color: tipColor,
      size: 0.55,
      transparent: true,
      opacity: Math.min(1, (lookConfig.tentacle.opacity ?? 0.5) * 1.6),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { bulb: bulbMaterial, tip: tipMaterial } as unknown as UnitMaterialPack;
  },

  // ── buildMeshes ────────────────────────────────────────────────────────
  buildMeshes(data: BodyData, materials: UnitMaterialPack, _options: MeshOptions): UnitRuntime[] {
    const d = data as any;
    const gd = d.geometryData as CoralGeometryData;
    const mp = materials as any;

    const bulbMaterial = mp.bulb as BulbNodeMaterial;
    const tipMaterial = mp.tip as THREE.PointsMaterial;

    const group = new THREE.Group();

    // ONLY the single opaque surface mesh covers the coral body (no ghost shell).
    const mainMesh = new THREE.Mesh(gd.meshGeometry, bulbMaterial);
    group.add(mainMesh);

    // Polyp-tip glow points — a decorative additive point cloud, never a shell.
    addPolyps(gd, tipMaterial);
    group.add(gd.tipPoints);

    return [
      {
        id: 'coral',
        geometryData: gd,
        group,
        bulbMaterial,
        tipMaterial,
      } as unknown as UnitRuntime,
    ];
  },


  // ── animateBody ────────────────────────────────────────────────────────
  animateBody(data: BodyData, time: number, _delta: number, amplitude: number): void {
    const d = data as any;
    const gd = d.geometryData as CoralGeometryData;
    const state = gd.growthState;
    const spec = gd.spec;

    gd.time = time;

    // 1. Continue emergent growth until the generation cap is reached.
    //    The growth pump is async (GPU solve + readback), so kick it off once
    //    per frame and let the `growthBusy` guard prevent re-entry.
    if (state.generation < gd.maxGenerations && !gd.growthBusy) {
      gd.growthBusy = true;
      pumpGrowth(gd).finally(() => { gd.growthBusy = false; });
    }

    // 2. Gentle current-driven sway (bounded additive offset from neutral).
    const swayAmp = spec.sway.amplitude * amplitude;
    const swayFreq = spec.sway.frequency;
    const maxH = gd.growthConfig.maxHeight;

    const posArr = gd.positionAttr.array as Float32Array;
    const neutral = state.positions;
    const vCount = state.vertexCount;
    for (let i = 1; i < vCount; i++) {
      const idx = i * 3;
      const rx = neutral[idx], ry = neutral[idx + 1], rz = neutral[idx + 2];
      // Root pinned at origin; skip waves near the base.
      const heightFrac = Math.min(1, Math.max(0, ry / (maxH || 1)));
      const amp = swayAmp * heightFrac;
      const ph = Math.atan2(rz, rx);

      const swayX = Math.sin(time * swayFreq * 0.7 + ry * 0.11 + ph * 0.3) * amp;
      const swayZ = Math.cos(time * swayFreq * 0.5 + ry * 0.09 + ph * 0.2) * amp * 0.7;
      posArr[idx] = rx + swayX;
      posArr[idx + 1] = ry;
      posArr[idx + 2] = rz + swayZ;
    }
    posArr[0] = neutral[0];
    posArr[1] = neutral[1];
    posArr[2] = neutral[2];

    // Keep the prev attribute in sync (used by shaders for velocity/refraction).
    const prev = gd.positionPrevAttr.array as Float32Array;
    if (prev.length === posArr.length) {
      prev.set(posArr);
    }

    // 3. Sway the polyp tips in sync + gentle pulse.
    const tipPos = (gd as any).__tipPositions as Float32Array;
    if (tipPos && gd.tipPoints && gd.tipAttr.count > 0) {
      const tCount = gd.tipAttr.count;
      const pulse = 0.85 + 0.15 * Math.sin(time * 1.6);
      gd.tipMaterial.opacity = Math.min(1, gd.tipMaterial.opacity * pulse || pulse);
      for (let i = 0; i < tCount; i++) {
        const idx = i * 3;
        const rx = tipPos[idx], ry = tipPos[idx + 1], rz = tipPos[idx + 2];
        const heightFrac = Math.min(1, Math.max(0, ry / (maxH || 1)));
        const amp = swayAmp * heightFrac;
        const ph = Math.atan2(rz, rx);
        gd.tipAttr.array[idx] = rx + Math.sin(time * swayFreq * 0.7 + ry * 0.11 + ph * 0.3) * amp;
        gd.tipAttr.array[idx + 1] = ry;
        gd.tipAttr.array[idx + 2] = rz + Math.cos(time * swayFreq * 0.5 + ry * 0.09 + ph * 0.2) * amp * 0.7;
      }
      gd.tipAttr.needsUpdate = true;
    }

    gd.positionAttr.needsUpdate = true;
    gd.positionPrevAttr.needsUpdate = true;
    gd.normalAttr.needsUpdate = true;
  },

  // ── applyInteraction ───────────────────────────────────────────────────
  applyInteraction(data: BodyData, force: number, origin: THREE.Vector3): void {
    const d = data as any;
    const gd = d.geometryData as CoralGeometryData;
    const neutral = gd.growthState.positions;
    const count = gd.growthState.vertexCount;

    for (let i = 1; i < count; i++) {
      const idx = i * 3;
      const dx = origin.x - neutral[idx];
      const dy = origin.y - neutral[idx + 1];
      const dz = origin.z - neutral[idx + 2];
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 0.01 && dist < 40) {
        const falloff = 1 - dist / 40;
        const factor = falloff * falloff * force * 0.5;
        neutral[idx] += (dx / dist) * factor;
        neutral[idx + 1] += (dy / dist) * factor;
        neutral[idx + 2] += (dz / dist) * factor;
      }
    }
  },

  // ── dispose ────────────────────────────────────────────────────────────
  dispose(data: BodyData): void {
    const d = data as any;
    const gd = d.geometryData as CoralGeometryData;
    if (gd?.tipPoints?.geometry) gd.tipPoints.geometry.dispose();
    if (gd?.meshGeometry) gd.meshGeometry.dispose();
    if (gd?.tipMaterial) gd.tipMaterial.dispose();
  },
};



// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map each coral preset to a non-uniform seed scale so presets start with
 * distinct shapes instead of the same ball (prior to emergent growth).
 */
function getSeedScale(spec: CoralSpec): [number, number, number] {
  const axis = spec.morphology.growthAxis;
  const c = spec.morphology.compactness;

  switch (axis) {
    case 'fan':
      return [1.15, 1.0, Math.max(0.12, 0.5 - c * 1.1)];   // flat vertical fan
    case 'hemispherical':
      return [1.1, Math.max(0.3, 0.8 - c * 0.4), 1.1];     // low, wide dome
    case 'vertical': {
      // Thin tube → thick column driven by compactness.
      const thin = 0.45 + (1 - c) * 0.5;                   // 0.45→0.95
      const tall = 1.25 + c * 0.7;                         // taller when compact
      return [thin, tall, thin];
    }
    case 'encrusting':
      return [1.5, 0.28, 1.5];                             // short, wide mat
  }
}

/** Build the growth config for a spec, with generous but finite bounds. */
function buildGrowthConfig(
  spec: CoralSpec,
  seedScale: [number, number, number],
  initialRadius: number,
  seed: number,
  gpu: boolean,
): GrowthConfig {
  const gx = initialRadius * seedScale[0];
  const gy = initialRadius * seedScale[1];
  const gz = initialRadius * seedScale[2];
  const gens = Math.max(1, spec.growth.maxGenerations);

  // Growth allowance so colonies extend beyond the seed blob.
  const allow = spec.growth.segmentLength * gens * 0.85;

  // Habit-dependent vertical/radial extent.
  let maxHeight: number;
  let maxRadius: number;
  switch (spec.morphology.growthAxis) {
    case 'vertical':
      maxHeight = gy + allow * 1.35;
      maxRadius = Math.max(gx, gz) + allow * 0.5;
      break;
    case 'fan':
      maxHeight = gy + allow * 0.95;
      maxRadius = gx + allow * 0.85;
      break;
    case 'encrusting':
      maxHeight = gy + allow * 0.22;
      maxRadius = Math.max(gx, gz) + allow * 1.1;
      break;
    default: // hemispherical
      maxHeight = gy + allow * 0.7;
      maxRadius = Math.max(gx, gz) + allow * 0.8;
  }

  // GPU path solves on a 64³ grid (fine detail); CPU fallback stays coarse.
  const gridSize = gpu ? 64 : (spec.resources.diffusionLength > 40 ? 48 : 40);
  const meshExtent = Math.max(maxRadius, maxHeight) + 2;

  const budget = Math.min(DEFAULT_MAX_VERTICES, Math.max(800, (spec.budget?.maxParticles ?? 4000) * 2));

  // Thin-step mode (GPU): halve per-step thickness since we take ~16× more steps.
  const thicknessScale = gpu ? 0.5 : 1;

  return {
    alpha: spec.resources.alpha,
    ambientLight: spec.resources.ambientLight,
    lightDir: [0, 1, 0],
    maxThickness: Math.max(0.1, spec.morphology.branchThickness * 0.45) * thicknessScale,
    growthRate: Math.max(0.02, spec.resources.growthRate),
    phototropism: spec.growth.phototropism,
    bifurcationThreshold: spec.resources.bifurcationThreshold,
    randomFactor: spec.growth.randomFactor,
    gridSize,
    boundsMin: [-meshExtent, -1.5, -meshExtent],
    boundsMax: [meshExtent, maxHeight + 1, meshExtent],
    seed,
    maxEdgeLength: MAX_EDGE_LENGTH,
    curvatureThreshold: CURVATURE_REFINE_THRESHOLD,
    refineJitter: REFINE_JITTER,
    diffusionLength: spec.resources.diffusionLength,
    growthAxis: spec.morphology.growthAxis,
    compactness: spec.morphology.compactness,
    taper: spec.morphology.taper,
    maxVertices: budget,
    maxRadius,
    maxHeight,
    tipThreshold: Math.min(1, Math.max(0.35, spec.resources.bifurcationThreshold * 1.05)),
  };
}

/** Growth steps to run per frame, by habit. */
function getStepsPerFrame(spec: CoralSpec): number {
  switch (spec.morphology.growthAxis) {
    case 'vertical':
      return 1 + Math.round((spec.morphology.compactness + 0.2) * 2);
    case 'fan':
      return 2;
    case 'encrusting':
      return 2;
    default:
      return 1;
  }
}

/**
 * Run `n` growth steps on the state, reassigning arrays when refinement
 * reallocates. Returns whether at least one step advanced.
 */
function runGrowthSteps(state: CoralGrowthState, config: GrowthConfig, n: number): boolean {
  let advanced = false;
  for (let s = 0; s < n; s++) {
    const res = growthStep(state.positions, state.normals, state.indices, state.vertexCount, config);
    applyGrowthResult(state, res);
    advanced = true;
  }
  return advanced;
}

/**
 * Async growth pump: runs `stepsPerFrame` accretive steps, each one
 * voxelizing the current surface, solving the Laplacian field (GPU compute
 * when available, else CPU), and displacing vertices from the solved field.
 * Geometry/tips are re-synced once per batch. Returns the number of steps run.
 */
async function pumpGrowth(gd: CoralGeometryData): Promise<number> {
  const state = gd.growthState;
  const config = gd.growthConfig;
  const solver = gd.solver;
  const gs = config.gridSize;
  const N = gs * gs * gs;

  let stepsRun = 0;
  for (let s = 0; s < gd.stepsPerFrame; s++) {
    if (state.generation >= gd.maxGenerations) break;

    let res: GrowthResult;
    if (solver.isGPU) {
      // Voxelize the current surface (thin crust, matching the CPU path).
      const solid = new Uint8Array(N);
      voxelizeVertices(state.positions, state.indices, state.vertexCount, solid, gs, config.boundsMin, config.boundsMax);
      const field = await solver.solve(solid, gs, GPU_JACOBI_ITERATIONS);
      res = growthStepFromGrid(state.positions, state.normals, state.indices, state.vertexCount, config, field);
    } else {
      res = growthStep(state.positions, state.normals, state.indices, state.vertexCount, config);
    }

    applyGrowthResult(state, res);
    stepsRun++;
  }

  if (stepsRun > 0) {
    syncGeometry(gd);
    refreshTips(gd);
  }
  return stepsRun;
}

/** Copy a growth-step result back into the growth state (reassigning arrays). */
function applyGrowthResult(state: CoralGrowthState, res: GrowthResult): void {
  state.positions = res.positions;
  state.normals = res.normals;
  state.indices = res.indices;
  state.vertexCount = res.vertexCount;
  state.triangleCount = res.triangleCount;
  state.resource = res.resource;
  state.generation++;
}


/** Re-sync GPU/shared buffers after growth changed the topology or positions. */
function syncGeometry(gd: CoralGeometryData): void {
  const state = gd.growthState;
  const posCount = state.vertexCount;

  if (gd.positionAttr.count !== posCount) {
    // Replace the whole BufferAttribute so the WebGPU backend reallocates.
    gd.positionAttr = new THREE.BufferAttribute(new Float32Array(state.positions), 3);
    gd.normalAttr = new THREE.BufferAttribute(new Float32Array(state.normals), 3);
    gd.meshGeometry.setAttribute('position', gd.positionAttr);
    gd.meshGeometry.setAttribute('normal', gd.normalAttr);

    gd.positionPrevAttr = new THREE.BufferAttribute(new Float32Array(state.positions), 3);
    gd.meshGeometry.setAttribute('positionPrev', gd.positionPrevAttr);

    const uvs = computeUVs(state.positions);
    gd.uvAttr = new THREE.BufferAttribute(uvs, 2);
    gd.meshGeometry.setAttribute('uv', gd.uvAttr);
  } else {
    gd.positionAttr.array.set(state.positions);
    gd.positionAttr.needsUpdate = true;
    gd.normalAttr.array.set(state.normals);
    gd.normalAttr.needsUpdate = true;
    const prev = gd.positionPrevAttr.array as Float32Array;
    if (prev.length === state.positions.length) prev.set(state.positions);
  }

  if ((gd as any).lastIndexCount !== state.indices.length) {
    gd.meshGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(state.indices), 1));
    (gd as any).lastIndexCount = state.indices.length;
    gd.meshGeometry.computeBoundingSphere();
  }
}

/** Create the polyp-tip point cloud mesh (called once from buildMeshes). */
function addPolyps(gd: CoralGeometryData, tipMaterial: THREE.PointsMaterial): void {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', gd.tipAttr);
  gd.tipMaterial = tipMaterial;
  gd.tipPoints = new THREE.Points(geo, tipMaterial);
  gd.tipPoints.frustumCulled = false;
}

/** Recompute polyp-tip positions from the latest growth/resource state. */
function refreshTips(gd: CoralGeometryData): void {
  const state = gd.growthState;
  const maxTips = gd.tipAttr.count;
  const tips = computeTips(state.positions, state.resource, state.vertexCount, gd.growthConfig, maxTips);
  const arr = gd.tipAttr.array as Float32Array;
  const n = tips.count;
  for (let i = 0; i < n * 3; i++) arr[i] = tips.positions[i];
  // Fill the fixed buffer with the trailing tip so no stale hole remains.
  for (let i = n * 3; i < arr.length; i++) arr[i] = arr[Math.max(i - 3, 0)];
  gd.tipAttr.needsUpdate = true;
  (gd as any).__tipPositions = new Float32Array(arr);
}

/** Compute UV coordinates from vertex positions (cylindrical projection). */
function computeUVs(positions: Float32Array): Float32Array {
  const count = positions.length / 3;
  const out = new Float32Array(count * 2);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    const y = positions[i * 3 + 1];
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const yRange = maxY - minY || 1;
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    out[i * 2] = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
    out[i * 2 + 1] = (y - minY) / yRange;
  }
  return out;
}

// Register so getArchetype('coral') resolves immediately.
registerArchetype(coralArchetype);

