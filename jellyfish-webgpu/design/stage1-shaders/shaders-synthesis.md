# TSL SHADER PATTERNS SYNTHESIS: EPIC JELLY WEBGPU
**Synthesis Date**: 2026-02-08
**Role**: Shader & Materials Artist
**Based On**: shaders-brainstorm.md (150+ patterns)
**Visual Reference Analysis**: 64970552, 838ba040 (bioluminescent deep-sea species)

---

## EXECUTIVE SUMMARY

This synthesis document transforms 150+ brainstormed TSL shader patterns into a structured, implementable system for the Epic Jelly WebGPU project. The patterns are organized by material type, complexity, and integration potential with the existing BulbNodeMaterial architecture.

**Key Insight:** The most effective jellyfish shaders combine **3 core layers**:
1. **Subsurface scattering** for gelatinous authenticity
2. **Bioluminescent emission** with temporal variation
3. **Iridescent Fresnel** for ethereal edge quality

---

## TABLE OF CONTENTS
1. [Brainstorming Summary](#brainstorming-summary)
2. [Material Types Inventory](#material-inventory)
3. [TSL Shader Pattern Catalog](#pattern-catalog)
4. [Interface with LookConfig](#lookconfig-interface)
5. [Implementation Roadmap](#implementation-roadmap)

---

## 1. BRAINSTORMING SUMMARY

### Elicitation Methods Applied

| Method | Key Insights | Patterns Generated |
|--------|--------------|-------------------|
| **Tree of Thoughts** | Core shader philosophy = light/dark relationship | 45 foundational patterns |
| **Sensory Exploration** | Visual/tactile/kinesthetic breakdown | 30 sensory-based patterns |
| **Cross-Pollination** | Marine biology + optical physics | 25 nature-inspired patterns |
| **What If Scenarios** | Impossible physics = creative freedom | 20 experimental patterns |
| **Concept Blending** | Art styles + jellyfish biology | 30 fusion patterns |

### Top 10 Most Innovative Patterns

1. **Atolla Alarm Display** (#51) - Deep red flashing predator response
2. **Comb Jelly Diffraction** (#52) - Rainbow ciliary plate interference
3. **Neural Wave Propagation** (#56) - Nerve net pulse simulation
4. **Peristaltic Wave** (#108) - Contraction propagation along tentacles
5. **Reaction-Diffusion Bioluminescence** (#57) - Chemical pattern formation
6. **Soap-Film Iridescence** (#26) - Variable thickness interference
7. **Labradorite Spectrolite** (#27) - Intense schiller effect
8. **Quantum Bioluminescence** (#60) - Superposition state emission
9. **Morphing Shape** (#111) - Form transformation animation
10. **Ray Marching Fog** (#143) - Volumetric light transport

### Pattern Categories by Frequency

```
Bioluminescence:    20 patterns (13.3%)
Translucency:       20 patterns (13.3%)
Iridescence:        20 patterns (13.3%)
Surface Materials:  20 patterns (13.3%)
Color Patterns:     20 patterns (13.3%)
Animation:          20 patterns (13.3%)
Post-Processing:    20 patterns (13.3%)
Advanced WebGPU:    10 patterns (6.7%)
```

### Performance Complexity Analysis

| Complexity Level | Pattern Count | GPU Intensity | Recommended Use |
|------------------|---------------|---------------|-----------------|
| Low (1-3 ops)    | 45 patterns   | Minimal       | Mobile/low-end  |
| Medium (4-8 ops) | 75 patterns   | Moderate      | Desktop/standard|
| High (9-15 ops)  | 25 patterns   | Significant   | High-end only   |
| Very High (16+)  | 5 patterns    | Extreme       | Experimental   |

---

## 2. MATERIAL TYPES INVENTORY

### Core Material Matrix

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         EPIC JELLY MATERIAL MATRIX                         │
├──────────────────┬─────────────┬─────────────┬─────────────┬──────────────┤
│                  │ TRANSLUCENT │ OPAQUE      │ PARTICULATE │ VOLUMETRIC   │
├──────────────────┼─────────────┼─────────────┼─────────────┼──────────────┤
│ BIOLUMINESCENT   │ Bulb        │ -           │ Dust        │ Biolume Cloud│
│                  │ Tentacle    │             │             │              │
├──────────────────┼─────────────┼─────────────┼─────────────┼──────────────┤
│ GELATINOUS       │ Gel         │ -           │ -           │ -            │
│                  │ SSS Bell    │             │             │              │
├──────────────────┼─────────────┼─────────────┼─────────────┼──────────────┤
│ IRIDESCENT       │ Nacre Bell  │ -           │ -           │ -            │
│                  │ Shell       │             │             │              │
├──────────────────┼─────────────┼─────────────┼─────────────┼──────────────┤
│ STRUCTURAL       │ Tail        │ Skeleton    │ -           │ -            │
│                  │ Oral Arms   │             │             │              │
├──────────────────┼─────────────┼─────────────┼─────────────┼──────────────┤
│ HYBRID           │ Bell+Gel    │ -           │ -           │ -            │
│                  │ Multi-layer │             │             │              │
└──────────────────┴─────────────┴─────────────┴─────────────┴──────────────┘
```

### Existing Material Analysis

**BulbNodeMaterial** (Primary Bell Material)
```typescript
Strengths:
✓ 7-layer sine interference creates complex organic patterns
✓ Rim lighting integration for edge enhancement
✓ Oscillating scales with time variation
✓ Two-color gradient mixing
✓ Physics interpolation support
✓ Refraction + dispersion for glassy effect

Limitations:
✗ Fixed to 4 UV variations
✗ Bioluminescence is color mixing, not true emission
✗ No subsurface scattering implementation
✗ Thin-film interference not utilized
```

**TentacleNodeMaterial** (Tentacle Material)
```typescript
Strengths:
✓ Distance-based glow (brighter at center)
✓ White-to-diffuse color gradient
✓ Squared falloff for softness
✓ Interpolation support

Limitations:
✗ No time-based animation
✗ Fixed area parameter
✗ No structural variation along length
```

**GelNodeMaterial** (Overlay Material)
```typescript
Strengths:
✓ Three-level rim lighting (base, mid, edge)
✓ Additive blending for glow
✓ Position interpolation
✓ Radial normal calculation

Limitations:
✗ No surface variation
✗ Uniform opacity
✗ No temporal animation
```

**DustNodeMaterial** (Particle Material)
```typescript
Strengths:
✓ Vertical cycling animation
✓ Sine wave horizontal drift
✓ Size attenuation
✓ Distance-based illumination

Limitations:
✗ Fixed to circular particle shape
✗ No particle interaction
✗ Uniform drift pattern
```

### Proposed New Materials

#### 1. BiolumeClusterMaterial
**Purpose:** Point-source bioluminescent emission
**TSL Patterns:** #41-50 (Point-Source Emission)
**Priority:** HIGH
**Use Case:** Oral arm photocytes, burglar alarm display

```typescript
interface BiolumeClusterUniforms {
  emissionColor: THREE.Color;
  pulseFrequency: number;
  pulseAmplitude: number;
  clusterRadius: number;
  pointDensity: number;
}

class BiolumeClusterMaterial extends InterpolatedNodeMaterial {
  // TSL implementation using patterns #41-50
}
```

#### 2. IridescentBellMaterial
**Purpose:** Thin-film interference bell surface
**TSL Patterns:** #21-40 (Iridescence & Thin-Film Effects)
**Priority:** MEDIUM
**Use Case:** Comb jellies, surface sheen

```typescript
interface IridescentBellUniforms {
  baseColor: THREE.Color;
  filmThickness: number;
  spectralIntensity: number;
  fresnelPower: number;
}

class IridescentBellMaterial extends InterpolatedNodeMaterial {
  // TSL implementation using patterns #21-40
}
```

#### 3. SSSBellMaterial
**Purpose:** Subsurface scattering gelatinous body
**TSL Patterns:** #5-8 (Advanced SSS)
**Priority:** HIGH
**Use Case:** Realistic jellyfish bell

```typescript
interface SSSBellUniforms {
  scatterColor: THREE.Color;
  scatterRadius: number;
  thickness: number;
  anisotropy: number;
}

class SSSBellMaterial extends InterpolatedNodeMaterial {
  // TSL implementation using patterns #5-8
}
```

---

## 3. TSL SHADER PATTERN CATALOG

### Category 1: Essential Translucency (High Priority)

#### Pattern #2: Radial Bell Translucency
```typescript
// Center-thick, edge-thin gelatinous effect
// Adapted from brainstorm pattern #2

const radialTranslucent = Fn(() => {
  const pos = positionLocal;
  const distFromCenter = length(vec2(pos.x, pos.z));
  const thickness = smoothstep(float(0.0), float(1.0), distFromCenter);
  const transmission = mix(float(0.95), float(0.4), thickness);
  return transmission;
});

// Integration with BulbNodeMaterial:
// Add to colorNode calculation:
// finalColor = finalColor.mul(transmission);
```

**Why Essential:** Jellyfish bells are thickest at the apex and thinnest at the margin. This radial gradient is anatomically accurate and visually effective.

#### Pattern #5: Multi-Layer Subsurface
```typescript
// Simulate multiple tissue layers with different scattering
// Adapted from brainstorm pattern #5

const multiLayerSSS = Fn(() => {
  const thickness = texture(thicknessTexture, uv()).r;
  const epidermisScatter = vec3(0.8, 0.85, 0.9); // Outer layer
  const mesogleaScatter = vec3(0.7, 0.75, 0.85); // Gel layer
  const gastrovascularScatter = vec3(0.6, 0.7, 0.8); // Inner cavity

  const layer1 = smoothstep(float(0.0), float(0.3), thickness);
  const layer2 = smoothstep(float(0.3), float(0.7), thickness);
  const layer3 = smoothstep(float(0.7), float(1.0), thickness);

  const sssColor = mix(epidermisScatter,
    mix(mesogleaScatter, gastrovascularScatter, layer3), layer2);

  return sssColor;
});

// Integration with BulbNodeMaterial:
// Replace simple diffuse with multi-layer SSS
// this.colorNode = multiLayerSSS();
```

**Why Essential:** Real jellyfish have three tissue layers (epidermis, mesoglea, gastrodermis). Multi-layer SSS creates depth and realism.

### Category 2: Bioluminescence Core (High Priority)

#### Pattern #41: Single Photocyte Glow
```typescript
// Individual cell emission
// Adapted from brainstorm pattern #41

const photocyteGlow = Fn(() => {
  const time = timeUniform;
  const pulsePhase = time.mul(float(2.0)); // 2 Hz

  const pulse = sin(pulsePhase).mul(float(0.5)).add(float(0.5));
  const intensity = mix(float(0.5), float(1.0), pulse);

  const glowColor = vec3(float(0.0), float(1.0), float(0.8)).mul(intensity);
  return glowColor;
});

// Integration with BulbNodeMaterial:
// Add emissive property:
// this.emissiveNode = photocyteGlow();
// this.emissiveIntensity = 5.0; // HDR glow
```

**Why Essential:** The fundamental building block of all bioluminescence. Individual photocyte behavior scales to clusters and waves.

#### Pattern #44: Traveling Wave Bioluminescence
```typescript
// Wave of light moving across surface
// Adapted from brainstorm pattern #44

const travelingWaveBiolume = Fn(() => {
  const pos = positionLocal;
  const time = timeUniform.mul(float(2.0));

  const wavePhase = pos.y.sub(time);
  const waveProfile = smoothstep(float(0.0), float(0.3), sin(wavePhase.mul(float(2.0))));

  const glowColor = vec3(float(0.0), float(1.0), float(0.8)).mul(waveProfile);
  return glowColor;
});

// Integration with BulbNodeMaterial:
// Creates neural wave propagation effect
// this.emissiveNode = travelingWaveBiolume();
```

**Why Essential:** Many jellyfish exhibit traveling waves of bioluminescence along their bell margin or tentacles. This pattern simulates neural activation.

### Category 3: Iridescence Enhancement (Medium Priority)

#### Pattern #21: Basic Fresnel Iridescence
```typescript
// Simple view-angle color shift
// Adapted from brainstorm pattern #21

const fresnelIridescence = Fn(() => {
  const viewDir = cameraPosition.sub(positionWorld).normalize();
  const normal = normalize(positionLocal);
  const nDotV = max(dot(viewDir, normal), float(0.0));
  const fresnel = pow(float(1.0).sub(nDotV), float(5.0));

  const baseColor = vec3(float(0.5), float(0.7), float(0.9));
  const iridColor = vec3(float(0.8), float(0.6), float(1.0));

  return mix(baseColor, iridColor, fresnel);
});

// Integration with BulbNodeMaterial:
// Add to colorNode:
// const iridescence = fresnelIridescence();
// finalColor = finalColor.mul(float(0.7)).add(iridescence.mul(float(0.3)));
```

**Why Essential:** Adds ethereal edge quality that defines "otherworldly" appearance. Low computational cost for high visual impact.

#### Pattern #52: Comb Jelly Diffraction
```typescript
// Rainbow ciliary plate effect
// Adapted from brainstorm pattern #52

const combJellyDiffraction = Fn(() => {
  const uv = uv();
  const viewDir = cameraPosition.sub(positionWorld).normalize();
  const normal = normalize(positionLocal);
  const nDotV = abs(dot(viewDir, normal));

  const ciliaSpacing = float(8.0);
  const ciliaPhase = uv.x.mul(ciliaSpacing).mul(PI).mul(float(2.0));

  const diffractionColor = vec3(
    sin(ciliaPhase.add(nDotV.mul(float(3.0)))).mul(float(0.5)).add(float(0.5)),
    sin(ciliaPhase.add(nDotV.mul(float(4.0)))).mul(float(0.5)).add(float(0.5)),
    sin(ciliaPhase.add(nDotV.mul(float(5.0)))).mul(float(0.5)).add(float(0.5))
  );

  return diffractionColor;
});

// Integration with BulbNodeMaterial:
// Creates rainbow sheen for ctenophore species
// this.colorNode = combJellyDiffraction();
```

**Why Essential:** Signature feature of comb jellies (Ctenophora). Creates iconic rainbow effect unique to this phylum.

### Category 4: Animation Dynamics (High Priority)

#### Pattern #101: Breathing Motion
```typescript
// Expand-contraction cycle
// Adapted from brainstorm pattern #101

const breathingMotion = Fn(() => {
  const time = timeUniform.mul(float(0.5));
  const breathPhase = sin(time).mul(float(0.5)).add(float(0.5));

  const expansionAmount = float(0.1);
  const expansion = breathPhase.mul(expansionAmount);

  const displacedPos = positionLocal.mul(float(1.0).add(expansion));
  return displacedPos;
});

// Integration with BulbNodeMaterial:
// Add to positionNode for bell pulsation
// this.positionNode = breathingMotion();
```

**Why Essential:** Jellyfish locomotion IS bell pulsation. Breathing motion is the fundamental animation pattern.

#### Pattern #102: Undulating Wave
```typescript
// Sinusoidal displacement
// Adapted from brainstorm pattern #102

const undulatingWave = Fn(() => {
  const pos = positionLocal;
  const time = timeUniform.mul(float(2.0));

  const wavePhase = pos.y.mul(float(3.0)).sub(time);
  const waveOffset = sin(wavePhase).mul(float(0.05));

  const displacedPos = pos.add(vec3(float(0.0), float(0.0), waveOffset));
  return displacedPos;
});

// Integration with TentacleNodeMaterial:
// Creates flowing tentacle motion
// this.positionNode = undulatingWave();
```

**Why Essential:** Tentacles don't move rigidly—they undulate with sine-wave dynamics. This pattern captures that organic motion.

---

## 4. INTERFACE WITH LookConfig

### LookConfig Integration Strategy

The `LookConfig` system (from colors-brainstorm.md) defines color palettes and visual styles. Shader materials must integrate with this system.

#### Proposed LookConfig Structure

```typescript
interface LookConfig {
  id: string;
  displayName: string;
  category: 'realistic' | 'artistic' | 'experimental';

  // Color palette
  colors: {
    primary: vec3;      // Main body color
    secondary: vec3;    // Secondary/gradient color
    biolume: vec3;      // Bioluminescence color
    accent: vec3;       // Rim/emphasis color
  };

  // Material properties
  material: {
    transmission: number;   // 0-1 translucency
    subsurfaceScattering: number; // 0-1 SSS intensity
    iridescence: number;    // 0-1 thin-film effect
    roughness: number;      // 0-1 surface roughness
    metalness: number;      // 0-1 metallic quality
  };

  // Bioluminescence properties
  bioluminescence: {
    enabled: boolean;
    pulseFrequency: number; // Hz
    pulsePattern: 'sine' | 'traveling' | 'clustered' | 'neural';
    intensity: number;      // Emission intensity
  };

  // Animation properties
  animation: {
    breathingSpeed: number; // Bell pulsation speed
    undulationFrequency: number; // Tentacle wave speed
    driftAmount: number;    // Passive movement
  };

  // Shader pattern selections
  shaderPatterns: {
    translucency: string;   // Pattern ID from catalog
    bioluminescence: string; // Pattern ID from catalog
    iridescence: string;     // Pattern ID from catalog
    animation: string;       // Pattern ID from catalog
  };
}
```

#### Material Factory Pattern

```typescript
class MaterialFactory {
  static createFromLookConfig(
    config: LookConfig,
    type: 'bulb' | 'tentacle' | 'gel' | 'dust'
  ): THREE.Material {
    switch(type) {
      case 'bulb':
        return this.createBulbMaterial(config);
      case 'tentacle':
        return this.createTentacleMaterial(config);
      // ... other cases
    }
  }

  private static createBulbMaterial(config: LookConfig): BulbNodeMaterial {
    const material = new BulbNodeMaterial({
      color: config.colors.primary,
      transparent: true
    });

    // Apply LookConfig values
    material.setDiffuse(config.colors.primary);
    material.setDiffuseB(config.colors.secondary);

    // Apply material properties
    material.transmission = config.material.transmission;
    material.thickness = config.material.subsurfaceScattering;

    // Apply shader patterns
    const biolumePattern = ShaderPatternCatalog.getPattern(
      config.bioluminescence.pulsePattern
    );
    material.emissiveNode = biolumePattern.node;

    // Apply animation
    material.breathingSpeed = config.animation.breathingSpeed;

    return material;
  }
}
```

#### Example LookConfig: "Abyssal Biolume"

```typescript
const abyssalBiolume: LookConfig = {
  id: 'abyssal_biolume',
  displayName: 'Abyssal Biolume',
  category: 'realistic',

  colors: {
    primary: vec3(0.2, 0.3, 0.5),     // Deep blue
    secondary: vec3(0.1, 0.15, 0.3),  // Darker blue
    biolume: vec3(0.0, 0.9, 1.0),     // Cyan glow
    accent: vec3(0.5, 0.7, 1.0)       // Light blue rim
  },

  material: {
    transmission: 0.8,
    subsurfaceScattering: 0.7,
    iridescence: 0.3,
    roughness: 0.4,
    metalness: 0.0
  },

  bioluminescence: {
    enabled: true,
    pulseFrequency: 1.5,
    pulsePattern: 'traveling',
    intensity: 5.0
  },

  animation: {
    breathingSpeed: 0.5,
    undulationFrequency: 2.0,
    driftAmount: 0.1
  },

  shaderPatterns: {
    translucency: 'radial_bell',
    bioluminescence: 'traveling_wave',
    iridescence: 'fresnel_basic',
    animation: 'breathing_motion'
  }
};
```

### Shader Pattern Catalog Class

```typescript
class ShaderPatternCatalog {
  private static patterns: Map<string, ShaderPattern> = new Map();

  static registerPattern(id: string, pattern: ShaderPattern) {
    this.patterns.set(id, pattern);
  }

  static getPattern(id: string): ShaderPattern {
    return this.patterns.get(id);
  }

  // Initialize with essential patterns
  static initialize() {
    this.registerPattern('radial_bell', {
      node: radialTranslucent,
      uniformTypes: ['thickness'],
      complexity: 'low'
    });

    this.registerPattern('traveling_wave', {
      node: travelingWaveBiolume,
      uniformTypes: ['time', 'frequency'],
      complexity: 'medium'
    });

    // ... register all patterns
  }
}

interface ShaderPattern {
  node: Fn;  // TSL function node
  uniformTypes: string[];
  complexity: 'low' | 'medium' | 'high';
}
```

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Core Enhancement (Week 1-2)
**Priority:** HIGH
**Goal:** Enhance existing materials with brainstorm patterns

**Tasks:**
1. Integrate Multi-Layer SSS (#5) into BulbNodeMaterial
2. Add Radial Translucency (#2) to bell
3. Implement Photocyte Glow (#41) as emissive property
4. Create Traveling Wave (#44) bioluminescence option
5. Add Fresnel Iridescence (#21) to rim lighting

**Deliverables:**
- Enhanced BulbNodeMaterial with SSS
- New emissiveNode property for bioluminescence
- Configurable iridescence intensity
- Performance benchmarks

### Phase 2: Material Expansion (Week 3-4)
**Priority:** MEDIUM
**Goal:** Create new material classes

**Tasks:**
1. Implement BiolumeClusterMaterial
2. Create IridescentBellMaterial
3. Build SSSBellMaterial as optimized variant
4. Add CombJellyMaterial for rainbow diffraction
5. Create AtmosphericDustMaterial with volumetric scatter

**Deliverables:**
- 5 new material classes
- Material factory with LookConfig integration
- Shader pattern catalog system
- Example LookConfigs

### Phase 3: Animation Integration (Week 5-6)
**Priority:** HIGH
**Goal:** Add dynamic motion patterns

**Tasks:**
1. Integrate Breathing Motion (#101) into bell pulsation
2. Add Undulating Wave (#102) to tentacles
3. Implement Peristaltic Wave (#108) for oral arms
4. Create Spiral Bioluminescence (#45) pattern
5. Add Neural Wave Propagation (#56) effect

**Deliverables:**
- Animation system integrated with materials
- Configurable pulse frequencies
- Synchronized multi-jellyfish displays
- Performance-optimized animation paths

### Phase 4: Advanced Effects (Week 7-8)
**Priority:** LOW
**Goal:** Experimental and artistic patterns

**Tasks:**
1. Implement Soap-Film Iridescence (#26)
2. Create Labradorite Spectrolite (#27) effect
3. Build Quantum Bioluminescence (#60) pattern
4. Add Morphing Shape (#111) animation
5. Experiment with Ray Marching Fog (#143)

**Deliverables:**
- Experimental shader library
- Artistic variant materials
- Performance profiling data
- Documentation for experimental features

### Phase 5: LookConfig System (Week 9-10)
**Priority:** MEDIUM
**Goal:** Complete palette integration

**Tasks:**
1. Finalize LookConfig interface
2. Create 20 preset LookConfigs
3. Build MaterialFactory with config parsing
4. Add runtime material switching
5. Implement preset saving/loading

**Deliverables:**
- Complete LookConfig system
- 20 curated presets
- UI for material configuration
- Export/import functionality

### Phase 6: Optimization & Polish (Week 11-12)
**Priority:** HIGH
**Goal:** Production-ready shader system

**Tasks:**
1. Profile all shader patterns
2. Implement LOD system for complex patterns
3. Add mobile device fallbacks
4. Create shader variant permutations
5. Write comprehensive documentation

**Deliverables:**
- Optimized shader library
- LOD system with quality tiers
- Mobile-compatible variants
- Complete API documentation

---

## APPENDIX A: TSL PATTERN REFERENCE

### Essential TSL Functions (from BulbNodeMaterial.ts)

```typescript
// Core TSL imports
import {
  Fn,              // Function wrapper
  color,           // Color constructor
  float,           // Float constructor
  vec3, vec2,      // Vector constructors
  uniform,         // Uniform variable
  uv,              // Texture coordinates
  screenUV,        // Screen coordinates
  texture,         // Texture sampler
  mix,             // Linear interpolation
  smoothstep,      // Smooth interpolation
  max, min,        // Min/max functions
  clamp,           // Clamp to range
  refract,         // Refraction vector
  positionWorld,   // World position
  positionLocal,   // Local position
  normalize,       // Vector normalization
  dot,             // Dot product
  cameraPosition,  // Camera position
  length,          // Vector length
  sin, cos,        // Trigonometric functions
  mod,             // Modulo
  fract,           // Fractional part
  abs,             // Absolute value
  pow,             // Power
  step,            // Step function
  floor,           // Floor
  atan,            // Arctangent
  PI               // Pi constant
} from 'three/tsl';
```

### Pattern Implementation Template

```typescript
// Template for implementing brainstorm patterns
interface ShaderPatternImplementation {
  // Pattern metadata
  id: string;
  name: string;
  category: PatternCategory;
  complexity: 'low' | 'medium' | 'high';
  description: string;

  // TSL implementation
  node: Fn;

  // Uniform requirements
  uniforms: {
    name: string;
    type: 'color' | 'float' | 'vec2' | 'vec3' | 'texture';
    defaultValue: any;
  }[];

  // Integration points
  canApplyTo: MaterialType[];

  // Performance data
  gpuOps: number;
  textureSamples: number;
  recommendedFor: 'all' | 'desktop' | 'high-end';
}

// Example implementation
const travelingWavePattern: ShaderPatternImplementation = {
  id: 'traveling_wave',
  name: 'Traveling Wave Bioluminescence',
  category: 'bioluminescence',
  complexity: 'medium',
  description: 'Wave of light moving across surface',

  node: Fn(() => {
    const pos = positionLocal;
    const time = timeUniform.mul(float(2.0));

    const wavePhase = pos.y.sub(time);
    const waveProfile = smoothstep(float(0.0), float(0.3), sin(wavePhase.mul(float(2.0))));

    const glowColor = vec3(float(0.0), float(1.0), float(0.8)).mul(waveProfile);
    return glowColor;
  }),

  uniforms: [
    { name: 'time', type: 'float', defaultValue: 0.0 },
    { name: 'frequency', type: 'float', defaultValue: 2.0 },
    { name: 'color', type: 'color', defaultValue: new THREE.Color(0x00ffcc) }
  ],

  canApplyTo: ['bulb', 'tentacle', 'gel'],

  gpuOps: 8,
  textureSamples: 0,
  recommendedFor: 'all'
};
```

---

## APPENDIX B: VISUAL REFERENCE INTEGRATION

### Reference 64970552 (Coiled Tentacle Jellyfish)

**Shader Recommendations:**
1. **Bell Material:** Radial Gradient Translucency (#81) with white apex to blue base
2. **Tentacle Material:** Distance-based glow (existing TentacleNodeMaterial)
3. **Coiled Tentacles:** Coil Ridge Color (#130) with purple accents
4. **Iridescence:** Fresnel rim lighting (#96) for edge definition
5. **Bioluminescence:** Clustered Photocytes (#42) in oral arms

**LookConfig:**
```typescript
const coiledMedusa: LookConfig = {
  colors: {
    primary: vec3(0.94, 0.97, 1.0),   // White apex
    secondary: vec3(0.12, 0.56, 1.0), // Blue base
    biolume: vec3(0.29, 0.0, 0.51),   // Purple
    accent: vec3(1.0, 0.75, 0.79)     // Pink highlights
  },
  material: {
    transmission: 0.7,
    subsurfaceScattering: 0.5,
    iridescence: 0.2
  },
  // ... other properties
};
```

### Reference 838ba040 (Deep-Sea Scyphozoan)

**Shader Recommendations:**
1. **Bell Material:** Multi-Layer SSS (#5) for tissue depth
2. **Bioluminescence:** Neural Wave Propagation (#56) for pulse patterns
3. **Color Pattern:** Spherical Gradient (#85) with transparent center
4. **Surface Texture:** Wrinkled Membrane (#61) for micro-topography
5. **Post-Processing:** Deep Sea Atmosphere (#122) for blue tint

**LookConfig:**
```typescript
const deepSeaScyphozoa: LookConfig = {
  colors: {
    primary: vec3(0.66, 0.78, 0.86),   // Pale blue
    secondary: vec3(0.85, 0.77, 0.91), // Pink-purple
    biolume: vec3(1.0, 0.42, 0.21),    // Red-orange
    accent: vec3(1.0, 0.79, 0.44)      // Orange-yellow
  },
  material: {
    transmission: 0.8,
    subsurfaceScattering: 0.9,
    iridescence: 0.4
  },
  // ... other properties
};
```

---

## CONCLUSION

This synthesis provides a complete roadmap for implementing 150+ TSL shader patterns within the Epic Jelly WebGPU project. The patterns are:

- **Organized** by category and priority
- **Analyzed** for complexity and performance
- **Integrated** with existing BulbNodeMaterial architecture
- **Connected** to LookConfig system for runtime configuration
- **Scheduled** in 6-phase implementation roadmap

**Key Success Factors:**
1. Multi-layer subsurface scattering for gelatinous realism
2. Time-varying bioluminescent emission
3. Fresnel-based iridescence for ethereal quality
4. Physics interpolation for smooth 60fps+ rendering
5. Configurable LookConfig system for artistic variety

**Next Steps:**
1. Review and approve synthesis document
2. Begin Phase 1 implementation
3. Create ShaderPatternCatalog class
4. Integrate LookConfig system
5. Performance benchmark all patterns

---

**END OF SYNTHESIS**
**Document Generated**: 2026-02-08
**Total Patterns**: 150+
**Implementation Roadmap**: 12 weeks
**LookConfig Integration**: Complete
