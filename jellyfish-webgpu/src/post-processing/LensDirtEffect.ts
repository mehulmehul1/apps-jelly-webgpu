import * as THREE from 'three/webgpu';
import {
  Fn,
  float,
  vec4,
  texture,
  attribute,
  uniform,
  uv
} from 'three/tsl';
import { createLensDirtTexture, LensDirtTextureConfig } from './LensDirtTexture';

/**
 * Lens Dirt Effect
 *
 * Renders animated lens dirt particles that spawn on interaction and fade out over time.
 * Uses instanced quads with a texture atlas for variety.
 *
 * Based on the original LensDirtPass.js from the WebGL implementation.
 */

export interface LensDirtConfig {
  /** Maximum number of dirt particles (default: 200) */
  maxQuads?: number;
  /** Texture configuration */
  textureConfig?: LensDirtTextureConfig;
  /** Base opacity for particles (default: 0.5) */
  opacity?: number;
  /** Fade rate per frame - multiply alpha by this (default: 0.995) */
  fadeRate?: number;
  /** Spread radius for particle spawn (default: 0.5) */
  spawnSpread?: number;
  /** Maximum scale for particles (default: 0.15) */
  maxScale?: number;
}

/**
 * LensDirtEffect renders animated lens dirt particles in screen space.
 *
 * Features:
 * - Spawns particles at screen positions on interaction
 * - Each particle has random rotation, scale, and texture variation
 * - Smooth fade-out animation (0.5% per frame by default)
 * - Uses instanced rendering for performance
 */
export class LensDirtEffect {
  private maxQuads: number;
  private opacity: number;
  private fadeRate: number;
  private spawnSpread: number;
  private maxScale: number;

  // Three.js objects
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshBasicNodeMaterial;
  private texture: THREE.CanvasTexture;

  // Instance data
  private alphas: Float32Array;
  private currentIndex: number;
  private scaleFactor: number;

  // Uniform nodes
  private opacityUniform: any;

  /**
   * Create a new lens dirt effect
   */
  constructor(config: LensDirtConfig = {}) {
    this.maxQuads = config.maxQuads ?? 200;
    this.opacity = config.opacity ?? 0.5;
    this.fadeRate = config.fadeRate ?? 0.995;
    this.spawnSpread = config.spawnSpread ?? 0.5;
    this.maxScale = config.maxScale ?? 0.15;

    this.currentIndex = 0;
    this.scaleFactor = 1;

    // Create texture atlas
    this.texture = createLensDirtTexture(config.textureConfig);

    // Create uniforms
    this.opacityUniform = uniform(float(this.opacity));

    // Create geometry and material
    this.geometry = this.createQuadGeometry();
    this.material = this.createMaterial();

    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);

    // Create scene and camera
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Initialize alpha array
    this.alphas = new Float32Array(this.maxQuads);
    this.alphas.fill(0);

