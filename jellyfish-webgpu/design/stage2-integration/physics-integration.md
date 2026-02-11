# Physics & Movement Integration
## Stage 2: Cross-Disciplinary Integration
**Date:** 2026-02-08
**Author:** Physics & Movement Specialist
**Status:** DRAFT
**Project:** Abyssal Genesis - Epic Jellyfish WebGPU

---

## EXECUTIVE SUMMARY

This document synthesizes physics and motion systems with the EXPANSIVE strategy from Stage 1.5, integrating with 12-15 creature archetypes to achieve **5,000-10,000 high-quality creatures** at **500+ @ 60 FPS (ultra tier)**.

**Key Integration Points:**
1. **Form-Specific Physics**: 5 distinct motion types mapped to 15 archetypes
2. **GPU Compute Strategy**: Parallel particle updates for 200,000+ photocytes
3. **Cross-Disciplinary Synergy**: Physics × Geometry × Shaders × Bioluminescence
4. **Performance Architecture**: Temporal LOD, spatial partitioning, instancing

---

## 1. FORM-SPECIFIC PHYSICS SYSTEMS

### 1.1 Motion Type Taxonomy

| Motion Type | Archetypes | Primary Mechanism | Physics Parameters |
|-------------|------------|-------------------|-------------------|
| **Bell Pulsing** | Medusozoa, Cubozoa, Hydromedusa | Radial contraction/expansion | pulseFrequency, pulseAmplitude, contractionRatio |
| **Comb Row Beating** | Ctenophora (Comb Jelly) | Metachronal wave propagation | beatFrequency, waveSpeed, phaseOffset, rowCount |
| **Undulation** | Siphonophore, Ribbon, Stalked | Sinuous wave propagation | waveFrequency, waveAmplitude, waveSpeed, damping |
| **Peristalsis** | Salp, Ascidia, Colonial | Sequential contraction | contractionWave, waveSpeed, restLength, stiffness |
| **Feather Motion** | Anemone, Star, Glass Sponge | Passive drift with response | driftFactor, responseSpeed, flowCoupling |

### 1.2 Implementation Architecture

```typescript
// Form-specific physics interface
interface FormPhysics {
  type: MotionType;
  update(dt: number, time: number): void;
  getParticlePositions(): Float32Array;
  getConstraintData(): Float32Array;
}

// Bell Pulsing (Medusozoa, Cubozoa)
class BellPulsingPhysics implements FormPhysics {
  type: MotionType = 'bell_pulsing';

  // Parameters
  pulseFrequency: number;      // 0.5 - 2.0 Hz
  pulseAmplitude: number;      // 0.1 - 0.5 radius fraction
  contractionRatio: number;    // 0.2 - 0.5
  phaseOffset: number;         // 0 - 2π

  // Implementation
  // Radial constraints expand/contract based on sine wave
  // Volume preservation maintains internal pressure
}

// Comb Row Beating (Ctenophora)
class CombRowPhysics implements FormPhysics {
  type: MotionType = 'comb_row_beating';

  beatFrequency: number;       // 2 - 5 Hz
  waveSpeed: number;           // 1 - 3 m/s equivalent
  rowCount: number;            // Always 8 for ctenophores
  phaseOffset: number;         // Per-row phase lag

  // Implementation
  // 8 comb rows with sequential phase offset
  // Metachronal wave creates rainbow iridescence
}

// Undulation (Siphonophore, Ribbon)
class UndulationPhysics implements FormPhysics {
  type: MotionType = 'undulation';

  waveFrequency: number;       // 0.5 - 3.0 Hz
  waveAmplitude: number;       // 0.1 - 1.0
  waveSpeed: number;           // 1 - 3
  damping: number;             // 0.0 - 1.0

  // Implementation
  // Sinusoidal displacement along spine
  // Verlet integration for smooth motion
}

// Peristalsis (Salp, Ascidia)
class PeristalsisPhysics implements FormPhysics {
  type: MotionType = 'peristalsis';

  contractionWave: number;     // Contraction amount
  waveSpeed: number;           // Wave propagation speed
  restLength: number;          // Unconstrained length
  stiffness: number;           // Spring stiffness

  // Implementation
  // Sequential ring contraction
  // Traveling wave from anterior to posterior
}

// Feather Motion (Anemone, Star)
class FeatherMotionPhysics implements FormPhysics {
  type: MotionType = 'feather_motion';

  driftFactor: number;         // 0.8 - 0.95 (responsiveness)
  responseSpeed: number;       // Flow coupling rate
  flowCoupling: number;        // Current influence

  // Implementation
  // Passive response to fluid currents
  // Minimal active contraction
}
```

