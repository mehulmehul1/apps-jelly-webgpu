# Stage 2: Shaders Cross-Disciplinary Integration
## Abyssal Genesis - TSL Material System Integration

**Integration Date:** 2026-02-08
**Specialist:** Shader & Materials Artist
**Mission Leg:** Stage 2 Integration
**Status:** COMPLETE

---

## EXECUTIVE SUMMARY

This integration document synthesizes the Stage 1 shaders synthesis with all other specialist legs (forms, geometry, bioluminescence, physics, effects) and the Stage 1.5 REVISED BMad decisions. The result is a comprehensive roadmap for implementing TSL-based materials that support the expansive 12-15 archetype strategy while maintaining 60 FPS performance targets.

**Key Finding:** The shader system must be fundamentally modular—composable material "atoms" that combine to create 8,640,000+ practical unique creatures. Each archetype requires distinct shader pattern combinations.

---

## 1. INTEGRATION ARCHITECTURE

### 1.1 The Composable Material System

```typescript
/**
 * Composable TSL Material System for Abyssal Genesis
 * Each component is an independent "atom" that combines with others
 */

// Material atom interface
interface MaterialAtom {
  id: string;
  category: 'translucency' | 'bioluminescence' | 'iridescence' | 'surface' | 'animation';
  priority: number; // 0-1, determines blending order
  computeFn: TSLNodeFunction;
  uniformSpec: UniformSpec;
}

// Complete material specification
interface ComposableMaterial {
  base: MaterialAtom;           // Core material (BulbNode, GelNode, etc.)
  layers: MaterialAtom[];       // Stackable effect layers
  uniforms: Record<string, any>;
  renderOrder: number;
}

// Example: Combining atoms for a bioluminescent medusa
const BioluminescentMedusaMaterial: ComposableMaterial = {
  base: TRANSLUCENCY_BELL,           // Radial bell translucency
  layers: [
    SSS_MULTI_LAYER,                 // Multi-layer subsurface scattering
    BIOLUMINESCENCE_CORE_GLOW,       // Central photocyte glow
    IRIDESCENCE_FRESENEL,            // Edge rim lighting
    ANIMATION_BREATHING              // Breathing motion displacement
  ],
  uniforms: {
    // Merged from all atoms
    ...TRANSLUCENCY_BELL.uniformSpec,
    ...BIOLUMINESCENCE_CORE_GLOW.uniformSpec
  }
};
```

### 1.2 Cross-Discipline Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHADER INTEGRATION FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   FORMS     │    │  GEOMETRY   │    │   LOOKS     │        │
│  │ BodyPlan    │───▶│ Primitives  │───▶│ Config      │        │
│  │ Symmetry    │    │ UVs         │    │ Colors      │        │
│  └─────────────┘    └─────────────┘    └──────┬──────┘        │
│                                              │                 │
│  ┌─────────────┐    ┌─────────────┐         │                 │
│  │     BIOLUM  │    │   PHYSICS   │         ▼                 │
│  │ Patterns    │───▶│ Animation   │    ┌─────────┐            │
│  │ Locations   │    │ Deformation │───▶│ SHADER  │            │
│  └─────────────┘    └─────────────┘    │ FACTORY│            │
│                                              │                 │
│  ┌─────────────┐    ┌─────────────┐         ▼                 │
│  │   EFFECTS   │    │   STAGE 1.5 │    ┌─────────┐            │
│  │ Particles   │───▶│ 12-15 ARCH  │───▶│ TSL     │            │
│  │ Post-Proc   │    │ Performance │    │ OUTPUT  │            │
│  └─────────────┘    └─────────────┘    └─────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. ARCHETYPE-SPECIFIC SHADER PRESETS

Based on Stage 1.5 REVISED decisions, implementing 12-15 archetypes. Each requires distinct shader combinations:

### 2.1 Archetype Shader Matrix

