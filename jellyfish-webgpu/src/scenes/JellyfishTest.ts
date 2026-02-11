import * as THREE from 'three/webgpu';
import { JellyfishRenderer } from '../jellyfish/JellyfishRenderer';
import { JellyfishSystem } from '../jellyfish/JellyfishSystem';
import { InterpolationSystem } from '../systems/physics-bridge';

/**
 * JellyfishTestScene - End-to-end integration test for the foundation components
 * 
 * Tests:
 * - WebGPU renderer initialization
 * - Physics interpolation at 30fps physics → 60fps render
 * - Jellyfish geometry generation (~2000 particles)
 * - Interpolated materials
 * - Basic animation and rendering
 */

export interface TestConfig {
  /** Enable wireframe mode for debugging */
  wireframe?: boolean;
  /** Show constraint lines */
  showConstraints?: boolean;
  /** Enable FPS counter */
  showFPS?: boolean;
  /** Enable step progress overlay */
  showStepProgress?: boolean;
  /** Enable auto-rotation for better viewing */
  autoRotate?: boolean;
  /** Camera distance from jellyfish */
  cameraDistance?: number;
}

/**
 * FPS Counter utility
 */
class FPSCounter {
  private element: HTMLElement;
  private frames = 0;
  private lastTime = performance.now();
  private fps = 0;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #00ff00;
      font-family: monospace;
      font-size: 14px;
      padding: 8px 12px;
      border-radius: 4px;
      z-index: 1000;
      pointer-events: none;
    `;
    document.body.appendChild(this.element);
    this.update(0);
  }

  update(_deltaTime: number): void {
    this.frames++;
    const now = performance.now();

    if (now - this.lastTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastTime = now;
      this.element.textContent = `FPS: ${this.fps}`;
    }
  }

  dispose(): void {
    this.element.remove();
  }
}

/**
 * Step progress overlay
 */
class StepProgressOverlay {
  private element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed;
      top: 40px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #00ffff;
      font-family: monospace;
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 4px;
      z-index: 1000;
      pointer-events: none;
      min-width: 150px;
    `;
    document.body.appendChild(this.element);
    this.update(0, 0, 0);
  }

  update(stepProgress: number, physicsFPS: number, particleCount: number): void {
    const bar = '█'.repeat(Math.round(stepProgress * 20)) + '░'.repeat(20 - Math.round(stepProgress * 20));
    this.element.innerHTML = `
      <div>Step: ${stepProgress.toFixed(3)} [${bar}]</div>
      <div>Physics: ${physicsFPS.toFixed(1)} Hz</div>
      <div>Particles: ${particleCount}</div>
    `;
  }

  dispose(): void {
    this.element.remove();
  }
}

/**
 * Main test scene class
 */
export class JellyfishTestScene {
  private canvas: HTMLCanvasElement;
  private renderer!: JellyfishRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private jellyfish!: JellyfishSystem;
  private interpolation!: InterpolationSystem;

  // Debug UI
  private fpsCounter?: FPSCounter;
  private stepOverlay?: StepProgressOverlay;

  // State
  private config: TestConfig;
  private isRunning = false;
  private physicsTimestep = 1000 / 30; // 30fps physics
  private lastFrameTime = performance.now();
  private physicsTickCount = 0;
  private lastPhysicsTime = performance.now();

  constructor(canvas: HTMLCanvasElement, config: TestConfig = {}) {
    this.canvas = canvas;
    this.config = {
      wireframe: true,
      showConstraints: true,
      showFPS: true,
      showStepProgress: true,
      autoRotate: true,
      cameraDistance: 120,
      ...config,
    };
  }

  /**
   * Initialize the test scene
   */
  async initialize(): Promise<void> {
    console.log('Initializing Jellyfish Test Scene...');

    // Initialize renderer
    this.renderer = new JellyfishRenderer(this.canvas);
    const success = await this.renderer.init();

    if (!success) {
      throw new Error('Failed to initialize renderer');
    }

    // Setup scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);

    // Setup camera
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, this.config.cameraDistance!);

    // Create interpolation system (30fps physics)
    this.interpolation = new InterpolationSystem({
      timestep: this.physicsTimestep,
    });

