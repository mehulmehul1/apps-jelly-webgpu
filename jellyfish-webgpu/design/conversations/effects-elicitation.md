# Effects & Lighting Advanced Elicitation
## Leg hq-leg-6upnu - Phase 2: Advanced Elicitation

> **Mission:** Use 5 elicitation methods to deep-dive into effects and lighting concepts
> **Date:** 2026-02-08
> **Methods:** Performance Profiler Panel, Red Team vs Blue Team, Algorithm Olympics, Pre-mortem, First Principles

---

## METHOD 1: Performance Profiler Panel

### Panel Composition
**Moderator:** Performance Optimization Specialist
**Panelists:**
- GPU Compute Architect
- WebGL/WebGPU Expert
- Real-time Graphics Developer
- Mobile Graphics Specialist
- Physics Simulation Engineer

### Key Questions & Responses

#### Q1: What are the most expensive particle system operations for deep-sea jellyfish?

**GPU Compute Architect:**
"Most expensive are:
1. **Particle-particle interactions** - O(n²) complexity for collision detection
2. **Volumetric lighting integration** - Each particle needs light sampling
3. **Transparency sorting** - GPU must sort back-to-front for correct blending
4. **Motion trails with history** - Storing previous positions consumes bandwidth"

**WebGPU Expert:**
"WebGPU-specific bottlenecks:
1. **Buffer updates every frame** - Mapping/unmapping particle data
2. **Compute shader dispatch overhead** - Small workgroups waste potential
3. **Bind group changes** - Switching between different particle materials
4. **Storage buffer limits** - Large particle counts hit memory constraints"

**Optimization Recommendations:**
```javascript
// Use GPU-based simulation only for particles > 1000
// CPU-based for smaller counts to avoid dispatch overhead
const GPU_THRESHOLD = 1000;

// Use indirect drawing for particle rendering
// Avoid CPU-side sorting with depth pre-pass
// Implement temporal coherence for particle updates
```

#### Q2: How do we balance visual quality with frame rate?

**Real-time Graphics Developer:**
"Key trade-offs:
1. **Particle count vs. size** - Fewer large particles vs many small ones
2. **Update rate vs. interpolation** - Update at 30Hz, interpolate to 60Hz
3. **Physics accuracy vs. approximation** - Verlet integration vs. RK4
4. **Lighting samples vs. performance** - 1 sample vs. 4+ samples per particle"

**LOD Strategy Matrix:**
```javascript
const LOD_LEVELS = {
  high: {
    distance: 0-10,
    particleCount: 10000,
    physicsAccuracy: 'RK4',
    lightingSamples: 4,
    updateRate: 60
  },
  medium: {
    distance: 10-30,
    particleCount: 2000,
    physicsAccuracy: 'Verlet',
    lightingSamples: 2,
    updateRate: 30
  },
  low: {
    distance: 30+,
    particleCount: 500,
    physicsAccuracy: 'Euler',
    lightingSamples: 1,
    updateRate: 15
  }
};
```

#### Q3: What post-processing effects give most visual impact per GPU cost?

**Mobile Graphics Specialist:**
"Best bang-for-buck effects:
1. **Bloom (moderate radius)** - High impact, moderate cost
2. **Vignette** - Very cheap, good atmosphere
3. **Color grading (LUT)** - Cheap per-pixel operation
4. **Simple fog** - Single value depth-based

Expensive effects to avoid:
1. **Depth of field** - Requires multiple passes
2. **Motion blur** - Velocity buffer + multiple samples
3. **Screen space reflections** - Very expensive for underwater
4. **Chromatic aberration** - Multiple texture samples"

**Performance Budget Allocation:**
```javascript
const BUDGET_ALLOCATION = {
  postProcessing: {
    totalMs: 3.0,
    bloom: 1.2,
    vignette: 0.1,
    colorGrading: 0.5,
    fog: 0.3,
    remaining: 0.9  // For optional effects
  }
};
```

---

## METHOD 2: Red Team vs Blue Team

### Blue Team (Proponent): "Push Visual Boundaries"

**Arguments for Maximum Effects:**

1. **Bioluminescence is Core Identity**
   - Jellyfish ARE light creatures in deep sea
   - Glow effects define visual appeal
   - Compromising here loses artistic vision

2. **Particle Density Creates Atmosphere**
   - Marine snow makes scene feel alive
   - Sparse particles look cheap/empty
   - User expects rich underwater feel

