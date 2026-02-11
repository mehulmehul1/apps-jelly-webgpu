import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { LensDirtEffect, LensDirtConfig } from './LensDirtEffect';
import { VignetteEffect, VignetteConfig } from './VignetteNode';

/**
 * Bloom configuration parameters
 */
export interface BloomConfig {
  /** Bloom strength/intensity (default: 0.8) */
  strength: number;
  /** Bloom blur radius (default: 25) */
  radius: number;
  /** Brightness threshold (default: 0) */
  threshold: number;
}

/**
 * Post-processing configuration
 */
export interface PostProcessingConfig {
  /** Bloom settings */
  bloom?: Partial<BloomConfig>;
  /** Lens dirt settings */
  lensDirt?: LensDirtConfig;
  /** Vignette settings */
  vignette?: Partial<VignetteConfig>;
  /** Enable debug output */
  debug?: boolean;
}

/**
 * Default bloom configuration - subtle glow preserving internal structure
 */
const DEFAULT_BLOOM_CONFIG: BloomConfig = {
  strength: 0.2,
  radius: 0.4,
  threshold: 0.7,
};

/**
 * JellyfishPostProcessing - TSL Post-Processing Pipeline
 *
 * Implements the post-processing effect chain for the jellyfish scene:
 * - Scene pass (beauty render)
 * - Bloom effect (soft glow around bright areas)
 * - Lens dirt effect (particles on interaction)
 * - Vignette effect (edge darkening)
 *
 * Based on the original WebGL EffectComposer setup from MainScene.js
 */
export class JellyfishPostProcessing {
  private renderer: THREE.WebGPURenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private postProcessing: THREE.PostProcessing;
  private lensDirt: LensDirtEffect | null;
  private vignette: VignetteEffect | null;

  private bloomConfig: BloomConfig;

  /**
   * Create a new post-processing pipeline
   */
  constructor(
    renderer: THREE.WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    config: PostProcessingConfig = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Merge bloom config with defaults
    this.bloomConfig = {
      ...DEFAULT_BLOOM_CONFIG,
      ...config.bloom,
    };

    // Create lens dirt effect if configured
    this.lensDirt = config.lensDirt ? new LensDirtEffect(config.lensDirt) : null;

    // Create vignette effect (always enabled by default)
    this.vignette = new VignetteEffect(config.vignette);

    // Create the post-processing chain
    this.postProcessing = this.createPostProcessingChain();

    if (config.debug) {
      console.log('[PostProcessing] Initialized with config:', this.bloomConfig);
    }
  }

  /**
   * Get the lens dirt effect for spawning particles
   */
  public getLensDirt(): LensDirtEffect | null {
    return this.lensDirt;
  }

  /**
   * Get the vignette effect for runtime parameter updates
   */
  public getVignette(): VignetteEffect | null {
    return this.vignette;
  }

  /**
   * Create the post-processing node chain
   *
   * Effect order: Scene → Bloom → Screen
   */
  private createPostProcessingChain(): THREE.PostProcessing {
    const postProcessing = new THREE.PostProcessing(this.renderer);

    // 1. Scene pass - render the scene to a texture
    const scenePass = pass(this.scene, this.camera);
    const beautyTexture = scenePass.getTextureNode('output');

    // 2. Bloom effect - create soft glow around bright areas
    // @ts-ignore
    const bloomPass = bloom(
      beautyTexture,
      this.bloomConfig.strength,
      this.bloomConfig.radius,
      Math.max(0, this.bloomConfig.threshold)
    );

    // 3. Combine original beauty pass with bloom (additive)
    const withBloom = beautyTexture.add(bloomPass);

    // 4. Lens Dirt effect (as TSL pass) - BEFORE vignette per original
    // Original MainScene.js order: Scene → Bloom → LensDirt → Vignette
    let withLensDirt = withBloom;
    if (this.lensDirt) {
      const dirtPass = pass(this.lensDirt.getScene(), this.lensDirt.getCamera());
      const dirtTexture = dirtPass.getTextureNode('output');
      withLensDirt = withBloom.add(dirtTexture);
    }

    // 5. Vignette effect - darken edges (last in chain)
    const finalOutput = this.applyVignette(withLensDirt);

    // 6. Set final output
    postProcessing.outputNode = finalOutput;

    return postProcessing;
  }

  /**
   * Apply vignette effect
   *
   * @param input The input texture node
   * @returns The processed texture node with vignette applied
   */
  private applyVignette(input: any): any {
    if (!this.vignette) {
      return input;
    }
    return this.vignette.createNode(input);
  }

  /**
   * Render the scene with post-processing effects
   *
   * Call this instead of renderer.render(scene, camera)
   */
  public render(): void {
    // Render post-processing chain (scene + bloom + vignette + lens dirt)
    this.postProcessing.render();
  }

  /**
   * Update lens dirt animation
   *
   * Call this once per frame
   */
  public update(delta: number): void {
    if (this.lensDirt) {
      this.lensDirt.update(delta);
    }
  }

  /**
   * Handle resize events
   */
  public setSize(width: number, height: number): void {
    if (this.lensDirt) {
      this.lensDirt.setSize(width, height);
    }
  }

  /**
   * Update bloom parameters at runtime
   */
  public setBloomStrength(strength: number): void {
    this.bloomConfig.strength = strength;
    // Recreate the chain with new parameters
    this.postProcessing = this.createPostProcessingChain();
  }

  /**
   * Update bloom radius at runtime
   */
  public setBloomRadius(radius: number): void {
    this.bloomConfig.radius = radius;
    this.postProcessing = this.createPostProcessingChain();
  }

  /**
   * Update bloom threshold at runtime
   */
  public setBloomThreshold(threshold: number): void {
    this.bloomConfig.threshold = threshold;
    this.postProcessing = this.createPostProcessingChain();
  }

  /**
   * Get current bloom configuration
   */
  public getBloomConfig(): BloomConfig {
    return { ...this.bloomConfig };
  }

  /**
   * Dispose of post-processing resources
   */
  public dispose(): void {
    // PostProcessing doesn't have a dispose method in the current API
    // Resources are managed by the renderer

    if (this.lensDirt) {
      this.lensDirt.dispose();
    }
  }
}

export default JellyfishPostProcessing;
