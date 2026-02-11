/**
 * GelNodeMaterial.ts
 *
 * Rim lighting material for the jellyfish's gel overlay.
 * Creates an ethereal bioluminescent glow effect using three-level rim lighting.
 * Ported from original GLSL: temp-particulate-medusae/static/glsl/shaders/gel-frag.glsl
 */

import * as THREE from 'three/webgpu';
import {
  Fn,
  float,
  vec3,
  color,
  uniform,
  mix,
  max,
  clamp,
  dot,
  smoothstep,
  normalize,
  positionLocal,
  positionWorld,
  cameraPosition,
  positionGeometry,
  attribute,
} from 'three/tsl';

export interface GelMaterialUniforms {
  diffuse: THREE.Color | number;
  opacity: number;
  stepProgress: number;
}

export class GelNodeMaterial extends THREE.MeshBasicNodeMaterial {
  declare uniforms: GelMaterialUniforms;

  constructor(params: Partial<GelMaterialUniforms> = {}) {
    super({
      transparent: true,
      // Original Medusae.js: Gel uses AdditiveBlending for ethereal glow
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Create uniform nodes
    // Original Medusae.js: faint.opacity = 0.25 (faint is the gel overlay)
    const diffuseColor = params.diffuse instanceof THREE.Color
      ? params.diffuse
      : new THREE.Color(params.diffuse ?? 0x415AB5);
    const diffuseUniform = uniform(color(diffuseColor));
    const opacityUniform = uniform(float(params.opacity ?? 0.25));
    const stepProgressUniform = uniform(float(params.stepProgress ?? 0.0));

    // Store uniforms for JS access
    this.uniforms = {
      diffuse: diffuseUniform.value,
      opacity: params.opacity ?? 1.0,
      stepProgress: params.stepProgress ?? 0.0,
    };

    (this as any).diffuseUniform = diffuseUniform;
    (this as any).opacityUniform = opacityUniform;
    (this as any).stepProgressUniform = stepProgressUniform;

    // Position interpolation
    this.positionNode = Fn(() => {
      const posPrev = attribute('positionPrev', 'vec3');
      const posCurr = positionGeometry;
      return mix(posPrev, posCurr, stepProgressUniform);
    })();

    // Color - pure rim lighting with three levels
    // Original gel-frag.glsl uses radial normal: vNormal = normalize(position)
    this.colorNode = Fn(() => {
      // View direction from camera to world position
      const viewDir = cameraPosition.sub(positionWorld).normalize();

      // Radial normal (normalized position) - matches original normal-vert.glsl
      const radialNormal = normalize(positionLocal);

      // Fresnel rim: 1.0 - max(dot(viewDir, normal), 0.0)
      const nDotV = max(dot(viewDir, radialNormal), float(0));
      const rim = float(1).sub(nDotV);

      // Three-level rim lighting calculation
      // Base: 0.25
      // Mid: smoothstep(0.25, 1.0, rim) * 0.5
      // Edge: smoothstep(0.90, 1.0, rim) * 0.8
      const baseLevel = float(0.25);
      const midLevel = smoothstep(float(0.25), float(1.0), rim).mul(float(0.5));
      const edgeLevel = smoothstep(float(0.90), float(1.0), rim).mul(float(0.8));

      const rimLight = clamp(baseLevel.add(midLevel).add(edgeLevel), float(0.0), float(1.0));

      // Multiply diffuse color by rim light intensity
      const finalColor = diffuseUniform.mul(vec3(rimLight, rimLight, rimLight));

      return finalColor;
    })();

    // Simple opacity
    this.opacityNode = opacityUniform;
  }

  /**
   * Update the interpolation step progress (0.0 to 1.0)
   */
  updateStepProgress(progress: number): void {
    (this as any).stepProgressUniform.value = progress;
    this.uniforms.stepProgress = progress;
  }

  /**
   * Alias for updateStepProgress - matches InterpolatedMaterial interface
   */
  setStepProgress(progress: number): void {
    this.updateStepProgress(progress);
  }

  /**
   * Update opacity value
   */
  updateOpacity(opacity: number): void {
    (this as any).opacityUniform.value = opacity;
    this.uniforms.opacity = opacity;
  }

  /**
   * Set the diffuse color
   */
  setDiffuse(colorHex: number): void {
    const color = new THREE.Color(colorHex);
    (this as any).diffuseUniform.value.copy(color);
    if (this.uniforms.diffuse instanceof THREE.Color) {
      this.uniforms.diffuse.copy(color);
    } else {
      this.uniforms.diffuse = color;
    }
  }
}

export default GelNodeMaterial;