---

## 2. ARCHETYPE-PHYSICS MAPPING

### 2.1 Tier 1 Archetypes (Weeks 1-4)

| Archetype | Motion Type | Physics Config | Variety Multiplier |
|-----------|-------------|----------------|-------------------|
| **Medusozoa** | Bell Pulsing | 12 bell profiles × 5 pulse patterns | ×60 |
| **Comb Jelly** | Comb Row Beating | 8 comb rows × metachronal patterns | ×40 |
| **Siphonophore** | Undulation | 8 colony types × wave patterns | ×80 |
| **Box Jelly** | Bell Pulsing + Navigation | 4-quadrant control × pulsing | ×50 |
| **Anemone** | Feather Motion | 7 tentacle arrangements × response | ×70 |

### 2.2 Tier 2 Archetypes (Weeks 5-8)

| Archetype | Motion Type | Physics Config | Variety Multiplier |
|-----------|-------------|----------------|-------------------|
| **Salp** | Peristalsis | 6 chain configs × wave patterns | ×60 |
| **Glass Sponge** | Static + Minimal | Lattice × internal flow | ×30 |
| **Star** | Feather Motion | 5 arm configs × pinnules | ×50 |
| **Colonial** | Coordinated Pulsing | Swarm × sync patterns | ×100 |
| **Ribbon** | Undulation | Parametric × wave propagation | ×80 |

### 2.3 Tier 3 Archetypes (Weeks 9-12)

| Archetype | Motion Type | Physics Config | Variety Multiplier |
|-----------|-------------|----------------|-------------------|
| **Ascidia** | Peristalsis + Siphon | 2 siphons × pumping | ×40 |
| **Hydromedusa** | Rapid Pulsing | Micro-scale × swarm | ×80 |
| **Stalked** | Modified Pulsing | Sessile orientation | ×40 |
| **Physalia** | Multi-zooid | Specialized systems | ×150 |
| **Experimental** | Variable | ML-generated | Unlimited |

---

## 3. GPU COMPUTE PHYSICS ARCHITECTURE

### 3.1 Compute Shader Design

```wgsl
// Physics compute shader for particle updates
@compute @workgroup_size(256)
fn updateParticles(
  @builtin(global_invocation_id) global_id: vec3<u32>
) {
  let particle_index = global_id.x;
  if (particle_index >= total_particles) { return; }

  // Load particle data
  let pos = positions[particle_index];
  let prev_pos = prev_positions[particle_index];
  let velocity = velocities[particle_index];

  // Verlet integration
  let new_pos = pos + (pos - prev_pos) * damping + acceleration * dt * dt;

  // Apply form-specific forces
  let form_type = creature_data[particle_index].form_type;
  let form_params = getFormParams(form_type);

  // Apply constraints
  applyConstraints(particle_index, new_pos, form_params);

  // Store results
  positions[particle_index] = new_pos;
  prev_positions[particle_index] = pos;
}

// Form-specific constraint application
fn applyConstraints(
  index: u32,
  pos: vec3<f32>,
  params: FormParams
) {
  switch (params.motion_type) {
    case 0: { // Bell Pulsing
      applyRadialConstraint(index, pos, params);
    }
    case 1: { // Comb Row Beating
      applyMetachronalConstraint(index, pos, params);
    }
    case 2: { // Undulation
      applyWaveConstraint(index, pos, params);
    }
    case 3: { // Peristalsis
      applyPeristalticConstraint(index, pos, params);
    }
    case 4: { // Feather Motion
      applyDriftConstraint(index, pos, params);
    }
    default: {}
  }
}
```

### 3.2 Performance Budget Allocation

