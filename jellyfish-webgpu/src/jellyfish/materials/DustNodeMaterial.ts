/**
 * DustNodeMaterial.ts
 * 
 * TSL material for atmospheric dust particles with vertex animation.
 * Ported from temp-particulate-medusae/static/glsl/shaders/dust-vert.glsl and dust-frag.glsl
 * 
 * Original GLSL formulas:
 * Vertex:
 *   offsetY = mod(position.y - time, area) - area * 0.5
 *   offsetX = position.x + sin(cos(offsetY * 0.1) + sin(offsetY * 0.1 + position.x * 0.1) * 2.0)
 *   offsetZ = position.z + sin(cos(offsetY * 0.1) + sin(offsetY * 0.1 + position.z * 0.1) * 2.0)
 *   centerDist = length(offsetPosition)
 *   gl_PointSize = size * (scale / length(mvPosition.xyz))
 * 
 * Fragment:
 *   radius = area * 0.5
 *   illumination = max(0.0, (radius - centerDist) / radius)
 *   gl_FragColor = vec4(psColor.rgb, illumination * illumination * opacity)
 * 
 * The particles drift vertically in a cycling loop while oscillating horizontally
 * with sine waves. They glow brighter near the jellyfish center.
 */

import * as THREE from 'three/webgpu';
import {
  color,
  float,
  vec3,
  vec4,
  length,
  sin,
  cos,
  max,
  uniform,
  positionLocal,
  modelViewMatrix,
  Fn
} from 'three/tsl';

export interface DustNodeMaterialParameters {
  /** Base color (default: 0xffffff - white) */
  psColor?: number | string | THREE.Color;
  /** Opacity multiplier (default: 0.95) */
  opacity?: number;
  /** Particle size (default: 32) */
  size?: number;
  /** Scale factor for distance attenuation (default: 150) */
  scale?: number;
  /** Area for vertical cycling (default: 300) */
  area?: number;
  /** Procedural texture for particle shape (optional) */
  map?: THREE.Texture;
}

/**
 * Dust material with animated particle movement and distance-based glow
 * 
 * Particles cycle vertically through space while drifting with sine-wave
 * patterns horizontally. They glow brighter near the center and fade at edges.
 * Uses additive blending for an ethereal atmospheric effect.
 */
export class DustNodeMaterial extends THREE.PointsNodeMaterial {
  /**
   * Uniform for the particle color
   */
  private psColorUniform: ReturnType<typeof uniform>;

  /**
   * Uniform for opacity
   */
  private opacityUniform: ReturnType<typeof uniform>;

  /**
   * Uniform for particle size
   */
  private sizeUniform: ReturnType<typeof uniform>;

  /**
   * Uniform for scale (distance attenuation factor)
   */
  private scaleUniform: ReturnType<typeof uniform>;

  /**
   * Uniform for area (vertical cycling range)
   */
  private areaUniform: ReturnType<typeof uniform>;

  /**
   * Uniform for animation time
   */
  private timeUniform: ReturnType<typeof uniform>;

