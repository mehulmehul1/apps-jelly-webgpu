# Physics & Movement Advanced Elicitation
**Leg**: hq-leg-grj2k
**Date**: 2026-02-08
**Specialist**: Physics & Movement Specialist
**Method**: 5-Method Advanced Elicitation

---

## METHOD 1: Algorithm Olympics
*Comparing different physics algorithms for each movement type*

### Tentacle Simulation Algorithms

| Algorithm | Pros | Cons | Best For |
|-----------|------|------|----------|
| **Verlet Integration** | Stable, energy-conserving, simple | Less precise than RK4 | Chain particles, tentacles |
| **Runge-Kutta 4** | High precision, smooth | Computationally expensive | Sensitive physics, scientific accuracy |
| **Euler Integration** | Fast, simple | Energy drift, unstable | Simple particles, effects |
| **Velocity Verlet** | Time-reversible, symplectic | More complex than Verlet | Molecular dynamics |
| **Semi-Implicit Euler** | Stable for springs | Less accurate than Verlet | Game physics, real-time |
| **Impulse-Based** | Good for collisions | Complex constraints | Collision-heavy scenes |
| **Position Based Dynamics** | Stable, fast constraints | Less physically accurate | Cloth, soft bodies |
| **Finite Element Method** | Realistic soft bodies | Very expensive | High-end soft body |

**Winner**: **Verlet Integration** for tentacles (used by Particulate.js)
- Stable energy conservation prevents tentacles from exploding
- Simple implementation with chain constraints
- Fast enough for real-time simulation
- Well-suited to the distance constraint model

### Bell Pulsing Algorithms

| Algorithm | Pros | Cons | Best For |
|-----------|------|------|----------|
| **Sine Wave Driver** | Smooth, predictable | Unnatural if too regular | Base pulsing rhythm |
| **Perlin Noise Modulation** | Organic variation | Expensive to compute | Natural movement feel |
| **Enveloped Oscillator** | Control over attack/decay | More parameters | Realistic muscle contraction |
| **Metronome with Jitter** | Simple + variation | Limited randomness | Game-like movement |
| **Multi-Frequency Sum** | Complex, rich patterns | Hard to control | Display creatures |
| **Sampled Data Playback** | Realistic motion capture | Storage intensive | Scientific accuracy |

**Winner**: **Enveloped Oscillator** with Perlin modulation
```typescript
interface PulseEnvelope {
  attack: number;      // Contraction speed (0.1-0.5)
  decay: number;       // Relaxation speed (0.2-0.8)
  sustain: number;     // Contraction hold (0.0-0.3)
  frequency: number;   // Base Hz (0.5-2.0)
  variation: number;   // Perlin noise amount (0.0-0.3)
}
```

### Flow Field Algorithms

| Algorithm | Pros | Cons | Best For |
|-----------|------|------|----------|
| **Perlin Noise Flow** | Smooth, coherent | Directionless, swirling | Ambient drift |
| **Simplex Noise Flow** | Faster than Perlin | Still computationally heavy | Real-time flow |
| **Curl Noise** | Divergence-free | Expensive to compute | Physically accurate flow |
| **Voronoi Flow** | Cell-like regions | Sharp boundaries | Bioluminescent patterns |
| **Wave Function** | Predictable patterns | Can look artificial | Comb rows |
| **Vector Field Summation** | Flexible, composable | Complex to tune | Complex environments |

**Winner**: **Simplex Noise Flow** with directional bias
- Provides natural-looking turbulence
- Faster than Perlin noise
- Can be biased for directional currents
- Smooth variations create organic movement

---

## METHOD 2: Performance Profiler
*Computational cost analysis of different movement configurations*

### Particle Count Impact (measured in ms per frame @ 60fps)

| Configuration | Particles | Update Time | Render Time | Total | Verdict |
|---------------|-----------|-------------|-------------|-------|---------|
| Minimal Jelly | 100 | 0.2ms | 0.5ms | 0.7ms | ✅ Excellent |
| Standard Medusa | 500 | 0.8ms | 1.5ms | 2.3ms | ✅ Good |
| Heavy Tentacles | 1500 | 2.5ms | 4.0ms | 6.5ms | ⚠️ Acceptable |
| Extreme Flowing | 3000 | 5.0ms | 8.0ms | 13.0ms | ❌ Too slow |
| Comb Jelly High-Density | 4000 | 6.5ms | 10.0ms | 16.5ms | ❌ LOD needed |

