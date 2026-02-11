/**
 * BulbNodeMaterial.ts
 *
 * TSL port of the bulb-frag.glsl shader from the original Medusae implementation.
 * Creates a complex procedural pattern with 7 layers of sine wave interference,
 * rim lighting, and bioluminescent glow effect.
 *
 * Original: temp-particulate-medusae/static/glsl/shaders/bulb-frag.glsl
 */

import * as THREE from 'three/webgpu';
import {
  Fn,
  color,
  float,
  vec3,
  vec2,
  uniform,
  uv,
  screenUV,
  texture,
  mix,
  smoothstep,
  max,
  clamp,
  refract,
  positionWorld,
  positionLocal,
  normalize,
  dot,
  cameraPosition
} from 'three/tsl';
import { InterpolatedNodeMaterial } from './InterpolatedNodeMaterial';

export interface BulbMaterialUniforms {
  diffuse: THREE.Color;
  diffuseB: THREE.Color;
  opacity: number;
  time: number;
  patternScale0?: number;
  patternScale1?: number;
  rimBoost?: number;
  ior?: number;
  dispersion?: number;
  refractionStrength?: number;
}

/**
 * BulbNodeMaterial - Procedural bioluminescent bulb material
 *
 * Features:
 * - 7-layer sine wave interference pattern
 * - 4 UV variations with rim offset
 * - Time-based oscillation
 * - Two-color gradient mixing
 * - Rim lighting integration
 * - Physics interpolation support
 */
export class BulbNodeMaterial extends InterpolatedNodeMaterial {
  // Uniforms
  protected timeUniform: any;
  protected diffuseUniform: any;
  protected diffuseBUniform: any;
  protected opacityUniform: any;
  protected patternScale0Uniform: any;
  protected patternScale1Uniform: any;
  protected rimBoostUniform: any;
  protected iorUniform: any;
  protected dispersionUniform: any;
  protected refractionStrengthUniform: any;
  protected refractionResolutionUniform: any;

  private refractionTexture: THREE.Texture;

  constructor(parameters: THREE.MeshPhysicalNodeMaterialParameters = {}) {
    // Default colors from original
    const defaults = {
      color: 0xff00ff,
      transparent: true,
      ...parameters
    };

    super(defaults);

    // Create uniforms with original bioluminescent colors from reference
    // Original Medusae.js: bulb.diffuse = 0xFFA9D2, bulb.diffuseB = 0x70256C, opacity = 0.75
    this.diffuseUniform = uniform(color(0xFFA9D2)); // Bright Pink
    this.diffuseBUniform = uniform(color(0x70256C)); // Deep Purple (matching original)
    this.opacityUniform = uniform(float(0.75)); // Original opacity
    this.timeUniform = uniform(float(0.0));
    this.patternScale0Uniform = uniform(float(1.0));
    this.patternScale1Uniform = uniform(float(1.0));
    this.rimBoostUniform = uniform(float(1.0));

    // Refraction/dispersion controls (screen-space refraction sampling a background RT)
    this.iorUniform = uniform(float(1.33));
    this.dispersionUniform = uniform(float(0.02));
    this.refractionStrengthUniform = uniform(float(0.0)); // default off
    this.refractionResolutionUniform = uniform(vec2(1.0, 1.0));

    // Default: 1x1 black texture until the scene assigns a real RT texture.
    const px = new Uint8Array([0, 0, 0, 255]);
    const dt = new THREE.DataTexture(px, 1, 1);
    dt.needsUpdate = true;
    this.refractionTexture = dt;

    // Setup TSL shader nodes
    this.setupTSLNodes();
  }