    // Create jellyfish with white wireframe material
    this.jellyfish = new JellyfishSystem({
      wireframe: this.config.wireframe,
      showConstraints: this.config.showConstraints,
    });

    // Add to scene
    this.scene.add(this.jellyfish.mesh);

    // Setup debug UI
    if (this.config.showFPS) {
      this.fpsCounter = new FPSCounter();
    }
    if (this.config.showStepProgress) {
      this.stepOverlay = new StepProgressOverlay();
    }

    // Add mouse interaction
    this.setupInteraction();

    // Handle resize
    window.addEventListener('resize', this.onResize.bind(this));

    console.log(`Test scene initialized:`);
    console.log(`  - Particles: ${this.jellyfish.particleCount}`);
    console.log(`  - Physics: 30fps (timestep: ${this.physicsTimestep.toFixed(2)}ms)`);
    console.log(`  - Renderer: ${this.renderer.getIsWebGPU() ? 'WebGPU' : 'WebGL'}`);
  }

  /**
   * Setup mouse interaction for nudging jellyfish
   */
  private setupInteraction(): void {
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;

      // Nudge on click
      this.nudgeFromMouse(e.clientX, e.clientY, 5);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;

        // Continuous nudge while dragging
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          this.nudgeFromMouse(e.clientX, e.clientY, 2);
        }

        lastX = e.clientX;
        lastY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * Nudge jellyfish based on mouse position
   */
  private nudgeFromMouse(mouseX: number, mouseY: number, magnitude: number): void {
    // Convert mouse position to normalized device coordinates
    const rect = this.canvas.getBoundingClientRect();
    const x = ((mouseX - rect.left) / rect.width) * 2 - 1;
    const y = -((mouseY - rect.top) / rect.height) * 2 + 1;

    // Project to world target
    const targetX = x * 60;
    const targetY = y * 60 + 20;

    // Create direction vector
    const direction = new THREE.Vector3(x, y, 0).normalize();

    // 1. Move anchor pins
    this.jellyfish.moveTo(targetX, targetY, 0);

    // 2. Apply nudge force
    this.jellyfish.nudge(direction, magnitude);

    console.log(`Moved to: (${targetX.toFixed(1)}, ${targetY.toFixed(1)}) and nudged`);
  }

  /**
   * Handle window resize
   */
  private onResize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Start the animation loop
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.lastPhysicsTime = performance.now();

    console.log('Starting animation loop...');
    this.animate();
  }

  /**
   * Stop the animation loop
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Main animation loop
   */
  private animate(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Clamp delta to prevent spiral of death
    const clampedDelta = Math.min(deltaTime, 100);

    // Update interpolation system
    const stepProgress = this.interpolation.update(clampedDelta, (physicsDelta) => {
      this.jellyfish.updatePhysics(physicsDelta);
      this.physicsTickCount++;
    });

    // Update material interpolation
    this.jellyfish.setStepProgress(stepProgress);

    // Auto-rotate for better viewing
    if (this.config.autoRotate) {
      this.jellyfish.mesh.rotation.y += 0.005;
    }

    // Render
    this.renderer.render(this.scene, this.camera);

    // Update debug UI
    this.updateDebugUI(currentTime);

    requestAnimationFrame(() => this.animate());
  }

  /**
   * Update debug UI elements
   */
  private updateDebugUI(currentTime: number): void {
    // Update FPS counter
    if (this.fpsCounter) {
      this.fpsCounter.update(0);
    }

    // Update step progress overlay
    if (this.stepOverlay) {
      // Calculate actual physics FPS
      const physicsElapsed = currentTime - this.lastPhysicsTime;
      let physicsFPS = 0;

      if (physicsElapsed >= 1000) {
        physicsFPS = (this.physicsTickCount / physicsElapsed) * 1000;
        this.physicsTickCount = 0;
        this.lastPhysicsTime = currentTime;
      }

      this.stepOverlay.update(
        this.interpolation.getStepProgress(),
        physicsFPS || 30,
        this.jellyfish.particleCount
      );
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stop();

    this.fpsCounter?.dispose();
    this.stepOverlay?.dispose();
    this.jellyfish?.dispose();
    this.renderer?.dispose();

    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

export default JellyfishTestScene;
