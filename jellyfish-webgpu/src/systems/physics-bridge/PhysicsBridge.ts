/**
 * PhysicsBridge.ts
 * 
 * Bridges the Particulate.js physics system with the WebGPU rendering system.
 * Manages dual position buffers for interpolation: previous and current physics
 * states. Handles GPU buffer updates and provides the interface between physics
 * and rendering.
 * 
 * This enables smooth 60fps+ rendering of 30fps physics by interpolating
 * between positionPrev and positionCurrent in the shader.
 */

import * as THREE from 'three/webgpu';

export interface PhysicsSystemInterface {
  /** Current particle positions (Float32Array) */
  positions: Float32Array;
  /** Particle count */
  particleCount: number;
}

export interface BufferAttributes {
  /** Current position attribute for GPU */
  positionCurrent: THREE.BufferAttribute;
  /** Previous position attribute for GPU */
  positionPrevious: THREE.BufferAttribute;
}

export class PhysicsBridge {
  private system: PhysicsSystemInterface;
  private attributes: BufferAttributes;
  
  // Cached arrays for buffer management
  private positionsCurrent: Float32Array;
  private positionsPrevious: Float32Array;

  constructor(
    system: PhysicsSystemInterface,
    _geometry: THREE.BufferGeometry,
    attributes: BufferAttributes
  ) {
    this.system = system;
    this.attributes = attributes;
    
    // Initialize position buffers
    this.positionsCurrent = new Float32Array(system.positions);
    this.positionsPrevious = new Float32Array(system.positions);
    
    // Initial buffer setup
    this.syncBuffersToPhysics();
  }

  /**
   * Prepare for physics tick by saving current state as previous
   * 
   * This should be called BEFORE each physics tick to save the
   * current positions as the 'previous' state for interpolation.
   */
  prepareForPhysicsTick(): void {
    // Copy current positions to previous
    this.positionsPrevious.set(this.positionsCurrent);
    
    // Update the previous position buffer attribute
    const prevAttr = this.attributes.positionPrevious;
    const prevArray = prevAttr.array as Float32Array;
    prevArray.set(this.positionsPrevious);
  }

  /**
   * Update after physics tick to sync new positions
   * 
   * This should be called AFTER each physics tick to update the
   * 'current' position buffer with the new physics state.
   */
  updateAfterPhysicsTick(): void {
    // Copy physics system positions to current
    this.positionsCurrent.set(this.system.positions);
    
    // Update the current position buffer attribute
    const currAttr = this.attributes.positionCurrent;
    const currArray = currAttr.array as Float32Array;
    currArray.set(this.positionsCurrent);
    
    // Mark both attributes for GPU update
    this.markBuffersForUpdate();
  }

  /**
   * Mark both position buffers for GPU update
   */
  markBuffersForUpdate(): void {
    this.attributes.positionCurrent.needsUpdate = true;
    this.attributes.positionPrevious.needsUpdate = true;
  }

  /**
   * Sync all buffers to current physics state
   * Used for initial setup or when resetting
   */
  syncBuffersToPhysics(): void {
    // Copy physics positions to both current and previous
    this.positionsCurrent.set(this.system.positions);
    this.positionsPrevious.set(this.system.positions);
    
    // Update both buffer attributes
    const currArray = this.attributes.positionCurrent.array as Float32Array;
    const prevArray = this.attributes.positionPrevious.array as Float32Array;
    
    currArray.set(this.positionsCurrent);
    prevArray.set(this.positionsPrevious);
    
    // Mark for GPU update
    this.markBuffersForUpdate();
  }

  /**
   * Get the current interpolation uniforms for a material
   * 
   * These uniforms should be updated each frame with the interpolation factor
   * calculated by the InterpolationSystem.
   */
  getInterpolationUniforms(): {
    positionPrevious: THREE.BufferAttribute;
    positionCurrent: THREE.BufferAttribute;
  } {
    return {
      positionPrevious: this.attributes.positionPrevious,
      positionCurrent: this.attributes.positionCurrent
    };
  }

  /**
   * Update the physics system reference (if system changes)
   */
  setPhysicsSystem(system: PhysicsSystemInterface): void {
    this.system = system;
    this.syncBuffersToPhysics();
  }

  /**
   * Get the particle count
   */
  getParticleCount(): number {
    return this.system.particleCount;
  }

  /**
   * Get the current positions array
   */
  getCurrentPositions(): Float32Array {
    return this.positionsCurrent;
  }

  /**
   * Get the previous positions array
   */
  getPreviousPositions(): Float32Array {
    return this.positionsPrevious;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Clean up Float32Arrays
    this.positionsCurrent = new Float32Array(0);
    this.positionsPrevious = new Float32Array(0);
  }
}

export default PhysicsBridge;
