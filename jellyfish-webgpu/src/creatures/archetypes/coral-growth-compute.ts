/**
 * coral-growth-compute.ts
 *
 * Rebuilt emergent accretive-growth model for coral colonies (surface-mesh
 * architecture, NOT particulate.js).
 *
 * The model is biologically inspired by Kaandorp (2013) and Merks et al.
 * (2003), but rebuilt so that branching is EMERGENT and ORGANIC rather than a
 * hard-coded branch tree:
 *
 *   1. A morphology-aware resource field combines a nutrient-diffusion proxy
 *      (Kaandorp compactness / Péclet via `diffusionLength`) with a
 *      phototropic light-exposure term and a per-habit growth-axis bias
 *      (fan / hemispherical / vertical / encrusting).
 *   2. A real 3D Laplacian solve (Jacobi on a voxel grid) sharpens the
 *      nutrient field around the living surface, reproducing the
 *      Mullins-Sekerka instability: protrusions enrich their own exposure and
 *      grow faster, which is what turns a smooth seed into branched coral.
 *   3. Local "resource surplus" above the bifurcation threshold gates adaptive
 *      mesh refinement + jitter at branch tips, so new branch directions are
 *      seeded only where resources concentrate (Merks-style spontaneous
 *      bifurcation).
 *   4. Growth is kept bounded: per-step displacement is capped, positions are
 *      clamped to the colony bounds, and refinement respects a strict vertex
 *      budget. All vectors are normalized and degenerate cases guarded, so the
 *      output stays finite and NaN-free.
 *
 * The ghost-shell artifact (jellyfish-only gel/emissive overlays leaking onto
 * the coral mesh) is eliminated at the archetype/render layer: this module only
 * ever produces a single watertight surface plus a small set of polyp-tip
 * marker points.
 */

// ── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_GRID_SIZE = 48;
export const JACOBI_ITERATIONS = 90;

/** Max edge length before the mesh is adaptively refined for finer branching. */
export const MAX_EDGE_LENGTH = 1.2;
/** Refinement is only triggered when the dihedral curvature (radians) exceeds this. */
export const CURVATURE_REFINE_THRESHOLD = 1.6;
/** Fractional jitter applied to refined midpoints to seed Mullins-Sekerka growth. */
export const REFINE_JITTER = 0.06;
/** Default cap on live vertices before refinement is disabled (vertex budget). */
export const DEFAULT_MAX_VERTICES = 24000;
/**
 * Distance (in voxel cells) ahead of the surface where the nutrient field is
 * probed for growth. Mirrors Merks et al. (2003) App. A: the flux is sampled
 * ~3 length units along the surface normal, which is what couples the solved
 * field back into deposition and produces the branching instability.
 */
export const FIELD_PROBE_CELLS = 2.0;

// ── Seeded RNG (reproducible organic noise) ───────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Growth configuration ────────────────────────────────────────────────────

export interface GrowthConfig {
  /** Light vs nutrient blend α ∈ [0,1]. 0 = all nutrient, 1 = all light. */
  alpha: number;
  /** Ambient light fraction (minimum even when sheltered). */
  ambientLight: number;
  /** Initial light direction (normalized), usually straight up. */
  lightDir: [number, number, number];
  /** Base deposition thickness per growth step (species scale s). */
  maxThickness: number;
  /** Global growth-rate multiplier G. */
  growthRate: number;
  /** Phototropism strength (0=none, 1=strong). Pulls growth toward the light. */
  phototropism: number;
  /** Resource surplus needed to seed a new branch. Lower → splits more readily. */
  bifurcationThreshold: number;
  /** Random surface-noise factor (seeds organic roughness + instability). */
  randomFactor: number;
  /** Laplacian grid resolution. */
  gridSize: number;
  /** World bounds for voxelization. */
  boundsMin: [number, number, number];
  boundsMax: [number, number, number];
  /** Seed for reproducible noise. */
  seed: number;
  /** Max edge length before refinement kicks in. 0 = no refinement. */
  maxEdgeLength: number;
  /** Curvature threshold (radians) for refinement. */
  curvatureThreshold: number;
  /** Jitter for refined midpoints. */
  refineJitter: number;
  /** Kaandorp diffusion length (Péclet inverse). Short = dense compact; long = lacy. */
  diffusionLength: number;
  /** Colony habit — biases the growth-axis field. */
  growthAxis: 'vertical' | 'fan' | 'hemispherical' | 'encrusting';
  /** Branch density / compactness (0 open lacy, 1 dense). */
  compactness: number;
  /** Taper 0..1 (0 = uniform tube, 1 = strong base→tip taper). */
  taper: number;
  /** Hard vertex budget cap. */
  maxVertices: number;
  /** Max radial extent from the colony axis (growth bound). */
  maxRadius: number;
  /** Max vertical extent (growth bound). */
  maxHeight: number;
  /** Resource level that marks a living polyp/branch tip. */
  tipThreshold: number;
}

