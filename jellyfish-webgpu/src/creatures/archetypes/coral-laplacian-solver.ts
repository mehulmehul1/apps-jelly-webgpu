/**
 * coral-laplacian-solver.ts
 *
 * WebGPU compute-shader Jacobi solver for the coral nutrient field
 * (∇²c = 0 with top=1 source, solid=0 absorbing, Neumann walls), plus a
 * CPU fallback that reuses the classic `solveLaplacian`.
 *
 * The GPU path replaces the old 90-iteration CPU solve with 1500+ iterations
 * per growth step on a 64³ grid. Per Merks et al. (2003), under-converged
 * Laplacian solves collapse into compact non-branching spheres, while tightly
 * converged fields reproduce the Mullins-Sekerka instability that yields
 * spontaneous branching — this is the single biggest lever for real coral
 * morphology.
 *
 * Design notes
 * ------------
 * - Ping-pong storage buffers: one compute pass per Jacobi iteration (each
 *   pass boundary is a full memory barrier, so every sweep observes the
 *   previous one), all submitted in a single encoder with zero CPU round-trips
 *   between sweeps.
 * - One readback (mapAsync) per growth step. Growth runs at ~1 step per
 *   1-2 frames, which paces the "watch it grow" effect for free.
 * - Device is taken lazily from `window.__webgpurenderer.backend.device`
 *   (the hook left by JellyfishMaterialTest "for archetypes that need GPU
 *   compute"). Falls back to the CPU solver whenever the device is absent.
 */

import { solveLaplacian } from './coral-growth-compute';

/**
 * Jacobi sweeps per GPU solve. The field only needs to be converged enough to
 * expose the Mullins-Sekerka depletion structure (Merks used ~10⁴ iterations
 * on a 200³ grid; scaled to a 64³ grid, ~1500 sweeps is a solid middle ground
 * and stays cheap: 1500 × 4096 workgroups in one submitted encoder).
 */
export const GPU_JACOBI_ITERATIONS = 1500;

// ── Shared interface (defined here so callers only depend on this module) ──

export interface LaplacianSolver {
  readonly isGPU: boolean;
  /**
   * Solve ∇²c = 0 on a `gs`³ grid given the solid voxel mask.
   * `solid[i] !== 0` marks an absorbing cell (c = 0). Top plane is the
   * source (c = 1), other domain walls are Neumann.
   * Resolves with the solved field as a flattened Float32Array (gs³).
   */
  solve(solid: Uint8Array, gs: number, iterations: number): Promise<Float32Array>;
}

// ── CPU fallback ────────────────────────────────────────────────────────────

class CpuLaplacianSolver implements LaplacianSolver {
  readonly isGPU = false;

  async solve(solid: Uint8Array, gs: number, iterations: number): Promise<Float32Array> {
    const grid = new Float32Array(gs * gs * gs);
    for (let iz = 0; iz < gs; iz++) {
      for (let ix = 0; ix < gs; ix++) {
        grid[ix + (gs - 1) * gs + iz * gs * gs] = 1.0;
      }
    }
    solveLaplacian(grid, solid, gs, iterations);
    return grid;
  }
}

// ── Minimal structural WebGPU types (external API surface) ─────────────────
// We only touch a small slice of the WebGPU API. These mirrors keep the module
// dependency-free of @webgpu/types and self-contained.

interface GpuBufferLike {
  size: number;
  usage: number;
  mapAsync(mode: number): Promise<void>;
  getMappedRange(offset?: number, size?: number): ArrayBuffer;
  unmap(): void;
}

interface GpuComputePassLike {
  setPipeline(pipeline: unknown): void;
  setBindGroup(index: number, bindGroup: unknown): void;
  dispatchWorkgroups(x: number, y?: number, z?: number): void;
  end(): void;
}

interface GpuCommandEncoderLike {
  beginComputePass(): GpuComputePassLike;
  copyBufferToBuffer(src: GpuBufferLike, srcOffset: number, dst: GpuBufferLike, dstOffset: number, size: number): void;
  finish(): unknown;
}

interface GpuQueueLike {
  submit(commands: unknown[]): void;
  writeBuffer(buffer: GpuBufferLike, bufferOffset: number, data: BufferSource, dataOffset?: number, size?: number): void;
}

