# Stage 2: Cross-Disciplinary Integration
## Abyssal Genesis - Generative Jellyfish WebGPU

**Generated**: 2026-02-08
**Leg**: hq-leg-forms-integration
**Status**: COMPLETE
**Author**: Form & Shape Grammar Designer (forms crew)

---

## EXECUTIVE SUMMARY

This document synthesizes findings from **8 Stage 1 specialist perspectives** into a unified implementation roadmap for the Abyssal Genesis generative art project.

**Specialist Contributions Synthesized**:
- Forms (taxonomic + mathematical perspectives): 10 form categories
- Geometry: 35+ primitives, 330+ brainstorming ideas
- Shaders: 150+ TSL patterns
- Bioluminescence: 20+ glow patterns
- Physics: 210 ideas, 10 movement types
- Effects: 210 ideas, particle systems
- Colors: 110+ concepts, 7 palettes

**Key Integration Insights**:
1. **Creature architecture is modular**: Body geometry, surface features, appendages, and materials are independent but must interface cleanly
2. **The LookConfig system is the unifying layer**: Colors, materials, bioluminescence, and animation all route through this interface
3. **Performance budgets cascade**: Geometry → particles → post-processing, each layer has diminishing budget
4. **Movement drives form**: Different propulsion mechanisms (jet-pulse, comb-row, undulation) dictate body shape constraints

---

## 1. STRATEGIC FRAMEWORK (from Stage 1.5 REVISED)

### Expansive Generative Art Strategy

**Original constraint**: 5 archetypes
**REVISED approach**: 12-15 archetypes spanning 3 classification tiers

### Three-Phase Classification System

```
PHASE 1: Core Body Plans (4 types)
├── Medusa (bell jellyfish)
├── CombJelly (ctenophores)
├── Siphonophore (colonial organisms)
└── Salp (barrel-shaped)

PHASE 2: Morphological Variations (4-5 types)
├── Disc-shaped medusae (Moon jellyfish)
├── Dome-shaped medusae (Sea nettle)
├── Cube-shaped medusae (Box jellyfish)
├── Ribbon siphonophores
└── Tubular salps

PHASE 3: Specialized Exotica (4-6 types)
├── Deep-sea giants (giant siphonophores)
├── Bioluminescent displays (Atolla jellyfish)
├── Colonial architectures (Portuguese man o' war)
├── Asymmetrical forms (narcomedusae)
├── Hybrid geometries (cross-body-plan combinations)
└── User-discovered forms (via fxhash evolution)
```

### Open-Ended Creative Approach

- **NOT a closed taxonomy**: The 12-15 archetypes are starting points, not boundaries
- **Parameter ranges**: Each archetype has min/max ranges that allow for significant variation
- **Hybridization encouraged**: The modular architecture supports combining features across body plans
- **Evolutionary mechanics**: fxhash open-form API enables users to discover novel forms

---

## 2. UNIFIED TYPE ARCHITECTURE

### Master Interface Chain

```typescript
// Top-level configuration (fxhash-facing)
interface GenerativeCreatureSpec {
  // Evolution tracking
  lineage: {
    hash: string;           // From $fx.hash
    depth: number;          // From $fx.depth
    parentHash?: string;    // From $fx.lineage
    mutationType: string;
  };

  // Body plan selection
  bodyPlan: BodyPlan;

  // Core configuration
  geometry: GeometryModuleConfig;
  physics: PhysicsConfig;
  look: LookConfig;

  // Generative parameters (fxhash-exposed)
  parameters: {
    // Geometry mutations
    bodySize: number;           // 0.0-1.0, scales entire creature
    bodyProportion: number;     // 0.0-1.0, height:width ratio
    radialSymmetry: number;     // 3-12, number of radial segments
    elongationFactor: number;   // 0.0-1.0, stretches along Y

    // Surface mutations
    surfaceComplexity: number;  // 0.0-1.0, ridges/frills density
    roughness: number;          // 0.0-1.0, surface texture
    transparency: number;       // 0.0-1.0, material opacity

    // Bioluminescence
    bioIntensity: number;       // 0.0-1.0, glow strength
    bioPattern: number;         // 0-6, pattern type index
    bioColor: vec3;            // Glow color

    // Movement
    pulseSpeed: number;         // 0.0-1.0, animation frequency
    movementType: number;       // 0-3, propulsion pattern

    // Appendages
    tentacleCount: number;      // 0-100, number of tentacles
    tentacleLength: number;     // 0.0-1.0, relative length
    tentacleType: number;       // 0-4, tentacle morphology
  };
}

// Geometry configuration (from geometry synthesis)
interface GeometryModuleConfig {
  body: {
    module: 'bell' | 'egg' | 'barrel' | 'tube' | 'ribbon' | 'disc';
    parameters: BodyGeometryParams;
  };

  surface: {
    ridges?: RidgeConfiguration;
    frills?: FrillConfiguration;
    texture?: SurfaceTextureConfiguration;
  };

  appendages: AppendageConfiguration;
}

// Physics configuration (from physics synthesis)
interface PhysicsConfig {
  particles: {
    bellCount: number;
    tentacleCount: number;
    tentacleGroups: number;
  };
  movement: MovementConfig;
  tentacles: TentaclePhysicsConfig;
  flow: FlowFieldConfig;
  performance: PerformanceConfig;
}

// Look configuration (from shaders + colors synthesis)
interface LookConfig {
  id: string;
  displayName: string;
  category: 'realistic' | 'artistic' | 'experimental';

  colors: {
    primary: vec3;
    secondary: vec3;
    biolume: vec3;
    accent: vec3;
    rim: vec3;
    alarm: vec3;
  };

  material: {
    transmission: number;
    subsurfaceScattering: number;
    iridescence: number;
    roughness: number;
    metalness: number;
    opacity: number;
  };

  bioluminescence: {
    enabled: boolean;
    pattern: BioluminescentPattern;
    pulseFrequency: number;
    intensity: number;
  };

  animation: {
    breathingSpeed: number;
    undulationFrequency: number;
    driftAmount: number;
  };

  postProcessing: PostProcessingConfig;
}

// Bioluminescence pattern (from bioluminescence synthesis)
interface BioluminescentPattern {
  type: PatternType;
  location: GlowLocation;
  animation: AnimationBehavior;
  color: ColorSpecification;
  intensity: IntensityProfile;
  synchronization: SyncBehavior;
}

type PatternType =
  | 'point_source'
  | 'diffuse_glow'
  | 'linear_pattern'
  | 'radial_burst'
  | 'wave_propagation'
  | 'spiral_vortex'
  | 'surface_patch'
  | 'volume_fill'
  | 'edge_glow'
  | 'internal_structural';

type GlowLocation =
  | 'margin'
  | 'body'
  | 'tentacles'
  | 'oral_arms'
  | 'comb_rows'
  | 'scattered'
  | 'internal';
```

