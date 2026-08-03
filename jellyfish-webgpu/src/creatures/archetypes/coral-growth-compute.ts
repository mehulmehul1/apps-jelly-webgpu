/**
 * coral-growth-compute.ts
 *
 * Kaandorp (2013) accretive growth model — CPU field solve + surface mesh.
 *
 * Algorithm per step:
 * 1. Voxelize mesh + fill interior (solid shell blocks nutrient flow)
 * 2. Solve ∇²c = 0 via Jacobi iteration (nutrient from top)
 * 3. Displace each vertex along normal proportional to nutrient + light
 * 4. Recompute normals from triangle connectivity
 *
 * Branching emerges from Mullins-Sekerka instability:
 * protrusions get more nutrient → grow faster → protrude more → branch.
 *
 * Based on:
 * - Kaandorp 2013: ISRN Biomathematics, 10.1155/2013/159170
 * - Merks et al. 2003: J. Theor. Biol. 224:153-166
 */

// ── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_GRID_SIZE = 64;
export const JACOBI_ITERATIONS = 200;

/** Max edge length before the mesh is refined (adaptive tessellation for branching). */
export const MAX_EDGE_LENGTH = 1.2;
/** Refinement is only triggered when curvature (1/radius of osculating circle) > this. */
export const CURVATURE_REFINE_THRESHOLD = 1.8;
/** After refinement, new vertices are jittered by this fraction to seed Mullins-Sekerka. */
export const REFINE_JITTER = 0.04;

// ── Seeded RNG (for reproducible noise) ────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── CPU Laplacian Solver ───────────────────────────────────────────────────

/**
 * Solve ∇²c = 0 on a 3D grid via Jacobi iteration.
 *
 * Grid is flattened: index = ix + iy*gs + iz*gs²
 *
 * Boundary conditions:
 *   - Top row (iy = gs-1): c = 1 (source / far field)
 *   - Solid voxels:        c = 0 (absorbing boundary)
 *   - Other boundaries:    Neumann (∂c/∂n = 0)
 */
export function solveLaplacian(
  grid: Float32Array,
  solid: Uint8Array,
  gs: number,
  iterations: number,
): void {
  const N = gs * gs * gs;
  const tmp = new Float32Array(N);

  for (let iter = 0; iter < iterations; iter++) {
    for (let iz = 0; iz < gs; iz++) {
      for (let iy = 0; iy < gs; iy++) {
        for (let ix = 0; ix < gs; ix++) {
          const idx = ix + iy * gs + iz * gs * gs;

          // Solid voxel → c = 0 (absorbing boundary on object surface)
          if (solid[idx]) {
            tmp[idx] = 0;
            continue;
          }

          // Far-field top layer → c = 1 (nutrient source plane — Kaandorp 2013 §2.2)
          // MUST fire BEFORE the Neumann edge check so the source plane stays pinned.
          if (iy === gs - 1) {
            tmp[idx] = 1;
            continue;
          }

          // Boundary: keep edge values unchanged (Neumann ∂c/∂n = 0)
          if (ix === 0 || ix === gs - 1 || iy === 0 || iz === 0 || iz === gs - 1) {
            tmp[idx] = grid[idx];
            continue;
          }

          // Jacobi: c_new = average of 6 neighbors
          const cL = grid[(ix - 1) + iy * gs + iz * gs * gs];
          const cR = grid[(ix + 1) + iy * gs + iz * gs * gs];
          const cD = grid[ix + (iy - 1) * gs + iz * gs * gs];
          const cU = grid[ix + (iy + 1) * gs + iz * gs * gs];
          const cB = grid[ix + iy * gs + (iz - 1) * gs * gs];
          const cF = grid[ix + iy * gs + (iz + 1) * gs * gs];

          tmp[idx] = (cL + cR + cD + cU + cB + cF) / 6;
        }
      }
    }

    for (let i = 0; i < N; i++) grid[i] = tmp[i];
  }
}

/**
 * Voxelize vertex positions into the solid grid + fill interior.
 *
 * Uses ray casting to determine which voxels are INSIDE the mesh,
 * then marks them all as solid. This ensures the Laplacian solver
 * treats the coral as a solid object, not a thin shell.
 */
