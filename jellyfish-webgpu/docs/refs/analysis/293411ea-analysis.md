# Visual Reference Analysis: 293411ea
# Ctenophora (Comb Jelly) - Lobed Head with Comb Rows

> **Abyssal Genesis** - Generative Art Project
> **Analyzed:** 2026-02-08
> **Source:** docs/refs/293411ea8a3f207304030c9cf6dc4e32.jpg

---

## Executive Summary

This image depicts a **Ctenophora (Comb Jelly)** - a definitive identification based on eight longitudinal rows of cilia (comb rows) and bilateral symmetry. Features prominent lobed head with sensory organs and elongated cylindrical body.

**Key Insight:** Comb rows create a unique **iridescent diffraction grating effect** when beating - critical shader opportunity.

---

## 1. VISUAL ANALYSIS

### Creature Type
**Ctenophora (Comb Jelly)** - Definitive identification via 8 comb rows (ctene)

### Body Structure
| Element | Description |
|---------|-------------|
| **Shape** | Elongated cylindrical, 4:1 length-to-width ratio |
| **Head** | Two prominent rounded lobes (sensory organs, statocysts) |
| **Comb Rows** | 8 rows, 4 pairs (bilateral), full body length |
| **Cilia** | Extremely fine, hair-like, feather-like pattern |
| **Internal** | Central opaque axis (digestive tract/nerve cord) |
| **Surface** | Head lobes: mosaic/bumpy texture; Body: smooth with granular |

### Color Palette
| Region | Colors |
|--------|--------|
| **Main Body** | Pale translucent white `#F5F7FA` to `#E6F0FA` |
| **Central Axis** | Warmer yellowish/amber `#FFF8E1` to `#FFE0B2` |
| **Head Lobes** | Deeper blues with purple hints `#C5CAE9` to `#9FA8DA` |
| **Potential Bioluminescence** | Cool blue-green `#00FFCC` to `#66FF99` (inferred) |

### Bioluminescence (Inferred)
- **Pattern:** Shimmering iridescent glow from comb rows
- **Motion:** Wave-like ripples from coordinated cilia beating
- **Color:** Cool blue-green (typical of ctenophores)
- **Intensity:** Brighter on comb row edges, pulsating from head

### Movement Quality
- **Primary:** Slow graceful movement via cilia beating
- **Flow:** Coordinated wave-like motion ("rowing" through water)
- **Character:** Drifting with gentle propulsion
- **Comb Dynamics:** Wave-like beating pattern creating shimmer

### Texture/Material
- **Primary:** Translucent, gelatinous
- **Iridescence:** Potential in comb rows (diffraction grating)
- **Surface:** Smooth macro, intricate micro texture
- **Density:** Very low, water-filled, buoyant

---

## 2. TECHNICAL IMPLEMENTATION MAPPING

### Geometry System Requirements

```javascript
// Ctenophora-specific geometry
{
  bodyModule: {
    type: 'ctenophora',
    shape: 'elongated-cylindrical',
    headLobes: 2,
    proportions: { length: 4, width: 1 }
  },
  appendageModule: {
    combRows: 8,
    combRowArrangement: 'bilateral-pairs',
    ciliaDensity: 'ultra-high',
    ciliaLength: 'uniform'
  },
  surfaceModule: {
    headTexture: 'mosaic-bumpy',
    bodyTexture: 'smooth-granular',
    internalAxis: true
  }
}
```

### TSL Shader Approach

```javascript
// Comb row shader - CRITICAL: iridescent diffraction
const CombRowMaterial = {
  // Iridescent diffraction grating effect
  iridescenceIntensity: 0.8,
  iridescenceColors: [
    new THREE.Color('#00FFCC'), // Cyan
    new THREE.Color('#66FF99'), // Green
    new THREE.Color('#00CCFF')  // Blue
  ],

  // Comb row geometry-based color shift
  diffractionGrating: true,
  diffractionAngle: 'view-dependent',

  // Translucent body
  transmission: 0.7,
  opacity: 0.3,

  // Internal axis visibility
  internalStructureColor: new THREE.Color('#FFE0B2'),
  internalGlow: 0.4
};
```