---

## 3. FORM-TO-GEOMETRY MAPPING

### 10 Form Categories → 35 Geometry Primitives

| Form Category | Primary Geometry | Modifiers | Cross-Section |
|--------------|------------------|-----------|---------------|
| **Bell/Domed** | BellModule | RibCount, RimVariation | Circle → Ellipse |
| **Egg/Oval** | EggModule | AspectRatio, Taper | Ellipse (constant ratio) |
| **Barrel/Cylindrical** | BarrelModule | MuscleBands, Ribbing | Circle with periodic variation |
| **Tubular/Elongated** | TubeModule | Taper, BendRadius | Circle with radius gradient |
| **Ribbon/Flat** | RibbonModule | WidthProfile, EdgeWave | Rectangle/Flattened ellipse |
| **Disc/Saucer** | DiscModule | ThicknessProfile, EdgeCurled | Flattened ellipse |
| **Sphere/Global** | SphereModule | Dent/Bulge array | Circle with radial variation |
| **Vase/Amphora** | VaseModule | NeckFlare, ShoulderCurve | Circle with complex profile |
| **Star/Radial** | StarModule | ArmCount, ArmLength | Superformula (m=5-8) |
| **Colony/Chain** | ColonyModule | ZooidConfig, StemCurve | Multiple per unit |

### Profile Curve Synthesis

**From forms synthesis (taxonomic)**: Visual profiles for each form
**From forms synthesis (mathematical)**: Procedural generation methods
**From geometry synthesis**: Rib-based construction system

**Integrated Approach**:

```typescript
interface ProfileSynthesis {
  // Visual profile (taxonomic perspective)
  shape: {
    silhouette: 'bell' | 'egg' | 'barrel' | 'tube' | 'ribbon' | 'disc';
    aspectRatio: number;        // height:width
    majorAxis: number;          // size
  };

  // Procedural profile (mathematical perspective)
  procedural: {
    functionType: 'superformula' | 'parametric' | 'spline';
    params: Map<string, number>;
    controlPoints?: Vector2[];  // For spline-based
  };

  // Rib-based construction (geometry synthesis)
  construction: {
    ribCount: number;           // 12-28 for balance
    ribSpacing: 'uniform' | 'variable';
    ribProfile: (t: number) => number;  // Radius at height t
  };
}
```

### Example: Bell Profile Integration

```typescript
// Visual taxonomy: Bell form with slight dome
const bellTaxonomic = {
  shape: 'bell',
  aspectRatio: 0.7,
  majorAxis: 1.0
};

// Mathematical representation: Parametric curve
const bellMathematical = {
  functionType: 'parametric',
  params: {
    domeFactor: 0.3,      // Curvature at top
    flareFactor: 0.8,     // Rim flare
    taperFactor: 0.5      // Base constriction
  },
  controlPoints: [
    [0, 1.0],   // Top center
    [0.3, 0.9], // Upper dome
    [0.7, 0.7], // Mid-body
    [1.0, 0.5], // Rim
    [0.8, 0.3], // Sub-umbrella
    [0.3, 0.1], // Base
    [0, 0]      // Bottom center
  ]
};

// Rib construction
const bellGeometry = {
  ribCount: 18,
  ribSpacing: 'variable',  // Closer at rim for detail
  ribProfile: (t: number) => {
    // t: 0 (top) to 1 (bottom)
    const dome = Math.sin(t * Math.PI * 0.5) * bellMathematical.params.domeFactor;
    const baseCurve = bellMathematical.params.controlPoints;
    // Interpolate through control points...
    return radius;
  }
};
```

---

## 4. SURFACE FEATURES SYNTHESIS

### Forms + Geometry + Shaders + Bioluminescence

Surface features involve multiple specialist perspectives:

**From forms**: Ridges, frills, papillae, warts, striations
**From geometry**: Surface modulation primitives
**From shaders**: Normal maps, displacement patterns
**From bioluminescence**: Photophore placement, glow patterns
**From physics**: Flow response, turbulence effects

### Integrated Surface Configuration

```typescript
interface SurfaceFeatureSynthesis {
  // Geometry-level modulation
  geometry: {
    ridges?: {
      count: number;           // From forms symmetry analysis
      height: number;          // 0.0-1.0
      profile: 'rounded' | 'sharp' | 'asymmetric';
      distribution: 'uniform' | 'clustered' | 'spiral';
    };

    frills?: {
      count: number;
      length: number;
      wavePattern: 'flat' | 'wavy' | 'ruffled';
      attachmentPoint: 'margin' | 'sub-umbrella';
    };

    texture?: {
      type: 'cellular' | 'woven' | 'papillate' | 'smooth';
      scale: number;           // 0.0-1.0
      displacement: number;    // 0.0-1.0
    };
  };

  // Shader-level enhancement
  shader: {
    normalMap?: string;        // Procedural generation ID
    displacementMap?: string;
    roughnessMap?: string;
    iridescence?: {
      enabled: boolean;
      intensity: number;       // Fresnel power
      colors: vec3[];          // Rainbow spectrum
    };
  };

  // Bioluminescence integration
  bioluminescence: {
    photophores?: {
      distribution: 'surface_scattered' | 'ridge_mounted' | 'patterned';
      density: number;         // Photophores per unit area
      synchronization: number; // 0-1
    };

    edgeGlow?: {
      enabled: boolean;
      fresnel: boolean;        // View-dependent
      color: vec3;
      intensity: number;
    };
  };
}
```

### Creature-Specific Surface Patterns

| Creature Type | Geometry Features | Shader Enhancement | Bioluminescence |
|--------------|-------------------|-------------------|-----------------|
| **Comb Jelly** | 8 longitudinal ridges | Rainbow iridescence | Triggered flash cells |
| **Moon Jelly** | Smooth, subtle margin | Subsurface scattering | None |
| **Sea Nettle** | Frilly margin | Papillate normal map | Marginal glow points |
| **Box Jelly** | 4 pedalia corners | Clean, minimal | Pattern warning glow |
| **Atolla** | Deep red body | Dark absorption | Blue alarm flash |
| **Siphonophore** | Colony units | Modular shading | Chain activation |
| **Ribbon** | Internal striations | Fresnel edge | Edge line glow |

