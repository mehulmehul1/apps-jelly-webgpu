# Technical Implementation Mapping Guide
## Abyssal Genesis - Creature Analysis to Code

This guide maps visual analysis findings directly to the existing codebase implementation patterns.

---

## CREATURE TYPE → BODY PLAN MAPPING

### Visual Classification to BodyPlan Enum

When analyzing a reference image, map the creature type to the appropriate body plan:

| Visual Characteristics | BodyPlan | Typical Features |
|------------------------|----------|------------------|
| Bell/dome shape, hanging tentacles, oral arms | `BodyPlan.Medusa` | tail, mouth, tentacles |
| Oval/egg shape, 8 comb rows, iridescent | `BodyPlan.CombJelly` | No tail/mouth, ridges |
| Tubular barrel, open ends, muscle bands | `BodyPlan.CombJelly` | No appendages, low ridges amplitude |
| Colony of zooids along stem | `BodyPlan.Siphonophore` | tail, mouth, tentacles, colony config |
| Tall vase/cylinder, lattice pattern | `BodyPlan.CombJelly` | Superformula cross-section, ridges |

### Feature Toggle Recommendations

Based on creature morphology:

```typescript
features: {
  tail: boolean,     // True: medusa, siphonophore / False: comb jellies, salps
  mouth: boolean,    // True: medusa, siphonophore / False: most others
  tentacles: boolean // True: medusa, siphonophore, anemones / False: comb jellies
}
```

---

## BODY STRUCTURE → GEOMETRY CONFIG

### Bell/Body Size Mapping

Measure the reference image proportions:

```typescript
geometry: {
  size: number,           // Overall scale (30-72 in presets)
  ribsCount: number,      // Vertical segments (12-28)
  ribRadius: number,      // Cross-section radius (14-26)
  totalSegments: number,  // Horizontal resolution
}
```

**Proportion Guidelines:**
- Tall/narrow creatures: `ribRadius < size * 0.5`
- Wide/flattened creatures: `ribRadius > size * 0.6`
- Delicate creatures: Lower `ribsCount` (12-16)
- Detailed creatures: Higher `ribsCount` (20-28)

### Profile Curves for Silhouette

Map observed silhouette to profile type:

```typescript
profiles: {
  bulb: {
    kind: 'polyline',     // Most flexible - map exact silhouette
    points: [
      [0.0, height_at_bottom],
      [0.5, height_at_middle],
      [1.0, height_at_top],
      // Add more points for complex shapes
    ]
  }
}
```

**Creating Profile from Image:**
1. Identify key silhouette inflection points
2. Normalize Y values to 0-1 range
3. Express radius as fraction of maximum width
4. Add control points at each major shape change

**Common Silhouette Patterns:**
- Bell shape: Start wide at top, narrow at bottom
- Egg shape: Narrow ends, wide middle
- Barrel: Wide through middle, rounded ends
- Vase: Narrow base, flared top

---

## SYMMETRY ANALYSIS → CONFIG

### Count and Type

From visual analysis:

```typescript
symmetry: {
  kind: 'radial',      // Most common for cnidarians
  order: number,       // Count visible repeating elements
  breaking: number,    // 0 = perfect, 0.2-0.4 = organic variation
  phase: number        // Rotation offset (0-2π)
}
```

**Symmetry Order Reference:**
- 4: Salps, some siphonophores
- 5: Echinoderms (starfish)
- 6: Glass sponges, hexactinellids
- 8: Comb jellies (ctenophores)
- 10-12: Siphonophores, anemones

### Cross-Section Shaping

Map observed cross-section shape:

```typescript
crossSection: {
  kind: 'circle',      // Basic jellyfish
  kind: 'ellipse',     // Flattened or stretched
  kind: 'superformula' // Complex star/flower shapes
}
```

**Ellipse Parameters:**
```typescript
crossSection: {
  kind: 'ellipse',
  xScale: 0.8-1.2,     // Width multiplier
  zScale: 0.8-1.2,     // Depth multiplier
  rotation: 0-π/2,     // Base rotation
  twist: 0-2.0         // Rotation along body length
}
```

**Superformula for Complex Shapes:**
```typescript
crossSection: {
  kind: 'superformula',
  superformula: {
    m: 5-8,            // Number of lobes/arms
    n1: 0.1-0.3,       // Sharpness of lobes
    n2: 2.0-3.0,       // Inner shape
    n3: 2.0-3.0        // Outer shape
  }
}
```

---

## SURFACE FEATURES → SURFACE CONFIG

### Frills and Ruffles

For ruffled margins (anemones, some jellies):

```typescript
surface: {
  frill: {
    amplitude: 0.15-0.25,     // Height of ruffles
    frequency: 12-24,          // Number of ruffles
    tRange: [0.65, 1.0],       // Where on body (0=top, 1=bottom)
    phase: 0.0-1.0             // Rotation offset
  }
}
```

**Visual Analysis:**
- Count visible ruffles around margin
- Estimate amplitude as % of body radius
- Note where ruffles start (top to bottom position)

### Ridges and Combs

For longitudinal features:

```typescript
surface: {
  ridges: {
    count: 4-8,                // Number of ridge lines
    amplitude: 0.05-0.25,      // Ridge height
    tRange: [0.15, 0.85],      // Active range along body
    phase: 0.0                 // Rotation offset
  }
}
```

**Comb Jelly Mapping:**
- Always 8 ridges (ctene rows)
- Amplitude: 0.15-0.20 for moderate
- tRange typically covers most of body

---

## TENTACLE SYSTEMS → EMITTERS

### Emitter Kind Selection

Based on tentacle arrangement observed:

```typescript
emitters: {
  tentacles: {
    kind: 'explicit',      // Manual rib specification
    kind: 'phyllotaxis',   // Spiral pattern (golden angle)
    kind: 'spiral'         // Simple spiral
  }
}
```

### Phyllotaxis (Natural Spiral)

For natural radial arrangements:

```typescript
emitters: {
  tentacles: {
    kind: 'phyllotaxis',
    groupCount: 4-8,        // Number of spiral arms
    ribRange: [3, 15],      // Which ribs have tentacles
    jitter: 0-2,            // Random position offset
    golden: 1.0             // Golden angle multiplier
  }
}
```

**Visual Mapping:**
- Count distinct tentacle clusters
- Identify which body sections have tentacles
- Note spacing regularity (lower jitter = more regular)

### Spiral Emitter

For arranged crown patterns:

```typescript
emitters: {
  tentacles: {
    kind: 'spiral',
    groupCount: 4-8,        // Spiral arms
    ribRange: [6, 13],      // Active rib range
    pitch: 0.5-1.5,         // Tightness of spiral
    jitter: 0-2             // Random offset
  }
}
```

### Tentacle Geometry

For tentacle appearance:

```typescript
geometry: {
  tentacleSegments: 80-150,      // Length/resolution
  tentacleSegmentLength: 1.0-1.5, // Segment size
  tentacleWeightFactor: 1.0-1.6   // Thickness/drape
}
```

**Visual Analysis:**
- Long/flowing: Higher segments (120-150)
- Short/stiff: Lower segments (40-80)
- Thick/heavy: Higher weightFactor (1.4-1.6)
- Thin/filamentary: Lower weightFactor (1.0-1.2)

---

## COLOR PALETTE → LOOK CONFIG

### Extracting and Mapping Colors

From reference image, extract colors to LookConfig:

```typescript
look: {
  bulb: {
    colorA: '#PRIMARY_HEX',     // Main body color
    colorB: '#SECONDARY_HEX',   // Secondary/gradient color
    opacity: 0.2-0.8,           // Transparency
    patternScale0: 0.9-2.1,     // Pattern density
    patternScale1: 0.9-2.2,     // Secondary pattern
    rimBoost: 1.0-2.6           // Edge lighting intensity
  },
  gel: {
    color: '#GEL_HEX',          // Overlay color
    opacity: 0.12-0.35          // Overlay strength
  },
  tail: {
    opacity: 0.0-0.75,          // Tail visibility
    scale: 1.0-20.0,            // Tail length
    colorA: '#TAIL_PRIMARY',
    colorB: '#TAIL_SECONDARY'
  },
  mouth: {
    opacity: 0.0-0.65,          // Mouth arms visibility
    scale: 1.0-3.0,             // Mouth size
    colorA: '#MOUTH_PRIMARY',
    colorB: '#MOUTH_SECONDARY'
  },
  tentacle: {
    opacity: 0.0-0.55,          // Tentacle visibility
    area: 500-2000,             // Glow area
    color: '#TENTACLE_HEX'
  }
}
```

### Color Extraction Workflow

1. **Primary Body Color (colorA)**
   - Sample from main bell/body surface
   - Use average if color varies
   - Convert to hex: #RRGGBB

2. **Secondary Color (colorB)**
   - Sample from shaded areas or gradient end
   - Should create nice gradient with colorA

3. **Gel Color**
   - Often lighter/more saturated than body
   - Creates subsurface effect

4. **Opacity Guidelines**
   - Transparent creatures: 0.2-0.4
   - Semi-transparent: 0.4-0.6
   - More opaque: 0.6-0.8

5. **Rim Boost**
   - High (2.0-2.6): Strong edge lighting (glass, thin membranes)
   - Medium (1.0-1.8): Normal edge definition
   - Low (<1.0): Subtle edges

### Bioluminescence Mapping

For glowing creatures:

```typescript
post: {
  bloomStrength: 0.2-0.5,      // Glow intensity
  bloomRadius: 0.3-0.6,        // Glow spread
  bloomThreshold: 0.6-0.85     // What glows (higher = less)
}
```

**Visual Analysis:**
- Strong bioluminescence: Higher bloomStrength (0.4-0.5)
- Subtle glow: Lower bloomStrength (0.2-0.3)
- Focused glow points: Higher threshold (0.8-0.85)
- Overall glow: Lower threshold (0.6-0.7)

---

## SPINE CURVE → BODY POSTURE

For curved or bent body shapes:

```typescript
spine: {
  kind: 'none',           // Straight vertical
  kind: 'sine',           // Gentle wave
  kind: 'polyline'        // Custom curve
}
```

### Sine Spine

For gentle S-curves:

```typescript
spine: {
  kind: 'sine',
  ampX: 2-8,              // Horizontal amplitude
  ampZ: 0-4,              // Depth amplitude
  freq: 0.5-1.5,          // Wave frequency
  phase: 0.0-1.0          // Wave offset
}
```

### Polyline Spine

For complex poses:

```typescript
spine: {
  kind: 'polyline',
  points: [
    [0, y_bottom, z_bottom],
    [0.5, y_middle, z_middle],
    [1, y_top, z_top]
  ]
}
```

**Visual Mapping:**
1. Trace centerline of creature in image
2. Identify key bend points
3. Normalize Y to 0-1 range
4. Record X,Z offsets at each point

---

## COLONY CONFIGURATION (Siphonophores)

For colonial organisms:

```typescript
colony: {
  count: 3-7,              // Number of zooids
  spacing: 20-40,          // Distance between units
  scaleDecay: 0.85-0.95,   // Size reduction down chain
  layout: 'chain',         // Linear
  layout: 'arc',           // Curved
  layout: 'helix',         // Spiral
  layout: 'cluster',       // Bunched
  layout: 'sheet'          // Grid arrangement
}
```

**Layout Parameters:**

Arc:
```typescript
colony: {
  layout: 'arc',
  arc: { radius: 20, angle: π }
}
```

Helix:
```typescript
colony: {
  layout: 'helix',
  helix: { radius: 22, turns: 1.25 }
}
```

**Visual Analysis:**
- Count individual zooids
- Measure spacing relative to body size
- Identify arrangement pattern
- Note size progression along chain

---

## BUDGET CONSTRAINTS

Performance limits per creature:

```typescript
budget: {
  maxParticles: 5000-9000,     // Total particle budget
  maxTentacleGroups: 0-6       // Tentacle cluster limit
}
```

**Guidelines:**
- Simple creatures: 5000-6000 particles
- Complex creatures: 8000-9000 particles
- No tentacles: maxTentacleGroups = 0
- Heavy tentacles: maxTentacleGroups = 4-6

---

## COMPLETE EXAMPLE: Analyzing a Reference Image

### Step-by-Step Workflow

1. **Open reference image** in image editor
2. **Identify creature type** → Select BodyPlan
3. **Measure proportions** → Set geometry.size, ribRadius
4. **Trace silhouette** → Create bulb profile points
5. **Count repeating elements** → Set symmetry.order
6. **Observe cross-section** → Choose crossSection type
7. **Note surface features** → Add frill or ridges
8. **Count tentacles** → Configure emitters
9. **Extract colors** → Fill in look config
10. **Assess transparency** → Set opacity values

### Example Configuration

For a comb jelly with pink bioluminescence:

```typescript
{
  id: 'my-comb-jelly',
  bodyPlan: BodyPlan.CombJelly,
  features: { tail: false, mouth: false, tentacles: false },
  symmetry: { kind: 'radial', order: 8, breaking: 0.12 },
  crossSection: { kind: 'ellipse', xScale: 0.8, zScale: 1.15 },
  surface: {
    ridges: { count: 8, amplitude: 0.18, tRange: [0.15, 0.85] }
  },
  geometry: {
    size: 44,
    ribsCount: 18,
    ribRadius: 16
  },
  profiles: {
    bulb: {
      kind: 'polyline',
      points: [[0.0, 0.9], [0.55, 1.15], [1.0, 0.25]]
    }
  },
  look: {
    bulb: {
      colorA: '#FFA9D2',
      colorB: '#70256C',
      opacity: 0.75,
      rimBoost: 1.0
    },
    gel: { color: '#415AB5', opacity: 0.25 },
    post: { bloomStrength: 0.2, bloomRadius: 0.4 }
  }
}
```

---

## TESTING AND ITERATION

### Validation

After creating config:

1. Run typecheck: `npm run typecheck`
2. Use validate() function from creature/validate.ts
3. Test in JellyfishTest scene
4. Adjust parameters based on visual comparison

### Common Adjustments

- **Too flat**: Increase ribRadius or profile values
- **Too tall**: Decrease size or increase ribRadius
- **Not transparent enough**: Decrease opacity values
- **Missing detail**: Increase ribsCount or totalSegments
- **Wrong shape**: Adjust profile points
- **No glow**: Decrease bloomThreshold or increase bloomStrength

---

## ARCHETYPE REFERENCE

Use existing archetypes as starting points:

- **combJelly**: Ctenophora with 8 ridges
- **salp**: Barrel-shaped with muscle bands
- **siphonophore**: Colonial with tentacles
- **anemone**: Crown with radial tentacles
- **glassSponge**: Tall vase with lattice pattern
- **ascidia**: Sac-like with bilateral symmetry
- **star**: Echinoderm with 5 arms

Copy relevant archetype and modify based on reference analysis.

---

*Last Updated: 2026-02-08*
*Abyssal Genesis Project*