  constructor(params: DustNodeMaterialParameters = {}) {
    // Set up material with additive blending for glow effect
    super({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    // Initialize uniforms with default values
    const initialColor = new THREE.Color(params.psColor ?? 0xffffff);
    this.psColorUniform = uniform(color(initialColor));
    this.opacityUniform = uniform(float(params.opacity ?? 0.95));
    this.sizeUniform = uniform(float(params.size ?? 32.0));
    this.scaleUniform = uniform(float(params.scale ?? 150.0));
    this.areaUniform = uniform(float(params.area ?? 300.0));
    this.timeUniform = uniform(float(0.0));

    // Set up animated position node
    this.positionNode = this.createAnimatedPositionNode();

    // Set up size attenuation node
    this.sizeNode = this.createSizeNode();

    // Set up color node with distance-based illumination
    this.colorNode = this.createColorNode();
  }

  /**
   * Create the animated position node
   * 
   * Formula from original shader:
   *   offsetY = mod(position.y - time, area) - area * 0.5
   *   offsetX = position.x + sin(cos(offsetY * 0.1) + sin(offsetY * 0.1 + position.x * 0.1) * 2.0)
   *   offsetZ = position.z + sin(cos(offsetY * 0.1) + sin(offsetY * 0.1 + position.z * 0.1) * 2.0)
   */
  private createAnimatedPositionNode() {
    return Fn(() => {
      const pos = positionLocal;
      const t = this.timeUniform;
      const area = this.areaUniform;
      const halfArea = area.mul(0.5);

      // Vertical cycling: mod(position.y - time, area) - area/2
      const offsetY = pos.y
        .sub(t)
        .mod(area)
        .sub(halfArea);

      // Horizontal X drift with nested sine waves
      // driftX = sin(cos(offsetY * 0.1) + sin(offsetY * 0.1 + position.x * 0.1) * 2.0)
      const innerSinX = sin(
        offsetY.mul(0.1).add(pos.x.mul(0.1))
      );
      const driftX = sin(
        cos(offsetY.mul(0.1)).add(innerSinX.mul(2.0))
      );
      const offsetX = pos.x.add(driftX);

      // Horizontal Z drift (same pattern)
      const innerSinZ = sin(
        offsetY.mul(0.1).add(pos.z.mul(0.1))
      );
      const driftZ = sin(
        cos(offsetY.mul(0.1)).add(innerSinZ.mul(2.0))
      );
      const offsetZ = pos.z.add(driftZ);

      return vec3(offsetX, offsetY, offsetZ);
    })();
  }

  /**
   * Create the size attenuation node
   * 
   * Formula from original shader:
   *   gl_PointSize = size * (scale / length(mvPosition.xyz))
   * 
   * This makes distant particles smaller and closer particles larger.
   */
  private createSizeNode() {
    return Fn(() => {
      const size = this.sizeUniform;
      const scale = this.scaleUniform;

      // Transform position to view space using modelViewMatrix
      // The positionNode is already applied, so positionLocal is the animated position
      const mvPosition = modelViewMatrix.mul(vec4(positionLocal, float(1.0)));

      // size × scale / length(mvPosition.xyz)
      return size.mul(scale).div(length(mvPosition.xyz));
    })();
  }

  /**
   * Create the color node with distance-based illumination
   * 
   * Formula from original shader:
   *   centerDist = length(offsetPosition)
   *   radius = area * 0.5
   *   illumination = max(0.0, (radius - centerDist) / radius)
   *   gl_FragColor = vec4(psColor.rgb, illumination * illumination * opacity)
   * 
   * Particles closer to the center glow brighter, fading at the edges.
   */
  private createColorNode() {
    return Fn(() => {
      const area = this.areaUniform;
      const radius = area.mul(0.5);

      // Calculate distance from center in local space
      // positionLocal is the animated position from positionNode
      const centerDist = length(positionLocal);

      // illumination = max(0, (radius - centerDist) / radius)
      // This gives 1.0 at center, fading to 0.0 at radius distance
      const illumination = max(
        float(0.0),
        radius.sub(centerDist).div(radius)
      );

      // Square the illumination for smoother falloff
      const alpha = illumination.mul(illumination).mul(this.opacityUniform);

      // Return as vec4 with alpha
      return vec4(this.psColorUniform, alpha);
    })();
  }

  /**
   * Update the animation time
   * @param time - Current time value for animation
   */
  setTime(time: number): void {
    (this.timeUniform as unknown as { value: number }).value = time;
  }

  /**
   * Get the current animation time
   */
  getTime(): number {
    return (this.timeUniform as unknown as { value: number }).value;
  }

  /**
   * Set the particle color
   */
  setColor(colorValue: number | string | THREE.Color): void {
    const colorObj = new THREE.Color(colorValue);
    const uniformColor = this.psColorUniform as unknown as { value: THREE.Color };
    uniformColor.value.copy(colorObj);
  }

  /**
   * Get the particle color
   */
  getColor(): THREE.Color {
    return (this.psColorUniform as unknown as { value: THREE.Color }).value;
  }

  /**
   * Set the opacity
   */
  setOpacity(value: number): void {
    (this.opacityUniform as unknown as { value: number }).value = Math.max(0, Math.min(1, value));
  }

  /**
   * Get the opacity
   */
  getOpacity(): number {
    return (this.opacityUniform as unknown as { value: number }).value;
  }

  /**
   * Set the particle size
   */
  setSize(value: number): void {
    (this.sizeUniform as unknown as { value: number }).value = Math.max(0, value);
  }

  /**
   * Get the particle size
   */
  getSize(): number {
    return (this.sizeUniform as unknown as { value: number }).value;
  }

  /**
   * Set the scale (distance attenuation factor)
   */
  setScale(value: number): void {
    (this.scaleUniform as unknown as { value: number }).value = Math.max(0, value);
  }

  /**
   * Get the scale value
   */
  getScale(): number {
    return (this.scaleUniform as unknown as { value: number }).value;
  }

  /**
   * Set the area (vertical cycling range)
   */
  setArea(value: number): void {
    (this.areaUniform as unknown as { value: number }).value = Math.max(0, value);
  }

  /**
   * Get the area value
   */
  getArea(): number {
    return (this.areaUniform as unknown as { value: number }).value;
  }
}

/**
 * Create a procedural dust particle texture with concentric circles
 * 
 * Creates a soft glow texture with concentric circles that fade outward,
 * matching the original Dust.createTexture() implementation.
 * 
 * @returns THREE.CanvasTexture with particle shape
 */
export function createDustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const size = 64; // 2^6 as in original
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for dust texture');
  }