/** Result of one growth step (arrays may be reallocated by refinement). */
export interface GrowthResult {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  triangleCount: number;
  /** Per-vertex resource (c_total) from the last solve — used for tips/branching. */
  resource: Float32Array;
}

// ── CPU Laplacian nutrient field ───────────────────────────────────────────

/**
 * Solve ∇²c = 0 on a flattened 3D grid via Jacobi iteration.
 * Index = ix + iy*gs + iz*gs².
 * Boundary conditions:
 *   - Top layer (iy = gs-1):            c = 1  (nutrient/light source plane)
 *   - Solid voxels:                     c = 0  (absorbing living surface)
 *   - Other domain boundaries:          Neumann ∂c/∂n = 0
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
        const row = iy * gs;
        for (let ix = 0; ix < gs; ix++) {
          const idx = ix + row + iz * gs * gs;

          if (solid[idx]) { tmp[idx] = 0; continue; }
          if (iy === gs - 1) { tmp[idx] = 1; continue; }
          if (ix === 0 || ix === gs - 1 || iy === 0 || iz === 0 || iz === gs - 1) {
            tmp[idx] = grid[idx];
            continue;
          }

          const cL = grid[(ix - 1) + row + iz * gs * gs];
          const cR = grid[(ix + 1) + row + iz * gs * gs];
          const cD = grid[ix + (iy - 1) * gs + iz * gs * gs];
          const cU = grid[ix + (iy + 1) * gs + iz * gs * gs];
          const cB = grid[ix + row + (iz - 1) * gs * gs];
          const cF = grid[ix + row + (iz + 1) * gs * gs];
          tmp[idx] = (cL + cR + cD + cU + cB + cF) / 6;
        }
      }
    }
    for (let i = 0; i < N; i++) grid[i] = tmp[i];
  }
}

/**
 * Voxelize a watertight surface mesh into the solid grid (surface shell + a
 * thin interior band). We fill a thin crust rather than flood-filling the whole
 * interior: coral branches are porous, and flood-filling thin tips was a source
 * of false "solid" voxels that artificially starved tip growth.
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
  const rangeX = boundsMax[0] - boundsMin[0] || 1e-6;
  const rangeY = boundsMax[1] - boundsMin[1] || 1e-6;
  const rangeZ = boundsMax[2] - boundsMin[2] || 1e-6;

  for (let v = 0; v < vertexCount; v++) {
    const px = positions[v * 3];
    const py = positions[v * 3 + 1];
    const pz = positions[v * 3 + 2];

    const gx = Math.max(0, Math.min(gs - 1, Math.floor(((px - boundsMin[0]) / rangeX) * (gs - 1))));
    const gy = Math.max(0, Math.min(gs - 1, Math.floor(((py - boundsMin[1]) / rangeY) * (gs - 1))));
    const gz = Math.max(0, Math.min(gs - 1, Math.floor(((pz - boundsMin[2]) / rangeZ) * (gs - 1))));

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nx = gx + dx, ny = gy + dy, nz = gz + dz;
          if (nx < 0 || nx >= gs || ny < 0 || ny >= gs || nz < 0 || nz >= gs) continue;
          solid[nx + ny * gs + nz * gs * gs] = 1;
        }
      }
    }
  }
}

/**
 * Trilinear sample of a solved 3D scalar field at a world-space point.
 * Points outside the voxel domain are clamped to the nearest boundary cell
 * (safe, finite, and consistent with the domain's Neumann walls).
 */