### Particle System Configuration

```javascript
// Comb row cilia simulation
{
  name: 'combRows',
  count: 8,
  type: 'cilia-array',
  ciliaPerRow: 500-1000, // Ultra-high density
  behavior: 'wave-beat',
  wavePattern: 'sine',
  waveSpeed: 2.0,
  wavePhaseOffset: 'sequential-across-rows', // Create shimmer
  attachPoints: 'lateral-body-line'
}
```

### Post-Processing
- **Bloom:** Essential for bioluminescent comb rows
- **Chromatic Aberration:** Enhance iridescence
- **Vignette:** Dark deep sea feel
- **Color Grading:** Push toward cyan/blue/green

---

## 3. GENERATIVE DESIGN PATTERNS

### Parameter Ideas

| Category | Parameter | Range | Notes |
|----------|-----------|-------|-------|
| **Body Geometry** | `bodyLengthRatio` | 3:1 to 6:1 | Elongation factor |
| | `headLobeSize` | 0.1 to 0.3 | Relative to body |
| **Comb Rows** | `combRowCount` | 8 (standard) | Fixed for ctenophores |
| | `ciliaLength` | 0.5 to 2.0 | Length multiplier |
| | `beatFrequency` | 1.0 to 5.0 | Wave speed |
| **Color** | `primaryHue` | 0.4-0.55 | Cyan to green range |
| | `iridescenceIntensity` | 0.0 to 1.0 | Rainbow effect |
| **Internal** | `axisOpacity` | 0.2 to 0.8 | Visibility of internal structure |
| | `headPatternComplexity` | 0.0 to 1.0 | Mosaic detail |

### Archetype Suggestions

**Archetype: Ctenophora**
- **Variation 1:** Standard comb jelly (8 rows, bilateral)
- **Variation 2:** Elongated form (6:1 ratio, fewer tentacles)
- **Variation 3:** Large head lobes (prominent sensory)

### Evolution Traits (fxhash)

| Trait | Root | Inherited | Mutation |
|-------|------|-----------|----------|
| `bodyLengthRatio` | ✅ | ✅ ±10% | ✅ ±50% (depth > 3) |
| `primaryHue` | ✅ | ✅ ±5% | ✅ (depth > 4) |
| `iridescenceIntensity` | ✅ | ✅ | ✅ (depth > 2) |
| `headLobeSize` | ✅ | ✅ | ❌ |

### Rarity Factors
- **Extreme iridescence (>0.9):** Rare visual trait
- **Unusual hue (not cyan/green):** Mutated
- **Very elongated (>5:1):** Specialized variant

---

## 4. PRD REQUIREMENT MAPPING

| Requirement | Support | Notes |
|-------------|---------|-------|
| REQ-1: Modular Geometry | ✅ | Clear body/appendage/surface separation |
| REQ-2: Bioluminescent Shaders | ✅ | Iridescent comb rows are key feature |
| REQ-3: Open-Form Evolution | ✅ | Good parameter space |
| REQ-4: Creature Variety | ✅ | Ctenophora archetype |
| REQ-5: Performance | ⚠️ | Ultra-high cilia density needs LOD |

---

## 5. IMPLEMENTATION NOTES

### Technical Challenges
1. **Comb Row Iridescence:** Diffraction grating shader is complex
2. **Cilia Density:** 500-1000 per row × 8 rows = 4000-8000 particles
3. **Wave Animation:** Coordinated beating across all rows

### Unique Value Proposition
- **Most visually striking:** Comb rows create rainbow diffraction
- **Distinct from jellyfish:** Bilateral symmetry, no bell
- **Technical showcase:** Iridescence shader demonstrates shader mastery

### Implementation Priority
1. Comb row shader (critical unique feature)
2. Body geometry with head lobes
3. Cilia particle system with wave animation
4. Internal axis rendering
5. Bioluminescent glow effects

---

**Analysis Complete**
**Next Step:** Implement iridescent comb row shader as technical centerpiece