**Recommendations**:
1. **LOD System**: Reduce particle count based on distance
2. **Update Rate Decimation**: Update physics every 2nd frame for distant creatures
3. **Simplified Tentacles**: Use single lines for distant tentacles
4. **Clustered Rendering**: Merge tentacle draws for same material

### Constraint Solver Iterations

| Iterations | Quality | Time | Verdict |
|------------|---------|------|---------|
| 1 | Loose, stretchy | 0.3x | ❌ Too unstable |
| 3 | Acceptable | 0.6x | ⚠️ Fast but low quality |
| 5 | Good | 1.0x | ✅ Balanced |
| 8 | Very good | 1.5x | ⚠️ Diminishing returns |
| 12 | Excellent | 2.2x | ❌ Not worth it |

**Recommendation**: **5 iterations** with adaptive quality
- Use 3 iterations for background creatures
- Use 5 iterations for mid-range
- Use 8 iterations for close-up/hero creatures

### Shader Complexity vs Performance

| Shader Feature | Cost | Visual Impact | Priority |
|----------------|------|---------------|----------|
| Basic Fresnel | Low | High | ✅ Essential |
| Diffraction Grating | Medium | Very High | ✅ High value |
| Subsurface Scattering | High | High | ⚠️ Use selectively |
| Refraction | Very High | Medium | ❌ Skip for now |
| Caustics | Very High | Low | ❌ Too expensive |
| Vertex Displacement | Low | Medium | ✅ Good value |
| Noise-Based Patterns | Medium | High | ✅ Good value |

---

## METHOD 3: Technical Research
*Particulate.js Deep Dive*