export function voxelizeVertices(
  positions: Float32Array,
  _indices: Uint32Array,
  vertexCount: number,
  solid: Uint8Array,
  gs: number,
  boundsMin: [number, number, number],
  boundsMax: [number, number, number],
): void {
  const rangeX = boundsMax[0] - boundsMin[0];
  const rangeY = boundsMax[1] - boundsMin[1];
  const rangeZ = boundsMax[2] - boundsMin[2];

  // 1. Mark surface voxels (where vertices are)
  for (let v = 0; v < vertexCount; v++) {
    const px = positions[v * 3];
    const py = positions[v * 3 + 1];
    const pz = positions[v * 3 + 2];

    const gx = Math.floor(((px - boundsMin[0]) / rangeX) * (gs - 1));
    const gy = Math.floor(((py - boundsMin[1]) / rangeY) * (gs - 1));
    const gz = Math.floor(((pz - boundsMin[2]) / rangeZ) * (gs - 1));

    const cx = Math.max(0, Math.min(gs - 1, gx));
    const cy = Math.max(0, Math.min(gs - 1, gy));
    const cz = Math.max(0, Math.min(gs - 1, gz));

    // Mark voxel and immediate neighbors
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 1) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          const nz = cz + dz;
          if (nx < 0 || nx >= gs || ny < 0 || ny >= gs || nz < 0 || nz >= gs) continue;
          solid[nx + ny * gs + nz * gs * gs] = 1;
        }
      }
    }
  }

  // 2. Fill interior using flood fill from grid edges
  //    Any voxel NOT reachable from the edge is interior → solid
  const visited = new Uint8Array(gs * gs * gs);
  const queue: number[] = [];

  // Seed flood from all boundary voxels that are NOT solid
  for (let iz = 0; iz < gs; iz++) {
    for (let iy = 0; iy < gs; iy++) {
      for (let ix = 0; ix < gs; ix++) {
        if (ix === 0 || ix === gs - 1 || iy === 0 || iy === gs - 1 || iz === 0 || iz === gs - 1) {
          const idx = ix + iy * gs + iz * gs * gs;
          if (!solid[idx] && !visited[idx]) {
            visited[idx] = 1;
            queue.push(idx);
          }
        }
      }
    }
  }

  // BFS flood fill
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const iz = Math.floor(idx / (gs * gs));
    const iy = Math.floor((idx % (gs * gs)) / gs);
    const ix = idx % gs;

    const neighbors = [
      [ix - 1, iy, iz], [ix + 1, iy, iz],
      [ix, iy - 1, iz], [ix, iy + 1, iz],
      [ix, iy, iz - 1], [ix, iy, iz + 1],
    ];

    for (const [nx, ny, nz] of neighbors) {
      if (nx < 0 || nx >= gs || ny < 0 || ny >= gs || nz < 0 || nz >= gs) continue;
      const nidx = nx + ny * gs + nz * gs * gs;
      if (!solid[nidx] && !visited[nidx]) {
        visited[nidx] = 1;
        queue.push(nidx);
      }
    }
  }

  // 3. Any unvisited non-solid voxel is interior → mark solid
  for (let i = 0; i < gs * gs * gs; i++) {
    if (!solid[i] && !visited[i]) {
      solid[i] = 1;
    }
  }
}

// ── Growth Step ────────────────────────────────────────────────────────────

export interface GrowthConfig {
  /** Light vs nutrient weight (α). 0 = all nutrient, 1 = all light. */
  alpha: number;
  /** Ambient light fraction. */
  ambientLight: number;
  /** Light direction (normalized). */
  lightDir: [number, number, number];
  /** Maximum growth layer thickness (species parameter s). */
  maxThickness: number;
  /** Additional growth rate multiplier — scales displacement magnitude directly. */
  growthRate: number;
  /** Phototropism strength (0=none, 1=strong). Biases growth toward light source. */
  phototropism: number;
  /**
   * Threshold for branching (bifurcation). Higher values → fewer splits.
   * Maps to curvature sensitivity in mesh refinement.
   */
  bifurcationThreshold: number;
  /** Random factor for displacement noise. Seeds surface roughness. */
  randomFactor: number;
  /** Grid resolution. */
  gridSize: number;
  /** World-space bounds. */
  boundsMin: [number, number, number];
  boundsMax: [number, number, number];
  /** Random seed for reproducibility. */
  seed: number;
  /** Max edge length before mesh refinement (adaptive tessellation). 0 = no refinement. */
  maxEdgeLength: number;
  /** Curvature threshold for refinement (radians). */
  curvatureThreshold: number;
  /** Jitter amount for new vertices (seeds Mullins-Sekerka instability). */
  refineJitter: number;
}
/**
 * Run one complete growth step on CPU.
 *
 * Returns updated positions, normals, indices and vertexCount.
 * All arrays may be reallocated if mesh refinement occurred.
 */