---

## 5. APPENDAGE ARCHITECTURE

### Forms + Physics + Particles + Geometry

Appendages (tentacles, oral arms, filaments) require cross-domain integration:

**From forms**: Tentacle types (thin, oral, frilly, coiled, rigid, ventral, trailing)
**From geometry**: Tentacle chain generation parameters
**From physics**: Stiffness, damping, drag, wave patterns
**From particles**: Particle-based vs. geometry-based rendering

### Unified Appendage System

```typescript
interface AppendageSynthesis {
  groups: AppendageGroup[];
}

interface AppendageGroup {
  // Taxonomic classification
  type: TentacleType;

  // Geometry configuration
  geometry: {
    count: number;
    segmentCount: number;
    segmentLength: number;
    massDistribution: 'uniform' | 'tapered' | 'weighted-tail';
    crossSection: 'circle' | 'flat' | 'star';
  };

  // Physics parameters
  physics: {
    stiffness: number;        // 0.001-0.5
    damping: number;          // 0.8-0.99
    drag: number;             // 0.8-0.99
    bendingLimit?: number;    // Radians
    gravity: number;
    buoyancy: number;
  };

  // Animation behavior
  animation: {
    type: 'passive' | 'undulation' | 'active';
    waveFrequency: number;    // Hz
    waveAmplitude: number;
    waveSpeed: number;
    metachronal?: {
      phaseOffset: number;
      direction: 'forward' | 'reverse';
    };
  };

  // Visual rendering
  rendering: {
    method: 'geometry' | 'particles' | 'hybrid';
    particleCount?: number;   // If particle-based
    thickness: number;
    material: LookConfig;
  };
}

type TentacleType =
  | 'thin_thread'      // Long, flowing, minimal stiffness
  | 'oral_arm'         // Thick, frilly, medium stiffness
  | 'frilly'           // Very flexible, chaotic motion
  | 'coiled_spiral'    // Stiff, maintains helix shape
  | 'comb_row'         // Very stiff, metachronal wave
  | 'rigid_spine'      // Nearly rigid, follows body
  | 'ventral_filament' // Very thin, rippling
  | 'trailing'         // Streamlined, minimal drag
  | 'pedalium'         // Cluster base for box jellies
  | 'stem';            // Siphonophore connecting stem
```

### Example: Oral Arms Configuration

```typescript
const oralArmsConfig: AppendageGroup = {
  type: 'oral_arm',

  geometry: {
    count: 4,              // 4 oral arms
    segmentCount: 40,
    segmentLength: 0.8,
    massDistribution: 'tapered',
    crossSection: 'flat'   // Ribbon-like
  },

  physics: {
    stiffness: 0.15,       // Flexible but not chaotic
    damping: 0.95,
    drag: 0.92,            // More drag than tentacles
    bendingLimit: Math.PI / 3,
    gravity: 0.05,
    buoyancy: 0.03
  },

  animation: {
    type: 'undulation',
    waveFrequency: 0.8,
    waveAmplitude: 0.4,
    waveSpeed: 1.2
  },

  rendering: {
    method: 'particles',   // Particle-based for soft look
    particleCount: 800,    // Per arm
    thickness: 0.3,
    material: 'oralArmMaterial'  // From LookConfig
  }
};
```

---

## 6. COLOR-MATERIAL-BIOLUMINESCENCE INTEGRATION

### Shaders + Colors + Bioluminescence + Effects

The visual appearance integrates four specialist domains:

**From shaders**: TSL material patterns (150+ patterns cataloged)
**From colors**: Palette architecture, 7 curated palettes, WGSL structs
**From bioluminescence**: Glow patterns, photophore behaviors
**From effects**: Post-processing chains, bloom, vignette

### Unified Look System

```typescript
interface LookSynthesis {
  // Palette selection (from colors synthesis)
  palette: {
    id: 'luciferin' | 'atolla_alarm' | 'comb_diffraction' |
        'aphotic_depth' | 'gfp_classic' | 'coral_reef' | 'neon_cyberpunk';
    custom?: {
      bodyTint: vec3;
      glowColor: vec3;
      rimColor: vec3;
      alarmColor: vec3;
    };
  };

  // Material properties (from shaders synthesis)
  material: {
    transmission: number;      // 0.0-1.0
    subsurfaceScattering: number; // 0.0-1.0
    iridescence: number;       // 0.0-1.0
    roughness: number;         // 0.0-1.0
    metalness: number;         // 0.0-1.0
    opacity: number;           // 0.0-1.0
  };

  // Shader pattern selection (from 150+ catalog)
  shaderPatterns: {
    translucency: ShaderPatternID;   // e.g., 'radial-translucent'
    bioluminescence: ShaderPatternID; // e.g., 'wave-propagation'
    iridescence: ShaderPatternID;    // e.g., 'fresnel-rainbow'
    animation: ShaderPatternID;      // e.g., 'pulse-sine'
  };

  // Bioluminescence configuration (from bioluminescence synthesis)
  bioluminescence: {
    enabled: boolean;
    pattern: BioluminescentPattern;
    pulse: {
      frequency: number;      // Hz
      amplitude: number;      // 0.0-1.0
      synchronicity: number;  // 0.0-1.0
    };
  };

  // Post-processing (from effects synthesis)
  postProcessing: {
    bloom: {
      enabled: boolean;
      threshold: number;
      strength: number;
      radius: number;
      quality: 'low' | 'medium' | 'high' | 'adaptive';
    };
    vignette: {
      enabled: boolean;
      intensity: number;
      smoothness: number;
      color: vec3;
    };
    chromaticAberration?: {
      enabled: boolean;
      strength: number;
    };
    fog?: {
      enabled: boolean;
      density: number;
      color: vec3;
    };
  };
}

type ShaderPatternID =
  // Translucency patterns
  | 'radial-translucent' | 'depth-fog' | 'gradient-alpha' |
    'thickness-based' | 'fresnel-fade'

  // Bioluminescence patterns
  | 'wave-propagation' | 'pulse-sine' | 'spiral-vortex' |
    'neural-network' | 'clustered-glow' | 'traveling-pulse'

  // Iridescence patterns
  | 'fresnel-rainbow' | 'spectral-shift' | 'thin-film' |
    'angle-dependent' | 'chromatic-aberration'

  // Animation patterns
  | 'pulse-sine' | 'pulse-triangle' | 'breathing' |
    'metachronal-wave' | 'perlin-noise';
```

