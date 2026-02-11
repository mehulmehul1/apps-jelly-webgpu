# Stage 3 Execution Guide

**Formula**: `abyssal-spec-generation` v1.1.0
**Date**: 2026-02-09
**Status**: Ready to Execute

---

## Quick Start

### Option 1: Manual Execution (Recommended)

Since this is a new formula, run phases manually:

```bash
# Navigate to project
cd /mnt/c/Users/mehul/gt-hq/epic_jelly_webgpu/crew/mehul/apps/jellyfish-webgpu

# Phase 0: Initialize directories
mkdir -p design/stage3-migration
mkdir -p design/stage3-visuals
mkdir -p design/geometry design/materials design/colors
mkdir -p design/physics design/effects design/biology
mkdir -p design/poc design/analysis
```

### Option 2: Formula Execution (if GT supports it)

```bash
gt formula run abyssal-spec-generation \
  --project=/mnt/c/Users/mehul/gt-hq/epic_jelly_webgpu/crew/mehul/apps/jellyfish-webgpu \
  --stage=all \
  --archetypes=all \
  --geometry_approach=both \
  --include_poc=all
```

---

## Phase-by-Phase Execution

### Phase 0: Initialization (15 minutes)

**Goal**: Set up directory structure and review Stage 2 documents

**Tasks**:
1. Create directory structure
2. Review Stage 2 integration documents
3. Create working checklist

**Commands**:
```bash
cd /mnt/c/Users/mehul/gt-hq/epic_jelly_webgpu/crew/mehul/apps/jellyfish-webgpu

# Create all directories
mkdir -p design/stage3-migration
mkdir -p design/stage3-visuals
mkdir -p design/geometry design/materials design/colors
mkdir -p design/physics design/effects design/biology
mkdir -p design/poc design/analysis design/tools

# Create index files
touch design/stage3-INDEX.md
touch design/stage3-CHECKLIST.md

# Copy stage2 docs reference
cp design/stage2-integration/*.md design/stage3-migration/ 2>/dev/null || echo "Stage 2 docs in place"
```

**Deliverable**: Directory structure ready

---

### Phase 1: Code Analysis & Migration (2-4 hours)

**Goal**: 8 specialists analyze existing code

**Specialists & Focus**:
| Specialist | Files to Analyze | Output |
|------------|------------------|--------|
| forms | BodyPlan.ts, CreatureSpec.ts | Body modularity analysis |
| geometry | JellyfishGeometry.ts, RadiusProfileCurve.ts | Rib construction analysis |
| shaders | BulbNodeMaterial.ts, InterpolatedNodeMaterial.ts | TSL material system |
| colors | look-presets.ts | LookConfig system |
| effects | JellyfishPostProcessing.ts | Post-processing pipeline |
| biology | presets.ts (species) | Taxonomic structure |
| bioluminescence | BulbNodeMaterial.ts (glow patterns) | Emission patterns |
| physics | JellyfishSystem.ts, InterpolationSystem.ts | Motion system |

**Execution Options**:

**A) Manual Analysis** (Recommended for first run):
1. Each specialist reads their assigned files
2. Creates analysis document
3. Documents migration path for existing 7 archetypes

**B) Agent-Assisted** (if GT supports):
```bash
# For each specialist
gt formula run abyssal-spec-generation --stage=3.0 --specialist=forms
gt formula run abyssal-spec-generation --stage=3.0 --specialist=geometry
# ... etc
```

**Key Files to Read**:
```bash
# Core interfaces
src/jellyfish/creatures/CreatureSpec.ts
src/jellyfish/creatures/BodyPlan.ts
src/jellyfish/creatures/presets.ts

# Geometry
src/jellyfish/JellyfishGeometry.ts
src/jellyfish/creatures/RadiusProfileCurve.ts
src/jellyfish/creatures/SpineCurve.ts

# Materials
src/jellyfish/materials/BulbNodeMaterial.ts
src/jellyfish/materials/InterpolatedNodeMaterial.ts

# Systems
src/jellyfish/JellyfishSystem.ts
src/systems/physics-bridge/InterpolationSystem.ts
```

**Deliverables**:
- `design/stage3-migration/CREATURE_SPEC_ANALYSIS.md`
- `design/stage3-migration/ARCHETYPE_MIGRATION_[SPECIALIST].md` (8 files)
- `design/stage3-migration/MIGRATION_CHECKLIST.md`

---

### Phase 2: Visual Design (2-3 hours, AFTER Phase 1)

**Goal**: Create diagrams for 15 archetypes

**Before Starting**: Build the Visual Design Tool (React)

```bash
# Create design tool structure
mkdir -p src/design-tools/{components,lib,hooks,types,data,styles}

# Implementation plan in design/tools/IMPLEMENTATION_PLAN_REACT.md
# This is done AFTER Phase 1 completes
```

**Execution**:
1. Use Visual Design Tool to generate diagrams
2. Export SVG for each archetype
3. All specialists annotate with domain knowledge

