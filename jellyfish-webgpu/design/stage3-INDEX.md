# Stage 3: Specification Generation

**Status**: In Progress
**Formula**: `stage3-specs`
**Date**: 2026-02-09

---

## Overview

Stage 3 transforms integrated Stage 2 findings into implementable specifications for 12-15 jellyfish archetypes.

### Key Principles

1. **All 12-15 archetypes in parallel** - Modular system for variety
2. **All spec documents in parallel** - 8 specialist domains
3. **Layer-based generative system** - Geometry → Materials → Physics → Effects
4. **Adaptive system from start** - Performance LOD built-in
5. **Dual geometry approach** - Vertex-based (current) + SDF (experimental)
6. **Extend + backward compatible** - Migrate existing 7 archetypes first

---

## Directory Structure

```
/design/
├── stage3-INDEX.md           # This file
├── stage3-CHECKLIST.md        # Progress tracking
│
├── stage3-migration/          # Phase 1: Code Analysis
│   └── CODE_ANALYSIS.md
│
├── stage3-visuals/            # Phase 2: Visual Design
│   └── {archetype}-diagrams.md
│
├── geometry/                  # Phase 3 Layer 1
│   ├── bell-module.md
│   ├── egg-module.md
│   ├── barrel-module.md
│   └── ...
│
├── materials/                 # Phase 3 Layer 2
│   ├── translucency-atoms.md
│   ├── bioluminescence-atoms.md
│   └── ...
│
├── colors/                    # Phase 3 Layer 3
│   └── UNIFIED_GLOW_PIPELINE.md
│
├── physics/                   # Phase 3 Layer 4
│   ├── bell-pulsing.md
│   └── ...
│
├── effects/                   # Phase 3 Layer 5
│   └── ...
│
├── biology/                   # Phase 3 Layer 6
│   └── ...
│
└── poc/                       # Phase 4: Proof-of-Concept
    ├── photocytes.wgsl
    ├── atoms.tsl
    └── sdf-bell.wgsl
```

---

## 15 Target Archetypes

### Existing (7) - Migrate
1. **Medusa** (default) - Bell jellyfish
2. **Comb Jelly** (combJelly) - Ctenophora
3. **Salp** - Barrel tunicate
4. **Siphonophore** - Colonial chain
5. **Anemone** - Radial crown
6. **Glass Sponge** - Venus flower basket
7. **Ascidia** - Sea squirt

### New (8) - Create
8. **Box Jelly** (cubozoa) - 4-quadrant control
9. **Star** (echinoderm) - 5 arms
10. **Ribbon** (ctenoplana) - Flat, undulating
11. **Colonial** (pyrosoma) - Barrel colony
12. **Hydromedusa** (micro) - Small, fast
13. **Stalked** (crinoid) - Sessile
14. **Physalia** (man-o-war) - Apex predator
15. **Experimental** (ML) - Unconstrained

---

## Phase Breakdown

### Phase 0: Initialization ✅
- [x] Create directory structure
- [x] Create INDEX document
- [x] Create CHECKLIST
- [ ] Review Stage 2 integration documents

### Phase 1: Code Analysis
- [ ] Read existing code (CreatureSpec, JellyfishGeometry, materials)
- [ ] Document Particulate system
- [ ] Document 7 existing archetypes
- [ ] Compare vertex vs SDF approaches

### Phase 2: Visual Design
- [ ] Create diagrams for 15 archetypes
- [ ] Generate SVG exports
- [ ] Document visual grammar

### Phase 3: Layer Specifications
- [ ] Layer 1: Geometry (10 modules)
- [ ] Layer 2: Materials (5 atom categories)
- [ ] Layer 3: Colors × Bioluminescence
- [ ] Layer 4: Physics (5 motion types)
- [ ] Layer 5: Effects (quality tiers)
- [ ] Layer 6: Biology (species presets)

### Phase 4: Proof-of-Concept
- [ ] GPU compute photocytes
- [ ] Material atoms
- [ ] Cross-domain bridge
- [ ] SDF bell evaluation

### Phase 5: Architecture Assembly
- [ ] Compile all specifications
- [ ] Create schema extensions
- [ ] Write implementation roadmap
- [ ] Document migration guide
- [ ] Make SDF decision

---

## Key Documents (Stage 2)

Reference these for context:

- `/design/stage2-integration/forms-integration.md`
- `/design/stage2-integration/geometry-integration.md`
- `/design/stage2-integration/shaders-integration.md`
- `/design/stage2-integration/colors-integration.md`
- `/design/stage2-integration/effects-integration.md`
- `/design/stage2-integration/biology-integration.md`
- `/design/stage2-integration/physics-integration.md`

---

## Analysis Documents (Supporting)

- `/design/analysis/PARTICULATE_SYSTEM_EXPLAINED.md`
- `/design/analysis/SDF_VS_VERTEX_ANALYSIS.md`
- `/design/analysis/TSL_VS_SDF_COMPARISON.md`

---

## Execution Progress

**Overall Progress**: ░░░░░░░░░░ 10% (Phase 0 started)

**Current Step**: Phase 0 - Initialization
**Next Step**: Phase 1 - Code Analysis

---

## How to Execute

Each phase creates specific deliverables. See `/design/STAGE3_EXECUTION_GUIDE.md` for detailed instructions.