export function sampleGrid3D(
  grid: Float32Array,
  gs: number,
  boundsMin: [number, number, number],
  boundsMax: [number, number, number],
  x: number, y: number, z: number,
): number {
  const rangeX = boundsMax[0] - boundsMin[0] || 1e-6;
  const rangeY = boundsMax[1] - boundsMin[1] || 1e-6;
  const rangeZ = boundsMax[2] - boundsMin[2] || 1e-6;

  let gx = ((x - boundsMin[0]) / rangeX) * (gs - 1);
  let gy = ((y - boundsMin[1]) / rangeY) * (gs - 1);
  let gz = ((z - boundsMin[2]) / rangeZ) * (gs - 1);
  gx = Math.max(0, Math.min(gs - 1, gx));
  gy = Math.max(0, Math.min(gs - 1, gy));
  gz = Math.max(0, Math.min(gs - 1, gz));

  const x0 = Math.floor(gx), y0 = Math.floor(gy), z0 = Math.floor(gz);
  const x1 = Math.min(gs - 1, x0 + 1), y1 = Math.min(gs - 1, y0 + 1), z1 = Math.min(gs - 1, z0 + 1);
  const fx = gx - x0, fy = gy - y0, fz = gz - z0;

  const gs2 = gs * gs;
  const i000 = x0 + y0 * gs + z0 * gs2;
  const i100 = x1 + y0 * gs + z0 * gs2;
  const i010 = x0 + y1 * gs + z0 * gs2;
  const i110 = x1 + y1 * gs + z0 * gs2;
  const i001 = x0 + y0 * gs + z1 * gs2;
  const i101 = x1 + y0 * gs + z1 * gs2;
  const i011 = x0 + y1 * gs + z1 * gs2;
  const i111 = x1 + y1 * gs + z1 * gs2;

  const c00 = grid[i000] * (1 - fx) + grid[i100] * fx;
  const c10 = grid[i010] * (1 - fx) + grid[i110] * fx;
  const c01 = grid[i001] * (1 - fx) + grid[i101] * fx;
  const c11 = grid[i011] * (1 - fx) + grid[i111] * fx;
  const c0 = c00 * (1 - fy) + c10 * fy;
  const c1 = c01 * (1 - fy) + c11 * fy;
  return c0 * (1 - fz) + c1 * fz;
}

/**
 * Morphology-aware growth-axis bias for a vertex. This is what makes each
 * preset read as a DISTINCT form even though branching itself stays emergent.
 */
function axisBias(
  axis: GrowthConfig['growthAxis'],
  px: number, _py: number, pz: number,
): [number, number, number] {
  const radial = Math.hypot(px, pz);
  const ox = radial > 1e-5 ? px / radial : 0;
  const oz = radial > 1e-5 ? pz / radial : 0;

  switch (axis) {
    case 'vertical':
      // Staghorn / organ-pipe: strong upward shaft with a little outward flair.
      return [ox * 0.22, 0.92, oz * 0.22];
    case 'hemispherical':
      // Brain / table: radial dome — equal outward + upward.
      return [ox * 0.62, 0.5, oz * 0.62];
    case 'fan':
      // Sea-fan: spread within the X-Y plane, negligible Z (planar lattice).
      return [0.6, 0.78, 0];
    case 'encrusting':
      // Flat mat: almost purely radial/horizontal, minimal vertical.
      return [1.0, 0.14, 1.0];
  }
}

/** Single growth step: resource → direction → displacement → refine → normals.
 *  CPU path: voxelize + Jacobi solve, then displace from the solved field.
 */