| Tier | Max Creatures | Photocytes/Creature | Total Photocytes | Budget |
|------|---------------|---------------------|------------------|--------|
| **Ultra** | 500 | 2,000 | 1,000,000 | 10ms biolum, 3ms geometry, 3ms animation |
| **High** | 200 | 1,000 | 200,000 | 5ms biolum, 2ms geometry, 2ms animation |
| **Medium** | 100 | 500 | 50,000 | 2.5ms biolum, 1.5ms geometry, 1.5ms animation |

### 3.3 Temporal LOD System

```typescript
// Distance-based quality levels
interface PhotocyteLOD {
  near: {
    distance: [0, 10],
    count: 2000,
    animation: 'full',      // Full physics + bioluminescence
    updateInterval: 1       // Every frame
  };
  medium: {
    distance: [10, 50],
    count: 500,
    animation: 'pulse_only', // Simplified pulse
    updateInterval: 2        // Every other frame
  };
  far: {
    distance: [50, Infinity],
    count: 100,
    animation: 'steady_only', // No animation
    updateInterval: 4        // Every 4th frame
  };
}
```

---

## 4. CROSS-DISCIPLINARY INTEGRATION

### 4.1 Physics × Geometry

**Constraint-Based Geometry Generation:**

```typescript
// Geometry follows physics constraints
interface PhysicsGeometryIntegration {
  // Bell profiles generated from radial constraints
  bellConstraint: {
    radiusCurve: RadiusProfileCurve;
    radialSymmetry: number;
    constraintStiffness: number;
  };

  // Tentacle chains from Verlet integration
  tentacleChain: {
    segmentCount: number;
    segmentLength: number;
    constraintType: 'distance' | 'angle' | 'volume';
  };

  // Colony structures from modular physics
  colonyModule: {
    moduleCount: number;
    connectionType: 'rigid' | 'flexible' | 'active';
    coordinationPattern: 'synchronized' | 'wave' | 'independent';
  };
}
```

**Variety Multiplier:** Geometry × Physics = **10-100×** additional creatures

### 4.2 Physics × Shaders

**Motion-Driven Materials:**

```typescript
// Shader receives physics state
interface PhysicsShaderIntegration {
  // Deformation drives material properties
  deformationInputs: {
    vertexDisplacement: vec3<f32>;    // From physics
    surfaceCurvature: f32;             // Computed from positions
    velocity: vec3<f32>;               // For motion blur
    strain: f32;                       // Constraint stretch
  };

  // Material responds to motion
  materialOutputs: {
    thickness: f32;                    // Subsurface scattering
    roughness: f32;                    // Stretched = smoother
    translucency: f32;                 // Thinner = more transparent
    iridescence: f32;                  // Comb row angle
  };
}
```

**Variety Multiplier:** Shaders × Physics = **3-5×** additional creatures

### 4.3 Physics × Bioluminescence

**Motion-Synchronized Glow:**

```typescript
// Bioluminescence follows physics patterns
interface PhysicsBioIntegration {
  // Pulse coupling
  pulseSync: {
    bellPulse: boolean;                // Bell contraction triggers glow
    combWave: boolean;                 // Metachronal wave drives rainbow
    undulationWave: boolean;           // Undulating glow pattern
  };

  // Intensity modulation
  intensityFrom: {
    velocity: f32;                     // Motion = brighter
    strain: f32;                       // Stretch = dimmer
    depth: f32;                        // Pressure affect
  };

  // Pattern placement
  patternAnchors: {
    constraintPoints: vec3<f32>[];     // At constraint locations
    velocityPeaks: vec3<f32>[];        // High motion areas
    strainZones: vec3<f32>[];          // Deformed regions
  };
}
```

**Variety Multiplier:** Bioluminescence × Physics = **5-15×** additional creatures

### 4.4 Physics × Colors

**Temperature-Based Physics:**

```typescript
// Color temperature affects motion
interface ColorPhysicsIntegration {
  // Warm colors = active, cool = passive
  temperatureActivity: {
    red: number;        // High activity
    orange: number;     // Medium-high
    yellow: number;     // Medium
    green: number;      // Medium-low
    blue: number;       // Low activity
    purple: number;     // Variable
  };

  // Color-driven physics parameters
  parameterMapping: {
    pulseFrequency: number;     // Warm = faster
    waveSpeed: number;          // Warm = faster
    responseSpeed: number;      // Warm = more responsive
    damping: number;            // Cool = more damped
  };
}
```