  const center = size * 0.5;
  const rings = 2;

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  // Draw concentric circles with alpha falloff
  for (let i = 0; i < rings; i++) {
    // Use t * t for non-linear falloff (mapLinear equivalent)
    const t = i / (rings - 1);
    const tSquared = t * t;

    // Radius: 4 to sizeHalf (32)
    const radius = 4 + tSquared * (center - 4);

    // Alpha: 1 to 0.05
    const alpha = 1 - t * 0.95;

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

/**
 * Generate dust particle geometry with random positions
 * 
 * Creates a BufferGeometry with the specified number of particles
 * randomly distributed within the given area.
 * 
 * @param count - Number of particles (default: 8000)
 * @param area - Area size for distribution (default: 300)
 * @returns THREE.BufferGeometry with position attribute
 */
export function createDustGeometry(
  count: number = 8000,
  area: number = 300
): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  const areaHalf = area * 0.5;

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    positions[ix] = Math.random() * area - areaHalf;
    positions[ix + 1] = Math.random() * area - areaHalf;
    positions[ix + 2] = Math.random() * area - areaHalf;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Add empty normals to suppress TSL warnings
  const normals = new Float32Array(count * 3);
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  return geometry;
}

/**
 * Create a complete dust particle system
 * 
 * Convenience function that creates both the geometry and material
 * with sensible defaults matching the original implementation.
 * 
 * @param options - Optional parameters for customization
 * @returns Object with geometry, material, and mesh
 */
export function createDustSystem(options: {
  count?: number;
  area?: number;
  psColor?: number | string | THREE.Color;
  opacity?: number;
  size?: number;
  scale?: number;
} = {}): {
  geometry: THREE.BufferGeometry;
  material: DustNodeMaterial;
  points: THREE.Points;
} {
  const count = options.count ?? 8000;
  const area = options.area ?? 300;

  const geometry = createDustGeometry(count, area);

  const material = new DustNodeMaterial({
    psColor: options.psColor ?? 0xffffff,
    opacity: options.opacity ?? 0.95,
    size: options.size ?? 32,
    scale: options.scale ?? 150,
    area: area,
    map: createDustTexture(),
  });

  const points = new THREE.Points(geometry, material);

  return { geometry, material, points };
}

export default DustNodeMaterial;
