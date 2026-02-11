/**
 * InterpolatedNodeMaterial.ts
 *
 * Base material class for smooth physics interpolation in TSL (Three.js Shading Language).
 * Provides interpolated position mixing between previous and current physics frames,
 * enabling smooth 60fps+ rendering of 30fps physics.
 *
 * This is the foundation for all jellyfish materials (Bulb, Tentacle, Tail, Gel).
 */

import * as THREE from 'three/webgpu';
import {
  mix,
  uniform,
  attribute
} from 'three/tsl';

/**
 * Base interface for all interpolated materials
 */
export interface InterpolatedMaterial {
  /**
   * Update the interpolation step progress (0.0 to 1.0)
   * Called each frame by the InterpolationSystem
   */
  setStepProgress(progress: number): void;

  /**
   * Get the current interpolation value
   */
  getStepProgress(): number;
}

/**
 * Base material class with position interpolation for meshes
 * Extends MeshBasicNodeMaterial as the simplest base
 */
export class InterpolatedNodeMaterial extends THREE.MeshBasicNodeMaterial implements InterpolatedMaterial {
  /**
   * Uniform node controlling the interpolation factor
   * 0.0 = fully at previous physics position
   * 1.0 = fully at current physics position
   */
  protected stepProgressUniform: ReturnType<typeof uniform>;

  constructor(parameters: THREE.MeshBasicNodeMaterialParameters = {}) {
    super(parameters);

    // Create a TSL uniform node for the interpolation factor
    // uniform() creates a node with a .value property for JS-side updates
    this.stepProgressUniform = uniform(0.0);

    // Set up TSL position node for interpolation
    this.positionNode = this.createInterpolatedPositionNode();
  }

  /**
   * Creates the TSL position node that interpolates between previous and current positions
   */
  protected createInterpolatedPositionNode() {
    // Use TSL attribute() to access custom geometry attributes
    const prevPosition = attribute('positionPrev', 'vec3');
    const currPosition = attribute('position', 'vec3');

    // Mix between previous and current based on interpolation factor
    return mix(prevPosition, currPosition, this.stepProgressUniform);
  }

  /**
   * Update the interpolation step progress
   * @param progress - Interpolation factor from 0.0 (previous) to 1.0 (current)
   */
  setStepProgress(progress: number): void {
    // Clamp to valid range [0, 1]
    const clamped = Math.max(0, Math.min(1, progress));
    // Update the uniform value (this is the TSL pattern)
    (this.stepProgressUniform as unknown as { value: number }).value = clamped;
  }

  /**
   * Get the current interpolation progress value
   */
  getStepProgress(): number {
    return (this.stepProgressUniform as unknown as { value: number }).value;
  }
}

/**
 * Extended interpolated material for PBR rendering
 * Extends MeshStandardNodeMaterial for standard PBR with interpolation
 */
export class InterpolatedStandardMaterial extends THREE.MeshStandardNodeMaterial implements InterpolatedMaterial {
  protected stepProgressUniform: ReturnType<typeof uniform>;

  constructor(parameters: THREE.MeshStandardNodeMaterialParameters = {}) {
    super(parameters);

    this.stepProgressUniform = uniform(0.0);
    this.positionNode = this.createInterpolatedPositionNode();
  }

  protected createInterpolatedPositionNode() {
    const prevPosition = attribute('positionPrev', 'vec3');
    const currPosition = attribute('position', 'vec3');
    return mix(prevPosition, currPosition, this.stepProgressUniform);
  }

  setStepProgress(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    (this.stepProgressUniform as unknown as { value: number }).value = clamped;
  }

  getStepProgress(): number {
    return (this.stepProgressUniform as unknown as { value: number }).value;
  }
}

/**
 * Extended interpolated material for advanced PBR
 * Extends MeshPhysicalNodeMaterial for physical-based rendering with interpolation
 * Use this for the Bulb material with subsurface scattering, transmission, etc.
 */
export class InterpolatedPhysicalMaterial extends THREE.MeshPhysicalNodeMaterial implements InterpolatedMaterial {
  protected stepProgressUniform: ReturnType<typeof uniform>;

  constructor(parameters: THREE.MeshPhysicalNodeMaterialParameters = {}) {
    super(parameters);

    this.stepProgressUniform = uniform(0.0);
    this.positionNode = this.createInterpolatedPositionNode();
  }

  protected createInterpolatedPositionNode() {
    const prevPosition = attribute('positionPrev', 'vec3');
    const currPosition = attribute('position', 'vec3');
    return mix(prevPosition, currPosition, this.stepProgressUniform);
  }

  setStepProgress(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    (this.stepProgressUniform as unknown as { value: number }).value = clamped;
  }

  getStepProgress(): number {
    return (this.stepProgressUniform as unknown as { value: number }).value;
  }
}

/**
 * Line material with position interpolation
 * For rendering tentacles and constraint lines
 */
export class InterpolatedLineMaterial extends THREE.LineBasicNodeMaterial implements InterpolatedMaterial {
  protected stepProgressUniform: ReturnType<typeof uniform>;

  constructor(parameters: THREE.LineBasicNodeMaterialParameters = {}) {
    super(parameters);

    this.stepProgressUniform = uniform(0.0);
    this.positionNode = this.createInterpolatedPositionNode();
  }

  protected createInterpolatedPositionNode() {
    const prevPosition = attribute('positionPrev', 'vec3');
    const currPosition = attribute('position', 'vec3');
    return mix(prevPosition, currPosition, this.stepProgressUniform);
  }

  setStepProgress(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    (this.stepProgressUniform as unknown as { value: number }).value = clamped;
  }

  getStepProgress(): number {
    return (this.stepProgressUniform as unknown as { value: number }).value;
  }
}

/**
 * Points material with position interpolation
 * For rendering dust particles
 */
export class InterpolatedPointsMaterial extends THREE.PointsNodeMaterial implements InterpolatedMaterial {
  protected stepProgressUniform: ReturnType<typeof uniform>;

  constructor(parameters: THREE.PointsNodeMaterialParameters = {}) {
    super(parameters);

    this.stepProgressUniform = uniform(0.0);
    this.positionNode = this.createInterpolatedPositionNode();
  }

  protected createInterpolatedPositionNode() {
    const prevPosition = attribute('positionPrev', 'vec3');
    const currPosition = attribute('position', 'vec3');
    return mix(prevPosition, currPosition, this.stepProgressUniform);
  }

  setStepProgress(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    (this.stepProgressUniform as unknown as { value: number }).value = clamped;
  }

  getStepProgress(): number {
    return (this.stepProgressUniform as unknown as { value: number }).value;
  }
}

export default InterpolatedNodeMaterial;