export function growthStep(
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  vertexCount: number,
  config: GrowthConfig,
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array; vertexCount: number; triangleCount: number } {
  const gs = config.gridSize;
  const N = gs * gs * gs;

  // 1. Voxelize + fill interior
  const solid = new Uint8Array(N);
  voxelizeVertices(positions, indices, vertexCount, solid, gs, config.boundsMin, config.boundsMax);

  // 2. Solve Laplacian ∇²c = 0
  const grid = new Float32Array(N);
  // Initialize far-field: top layer c = 1
  for (let iz = 0; iz < gs; iz++) {
    for (let ix = 0; ix < gs; ix++) {
      const iy = gs - 1;
      grid[ix + iy * gs + iz * gs * gs] = 1.0;
    }
  }
  solveLaplacian(grid, solid, gs, JACOBI_ITERATIONS);

  // 3. Displace vertices
  const rangeX = config.boundsMax[0] - config.boundsMin[0];
  const rangeY = config.boundsMax[1] - config.boundsMin[1];
  const rangeZ = config.boundsMax[2] - config.boundsMin[2];
  const rng = mulberry32(config.seed + 999);

  // Compute a per-step phototropic light direction.
  // When phototropism > 0, light direction gains a horizontal component
  // pointing outward (away from center axis), making branches tilt toward light.
  // Kaandorp 2013 §2.3: "c_light depends on the angle between the surface normal
  // and the light direction — phototropism can be modeled by biasing this direction
  // based on the local growth axis."
  const photoStrength = config.phototropism;

  for (let v = 0; v < vertexCount; v++) {
    const px = positions[v * 3];
    const py = positions[v * 3 + 1];
    const pz = positions[v * 3 + 2];

    const nx = normals[v * 3];
    const ny = normals[v * 3 + 1];
    const nz = normals[v * 3 + 2];

    // Phototropic light bias: tilt the effective light direction toward the
    // outward horizontal direction for this vertex. Stronger at tips (higher up).
    const heightFrac = Math.min(1, Math.max(0, (py + 10) / 30));
    const radialDist = Math.sqrt(px * px + pz * pz);
    let lx = config.lightDir[0];
    let ly = config.lightDir[1];
    let lz = config.lightDir[2];
    if (photoStrength > 0 && radialDist > 0.01) {
      const outwardX = px / radialDist;
      const outwardZ = pz / radialDist;
      const bias = photoStrength * heightFrac * 0.3;
      lx += outwardX * bias;
      lz += outwardZ * bias;
      // Re-normalize
      const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
      lx /= lLen; ly /= lLen; lz /= lLen;
    }

    // Sample nutrient from grid (trilinear interpolation)
    const fx = ((px - config.boundsMin[0]) / rangeX) * (gs - 1);
    const fy = ((py - config.boundsMin[1]) / rangeY) * (gs - 1);
    const fz = ((pz - config.boundsMin[2]) / rangeZ) * (gs - 1);
    const ix = Math.max(0, Math.min(gs - 2, Math.floor(fx)));
    const iy = Math.max(0, Math.min(gs - 2, Math.floor(fy)));
    const iz = Math.max(0, Math.min(gs - 2, Math.floor(fz)));
    const tx = fx - ix, ty = fy - iy, tz = fz - iz;

    // Trilinear interpolation
    const c000 = grid[ix + iy * gs + iz * gs * gs];
    const c100 = grid[(ix + 1) + iy * gs + iz * gs * gs];
    const c010 = grid[ix + (iy + 1) * gs + iz * gs * gs];
    const c110 = grid[(ix + 1) + (iy + 1) * gs + iz * gs * gs];
    const c001 = grid[ix + iy * gs + (iz + 1) * gs * gs];
    const c101 = grid[(ix + 1) + iy * gs + (iz + 1) * gs * gs];
    const c011 = grid[ix + (iy + 1) * gs + (iz + 1) * gs * gs];
    const c111 = grid[(ix + 1) + (iy + 1) * gs + (iz + 1) * gs * gs];

    const c00 = c000 * (1 - tx) + c100 * tx;
    const c01 = c001 * (1 - tx) + c101 * tx;
    const c10 = c010 * (1 - tx) + c110 * tx;
    const c11 = c011 * (1 - tx) + c111 * tx;
    const c0 = c00 * (1 - ty) + c10 * ty;
    const c1 = c01 * (1 - ty) + c11 * ty;
    const cNutrient = c0 * (1 - tz) + c1 * tz;

    // Light: c_light = (1-ambient)·max(0, n̂·lightDir) + ambient
    // Use the phototropism-biased light direction
    const cosTheta = Math.max(0, nx * lx + ny * ly + nz * lz);
    const cLight = (1 - config.ambientLight) * cosTheta + config.ambientLight;

    // Total: c_total = (1-α)·c_nutrient + α·c_light
    const cTotal = (1 - config.alpha) * cNutrient + config.alpha * cLight;

    // Random factor: add noise to the displacement magnitude for surface roughness.
    // This seeds Mullins-Sekerka instability naturally (Merks 2003 §2.3: "small random
    // perturbations are amplified by the Laplacian growth process").
    const randNoise = config.randomFactor > 0
      ? 1 + (rng() - 0.5) * 2 * config.randomFactor
      : 1;

    // Growth rate multiplier: species-dependent speed scaling
    const rateScale = config.growthRate;

    // Displace: V_new = V + n̂ · c_total · s · growthRate · noise
    const displacement = cTotal * config.maxThickness * rateScale * randNoise;
    positions[v * 3] += nx * displacement;
    positions[v * 3 + 1] += ny * displacement;
    positions[v * 3 + 2] += nz * displacement;
  }

  // 4. Recompute normals from triangles
  const triCount = indices.length / 3;
  recomputeNormals(positions, normals, indices, vertexCount, triCount);

  // 5. Adaptive mesh refinement (split long edges)
  if (config.maxEdgeLength > 0) {
    const rng = mulberry32(config.seed + Math.floor(vertexCount * 0.618));
    // bifurcationThreshold modulates curvature sensitivity:
    //   Low bifurcationThreshold (0.3-0.4) → more branches (staghorn, table)
    //   High bifurcationThreshold (0.8-0.9) → fewer branches (brain, organ pipe)
    // Map: effectiveCurvatureThreshold = base * (0.3 + bifurcationThreshold * 1.2)
    const effectiveCurvature = config.curvatureThreshold * (0.3 + config.bifurcationThreshold * 1.2);
    const refined = refineMesh(
      positions, indices, normals,
      config.maxEdgeLength,
      effectiveCurvature,
      config.refineJitter,
      rng,
    );
    const newVC = refined.positions.length / 3;

    // Recompute normals one last time for the refined result.
    recomputeNormals(refined.positions, refined.normals, refined.indices, newVC, refined.indices.length / 3);

    return {
      positions: refined.positions,
      normals: refined.normals,
      indices: refined.indices,
      vertexCount: newVC,
      triangleCount: refined.indices.length / 3,
    };
  }

  return { positions, normals, indices, vertexCount, triangleCount: triCount };
}