### WGSL Shader Integration (from colors synthesis)

The shader-level unification uses the `JellyPalette` struct:

```wgsl
struct JellyPalette {
    // Base colors
    body_tint: vec3<f32>;
    inner_organs: vec3<f32>;

    // Bioluminescence (HDR values > 1.0)
    glow_color: vec3<f32>;
    glow_intensity: f32;
    glow_falloff: f32;

    // Special effects
    rim_color: vec3<f32>;
    alarm_color: vec3<f32>;

    // Depth gradient
    surface_color: vec3<f32>;
    deep_color: vec3<f32>;
    depth_mix: f32;
}

struct JellyState {
    is_alarmed: bool;
    pulse_phase: f32;
    pulse_frequency: f32;
    health: f32;
}

// TSL pattern integration
@group(0) @binding(0) var<uniform> palette: JellyPalette;
@group(0) @binding(1) var<uniform> state: JellyState;
@group(0) @binding(2) var gradient_texture: texture_2d<f32>;
@group(0) @binding(3) var sampler_state: sampler;
```

---

## 7. MOVEMENT-PHYSICS-INTEGRATION

### Physics + Forms + Geometry

Movement patterns are constrained by body geometry:

**From physics**: 10 movement types (jet-pulse, comb-row, undulation, etc.)
**From forms**: Body shape affects hydrodynamic efficiency
**From geometry**: Particle system layout enables movement

### Movement-Form Compatibility Matrix

| Movement Type | Compatible Forms | Incompatible Forms | Physics Notes |
|--------------|------------------|-------------------|---------------|
| **Jet Pulse** | Bell, Egg, Disc, Dome | Ribbon, Colony, Chain | Bell contraction creates thrust |
| **Comb Row** | Egg, Oval, Sphere | Bell, Barrel, Vase | Cilia beat along 8 ridges |
| **Undulation** | Ribbon, Tube, Colony | Sphere, Disc | Body wave propagation |
| **Drift-Pulse** | Bell, Egg (deep-sea) | None | Minimal pulse, current riding |
| **Rowing** | Egg, Sphere | Bell, Tube | Paired comb rows |
| **Peristaltic** | Barrel, Tube | Bell, Disc | Sequential contraction |
| **Sprint-Burst** | Bell, Cube, Dome | Ribbon, Colony | Powerful jet pulses |
| **Spiral Swim** | Ribbon, Tube | Sphere, Disc | Helical body motion |
| **Hover** | Egg, Sphere, Disc | None | Fine cilia control |
| **Burrowing** | Vase, Bell (anchored) | Colony, Ribbon | Stationary, anchored |

### Integrated Movement Configuration

```typescript
interface MovementSynthesis {
  // Primary propulsion
  propulsion: {
    type: MovementType;
    frequency: number;        // Hz
    amplitude: number;        // 0.0-1.0
    thrustVector: Vector3;
  };

  // Body form compatibility check
  formConstraints: {
    allowedShapes: BodyShape[];
    efficiencyMap: Map<BodyShape, number>; // 0.0-1.0
    modifications?: {
      geometryModifications: GeometryModuleConfig;
      particleModifications: ParticleConfig;
    };
  };

  // Animation rhythm (from physics synthesis)
  rhythm: {
    pulse: {
      frequency: number;
      waveform: 'sine' | 'triangle' | 'envelope';
      amplitude: number;
      variation: {
        enabled: boolean;
        type: 'perlin' | 'random' | 'brownian';
        amount: number;
      };
    };

    secondary: {
      frequency: number;      // Tentacles, oral arms
      phaseOffset: number;
      coupling: number;       // 0.0-1.0
    };

    flow: {
      responsiveness: number;
      inertia: number;
      damping: number;
    };
  };
}
```

### Example: Jet Pulse with Bell Form

```typescript
const medusaJetPulse: MovementSynthesis = {
  propulsion: {
    type: 'jet-pulse',
    frequency: 0.8,
    amplitude: 0.4,
    thrustVector: [0, 1, 0]
  },

  formConstraints: {
    allowedShapes: ['bell', 'egg', 'dome', 'disc'],
    efficiencyMap: new Map([
      ['bell', 0.95],     // Most efficient
      ['egg', 0.85],
      ['dome', 0.75],
      ['disc', 0.65]
    ])
  },

  rhythm: {
    pulse: {
      frequency: 0.8,
      waveform: 'envelope',
      amplitude: 0.4,
      variation: {
        enabled: true,
        type: 'perlin',
        amount: 0.15
      }
    },

    secondary: {
      frequency: 1.6,      // 2x pulse for tentacles
      phaseOffset: Math.PI / 4,
      coupling: 0.7
    },

    flow: {
      responsiveness: 0.6,
      inertia: 0.4,
      damping: 0.95
    }
  }
};
```

---

## 8. PERFORMANCE BUDGET ALLOCATION

### Cross-Domain Budget Management

Performance budgets cascade through all systems:

**From geometry synthesis**:
- Bell Generation: < 1ms
- Tentacle Generation: < 0.5ms per tentacle
- Total Generation: < 10ms per creature

**From physics synthesis**:
- Target FPS: 60 (desktop), 30 (mobile)
- Particle budget: 300-20000 (hardware tier dependent)

**From effects synthesis**:
- Post-processing: 2.67ms @ 60fps (high tier)
- Particle simulation: 3ms @ 60fps (high tier)
- Particle rendering: 3ms @ 60fps (high tier)

**From colors synthesis**:
- Color operations: < 0.1ms per frame
- Pre-baked 95%, procedural 5%

### Unified Performance Strategy

