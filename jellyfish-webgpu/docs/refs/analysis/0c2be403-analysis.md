# Visual Reference Analysis: 0c2be403
# Deep Sea Creature Collection (12 Specimens A-L)

> **Abyssal Genesis** - Generative Art Project
> **Analyzed:** 2026-02-08
> **Source:** docs/refs/0c2be4030c5f125cde67d6f42fb17387.jpg

---

## Executive Summary

This image contains **12 distinct deep sea creatures** (jellyfish and comb jellies) arranged in a laboratory composite. Each specimen offers unique morphological variations ideal for procedural generation parameters.

**Key Insight:** This is a reference **collection sheet** showing morphological diversity rather than a single creature.

---

## 1. VISUAL ANALYSIS

### Creature A - Frilly Medusa
- **Type:** Medusozoa (Jellyfish)
- **Body:** Irregular flattened bell, numerous long thin frilly tentacles
- **Colors:** Translucent white/gray (#F0F0F0-#D0D0D0), bluish tint (#E0E8F0)
- **Texture:** Gelatinous, highly translucent, smooth but slightly uneven
- **Movement:** Passive drifter, slow pulsing, tentacles trail behind

### Creature B - Blue Bell
- **Type:** Medusozoa (Jellyfish)
- **Body:** Rounded defined bell, prominent oral arms, skirt of short tentacles
- **Colors:** Deep blue bell (#003366), yellowish-brown oral arms (#CCAA33)
- **Texture:** Gelatinous, somewhat opaque bell, textured oral arms
- **Movement:** Pulsing jet propulsion, active feeding motion

### Creature C - Golden Long-Tentacle
- **Type:** Medusozoa (Jellyfish)
- **Body:** Elongated flattened bell, extremely long feathery tentacles
- **Colors:** Translucent white with golden hue in center (#FFD700)
- **Texture:** Gelatinous, highly translucent, glass-like smooth
- **Movement:** Slow drift with gentle undulations

### Creature D - Comb Jelly
- **Type:** Ctenophora (Comb Jelly)
- **Body:** Spherical with distinct comb rows (blue lines), two long trailing tentacles
- **Colors:** Deep blue body (#003366), central red spot (#FF0000), lighter blue comb rows (#6699CC)
- **Texture:** Gelatinous, translucent, smooth with comb row texture
- **Movement:** Slow pulsating via comb rows, tentacles trail

### Creature E - Boxy Medusa
- **Type:** Medusozoa (Jellyfish)
- **Body:** Elongated boxy bell, two long prominent tentacles from top
- **Colors:** Translucent white with yellowish tint (#FFFFCC), greenish tips (#CCFFCC)
- **Texture:** Gelatinous, highly translucent, delicate
- **Movement:** Slow drift with bell pulsing

### Creature F - Blue Skirt
- **Type:** Medusozoa (Jellyfish)
- **Body:** Rounded flattened bell, oral arms + skirt of short tentacles
- **Colors:** Deep blue bell (#003366), white tentacles (#F5F5F5)
- **Texture:** Gelatinous, somewhat opaque bell
- **Movement:** Pulsing jet propulsion

### Creature G - Internal Network
- **Type:** Medusozoa (Jellyfish)
- **Body:** Rounded bell with visible internal gastrovascular network
- **Colors:** Deep blue bell (#003366), reddish-pink internal structures (#FF9999)
- **Texture:** Gelatinous, translucent, complex internal visual texture
- **Movement:** Pulsing jet propulsion

### Creature H - Orange Center
- **Type:** Medusozoa (Jellyfish)
- **Body:** Rounded bell with internal network + orange center structure
- **Colors:** Deep blue bell (#003366), orange internal hue (#FFA500)
- **Texture:** Gelatinous, translucent with internal complexity
- **Movement:** Pulsing jet propulsion

### Creature I - Green Bell
- **Type:** Medusozoa (Jellyfish)
- **Body:** Rounded bell with internal network + yellow/green center
- **Colors:** Deep green bell (#006633), yellow/green internal (#FFFF00, #99FF99)
- **Texture:** Gelatinous, translucent with internal complexity
- **Movement:** Pulsing jet propulsion

### Creatures J, K, L - Golden Flowing
- **Type:** Medusozoa (Jellyfish)
- **Body:** Similar to C - elongated bells with extremely long feathery tentacles
- **Colors:** Translucent white with golden hue (#FFD700)
- **Texture:** Gelatinous, highly translucent, glass-like
- **Movement:** Slow drift with gentle undulations

---

## 2. TECHNICAL IMPLEMENTATION MAPPING

### Geometry System Requirements

| Module | Purpose | Parameters |
|--------|---------|------------|
| **BodyModule** | Bell shape variations | `bellShape` (round, elongated, boxy, irregular), `bellHeight`, `bellWidth`, `flatness` |
| **AppendageModule** | Tentacle types | `tentacleType` (frilly, oral, skirt, long-trailing, comb), `tentacleCount`, `tentacleLength`, `tentacleThickness` |
| **SurfaceModule** | Internal structures | `showInternalNetwork` (bool), `internalColor`, `combRows` (for Ctenophora) |

### TSL Shader Approach

| Material | Use Case | Key Features |
|----------|----------|--------------|
| **Bulb Material** | Bell body | Fresnel iridescence, subsurface scattering for translucency |
| **Tentacles Material** | All tentacle types | Glow at tips, translucency, flow animation |
| **Gel Material** | Gelatinous body | Volume transmission, internal structure rendering |
| **Comb Material** | Ctenophora comb rows | Iridescent lines, rainbow diffraction grating effect |

### Particle System (particulate.js)

```javascript
// Tentacle simulation parameters
{
  tentacleCount: [8, 200],      // Creature F has dense skirt, C has sparse long
  tentacleLength: [0.5, 5.0],   // C has extremely long tentacles
  tentacleStiffness: [0.01, 0.3], // Oral arms stiffer, frilly very flexible
  flowBehavior: 'trail',        // Trail behind movement
  tentacleType: ['frilly', 'oral', 'skirt', 'trailing', 'comb']
}
```

### Post-Processing

- **Bloom:** Essential for internal glow structures (creatures G, H, I)
- **Vignette:** Focus on creature against dark background
- **Lens Dirt:** Add atmosphere for deep sea feel
- **Chromatic Aberration:** Subtle edge fringing for translucency effect

---

## 3. GENERATIVE DESIGN PATTERNS

### Parameter Ideas

| Category | Parameters | Value Range |
|----------|------------|-------------|
| **Bell Geometry** | `bellShape`, `bellProportion`, `flatness` | Enum, 0.3-2.0, 0.1-1.0 |
| **Tentacle Config** | `tentacleType`, `count`, `lengthDistribution` | Enum, 8-200, Curve |
| **Color Palette** | `primaryColor`, `accentColor`, `internalGlowColor` | Color, Color, Color |
| **Translucency** | `opacity`, `subsurfaceScattering`, `internalVisibility` | 0.1-0.9, 0.0-1.0, Bool |
| **Internal Structure** | `showNetwork`, `networkColor`, `networkDensity` | Bool, Color, 0.1-1.0 |

### Archetype Suggestions

1. **Classic Medusa** (Creature B, F) - Round bell + oral arms + tentacle skirt
2. **Flowing Ethereal** (Creature A, C, J-L) - Elongated bell + extremely long frilly tentacles
3. **Comb Jelly** (Creature D) - Spherical + comb rows + two long tentacles
4. **Boxy Medusa** (Creature E) - Angular bell + minimal prominent tentacles
5. **Internal Glow** (Creature G, H, I) - Translucent bell with visible internal anatomy

### Evolution Traits (fxhash)

| Trait | Root | Inherited | Mutated |
|-------|------|-----------|---------|
| `bellShape` | ✅ | ✅ | ✅ (depth > 3) |
| `tentacleType` | ✅ | ✅ | ❌ |
| `primaryColor` | ✅ | ✅ (with shift) | ✅ |
| `showInternalNetwork` | ✅ | ✅ | ❌ |
| `tentacleCount` | ✅ | ✅ (±20%) | ✅ |

### Rarity Factors

- **Comb Jelly (Creature D):** Rare - only Ctenophora type
- **Golden Flowing (C, J, K, L):** Unusual color + extreme tentacle length
- **Internal Network (G, H, I):** High complexity, visible anatomy
- **Frilly Tentacles (A):** Complex tentacle tip structure

---

## 4. PRD REQUIREMENT MAPPING

| Requirement | Supported by | Notes |
|-------------|--------------|-------|
| REQ-1: Modular Geometry | All creatures | Bell + Tentacle + Surface modules clearly separated |
| REQ-2: Bioluminescent Shaders | G, H, I | Internal glow, orange/yellow centers |
| REQ-3: Open-Form Evolution | All | Clear parameter inheritance possible |
| REQ-4: Creature Variety | A-L | Multiple archetypes present |
| REQ-5: Performance | - | Translucency requires careful shader optimization |

---

## 5. IMPLEMENTATION PRIORITY

**High Priority:**
1. Creature B/F (Classic Medusa) - Base archetype
2. Creature D (Comb Jelly) - Unique propulsion mechanism
3. Creature G/H/I (Internal Glow) - Shader complexity showcase

**Medium Priority:**
4. Creature A/C/J/K/L (Flowing) - Extreme tentacle length variation
5. Creature E (Boxy) - Angular bell variation

**Technical Considerations:**
- Comb rows (Creature D) require custom shader with rainbow diffraction
- Internal networks (G, H, I) need volumetric rendering or internal mesh
- Frilly tentacles (A, C) may need geometry shader or high particle count

---

**Analysis Complete**
**Next Step:** Implement Creature B as base archetype, then modular variations