export function growthStep(
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  vertexCount: number,
  config: GrowthConfig,
): GrowthResult {
  const gs = config.gridSize;
  const N = gs * gs * gs;

  // 1. Voxelize surface + solve Laplacian nutrient field.
  const solid = new Uint8Array(N);
  voxelizeVertices(positions, indices, vertexCount, solid, gs, config.boundsMin, config.boundsMax);

  const grid = new Float32Array(N);
  for (let iz = 0; iz < gs; iz++) {
    for (let ix = 0; ix < gs; ix++) {
      grid[ix + (gs - 1) * gs + iz * gs * gs] = 1.0;
    }
  }
  solveLaplacian(grid, solid, gs, JACOBI_ITERATIONS);

  return growthStepFromGrid(positions, normals, indices, vertexCount, config, grid);
}

/**
 * Single growth step driven by an ALREADY-solved Laplacian field (GPU path).
 * cNutr is sampled at a Merks-style probe ~FIELD_PROBE_CELLS voxels ahead of
 * the surface along the outward normal: protrusions reaching into
 * high-concentration regions read higher cNutr and grow faster, which is the
 * Mullins-Sekerka instability that turns a blob into branched coral.
 */
export function growthStepFromGrid(
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  vertexCount: number,
  config: GrowthConfig,
  grid: Float32Array,
): GrowthResult {
  const gs = config.gridSize;

  // Voxel world size per axis (for probe distance scaling).
  const cellX = (config.boundsMax[0] - config.boundsMin[0]) / gs || 1e-6;
  const cellY = (config.boundsMax[1] - config.boundsMin[1]) / gs || 1e-6;
  const cellZ = (config.boundsMax[2] - config.boundsMin[2]) / gs || 1e-6;

  const axis = config.growthAxis;
  const alpha = config.alpha;
  const ambient = config.ambientLight;
  const photo = config.phototropism;
  const maxH = config.maxHeight;
  const maxR = config.maxRadius;
  const tap = config.taper;

  const rng = mulberry32(config.seed ^ 0x51ab3e7);

  const newPos = new Float32Array(positions.length);
  newPos.set(positions);
  const resource = new Float32Array(vertexCount);

  for (let v = 0; v < vertexCount; v++) {
    const i3 = v * 3;
    const px = positions[i3], py = positions[i3 + 1], pz = positions[i3 + 2];
    const nx = normals[i3], ny = normals[i3 + 1], nz = normals[i3 + 2];

    const height = py;

    // ── Nutrient (Merks 2003 App. A): probe the solved field ahead of the
    //    surface along the outward normal. Solid/sheltered vertices read ~0
    //    (absorbing boundary) and stall; exposed tips read high and grow.
    const probeDist = FIELD_PROBE_CELLS;
    const cNutr = sampleGrid3D(
      grid, gs, config.boundsMin, config.boundsMax,
      px + nx * probeDist * cellX,
      py + ny * probeDist * cellY,
      pz + nz * probeDist * cellZ,
    );

    // ── Light exposure (phototropic). Higher, up-facing tips win.
    const upDot = Math.max(0, ny);                           // towards (0,1,0)
    const crown = Math.min(1, height / (maxH || 1));         // exposed top
    const exposure = 0.5 * (1 + upDot) * 0.55 + crown * 0.45;
    const cLight = (1 - ambient) * exposure + ambient;

    // ── Total resource traded with α.
    const cTotal = (1 - alpha) * cNutr + alpha * cLight;
    resource[v] = cTotal;

    // Surplus above the bifurcation threshold amplifies growth + branch seeding.
    const surplus = Math.max(0, cTotal - config.bifurcationThreshold);

    // ── Growth direction = normal blended with the morphology axis field.
    const [bax, bay, baz] = axisBias(axis, px, py, pz);
    let dx = nx + bax * 0.6;
    let dy = ny + bay * 0.6 + photo * 0.35;   // phototropism pulls up
    let dz = nz + baz * 0.6;
    if (axis === 'fan') dz *= 0.06;            // keep sea-fan planar

    // Surplus-driven lateral wobble seeds new, organic branch directions.
    const wob = config.randomFactor * (1 + surplus * 2.2);
    dx += (rng() - 0.5) * 2 * wob;
    dy += (rng() - 0.5) * wob * 0.35;
    dz += (rng() - 0.5) * 2 * wob * (axis === 'fan' ? 0.12 : 1);

    const dlen = Math.hypot(dx, dy, dz) || 1e-6;
    dx /= dlen; dy /= dlen; dz /= dlen;

    // ── Displacement magnitude: resource × thickness × rate × surplus × noise.
    const randNoise = 1 + (rng() - 0.5) * 2 * config.randomFactor * 0.5;
    let m = cTotal * config.maxThickness * config.growthRate * (1 + surplus * 2.4) * randNoise;
    // Taper: slower deposition beyond mid-colony for tapered branches.
    if (tap > 0) {
      const t = Math.min(1, height / (maxH * 0.7 || 1e-6));
      m *= 1 - tap * Math.max(0, t - 0.5) * 0.5;
    }
    m = Math.min(m, config.maxThickness * 2.75);

    let ox = px + dx * m;
    let oy = py + dy * m;
    let oz = pz + dz * m;

    // ── Bound growth (no NaN, bounded colony). Clamp softly.
    const oRad = Math.hypot(ox, oz);
    if (oRad > maxR) { const s = maxR / (oRad || 1e-6); ox *= s; oz *= s; }
    if (oy > maxH) oy = maxH;
    if (oy < config.boundsMin[1] + 0.3) oy = config.boundsMin[1] + 0.3;

    newPos[i3] = ox; newPos[i3 + 1] = oy; newPos[i3 + 2] = oz;
  }

  // Refine at branch tips (bounded by vertex budget) → emergent bifurcation.
  const refined = refineMesh(newPos, normals, indices, vertexCount, resource, config, rng);

  // Recompute smooth normals from the (possibly refined) mesh.
  const outNormals = new Float32Array(refined.positions.length);
  recomputeNormals(refined.positions, outNormals, refined.indices, refined.vertexCount, refined.triangleCount);

  return {
    positions: refined.positions,
    normals: outNormals,
    indices: refined.indices,
    vertexCount: refined.vertexCount,
    triangleCount: refined.triangleCount,
    resource,
  };
}