```typescript
interface PerformanceSynthesis {
  // Hardware tier detection
  hardwareTier: 'potato' | 'low' | 'medium' | 'high' | 'ultra';

  // Budget allocation
  budgets: {
    totalFrameTime: number;  // milliseconds

    geometry: {
      generation: number;
      ribCount: number;
      segments: number;
    };

    physics: {
      particles: number;
      solverIterations: number;
      updateRate: number;
    };

    particles: {
      bioluminescent: number;
      marineSnow: number;
      tentacles: number;
    };

    rendering: {
      drawCalls: number;
      triangles: number;
    };

    postProcessing: {
      quality: 'low' | 'medium' | 'high' | 'adaptive';
      bloom: boolean;
      vignette: boolean;
      chromatic: boolean;
    };
  };

  // LOD system
  lod: {
    levels: LODLevel[];
    transitions: {
      enabled: boolean;
      hysteresis: number;
    };
  };

  // Adaptive quality
  adaptive: {
    enabled: boolean;
    minFPS: number;
    qualityStep: number;
    measurementWindow: number;
  };
}

// Budget tables by hardware tier
const BUDGET_TABLES: Record<string, PerformanceSynthesis> = {
  potato: {
    hardwareTier: 'potato',
    budgets: {
      totalFrameTime: 41.67,  // 24fps
      geometry: { generation: 10, ribCount: 12, segments: 10 },
      physics: { particles: 300, solverIterations: 2, updateRate: 0.33 },
      particles: { bioluminescent: 50, marineSnow: 200, tentacles: 50 },
      rendering: { drawCalls: 50, triangles: 10000 },
      postProcessing: { quality: 'low', bloom: true, vignette: true, chromatic: false }
    },
    lod: {
      levels: [
        { distance: 0, particleMultiplier: 0.3, geometrySimplification: 0.5 },
        { distance: 30, particleMultiplier: 0.1, geometrySimplification: 0.3 }
      ],
      transitions: { enabled: true, hysteresis: 5 }
    },
    adaptive: { enabled: true, minFPS: 24, qualityStep: 0.1, measurementWindow: 60 }
  },

  // ... medium, high, ultra tiers
};
```

---

## 9. ARCHETYPE CONFIGURATION MATRIX

### 12-15 Archetypes with Full Specification

Each archetype combines all specialist perspectives:

```typescript
interface CreatureArchetype {
  id: string;
  name: string;
  category: 'core' | 'variation' | 'exotica';

  // Taxonomic classification
  taxonomy: {
    bodyPlan: BodyPlan;
    formCategory: FormCategory;
    movementType: MovementType;
  };

  // Geometry
  geometry: GeometryModuleConfig;

  // Surface features
  surface: SurfaceFeatureSynthesis;

  // Appendages
  appendages: AppendageGroup[];

  // Movement
  movement: MovementSynthesis;

  // Appearance
  look: LookSynthesis;

  // Performance
  performance: PerformanceSynthesis;

  // fxhash parameter ranges
  parameterRanges: {
    [key: string]: [number, number]; // [min, max]
  };
}
```

### Example Archetype: Classic Moon Jelly

```typescript
const moonJellyArchetype: CreatureArchetype = {
  id: 'moon_jelly',
  name: 'Moon Jellyfish (Aurelia aurita)',
  category: 'core',

  taxonomy: {
    bodyPlan: BodyPlan.Medusa,
    formCategory: 'bell',
    movementType: 'jet-pulse'
  },

  geometry: {
    body: {
      module: 'bell',
      parameters: {
        size: 1.0,
        ribRadius: 0.6,
        ribCount: 16,
        profile: 'bell-moon'
      }
    },
    surface: {
      texture: { type: 'smooth', scale: 0.1, displacement: 0.05 }
    },
    appendages: {
      marginalTentacles: {
        count: 200,
        type: 'thin_thread',
        length: 3.0
      },
      oralArms: {
        count: 4,
        type: 'oral_arm',
        length: 1.5
      }
    }
  },

  surface: {
    geometry: {
      texture: { type: 'smooth', scale: 0.1, displacement: 0.02 }
    },
    shader: {
      normalMap: 'smooth',
      iridescence: { enabled: false }
    },
    bioluminescence: {
      photophores: { enabled: false },
      edgeGlow: { enabled: false }
    }
  },

  appendages: [
    {
      type: 'thin_thread',
      geometry: { count: 200, segmentCount: 40, segmentLength: 0.1, massDistribution: 'tapered', crossSection: 'circle' },
      physics: { stiffness: 0.02, damping: 0.98, drag: 0.98, gravity: 0.1, buoyancy: 0.05 },
      animation: { type: 'passive', waveFrequency: 0.5, waveAmplitude: 0.2, waveSpeed: 0.5 },
      rendering: { method: 'particles', particleCount: 30, thickness: 0.05, material: 'tentacle' }
    },
    {
      type: 'oral_arm',
      geometry: { count: 4, segmentCount: 30, segmentLength: 0.08, massDistribution: 'tapered', crossSection: 'flat' },
      physics: { stiffness: 0.1, damping: 0.95, drag: 0.92, gravity: 0.05, buoyancy: 0.03 },
      animation: { type: 'undulation', waveFrequency: 0.8, waveAmplitude: 0.3, waveSpeed: 1.0 },
      rendering: { method: 'particles', particleCount: 200, thickness: 0.2, material: 'oralArm' }
    }
  ],

  movement: {
    propulsion: { type: 'jet-pulse', frequency: 0.8, amplitude: 0.3, thrustVector: [0, 1, 0] },
    formConstraints: { allowedShapes: ['bell'], efficiencyMap: new Map([['bell', 0.95]]) },
    rhythm: {
      pulse: { frequency: 0.8, waveform: 'envelope', amplitude: 0.3, variation: { enabled: true, type: 'perlin', amount: 0.1 } },
      secondary: { frequency: 1.6, phaseOffset: Math.PI / 4, coupling: 0.6 },
      flow: { responsiveness: 0.5, inertia: 0.3, damping: 0.97 }
    }
  },

  look: {
    palette: { id: 'luciferin' },
    material: { transmission: 0.7, subsurfaceScattering: 0.5, iridescence: 0.0, roughness: 0.3, metalness: 0.0, opacity: 0.4 },
    shaderPatterns: { translucency: 'radial-translucent', bioluminescence: 'none', iridescence: 'none', animation: 'pulse-sine' },
    bioluminescence: { enabled: false, pattern: { type: 'none' }, pulse: { frequency: 0, amplitude: 0, synchronicity: 0 } },
    postProcessing: {
      bloom: { enabled: true, threshold: 0.8, strength: 0.3, radius: 0.4, quality: 'medium' },
      vignette: { enabled: true, intensity: 0.3, smoothness: 0.5, color: [0, 0, 0.2] }
    }
  },

  performance: {
    hardwareTier: 'medium',
    budgets: {
      totalFrameTime: 16.67,
      geometry: { generation: 5, ribCount: 16, segments: 20 },
      physics: { particles: 800, solverIterations: 4, updateRate: 1.0 },
      particles: { bioluminescent: 0, marineSnow: 1000, tentacles: 6800 },
      rendering: { drawCalls: 200, triangles: 30000 },
      postProcessing: { quality: 'medium', bloom: true, vignette: true, chromatic: false }
    },
    lod: {
      levels: [
        { distance: 0, particleMultiplier: 1.0, geometrySimplification: 1.0, shaderQuality: 'high' },
        { distance: 50, particleMultiplier: 0.5, geometrySimplification: 0.7, shaderQuality: 'medium' },
        { distance: 100, particleMultiplier: 0.2, geometrySimplification: 0.4, shaderQuality: 'low' }
      ],
      transitions: { enabled: true, hysteresis: 10 }
    },
    adaptive: { enabled: true, minFPS: 30, qualityStep: 0.1, measurementWindow: 60 }
  },

  parameterRanges: {
    bodySize: [0.5, 2.0],
    bodyProportion: [0.6, 1.2],
    radialSymmetry: [12, 20],
    surfaceComplexity: [0.0, 0.3],
    transparency: [0.3, 0.6],
    tentacleCount: [100, 300],
    tentacleLength: [0.8, 2.0],
    pulseSpeed: [0.4, 1.2]
  }
};
```

