import * as THREE from 'three/webgpu';
import { float, mix, screenUV, uniform } from 'three/tsl';

/**
 * Vignette configuration parameters
 */
export interface VignetteConfig {
  /** Darkness intensity (default: 0.5) */
  darkness: number;
  /** Offset for edge falloff (default: 1.25) */
  offset: number;
  /** Vignette color (default: 0x07070C) */
  color: number | THREE.Color;
}

/**
 * Default vignette configuration matching original WebGL implementation
 */
const DEFAULT_VIGNETTE_CONFIG: VignetteConfig = {
  darkness: 0.5,
  offset: 1.25,
  color: 0x07070C,
};

/**
 * VignetteNode - TSL Vignette Effect
 *
 * Implements edge darkening effect using TSL node graph.
 * Based on THREE.VignetteShader from the original WebGL implementation.
 *
 * Original GLSL formula:
 *   vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
 *   gl_FragColor = vec4(mix(texel.rgb, vec3(1.0 - darkness) * color, dot(uv, uv)), texel.a);
 *
 * This creates a smooth radial gradient from center to edges, darkening the corners.
 *
 * @param input The input texture node (e.g., beauty pass output)
 * @param config Vignette configuration parameters
 * @returns The processed texture node with vignette applied
 */
export function createVignetteNode(
  input: any,
  config: Partial<VignetteConfig> = {}
): any {
  // Merge config with defaults
  const vignetteConfig: VignetteConfig = {
    ...DEFAULT_VIGNETTE_CONFIG,
    ...config,
  };

  // Create TSL uniforms
  const darkness = uniform(vignetteConfig.darkness);
  const offset = uniform(vignetteConfig.offset);
  const vignetteColor = uniform(
    typeof vignetteConfig.color === 'number' ? new THREE.Color(vignetteConfig.color) : vignetteConfig.color
  );

  // Calculate vignette effect
  // Original GLSL: vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
  const uv = screenUV.sub(float(0.5)).mul(offset);

  // Original GLSL: dot(uv, uv) = distance squared from center
  const distSq = uv.dot(uv);

  // Original GLSL: vec3(1.0 - darkness) * color
  const vignetteDarkness = float(1).sub(darkness).mul(vignetteColor);

  // Original GLSL: mix(texel.rgb, vignetteColor, dot(uv, uv))
  // Mix between input color and vignette color based on distance from center
  const result = mix(input, vignetteDarkness, distSq);

  return result;
}

/**
 * VignetteEffect - Helper class for managing vignette effect
 */
export class VignetteEffect {
  private config: VignetteConfig;
  private darkness: ReturnType<typeof uniform>;
  private offset: ReturnType<typeof uniform>;
  private vignetteColor: ReturnType<typeof uniform>;

  constructor(config: Partial<VignetteConfig> = {}) {
    this.config = {
      ...DEFAULT_VIGNETTE_CONFIG,
      ...config,
    };

    // Create uniforms for runtime updates
    this.darkness = uniform(this.config.darkness);
    this.offset = uniform(this.config.offset);
    this.vignetteColor = uniform(
      typeof this.config.color === 'number' ? new THREE.Color(this.config.color) : this.config.color
    );
  }

  /**
   * Create a vignette node for the post-processing chain
   *
   * @param input The input texture node
   * @returns The processed texture node with vignette applied
   */
  public createNode(input: any): any {
    // Calculate vignette effect
    const uv = screenUV.sub(float(0.5)).mul(this.offset);
    const distSq = uv.dot(uv);
    const vignetteDarkness = float(1).sub(this.darkness).mul(this.vignetteColor);
    const result = mix(input, vignetteDarkness, distSq);

    return result;
  }

  /**
   * Update darkness intensity
   *
   * @param value New darkness value (0.0 - 1.0)
   */
  public setDarkness(value: number): void {
    this.darkness.value = value;
  }

  /**
   * Update offset for edge falloff
   *
   * @param value New offset value (higher = more edge coverage)
   */
  public setOffset(value: number): void {
    this.offset.value = value;
  }

  /**
   * Update vignette color
   *
   * @param value New vignette color (hex number or THREE.Color)
   */
  public setColor(value: number | THREE.Color): void {
    this.vignetteColor.value = typeof value === 'number' ? new THREE.Color(value) : value;
  }

  /**
   * Get current vignette configuration
   */
  public getConfig(): VignetteConfig {
    return {
      darkness: (this.darkness as unknown as { value: number }).value,
      offset: (this.offset as unknown as { value: number }).value,
      color: (this.vignetteColor as unknown as { value: THREE.Color }).value.clone(),
    };
  }
}

export default createVignetteNode;
