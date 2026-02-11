import * as THREE from 'three/webgpu';
import { WebGLRenderer } from 'three';

/**
 * Renderer type - can be WebGPU or WebGL
 */
export type RendererType = THREE.WebGPURenderer | WebGLRenderer;

/**
 * JellyfishRenderer - WebGPU renderer with WebGL fallback
 * 
 * Handles initialization and configuration of the Three.js renderer
 * with WebGPU support, falling back to WebGL2 if not available.
 */
export class JellyfishRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: RendererType | null = null;
  private isWebGPU: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * Initialize the renderer
   * Checks for WebGPU support and falls back to WebGL2 if needed
   * @returns Promise<boolean> true if initialization succeeded
   */
  public async init(): Promise<boolean> {
    // Check for WebGPU support
    if (navigator.gpu) {
      try {
        this.renderer = new THREE.WebGPURenderer({
          canvas: this.canvas,
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          alpha: true,
        });

        await (this.renderer as THREE.WebGPURenderer).init();
        this.isWebGPU = true;
        console.log('WebGPU renderer initialized');
      } catch (error) {
        console.warn('WebGPU initialization failed, falling back to WebGL:', error);
        this.renderer = null;
      }
    }

    // Fall back to WebGL2 if WebGPU is not available or failed
    let renderer: RendererType;
    if (!this.renderer) {
      renderer = new WebGLRenderer({
        canvas: this.canvas,
        antialias: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
        alpha: true,
      });
      this.renderer = renderer;
      this.isWebGPU = false;
      console.log('WebGL2 renderer initialized');
    } else {
      renderer = this.renderer;
    }

    // Configure renderer
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = true;
    renderer.sortObjects = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Filmic tonemapping helps keep additive/emissive work in a controllable range.
    // This is important once we introduce bloom + refraction/dispersion.
    (renderer as any).toneMapping = THREE.ACESFilmicToneMapping;
    (renderer as any).toneMappingExposure = 1.0;

    return true;
  }

  /**
   * Get the underlying Three.js renderer
   */
  public getRenderer(): RendererType {
    if (!this.renderer) {
      throw new Error('Renderer not initialized. Call init() first.');
    }
    return this.renderer;
  }

  /**
   * Check if using WebGPU
   */
  public getIsWebGPU(): boolean {
    return this.isWebGPU;
  }

  /**
   * Set the renderer size
   */
  public setSize(width: number, height: number): void {
    if (!this.renderer) {
      throw new Error('Renderer not initialized. Call init() first.');
    }
    this.renderer.setSize(width, height);
  }

  /**
   * Render a scene with a camera
   */
  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.renderer) {
      throw new Error('Renderer not initialized. Call init() first.');
    }
    this.renderer.render(scene, camera);
  }

  /**
   * Dispose of the renderer
   */
  public dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}

export default JellyfishRenderer;