### Example Archetype: Comb Jelly (Ctenophora)

```typescript
const combJellyArchetype: CreatureArchetype = {
  id: 'comb_jelly',
  name: 'Comb Jelly (Ctenophora)',
  category: 'core',

  taxonomy: {
    bodyPlan: BodyPlan.CombJelly,
    formCategory: 'egg',
    movementType: 'comb-row'
  },

  geometry: {
    body: {
      module: 'egg',
      parameters: {
        size: 0.8,
        aspectRatio: 0.7,
        ribCount: 8,  // For 8 comb rows
        profile: 'oval'
      }
    },
    surface: {
      ridges: {
        count: 8,
        height: 0.1,
        profile: 'rounded',
        distribution: 'uniform'  // Longitudinal
      }
    },
    appendages: {
      tentacles: {
        count: 2,
        type: 'trailing',
        length: 10.0  // Very long
      }
    }
  },

  surface: {
    geometry: {
      ridges: { count: 8, height: 0.15, profile: 'rounded', distribution: 'uniform' }
    },
    shader: {
      iridescence: {
        enabled: true,
        intensity: 1.0,
        colors: [
          [1, 0, 0],    // Red
          [1, 0.5, 0],  // Orange
          [1, 1, 0],    // Yellow
          [0, 1, 0],    // Green
          [0, 1, 1],    // Cyan
          [0, 0, 1]     // Blue
        ]
      }
    },
    bioluminescence: {
      photophores: {
        distribution: 'surface_scattered',
        density: 50,
        synchronization: 0.3
      },
      edgeGlow: { enabled: false }
    }
  },

  appendages: [
    {
      type: 'trailing',
      geometry: { count: 2, segmentCount: 100, segmentLength: 0.15, massDistribution: 'uniform', crossSection: 'circle' },
      physics: { stiffness: 0.01, damping: 0.99, drag: 0.99, gravity: 0.02, buoyancy: 0.08 },
      animation: { type: 'passive', waveFrequency: 0.3, waveAmplitude: 0.1, waveSpeed: 0.3 },
      rendering: { method: 'geometry', thickness: 0.05, material: 'tentacle' }
    }
  ],

  movement: {
    propulsion: {
      type: 'comb-row',
      frequency: 3.0,  // Fast metachronal wave
      amplitude: 0.2,
      thrustVector: [0, 0, 1]
    },
    formConstraints: {
      allowedShapes: ['egg', 'oval', 'sphere'],
      efficiencyMap: new Map([['egg', 0.95], ['oval', 0.9], ['sphere', 0.8]])
    },
    rhythm: {
      pulse: {
        frequency: 3.0,
        waveform: 'sine',
        amplitude: 0.2,
        variation: { enabled: false, type: 'random', amount: 0 }
      },
      secondary: {
        frequency: 6.0,  // Tentacles respond to comb beat
        phaseOffset: 0,
        coupling: 0.3
      },
      flow: {
        responsiveness: 0.8,
        inertia: 0.2,
        damping: 0.99
      }
    }
  },

  look: {
    palette: { id: 'comb_diffraction' },
    material: { transmission: 0.5, subsurfaceScattering: 0.3, iridescence: 0.8, roughness: 0.1, metalness: 0.0, opacity: 0.5 },
    shaderPatterns: {
      translucency: 'radial-translucent',
      bioluminescence: 'clustered-glow',
      iridescence: 'fresnel-rainbow',
      animation: 'metachronal-wave'
    },
    bioluminescence: {
      enabled: true,
      pattern: {
        type: 'diffuse_glow',
        location: 'comb_rows',
        animation: { type: 'triggered', frequency: 0, amplitude: 1.0, triggerBehavior: { trigger: 'mechanical', burstDuration: 2.0, burstIntensity: 1.0, cooldown: 5.0 } },
        color: { type: 'fixed', color: [0, 1, 1] },
        intensity: { type: 'triggered', base: 0.0, peak: 1.0 },
        synchronization: { type: 'local', radius: 0.1, delay: 0.05 }
      },
      pulse: { frequency: 0, amplitude: 0, synchronicity: 0.3 }
    },
    postProcessing: {
      bloom: { enabled: true, threshold: 0.6, strength: 0.5, radius: 0.5, quality: 'high' },
      vignette: { enabled: true, intensity: 0.3, smoothness: 0.5, color: [0, 0, 0.2] },
      chromaticAberration: { enabled: true, strength: 0.002 }
    }
  },

  performance: {
    hardwareTier: 'medium',
    budgets: {
      totalFrameTime: 16.67,
      geometry: { generation: 3, ribCount: 8, segments: 15 },
      physics: { particles: 400, solverIterations: 3, updateRate: 1.0 },
      particles: { bioluminescent: 100, marineSnow: 500, tentacles: 200 },
      rendering: { drawCalls: 100, triangles: 15000 },
      postProcessing: { quality: 'high', bloom: true, vignette: true, chromatic: true }
    },
    lod: {
      levels: [
        { distance: 0, particleMultiplier: 1.0, geometrySimplification: 1.0, shaderQuality: 'high' },
        { distance: 50, particleMultiplier: 0.5, geometrySimplification: 0.7, shaderQuality: 'medium' }
      ],
      transitions: { enabled: true, hysteresis: 10 }
    },
    adaptive: { enabled: true, minFPS: 30, qualityStep: 0.1, measurementWindow: 60 }
  },

  parameterRanges: {
    bodySize: [0.5, 1.5],
    bodyProportion: [0.6, 0.9],
    radialSymmetry: [8, 8],  // Fixed at 8 for comb jellies
    surfaceComplexity: [0.0, 0.2],
    transparency: [0.4, 0.7],
    tentacleCount: [2, 2],  // Fixed at 2
    tentacleLength: [1.0, 3.0],
    bioIntensity: [0.0, 1.0]
  }
};
```