/**
 * Adaptive mesh refinement for branching growth.
 *
 * Splits edges longer than maxEdgeLen, adding a vertex at the midpoint.
 * The new vertex is jittered by `jitter * radius` along the normal to
 * seed the Mullins-Sekerka instability (Merks 2003 §3.1).
 *
 * Only refines triangles where at least one edge exceeds maxEdgeLen
 * AND the face curvature exceeds CURVATURE_REFINE_THRESHOLD.
 *
 * Returns new positions, indices, and normals arrays (old arrays are NOT reused).
 */
export function refineMesh(
  positions: Float32Array,
  indices: Uint32Array,
  normals: Float32Array,
  maxEdgeLen: number,
  curvatureThreshold: number,
  jitter: number,
  rng: () => number,
): { positions: Float32Array; indices: Uint32Array; normals: Float32Array } {
  const vCount = positions.length / 3;
  const tCount = indices.length / 3;

  // ── 1. Build edge → triangles map ────────────────────────────────────
  const edgeKey = (a: number, b: number): string => a < b ? `${a}|${b}` : `${b}|${a}`;
  const edgeToTris = new Map<string, number[]>();

  for (let t = 0; t < tCount; t++) {
    const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
    for (const [a, b] of [[i0, i1], [i1, i2], [i2, i0]]) {
      const key = edgeKey(a, b);
      if (!edgeToTris.has(key)) edgeToTris.set(key, []);
      edgeToTris.get(key)!.push(t);
    }
  }

  // ── 2. Compute face normals (for curvature test) ───────────────────
  const faceNormals: [number, number, number][] = [];
  const faceCenters: [number, number, number][] = [];

  for (let t = 0; t < tCount; t++) {
    const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
    const v0x = positions[i0 * 3], v0y = positions[i0 * 3 + 1], v0z = positions[i0 * 3 + 2];
    const v1x = positions[i1 * 3], v1y = positions[i1 * 3 + 1], v1z = positions[i1 * 3 + 2];
    const v2x = positions[i2 * 3], v2y = positions[i2 * 3 + 1], v2z = positions[i2 * 3 + 2];

    const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
    const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;
    const fnx = e1y * e2z - e1z * e2y;
    const fny = e1z * e2x - e1x * e2z;
    const fnz = e1x * e2y - e1y * e2x;
    const len = Math.sqrt(fnx * fnx + fny * fny + fnz * fnz);
    if (len > 1e-10) {
      faceNormals[t] = [fnx / len, fny / len, fnz / len];
    } else {
      faceNormals[t] = [0, 1, 0];
    }
    faceCenters[t] = [(v0x + v1x + v2x) / 3, (v0y + v1y + v2y) / 3, (v0z + v1z + v2z) / 3];
  }

  // ── 3. Find edges to split ──────────────────────────────────────────
  interface EdgeSplit { a: number; b: number; mid: number; }
  const splits: EdgeSplit[] = [];
  const edgesToSplit = new Set<string>();
  const splitVerts = new Map<string, number>();  // edge key → new vertex index
  let nextVertIdx = vCount;

  for (const [key, tris] of edgeToTris) {
    const [a, b] = key.split('|').map(Number);
    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const edgeLen = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (edgeLen < maxEdgeLen) continue;

    // Check curvature: angle between face normals of adjacent triangles
    let maxAngle = 0;
    for (let ti = 0; ti < tris.length && ti < 2; ti++) {
      for (let tj = ti + 1; tj < tris.length && tj < 2; tj++) {
        const fn1 = faceNormals[tris[ti]];
        const fn2 = faceNormals[tris[tj]];
        if (!fn1 || !fn2) continue;
        const dot = fn1[0] * fn2[0] + fn1[1] * fn2[1] + fn1[2] * fn2[2];
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (angle > maxAngle) maxAngle = angle;
      }
    }

    // Refine if curvature is significant OR the edge is very long
    if (maxAngle < curvatureThreshold && edgeLen < maxEdgeLen * 1.5) continue;

    edgesToSplit.add(key);
    const mid = nextVertIdx++;
    splitVerts.set(key, mid);
    splits.push({
      a, b, mid,
    });
  }

  if (splits.length === 0) {
    // No refinement needed
    return { positions, indices, normals };
  }

  // ── 4. Build new vertex array (existing + split points) ────────────
  const newPositions = new Float32Array(positions.length + splits.length * 3);
  const newNormals = new Float32Array(normals.length + splits.length * 3);
  newPositions.set(positions);
  newNormals.set(normals);

  for (const s of splits) {
    const ax = positions[s.a * 3], ay = positions[s.a * 3 + 1], az = positions[s.a * 3 + 2];
    const bx = positions[s.b * 3], by = positions[s.b * 3 + 1], bz = positions[s.b * 3 + 2];
    let mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2;

    // Jitter the midpoint to seed instability
    mx += (rng() - 0.5) * 2 * jitter;
    my += (rng() - 0.5) * 2 * jitter;
    mz += (rng() - 0.5) * 2 * jitter;

    const idx = s.mid * 3;
    newPositions[idx] = mx;
    newPositions[idx + 1] = my;
    newPositions[idx + 2] = mz;

    // Normal: average of endpoints
    const nx = (normals[s.a * 3] + normals[s.b * 3]) / 2;
    const ny = (normals[s.a * 3 + 1] + normals[s.b * 3 + 1]) / 2;
    const nz = (normals[s.a * 3 + 2] + normals[s.b * 3 + 2]) / 2;
    const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (nlen > 1e-10) {
      newNormals[s.mid * 3] = nx / nlen;
      newNormals[s.mid * 3 + 1] = ny / nlen;
      newNormals[s.mid * 3 + 2] = nz / nlen;
    } else {
      newNormals[s.mid * 3] = 0;
      newNormals[s.mid * 3 + 1] = 1;
      newNormals[s.mid * 3 + 2] = 0;
    }
  }

  // ── 5. Build new index array (split triangles) ─────────────────────
  const newTriangles: [number, number, number][] = [];

  for (let t = 0; t < tCount; t++) {
    const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
    const e01 = edgeKey(i0, i1);
    const e12 = edgeKey(i1, i2);
    const e20 = edgeKey(i2, i0);

    const split01 = splitVerts.get(e01);
    const split12 = splitVerts.get(e12);
    const split20 = splitVerts.get(e20);

    const numSplits = (split01 !== undefined ? 1 : 0) +
      (split12 !== undefined ? 1 : 0) +
      (split20 !== undefined ? 1 : 0);

    if (numSplits === 0) {
      newTriangles.push([i0, i1, i2]);
    } else if (numSplits === 1) {
      // Split one edge → 2 triangles
      if (split01 !== undefined) {
        newTriangles.push([i0, split01, i2]);
        newTriangles.push([split01, i1, i2]);
      } else if (split12 !== undefined) {
        newTriangles.push([i0, i1, split12]);
        newTriangles.push([split12, i1, i2]);
      } else {
        newTriangles.push([i0, i1, split20!]);
        newTriangles.push([i0, split20!, i2]);
      }
    } else if (numSplits === 2) {
      // Split two edges → 3 triangles
      if (split01 !== undefined && split12 !== undefined) {
        newTriangles.push([i0, split01, i2]);
        newTriangles.push([split01, split12, i2]);
        newTriangles.push([split01, i1, split12]);
      } else if (split12 !== undefined && split20 !== undefined) {
        newTriangles.push([i0, i1, split12]);
        newTriangles.push([i0, split12, split20]);
        newTriangles.push([split12, i2, split20]);
      } else {
        // split20 && split01 (both confirmed defined in this branch)
        newTriangles.push([i0, split01!, split20!]);
        newTriangles.push([i1, split01!, i2]);
        newTriangles.push([split01!, split20!, i2]);
      }
    } else {
      // All three edges split → 4 triangles
      newTriangles.push([i0, split01!, split20!]);
      newTriangles.push([split01!, i1, split12!]);
      newTriangles.push([split20!, split12!, i2]);
      newTriangles.push([split01!, split12!, split20!]);
    }
  }

  const newIndices = new Uint32Array(newTriangles.length * 3);
  for (let i = 0; i < newTriangles.length; i++) {
    newIndices[i * 3] = newTriangles[i][0];
    newIndices[i * 3 + 1] = newTriangles[i][1];
    newIndices[i * 3 + 2] = newTriangles[i][2];
  }

  return { positions: newPositions, indices: newIndices, normals: newNormals };
}

