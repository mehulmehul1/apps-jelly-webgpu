/**
 * InterpolationSystem.ts
 * 
 * Fixed timestep physics interpolation system that bridges 30fps physics
 * updates to smooth 60fps+ rendering. Based on the accumulator pattern
 * from the original Looper.js implementation.
 * 
 * Physics runs at fixed 30fps (33.33ms timestep) while rendering can
 * run at any framerate. This system interpolates between physics states
 * for smooth visual motion.
 */

export interface InterpolationSystemConfig {
  /** Physics timestep in milliseconds (default: 33.33ms for 30fps) */
  timestep?: number;
}

export interface PhysicsTickCallback {
  (deltaTime: number): void;
}

export class InterpolationSystem {
  private accumulator: number = 0;
  private readonly timestep: number; // 33.33ms for 30fps physics
  private isRunning: boolean = false;
  private currentStepProgress: number = 0;
  
  // Statistics for debugging
  private physicsTicksThisFrame: number = 0;
  private totalPhysicsTicks: number = 0;

  constructor(config: InterpolationSystemConfig = {}) {
    this.timestep = config.timestep ?? (1000 / 30); // Default 30fps
    this.reset();
  }

  /**
   * Reset the interpolation system
   */
  reset(): void {
    this.accumulator = 0;
    this.isRunning = false;
    this.physicsTicksThisFrame = 0;
    this.totalPhysicsTicks = 0;
    this.currentStepProgress = 0;
  }

  /**
   * Start the interpolation system
   */
  start(): void {
    this.reset();
    this.isRunning = true;
  }

  /**
   * Stop the interpolation system
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Update the interpolation system
   * 
   * This method should be called every frame. It accumulates time and
   * runs physics ticks at fixed intervals. Returns the interpolation
   * factor (0.0 to 1.0) for smooth rendering between physics states.
   * 
   * @param deltaTime - Time elapsed since last frame in milliseconds
   * @param physicsCallback - Function to call for each physics tick
   * @returns Interpolation factor between 0.0 and 1.0
   */
  update(deltaTime: number, physicsCallback: PhysicsTickCallback): number {
    if (!this.isRunning) {
      this.start();
    }

    // Clamp delta to prevent spiral of death on lag spikes
    const clampedDelta = Math.min(deltaTime, 100); // Max 100ms to prevent huge jumps

    // Accumulate time
    this.accumulator += clampedDelta;
    this.physicsTicksThisFrame = 0;

    // Run physics steps at fixed timestep
    while (this.accumulator >= this.timestep) {
      // Run physics with fixed timestep
      physicsCallback(this.timestep);

      this.accumulator -= this.timestep;
      this.physicsTicksThisFrame++;
      this.totalPhysicsTicks++;
    }

    // Calculate and store interpolation factor (0.0 to 1.0)
    // This represents how far we are between the previous and current physics state
    this.currentStepProgress = this.accumulator / this.timestep;
    return this.currentStepProgress;
  }

  /**
   * Get the current interpolation step progress
   * @returns Interpolation factor from 0.0 (previous) to 1.0 (current)
   */
  getStepProgress(): number {
    return this.currentStepProgress;
  }

  /**
   * Get the fixed timestep in milliseconds
   */
  getTimestep(): number {
    return this.timestep;
  }

  /**
   * Get the physics frame rate
   */
  getPhysicsFPS(): number {
    return 1000 / this.timestep;
  }

  /**
   * Get the number of physics ticks processed in the last frame
   */
  getPhysicsTicksThisFrame(): number {
    return this.physicsTicksThisFrame;
  }

  /**
   * Get the total number of physics ticks processed
   */
  getTotalPhysicsTicks(): number {
    return this.totalPhysicsTicks;
  }

  /**
   * Check if the system is currently running
   */
  isSystemRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get debug info about the interpolation state
   */
  getDebugInfo(): {
    accumulator: number;
    timestep: number;
    interpolationFactor: number;
    physicsTicksThisFrame: number;
    totalPhysicsTicks: number;
    isRunning: boolean;
  } {
    return {
      accumulator: this.accumulator,
      timestep: this.timestep,
      interpolationFactor: this.currentStepProgress,
      physicsTicksThisFrame: this.physicsTicksThisFrame,
      totalPhysicsTicks: this.totalPhysicsTicks,
      isRunning: this.isRunning
    };
  }
}

export default InterpolationSystem;