---

## 5. CONSTRAINT SYSTEM ARCHITECTURE

### 5.1 Constraint Types (from Geometry Brainstorm)

| Constraint | Use Case | Parameters | Performance |
|------------|----------|------------|-------------|
| **Distance** | Tentacle segments | min, max, stiffness | O(n) |
| **Angle** | Jointed appendages | axis, min, max, stiffness | O(n) |
| **Volume** | Bell preservation | target, stiffness | O(n²) |
| **Bend** | Spine flexibility | angle, stiffness | O(n) |
| **Collision** | Self-collision avoidance | radius, margin | O(n log n) |
| **FluidDrag** | Water resistance | density, coefficient | O(n) |
| **Buoyancy** | Vertical force | density, fluidDensity | O(n) |

### 5.2 Solver Strategy

```typescript
// Hybrid solver approach
interface PhysicsSolver {
  // Position Based Dynamics (PBD) for constraints
  pbdIterations: number;          // 5-10 iterations

  // Verlet integration for particles
  verletTimestep: number;          // Fixed timestep

  // Spatial hashing for collisions
  spatialGrid: {
    cellSize: number;
    particleCapacity: number;
  };

  // GPU compute for parallel constraints
  gpuCompute: {
    workgroupSize: number;         // 256 threads
    sharedMemory: number;          // Per-workgroup
  };
}
```

---

## 6. ANIMATION SIGNATURE SYSTEM

### 6.1 Signature Parameters

From Stage 1.5 Bioluminescence analysis:

```typescript
interface AnimationSignature {
  // Primary motion
  primary: {
    type: MotionType;
    frequency: number;             // 0.1 - 10 Hz
    amplitude: number;             // 0.0 - 1.0
    phase: number;                 // 0 - 2π
  };

  // Secondary modulation
  secondary: {
    enabled: boolean;
    type: 'tremor' | 'flutter' | 'pulse' | 'breathing';
    frequency: number;             // 2-50 Hz for tremor
    amplitude: number;             // 0.0 - 0.5
  };

  // Response behavior
  response: {
    toCurrent: boolean;            // React to water flow
    toTouch: boolean;              // React to interaction
    toProximity: boolean;          // React to other creatures
    responseSpeed: number;         // 0.0 - 1.0
  };

  // Coordination (colonial)
  coordination: {
    synchronized: boolean;
    wavePhase: number;             // Phase delay between modules
    leaderFollow: boolean;         // Some modules lead
  };
}
```

### 6.2 Signature Variety

**13,125+ possible animation signatures** from:
- 5 primary types × 10 frequencies × 10 amplitudes × 10 phases = 5,000
- 4 secondary types × 5 frequencies × 5 amplitudes = 100
- 8 response configurations = 8
- 3 coordination patterns = 3
- **Total: ~13,125 signatures**

---

## 7. PERFORMANCE OPTIMIZATION

### 7.1 Spatial Partitioning

```typescript
// Octree-based culling
interface SpatialPartitioning {
  octree: {
    maxDepth: number;              // 5-8 levels
    maxObjectsPerNode: number;     // 10-20 objects
    rebuildStrategy: 'incremental' | 'full';
  };

  // Frustum culling
  frustum: {
    enabled: boolean;
    margin: number;                // Expand frustum for motion
  };

  // Distance culling
  distance: {
    enabled: boolean;
    maxDistance: number;           // Beyond this, don't simulate
    fadeDistance: number;          // Start fading here
  };
}
```

### 7.2 Instancing Strategy

```typescript
// GPU instancing for similar creatures
interface InstancingStrategy {
  // Group by archetype
  archetypeGroups: {
    medusozoa: InstancedGroup;
    combJelly: InstancedGroup;
    salp: InstancedGroup;
    // ... etc
  };

  // Per-instance data
  instanceData: {
    transform: mat4;
    color: vec4;
    physicsOffset: vec4;           // For vertex shader animation
    bioIntensity: f32;
  };

  // Dynamic instancing
  dynamic: {
    maxInstances: number;          // Per draw call
    updateFrequency: number;       // How often to update buffers
  };
}
```

### 7.3 Memory Management

