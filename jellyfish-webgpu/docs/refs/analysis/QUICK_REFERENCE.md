# Quick Reference: Creature Analysis for Abyssal Genesis

## ONE-PAGE ANALYSIS CHECKLIST

### 1. CREATURE IDENTIFICATION
- [ ] Body shape: Bell / Egg / Barrel / Tube / Vase / Colony
- [ ] Appendages: Tentacles [ ] Yes [ ] No  Oral arms [ ] Yes [ ] No
- [ ] Surface: Smooth [ ] Ridged [ ] Frilled [ ] Warty
- [ ] Tentacle count: _____ (or estimate: few/many/hundreds)

### 2. PROPORTIONS (as ratios)
- Height : Width = _____ : 1
- Bell diameter : Tentacle length = _____ : 1
- Body size category: Tiny [ ] Small [ ] Medium [ ] Large [ ]

### 3. SYMMETRY
- Type: Radial [ ] Bilateral [ ] Spiral [ ]
- Count: _____ repeating elements
- Regularity: Perfect [ ] Slight variation [ ] Asymmetric

### 4. COLOR EXTRACTION
Use color picker tool:

- Primary body: #[____]
- Secondary/shaded: #[____]
- Highlights: #[____]
- Bioluminescence: #[____]
- Tentacles: #[____]

### 5. TRANSPARENCY
- Opacity: 0-20% [ ] 20-40% [ ] 40-60% [ ] 60-80% [ ] 80-100% [ ]
- Edge lighting: None [ ] Subtle [ ] Strong [ ] Very strong [ ]
- Internal glow: [ ] Yes [ ] No

### 6. BIOLUMINESCENCE
- Present: [ ] Yes [ ] No
- Location: Margin [ ] Body [ ] Tentacles [ ] Scattered [ ]
- Color: #[____]
- Intensity: Low [ ] Medium [ ] High [ ]

### 7. SURFACE FEATURES
- Ridges/frills: [ ] Yes [ ] No
  - Count: _____
  - Height: Low [ ] Medium [ ] High [ ]
- Texture: Smooth [ ] Cellular [ ] Woven [ ] Papillate [ ]

---

## CODE MAPPING REFERENCE

### Body Plan Selection
```
Bell + tentacles → BodyPlan.Medusa
Oval + 8 combs → BodyPlan.CombJelly
Colony + stem → BodyPlan.Siphonophore
Tubular barrel → BodyPlan.CombJelly
```

### Feature Toggles
```typescript
features: {
  tail: boolean,     // True for medusa, siphonophore
  mouth: boolean,    // True for medusa, siphonophore
  tentacles: boolean // True for medusa, siphonophore, anemone
}
```

### Size Mapping
```typescript
geometry: {
  size: 30-72,           // Overall scale
  ribRadius: 14-26,      // Width (tall < size*0.5, wide > size*0.6)
  ribsCount: 12-28,      // Vertical detail
}
```

### Symmetry Orders
```
4-5: Salps, echinoderms
6: Glass sponges
8: Comb jellies
10-12: Anemones, siphonophores
```

### Color Opacity Guide
```
Transparent/gelatinous: 0.2-0.4
Semi-transparent: 0.4-0.6
More opaque: 0.6-0.8
```

---

## ANALYSIS TO CONFIG MAPPING

| Observation | Config Property | Value Range |
|------------|-----------------|-------------|
| Bell shape | profiles.bulb | polyline points |
| 8 comb rows | surface.ridges.count | 8 |
| Pink color | look.bulb.colorA | #FF____ |
| Glowing edges | look.bulb.rimBoost | 1.0-2.6 |
| Tentacles | emitters.tentacles | phyllotaxis/spiral |
| Transparent | look.bulb.opacity | 0.2-0.4 |
| Bioluminescent | post.bloomStrength | 0.2-0.5 |
| Star shape | crossSection.superformula | m: 5-8 |

---

## COMMON ARCHETYPES

### Comb Jelly (Ctenophora)
- BodyPlan.CombJelly
- 8 ridges (comb rows)
- No tentacles
- Iridescent/bioluminescent
- Oval/egg profile

### Medusa (Jellyfish)
- BodyPlan.Medusa
- Bell shape
- Tentacles + oral arms
- Radial symmetry (4-12)
- Transparent/gelatinous

### Siphonophore
- BodyPlan.Siphonophore
- Colony of zooids
- Long tentacles
- Chain/helix layout

### Anemone
- BodyPlan.Medusa
- No tail
- Crown of tentacles
- Radial symmetry (12+)
- Frilled margins

---

## DOCUMENT OUTPUT

Analysis should produce:

1. **d8c8d838-analysis.md** - Detailed visual analysis
2. **Config snippet** - Ready-to-use CreatureSpec
3. **Color palette** - Hex values for all colors
4. **Profile points** - Silhouette control points

---

## FILES TO REFERENCE

- `/src/jellyfish/creatures/CreatureSpec.ts` - Config interface
- `/src/jellyfish/creatures/presets.ts` - Example archetypes
- `/src/jellyfish/creatures/BodyPlan.ts` - Body plan types
- `/src/editor/look-presets.ts` - Color/material presets

---

*Print this page for quick reference during image analysis*