---

## 10. FXHASH INTEGRATION STRATEGY

### Open-Form Evolution System

The fxhash open-form API provides evolutionary mechanics:

```typescript
interface FxhashIntegration {
  // Lineage tracking
  lineage: {
    hash: string;           // $fx.hash - unique seed
    params: FxhashParams;   // $fx.params - user parameters
    features: FxhashFeatures; // $fx.features - extracted features
    metadata: FxhashMetadata; // $fx.metadata - display info
  };

  // Evolution mechanics
  evolution: {
    depth: number;          // $fx.depth - generation number
    parentHash?: string;    // From $fx.lineage
    mutationType: 'geometric' | 'material' | 'behavioral' | 'hybrid';

    // Mutation strength increases with depth
    mutationStrength: number; // 0.0-1.0, function of depth

    // Trait inheritance
    inheritedTraits: {
      bodyPlan?: BodyPlan;
      palette?: string;
      movementType?: MovementType;
    };
  };

  // Parameter mapping (fxhash → internal)
  parameterMapping: {
    // User-facing parameters (0-1 range)
    'body-shape': number;        // Maps to geometry + form
    'size': number;              // Maps to geometry.size
    'complexity': number;         // Maps to surface + appendages
    'glow': number;              // Maps to bioluminescence
    'color-scheme': number;      // Maps to palette
    'movement': number;          // Maps to animation speed
    'transparency': number;       // Maps to material.opacity
    'tentacles': number;         // Maps to appendage count
  };
}

// fxhash open-form API usage
function generateCreature(hash: string, params: FxhashParams): GenerativeCreatureSpec {
  // Parse hash for archetype selection
  const archetypeIndex = hashToNumber(hash) % ARCHETYPES.length;
  const baseArchetype = ARCHETYPES[archetypeIndex];

  // Apply user parameters
  const modifiedSpec = applyParameters(baseArchetype, params);

  // Apply evolutionary mutations based on depth
  if (params.$fx.depth > 0) {
    const mutatedSpec = applyEvolutionaryMutation(
      modifiedSpec,
      params.$fx.depth,
      params.$fx.lineage
    );
    return mutatedSpec;
  }

  return modifiedSpec;
}

function applyEvolutionaryMutation(
  spec: GenerativeCreatureSpec,
  depth: number,
  lineage: string
): GenerativeCreatureSpec {
  // Mutation strength increases with depth
  const mutationStrength = Math.min(depth * 0.1, 0.5);

  // Select mutation type based on hash
  const mutationType = selectMutationType(lineage, depth);

  switch (mutationType) {
    case 'geometric':
      return mutateGeometry(spec, mutationStrength);
    case 'material':
      return mutateMaterial(spec, mutationStrength);
    case 'behavioral':
      return mutateMovement(spec, mutationStrength);
    case 'hybrid':
      return hybridizeArchetypes(spec, mutationStrength);
    default:
      return spec;
  }
}

function mutateGeometry(spec: GenerativeCreatureSpec, strength: number): GenerativeCreatureSpec {
  // Mutate geometric parameters within ranges
  const mutated = { ...spec };

  // Size mutation
  mutated.parameters.bodySize = clamp(
    mutated.parameters.bodySize + (rand() - 0.5) * strength,
    0.3, 2.0
  );

  // Proportion mutation
  mutated.parameters.bodyProportion = clamp(
    mutated.parameters.bodyProportion + (rand() - 0.5) * strength,
    0.5, 1.5
  );

  // Symmetry mutation (integer steps)
  if (rand() < strength) {
    const delta = rand() < 0.5 ? -1 : 1;
    mutated.parameters.radialSymmetry = clamp(
      mutated.parameters.radialSymmetry + delta,
      3, 12
    );
  }

  return mutated;
}
```

### Parameter-to-Specialist Mapping

| fxhash Parameter | Forms Domain | Geometry Domain | Color Domain | Physics Domain |
|-----------------|--------------|-----------------|--------------|----------------|
| body-shape | Form category selection | Profile curve | - | - |
| size | Major axis scaling | Module size multiplier | - | - |
| complexity | Surface feature density | Appendage count | - | Particle budget |
| glow | Photophore density | - | Intensity, pattern | - |
| color-scheme | - | - | Palette selection | - |
| movement | Pulse rhythm | - | Animation speed | Frequency |
| transparency | - | - | Opacity | - |
| tentacles | Appendage type | Appendage count | - | Particle budget |

---

## 11. IMPLEMENTATION ROADMAP

### Phase-Based Integration Plan

#### Phase 1: Core Architecture (Week 1-2)
**Goal**: Establish unified type system and basic rendering

- [ ] Implement unified type interfaces (GenerativeCreatureSpec, LookSynthesis, etc.)
- [ ] Create archetype configuration system
- [ ] Implement basic geometry generation (bell, egg, barrel modules)
- [ ] Integrate LookConfig with existing TSL materials
- [ ] Implement basic post-processing (bloom, vignette)
- [ ] Create fxhash parameter mapping

**Specialist Integration**:
- Forms: 3 form categories (bell, egg, barrel)
- Geometry: 3 primitives
- Shaders: Basic TSL patterns
- Colors: Luciferin palette
- Physics: Basic Verlet tentacles
- Effects: Core post-processing

**Target**: 30fps on low-end, single creature rendering

#### Phase 2: Form & Geometry Expansion (Week 3-4)
**Goal**: Implement all 10 form categories and 35 primitives

- [ ] Implement all geometry modules (tube, ribbon, disc, sphere, vase, star, colony)
- [ ] Implement surface feature system (ridges, frills, textures)
- [ ] Create rib-based construction pipeline
- [ ] Implement profile curve system (parametric + spline)
- [ ] Add procedural generation methods (superformula, parametric)
- [ ] Implement appendage system (all 10 tentacle types)