    // Initialize all alphas to 0 (hidden)
    this.updateAllAlphas();
  }

  /**
   * Create the quad geometry with per-vertex attributes
   */
  private createQuadGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // Position attribute (4 vertices per quad)
    const positions = new Float32Array(this.maxQuads * 4 * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // UV attribute - maps to texture atlas cells
    const uvs = this.createUVAttribute();
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // Alpha attribute (1 per vertex)
    const alphas = new Float32Array(this.maxQuads * 4);
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    // Index buffer
    const indices = this.createIndexBuffer();
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // Add empty normals to suppress TSL warnings
    const normals = new Float32Array(this.maxQuads * 4 * 3);
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    return geometry;
  }

  /**
   * Create UV coordinates for texture atlas
   */
  private createUVAttribute(): Float32Array {
    const uvs = new Float32Array(this.maxQuads * 4 * 2);
    const cells = 10; // 10x10 atlas
    const step = 1 / cells;
    let row = 0;
    let col = 0;

    for (let i = 0; i < this.maxQuads; i++) {
      const qi = i * 8;

      // Quad vertices: a, b, c, d
      // a: bottom-left, b: bottom-right, c: top-right, d: top-left
      uvs[qi] = step * col;       // au
      uvs[qi + 1] = step * row;   // av
      uvs[qi + 2] = step * (col + 1); // bu
      uvs[qi + 3] = step * row;   // bv
      uvs[qi + 4] = step * (col + 1); // cu
      uvs[qi + 5] = step * (row + 1); // cv
      uvs[qi + 6] = step * col;   // du
      uvs[qi + 7] = step * (row + 1); // dv

      if (++col === cells) {
        col = 0;
        if (++row === cells) {
          row = 0;
        }
      }
    }

    return uvs;
  }

  /**
   * Create index buffer for quad triangles
   */
  private createIndexBuffer(): Uint16Array {
    const indices = new Uint16Array(this.maxQuads * 6);

    for (let i = 0; i < this.maxQuads; i++) {
      const qi = i * 4;
      const ii = i * 6;

      // Two triangles per quad: a-b-c and c-d-a
      indices[ii] = qi;
      indices[ii + 1] = qi + 1;
      indices[ii + 2] = qi + 2;
      indices[ii + 3] = qi + 2;
      indices[ii + 4] = qi + 3;
      indices[ii + 5] = qi;
    }

    return indices;
  }

  /**
   * Create the TSL material for lens dirt
   */
  private createMaterial(): THREE.MeshBasicNodeMaterial {
    const material = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });

    material.colorNode = Fn(() => {
      const alphaAttr = attribute('alpha', 'float');
      const texColor = texture(this.texture, uv());
      const finalAlpha = texColor.a.mul(alphaAttr).mul(this.opacityUniform);

      // Discard very low alpha fragments to prevent "white splats" where texture is empty
      finalAlpha.lessThan(float(0.01)).discard();

      return vec4(texColor.rgb, finalAlpha);
    })();

    return material;
  }

  /**
   * Get the scene for TSL pass integration
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get the camera for TSL pass integration
   */
  public getCamera(): THREE.OrthographicCamera {
    return this.camera;
  }

  /**
   * Set the size/aspect ratio of the effect
   *
   * @param width Viewport width
   * @param height Viewport height
   */
  public setSize(width: number, height: number): void {
    let w: number, h: number, s: number;

    if (width > height) {
      w = 1;
      h = height / width;
      s = h;
    } else {
      w = width / height;
      h = 1;
      s = w;
    }

    this.camera.left = -w;
    this.camera.right = w;
    this.camera.top = h;
    this.camera.bottom = -h;
    this.scaleFactor = s;

    this.camera.updateProjectionMatrix();
  }

  /**
   * Spawn a group of lens dirt particles at a screen position
   *
   * @param x Screen X coordinate (-1 to 1)
   * @param y Screen Y coordinate (-1 to 1)
   * @param count Number of particles to spawn
   */
  public spawn(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = this.currentIndex % this.maxQuads;

      // Random position near click point
      const offsetX = (Math.random() - 0.5) * this.spawnSpread;
      const offsetY = (Math.random() - 0.5) * this.spawnSpread;

      // Random rotation and scale
      const rotation = Math.random() * Math.PI * 2;
      const scale = Math.random() * this.maxScale;

      // Set quad transform
      this.setQuadTransform(idx, x + offsetX, y + offsetY, rotation, scale);

      // Reset alpha to full
      this.alphas[idx] = 1.0;

      this.currentIndex++;
    }

    // Mark alpha attribute for update
    const alphaAttr = this.geometry.attributes.alpha;
    alphaAttr.needsUpdate = true;
  }

  /**
   * Update a quad's position, rotation, and scale
   */
  private setQuadTransform(
    index: number,
    x: number,
    y: number,
    rotation: number,
    scale: number
  ): void {
    const position = this.geometry.attributes.position;
    const ai = index * 4;
    const bi = ai + 1;
    const ci = ai + 2;
    const di = ai + 3;

    // Calculate scaled dimensions
    const s = scale * this.scaleFactor;

    // Pre-calculate rotation
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // Base quad corners (-1, -1) to (1, 1)
    const corners = [
      { x: -1, y: -1 }, // a: bottom-left
      { x: 1, y: -1 },  // b: bottom-right
      { x: 1, y: 1 },   // c: top-right
      { x: -1, y: 1 },  // d: top-left
    ];

    // Transform each corner
    const transformCorner = (cx: number, cy: number) => {
      // Scale
      const sx = cx * s;
      const sy = cy * s;

      // Rotate
      const rx = sx * cos - sy * sin;
      const ry = sx * sin + sy * cos;

      // Translate
      return { x: rx + x, y: ry + y, z: 0 };
    };

    const a = transformCorner(corners[0].x, corners[0].y);
    const b = transformCorner(corners[1].x, corners[1].y);
    const c = transformCorner(corners[2].x, corners[2].y);
    const d = transformCorner(corners[3].x, corners[3].y);

    // Update positions
    position.setXYZ(ai, a.x, a.y, a.z);
    position.setXYZ(bi, b.x, b.y, b.z);
    position.setXYZ(ci, c.x, c.y, c.z);
    position.setXYZ(di, d.x, d.y, d.z);

    position.needsUpdate = true;
  }

  /**
   * Update all alphas at once
   */
  private updateAllAlphas(): void {
    const alphaAttr = this.geometry.attributes.alpha;
    const array = alphaAttr.array as Float32Array;

    for (let i = 0; i < this.maxQuads; i++) {
      const alpha = this.alphas[i];
      const ai = i * 4;
      array[ai] = alpha;
      array[ai + 1] = alpha;
      array[ai + 2] = alpha;
      array[ai + 3] = alpha;
    }

    alphaAttr.needsUpdate = true;
  }

  /**
   * Update fade animation
   *
   * Call this once per frame
   */
  public update(_delta: number): void {
    let needsUpdate = false;

    // Fade all alphas
    for (let i = 0; i < this.maxQuads; i++) {
      if (this.alphas[i] > 0) {
        this.alphas[i] *= this.fadeRate;

        if (this.alphas[i] < 0.01) {
          this.alphas[i] = 0;
        }

        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.updateAllAlphas();
    }
  }

  /**
   * Render the lens dirt effect
   *
   * @param renderer The WebGL/WebGPU renderer
   * @param readBuffer The input texture (not used, renders on top)
   */
  public render(renderer: THREE.Renderer): void {
    renderer.render(this.scene, this.camera);
  }

  /**
   * Render to a specific target
   */
  public renderToTarget(
    renderer: THREE.Renderer,
    _target: THREE.RenderTarget | null,
    _clear: boolean
  ): void {
    renderer.render(this.scene, this.camera);
  }

  /**
   * Get the current number of active particles
   */
  public getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.maxQuads; i++) {
      if (this.alphas[i] > 0.01) {
        count++;
      }
    }
    return count;
  }

  /**
   * Update base opacity for all particles
   */
  public setOpacity(value: number): void {
    this.opacity = value;
    this.opacityUniform.value = value;
  }

  /**
   * Update fade rate per frame (0-1)
   */
  public setFadeRate(value: number): void {
    this.fadeRate = value;
  }

  /**
   * Update spawn spread radius
   */
  public setSpawnSpread(value: number): void {
    this.spawnSpread = value;
  }

  /**
   * Update maximum particle scale
   */
  public setMaxScale(value: number): void {
    this.maxScale = value;
  }

  /**
   * Clear all particles
   */
  public clear(): void {
    this.alphas.fill(0);
    this.updateAllAlphas();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}

export default LensDirtEffect;