3. **Post-Processing Sells Realism**
   - Without bloom, bioluminescence lacks impact
   - Caustics sell underwater environment
   - Color grading creates emotional mood

4. **Modern Hardware Can Handle It**
   - WebGPU targets gaming devices
   - Mobile devices improving rapidly
   - Users with low-end devices expect lower quality

**Proposed Specification:**
```javascript
const BLUE_TEAM_SPEC = {
  particles: {
    bioluminescent: 5000,
    marineSnow: 10000,
    bubbleParticles: 2000,
    total: 17000
  },
  postProcessing: {
    bloom: true,
    caustics: true,
    dof: true,
    chromaticAberration: true,
    vignette: true,
    colorGrading: true
  }
};
```

### Red Team (Opponent): "Optimize for Performance"

**Arguments for Conservative Approach:**

1. **Web Accessibility Constraints**
   - Web users have diverse hardware
   - Mobile browsers have limited GPU
   - Unexpected background processes affect performance

2. **Thermal Throttling Reality**
   - Continuous particle sims heat up devices
   - Mobile users will close hot/laggy sites
   - Battery drain limits session duration

3. **Diminishing Returns**
   - 1000 particles look 90% as good as 10000
   - User won't notice subtle post-processing
   - Frame drops more noticeable than missing effects

4. **Browser Variability**
   - WebGPU implementation differs across browsers
   - Some drivers have compute shader bugs
   - Fallback strategies increase complexity

**Proposed Specification:**
```javascript
const RED_TEAM_SPEC = {
  particles: {
    bioluminescent: 500,
    marineSnow: 1000,
    bubbleParticles: 100,
    total: 1600
  },
  postProcessing: {
    bloom: true,
    caustics: false,
    dof: false,
    chromaticAberration: false,
    vignette: true,
    colorGrading: true
  }
};
```

### Synthesis - Balanced Compromise

**Agreed Upon Strategy:**
```javascript
const COMPROMISE_SPEC = {
  // Adaptive quality based on performance
  adaptiveQuality: true,

  particles: {
    bioluminescent: {
      min: 300,
      max: 3000,
      target: 1000
    },
    marineSnow: {
      min: 200,
      max: 5000,
      target: 1500
    },
    bubbleParticles: {
      min: 50,
      max: 1000,
      target: 200
    }
  },

  postProcessing: {
    // Essential effects
    bloom: {
      enabled: true,
      quality: 'adaptive'  // High/medium/low based on FPS
    },
    vignette: {
      enabled: true,
      cost: 'negligible'
    },
    colorGrading: {
      enabled: true,
      cost: 'low'
    },

    // Optional expensive effects
    caustics: {
      enabled: 'optional',  // User toggle or performance-based
      quality: 'low'
    },
    dof: {
      enabled: 'optional',
      quality: 'medium'
    },
    chromaticAberration: {
      enabled: false,  // Not worth cost
      reason: 'minimal visual impact'
    }
  },

  performanceTarget: {
    minFPS: 30,
    targetFPS: 60,
    monitorInterval: 1000  // ms
  }
};
```

---

## METHOD 3: Algorithm Olympics

### Competition 1: Particle Physics Integration

**Contestants:**
1. **Euler Integration**
2. **Verlet Integration**
3. **Runge-Kutta 4 (RK4)**

**Evaluation Criteria:**
- Accuracy (energy conservation)
- Performance (execution time)
- Stability (resistance to explosion)

**Results:**

```javascript
// EULER INTEGRATION
// Speed: ⭐⭐⭐⭐⭐ (Fastest)
// Accuracy: ⭐⭐ (Poor)
// Stability: ⭐⭐ (Unstable with large dt)

function eulerUpdate(particle, dt) {
  particle.velocity += particle.force * dt;
  particle.position += particle.velocity * dt;
  return particle;
}

// VERLET INTEGRATION
// Speed: ⭐⭐⭐⭐ (Fast)
// Accuracy: ⭐⭐⭐⭐ (Good)
// Stability: ⭐⭐⭐⭐ (Very stable)

function verletUpdate(particle, dt) {
  const tempPosition = particle.position;
  particle.position = 2 * particle.position -
                     particle.previousPosition +
                     particle.acceleration * dt * dt;
  particle.previousPosition = tempPosition;
  return particle;
}

// RUNGE-KUTTA 4
// Speed: ⭐⭐ (Slowest - 4x evaluations)
// Accuracy: ⭐⭐⭐⭐⭐ (Excellent)
// Stability: ⭐⭐⭐⭐⭐ (Most stable)

function rk4Update(particle, dt) {
  const k1 = particle.acceleration;
  const k2 = particle.acceleration + k1 * 0.5 * dt;
  const k3 = particle.acceleration + k2 * 0.5 * dt;
  const k4 = particle.acceleration + k3 * dt;

  particle.velocity += (k1 + 2*k2 + 2*k3 + k4) * dt / 6;
  particle.position += particle.velocity * dt;
  return particle;
}
```