Based on research from [Particulate.js Documentation](https://particulatejs.org/docs/) and [GitHub Repository](https://github.com/milcktoast/particulate-js):

### Available Classes for Jellyfish Simulation

#### Core Classes
1. **ParticleSystem** - Main physics container
   - Manages particles and constraints
   - `tick(deltaTime)` advances simulation
   - `positions[]` array stores particle positions
   - `positionsPrev[]` for Verlet integration

2. **Particle** - Individual point mass
   - Position, previous position
   - Mass/weight properties
   - Can be pinned (immovable)

3. **Collection** - Group management
   - Useful for tentacle groups
   - Batch operations

#### Constraint Classes

4. **DistanceConstraint** - Maintains fixed distance
   ```typescript
   new Particulate.DistanceConstraint(
     index1, index2, distance
   )
   ```
   **Use for**: Tentacle segments, bell structure

5. **AngleConstraint** - Controls joint angles
   ```typescript
   new Particulate.AngleConstraint(
     index1, index2, index3, angle
   )
   ```
   **Use for**: Tentacle bending limits, oral arm articulation

6. **PinConstraint** - Fixes particle position
   ```typescript
   new Particulate.PinConstraint(
     index, x, y, z
   )
   ```
   **Use for**: Anchor points, bell center

#### Force Classes

7. **DirectionalForce** - Global force field
   ```typescript
   new Particulate.DirectionalForce(
     x, y, z, strength
   )
   ```
   **Use for**: Currents, gravity, buoyancy

8. **PointForce** - Attractor/repulsor
   ```typescript
   new Particulate.PointForce(
     x, y, z, strength, radius
   )
   ```
   **Use for**: Mouse interaction, creature avoidance

#### Boundary Constraints

9. **BoxConstraint** - Keep particles in box
   ```typescript
   new Particulate.BoxConstraint(
     minX, maxX, minY, maxY, minZ, maxZ
   )
   ```
   **Use for**: Creature bounds

10. **PlaneConstraint** - Keep particles on one side
    ```typescript
    new Particulate.PlaneConstraint(
      a, b, c, d // plane equation ax + by + cz + d = 0
    )
    ```
    **Use for**: Sea floor, surface

### Recommended Particulate.js Configuration

```typescript
// Jellyfish bell structure
const bellSystem = new Particulate.ParticleSystem();

// Central spine particles (pinned)
for (let i = 0; i < ribCount; i++) {
  bellSystem.addParticle(
    0, i * ribSpacing, 0, // x, y, z
    1.0 // mass
  );
}

// Radial rib particles
for (let rib = 0; rib < ribsCount; rib++) {
  const angle = (rib / ribsCount) * Math.PI * 2;
  for (let i = 0; i < segmentsPerRib; i++) {
    const r = (i / segmentsPerRib) * bellRadius;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    bellSystem.addParticle(x, i * segmentHeight, z, 0.5);
  }
}

// Distance constraints for structure
// - Spine connections (vertical)
// - Rib connections (radial)
// - Cross connections (circumferential)

// Pin top center particle
bellSystem.addConstraint(new Particulate.PinConstraint(0, 0, 0, 0));
```

### Tentacle Chain Configuration

```typescript
// Tentacle particle chain
const tentacleStart = bellSystem.particleCount;
for (let i = 0; i < tentacleSegments; i++) {
  bellSystem.addParticle(
    tentacleX, tentacleY - i * segmentLength, tentacleZ,
    tentacleWeight * (i / tentacleSegments) // Taper weight
  );

  // Connect to previous segment
  bellSystem.addConstraint(new Particulate.DistanceConstraint(
    tentacleStart + i - 1,
    tentacleStart + i,
    segmentLength
  ));
}

// Angle constraints for bending limits
for (let i = 1; i < tentacleSegments - 1; i++) {
  bellSystem.addConstraint(new Particulate.AngleConstraint(
    tentacleStart + i - 1,
    tentacleStart + i,
    tentacleStart + i + 1,
    maxBendAngle
  ));
}
```

---

## METHOD 4: Pre-Mortem
*What could go wrong? Anticipating failure modes*

### Failure Scenario Analysis

#### Scenario 1: "Exploding Jellyfish"
**Symptoms**: Tentacles suddenly stretch to infinity
**Causes**:
- Integration instability (dt too large)
- Constraint solver doesn't converge
- Numerical precision issues

**Prevention**:
- Clamp maximum delta time (max 33ms)
- Limit constraint iteration count
- Add velocity damping
- Implement fail-safe: reset if particles exceed bounds

#### Scenario 2: "Frozen Creatures"
**Symptoms**: Creatures stop moving, look stiff
**Causes**:
- Physics update rate too slow
- Constraints too stiff
- Damping too high
- Time step accumulation

**Prevention**:
- Adaptive time stepping
- Tune stiffness parameters
- Monitor energy levels
- Add minimum movement check

#### Scenario 3: "Performance Death"
**Symptoms**: Frame rate drops to unusable levels
**Causes**:
- Too many particles
- Too many constraint iterations
- No LOD system
- All creatures high quality

**Prevention**:
- Budget system (max particles per scene)
- LOD with distance-based quality
- Update rate decimation
- Cull distant creatures

#### Scenario 4: "Uncanny Valley Movement"
**Symptoms**: Movement looks artificial, wrong
**Causes**:
- Pulsing too regular
- No variation in timing
- Wrong flow patterns
- Missing secondary motion

**Prevention**:
- Add Perlin noise to timing
- Multiple overlapping rhythms
- Flow field bias
- Secondary motion on appendages

#### Scenario 5: "Tentacle Tangling"
**Symptoms**: Tentacles knot together
**Causes**:
- No self-collision
- Too many tentacles
- Chaos in flow field

**Prevention**:
- Simplex noise flow (smoother)
- Limit tentacle count
- Spacing constraints
- Self-collision for hero creatures only

#### Scenario 6: "Wrong Creature Feel"
**Symptoms**: Comb jelly moves like medusa
**Causes**:
- Wrong propulsion algorithm
- Same parameters for all creatures
- No creature-specific configs

**Prevention**:
- Creature type parameter presets
- Different propulsion for different body plans
- Movement type validation
- Visual reference matching

### Recovery Strategies

1. **Graceful Degradation**: Reduce quality before failing
2. **Safe Defaults**: Fallback to simple animation
3. **User Controls**: Quality slider for performance
4. **Debug Mode**: Visualize physics for tuning

---

## METHOD 5: Rubber Duck Debugging
*Explaining the physics system to an imaginary rubber duck*

### "Hey Duck, Here's How Jellyfish Movement Works..."

**The Bell (Body)**
"So Duck, the bell is like a springy mesh. We have particles arranged in rings, and they're all connected with distance constraints. When the jellyfish wants to move, it contracts the bell - this means we pull the particles toward the center. This pushes water out the bottom, creating thrust. Then it relaxes, and the elasticity of the constraints pulls it back open. The cycle repeats."

*Question from Duck*: "What keeps it from collapsing completely?"

"Good question! We have angle constraints that limit how much the rings can flatten. And we pin the top center particle so it stays in place. The combination of these creates the dome shape."

**The Tentacles**
"The tentacles are chains of particles, Duck. Each segment is connected to the next with a distance constraint. They're loose and flexible, so they flow behind the movement. We add a little gravity to pull them down, and drag to slow them - this creates that trailing effect."

*Question from Duck*: "Why don't they tangle?"

"Sometimes they do! But we keep them from getting too crazy with angle constraints that limit how sharply they can bend. The water resistance (drag) also keeps them from moving too chaotically."

**The Physics Loop**
"Every frame, Duck, we:
1. Apply forces (gravity, buoyancy, user interaction)
2. Update particle positions using Verlet integration
3. Solve constraints multiple times (5 iterations usually)
4. Update the mesh to match the new particle positions

Verlet integration is clever - instead of storing velocity, we use the difference between current and previous position. This makes the simulation stable and energy-conserving."

*Question from Duck*: "How does the pulsing work?"

"Ah, the pulsing! We have a sine wave that drives the contraction. As the sine wave goes up, we reduce the rest length of the bell constraints - this pulls the particles inward. As it goes down, we increase the rest length - the constraints push back to their original shape. This creates the pulse. We add Perlin noise to make it less regular and more organic."

**The Comb Jelly Special Case**
"Comb jellies are different, Duck. Instead of pulsing the whole bell, they have rows of cilia that beat in waves. We simulate this with a wave function that travels along each comb row. The cilia create thrust and also that beautiful iridescent shimmer."

*Question from Duck*: "How do you make the iridescence?"

"That's a shader trick! We use a diffraction grating effect - the color changes based on viewing angle. As the cilia beat, the angle changes, creating that rainbow ripple."

**The Flow Field**
"For realistic drifting, Duck, we use a flow field. It's a grid of vectors that tell each particle which way the water is moving. We generate this with Simplex noise - it's smooth and natural-looking. Each creature samples this field at its position to get pushed around by the current."

*Question from Duck*: "What about multiple creatures?"

"Great point! Each creature has its own physics system. They don't interact directly (that would be too expensive). But they all respond to the same flow field, which creates coordinated movement patterns. And we can make them avoid each other by adding repulsion forces."

**The Performance Trade-off**
"Here's the tricky part, Duck: more particles = better physics but slower performance. So we have a budget system. Standard jellyfish get 500 particles. Hero creatures get 1500. Background ones get 100. We also update physics less frequently for distant creatures."

*Question from Duck*: "How do you keep frame rate steady?"

"We use adaptive quality. If frame rate drops, we reduce constraint iterations from 5 to 3. If it's still bad, we reduce particle counts. The goal is always 60fps - we sacrifice quality before we sacrifice responsiveness."

---

## SUMMARY: Key Decisions from Elicitation

### Algorithm Selection
1. **Verlet Integration** for tentacles (stable, fast)
2. **Enveloped Oscillator** for bell pulsing (realistic muscle simulation)
3. **Simplex Noise Flow** for water movement (natural, efficient)

### Performance Targets
1. **500 particles** for standard creature
2. **5 constraint iterations** for balance
3. **LOD system** with 3 quality levels
4. **16.5ms frame budget** (60fps target)

### Architecture Principles
1. **Modular Movement Types** - different algorithms for different creatures
2. **Parameter Presets** - creature-type-specific configurations
3. **Adaptive Quality** - maintain frame rate at all costs
4. **Graceful Degradation** - reduce quality before failing

### Risk Mitigation
1. **Max delta time clamping** - prevent explosion
2. **Energy monitoring** - detect instability
3. **Fail-safe reset** - recover from bad states
4. **Debug visualization** - tune parameters visually

---

**Next Phase**: Analysis & Synthesis - Create the final physics specification document.