  /**
   * Setup all TSL shader nodes
   */
  private setupTSLNodes(): void {
    // Oscillate function: sin(t) * halfRange + (1 - halfRange)) * vMax
    // @ts-ignore - TSL Fn destructuring pattern
    const oscillate = Fn(([vMin, vMax, t]) => {
      const halfRange = vMax.sub(vMin).div(vMax).mul(0.5);
      return t.sin().mul(halfRange).add(float(1.0).sub(halfRange)).mul(vMax);
    });

    // Accumulate function - 7 layers of sine wave interference
    // @ts-ignore - TSL Fn destructuring pattern
    const accumulate = Fn(([uvCoord, saturation, scale]) => {
      let sat: any = saturation;

      // Layer 1: Base sine pattern on X
      sat = sat.sub(
        uvCoord.x.mul(60.0).sin().mul(0.25)
          .add(uvCoord.x.mul(50.0).mul(scale).sin().mul(0.25))
          .add(0.75)
      );

      // Layer 2: Y-X interference pattern A
      sat = sat.sub(
        uvCoord.y.mul(uvCoord.x.mul(5.0).sin().mul(5.0).mul(scale)).sin().mul(0.05)
      );

      // Layer 3: Y-(1-X) interference pattern B
      sat = sat.sub(
        uvCoord.y.mul(float(1.0).sub(uvCoord.x).mul(5.0).sin().mul(5.0).mul(scale)).sin().mul(0.05)
      );

      // Layer 4: Complex pattern with cos(uv.x)
      sat = sat.sub(
        uvCoord.y.mul(uvCoord.y.add(uvCoord.x.cos().mul(2.0)).mul(3.0).mul(scale)).sin().mul(0.15)
      );

      // Layer 5: Complex pattern with cos(1-uv.x)
      sat = sat.sub(
        uvCoord.y.mul(uvCoord.y.add(float(1.0).sub(uvCoord.x).cos().mul(2.0)).mul(3.0).mul(scale)).sin().mul(0.15)
      );

      // Layer 6: Offset Y pattern A
      sat = sat.sub(
        uvCoord.y.sub(1.5).mul(uvCoord.y.add(uvCoord.x.sub(1.0).cos().mul(2.0)).mul(4.0).mul(scale)).sin().mul(0.15)
      );

      // Layer 7: Offset Y pattern B
      sat = sat.sub(
        uvCoord.y.sub(1.5).mul(uvCoord.y.add(uvCoord.x.cos()).mul(2.0).mul(3.0).mul(scale)).sin().mul(0.15)
      );

      // Layer 8: Final Y modulation
      sat = sat.sub(
        uvCoord.y.mul(5.0).sin().mul(0.15)
          .add(uvCoord.y.mul(2.5).sin().mul(1.25))
      );

      return sat;
    });

    // Main color node
    const bulbColorNode = Fn(() => {
      // Calculate rim lighting using radial normal (matching original normal-vert.glsl)
      // Original: vNormal = normalize(position)
      const viewDir = cameraPosition.sub(positionWorld).normalize();
      const radialNormal = normalize(positionLocal);
      const nDotV = max(dot(viewDir, radialNormal), float(0.0));
      const rim = float(1.0).sub(nDotV).mul(this.rimBoostUniform);

      // Get base UV (for internal biolume patterns)
      const uv0: any = uv();

      // Create 4 UV variations with rim offset
      const uv1 = uv0.add(vec2(rim, rim));
      const uv2 = vec2(rim.negate().mul(0.25), rim.negate().mul(0.25));
      const uv3 = vec2(rim, uv0.y);

      // Calculate oscillating scales
      const t = this.timeUniform;
      // @ts-ignore - TSL function call
      const scale0 = oscillate(float(8.0), float(15.0), t.mul(0.25).add(0.5))
        .mul(this.patternScale0Uniform);
      // @ts-ignore - TSL function call
      const scale1 = oscillate(float(12.0), float(20.0), t.mul(0.125))
        .mul(this.patternScale1Uniform);
      const scale2 = float(1.0);
      const scale3 = float(1.0);

      // Accumulate saturation from all 4 UV variations
      let saturation: any = float(0.0);

      // UV0 contribution
      // @ts-ignore - TSL function call
      const acc0 = accumulate(uv0, float(2.0), scale0);
      saturation = saturation.add(max(acc0, float(-0.5)));

      // UV1 contribution
      // @ts-ignore - TSL function call
      const acc1 = accumulate(uv1, float(2.0), scale1);
      saturation = saturation.add(max(acc1, float(0.25)));

      // UV2 contribution
      // @ts-ignore - TSL function call
      const acc2 = accumulate(uv2, float(1.0), scale2);
      saturation = saturation.add(max(acc2, float(-0.25)));

      // UV3 contribution
      // @ts-ignore - TSL function call
      const acc3 = accumulate(uv3, float(1.0), scale3);
      saturation = saturation.add(max(acc3, float(-0.25)));

      // Mix colors based on saturation
      const colorMix = smoothstep(float(-0.5), float(0.5), saturation);
      const finalColor = mix(this.diffuseUniform, this.diffuseBUniform, colorMix);

      // Optional screen-space refraction + dispersion (samples a pre-rendered background RT).
      // This approximates glassy transmission without needing full PBR transmission plumbing.
      const strength = this.refractionStrengthUniform;

      // Incident vector from camera to fragment
      const I = positionWorld.sub(cameraPosition).normalize();

      const ior = this.iorUniform;
      const disp = this.dispersionUniform;

      // refract(I, N, eta), eta = 1/ior
      const etaR = float(1.0).div(ior.add(disp));
      const etaG = float(1.0).div(ior);
      const etaB = float(1.0).div(max(ior.sub(disp), float(1.01)));

      const rVec = refract(I, radialNormal, etaR);
      const gVec = refract(I, radialNormal, etaG);
      const bVec = refract(I, radialNormal, etaB);

      const invRes = vec2(float(1.0).div(this.refractionResolutionUniform.x), float(1.0).div(this.refractionResolutionUniform.y));
      const uvR = screenUV.add(rVec.xy.mul(strength).mul(invRes));
      const uvG = screenUV.add(gVec.xy.mul(strength).mul(invRes));
      const uvB = screenUV.add(bVec.xy.mul(strength).mul(invRes));

      const sR = texture(this.refractionTexture, uvR);
      const sG = texture(this.refractionTexture, uvG);
      const sB = texture(this.refractionTexture, uvB);
      const refracted = vec3(sR.r, sG.g, sB.b);

      // Specular-ish rim highlight (cheap, but sells "wet glass")
      const spec = rim.pow(float(2.2)).mul(float(0.6));
      const rimCol = vec3(float(0.35), float(0.55), float(1.0)).mul(spec);

      // Blend: refracted background + internal biolume color
      const glassy = refracted.mul(float(0.9)).add(finalColor.mul(float(0.75))).add(rimCol);

      // Ramp-on so tiny values don't cause shimmering (also avoids branching nodes).
      // Here `strength` is interpreted in *pixels* (we divide by resolution earlier).
      const refMix = clamp(strength.div(float(20.0)), float(0.0), float(1.0));
      return mix(finalColor, glassy, refMix);
    });

    // Set the color node
    this.colorNode = bulbColorNode();

    // Restore procedural alpha for bioluminescent translucency
    const alphaNode = Fn(() => {
      // Accumulate saturation for alpha (same as color)
      const uv0: any = uv();
      const t = this.timeUniform;

      // @ts-ignore - TSL function call
      const sc0 = oscillate(float(8.0), float(15.0), t.mul(0.25).add(0.5))
        .mul(this.patternScale0Uniform);
      // @ts-ignore - TSL function call
      const sc1 = oscillate(float(12.0), float(20.0), t.mul(0.125))
        .mul(this.patternScale1Uniform);

      let sat: any = float(0.0);
      // @ts-ignore - TSL function call
      sat = sat.add(max(accumulate(uv0, float(2.0), sc0), float(-0.5)));
      // Alpha follows original GLSL formula: (1.0 - smoothstep(-0.5, 2.5, saturation)) * opacity
      const alphaFactor = float(1.0).sub(smoothstep(float(-0.5), float(2.5), sat));
      return alphaFactor.mul(this.opacityUniform);
    });

    this.opacityNode = alphaNode();
    // With refraction we want proper alpha blending, not additive blow-out.
    this.transparent = true;
    this.blending = THREE.NormalBlending;
    this.side = THREE.DoubleSide;
    this.depthWrite = true;
  }

