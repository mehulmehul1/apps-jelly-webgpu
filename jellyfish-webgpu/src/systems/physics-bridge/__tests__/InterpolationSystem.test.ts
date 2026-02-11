/**
 * InterpolationSystem.test.ts
 * 
 * Unit tests for the InterpolationSystem class.
 * Verifies fixed timestep physics and interpolation calculations.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { InterpolationSystem, InterpolationSystemConfig } from '../InterpolationSystem';
import { PhysicsBridge, PhysicsSystemInterface, BufferAttributes } from '../PhysicsBridge';

// Mock BufferGeometry and BufferAttribute for testing
class MockBufferAttribute {
  array: Float32Array;
  needsUpdate: boolean = false;
  
  constructor(array: Float32Array) {
    this.array = array;
  }
}

class MockBufferGeometry {
  attributes: Map<string, MockBufferAttribute> = new Map();
}

// Mock physics system for testing
function createMockPhysicsSystem(particleCount: number = 100): PhysicsSystemInterface {
  const positions = new Float32Array(particleCount * 3);
  // Initialize with some values
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = i * 0.1;
    positions[i * 3 + 1] = i * 0.2;
    positions[i * 3 + 2] = i * 0.3;
  }
  
  return {
    positions,
    particleCount
  };
}

// Mock buffer attributes
function createMockBufferAttributes(particleCount: number): BufferAttributes {
  return {
    positionCurrent: new MockBufferAttribute(new Float32Array(particleCount * 3)) as any,
    positionPrevious: new MockBufferAttribute(new Float32Array(particleCount * 3)) as any
  };
}

describe('InterpolationSystem', () => {
  let interpolationSystem: InterpolationSystem;
  let physicsTickCount: number = 0;
  
  beforeEach(() => {
    interpolationSystem = new InterpolationSystem();
    physicsTickCount = 0;
  });

  test('should initialize with correct default timestep', () => {
    expect(interpolationSystem.getTimestep()).toBeCloseTo(33.333, 2);
    expect(interpolationSystem.getPhysicsFPS()).toBe(30);
  });

  test('should accept custom timestep configuration', () => {
    const customConfig: InterpolationSystemConfig = { timestep: 16.667 }; // 60fps
    const customSystem = new InterpolationSystem(customConfig);
    
    expect(customSystem.getTimestep()).toBeCloseTo(16.667, 2);
    expect(customSystem.getPhysicsFPS()).toBeCloseTo(60, 0);
  });

  test('should return interpolation factor between 0 and 1', () => {
    interpolationSystem.start();
    
    // Simulate a frame with 16ms delta (60fps)
    const factor = interpolationSystem.update(16, () => {
      physicsTickCount++;
    });
    
    expect(factor).toBeGreaterThanOrEqual(0);
    expect(factor).toBeLessThanOrEqual(1);
  });

  test('should accumulate time and run physics at fixed timestep', () => {
    interpolationSystem.start();
    
    // Simulate frames at 60fps (16.67ms each)
    // After ~100ms, should trigger ~3 physics ticks at 30fps
    for (let i = 0; i < 6; i++) {
      interpolationSystem.update(16.67, () => {
        physicsTickCount++;
      });
    }
    
    // Should have processed approximately 3 physics ticks for 100ms
    expect(physicsTickCount).toBeGreaterThanOrEqual(2);
    expect(physicsTickCount).toBeLessThanOrEqual(4);
  });

  test('should track physics ticks per frame', () => {
    interpolationSystem.start();
    
    // Run a large delta that triggers multiple physics ticks
    interpolationSystem.update(100, () => {
      physicsTickCount++;
    });
    
    // Should have processed approximately 3 physics ticks for 100ms
    const ticksThisFrame = interpolationSystem.getPhysicsTicksThisFrame();
    expect(ticksThisFrame).toBeGreaterThanOrEqual(2);
    expect(ticksThisFrame).toBeLessThanOrEqual(4);
  });

  test('should reset properly', () => {
    interpolationSystem.start();
    
    // Run some updates
    for (let i = 0; i < 5; i++) {
      interpolationSystem.update(16, () => {
        physicsTickCount++;
      });
    }
    
    // Reset
    interpolationSystem.reset();
    
    // Check that stats are reset
    expect(interpolationSystem.getTotalPhysicsTicks()).toBe(0);
    expect(interpolationSystem.getPhysicsTicksThisFrame()).toBe(0);
  });

  test('should provide debug info', () => {
    interpolationSystem.start();
    
    const debugInfo = interpolationSystem.getDebugInfo();
    
    expect(debugInfo).toHaveProperty('accumulator');
    expect(debugInfo).toHaveProperty('timestep');
    expect(debugInfo).toHaveProperty('interpolationFactor');
    expect(debugInfo).toHaveProperty('physicsTicksThisFrame');
    expect(debugInfo).toHaveProperty('totalPhysicsTicks');
    expect(debugInfo).toHaveProperty('isRunning');
    
    expect(debugInfo.timestep).toBe(interpolationSystem.getTimestep());
    expect(debugInfo.isRunning).toBe(true);
  });

  test('should auto-start on first update', () => {
    // Don't call start()
    expect(interpolationSystem.isSystemRunning()).toBe(false);
    
    // First update should auto-start
    interpolationSystem.update(16, () => {});
    
    expect(interpolationSystem.isSystemRunning()).toBe(true);
  });

  test('should clamp delta time to prevent spiral of death', () => {
    interpolationSystem.start();
    
    // Run an extremely large delta (would cause many physics ticks)
    interpolationSystem.update(1000, () => {
      physicsTickCount++;
    });
    
    // Should be limited by the 100ms clamp
    // 100ms / 33.33ms = ~3 physics ticks max
    expect(physicsTickCount).toBeLessThanOrEqual(4);
  });
});

describe('PhysicsBridge', () => {
  let physicsSystem: PhysicsSystemInterface;
  let attributes: BufferAttributes;
  let geometry: MockBufferGeometry;
  let bridge: PhysicsBridge;
  
  beforeEach(() => {
    physicsSystem = createMockPhysicsSystem(10);
    attributes = createMockBufferAttributes(10);
    geometry = new MockBufferGeometry();
    bridge = new PhysicsBridge(physicsSystem, geometry as any, attributes);
  });

  test('should initialize with correct particle count', () => {
    expect(bridge.getParticleCount()).toBe(10);
  });

  test('should prepare for physics tick by copying current to previous', () => {
    // Initial state: both should be equal to physics positions
    bridge.syncBuffersToPhysics();
    
    // Modify physics positions
    physicsSystem.positions[0] = 999;
    physicsSystem.positions[1] = 999;
    physicsSystem.positions[2] = 999;
    
    // Prepare for tick
    bridge.prepareForPhysicsTick();
    
    // Previous positions should now contain the old values
    const prevPositions = bridge.getPreviousPositions();
    expect(prevPositions[0]).not.toBe(999);
    expect(prevPositions[1]).not.toBe(999);
    expect(prevPositions[2]).not.toBe(999);
  });

  test('should update after physics tick', () => {
    // Initial sync
    bridge.syncBuffersToPhysics();
    
    // Modify physics positions
    physicsSystem.positions[0] = 123;
    physicsSystem.positions[1] = 456;
    physicsSystem.positions[2] = 789;
    
    // Update after tick
    bridge.updateAfterPhysicsTick();
    
    // Current positions should have new values
    const currPositions = bridge.getCurrentPositions();
    expect(currPositions[0]).toBe(123);
    expect(currPositions[1]).toBe(456);
    expect(currPositions[2]).toBe(789);
    
    // Attributes should be marked for update
    expect(attributes.positionCurrent.needsUpdate).toBe(true);
    expect(attributes.positionPrevious.needsUpdate).toBe(true);
  });

  test('should provide interpolation uniforms', () => {
    const uniforms = bridge.getInterpolationUniforms();
    
    expect(uniforms).toHaveProperty('positionPrevious');
    expect(uniforms).toHaveProperty('positionCurrent');
    expect(uniforms.positionPrevious).toBe(attributes.positionPrevious);
    expect(uniforms.positionCurrent).toBe(attributes.positionCurrent);
  });

  test('should sync buffers to physics', () => {
    // Modify physics positions
    physicsSystem.positions[0] = 111;
    physicsSystem.positions[1] = 222;
    physicsSystem.positions[2] = 333;
    
    // Sync
    bridge.syncBuffersToPhysics();
    
    // Both current and previous should match physics
    const currPositions = bridge.getCurrentPositions();
    const prevPositions = bridge.getPreviousPositions();
    
    expect(currPositions[0]).toBe(111);
    expect(currPositions[1]).toBe(222);
    expect(currPositions[2]).toBe(333);
    
    expect(prevPositions[0]).toBe(111);
    expect(prevPositions[1]).toBe(222);
    expect(prevPositions[2]).toBe(333);
  });

  test('should update physics system reference', () => {
    const newSystem = createMockPhysicsSystem(20);
    
    bridge.setPhysicsSystem(newSystem);
    
    expect(bridge.getParticleCount()).toBe(20);
  });
});

describe('Integration: InterpolationSystem + Jellyfish Pattern', () => {
  test('should work together for smooth interpolation', () => {
    const physicsSystem = createMockPhysicsSystem(5);
    const attributes = createMockBufferAttributes(5);
    const geometry = new MockBufferGeometry();
    const bridge = new PhysicsBridge(physicsSystem, geometry as any, attributes);
    const interpolationSystem = new InterpolationSystem();
    
    let physicsUpdates = 0;
    
    // Simulate several frames at 60fps
    for (let frame = 0; frame < 10; frame++) {
      // Update physics positions to simulate movement
      for (let i = 0; i < physicsSystem.particleCount * 3; i++) {
        physicsSystem.positions[i] += 0.1;
      }
      
      // Prepare buffers before physics tick
      bridge.prepareForPhysicsTick();
      
      // Run interpolation system (this calls the physics callback)
      const factor = interpolationSystem.update(16.67, () => {
        // In real usage, this would call system.tick()
        physicsUpdates++;
      });
      
      // Update buffers after physics tick
      bridge.updateAfterPhysicsTick();
      
      // Factor should always be in valid range
      expect(factor).toBeGreaterThanOrEqual(0);
      expect(factor).toBeLessThan(1);
    }
    
    // Should have processed some physics updates
    expect(physicsUpdates).toBeGreaterThan(0);
    
    // Current and previous positions should be different (showing interpolation)
    const curr = bridge.getCurrentPositions();
    const prev = bridge.getPreviousPositions();
    
    // At least some positions should have changed
    let hasChanges = false;
    for (let i = 0; i < curr.length; i++) {
      if (Math.abs(curr[i] - prev[i]) > 0.001) {
        hasChanges = true;
        break;
      }
    }
    expect(hasChanges).toBe(true);
  });

  test('should get step progress from interpolation system', () => {
    const interpolationSystem = new InterpolationSystem();
    
    interpolationSystem.start();
    
    // Update and get factor
    const factor = interpolationSystem.update(10, () => {});
    
    // getStepProgress should return the same value
    expect(interpolationSystem.getStepProgress()).toBe(factor);
  });
});
