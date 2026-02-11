import * as THREE from 'three/webgpu';
import {
  Fn,
  float,
  vec2,
  color,
  uniform,
  uv,
  sin,
  cos,
  mix,
  max,
  dot,
  normalize,
  positionLocal,
  positionWorld,
  cameraPosition,
  positionGeometry,
  attribute,
} from 'three/tsl';

export interface TailMaterialUniforms {
  diffuse: THREE.Color;
  diffuseB: THREE.Color;
  opacity: number;
  scale: number;
  stepProgress: number;
}

export class TailNodeMaterial extends THREE.MeshBasicNodeMaterial {
  declare uniforms: TailMaterialUniforms;

  protected diffuseUniform: any;
  protected diffuseBUniform: any;
  protected opacityUniform: any;
  protected scaleUniform: any;
  protected stepProgressUniform: any;

  constructor() {
    super({
      transparent: true,
      // Additive + bloom clips hard. Use normal alpha blending and let bloom come from true emissive areas.
      blending: THREE.NormalBlending,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Original Medusae.js values: tail.diffuse = 0xE4BBEE, tail.diffuseB = 0x241138, opacity = 0.75, scale = 20
    this.diffuseUniform = uniform(color(0xE4BBEE)); // Light purple-pink
    this.diffuseBUniform = uniform(color(0x241138)); // Dark purple
    this.opacityUniform = uniform(float(0.75));
    this.scaleUniform = uniform(float(20.0));
    this.stepProgressUniform = uniform(float(0));

    this.uniforms = {
      diffuse: this.diffuseUniform.value,
      diffuseB: this.diffuseBUniform.value,
      opacity: 0.6,
      scale: 20.0,
      stepProgress: 0,
    };

    const accumulateTail = Fn(([uvCoord, saturation, scale]) => {
      const s = saturation.toVar();

      s.subAssign(
        sin(uvCoord.y.mul(12.0).mul(scale)).mul(0.8)
          .add(uvCoord.y.mul(1.5))
          .add(sin(uvCoord.x.mul(20.0).mul(scale)).mul(0.1))
          .add(0.85)
      );

      s.subAssign(
        sin(
          uvCoord.y.mul(
            sin(uvCoord.x.mul(5.0)).mul(5.0).mul(scale)
          )
        ).mul(0.05)
      );

      s.subAssign(
        sin(
          uvCoord.y.mul(
            sin(float(1).sub(uvCoord.x).mul(5.0)).mul(5.0).mul(scale)
          )
        ).mul(0.05)
      );

      s.subAssign(
        sin(
          uvCoord.y.mul(
            uvCoord.y.add(cos(uvCoord.x).mul(2.0))
          ).mul(10.0).mul(scale)
        ).mul(0.15)
      );

      s.subAssign(
        sin(
          uvCoord.y.mul(
            uvCoord.y.add(cos(float(1).sub(uvCoord.x)).mul(2.0))
          ).mul(10.0).mul(scale)
        ).mul(0.15)
      );

      return s;
    });

    // Position interpolation
    this.positionNode = Fn(() => {
      const posPrev = attribute('positionPrev', 'vec3');
      const posCurr = positionGeometry;
      return mix(posPrev, posCurr, this.stepProgressUniform);
    })();

    // Color node with rim lighting and saturation
    // Original tail-frag.glsl uses radial normal: vNormal = normalize(position)
    this.colorNode = Fn(() => {
      const eyeDir = cameraPosition.sub(positionWorld).normalize();
      const radialNormal = normalize(positionLocal);
      const nDotV = max(dot(eyeDir, radialNormal), float(0));
      const rim = float(1).sub(nDotV);

      const uvCoord = uv();

      let saturation: any = float(0);
      // @ts-ignore - TSL function call
      saturation = saturation.add(accumulateTail(uvCoord, float(2), this.scaleUniform));
      // @ts-ignore - TSL function call
      saturation = saturation.add(
        accumulateTail(vec2(rim, float(0)), float(0.75), this.scaleUniform.mul(0.25))
          .max(float(-0.25))
      );

      // Original tail-frag.glsl: finalColor = mix(...) * opacity
      const mixedColor = mix(
        this.diffuseBUniform,
        this.diffuseUniform,
        saturation
      );
      
      // Multiply by opacity as per original shader
      const finalColor = mixedColor.mul(this.opacityUniform);

      return finalColor;
    })();

    // Alpha node
    this.opacityNode = Fn(() => {
      const uvCoord = uv();
      // @ts-ignore - TSL function call
      const saturation = accumulateTail(uvCoord, float(2), this.scaleUniform);
      const alpha = saturation.clamp(float(0.2), float(1)).mul(this.opacityUniform);

      return alpha;
    })();
  }

  updateStepProgress(progress: number): void {
    (this as any).stepProgressUniform.value = progress;
    this.uniforms.stepProgress = progress;
  }

  updateOpacity(opacity: number): void {
    (this as any).opacityUniform.value = opacity;
    this.uniforms.opacity = opacity;
  }

  setDiffuse(colorHex: number): void {
    (this as any).diffuseUniform.value.setHex(colorHex);
    this.uniforms.diffuse.setHex(colorHex);
  }

  setDiffuseB(colorHex: number): void {
    (this as any).diffuseBUniform.value.setHex(colorHex);
    this.uniforms.diffuseB.setHex(colorHex);
  }

  setScale(scale: number): void {
    (this as any).scaleUniform.value = scale;
    this.uniforms.scale = scale;
  }
}

export default TailNodeMaterial;