```typescript
// Buffer allocation strategy
interface BufferManagement {
  // Particle buffers
  particles: {
    positions: GPUBuffer;          // vec3<f32>
    prevPositions: GPUBuffer;      // vec3<f32> (Verlet)
    velocities: GPUBuffer;         // vec3<f32>
    constraints: GPUBuffer;        // Constraint data
  };

  // Double buffering for async compute
  doubleBuffer: {
    front: GPUBuffer[];
    back: GPUBuffer[];
    swapInterval: number;
  };

  // Memory pools
  pools: {
    particlePool: GPUBuffer;
    constraintPool: GPUBuffer;
    photocytePool: GPUBuffer;
  };
}
```

---

## 8. IMPLEMENTATION ROADMAP

### Phase 1: Core Physics (Weeks 1-2)
- [ ] Implement 5 motion type classes
- [ ] Create constraint system base
- [ ] Set up Verlet integration
- [ ] Basic GPU compute shader
- [ ] Unit tests for physics

### Phase 2: Tier 1 Archetypes (Weeks 3-4)
- [ ] Bell pulsing (Medusozoa, Cubozoa, Hydromedusa)
- [ ] Comb row beating (Ctenophora)
- [ ] Undulation (Siphonophore, Ribbon)
- [ ] Feather motion (Anemone, Star)
- [ ] Peristalsis (Salp, Ascidia)

### Phase 3: GPU Optimization (Weeks 5-6)
- [ ] Implement compute shader particles
- [ ] Add temporal LOD system
- [ ] Spatial partitioning
- [ ] Performance profiling

### Phase 4: Cross-Disciplinary (Weeks 7-8)
- [ ] Physics × Geometry integration
- [ ] Physics × Shaders integration
- [ ] Physics × Bioluminescence integration
- [ ] Animation signature system

### Phase 5: Polish & Scaling (Weeks 9-10)
- [ ] Tier 2 archetype physics
- [ ] Instancing optimization
- [ ] Memory optimization
- [ ] Quality presets

### Phase 6: Advanced Features (Weeks 11-12)
- [ ] Tier 3 archetype physics
- [ ] ML-generated motion
- [ ] Interactive physics
- [ ] Performance tuning

---

## 9. SUCCESS METRICS

### 9.1 Performance Targets

| Metric | Ultra | High | Medium |
|--------|-------|------|--------|
| Creatures @ 60 FPS | 500 | 200 | 100 |
| Photocytes per creature | 2,000 | 1,000 | 500 |
| Total photocytes | 1,000,000 | 200,000 | 50,000 |
| Frame time budget | 16ms | 16ms | 16ms |
| Physics time | 3ms | 2ms | 1.5ms |

### 9.2 Variety Metrics

- **Motion signatures**: 13,125+
- **Physics × Geometry**: 10-100× multiplier
- **Physics × Shaders**: 3-5× multiplier
- **Physics × Bioluminescence**: 5-15× multiplier
- **Total physics variety**: 35,000+ combinations

### 9.3 Quality Metrics

- **Biological plausibility**: 80%+ pass review
- **Animation smoothness**: No visible popping
- **Physics stability**: <1% explosions
- **User satisfaction**: 4.5/5+ rating

---

## 10. CONCLUSION

The physics integration strategy embraces the EXPANSIVE approach from Stage 1.5, supporting **12-15 archetypes** through **5 form-specific motion types** with **GPU compute acceleration** to achieve **500+ creatures @ 60 FPS**.

**Key Achievements:**
1. **Unified Motion System**: 5 types cover all 15 archetypes
2. **Performance Architecture**: GPU compute + LOD + instancing
3. **Cross-Disciplinary Synergy**: Physics integrates with geometry, shaders, bioluminescence
4. **Variety Multiplier**: 35,000+ physics combinations
5. **Scalability**: Tiered quality presets for all hardware

**Next Steps:**
1. Review and approve this integration plan
2. Begin Phase 1 implementation (core physics)
3. Establish performance benchmarking
4. Create physics presets for Tier 1 archetypes

---

**Document Status:** DRAFT
**Date:** 2026-02-08
**Author:** Physics & Movement Specialist
**Project:** Abyssal Genesis - Epic Jellyfish WebGPU
**Stage:** 2 - Cross-Disciplinary Integration