**Winner: Verlet Integration**
- Best balance of speed and accuracy
- Excellent stability for particle systems
- Natural constraint satisfaction
- Position-based dynamics friendly

**Recommendation:** Use Verlet for jellyfish particles, fall back to Euler for distant LOD levels.

### Competition 2: Particle Rendering

**Contestants:**
1. **Instanced Mesh Rendering**
2. **Point Cloud Rendering**
3. **Compute Shader Generated Geometry**

**Results:**

```javascript
// INSTANCED MESH
// Use case: Medium-sized particles (100-10000)
// Pros: Complex geometry, proper lighting
// Cons: Higher vertex count, sorting overhead

const instancedConfig = {
  minCount: 100,
  maxCount: 10000,
  geometry: 'sphere',
  material: 'PBR',
  features: ['shadows', 'lighting', 'transparency']
};

// POINT CLOUD
// Use case: Large particle counts (1000-100000)
// Pros: Extremely fast, simple implementation
// Cons: No proper lighting, size limitations

const pointCloudConfig = {
  minCount: 1000,
  maxCount: 100000,
  geometry: 'points',
  material: 'basic',
  features: ['sizeAttenuation', 'additiveBlending']
};

// COMPUTE GEOMETRY
// Use case: Dynamic effects, trails, complex shapes
// Pros: Maximum flexibility, GPU-only
// Cons: Complex setup, debugging difficulty

const computeConfig = {
  minCount: 500,
  maxCount: 50000,
  geometry: 'procedural',
  material: 'custom',
  features: ['historyBuffer', 'dynamicTopology']
};
```

**Winner: Hybrid Approach**
- Point cloud for distant marine snow (10000+ particles)
- Instanced mesh for bioluminescent points (1000 particles)
- Compute shader for special effects (trails, vortices)

### Competition 3: Bloom Implementation

**Contestants:**
1. **Two-Pass Gaussian**
2. **Single-Pass Approximation**
3. **Compute Shader Bloom**

**Results:**

```javascript
// TWO-PASS GAUSSIAN
// Quality: ⭐⭐⭐⭐⭐
// Performance: ⭐⭐⭐
// Best for: High-quality settings

const twoPassConfig = {
  passes: 2,
  directions: ['horizontal', 'vertical'],
  kernelSize: 9,
  quality: 'high'
};

// SINGLE-PASS APPROX
// Quality: ⭐⭐⭐
// Performance: ⭐⭐⭐⭐⭐
// Best for: Mobile/low-end

const singlePassConfig = {
  passes: 1,
  directions: ['diagonal'],
  kernelSize: 5,
  quality: 'medium'
};

// COMPUTE SHADER
// Quality: ⭐⭐⭐⭐⭐
// Performance: ⭐⭐⭐⭐
// Best for: High-end/WebGPU native

const computeConfig = {
  passes: 1,
  workgroupSize: [16, 16],
  sharedMemory: true,
  quality: 'ultra'
};
```

**Winner: Adaptive Gaussian**
- Use two-pass for high quality
- Fall back to single-pass based on FPS
- Implement quality tiers (low/medium/high/ultra)

---

## METHOD 4: Pre-mortem Analysis

### Scenario: "Six Months After Launch - Users Complaining About Performance"

**Hypothetical Failure:**
- Average rating: 2.3 stars
- Top complaints: "Lags," "Freezes," "Unusable"
- Bounce rate: 78%
- Device heat reports: Frequent

**Root Cause Analysis:**

#### Cause 1: No Performance Budgeting
**What Went Wrong:**
- Added particles without measuring impact
- Each feature added incrementally
- No overall performance target

**Prevention:**
```javascript
const PERFORMANCE_BUDGET = {
  totalFrameTime: 16.67,  // 60fps
  allocation: {
    sceneRendering: 8,
    particleSimulation: 3,
    particleRendering: 3,
    postProcessing: 2.67,
    safetyMargin: 0  // Already tight!
  },
  monitoring: {
    sampleRate: 1000,  // ms
    actionThreshold: 55,  // fps
    warningThreshold: 50  // fps
  }
};
```