// ── Adaptive refinement (emergent bifurcation) ──────────────────────────────

interface RefineMeshResult {
  positions: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  triangleCount: number;
}

/**
 * Split long, high-curvature edges whose endpoints carry resource surplus.
 * Splitting is gated by the bifurcation threshold (surplus) and the vertex
 * budget, so fine detail only appears at well-fed branch tips — this is the
 * Merks-style mechanism that turns smooth tips into new branches.
 */
function refineMesh(
  positions: Float32Array,
  _normals: Float32Array,
  indices: Uint32Array,
  vertexCount: number,
  resource: Float32Array,
  config: GrowthConfig,
  rng: () => number,
): RefineMeshResult {
  if (config.maxEdgeLength <= 0) {
    return { positions, indices, vertexCount, triangleCount: indices.length / 3 };
  }
  if (vertexCount >= config.maxVertices) {
    return { positions, indices, vertexCount, triangleCount: indices.length / 3 };
  }

  const tCount = indices.length / 3;

  // Build edge → face adjacency for curvature + splitting.
  const edgeToTris = new Map<string, number[]>();
  for (let t = 0; t < tCount; t++) {
    const a = indices[t * 3], b = indices[t * 3 + 1], c = indices[t * 3 + 2];
    pushEdge(edgeToTris, a, b, t);
    pushEdge(edgeToTris, b, c, t);
    pushEdge(edgeToTris, c, a, t);
  }

  // Face normals (for dihedral curvature).
  const fn = new Float32Array(tCount * 3);
  for (let t = 0; t < tCount; t++) {
    const a = indices[t * 3], b = indices[t * 3 + 1], c = indices[t * 3 + 2];
    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
    const cx = positions[c * 3], cy = positions[c * 3 + 1], cz = positions[c * 3 + 2];
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const l = Math.hypot(nx, ny, nz) || 1;
    fn[t * 3] = nx / l; fn[t * 3 + 1] = ny / l; fn[t * 3 + 2] = nz / l;
  }

  const splitVerts = new Map<string, number>();
  let nextVert = vertexCount;
  const maxEdgeLen = config.maxEdgeLength;
  const thr = config.bifurcationThreshold;

  for (const [key, tris] of edgeToTris) {
    if (nextVert >= config.maxVertices) break;
    const [a, b] = key.split('|').map(Number);
    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const edgeLen = Math.hypot(dx, dy, dz);
    if (edgeLen < maxEdgeLen) continue;

    // Curvature gate: only split genuinely sharp features.
    let maxAngle = 0;
    for (let ti = 0; ti < tris.length; ti++) {
      for (let tj = ti + 1; tj < tris.length; tj++) {
        const i = tris[ti] * 3, j = tris[tj] * 3;
        const dot = fn[i] * fn[j] + fn[i + 1] * fn[j + 1] + fn[i + 2] * fn[j + 2];
        const ang = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (ang > maxAngle) maxAngle = ang;
      }
    }

    // Resource gate: at least one endpoint must be a well-fed tip (surplus).
    const adjacentTip = resource[a] > thr || resource[b] > thr;
    if (!adjacentTip) continue;
    if (maxAngle < config.curvatureThreshold && edgeLen < maxEdgeLen * 2.5) continue;

    splitVerts.set(key, nextVert++);
  }

  if (splitVerts.size === 0) {
    return { positions, indices, vertexCount, triangleCount: tCount };
  }

  // New vertex array = existing + split midpoints (jittered to seed instability).
  const newPositions = new Float32Array(positions.length + splitVerts.size * 3);
  newPositions.set(positions);
  for (const [key, mid] of splitVerts) {
    const [a, b] = key.split('|').map(Number);
    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
    const jx = config.refineJitter, jy = config.refineJitter, jz = config.refineJitter;
    const wx = (rng() - 0.5) * 2, wy = (rng() - 0.5) * 2, wz = (rng() - 0.5) * 2;
    newPositions[mid * 3] = (ax + bx) / 2 + jx * wx;
    newPositions[mid * 3 + 1] = (ay + by) / 2 + jy * wy;
    newPositions[mid * 3 + 2] = (az + bz) / 2 + jz * wz;
  }


  // Rebuild triangles with the new midpoints.
  const newTri: [number, number, number][] = [];
  for (let t = 0; t < tCount; t++) {
    const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
    const m01 = splitVerts.get(edgeKey(i0, i1));
    const m12 = splitVerts.get(edgeKey(i1, i2));
    const m20 = splitVerts.get(edgeKey(i2, i0));
    const n = (m01 !== undefined ? 1 : 0) + (m12 !== undefined ? 1 : 0) + (m20 !== undefined ? 1 : 0);

    if (n === 0) {
      newTri.push([i0, i1, i2]);
    } else if (n === 1) {
      if (m01 !== undefined) { newTri.push([i0, m01, i2], [m01, i1, i2]); }
      else if (m12 !== undefined) { newTri.push([i0, i1, m12], [m12, i1, i2]); }
      else { newTri.push([i0, i1, m20!], [i0, m20!, i2]); }
    } else if (n === 2) {
      if (m01 !== undefined && m12 !== undefined) {
        newTri.push([i0, m01, i2], [m01, m12, i2], [m01, i1, m12]);
      } else if (m12 !== undefined && m20 !== undefined) {
        newTri.push([i0, i1, m12], [i0, m12, m20], [m12, i2, m20]);
      } else {
        newTri.push([i0, m01!, m20!], [i1, m01!, i2], [m01!, m20!, i2]);
      }
    } else {
      newTri.push([i0, m01!, m20!], [m01!, i1, m12!], [m20!, m12!, i2], [m01!, m12!, m20!]);
    }
  }

  const newIndices = new Uint32Array(newTri.length * 3);
  for (let i = 0; i < newTri.length; i++) {
    newIndices[i * 3] = newTri[i][0];
    newIndices[i * 3 + 1] = newTri[i][1];
    newIndices[i * 3 + 2] = newTri[i][2];
  }

  return { positions: newPositions, indices: newIndices, vertexCount: nextVert, triangleCount: newTri.length };
}

