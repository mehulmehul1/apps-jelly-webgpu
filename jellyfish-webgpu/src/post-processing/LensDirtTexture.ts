import * as THREE from 'three/webgpu';

/**
 * Lens Dirt Texture Generator
 *
 * Creates a procedural texture atlas with 100 variations of lens dirt particles.
 * Each cell contains an organic blob shape with gradient fills and shadow effects.
 *
 * Based on the original LensDirtTexture.js from the WebGL implementation.
 */

export interface LensDirtTextureConfig {
  /** Texture size in pixels (default: 1024) */
  size?: number;
  /** Number of cells per row/column (default: 10) */
  cells?: number;
  /** Padding between cells in pixels (default: 20) */
  cellPad?: number;
  /** Number of segments for blob shape (default: 50) */
  detail?: number;
}

/**
 * Generate a grayscale color with random alpha
 */
function grayscaleColor(start: number, range: number, alpha: number): string {
  const c = Math.floor(Math.random() * range) + start;
  return `rgba(${c}, ${c}, ${c}, ${alpha})`;
}

/**
 * Create radial gradients for blob fills
 */
function createGradients(
  ctx: CanvasRenderingContext2D,
  count: number,
  radius: number
): Array<CanvasGradient & { _alpha?: number }> {
  const step = (Math.PI * 2) / (count + 1);
  let angle = 0;
  const gradients: Array<CanvasGradient & { _alpha?: number }> = [];

  for (let i = 0; i < count; i++) {
    const gx0 = Math.cos(angle) * radius;
    const gy0 = Math.sin(angle) * radius;
    const gx1 = Math.cos(angle + Math.PI) * radius;
    const gy1 = Math.sin(angle + Math.PI) * radius;

    const alphaA = Math.random() * 0.1;
    const alphaB = Math.random() * 0.5;
    const colorA = grayscaleColor(100, 100, alphaA);
    const colorB = grayscaleColor(100, 100, alphaB);

    const gradient = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    gradient.addColorStop(0.2, colorA);
    gradient.addColorStop(0.8, colorB);
    (gradient as any)._alpha = alphaB;
    gradients.push(gradient);

    angle += step;
  }

  return gradients;
}

/**
 * Draw an organic blob shape using simplex noise
 */
function drawBlob(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  segments: number
): void {
  const step = (Math.PI * 2) / segments;
  let angle = 0;
  // Use pseudo-random offsets for organic variation
  const sx = Math.random() * 100;
  const sy = Math.random() * 100;

  ctx.beginPath();

  for (let i = 0; i < segments - 1; i++) {
    let x = Math.cos(angle) * rx;
    let y = Math.sin(angle) * ry;

    // Apply simple pseudo-noise for organic edges
    const nx = (sx + x) * 0.01;
    const ny = (sy + y) * 0.01;
    // Simple noise approximation using sin/cos
    const noiseX = Math.sin(nx * 12.9898 + ny * 78.233) * 5;
    const noiseY = Math.cos(nx * 43.343 + ny * 17.989) * 5;
    x += noiseX;
    y += noiseY;

    angle += step;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Draw shadow effect by stroking multiple times
 */
function drawShadow(ctx: CanvasRenderingContext2D, iterations: number): void {
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = grayscaleColor(200, 10, 1);

  for (let i = 0; i < iterations; i++) {
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Create the lens dirt texture atlas
 *
 * Generates a texture with a grid of organic dirt blobs.
 * Each cell contains a unique variation for variety.
 *
 * @param config Configuration options
 * @returns CanvasTexture with the dirt atlas
 */
export function createLensDirtTexture(
  config: LensDirtTextureConfig = {}
): THREE.CanvasTexture {
  const {
    size = 1024,
    cells = 10,
    cellPad = 20,
    detail = 50,
  } = config;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for lens dirt texture');
  }

  const cellSize = size / cells;
  const cellSizeHalf = cellSize * 0.5;
  const blobRad = (cellSize - cellPad) * 0.5;
  const blobRadHalf = blobRad * 0.5;

  // Create gradients for variety
  const gradients = createGradients(ctx, cells, cellSize);

  ctx.lineWidth = 1;

  // Generate grid of dirt cells
  for (let row = 0; row < cells; row++) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(0, cellSize * row + cellSizeHalf);

    for (let col = 0; col < cells; col++) {
      ctx.translate(col === 0 ? cellSizeHalf : cellSize, 0);

      // Random blob dimensions
      const rx = Math.random() * blobRadHalf + blobRadHalf;
      const ry = Math.random() * blobRadHalf + blobRadHalf;

      // Random gradient
      const gi = Math.floor(Math.random() * gradients.length);
      const gradient = gradients[gi];

      ctx.fillStyle = gradient as unknown as string;
      ctx.strokeStyle = grayscaleColor(
        60,
        30,
        ((gradient as any)._alpha || 0.3) * 0.5
      );

      drawBlob(ctx, rx, ry, detail);
      drawShadow(ctx, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

/**
 * Default texture configuration matching original WebGL implementation
 */
export const DEFAULT_LENS_DIRT_TEXTURE_CONFIG: LensDirtTextureConfig = {
  size: 1024,
  cells: 10,
  cellPad: 20,
  detail: 50,
};

export default createLensDirtTexture;