| Archetype | Base Material | Translucency | Bioluminescence | Iridescence | Animation |
|-----------|--------------|--------------|-----------------|-------------|-----------|
| **Medusozoa** | BulbNodeMaterial | Radial Bell (#2) | Core Glow (#41) | Fresnel (#21) | Breathing (#101) |
| **CombJelly** | GelNodeMaterial | Thin-Film (#3) | Diffraction (#52) | Rainbow (#23) | CombWave (#103) |
| **Siphonophore** | BulbNodeMaterial | Edge Gradient (#4) | Traveling (#44) | Subtle (#22) | Undulating (#102) |
| **BoxJelly** | TentacleNodeMaterial | Directional (#7) | Pattern Grid (#48) | None | Sprint (#107) |
| **Anemone** | GelNodeMaterial | Scattered (#6) | Point Cloud (#43) | None | RadialPulse (#105) |
| **Salp** | BulbNodeMaterial | Cylindrical (#8) | Peristaltic (#56) | None | ChainWave (#108) |
| **Ribbon** | CustomRibbonMaterial | Gradient Flow (#9) | Sequential (#46) | Fresnel (#21) | Sinuous (#109) |
| **GlassSponge** | GelNodeMaterial | Skeletal (#10) | Spine Tips (#49) | Labradorescent (#27) | Pulse (#101) |
| **Colonial** | BulbNodeMaterial | Modular (#11) | Clustered (#47) | None | Coordinated (#110) |
| **StalkedMedusa** | BulbNodeMaterial | Bell+Stalk (#12) | Tip Glow (#50) | Fresnel (#21) | Bobbing (#111) |
| **PortugueseManOWar** | MultiMaterial | Varied (#13) | Warning (#51) | FalseColor (#28) | Independent (#112) |
| **Hydromedusa** | BulbNodeMaterial | Simple (#1) | Basic (#40) | None | Simple (#101) |
| **Ascidia** | GelNodeMaterial | Tunic (#14) | Siphon (#53) | None | Pump (#106) |
| **Experimental** | CustomMaterial | Procedural (#15) | Quantum (#60) | Holographic (#29) | Morphing (#113) |

### 2.2 Detailed Archetype Specifications

#### ARCHETYPE 1: Medusozoa (Classic Jellyfish)

```typescript
const MedusozoaShaderPreset: ComposableMaterial = {
  base: 'BulbNodeMaterial',

  // Translucency: Radial falloff from center
  translucency: {
    pattern: 'radial-bell',
    uv: 'polar-uv-0',
    center: vec2(0.5, 0.5),
    falloff: 2.0,
    thickness: 0.3,
    // TSL Implementation from shaders-brainstorm.md pattern #2
    node: `float(vec2(0.5).distance(vUv) * -2.0 + 1.0)`
  },

  // Subsurface Scattering: Multi-layer approximation
  subsurface: {
    pattern: 'multi-layer-sss',
    layers: [
      { color: 'diffuse', thickness: 0.1, scattering: 0.8 },
      { color: 'diffuseB', thickness: 0.2, scattering: 0.5 },
      { color: 'biolume', thickness: 0.05, scattering: 0.9 }
    ],
    // TSL Implementation from pattern #5
    blendMode: 'screen'
  },

  // Bioluminescence: Central core glow
  bioluminescence: {
    pattern: 'single-photocyte-glow',
    location: 'oral-cavity', // from geometry synthesis
    distribution: 'spherical-cluster',
    count: 100,
    // TSL Implementation from pattern #41
    pulse: {
      frequency: uniform('pulseFreq', 1.0),
      amplitude: uniform('pulseAmp', 0.3)
    }
  },

  // Iridescence: Fresnel rim enhancement
  iridescence: {
    pattern: 'fresnel-basic',
    power: 3.0,
    color: vec3(0.3, 0.6, 1.0),
    intensity: 0.4,
    // TSL Implementation from pattern #21
    mix: 'additive'
  },

  // Animation: Breathing bell motion
  animation: {
    pattern: 'breathing-motion',
    type: 'vertex-displacement',
    axis: 'normal',
    // TSL Implementation from pattern #101
    wave: {
      frequency: uniform('breatheFreq', 0.8),
      amplitude: uniform('breatheAmp', 0.2)
    }
  },

  // Integration with geometry
  geometryBindings: {
    bellPrimitive: 'Sphere | Ellipsoid | Hemisphere',
    attachmentPoints: 'radial-attachment',
    tentacleCrossSection: 'circular-profile'
  },

  // Performance targets
  performance: {
    gpuCost: 'medium', // 500-800 operations
    recommendedLOD: 'medium-high',
    maxCount: '100 creatures @ 60fps (ultra tier)'
  }
};
```

#### ARCHETYPE 2: CombJelly (Ctenophora)

```typescript
const CombJellyShaderPreset: ComposableMaterial = {
  base: 'GelNodeMaterial',

  // Special: Thin-film interference for iridescence
  iridescence: {
    pattern: 'comb-jelly-diffraction',
    type: 'thin-film',
    filmThickness: uniform('filmThickness', 300.0), // nanometers
    viewAngle: 'camera-dot-normal',
    // TSL Implementation from pattern #52
    spectrum: 'full-rainbow',
    intensity: 0.8
  },

  // Translucency: Very high (nearly transparent)
  translucency: {
    pattern: 'thin-film',
    opacity: 0.15,
    refractiveIndex: 1.05,
    // Matches ctenophora gelatinous body
  },

  // Bioluminescence: Comb row activation
  bioluminescence: {
    pattern: 'metachronal-wave',
    locations: 8, // Eight comb rows
    distribution: 'longitudinal-lines',
    // TSL Implementation from pattern #44 (traveling wave)
    wave: {
      speed: 2.0,
      phaseOffset: 0.125, // 1/8 for 8 rows
      direction: 'posterior-to-anterior'
    }
  },

  // Animation: Comb row beat
  animation: {
    pattern: 'comb-row-wave',
    frequency: 3.0, // 3 Hz beat
    metachronal: true,
    // Integrated with physics synthesis comb row motion
  },

  // Geometry integration
  geometryBindings: {
    bodyPrimitive: 'Ellipsoid (oblate)',
    combRows: 8, // from geometry synthesis
    tentacleCount: 2, // Two long tentacles
  },

  performance: {
    gpuCost: 'high', // Iridescence is expensive
    recommendedLOD: 'medium',
    maxCount: '50 creatures @ 60fps (ultra tier)'
  }
};
```

#### ARCHETYPE 3: Siphonophore (Ribbon/Colonial)

```typescript
const SiphonophoreShaderPreset: ComposableMaterial = {
  base: 'BulbNodeMaterial',

  // Translucency: Edge gradient along ribbon
  translucency: {
    pattern: 'edge-gradient',
    gradientAxis: 'v', // Vertical in UV space
    centerOpacity: 0.3,
    edgeOpacity: 0.9,
    // From visual reference 646c6dd5
  },

  // Bioluminescence: Traveling wave along body
  bioluminescence: {
    pattern: 'traveling-wave',
    path: 'body-curve', // Follows geometry curve
    wavelength: 0.3,
    speed: 1.0,
    // TSL Implementation from pattern #44
    trigger: 'continuous'
  },

  // Iridescence: Subtle edge glow
  iridescence: {
    pattern: 'fresnel-edge-glow',
    intensity: 0.3,
    color: vec3(0.8, 1.0, 1.0), // Cyan
  },

  // Animation: Sinuous undulation
  animation: {
    pattern: 'sinuous-undulation',
    amplitude: 0.4,
    frequency: 0.5,
    // Integrated with physics undulation
  },

  // Geometry integration
  geometryBindings: {
    bodyPrimitive: 'Tube (curve-based)',
    crossSection: 'ribbon-profile',
    spinal: true, // Internal stiffening spine
  },

  performance: {
    gpuCost: 'medium-low',
    recommendedLOD: 'any',
    maxCount: '200 creatures @ 60fps (ultra tier)'
  }
};
```

#### ARCHETYPE 4: BoxJelly (Cubozoa)

```typescript
const BoxJellyShaderPreset: ComposableMaterial = {
  base: 'TentacleNodeMaterial',

  // Translucency: Directional (four-fold symmetry)
  translucency: {
    pattern: 'directional-bell',
    symmetry: 4,
    opacityPerFace: [0.4, 0.4, 0.4, 0.4],
  },

  // Bioluminescence: Pattern grid on bell surface
  bioluminescence: {
    pattern: 'pattern-photophores',
    arrangement: 'four-fold-symmetry',
    count: 500, // Dense pattern
    distribution: 'surface-grid',
    // From visual reference aef7b043
  },

  // Animation: Sprint-burst propulsion
  animation: {
    pattern: 'sprint-burst',
    burstFrequency: 3.0,
    coastRatio: 0.6,
    // Integrated with physics sprint-burst
  },

  geometryBindings: {
    bodyPrimitive: 'Cube (rounded)',
    tentacleClusters: 4,
    tentaclesPerCluster: 30,
  },

  performance: {
    gpuCost: 'medium',
    maxCount: '150 creatures @ 60fps (ultra tier)'
  }
};
```

#### ARCHETYPE 7: Ribbon (Ethereal)

```typescript
const RibbonShaderPreset: ComposableMaterial = {
  base: 'CustomRibbonMaterial', // New material type

  // Translucency: Gradient flow along length
  translucency: {
    pattern: 'gradient-flow',
    flowAxis: 'u', // Horizontal in UV
    gradient: 'noise-based',
  },

  // Bioluminescence: Sequential activation
  bioluminescence: {
    pattern: 'sequential-trail',
    activation: 'head-to-tail',
    trailLength: 0.3,
    // Visual reference 646c6dd5
  },

  // Iridescence: Fresnel edge enhancement
  iridescence: {
    pattern: 'fresnel-basic',
    intensity: 0.6,
  },

  // Animation: Sinuous motion
  animation: {
    pattern: 'sinuous',
    waveFunction: 'sine',
    harmonics: 3, // Multiple wave frequencies
  },

  geometryBindings: {
    bodyPrimitive: 'ParametricCurve (ribbon)',
    crossSection: 'ribbon-profile',
    thickness: 0.1,
  },

  performance: {
    gpuCost: 'low',
    maxCount: '500 creatures @ 60fps (ultra tier)'
  }
};
```

---

## 3. SHADER × GEOMETRY INTEGRATION

### 3.1 UV Mapping Strategies by Geometry Primitive

From geometry synthesis, the 70 primitives require specific UV layouts:

```typescript
interface UVMappingStrategy {
  primitive: GeometryPrimitive;
  uvType: UVType;
  shaderImplications: string[];
}

const UV_MAPPINGS: UVMappingStrategy[] = [
  {
    primitive: 'Sphere',
    uvType: 'polar-uv',
    shaderImplications: [
      'Radial gradients work naturally',
      'Fresnel requires view vector, not UV',
      'Bioluminescence clusters use spherical coordinates'
    ]
  },
  {
    primitive: 'Ellipsoid',
    uvType: 'stretched-polar',
    shaderImplications: [
      'Non-uniform scaling of UV coordinates',
      'Adjust radial falloff by aspect ratio'
    ]
  },
  {
    primitive: 'Tube (Curve)',
    uvType: 'unroll-uv',
    shaderImplications: [
      'U coordinate = position along curve',
      'V coordinate = angle around tube',
      'Traveling waves use U direction'
    ]
  },
  {
    primitive: 'TentacleChain',
    uvType: 'segment-uv',
    shaderImplications: [
      'Each segment has independent UV',
      'Tentacle trail shader uses sequential segment IDs'
    ]
  }
];
```

### 3.2 Attachment Point Integration

Geometry synthesis defines attachment systems; shaders must enhance them:

```typescript
interface AttachmentPointShader {
  attachmentType: string;
  shaderEnhancement: string;
  glowBehavior: string;
}

const ATTACHMENT_SHADER_ENHANCEMENTS: AttachmentPointShader[] = [
  {
    attachmentType: 'RadialAttachment',
    shaderEnhancement: 'Fresnel glow at attachment ring',
    glowBehavior: 'Pulse synchronized with parent'
  },
  {
    attachmentType: 'ClusteredAttachment',
    shaderEnhancement: 'Point glow at each attachment point',
    glowBehavior: 'Sequential wave through cluster'
  },
  {
    attachmentType: 'PhyllotaxisAttachment',
    shaderEnhancement: 'Spiral glow following Fibonacci pattern',
    glowBehavior: 'Synchronized spiral wave'
  }
];
```

### 3.3 Cross-Section Profile Shaders

From geometry synthesis, cross-section profiles affect transmission:

```typescript
interface CrossSectionShaderEffect {
  profile: string;
  transmissionEffect: string;
  thicknessVarying: string;
}

const CROSS_SECTION_EFFECTS: CrossSectionShaderEffect[] = [
  {
    profile: 'CircularProfile',
    transmissionEffect: 'Uniform transmission across section',
    thicknessVarying: 'Constant thickness shader'
  },
  {
    profile: 'TeardropProfile',
    transmissionEffect: 'Higher transmission at thin tip',
    thicknessVarying: 'Gradient thickness based on V coordinate'
  },
  {
    profile: 'RibbonProfile',
    transmissionEffect: 'Edge-only transmission',
    thicknessVarying: 'V-based thickness, zero at edges'
  }
];
```

---

## 4. SHADER × BIOLUMINESCENCE INTEGRATION

### 4.1 Glow Pattern Shader Mappings

From bioluminescence synthesis, mapping patterns to TSL implementations:

| Bioluminescence Pattern | TSL Shader Pattern | Intensity Calculation |
|------------------------|-------------------|----------------------|
| Central Core Glow | #41 Single Photocyte Glow | `exp(-distance² * spread)` |
| Marginal Rim Light | #21 Fresnel Iridescence | `(1 - N·V)^power` |
| Tentacle Trail | #44 Traveling Wave | `sin(u*freq - time*speed)` |
| Comb Row Diffraction | #52 Comb Jelly Diffraction | Thin-film spectrum |
| Point Cloud Cluster | #43 Multi-Photocyte Array | Sum of Gaussian points |
| Edge Glow | #21 Fresnel (edge mode) | View-angle dependent |
| Spiral Vortex | #45 Spiral Bioluminescence | `atan2(y,x) + time` |
| Burglar Alarm | #51 Burst/Strobe Flash | `if(trigger) { high; decay }` |

### 4.2 Color Temperature Integration

From bioluminescence synthesis, color-temperature depth relationship:

```typescript
// Shader implementation of depth-based color
const depthBasedColorShader = `
uniform float depth; // Passed from creature spec
uniform float surfaceTemp; // 6500K
uniform float abyssalTemp; // 4000K

vec3 getBiolumeColor(float depth) {
  float t = clamp(depth / 4000.0, 0.0, 1.0);
  float temperature = mix(surfaceTemp, abyssalTemp, t);
  return kelvinToRGB(temperature);
}

// In fragment shader:
vec3 biolumeBase = getBiolumeColor(depth) * intensity;
```

### 4.3 Synchronization Shader Implementation

From bioluminescence synchronization behaviors:

```typescript
// Metachronal wave (comb rows)
const metachronalWaveShader = `
uniform float time;
uniform float waveSpeed;
uniform float phaseOffset;

float calculatePhase(int rowID) {
  return time * waveSpeed + float(rowID) * phaseOffset;
}

// Sequential activation (tentacle trail)
const sequentialWaveShader = `
uniform float time;
uniform float travelSpeed;
uniform float tentacleLength;

float calculateTentaclePhase(float uCoord) {
  // uCoord goes from 0 (base) to 1 (tip)
  return uCoord * tentacleLength - time * travelSpeed;
}
`;
```

---

## 5. SHADER × PHYSICS INTEGRATION

### 5.1 Animation-Driven Shader Effects

From physics synthesis, linking animation rhythms to shader parameters:

```typescript
interface PhysicsShaderLink {
  animationType: string;
  shaderUniform: string;
  mappingFunction: string;
}

const PHYSICS_SHADER_LINKS: PhysicsShaderLink[] = [
  {
    animationType: 'jet-pulse',
    shaderUniform: 'pulsePhase',
    mappingFunction: 'phase = sin(time * frequency * 2π) * 0.5 + 0.5'
  },
  {
    animationType: 'comb-row',
    shaderUniform: 'combPhase',
    mappingFunction: 'phase = fract(time * beatFrequency)'
  },
  {
    animationType: 'undulation',
    shaderUniform: 'wavePhase',
    mappingFunction: 'phase = time * waveSpeed'
  },
  {
    animationType: 'breathing',
    shaderUniform: 'breatheAmount',
    mappingFunction: 'amount = sin(time * 0.5π) * 0.5 + 0.5'
  }
];
```

### 5.2 Deformation-Aware Shaders

Physics deforms geometry; shaders must handle it:

```typescript
// Vertex shader integration with physics displacement
const physicsDisplacementShader = `
// Physics-calculated displacement
uniform vec3 physicsDisplacement;
uniform float pulsePhase;

// Apply displacement along normal
vec3 displacedPosition = position + normal * physicsDisplacement;

// Recalculate normal for correct lighting
vec3 newNormal = normalize(displacedPosition);

// Pass to fragment shader
varying vec3 vNormal;
varying vec3 vPosition;
`;
```

### 5.3 Flow Field Visual Shader

From physics flow field, create visual effect:

```typescript
// Visualize water flow using shader
const flowVisualizationShader = `
uniform float time;
uniform vec3 flowVelocity;

// Flow lines based on velocity
vec3 getFlowColor(vec3 position) {
  float flowStrength = length(flowVelocity);
  float flowDirection = atan(flowVelocity.z, flowVelocity.x);

  vec3 flowColor = vec3(
    0.5 + 0.5 * sin(flowDirection),
    0.3,
    0.5 + 0.5 * cos(flowDirection)
  );

  return flowColor * flowStrength * 0.1;
}
`;
```

---

## 6. SHADER × EFFECTS INTEGRATION

### 6.1 Particle System Integration

From effects synthesis, particle shaders:

```typescript
interface ParticleShaderType {
  particleType: string;
  shaderApproach: string;
  blendMode: string;
}

const PARTICLE_SHADERS: ParticleShaderType[] = [
  {
    particleType: 'bioluminescent-points',
    shaderApproach: 'Point sprite with glow texture',
    blendMode: 'additive'
  },
  {
    particleType: 'marine-snow',
    shaderApproach: 'Simple opaque points',
    blendMode: 'alpha'
  },
  {
    particleType: 'tentacle-tracers',
    shaderApproach: 'Trail renderer with fading alpha',
    blendMode: 'additive'
  },
  {
    particleType: 'comb-row-particles',
    shaderApproach: 'Sequentially activated points',
    blendMode: 'screen'
  }
];
```

### 6.2 Post-Processing Chain Integration

Shader materials output connects to post-processing:

```typescript
interface PostProcessingInput {
  materialType: string;
  ppPass: string;
  threshold: number;
}

const POST_PROCESSING_INPUTS: PostProcessingInput[] = [
  {
    materialType: 'BioluminescentMaterial',
    ppPass: 'bloom',
    threshold: 0.7 // Emission > 0.7 triggers bloom
  },
  {
    materialType: 'IridescentMaterial',
    ppPass: 'chromatic-aberration',
    threshold: 0.0 // Always applies
  },
  {
    materialType: 'TranslucentMaterial',
    ppPass: 'underwater-fog',
    threshold: 0.0 // Always applies
  }
];
```

---

## 7. LOOKCONFIG INTEGRATION

From shaders synthesis, the LookConfig interface:

```typescript
interface LookConfig {
  id: string;
  displayName: string;
  category: 'realistic' | 'artistic' | 'experimental';

  // Color integration from forms synthesis
  colors: {
    primary: string;
    secondary: string;
    biolume: string;
    accent: string;
  };

  // Material integration from shaders synthesis
  material: {
    transmission: number;      // 0-1
    subsurfaceScattering: number; // 0-1
    iridescence: number;       // 0-1
    roughness: number;         // 0-1
    metalness: number;         // 0-1 (usually 0)
  };

  // Bioluminescence integration from bioluminescence synthesis
  bioluminescence: {
    enabled: boolean;
    pulseFrequency: number;    // Hz
    pulsePattern: string;
    intensity: number;         // 0-1
  };

  // Animation integration from physics synthesis
  animation: {
    breathingSpeed: number;
    undulationFrequency: number;
    driftAmount: number;
  };

  // Shader pattern assignments
  shaderPatterns: {
    translucency: string;      // Pattern ID
    bioluminescence: string;   // Pattern ID
    iridescence: string;       // Pattern ID
    animation: string;         // Pattern ID
  };
}

// Example LookConfig
const DeepSeaMedusaLook: LookConfig = {
  id: 'deep-sea-medusa',
  displayName: 'Deep Sea Medusa',
  category: 'realistic',

  colors: {
    primary: '#1a3a5c',
    secondary: '#2d5a7b',
    biolume: '#4fc3f7',
    accent: '#ff6b35'
  },

  material: {
    transmission: 0.8,
    subsurfaceScattering: 0.7,
    iridescence: 0.2,
    roughness: 0.3,
    metalness: 0.0
  },

  bioluminescence: {
    enabled: true,
    pulseFrequency: 0.8,
    pulsePattern: 'core-glow',
    intensity: 0.7
  },

  animation: {
    breathingSpeed: 0.8,
    undulationFrequency: 1.2,
    driftAmount: 0.3
  },

  shaderPatterns: {
    translucency: 'radial-bell',
    bioluminescence: 'single-photocyte-glow',
    iridescence: 'fresnel-basic',
    animation: 'breathing-motion'
  }
};
```

---

## 8. PERFORMANCE BUDGET ALLOCATION

From Stage 1.5 REVISED performance targets:

### 8.1 Tier-Based Shader Quality

```typescript
interface ShaderQualityTier {
  tier: string;
  maxShaderOperations: number;
  textureResolution: number;
  particleCount: number;
  postProcessing: string[];
}

const QUALITY_TIERS: ShaderQualityTier[] = [
  {
    tier: 'ultra',
    maxShaderOperations: 2000,
    textureResolution: 2048,
    particleCount: 20000,
    postProcessing: ['bloom', 'vignette', 'caustics', 'dof', 'chromatic-aberration']
  },
  {
    tier: 'high',
    maxShaderOperations: 1000,
    textureResolution: 1024,
    particleCount: 8000,
    postProcessing: ['bloom', 'vignette', 'caustics']
  },
  {
    tier: 'medium',
    maxShaderOperations: 500,
    textureResolution: 512,
    particleCount: 3000,
    postProcessing: ['bloom', 'vignette']
  },
  {
    tier: 'low',
    maxShaderOperations: 200,
    textureResolution: 256,
    particleCount: 1000,
    postProcessing: ['bloom']
  }
];
```

### 8.2 Per-Archetype GPU Cost

| Archetype | GPU Operations | Vertex Load | Fragment Load | Recommended Max Count (Ultra) |
|-----------|---------------|-------------|---------------|------------------------------|
| Medusozoa | 500 | Medium | Medium | 100 |
| CombJelly | 1200 | Low | High | 50 |
| Siphonophore | 400 | Low | Medium | 200 |
| BoxJelly | 600 | Medium | Medium | 150 |
| Anemone | 350 | Medium | Low | 250 |
| Salp | 300 | Low | Low | 300 |
| Ribbon | 200 | Low | Low | 500 |
| GlassSponge | 800 | High | Medium | 80 |
| Colonial | 700 | Medium | High | 100 |
| StalkedMedusa | 450 | Medium | Medium | 180 |
| PortugueseManOWar | 1000 | High | High | 60 |
| Hydromedusa | 250 | Low | Low | 400 |
| Ascidia | 300 | Low | Low | 350 |
| Experimental | 1500 | High | High | 40 |

---

## 9. IMPLEMENTATION ROADMAP

### Phase 1: Material Atom Foundation (Week 1-2)
**Priority:** CRITICAL

1. **Implement Core Material Atoms**
   - Translucency atoms: #1-#10 from brainstorm
   - Bioluminescence atoms: #40-#50
   - Base material extensions (BulbNode, GelNode, TentacleNode)

2. **Create Material Factory**
   - Atom composition system
   - Uniform merging and validation
   - LookConfig integration

3. **Archetype Presets v1**
   - Implement top 3 archetypes: Medusozoa, CombJelly, Siphonophore
   - Connect to geometry primitives
   - Basic animation linking

**Deliverable:** Working material system for 3 archetypes

### Phase 2: Full Archetype Coverage (Week 3-4)
**Priority:** HIGH

1. **Remaining 11 Archetypes**
   - Implement shader presets for all 12-15 archetypes
   - Archetype-specific material atoms

2. **Cross-Discipline Integration**
   - Geometry UV mapping
   - Bioluminescence pattern integration
   - Physics animation linking
   - Effects particle systems

3. **LookConfig System**
   - 20 preset LookConfigs
   - Runtime material switching
   - Parameter exposure to fxhash

**Deliverable:** Complete archetype shader coverage

### Phase 3: Advanced Effects (Week 5-6)
**Priority:** MEDIUM

1. **Iridescence Expansion**
   - Advanced thin-film interference
   - Holographic effects
   - Labradorescence

2. **Bioluminescence Patterns**
   - Complex wave patterns
   - Burglar alarm behavior
   - Synchronization algorithms

3. **Animation Shaders**
   - Morphing shape
   - Complex wave harmonics
   - Procedural animation

**Deliverable:** Enhanced visual variety

### Phase 4: Performance & Polish (Week 7-8)
**Priority:** MEDIUM

1. **LOD System**
   - Shader quality tiers
   - Distance-based material switching
   - Adaptive quality

2. **Optimization**
   - Shader operation counting
   - Texture atlas usage
   - Uniform buffer optimization

3. **Testing**
   - Performance profiling
   - Cross-device testing
   - Visual quality validation

**Deliverable:** Production-ready shader system

---

## 10. INTEGRATION CHECKLIST

### Cross-Discipline Dependencies

- [ ] **Forms → Shaders**: BodyPlan determines base material choice
- [ ] **Geometry → Shaders**: Primitives provide UV layouts
- [ ] **Bioluminescence → Shaders**: Glow patterns map to TSL atoms
- [ ] **Physics → Shaders**: Animation rhythms drive uniform updates
- [ ] **Effects → Shaders**: Particles use compatible blend modes
- [ ] **Stage 1.5 → Shaders**: 12-15 archetypes each need presets

### Technical Deliverables

- [ ] MaterialAtom interface and factory
- [ ] 15 archetype shader presets
- [ ] LookConfig integration system
- [ ] UV mapping strategies for all geometry primitives
- [ ] Performance tier system
- [ ] LOD material switching

### Validation Criteria

- [ ] Each archetype renders correctly
- [ ] 60 FPS achieved with target creature counts
- [ ] All TSL patterns compile without errors
- [ ] LookConfig system works at runtime
- [ ] Cross-discipline data flows correctly

---

## 11. EXAMPLE: COMPLETE CREATURE ASSEMBLY

```typescript
/**
 * Complete example of cross-disciplinary integration
 * Creating a Deep Sea Medusozoa jellyfish
 */

// 1. FORMS: Select body plan
const bodyPlan: BodyPlan = BodyPlan.Medusa;

// 2. GEOMETRY: Assemble primitives
const geometry: GeneratedGeometry = {
  base: {
    primitive: 'Ellipsoid',
    params: { radiusTop: 1.0, radiusBottom: 0.8, height: 0.6 }
  },
  tentacles: [
    {
      primitive: 'ChainTentacle',
      params: { segments: 50, length: 3.0 },
      attachment: { system: 'RadialAttachment', count: 16 }
    }
  ],
  crossSection: 'CircularProfile',
  uvMapping: 'polar-uv'
};

// 3. BIOLUMINESCENCE: Define glow pattern
const bioluminescence: BioluminescentPattern = {
  type: 'diffuse_glow',
  location: { region: 'oral_cavity', distribution: 'spherical-cluster' },
  animation: { type: 'pulse', frequency: 0.8, amplitude: 0.3 },
  color: { temperature: 4500, baseIntensity: 0.7 },
  synchronization: { type: 'synchronous', coordination: 0.9 }
};

// 4. PHYSICS: Configure movement
const physics: PhysicsConfig = {
  movement: { type: 'jet-pulse', jetPulse: { frequency: 0.8, contraction: 0.3 } },
  tentacles: { chain: { segmentCount: 50, stiffness: 0.05 } },
  animation: { pulse: { frequency: 0.8, amplitude: 0.3 } }
};

// 5. LOOKS: Configure appearance
const look: LookConfig = DeepSeaMedusaLook;

// 6. SHADERS: Assemble material
const material = MaterialFactory.assemble({
  base: 'BulbNodeMaterial',
  atoms: [
    ShaderAtoms.TRANSLUCENCY_RADIAL_BELL,
    ShaderAtoms.SSS_MULTI_LAYER,
    ShaderAtoms.BIOLUMINESCENCE_CORE_GLOW,
    ShaderAtoms.IRIDESCENCE_FRESENEL,
    ShaderAtoms.ANIMATION_BREATHING
  ],
  uniforms: {
    // Merged from all atoms
    ...look.material,
    ...look.bioluminescence,
    ...look.animation
  }
});

// 7. ASSEMBLE: Combine into creature
const creature: CreatureSpec = {
  bodyPlan,
  geometry,
  bioluminescence,
  physics,
  look,
  material
};

// Result: Fully integrated deep sea jellyfish
```

---

## CONCLUSION

This integration document provides the roadmap for implementing a composable TSL material system that:

1. **Supports 12-15 archetypes** with distinct shader identities
2. **Integrates all disciplines** through clear data flow
3. **Achieves performance targets** through tiered quality system
4. **Enables 8,640,000+ practical combinations** through material atom composition
5. **Maintains visual fidelity** through scientifically-informed shader patterns

The key innovation is the **Material Atom system**—composable shader fragments that combine like LEGO bricks. This allows the expansive variety demanded by Stage 1.5 REVISED decisions while maintaining the performance requirements of a WebGPU real-time system.

**Next Steps:**
1. Implement MaterialAtom interface
2. Create core material atoms (translucency, bioluminescence, iridescence)
3. Build MaterialFactory for composition
4. Implement archetype presets (start with Medusozoa, CombJelly, Siphonophore)
5. Integrate with geometry and bioluminescence systems
6. Performance test and optimize

---

**Stage 2 Integration: COMPLETE**
**Specialist:** Shader & Materials Artist
**Date:** 2026-02-08
**Project:** Abyssal Genesis - Epic Jelly WebGPU

---

*Generated for cross-disciplinary integration*
*Integrates: Stage 1 Shaders, Forms, Geometry, Bioluminescence, Physics, Effects*
*Aligned with: Stage 1.5 REVISED BMad decisions (12-15 archetypes)*