**15 Archetypes**:
1. Medusa (default bell)
2. Comb Jelly (egg)
3. Salp (barrel)
4. Siphonophore (chain)
5. Anemone (crown)
6. Glass Sponge (vase)
7. Ascidia (sac)
8. Box Jelly (cubozoan)
9. Star (echinoderm)
10. Ribbon (flat)
11. Colonial (pyrosoma)
12. Hydromedusa (micro)
13. Stalked (crinoid)
14. Physalia (man-o-war)
15. Experimental (ML)

**Deliverables**:
- `design/stage3-visuals/{archetype}-diagrams.md` (15 files)
- `design/stage3-visuals/VISUAL_GRAMMAR.md`
- `design/stage3-visuals/PARAMETER_REFERENCE.md`

---

### Phase 3: Layer Specifications (6-8 hours, AFTER Phase 2)

**Goal**: Create implementable specs for all 8 domains

**Order** (sequential):

1. **Geometry** (Layer 1) - 10 modules
2. **Materials** (Layer 2) - 5 atom categories
3. **Colors × Bioluminescence** (Layer 3) - Unified pipeline
4. **Physics** (Layer 4) - 5 motion types
5. **Effects** (Layer 5) - Quality tiers
6. **Biology** (Layer 6) - Species presets

**Each layer produces**:
- Domain specification documents
- TypeScript interfaces
- API documentation
- Integration guide

**Deliverables**: ~40 specification files

---

### Phase 4: Proof-of-Concept (4-6 hours, AFTER Phase 3)

**Goal**: Validate key technical decisions

**4 PoCs** (parallel if possible):

1. **GPU Compute Photocytes** (physics + bioluminescence)
   - 1000+ particles in parallel
   - Pulse animation
   - Exponential decay

2. **Material Atoms** (shaders)
   - 3 composable atoms
   - Runtime composition

3. **Cross-Domain Bridge** (geometry + effects)
   - Velocity-based effects
   - Depth-based colors

4. **SDF Bell** (geometry + shaders) - NEW!
   - SDF primitives (sdEllipsoid, opSmoothUnion)
   - Shader-based animation
   - Morphing between shapes
   - Performance comparison

**Deliverables**:
- `design/poc/photocytes.wgsl`
- `design/poc/atoms.tsl`
- `design/poc/effect-bridge.ts`
- `design/poc/sdf-bell.wgsl` (NEW)
- `design/poc/sdf-vertex-comparison.md` (NEW)

---

### Phase 5: Architecture Assembly (2-3 hours, AFTER Phase 4)

**Goal**: Consolidate all specs into master documents

**Critical**: Make SDF decision here based on PoC results

**Deliverables**:
- `design/DESIGN_ARCHITECTURE_FINAL.md`
- `design/SCHEMA_EXTENSIONS.ts`
- `design/IMPLEMENTATION_ROADMAP.md`
- `design/MIGRATION_GUIDE.md`
- `design/SDF_DECISION.md` (NEW)
- `design/STAGE3_SUMMARY.md`

---

## How to Start: Step-by-Step

### Right Now: Phase 0 Initialization

```bash
# 1. Navigate to project
cd /mnt/c/Users/mehul/gt-hq/epic_jelly_webgpu/crew/mehul/apps/jellyfish-webgpu

# 2. Create directories
mkdir -p design/stage3-migration
mkdir -p design/stage3-visuals
mkdir -p design/{geometry,materials,colors,physics,effects,biology,poc,analysis,tools}

# 3. Create checklist
cat > design/stage3-CHECKLIST.md << 'EOF'
# Stage 3 Checklist

## Phase 0: Initialization
- [x] Directories created
- [ ] Stage 2 docs reviewed
- [ ] Working checklist created

## Phase 1: Code Analysis (8 specialists)
- [ ] forms: Code analysis
- [ ] geometry: Code analysis
- [ ] shaders: Code analysis
- [ ] colors: Code analysis
- [ ] effects: Code analysis
- [ ] biology: Code analysis
- [ ] bioluminescence: Code analysis
- [ ] physics: Code analysis

## Phase 2: Visual Design
- [ ] Design tool created
- [ ] 15 archetype diagrams
- [ ] Visual grammar documented

## Phase 3: Specifications
- [ ] Layer 1: Geometry specs
- [ ] Layer 2: Materials specs
- [ ] Layer 3: Colors × Bioluminescence
- [ ] Layer 4: Physics specs
- [ ] Layer 5: Effects specs
- [ ] Layer 6: Biology specs

## Phase 4: Proof-of-Concept
- [ ] GPU compute photocytes
- [ ] Material atoms
- [ ] Cross-domain bridge
- [ ] SDF bell

## Phase 5: Architecture Assembly
- [ ] Final architecture
- [ ] Schema extensions
- [ ] Implementation roadmap
- [ ] Migration guide
- [ ] SDF decision
EOF
```