#### Cause 2: Worst-Case Hardware Testing
**What Went Wrong:**
- Developed on high-end machine
- Tested on mid-range laptop
- Never tested on mobile devices

**Prevention:**
```javascript
const HARDWARE_TIERS = {
  low: {
    ram: '< 4GB',
    gpu: 'integrated',
    particleBudget: 500,
    ppQuality: 'low'
  },
  medium: {
    ram: '4-8GB',
    gpu: 'discrete mobile',
    particleBudget: 2000,
    ppQuality: 'medium'
  },
  high: {
    ram: '> 8GB',
    gpu: 'discrete desktop',
    particleBudget: 10000,
    ppQuality: 'high'
  }
};

function detectHardwareTier() {
  const gpu = navigator.gpu;
  const memory = performance.memory?.jsHeapSizeLimit || 0;
  // Determine tier and set quality preset
}
```

#### Cause 3: Thermal Throttling Ignored
**What Went Wrong:**
- Continuous 100% GPU usage
- No frame rate limiting
- No quality scaling under load

**Prevention:**
```javascript
class ThermalManager {
  constructor() {
    this.currentQuality = 1.0;
    this.throttleHistory = [];
  }

  update(fps, frameTime) {
    if (fps < 30) {
      this.currentQuality = Math.max(0.5, this.currentQuality - 0.1);
      this.applyQualitySettings();
    }
  }

  applyQualitySettings() {
    particleSystem.setCount(
      baseCount * this.currentQuality
    );
    postProcessing.setQuality(this.currentQuality);
  }
}
```

#### Cause 4: No Quality Presets
**What Went Wrong:**
- All-or-nothing approach
- User couldn't adjust quality
- No "low quality" fallback

**Prevention:**
```javascript
const QUALITY_PRESETS = {
  potato: {
    particles: 300,
    bloom: false,
    caustics: false,
    shadows: false
  },
  low: {
    particles: 800,
    bloom: true,
    bloomRadius: 0.3,
    caustics: false,
    shadows: false
  },
  medium: {
    particles: 2000,
    bloom: true,
    bloomRadius: 0.5,
    caustics: true,
    causticsQuality: 'low',
    shadows: true
  },
  high: {
    particles: 5000,
    bloom: true,
    bloomRadius: 0.7,
    caustics: true,
    causticsQuality: 'high',
    shadows: true
  },
  ultra: {
    particles: 10000,
    bloom: true,
    bloomRadius: 1.0,
    caustics: true,
    causticsQuality: 'ultra',
    shadows: true,
    shadowQuality: 'high'
  }
};
```

### Survival Checklist

**Before Launch:**
- [ ] Test on 3+ low-end devices
- [ ] Implement adaptive quality
- [ ] Add manual quality selector
- [ ] Profile on each hardware tier
- [ ] Set performance budget
- [ ] Implement monitoring
- [ ] Create fallback strategies
- [ ] Document optimization tricks

---

## METHOD 5: First Principles Analysis

### Question: "What Are the Fundamental Requirements for Jellyfish Lighting?"

#### Principle 1: Light Physics Underwater

**Fundamental Truths:**
1. **Water absorbs light exponentially with depth**
   - Red absorbed first (~5m)
   - Green absorbed next (~15m)
   - Blue penetrates deepest (~50m+)

2. **Scattering depends on particle density**
   - Pure water: Rayleigh scattering (blue)
   - Particulate water: Mie scattering (white/grey)
   - Coastal water: Higher scattering

3. **Refraction at air-water interface**
   - Snell's law: n₁sin(θ₁) = n₂sin(θ₂)
   - Water refractive index: ~1.33
   - Critical angle: ~48.6° (from below)

**Implications:**
```javascript
// Depth-based absorption
function applyDepthAbsorption(color, depth) {
  const absorptionCoefficients = {
    red: 0.2,   // Absorbed quickly
    green: 0.08,
    blue: 0.02  // Penetrates deepest
  };

  return {
    r: color.r * Math.exp(-absorptionCoefficients.red * depth),
    g: color.g * Math.exp(-absorptionCoefficients.green * depth),
    b: color.b * Math.exp(-absorptionCoefficients.blue * depth)
  };
}

// Scattering approximation
function applyScattering(distance, turbidity) {
  const scatteringCoeff = 0.05 * turbidity;
  const fogFactor = 1 - Math.exp(-scatteringCoeff * distance);
  return mix(color, fogColor, fogFactor);
}
```