/**
 * Recompute per-vertex normals by accumulating face normals.
 */
export function recomputeNormals(
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  vertexCount: number,
  triangleCount: number,
): void {
  for (let i = 0; i < vertexCount * 3; i++) normals[i] = 0;

  for (let t = 0; t < triangleCount; t++) {
    const i0 = indices[t * 3];
    const i1 = indices[t * 3 + 1];
    const i2 = indices[t * 3 + 2];

    const v0x = positions[i0 * 3], v0y = positions[i0 * 3 + 1], v0z = positions[i0 * 3 + 2];
    const v1x = positions[i1 * 3], v1y = positions[i1 * 3 + 1], v1z = positions[i1 * 3 + 2];
    const v2x = positions[i2 * 3], v2y = positions[i2 * 3 + 1], v2z = positions[i2 * 3 + 2];

    const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
    const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;

    const fnx = e1y * e2z - e1z * e2y;
    const fny = e1z * e2x - e1x * e2z;
    const fnz = e1x * e2y - e1y * e2x;

    normals[i0 * 3] += fnx; normals[i0 * 3 + 1] += fny; normals[i0 * 3 + 2] += fnz;
    normals[i1 * 3] += fnx; normals[i1 * 3 + 1] += fny; normals[i1 * 3 + 2] += fnz;
    normals[i2 * 3] += fnx; normals[i2 * 3 + 1] += fny; normals[i2 * 3 + 2] += fnz;
  }

  for (let i = 0; i < vertexCount; i++) {
    const nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-10) {
      normals[i * 3] = nx / len;
      normals[i * 3 + 1] = ny / len;
      normals[i * 3 + 2] = nz / len;
    } else {
      normals[i * 3] = 0;
      normals[i * 3 + 1] = 1;
      normals[i * 3 + 2] = 0;
    }
  }
}