interface GpuDeviceLike {
  createBuffer(desc: { size: number; usage: number }): GpuBufferLike;
  createBindGroupLayout(desc: unknown): unknown;
  createPipelineLayout(desc: unknown): unknown;
  createShaderModule(desc: { code: string }): unknown;
  createComputePipeline(desc: unknown): unknown;
  createBindGroup(desc: unknown): unknown;
  createCommandEncoder(): GpuCommandEncoderLike;
  queue: GpuQueueLike;
}

// WebGPU usage flags (subset). Values are the exact spec bit masks —
// GPUBufferUsage, GPUShaderStage and GPUMapMode. Getting these wrong fails at
// device validation (buffers come back invalid, pipelines/bind groups reject).
const BUFFER_USAGE = {
  MAP_READ: 0x1,    // GPUBufferUsage.MAP_READ (only combinable with COPY_DST)
  COPY_SRC: 0x4,    // GPUBufferUsage.COPY_SRC
  COPY_DST: 0x8,    // GPUBufferUsage.COPY_DST
  STORAGE: 0x80,    // GPUBufferUsage.STORAGE
  UNIFORM: 0x40,    // GPUBufferUsage.UNIFORM
} as const;

const SHADER_STAGE_COMPUTE = 0x4; // GPUShaderStage.COMPUTE

const MAP_MODE_READ = 0x1; // GPUMapMode.READ

// ── WGSL ────────────────────────────────────────────────────────────────────

const JACOBI_WGSL = /* wgsl */ `
struct Params {
  gs: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var<storage, read> solid: array<u32>;
@group(0) @binding(1) var<storage, read> gridIn: array<f32>;
@group(0) @binding(2) var<storage, read_write> gridOut: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let gs = params.gs;
  if (gid.x >= gs || gid.y >= gs || gid.z >= gs) { return; }

  let idx = gid.x + gid.y * gs + gid.z * gs * gs;

  // Absorbing living surface: c = 0.
  if (solid[idx] != 0u) { gridOut[idx] = 0.0; return; }

  // Top plane source: c = 1.
  if (gid.y == gs - 1u) { gridOut[idx] = 1.0; return; }

  // Other domain walls: Neumann (keep current value).
  if (gid.x == 0u || gid.x == gs - 1u || gid.y == 0u || gid.z == 0u || gid.z == gs - 1u) {
    gridOut[idx] = gridIn[idx];
    return;
  }

  let cL = gridIn[idx - 1u];
  let cR = gridIn[idx + 1u];
  let cD = gridIn[idx - gs];
  let cU = gridIn[idx + gs];
  let cB = gridIn[idx - gs * gs];
  let cF = gridIn[idx + gs * gs];
  gridOut[idx] = (cL + cR + cD + cU + cB + cF) * (1.0 / 6.0);
}
`;

// ── GPU solver ──────────────────────────────────────────────────────────────

class GpuLaplacianSolver implements LaplacianSolver {
  readonly isGPU = true;

  private device: GpuDeviceLike;
  private gs = 0;

  // Per-grid-size cached resources.
  private gridA: GpuBufferLike | null = null;
  private gridB: GpuBufferLike | null = null;
  private solidBuf: GpuBufferLike | null = null;
  private readback: GpuBufferLike | null = null;
  private uniformBuf: GpuBufferLike | null = null;
  private paramsAB: unknown = null; // bind group: solid, A→in, B→out
  private paramsBA: unknown = null; // bind group: solid, B→in, A→out
  private pipeline: unknown = null;

  constructor(device: GpuDeviceLike) {
    this.device = device;
  }

