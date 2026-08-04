import { describe, expect, it } from 'vitest';
import {
  growthStep,
  growthStepFromGrid,
  sampleGrid3D,
  voxelizeVertices,
  recomputeNormals,
  KaandorpGrowthPipeline,
  GrowthConfig,
} from '../coral-growth-compute';
import { getLaplacianSolver, GPU_JACOBI_ITERATIONS } from '../coral-laplacian-solver';

/**
 * A minimal GrowthConfig that mirrors the staghorn preset but uses a small
 * grid so the CPU solver stays fast.
 */
function makeConfig(overrides: Partial<GrowthConfig> = {}): GrowthConfig {
  return {
    alpha: 0.3,
    ambientLight: 0.15,
    lightDir: [0, 1, 0],
    maxThickness: 0.3,
    growthRate: 0.9,
    phototropism: 0.5,
    bifurcationThreshold: 0.45,
    randomFactor: 0.15,
    gridSize: 24,
    boundsMin: [-6, -1, -6],
    boundsMax: [6, 8, 6],
    seed: 42,
    maxEdgeLength: 1.2,
    curvatureThreshold: 1.6,
    refineJitter: 0.06,
    diffusionLength: 40,
    growthAxis: 'vertical',
    compactness: 0.7,
    taper: 0.2,
    maxVertices: 8000,
    maxRadius: 5,
    maxHeight: 6,
    tipThreshold: 0.5,
    ...overrides,
  };
}

/** Build a small noise-perturbed icosphere seed, returning positions/normals/indices. */
function makeSeed(seed = 7): { positions: Float32Array; normals: Float32Array; indices: Uint32Array; vertexCount: number; triangleCount: number } {
  const { positions, indices } = KaandorpGrowthPipeline.createIcosphere(2.0, 2, 0.1, seed);
  const vertexCount = positions.length / 3;
  const triangleCount = indices.length / 3;
  const normals = new Float32Array(positions.length);
  recomputeNormals(positions, normals, indices, vertexCount, triangleCount);
  return { positions, normals, indices, vertexCount, triangleCount };
}

describe('sampleGrid3D', () => {
  it('returns the exact value at lattice nodes', () => {
    const gs = 4;
    const grid = new Float32Array(gs * gs * gs);
    const boundsMin: [number, number, number] = [0, 0, 0];
    const boundsMax: [number, number, number] = [3, 3, 3];
    grid[1 + 1 * gs + 1 * gs * gs] = 0.75;
    // Node (1,1,1) in world space is exactly (1,1,1).
    expect(sampleGrid3D(grid, gs, boundsMin, boundsMax, 1, 1, 1)).toBeCloseTo(0.75, 5);
  });

  it('trilinearly interpolates between known corners', () => {
    const gs = 2; // corners only: (0|1)³
    const grid = new Float32Array(gs * gs * gs);
    const boundsMin: [number, number, number] = [0, 0, 0];
    const boundsMax: [number, number, number] = [1, 1, 1];
    // All zero except the (1,1,1) corner = 1.
    grid[1 + 1 * gs + 1 * gs * gs] = 1.0;
    // Centre of the cube: average of all corners = 0.125.
    expect(sampleGrid3D(grid, gs, boundsMin, boundsMax, 0.5, 0.5, 0.5)).toBeCloseTo(0.125, 5);
  });

  it('clamps out-of-domain probes to the boundary (finite)', () => {
    const gs = 4;
    const grid = new Float32Array(gs * gs * gs);
    const boundsMin: [number, number, number] = [0, 0, 0];
    const boundsMax: [number, number, number] = [3, 3, 3];
    // Below the floor → clamped to the y=0 layer; away from corners stays 0.
    const low = sampleGrid3D(grid, gs, boundsMin, boundsMax, 1.2, -50, 1.2);
    const high = sampleGrid3D(grid, gs, boundsMin, boundsMax, 1.2, 1.2, 500);
    expect(Number.isFinite(low)).toBe(true);
    expect(Number.isFinite(high)).toBe(true);
    expect(low).toBe(0);
    expect(high).toBe(0);
  });
});

describe('field-driven growth (Option A core)', () => {
  it('growthStepFromGrid stays finite, bounded, and consumes the field', async () => {
    const config = makeConfig();
    const gs = config.gridSize;
    const N = gs * gs * gs;

    const seed = makeSeed(7);

    // Voxelize + solve a field, then grow from it. Mirrors the GPU path but
    // through the generic solver (CPU fallback in CI without a WebGPU device).
    const solid = new Uint8Array(N);
    voxelizeVertices(seed.positions, seed.indices, seed.vertexCount, solid, gs, config.boundsMin, config.boundsMax);
    const solver = getLaplacianSolver();
    const grid = await solver.solve(solid, gs, 400);

    const res = growthStepFromGrid(seed.positions, seed.normals, seed.indices, seed.vertexCount, config, grid);

    expect(res.vertexCount).toBeGreaterThan(0);
    expect(res.positions.length).toBe(res.vertexCount * 3);
    expect(res.resource.length).toBe(res.vertexCount);

    let maxCoord = 0;
    for (const value of res.positions) {
      expect(Number.isFinite(value)).toBe(true);
      maxCoord = Math.max(maxCoord, Math.abs(value));
    }
    // Bounds clamp: maxHeight + a hair.
    expect(maxCoord).toBeLessThanOrEqual(config.maxHeight + 1);

    // Tips that sampled the high field should have resource > 0; nothing NaN.
    for (const r of res.resource) expect(Number.isFinite(r)).toBe(true);
  });

  it('growthStep (CPU fallback) still produces finite, bounded results', () => {
    const config = makeConfig();
    const seed = makeSeed(7);

    const res = growthStep(seed.positions, seed.normals, seed.indices, seed.vertexCount, config);

    let maxCoord = 0;
    for (const value of res.positions) {
      expect(Number.isFinite(value)).toBe(true);
      maxCoord = Math.max(maxCoord, Math.abs(value));
    }
    expect(maxCoord).toBeLessThanOrEqual(config.maxHeight + 1);
    expect(res.vertexCount).toBeGreaterThanOrEqual(seed.vertexCount); // refinement only adds
  });

  it('GPU iteration count is sane and positive', () => {
    expect(GPU_JACOBI_ITERATIONS).toBeGreaterThan(0);
  });
});