// ── Icosphere Generator ────────────────────────────────────────────────────

export class KaandorpGrowthPipeline {
  /**
   * Create an icosphere with optional surface noise to seed branching.
   *
   * The noise perturbation breaks the symmetry of the perfect sphere,
   * which is essential for the Mullins-Sekerka instability to trigger
   * branching during Laplacian growth.
   */
  static createIcosphere(
    radius: number = 2.0,
    subdivisions: number = 2,
    noiseAmount: number = 0.15,
    seed: number = 42,
  ): { positions: Float32Array; indices: Uint32Array; uvs: Float32Array } {
    const phi = (1 + Math.sqrt(5)) / 2;
    const t = radius / Math.sqrt(1 + phi * phi);

    const verts: [number, number, number][] = [
      [-t, phi * t, 0], [t, phi * t, 0], [-t, -phi * t, 0], [t, -phi * t, 0],
      [0, -t, phi * t], [0, t, phi * t], [0, -t, -phi * t], [0, t, -phi * t],
      [phi * t, 0, -t], [phi * t, 0, t], [-phi * t, 0, -t], [-phi * t, 0, t],
    ];

    const faces: [number, number, number][] = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];

    let vertices = [...verts];
    let faceList = [...faces];

    for (let s = 0; s < subdivisions; s++) {
      const newFaces: [number, number, number][] = [];
      const cache = new Map<string, number>();

      for (const [i0, i1, i2] of faceList) {
        const m01 = this._mid(i0, i1, vertices, cache, radius);
        const m12 = this._mid(i1, i2, vertices, cache, radius);
        const m20 = this._mid(i2, i0, vertices, cache, radius);
        newFaces.push([i0, m01, m20], [i1, m12, m01], [i2, m20, m12], [m01, m12, m20]);
      }

      for (let i = 0; i < vertices.length; i++) {
        const [x, y, z] = vertices[i];
        const len = Math.sqrt(x * x + y * y + z * z);
        vertices[i] = [(x / len) * radius, (y / len) * radius, (z / len) * radius];
      }
      faceList = newFaces;
    }