function pushEdge(map: Map<string, number[]>, a: number, b: number, t: number): void {
  const key = edgeKey(a, b);
  const arr = map.get(key);
  if (arr) arr.push(t);
  else map.set(key, [t]);
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Recompute per-vertex normals by accumulating face normals, then normalize.
 * Degenerate faces are guarded so the output never contains NaN.
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
    const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
    if (i0 >= vertexCount || i1 >= vertexCount || i2 >= vertexCount) continue;
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
    const len = Math.hypot(nx, ny, nz);
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


/**
 * Detect living polyp / branch tips: well-fed surface vertices that protrude
 * (low local crowding + high resource). Returns the ordered tip candidates as
 * {positions, count}. Used for the artistic polyp tip-glow point cloud.
 */
export function computeTips(
  positions: Float32Array,
  resource: Float32Array,
  vertexCount: number,
  config: GrowthConfig,
  maxTips: number,
): { positions: Float32Array; count: number } {
  const thr = config.tipThreshold;
  const crowdR = Math.max(1.2, config.maxRadius * 0.05);
  const lim = Math.min(vertexCount, resource.length);

  interface Cand { idx: number; score: number; }
  const candidates: Cand[] = [];

  for (let v = 1; v < lim; v++) {
    const r = resource[v];
    if (r < thr) continue;
    const i3 = v * 3;
    const px = positions[i3], py = positions[i3 + 1], pz = positions[i3 + 2];
    // Local crowding: how many neighbours sit within a small radius.
    let crowd = 0;
    const step = vertexCount > 4000 ? 3 : 1;
    for (let w = 1; w < vertexCount; w += step) {
      if (w === v) continue;
      const dx = px - positions[w * 3];
      const dy = py - positions[w * 3 + 1];
      const dz = pz - positions[w * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < crowdR * crowdR) crowd++;
    }
    const protruding = Math.max(0, Math.min(1, (8 - crowd) / 8));
    candidates.push({ idx: v, score: r * (0.6 + protruding * 0.8) });
  }

  candidates.sort((a, b) => b.score - a.score);
  const count = Math.min(maxTips, candidates.length);
  const tipPos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3 = candidates[i].idx * 3;
    tipPos[i * 3] = positions[i3];
    tipPos[i * 3 + 1] = positions[i3 + 1];
    tipPos[i * 3 + 2] = positions[i3 + 2];
  }
  return { positions: tipPos, count };
}


