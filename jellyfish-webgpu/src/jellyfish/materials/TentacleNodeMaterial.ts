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
  vec4,
  vec3,
  length,
  mix,
  clamp,
  uniform,
  positionLocal,
  normalLocal,
  dot,
  normalize,
  Fn
} from 'three/tsl';
import { InterpolatedStandardMaterial } from './InterpolatedNodeMaterial';

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
  /** Use distance-based glow effect (true=curtain, false=tube solid shading) */
  useGlow?: boolean;
}

/**
 * Tentacle material with distance-based illumination
 * 
 * The tentacles glow brighter near the jellyfish center and fade
 * to darker colors at the tips. Uses additive blending for an
 * ethereal, bioluminescent effect.
 */
export class TentacleNodeMaterial extends InterpolatedStandardMaterial {
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
   * Whether to use distance-based glow (curtain) or solid 3D shading (tube)
   */
  private useGlow: boolean;

  constructor(params: TentacleNodeMaterialParameters = {}) {
    // Set up material with normal blending (NOT additive)
    // Original Medusae.js: Only linesFore uses AdditiveBlending, tentacles use NormalBlending
    super({
      transparent: true,
      depthTest: params.depthTest ?? true,
      depthWrite: params.depthWrite ?? false,
      blending: THREE.NormalBlending,
    });

    this.useGlow = params.useGlow ?? true;

    // Initialize uniforms with default values from original Medusae.js
    // Original: tentacle.color = 0x997299, opacity = 0.25, area = 2000
    this.diffuseUniform = uniform(color(params.diffuse ?? 0x997299));
    this.opacityUniform = uniform(float(params.opacity ?? 0.25));
    this.areaUniform = uniform(float(params.area ?? 2000.0));

    // stepProgressUniform + positionNode are inherited from InterpolatedNodeMaterial

    // Set up color node based on mode:
    // - glow mode (curtain): distance-based illumination with alpha falloff
    // - tube mode (3D): solid diffuse with normal-based hemisphere shading
    if (this.useGlow) {
      this.colorNode = this.createGlowColorNode();
    } else {
      this.colorNode = this.createTubeColorNode();
    }
  }

  /**
   * Create the color node for curtain mode (distance-based glow)
   * 
   * Formula from original shader:
   *   centerDist = length(position)  [local space distance from origin]
   *   illumination = area * 2.0 / (centerDist * centerDist)
   *   finalColor = mix(white, diffuse, clamp(illumination, 0.0, 1.25))
   *   alpha = clamp(opacity * illumination * illumination, 0.0, opacity)
   */
  private createGlowColorNode() {
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
      
      // Add simple hemisphere lighting for 3D tube shading
      // Uses the computed vertex normal to darken one side and lighten the other
      const lightDir = normalize(vec3(0.3, 0.8, 0.5));
      const ndotl = dot(normalLocal, lightDir).mul(0.5).add(0.5);
      const darkColor = finalColor.mul(float(0.4));
      const shadedColor = mix(darkColor, finalColor, ndotl);
      
      // Calculate alpha with squared falloff for softness
      // Alpha = opacity * illumination², clamped to [0, opacity]
      const opacity = this.opacityUniform;
      const alpha = opacity
        .mul(illumination)
        .mul(illumination)
        .clamp(float(0.0), opacity);
      
      // Return as vec4 with alpha and shading
      return vec4(shadedColor, alpha);
    })();
  }

  /**
   * Create the color node for tube mode (solid 3D shading)
   * 
   * No distance-based glow — uses fixed color with normal-based
   * hemisphere lighting for visible 3D tube volume.
   */
  private createTubeColorNode() {
    return Fn(() => {
      // Base color (no distance glow — use diffuse directly)
      const baseColor = this.diffuseUniform;
      const baseOpacity = this.opacityUniform;

      // Hemisphere lighting so tubes look properly 3D
      const lightDir = normalize(vec3(0.3, 0.8, 0.5));
      const ndotl = dot(normalLocal, lightDir).mul(0.5).add(0.5);
      const darkColor = baseColor.mul(float(0.35));
      const litColor = mix(darkColor, baseColor, ndotl);

      return vec4(litColor, baseOpacity);
    })();
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
