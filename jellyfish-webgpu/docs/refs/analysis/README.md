# Creature Analysis Directory
## Abyssal Genesis Generative Art Project

This directory contains comprehensive analysis documentation for deep sea creature reference images used in the Jellyfish WebGPU project.

---

## Directory Contents

### Analysis Documents
- **d8c8d838-analysis.md** - Detailed analysis framework for image d8c8d83863cab4b1f170165200c7a450.jpg
- **ANALYSIS_GUIDE.md** - Comprehensive guide for analyzing deep sea creatures
- **TECHNICAL_MAPPING.md** - Mapping visual analysis to code implementation
- **QUICK_REFERENCE.md** - One-page analysis checklist and reference card

### Reference Images
Located in `../refs/` directory:
- Original reference images (JPG format)
- Organized by hash-based filenames

---

## Analysis Workflow

### 1. Image Analysis
For each reference image:
1. Open image in quality viewer/editor
2. Use **d8c8d838-analysis.md** as structured template
3. Document visual characteristics systematically
4. Extract color values using color picker tool
5. Measure proportions and spatial relationships

### 2. Technical Mapping
Using **TECHNICAL_MAPPING.md**:
1. Map creature type to BodyPlan enum
2. Configure geometry parameters
3. Define profile curves for silhouette
4. Set symmetry and cross-section properties
5. Configure surface features (ridges, frills)
6. Map colors to LookConfig

### 3. Configuration Creation
Generate CreatureSpec configuration:
1. Start with appropriate archetype from presets.ts
2. Modify based on analysis findings
3. Validate configuration
4. Test in JellyfishTest scene

---

## Document Templates

### Analysis Template (d8c8d838-analysis.md)
Comprehensive framework covering:
- Creature type classification
- Body structure analysis
- Color palette extraction
- Bioluminescence documentation
- Movement characteristics
- Texture/material properties
- Technical implementation recommendations
- Implementation priorities

Use this template for each new creature analysis by copying and renaming with the image hash.

### Quick Reference (QUICK_REFERENCE.md)
One-page checklist for rapid analysis during image examination. Print for offline use.

---

## Key Concepts

### Body Plans
- **Medusa**: Classic jellyfish with bell, tentacles, oral arms
- **CombJelly**: Ctenophores with 8 comb rows, oval bodies
- **Salp**: Barrel-shaped, transparent, muscle bands
- **Siphonophore**: Colonial organisms with zooid chains

### Geometry System
- **Rib-based construction**: Vertical segments define body shape
- **Profile curves**: Control silhouette along body length
- **Cross-section shaping**: Circle, ellipse, or superformula
- **Surface modulation**: Ridges, frills, cellular patterns

### Material System
- **Bulb material**: Main body with gradient colors
- **Gel overlay**: Translucent surface layer
- **Tail/mouth materials**: Appendage materials
- **Tentacle particles**: Procedural tentacle systems
- **Post-processing**: Bloom, vignette, lens effects

---

## Code Integration

### Relevant Source Files

**Creature System:**
- `/src/jellyfish/creatures/CreatureSpec.ts` - Configuration interface
- `/src/jellyfish/creatures/BodyPlan.ts` - Body plan types
- `/src/jellyfish/creatures/presets.ts` - Archetype configurations
- `/src/jellyfish/creatures/CreatureFactory.ts` - Creature creation

**Materials:**
- `/src/jellyfish/materials/GelNodeMaterial.ts` - Gelatinous material
- `/src/jellyfish/materials/TentacleNodeMaterial.ts` - Tentacle particles
- `/src/jellyfish/materials/BulbNodeMaterial.ts` - Main body material

**Editor:**
- `/src/editor/look-presets.ts` - Color/material presets
- `/src/editor/JellyfishLookEditor.ts` - Live tweaking interface

---

## Analysis Best Practices

### Visual Analysis
1. **Zoom in** to examine fine details (tentacles, textures)
2. **Sample colors** from multiple locations for accuracy
3. **Measure proportions** relative to body size
4. **Document symmetry** by counting repeating elements
5. **Note special features** (bioluminescence, iridescence)

### Color Extraction
1. Use digital color picker for precise hex values
2. Sample primary, secondary, and accent colors
3. Extract gradient transition colors
4. Note bioluminescent colors separately
5. Record opacity/translucency observations

### Technical Planning
1. Start with similar archetype from presets
2. Modify parameters incrementally
3. Test changes in development environment
4. Validate against reference image
5. Iterate for visual accuracy

---

## Performance Guidelines

### Budget Constraints
- **Particles**: 5000-9000 per creature
- **Tentacle groups**: 0-6 maximum
- **Geometry ribs**: 12-28 for balance
- **Total segments**: Adjust based on complexity

### Optimization Strategies
- Use lower detail for distant creatures (LOD)
- Limit tentacle count for performance
- Adjust segment counts based on visibility
- Profile in browser dev tools

---

## Testing and Validation

### Validation Steps
1. Run `npm run typecheck` for type safety
2. Use `validate()` function from creature/validate.ts
3. Test in JellyfishTest scene
4. Compare visually with reference image
5. Adjust parameters iteratively

### Common Issues
- **Too flat**: Increase ribRadius or profile values
- **Not transparent**: Decrease opacity values
- **Missing detail**: Increase ribsCount or segments
- **Wrong shape**: Adjust profile control points
- **No glow**: Adjust bloom threshold/strength

---

## Archetype Reference

Use existing archetypes as starting points:

| Archetype | Body Plan | Key Features | Use For |
|-----------|-----------|--------------|---------|
| combJelly | CombJelly | 8 ridges, no tentacles | Ctenophores |
| salp | CombJelly | Barrel, muscle bands | Salp-like creatures |
| siphonophore | Siphonophore | Colony, tentacles | Colonial organisms |
| anemone | Medusa | Crown tentacles | Sea anemones |
| glassSponge | CombJelly | Lattice, tall vase | Glass sponges |
| ascidia | CombJelly | Sac, bilateral | Sea squirts |
| star | Medusa | 5 arms, radial | Echinoderms |

---

## Contributing

When adding new creature analyses:

1. Copy `d8c8d838-analysis.md` template
2. Rename with image hash: `{hash}-analysis.md`
3. Complete all sections thoroughly
4. Extract precise color values
5. Document measurements accurately
6. Include configuration recommendations
7. Test configuration in development environment

---

## Additional Resources

### Scientific References
- [Jellyfish Database](http://jellyfish.ucoz.com/)
- [Ctenophora Resources](https://www.combjellies.com/)
- [Marine Species ID](http://www.marinespecies.org/)

### Technical Resources
- [WebGPU Shading Language](https://www.w3.org/TR/WGSL/)
- [Three.js Examples](https://threejs.org/examples/)
- [ShaderToy](https://www.shadertoy.com/) - Shader inspiration

---

## Project Context

**Project:** Abyssal Genesis
**Repository:** /mnt/c/Users/mehul/gt-hq/epic_jelly_webgpu
**Application:** jellyfish-webgpu
**Technology:** WebGPU, Three.js, TypeScript, TSL Shading Language

**Purpose:** Create generative art featuring realistic deep sea creatures using WebGPU rendering.

---

## Contact and Support

For questions about creature analysis or implementation:
- Review existing analysis documents
- Consult technical mapping guide
- Reference archetype presets
- Check source code documentation

---

*Last Updated: 2026-02-08*
*Abyssal Genesis Development Team*