**Specialist Integration**:
- Forms: All 10 form categories
- Geometry: All 35 primitives
- Shaders: 50+ TSL patterns
- Colors: All 7 palettes
- Physics: All 10 movement types
- Effects: Particle system foundation

**Target**: 60fps on mid-range, 5 creatures on screen

#### Phase 3: Material & Bioluminescence (Week 5-6)
**Goal**: Implement full visual appearance system

- [ ] Implement all 150+ TSL shader patterns
- [ ] Implement bioluminescence pattern system (20+ patterns)
- [ ] Create photophore placement system
- [ ] Implement iridescence effects (Fresnel rainbow)
- [ ] Add animation patterns (pulse, wave, neural)
- [ ] Integrate colors palette system
- [ ] Implement pre-baked gradient textures

**Specialist Integration**:
- Forms: Surface feature integration
- Geometry: Displacement mapping
- Shaders: Full catalog implementation
- Colors: Full palette architecture
- Bioluminescence: All glow patterns
- Effects: Particle bioluminescence

**Target**: 60fps on mid-range, 10 creatures on screen

#### Phase 4: Movement & Physics (Week 7-8)
**Goal**: Implement creature-specific movement behaviors

- [ ] Implement all 10 movement types
- [ ] Create movement-form compatibility system
- [ ] Implement rhythm patterns (pulse, wave, metachronal)
- [ ] Add flow field integration
- [ ] Implement creature-specific physics presets
- [ ] Add particle-based appendage rendering
- [ ] Implement adaptive quality system

**Specialist Integration**:
- Forms: Movement constraints
- Geometry: Particle layout optimization
- Physics: All movement types
- Effects: Flow field particles
- Shaders: Animation pattern integration

**Target**: 60fps on high-end, 20 creatures on screen

#### Phase 5: Performance & Polish (Week 9-10)
**Goal**: Optimize and finalize system

- [ ] Implement LOD system with 4 levels
- [ ] Add hardware tier detection
- [ ] Implement adaptive quality management
- [ ] Optimize particle systems (GPU compute)
- [ ] Implement instanced rendering
- [ ] Add performance monitoring UI
- [ ] Create parameter tuning tools
- [ ] Implement fxhash open-form mechanics
- [ ] Add evolutionary mutation system

**Specialist Integration**:
- All: Performance budget management
- All: Cross-domain optimization

**Target**: 60fps across all hardware tiers, 50+ creatures

---

## 12. CROSS-DOMAIN DEPENDENCIES

### Dependency Graph

```
                      ┌─────────────────┐
                      │  Type System    │
                      │  (Unified)      │
                      └────────┬────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │ Geometry │        │ Materials│        │ Physics  │
    │ System   │        │ System   │        │ System   │
    └─────┬────┘        └─────┬────┘        └─────┬────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │   Rendering  │
                       │   Pipeline   │
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Post-Process │
                       │    Chain     │
                       └──────────────┘
```

### Critical Dependencies

| Dependent | Depends On | Blocking Reason |
|-----------|------------|-----------------|
| Surface features | Geometry modules | Need geometry to modulate |
| Bioluminescence placement | Geometry, surface | Need attachment points |
| Movement animation | Physics constraints | Need particle system |
| Tentacle physics | Appendage geometry | Need chain structure |
| Shader patterns | Material uniforms | Need LookConfig |
| Post-processing | Rendering output | Need scene render |
| LOD system | All systems | Need everything to scale |
| fxhash integration | All systems | Need complete spec |

### Integration Order

1. **Type system first** - Establish all interfaces
2. **Geometry second** - Foundation for everything else
3. **Materials third** - Apply to geometry
4. **Physics fourth** - Animate geometry
5. **Particles fifth** - Add appendages, effects
6. **Post-processing last** - Composite everything

---

## 13. VALIDATION CHECKLIST

### Cross-Domain Validation

For each archetype, verify:

**Forms + Geometry**:
- [ ] Form category has corresponding geometry module
- [ ] Profile curves match visual taxonomy
- [ ] Surface features are geometrically realizable

**Geometry + Physics**:
- [ ] Particle layout supports movement type
- [ ] Tentacle physics match appendage type
- [ ] Performance budget not exceeded

**Physics + Forms**:
- [ ] Movement type compatible with body shape
- [ ] Hydrodynamic efficiency reasonable
- [ ] Animation rhythm appropriate

**Materials + Colors**:
- [ ] Palette has all required colors
- [ ] Material properties appropriate for body plan
- [ ] Pre-baked gradients generated

**Bioluminescence + Materials**:
- [ ] Glow pattern mapped to shader
- [ ] Photophore placement on geometry
- [ ] Animation synchronized

**Effects + Rendering**:
- [ ] Post-processing chain configured
- [ ] Particle systems within budget
- [ ] LOD transitions smooth

**All + fxhash**:
- [ ] All parameters mapped to fxhash
- [ ] Mutation logic implemented
- [ ] Evolution mechanics functional

---

## 14. CONCLUSION

This integration document synthesizes **8 Stage 1 specialist perspectives** into a unified implementation roadmap:

- **1,030+ ideas** cataloged across brainstorming sessions
- **150+ TSL shader patterns** identified and categorized
- **35+ geometry primitives** specified with parameters
- **20+ bioluminescence patterns** with animation behaviors
- **10 movement types** with creature compatibility
- **7 color palettes** with accessibility analysis
- **10 form categories** bridging taxonomic and mathematical views

### Key Achievements

1. **Unified Type Architecture**: GenerativeCreatureSpec integrates all domains
2. **Modular System**: Each specialist domain has clean interfaces
3. **Performance Strategy**: Budgets cascade through all systems
4. **Creature Archetypes**: 12-15 configurations as starting points
5. **fxhash Integration**: Open-form evolution mechanics mapped

### Next Steps

1. **Implement Phase 1** (Week 1-2): Core architecture
2. **Create archetype configs** for all 12-15 types
3. **Build parameter tuning tools** for iterative refinement
4. **Test cross-domain validation** with each archetype
5. **Launch fxhash mint** with evolutionary mechanics

---

**END OF STAGE 2 INTEGRATION**

**Leg**: hq-leg-forms-integration
**Status**: COMPLETE
**Ready for Stage 3**: Implementation & Testing

---

*Generated by Form & Shape Grammar Designer*
*Abyssal Genesis - Generative Jellyfish WebGPU*
*Date: 2026-02-08*