// ── Seed geometry ───────────────────────────────────────────────────────────

/**
 * Build a triangulated icosphere with seeded surface noise. The noise breaks
 * perfect symmetry so Mullins-Sekerka instability has something to latch onto.
 */
export class KaandorpGrowthPipeline {
  static createIcosphere(
    radius: number,
    subdivisions: number,
    noiseAmount: number,
    seed: number,
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
        const m01 = KaandorpGrowthPipeline._mid(i0, i1, vertices, cache, radius);
        const m12 = KaandorpGrowthPipeline._mid(i1, i2, vertices, cache, radius);
        const m20 = KaandorpGrowthPipeline._mid(i2, i0, vertices, cache, radius);
        newFaces.push([i0, m01, m20], [i1, m12, m01], [i2, m20, m12], [m01, m12, m20]);
      }
      for (let i = 0; i < vertices.length; i++) {
        const [x, y, z] = vertices[i];
        const len = Math.sqrt(x * x + y * y + z * z);
        vertices[i] = [(x / len) * radius, (y / len) * radius, (z / len) * radius];
      }
      faceList = newFaces;
    }

    const rng = mulberry32(seed);
    for (let i = 0; i < vertices.length; i++) {
      const [x, y, z] = vertices[i];
      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len, ny = y / len, nz = z / len;
      const noise = (rng() - 0.5) * 2 * noiseAmount;
      vertices[i] = [x + nx * noise, y + ny * noise, z + nz * noise];
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

