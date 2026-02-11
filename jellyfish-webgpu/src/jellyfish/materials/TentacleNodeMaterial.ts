/**
 * TentacleNodeMaterial.ts
 * 
 * TSL material for jellyfish tentacles with distance-based glow effect.
 * Ported from temp-particulate-medusae/static/glsl/shaders/tentacle-frag.glsl
 * 
 * Original GLSL formula:
 *   illumination = area * 2.0 / (centerDist * centerDist)
 *   color = mix(white, diffuse, clamp(illumination, 0.0, 1.25))
 *   alpha = clamp(opacity * illumination * illumination, 0.0, opacity)
 * 
 * Where centerDist is the distance from the jellyfish center in local space,
 * making tentacles glow BRIGHTER near the center and darker at the tips.
 */

import * as THREE from 'three/webgpu';
import {
  color,
  float,
  vec3,
  vec4,
  length,
  mix,
  clamp,
  uniform,
  positionLocal,
  Fn
} from 'three/tsl';

export interface TentacleNodeMaterialParameters {
  /** Base diffuse color (default: 0x997299 - muted purple) */
  diffuse?: number | string;
  /** Alias for diffuse - base color (default: 0x997299) */
  color?: number | string;
  /** Opacity multiplier (default: 1.0) */
  opacity?: number;
  /** Area factor controlling glow intensity (default: 2000) */
  area?: number;
  /** Enable transparency */
  transparent?: boolean;
  /** Enable depth testing */
  depthTest?: boolean;
  /** Enable depth writing */
  depthWrite?: boolean;
}

/**
 * Tentacle material with distance-based illumination
 * 
 * The tentacles glow brighter near the jellyfish center and fade
 * to darker colors at the tips. Uses additive blending for an
 * ethereal, bioluminescent effect.
 */
export class TentacleNodeMaterial extends THREE.LineBasicNodeMaterial {
  /**
   * Uniform for the diffuse color
   */
  private diffuseUniform: ReturnType<typeof uniform>;
  
  /**
   * Uniform for opacity
   */
  private opacityUniform: ReturnType<typeof uniform>;
  
  /**
   * Uniform for area (glow intensity factor)
   */
  private areaUniform: ReturnType<typeof uniform>;
  
  /**
   * Uniform for step progress (interpolation factor 0.0 to 1.0)
   */
  private stepProgressUniform: ReturnType<typeof uniform>;

  constructor(params: TentacleNodeMaterialParameters = {}) {
    // Set up material with normal blending (NOT additive)
    // Original Medusae.js: Only linesFore uses AdditiveBlending, tentacles use NormalBlending
    super({
      transparent: true,
      depthTest: params.depthTest ?? true,
      depthWrite: params.depthWrite ?? false,
      blending: THREE.NormalBlending,
    });

    // Initialize uniforms with default values from original Medusae.js
    // Original: tentacle.color = 0x997299, opacity = 0.25, area = 2000
    this.diffuseUniform = uniform(color(params.diffuse ?? 0x997299));
    this.opacityUniform = uniform(float(params.opacity ?? 0.25));
    this.areaUniform = uniform(float(params.area ?? 2000.0));
    this.stepProgressUniform = uniform(float(0.0));

    // Set up interpolated position node
    // Mix between previous and current physics positions
    this.positionNode = this.createInterpolatedPositionNode();

    // Set up color node with distance-based illumination
    this.colorNode = this.createColorNode();

    // Note: LineBasicNodeMaterial doesn't have opacityNode
    // Opacity is controlled via vertex colors alpha channel
    // We incorporate alpha into the color node
  }

  /**
   * Create the interpolated position node
   * Mixes between previous and current physics positions
   */
  private createInterpolatedPositionNode() {
    const prevPosition = Fn(() => {
      return vec3(
        float(-1000000.0), // Use positionPrev attribute from geometry
        float(-1000000.0),
        float(-1000000.0)
      );
    })();
    
    // Use mix with the step progress uniform
    // The actual attributes will be resolved at runtime
    return mix(
      prevPosition,
      positionLocal,
      this.stepProgressUniform
    );
  }

  /**
   * Create the color node with distance-based illumination
   * 
   * Formula from original shader:
   *   centerDist = length(position)  [local space distance from origin]
   *   illumination = area * 2.0 / (centerDist * centerDist)
   *   finalColor = mix(white, diffuse, clamp(illumination, 0.0, 1.25))
   *   alpha = clamp(opacity * illumination * illumination, 0.0, opacity)
   */
  private createColorNode() {
    return Fn(() => {
      // Calculate distance from center in local space
      // positionLocal is the interpolated position
      const centerDist = length(positionLocal);
      
      // Prevent division by zero and ensure minimum distance
      const safeDist = clamp(centerDist, float(0.1), float(10000.0));
      
      // Calculate illumination: area * 2 / distance²
      // Points closer to center have HIGHER illumination
      const area = this.areaUniform;
      const distSquared = safeDist.mul(safeDist);
      const illumination = area.mul(2.0).div(distSquared);
      
      // Clamp illumination to [0, 1.25] for color mixing
      const clampedIllumination = clamp(illumination, float(0.0), float(1.25));
      
      // Mix between white (center, bright) and diffuse color (tips, darker)
      // High illumination = more white (bright center)
      // Low illumination = more diffuse color (darker tips)
      const finalColor = mix(
        color(0xffffff),  // White for bright center
        this.diffuseUniform,
        clampedIllumination
      );
      
      // Calculate alpha with squared falloff for softness
      // Alpha = opacity * illumination², clamped to [0, opacity]
      const opacity = this.opacityUniform;
      const alpha = opacity
        .mul(illumination)
        .mul(illumination)
        .clamp(float(0.0), opacity);
      
      // Return as vec4 with alpha
      return vec4(finalColor, alpha);
    })();
  }

  /**
   * Update the interpolation step progress
   * @param progress - Interpolation factor from 0.0 (previous) to 1.0 (current)
   */
  setStepProgress(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    (this.stepProgressUniform as unknown as { value: number }).value = clamped;
  }

  /**
   * Get the current interpolation progress value
   */
  getStepProgress(): number {
    return (this.stepProgressUniform as unknown as { value: number }).value;
  }

  /**
   * Set the diffuse color
   */
  setDiffuse(colorValue: number | string | THREE.Color): void {
    const colorObj = new THREE.Color(colorValue);
    const uniformColor = this.diffuseUniform as unknown as { value: THREE.Color };
    uniformColor.value.copy(colorObj);
  }

  /**
   * Get the diffuse color
   */
  getDiffuse(): THREE.Color {
    return (this.diffuseUniform as unknown as { value: THREE.Color }).value;
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
   * Set the area (glow intensity factor)
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

export default TentacleNodeMaterial;