  private ensure(gs: number): void {
    if (this.gs === gs && this.gridA && this.gridB) return;
    this.gs = gs;
    const N = gs * gs * gs;
    const byteSize = N * 4;

    this.gridA = this.device.createBuffer({ size: byteSize, usage: BUFFER_USAGE.STORAGE | BUFFER_USAGE.COPY_SRC | BUFFER_USAGE.COPY_DST });
    this.gridB = this.device.createBuffer({ size: byteSize, usage: BUFFER_USAGE.STORAGE | BUFFER_USAGE.COPY_SRC | BUFFER_USAGE.COPY_DST });
    this.solidBuf = this.device.createBuffer({ size: byteSize, usage: BUFFER_USAGE.STORAGE | BUFFER_USAGE.COPY_DST });
    this.readback = this.device.createBuffer({ size: byteSize, usage: BUFFER_USAGE.MAP_READ | BUFFER_USAGE.COPY_DST });
    this.uniformBuf = this.device.createBuffer({ size: 16, usage: 1 << 6 }); // UNIFORM

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: SHADER_STAGE_COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: SHADER_STAGE_COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: SHADER_STAGE_COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: SHADER_STAGE_COMPUTE, buffer: { type: 'uniform' } },
      ],
    });
    const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
    const shaderModule = this.device.createShaderModule({ code: JACOBI_WGSL });
    this.pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    this.paramsAB = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.solidBuf } },
        { binding: 1, resource: { buffer: this.gridA } },
        { binding: 2, resource: { buffer: this.gridB } },
        { binding: 3, resource: { buffer: this.uniformBuf } },
      ],
    });
    this.paramsBA = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.solidBuf } },
        { binding: 1, resource: { buffer: this.gridB } },
        { binding: 2, resource: { buffer: this.gridA } },
        { binding: 3, resource: { buffer: this.uniformBuf } },
      ],
    });
  }

  async solve(solid: Uint8Array, gs: number, iterations: number): Promise<Float32Array> {
    this.ensure(gs);
    const N = gs * gs * gs;

    // 1. Initial field: top plane = 1, everything else = 0.
    const init = new Float32Array(N);
    for (let iz = 0; iz < gs; iz++) {
      for (let ix = 0; ix < gs; ix++) {
        init[ix + (gs - 1) * gs + iz * gs * gs] = 1.0;
      }
    }
    this.device.queue.writeBuffer(this.gridA!, 0, init);
    this.device.queue.writeBuffer(this.gridB!, 0, init);

    // 2. Solid mask as u32.
    const solidU32 = new Uint32Array(N);
    for (let i = 0; i < N; i++) solidU32[i] = solid[i] !== 0 ? 1 : 0;
    this.device.queue.writeBuffer(this.solidBuf!, 0, solidU32);

    // 3. Uniforms.
    const uniformData = new Uint32Array(4);
    uniformData[0] = gs;
    this.device.queue.writeBuffer(this.uniformBuf!, 0, uniformData);

    // 4. Ping-pong dispatches. One compute pass PER iteration: each pass
    //    boundary is a full memory barrier, so the next iteration is guaranteed
    //    to observe the previous sweep's writes (spec-safe across vendors).
    const encoder = this.device.createCommandEncoder();
    const wg = Math.ceil(gs / 4);
    for (let i = 0; i < iterations; i++) {
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipeline);
      // Even iteration: A→B (paramsAB). Odd iteration: B→A (paramsBA).
      pass.setBindGroup(0, (i % 2 === 0) ? this.paramsAB : this.paramsBA);
      pass.dispatchWorkgroups(wg, wg, wg);
      pass.end();
    }

    // 5. Copy the final buffer to the readback. Iteration i writes:
    //    i even → paramsAB (A in, B out) → gridB; i odd → gridA.
    //    Last iteration index = iterations - 1, so the freshest data lives in
    //    gridB when iterations is odd, gridA when even.
    const finalBuf = (iterations % 2 === 1) ? this.gridB! : this.gridA!;
    encoder.copyBufferToBuffer(finalBuf, 0, this.readback!, 0, N * 4);
    this.device.queue.submit([encoder.finish()]);

    // 6. Read back.
    await this.readback!.mapAsync(MAP_MODE_READ);
    const mapped = new Float32Array(this.readback!.getMappedRange(0, N * 4).slice(0));
    this.readback!.unmap();
    return mapped;
  }
}

// ── Device access ───────────────────────────────────────────────────────────

function tryGetGPUDevice(): GpuDeviceLike | null {
  try {
    const renderer = (window as any).__webgpurenderer;
    if (!renderer || typeof renderer !== 'object') return null;
    const backend = renderer.backend;
    const device = backend && (backend.device as GpuDeviceLike);
    if (!device || typeof device.createBuffer !== 'function' || typeof device.queue !== 'object') {
      return null;
    }
    return device;
  } catch {
    return null;
  }
}

let cachedSolver: LaplacianSolver | null = null;

/** Best-available solver: GPU when the WebGPU device is present, else CPU. */
export function getLaplacianSolver(): LaplacianSolver {
  if (!cachedSolver) {
    const device = tryGetGPUDevice();
    cachedSolver = device ? new GpuLaplacianSolver(device) : new CpuLaplacianSolver();
  }
  return cachedSolver;
}

/** True when a real WebGPU device is reachable (used to size the voxel grid). */
export function isGPUSolverAvailable(): boolean {
  return getLaplacianSolver().isGPU;
}