    // Apply surface noise to break symmetry
    const rng = mulberry32(seed);
    for (let i = 0; i < vertices.length; i++) {
      const [x, y, z] = vertices[i];
      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len, ny = y / len, nz = z / len;
      const noise = (rng() - 0.5) * 2 * noiseAmount;
      vertices[i] = [
        x + nx * noise,
        y + ny * noise,
        z + nz * noise,
      ];
    }

    const positions = new Float32Array(vertices.length * 3);
    const uvs = new Float32Array(vertices.length * 2);
    for (let i = 0; i < vertices.length; i++) {
      const [x, y, z] = vertices[i];
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const len = Math.sqrt(x * x + y * y + z * z);
      uvs[i * 2] = 0.5 + Math.atan2(z / len, x / len) / (2 * Math.PI);
      uvs[i * 2 + 1] = 0.5 - Math.asin(Math.max(-1, Math.min(1, y / len))) / Math.PI;
    }

    const indices = new Uint32Array(faceList.length * 3);
    for (let i = 0; i < faceList.length; i++) {
      indices[i * 3] = faceList[i][0];
      indices[i * 3 + 1] = faceList[i][1];
      indices[i * 3 + 2] = faceList[i][2];
    }

    return { positions, indices, uvs };
  }

  private static _mid(
    i0: number, i1: number,
    verts: [number, number, number][],
    cache: Map<string, number>,
    radius: number,
  ): number {
    const key = i0 < i1 ? `${i0}-${i1}` : `${i1}-${i0}`;
    if (cache.has(key)) return cache.get(key)!;
    const [x0, y0, z0] = verts[i0];
    const [x1, y1, z1] = verts[i1];
    let mx = (x0 + x1) / 2, my = (y0 + y1) / 2, mz = (z0 + z1) / 2;
    const len = Math.sqrt(mx * mx + my * my + mz * mz);
    mx = (mx / len) * radius;
    my = (my / len) * radius;
    mz = (mz / len) * radius;
    const idx = verts.length;
    verts.push([mx, my, mz]);
    cache.set(key, idx);
    return idx;
  }
}