  /**
   * Update the time uniform for animation
   */
  setTime(time: number): void {
    (this.timeUniform as unknown as { value: number }).value = time;
  }

  /**
   * Get current time value
   */
  getTime(): number {
    return (this.timeUniform as unknown as { value: number }).value;
  }

  /**
   * Update diffuse color
   */
  setDiffuse(col: THREE.Color | number): void {
    if (col instanceof THREE.Color) {
      (this.diffuseUniform as unknown as { value: THREE.Color }).value = col;
    } else {
      (this.diffuseUniform as unknown as { value: THREE.Color }).value = new THREE.Color(col);
    }
  }

  /**
   * Update secondary diffuse color
   */
  setDiffuseB(col: THREE.Color | number): void {
    if (col instanceof THREE.Color) {
      (this.diffuseBUniform as unknown as { value: THREE.Color }).value = col;
    } else {
      (this.diffuseBUniform as unknown as { value: THREE.Color }).value = new THREE.Color(col);
    }
  }

  /**
   * Update opacity
   */
  setOpacity(opacity: number): void {
    (this.opacityUniform as unknown as { value: number }).value = opacity;
  }

  /**
   * Update the primary pattern scale multiplier
   */
  setPatternScale0(scale: number): void {
    (this.patternScale0Uniform as unknown as { value: number }).value = scale;
  }

  /**
   * Update the secondary pattern scale multiplier
   */
  setPatternScale1(scale: number): void {
    (this.patternScale1Uniform as unknown as { value: number }).value = scale;
  }

  /**
   * Update rim boost multiplier (controls UV rim offset strength)
   */
  setRimBoost(value: number): void {
    (this.rimBoostUniform as unknown as { value: number }).value = value;
  }

  setIor(value: number): void {
    (this.iorUniform as unknown as { value: number }).value = Math.max(1.01, value);
  }

  setDispersion(value: number): void {
    (this.dispersionUniform as unknown as { value: number }).value = Math.max(0.0, value);
  }

  setRefractionStrength(value: number): void {
    (this.refractionStrengthUniform as unknown as { value: number }).value = Math.max(0.0, value);
  }

  setRefractionResolution(width: number, height: number): void {
    (this.refractionResolutionUniform as unknown as { value: { x: number; y: number } }).value = {
      x: Math.max(1, width),
      y: Math.max(1, height),
    };
  }

  setRefractionTexture(texture: THREE.Texture): void {
    this.refractionTexture = texture;
  }
}

export default BulbNodeMaterial;