#### Principle 2: Bioluminescence Mechanics

**Fundamental Truths:**
1. **Bioluminescence is chemical, not thermal**
   - Luciferin + Luciferase + O₂ → Light
   - ~88% efficient (vs 10% for incandescent)
   - Cold light (no IR)

2. **Photophores are discrete structures**
   - Not continuous surface glow
   - Point sources distributed across tissue
   - Can be controlled individually

3. **Light serves biological functions**
   - Predator avoidance (startle)
   - Prey attraction
   - Mate signaling
   - Camouflage (counter-illumination)

**Implications:**
```javascript
// Bioluminescent particle model
interface BioluminescentParticle {
  position: Vector3;
  intensity: number;  // 0-1
  color: Color;
  phase: number;  // For pulsing animation
  frequency: number;  // Pulse rate
  trigger: Function;  // What activates it
}

function updateBioluminescence(particles, deltaTime) {
  particles.forEach(p => {
    // Chemical kinetics approximation
    const activation = Math.sin(
      deltaTime * p.frequency + p.phase
    );

    // Trigger-based bursts
    if (p.trigger && p.trigger.active) {
      p.intensity = lerp(p.intensity, 1.0, 0.1);
    } else {
      p.intensity = lerp(p.intensity, 0.3, 0.05);
    }
  });
}
```

#### Principle 3: Material Light Interaction

**Fundamental Truths:**
1. **Jellyfish tissue is translucent**
   - Not opaque (light passes through)
   - Not transparent (light scatters inside)
   - Subsurface scattering dominant

2. **Gelatinous material properties**
   - Refractive index: ~1.35-1.38 (slightly higher than water)
   - Scattering coefficient: Medium-high
   - Absorption coefficient: Low

3. **Thickness variation matters**
   - Thicker regions = more scattering
   - Thinner regions = more transmission
   - Creates internal depth perception

**Implications:**
```javascript
// Subsurface scattering approximation
function subsurfaceScattering(
  baseColor: Color,
  thickness: number,
  lightPosition: Vector3,
  surfacePosition: Vector3,
  normal: Vector3
) {
  // Approximate light transmission
  const lightDir = normalize(lightPosition - surfacePosition);
  const transmission = saturate(dot(normal, lightDir));
  const scatterFactor = 1 - Math.exp(-thickness * 2.0);

  // Combine base color with scattered light
  const scatteredLight = baseColor.clone()
    .multiplyScalar(0.5)
    .lerp(lightColor, scatterFactor * transmission);

  return scatteredLight;
}
```

#### Principle 4: Motion & Light Perception

**Fundamental Truths:**
1. **Human vision prioritizes motion**
   - Moving particles more noticeable than static
   - Flicker fusion threshold: ~60Hz
   - Temporal aliasing creates strobe effects

2. **Persistence of vision**
   - Image retention: ~1/25 second
   - Creates motion blur perception
   - Can be exploited for effects

3. **Relative motion emphasis**
   - Motion relative to background
   - Parallax creates depth perception
   - Velocity affects perceived brightness

**Implications:**
```javascript
// Motion-enhanced particles
function addMotionPerception(particles, camera) {
  particles.forEach(p => {
    const relativeVelocity = p.velocity
      .clone()
      .sub(camera.velocity);

    // Stretch particles in motion direction
    const stretch = relativeVelocity.length() * 0.1;
    p.scale.set(
      1 + stretch,
      1,
      1
    );
    p.quaternion.setFromUnitVectors(
      new Vector3(1, 0, 0),
      relativeVelocity.normalize()
    );

    // Brightness enhancement based on speed
    p.intensity *= (1 + relativeVelocity.length() * 0.5);
  });
}
```

---

## SYNTHESIS OF ELICITATION RESULTS

### Key Findings

1. **Performance is Non-Negotiable**
   - Must target 30fps minimum
   - Adaptive quality essential
   - Hardware tier detection required

2. **Visual Impact Priorities**
   - Bioluminescence: Essential (core identity)
   - Bloom: High impact, moderate cost
   - Vignette: Low cost, good atmosphere
   - Caustics: Nice but expensive

3. **Technical Recommendations**
   - Use Verlet integration for physics
   - Hybrid particle rendering (points + instanced)
   - Subsurface scattering for tissue
   - Depth-based color absorption

4. **Implementation Strategy**
   - Start with low particle counts
   - Add quality presets
   - Monitor performance continuously
   - Fall back gracefully

### Ready for Phase 3: Analysis & Synthesis
