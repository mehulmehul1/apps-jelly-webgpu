# STAGE 2: CROSS-DISCIPLINARY INTEGRATION
## Epic Jelly WebGPU - Unified Design Synthesis

**Date**: 2026-02-08
**Session**: epic_jelly_webgpu/crew/effects
**Stage**: 2 (Integration)
**Previous**: Stage 1 (Domain Brainstorming), Stage 1.5 (Revised Decisions)

---

## EXECUTIVE SUMMARY

This document synthesizes three major design domains—**Effects**, **Colors**, and **Geometry**—into a unified vision for the Epic Jelly WebGPU project. Through cross-disciplinary analysis, we identify synergies, resolve tensions, and establish implementation priorities.

### Key Integration Insights

1. **Material as Bridge**: Colors and Effects share the material system as their primary integration point
2. **Physics-Driven Effects**: Geometry's particle system directly enables effects (motion trails, wake, displacement)
3. **Hierarchical Influence**: Depth affects color, which affects visibility of effects
4. **Performance Compounding**: Effects, colors, and geometry all compete for GPU resources—unified budgeting required

---

## TABLE OF CONTENTS

1. [Domain Summaries](#domain-summaries)
2. [Cross-Domain Synergies](#cross-domain-synergies)
3. [Integration Matrix](#integration-matrix)
4. [Tension Resolution](#tension-resolution)
5. [Unified Architecture](#unified-architecture)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Performance Budget](#performance-budget)

---

## 1. DOMAIN SUMMARIES

### Effects Domain (138 ideas)

**Core Philosophy**: Effects create the "living dialogue" between creature and environment.

**Primary Categories**:
- Light Interaction (45): Caustics, bioluminescence, volumetric effects
- Particle Systems (30): Marine snow, bubbles, plankton
- Impossible Physics (25): Non-Newtonian fluids, time distortion
- Environmental Storytelling (20+): Abyssal layers, creature interaction

**Key Technical Approach**:
- WebGPU compute shaders for particle physics
- TSL (Three.js Shading Language) for material effects
- Hybrid volumetric rendering (ray-march + screen-space)

**Signature Effects**:
1. Dynamic caustics with velocity-based distortion
2. Bioluminescent language system (semantic patterns)
3. Surreal physics toggle (non-Newtonian modes)

### Colors Domain (110+ ideas)

**Core Philosophy**: Color is about the RELATIONSHIP between darkness and illumination—not individual hues.

**Primary Categories**:
- Bioluminescent Palettes (20): Luciferin blue-green, GFP, Atolla alarm
- Deep Sea Gradients (20): Epipelagic to hadal zones
- Fluorescence & Photoproteins (15): GFP, YFP, CFP variants
- Cultural & Regional Palettes (20): Japanese Edo, Caribbean, Synthwave

**Key Technical Approach**:
- Pre-baked gradient textures for performance
- HDR (scRGB) for internal rendering
- Palette switching system with user customization

**Recommended Default**: "Luciferin Blue-Green"
```
BASE: #00CED1 (Dark Turquoise)
GLOW: #7FFFD4 (Aquamarine, HDR 2.0-5.0)
ACCENT: #00FA9A (Medium Spring Green)
SHADOW: #191970 (Midnight Blue)
VOID: #000033 (Very dark blue)
```

### Geometry Domain (247 ideas)

**Core Philosophy**: Modularity encodes biological design principles for emergent complexity.

**Primary Categories**:
- Atomic Parts (70): Particles, constraints, geometric primitives
- Connection Systems (65): Topology, attachment protocols
- Parametric Modules (92): Body plans, profiles, cross-sections
- Fractal Modularity (47): Recursive patterns, self-similarity

**Key Technical Approach**:
- Position-Based Dynamics (PBD) for soft-body simulation
- Radial rib structure with spine connections
- Superformula cross-sections for variety
- L-System emitters for tentacle arrangement

**Core ADR**: Particle-based geometry with radial rib structure

---

## 2. CROSS-DOMAIN SYNERGIES

### Synergy 1: Material = Color × Effect

**Integration Point**: TSL material nodes combine color palettes with effect shaders.

**Concrete Implementation**:
```typescript
// Unified material architecture
class BioluminescentGelMaterial extends InterpolatedNodeMaterial {
  // Color domain
  paletteUniform: uniform(new JellyPalette('luciferin_blue_green'));

  // Effect domain
  causticModule: new CausticProjectionModule();
  pulseModule: new BioluminescentPulseModule();
  volumetricModule: new VolumetricGlowModule();

  setupNode() {
    return this.volumetricModule.createNode(
      this.causticModule.createNode(
        this.pulseModule.createNode(
          this.paletteUniform
        )
      )
    );
  }
}
```

**Benefits**:
- Single shader pass handles color + effects
- Palette changes automatically update all effects
- Composable effect modules

### Synergy 2: Geometry Drives Effects

**Integration Point**: Particle positions and velocities directly inform effect parameters.

**Effect-Geometry Coupling Table**:

| Effect | Geometry Input | Visual Result |
|--------|---------------|---------------|
| Marine Snow Push | Particle velocity field | Snow pushed by jelly motion |
| Bioluminescent Trail | Position history | Glowing path follows movement |
| Wake Distortion | Velocity magnitude | Water displacement behind creature |
| Caustic Interaction | Surface normal deviation | Caustics bend around body |
| Bubble Displacement | Tentacle tip positions | Bubbles spawn from tips |

**Implementation**:
```typescript
// Geometry → Effect data flow
class JellyfishEffectsBridge {
  constructor(private jellyfish: JellyfishSystem) {}

  getVelocityAtPoint(point: Vector3): Vector3 {
    // Sample velocity field from particle system
    return this.jellyfish.physicsSystem.getVelocityNear(point);
  }

  getPositionHistory(): Vector3[] {
    // Track spine positions for trail effect
    return this.jellyfish.spineParticles.map(p => p.position);
  }

  getTentacleTipPositions(): Vector3[] {
    // Return all tentacle end points
    return this.jellyfish.tentacles.map(t => t.tipPosition);
  }
}
```

### Synergy 3: Depth Gradient Integration

**Integration Point**: All three domains respond to depth (Y-position) in coordinated way.

**Depth-Driven Behavior**:

```
SURFACE (Y = +50m)
├─ Color: Sky blue (#87CEEB), natural light
├─ Effects: Strong caustics, minimal bioluminescence
└─ Geometry: Full extension, active swimming

TWILIGHT ZONE (Y = 0m to -200m)
├─ Color: Blue fade, bioluminescence emerges
├─ Effects: Balanced caustics + bio glow
└─ Geometry: Moderate extension, mixed activity

MIDNIGHT ZONE (Y = -200m to -1000m)
├─ Color: Deep blue (#191970), primary bioluminescence
├─ Effects: Caustics gone, bio glow dominant
└─ Geometry: Contracted, energy conservation

ABYSS (Y = -1000m to -4000m)
├─ Color: Near black (#000033), bioluminescence primary
├─ Effects: No caustics, localized bio sources
└─ Geometry: Minimal movement, ambush posture

HADAL (Y < -4000m)
├─ Color: Complete darkness, rare bioluminescence
├─ Effects: Thermal vent glow only
└─ Geometry: Crushed depth posture
```

### Synergy 4: Animation Coordination

**Integration Point**: Color pulse, geometry contraction, and effects trigger synchronize.

**Unified Animation Timeline**:
```
T = 0.0s: Contraction begins
├─ Geometry: Rib constraints tighten (radius ↓)
├─ Color: Pulse intensity increases (I = sin(ωt))
└─ Effects: Wake particles spawn, bubble release

T = 0.5s: Maximum contraction
├─ Geometry: Minimum bell radius
├─ Color: Peak brightness (HDR 5.0)
└─ Effects: Bioluminescent burst

T = 1.0s: Relaxation begins
├─ Geometry: Rib constraints loosen (radius ↑)
├─ Color: Pulse fades (I = sin(ωt + π))
└─ Effects: Marine snow settles

T = 2.0s: Return to resting
├─ Geometry: Natural resting radius
├─ Color: Base bioluminescence (HDR 1.0)
└─ Effects: Ambient particle drift
```

---

## 3. INTEGRATION MATRIX

### Effect × Color × Geometry Combinations

This matrix identifies promising (✓) and problematic (✗) combinations.

```
                    ┌─────────────────────────────────────────────────────┐
                    │         COLOR DOMAINS (Primary Palettes)            │
                    ├──────────┬──────────┬──────────┬──────────┬────────┤
                    │ Luciferin│ Atolla   │ Comb     │ Aphotic  │ Custom │
EFFECTS             │ Blue-Green│ Red Alarm│ Rainbow  │ Depth    │        │
├───────────────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ Caustics          │    ✓     │    ✓     │    ✓     │    -     │   ✓    │
│ Volumetric Glow   │    ✓     │    ✓     │    ✗     │    ✓     │   ✓    │
│ Bioluminescence   │    ✓     │    ✓✓     │    -     │    ✓     │   ✓    │
│ Marine Snow       │    ✓     │    ✓     │    ✓     │    ✓✓     │   ✓    │
│ Bubbles           │    ✓     │    ✓     │    ✓     │    ✓     │   ✓    │
│ Plankton          │    ✓     │    ✓     │    ✓     │    ✓     │   ✓    │
│ Impossible Physics│    ✓     │    ✗     │    ✓✓     │    ✓     │   ✓    │
│ Time Distortion   │    ✓     │    ✓     │    ✓✓     │    ✓     │   ✓    │
├───────────────────┼──────────┼──────────┼──────────┼──────────┼────────┤
GEOMETRY            │          │          │          │          │        │
├───────────────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ Medusa (Standard) │    ✓✓     │    ✓     │    ✓     │    ✓     │   ✓    │
│ Comb Jelly        │    ✓     │    ✗     │    ✓✓✓     │    -     │   ✓    │
│ Siphonophore      │    ✓     │    ✓     │    ✓     │    ✓     │   ✓    │
│ Anemone           │    ✓     │    ✓     │    ✓     │    ✓     │   ✓    │
│ Colonial Forms    │    ✓     │    ✓✓     │    ✓     │    ✓     │   ✓    │
│ Exotic Shapes     │    ✓     │    ✓     │    ✓✓     │    ✓     │   ✓✓    │
└───────────────────┴──────────┴──────────┴──────────┴──────────┴────────┘

Legend:
✓✓✓ = Excellent synergy (signature combination)
✓✓  = Strong synergy (recommended)
✓   = Compatible (works)
-    = Neutral (no strong opinion)
✗   = Problematic (avoid combination)
```

### Signature Combinations (Must-Have Experiences)

**1. "Abyssal Luminescence"**
- Geometry: Medusa (deep sea variant)
- Color: Aphotic Depth + Luciferin bioluminescence
- Effects: Volumetric god rays + marine snow depth layers
- Experience: Entering the deep void, creature becomes only light source

**2. "Rainbow Cascade"**
- Geometry: Comb Jelly
- Color: Comb Jelly Rainbow palette
- Effects: Iridescence caustics + impossible refraction
- Experience: Dreamlike, surreal, childhood wonder

**3. "Alarm Response"**
- Geometry: Medusa (standard)
- Color: Atolla Red Alarm mode
- Effects: Stress-response glow burst + bubble displacement
- Experience: Sudden, dramatic, predator-avoidance instinct

**4. "Victorian Cabinet"**
- Geometry: Medusa (scientific accuracy)
- Color: Victorian Aquarium palette
- Effects: Film grain + hand-tinted aesthetic
- Experience: Educational, nostalgic, museum diorama

**5. "Synthwave Deep"**
- Geometry: Exotic superformula shapes
- Color: Neon Cyberpunk palette
- Effects: Temporal distortion + reality glitches
- Experience: Retro-futuristic, ironic, aesthetic-first

---

## 4. TENSION RESOLUTION

### Tension 1: Realism vs. Magic

**Conflict**:
- Biologist stakeholder: "Accurate species simulation!"
- Artist stakeholder: "Emotional impact over accuracy!"
- Child stakeholder: "I want rainbow jellyfish!"

**Resolution**:分层实现 (Layered Implementation)

```
LAYER 1: Scientific Mode (Default)
├─ Geometry: Species-accurate body plans
├─ Color: Luciferin (realistic bioluminescence)
└─ Effects: Physics-based caustics, particle systems

LAYER 2: Enhanced Mode (Toggle)
├─ Geometry: Slight stylization (better silhouettes)
├─ Color: Enhanced saturation, HDR boost
└─ Effects: Added volumetric glow, bloom enhancement

LAYER 3: Fantasy Mode (Opt-in)
├─ Geometry: Impossible shapes, non-Euclidean
├─ Color: Full rainbow, user-defined
└─ Effects: Surreal physics, time distortion
```

### Tension 2: Performance vs. Visual Quality

**Conflict**:
- Engineer: "Pre-bake everything, minimize draw calls"
- Artist: "Real-time everything, maximum visual impact"

**Resolution**: Tiered Quality System

```
┌─────────────────────────────────────────────────────────┐
│ QUALITY TIER    │ EFFECTS    │ COLORS    │ GEOMETRY     │
├─────────────────────────────────────────────────────────┤
│ LOW (Integrated │ Screen-space│ Pre-baked  │ Reduced     │
│ GPU)            │ caustics   │ gradients  │ particle count│
├─────────────────────────────────────────────────────────┤
│ MEDIUM (Discrete│ Volumetric │ Runtime    │ Full physics │
│ GPU)            │ god rays   │ animation  │ standard     │
├─────────────────────────────────────────────────────────┤
│ HIGH (Desktop)  │ Ray-marched│ Full HDR   │ +volumetric  │
│                 │ volumetrics│ color space│ effects      │
├─────────────────────────────────────────────────────────┤
│ ULTRA (Enthusiast│ Multi-scatter│ Wide     │ +impossible │
│ w/ RTX)         │ volumetrics│ gamut      │ physics      │
└─────────────────────────────────────────────────────────┘
```

### Tension 3: Color Theory vs. Bioluminescent Physics

**Conflict**:
- Color theory: "Complementary colors for contrast!"
- Biology: "Bioluminescence peaks at 475-495nm (blue-green only!)"

**Resolution**: Accent Color Strategy

```
BASE: Biologically accurate (475-495nm blue-green)
      └─ Represents actual luciferin chemistry

ACCENT: Artistic choice (warm contrast)
      └─ Coral, thermal vents, predator warnings

GLOW: Enhanced but grounded
      └─ Blue-green with HDR intensity boost (2.0-5.0)

ALERT: Biologically justified exceptions
      └─ Atolla red alarm (real species behavior)
      └─ Comb jelly rainbow (diffraction, not bioluminescence)
```

### Tension 4: Modular Geometry vs. Cohesive Animation

**Conflict**:
- Modularity: "Combine any parts!"
- Animation: "Each body plan needs unique animation!"

**Resolution**: Animation Profiles per Body Plan

```typescript
// Body plan dictates animation constraints
interface BodyPlanProfile {
  pulsePattern: PulseFunction;      // How it contracts
  tentacleMotion: TentacleFunction; // How tentacles move
  swimmingMode: SwimmingFunction;   // How it propels
  bioluminescencePattern: BioFunction; // How it lights up
}

// Medusa profile
const MEDUSA_PROFILE: BodyPlanProfile = {
  pulsePattern: sinusoidalPulse(0.5, 2.0),      // 0.5-2.0 Hz
  tentacleMotion: dragFlowMotion,               // Follow water
  swimmingMode: jetPropulsion,                  // Contraction-based
  bioluminescencePattern: contractionSync,       // Pulse-synced
};

// Comb jelly profile (no pulse)
const COMB_PROFILE: BodyPlanProfile = {
  pulsePattern: noPulse,                        // No contraction
  tentacleMotion: ciliaryBeat,                  // Constant wave
  swimmingMode: ciliaryPropulsion,              // Beat-based
  bioluminescencePattern: diffractionFlash,      // Motion-triggered
};
```

---

## 5. UNIFIED ARCHITECTURE

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      EPIC JELLY UNIFIED SYSTEM                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   INPUT      │      │   SIMULATION │      │   RENDERING  │  │
│  │   LAYER      │─────▶│   LAYER      │─────▶│   LAYER      │  │
│  │              │      │              │      │              │  │
│  │ • User       │      │ • Physics    │      │ • Materials  │  │
│  │ • Time       │      │ • Animation  │      │ • Effects    │  │
│  │ • Audio      │      │ • AI         │      │ • Post-Proc  │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  SHARED STATE                            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │ Palette  │ │Geometry  │ │ Effect   │ │  Depth   │   │  │
│  │  │ Registry │ │   Cache  │ │  Queue   │ │  State   │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 CROSS-DOMAIN APIS                         │  │
│  │                                                          │  │
│  │  getPaletteAtDepth(depth)           → Color             │  │
│  │  getGeometryForBodyPlan(plan)        → Geometry          │  │
│  │  getEffectsForQuality(tier)          → Effects           │  │
│  │  getAnimationState(time)             → All domains       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Material System Integration

```typescript
// Unified material combining all domains
class UnifiedJellyMaterial {
  // Color domain
  private palette: JellyPalette;
  private depthGradient: GradientTexture;

  // Effect domain
  private causticProjection: CausticModule;
  private bioluminescence: BioluminescenceModule;
  private volumetricGlow: VolumetricModule;

  // Geometry domain integration
  private positionHistory: PositionHistoryAttribute;
  private velocityField: VelocityAttribute;

  constructor(config: UnifiedConfig) {
    this.palette = config.palette || new LuciferinPalette();
    this.depthGradient = new DepthGradientTexture();

    this.causticProjection = new CausticModule({
      intensity: config.causticIntensity || 0.5,
      distortion: config.causticDistortion || true,
    });

    this.bioluminescence = new BioluminescenceModule({
      color: this.palette.glowColor,
      pulseFrequency: config.pulseFrequency || 1.0,
      intensity: config.glowIntensity || 2.0,
    });

    this.volumetricGlow = new VolumetricModule({
      density: config.glowDensity || 0.3,
      scatterColor: this.palette.glowColor,
    });
  }

  // Depth-aware color calculation
  getColorAtDepth(depth: number, baseColor: Color): Color {
    const surfaceColor = this.palette.surfaceColor;
    const deepColor = this.palette.deepColor;
    const t = this.depthGradient.getT(depth);
    return surfaceColor.clone().lerp(deepColor, t);
  }

  // Geometry-informed effects
  getEffectIntensity(velocity: Vector3): number {
    // Faster movement = stronger effects
    return velocity.length() * this.effectMultiplier;
  }

  // Build TSL node graph
  buildNode(): Node {
    return Fn(() => {
      // 1. Get base color from palette
      const baseColor = this.palette.getBaseColor();

      // 2. Apply depth gradient
      const depthColor = this.getColorAtDepth(positionWorld.y, baseColor);

      // 3. Apply caustic projection
      const withCaustics = this.causticProjection.apply(depthColor);

      // 4. Apply bioluminescence
      const withBio = this.bioluminescence.apply(withCaustics);

      // 5. Apply volumetric glow
      const final = this.volumetricGlow.apply(withBio);

      return final;
    })();
  }
}
```

### Effect Bridge System

```typescript
// Connects geometry simulation to effect rendering
class EffectBridge {
  private jellyfishSystem: JellyfishSystem;
  private particleSystem: ParticleEffectSystem;
  private postProcessing: JellyfishPostProcessing;

  // Update effects based on geometry state
  update(delta: number): void {
    const velocityField = this.jellyfishSystem.getVelocityField();
    const positions = this.jellyfishSystem.getPositions();
    const pulsePhase = this.jellyfishSystem.getPulsePhase();

    // Marine snow responds to jellyfish motion
    this.particleSystem.updateMarineSnow(velocityField);

    // Bubbles spawn from tentacle tips during pulse
    if (pulsePhase > 0.8) {
      const tips = this.jellyfishSystem.getTentacleTips();
      this.particleSystem.spawnBubbles(tips);
    }

    // Wake distortion follows movement path
    this.postProcessing.updateWakeDistortion(positions);

    // Bioluminescence syncs with pulse
    this.postProcessing.updateBioluminescence(pulsePhase);
  }
}
```

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Foundation Integration (Week 1-2)

**Goal**: Basic cross-domain communication working

```
Week 1: Core Integration
├─ [ ] Create UnifiedJellyMaterial class
├─ [ ] Implement depth gradient system
├─ [ ] Connect geometry pulse to color intensity
├─ [ ] Basic particle effects (marine snow)
└─ [ ] Post-processing pipeline (bloom + vignette)

Week 2: Effects Layer
├─ [ ] Screen-space caustics
├─ [ ] Bioluminescent pulse animation
├─ [ ] Bubble displacement system
├─ [ ] Wake distortion effect
└─ [ ] Effect bridge implementation
```

### Phase 2: Signature Experiences (Week 3-4)

**Goal**: Five signature combinations fully implemented

```
Week 3: Signature 1-2
├─ [ ] "Abyssal Luminescence" complete
│   ├─ Medusa geometry + Luciferin palette
│   ├─ Volumetric god rays + marine snow layers
│   └─ Depth-triggered behavior
├─ [ ] "Rainbow Cascade" complete
│   ├─ Comb jelly geometry + rainbow palette
│   ├─ Iridescence caustics + impossible refraction
│   └─ Diffraction-based animation
└─ [ ] Quality tier system working

Week 4: Signature 3-5
├─ [ ] "Alarm Response" complete
├─ [ ] "Victorian Cabinet" complete
├─ [ ] "Synthwave Deep" complete
├─ [ ] Palette switching UI
└─ [ ] Effect toggles (on/off per effect)
```

### Phase 3: Advanced Integration (Week 5-6)

**Goal**: Impossible physics and advanced effects

```
Week 5: Surreal Layer
├─ [ ] Non-Newtonian water zones
├─ [ ] Time dilation effects
├─ [ ] Temporal echo trails
├─ [ ] Impossible geometry rendering
└─ [ ] Reality glitch effects

Week 6: Polish
├─ [ ] Performance profiling
├─ [ ] Effect parameter tuning
├─ [ ] User preset system
├─ [ ] Accessibility testing
└─ [ ] Documentation
```

---

## 7. PERFORMANCE BUDGET

### Unified GPU Budget (1080p @ 60fps target)

```
┌─────────────────────────────────────────────────────────┐
│ CATEGORY          │ BUDGET       │ ALLOCATION           │
├─────────────────────────────────────────────────────────┤
│ Geometry Physics  │ 3.0 ms       │ PBD solver           │
│ Geometry Render   │ 2.0 ms       │ Mesh draw calls      │
│ Material Shaders  │ 4.0 ms       │ TSL evaluation       │
│ Particle Effects  │ 5.0 ms       │ Compute + render     │
│ Post-Processing   │ 4.0 ms       │ Bloom + effects      │
│ Volumetric        │ 2.0 ms       │ God rays (hybrid)    │
│ Overhead          │ 2.0 ms       │ State sync           │
├─────────────────────────────────────────────────────────┤
│ TOTAL             │ 22.0 ms      │ (60fps = 16.6ms!)    │
└─────────────────────────────────────────────────────────┘

ADJUSTMENT: Reduce quality or increase budget
→ Target: 30fps for integrated scene (33.3ms budget)
→ Or: Quality tier system
```

### Tiered Performance Targets

```
┌──────────────────────────────────────────────────────────────┐
│ TIER     │ GPU           │ TARGET FPS  │ EFFECTS    │ GEO     │
├──────────────────────────────────────────────────────────────┤
│ LOW      │ Integrated    │ 30 fps      │ Screen-space│ 500     │
│ MEDIUM   │ Discrete      │ 60 fps      │ 1-2 rays   │ 2000    │
│ HIGH     │ GTX 1660      │ 60 fps      │ 4-8 rays   │ 5000    │
│ ULTRA    │ RTX 3060+     │ 60+ fps     │ Full       │ 10000+  │
└──────────────────────────────────────────────────────────────┘
```

### Cross-Domain Optimization Strategies

1. **Shared Textures**: Caustic texture reused by all materials
2. **Compute Batching**: All particle systems in single compute pass
3. **LOD System**: Geometry and effects reduce together at distance
4. **Effect Culling**: Disable off-screen effects
5. **Temporal Upscaling**: Render effects at 1/2 resolution
6. **GPU-Driven Animation**: minimize CPU-GPU sync

---

## 8. SUCCESS METRICS

### Cross-Domain Integration Success

**Visual Cohesion**:
- [ ] Color palette changes update all effects automatically
- [ ] Geometry motion feels connected to particle effects
- [ ] Depth transitions are smooth across all domains
- [ ] Signature combinations create distinct, recognizable moods

**Technical Quality**:
- [ ] No visible seams between domain boundaries
- [ ] Performance budget balanced (no single domain dominates)
- [ ] Quality tiers provide clear visual differences
- [ ] User can understand relationships (e.g., "deeper = darker + bioluminescence")

**User Experience**:
- [ ] Palette selection is instant (< 100ms)
- [ ] Effect toggles provide immediate feedback
- [ ] Combinations feel curated, not random
- [ ] Advanced options available but not overwhelming

---

## 9. NEXT STEPS

1. **Review this document** with colors and geometry crews
2. **Create integration prototype** demonstrating one signature combination
3. **Establish shared data structures** for cross-domain communication
4. **Define API contracts** between systems
5. **Implement Phase 1** foundation integration

---

## APPENDIX: QUICK REFERENCE

### Color Palette Quick Switch

```typescript
// Palette switching updates everything
jellyfishMaterial.setPalette('atolla_alarm');
// → Automatically updates:
//   - Base color, glow color, rim color
//   - Bioluminescent intensity curve
//   - Alarm flash behavior
//   - Effect color parameters
```

### Effect Module Composition

```typescript
// Add/remove effects dynamically
jellyfishMaterial.addEffect(new VolumetricGlowModule());
jellyfishMaterial.removeEffect('causticProjection');
jellyfishMaterial.setEffectEnabled('bioluminescence', false);
```

### Depth-Based Behavior

```typescript
// Depth automatically affects all domains
jellyfishSystem.depth = -500; // Midnight zone
// → Colors shift to deep blue
// → Caustics fade
// → Bioluminescence intensifies
// → Geometry contracts slightly
```

---

**END OF STAGE 2 INTEGRATION DOCUMENT**

**Status**: Ready for review and implementation
**Dependencies**: Stage 1 (Effects, Colors, Geometry brainstorming)
**Next**: Phase 1 implementation (Foundation Integration)