### Next: Start Phase 1 - Code Analysis

**Option A: Start with geometry specialist** (foundational)

```bash
# Read key files
cat src/jellyfish/JellyfishGeometry.ts | less
cat src/jellyfish/creatures/CreatureSpec.ts | less

# Create analysis document
cat > design/stage3-migration/GEOMETRY_CODE_ANALYSIS.md << 'EOF'
# Geometry Code Analysis

## Current Implementation

### JellyfishGeometry.ts

**Key Structures:**
- Rib-based construction (18-20 ribs × 36 vertices)
- Skin constraints connecting ribs
- Cross-section modifications (circle/ellipse/superformula)
- Profile curves for silhouette

**Parameters:**
- size: Overall scale
- ribsCount: Number of horizontal rings
- ribRadius: Radius of each ring
- totalSegments: Vertices per rib (36)

### CreatureSpec.ts

**Current Interface:**
- bodyPlan: 4 types (Medusa, CombJelly, Salp, Siphonophore)
- symmetry: Radial/bilateral/spiral
- crossSection: Circle/ellipse/superformula
- surface: Frills, ridges, cells

## Migration Path

### For 15 Archetypes

**Existing (7):** Already implemented
**New (8):** Need configuration

### Extension Points

1. Geometry modules (bell, egg, barrel, etc.)
2. Profile curve system
3. Cross-section variants

## SDF Considerations

### Advantages
- Perfect smoothness
- Easy morphing
- Shader-based animation

### Disadvantages
- Performance (~8ms vs 2ms)
- Physics mismatch
- Complexity

### Hybrid Approach

**Recommendation:** Keep vertex-based for now, evaluate SDF in Phase 4.

**SDF Use Cases:**
- Bell shape (if morphing needed)
- "Impossible physics" effects
- Close-up details
EOF
```

**Option B: Use Task agents for parallel analysis**

```bash
# GT can dispatch 8 parallel analysis tasks
# Each specialist reads their assigned files and creates analysis
```

---

## Tracking Progress

### Daily Update Checklist

```bash
# At end of each session, update checklist
cat design/stage3-CHECKLIST.md

# Count completed items
grep -c "\- \[x\]" design/stage3-CHECKLIST.md
```

### Milestone Markers

- **Phase 0 Complete**: All directories created
- **Phase 1 Complete**: 8 specialist analysis documents
- **Phase 2 Complete**: 15 archetype diagrams
- **Phase 3 Complete**: All 6 layer specifications
- **Phase 4 Complete**: 4 PoC implementations
- **Phase 5 Complete**: Master architecture documents

---

## Quick Reference

### File Locations

```
design/
├── stage3-INDEX.md           # This file
├── stage3-CHECKLIST.md        # Progress tracking
├── stage3-migration/          # Phase 1 output
├── stage3-visuals/            # Phase 2 output
├── geometry/                  # Phase 3 Layer 1
├── materials/                 # Phase 3 Layer 2
├── colors/                    # Phase 3 Layer 3
├── physics/                   # Phase 3 Layer 4
├── effects/                   # Phase 3 Layer 5
├── biology/                   # Phase 3 Layer 6
├── poc/                       # Phase 4 output
├── analysis/                  # Supporting analysis
│   ├── PARTICULATE_SYSTEM_EXPLAINED.md
│   ├── SDF_VS_VERTEX_ANALYSIS.md
│   └── TSL_VS_SDF_COMPARISON.md
└── tools/                     # Visual design tool
    ├── DESIGN_PREVIEW_TOOL.md
    └── IMPLEMENTATION_PLAN_REACT.md
```

### Key Commands

```bash
# Navigate to project
cd /mnt/c/Users/mehul/gt-hq/epic_jelly_webgpu/crew/mehul/apps/jellyfish-webgpu

# Check progress
grep "\- \[x\]" design/stage3-CHECKLIST.md | wc -l

# View formula
cat /mnt/c/Users/mehul/gt-hq/.beads/formulas/abyssal-spec-generation.formula.toml

# Run tests (optional)
npm test
```

---

## Getting Help

### If Formula Fails

1. Check syntax: `gt formula validate abyssal-spec-generation`
2. Check inputs: `gt formula show abyssal-spec-generation`
3. Manual execution: Run phases individually

### If Stuck on a Phase

1. Review analysis documents in `design/analysis/`
2. Check existing code: `src/jellyfish/`
3. Reference Stage 2 integration: `design/stage2-integration/`

---

## Success Criteria

Stage 3 is complete when:

- [ ] 15 archetypes fully specified (vertex-based)
- [ ] 8 specialist domains have complete specs
- [ ] 4 proof-of-concepts implemented
- [ ] SDF decision documented
- [ ] Implementation roadmap created
- [ ] Migration path for existing 7 archetypes defined
- [ ] Visual design tool functional (optional, after Phase 1)

---

**Ready to start? Begin with Phase 0 initialization!**
