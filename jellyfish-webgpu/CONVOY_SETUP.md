# Abyssal Genesis Design Convoy Setup

> **Convoy ID**: hq-cv-mhmlo
> **Status**: SETUP - Not yet launched
> **Created**: 2026-02-08
> **Workflow**: Option 1 - Specialists + BMad Party Mode at Decision Gates

---

## Overview

This convoy will transform 19 visual reference analyses and existing codebase into a complete design architecture for extending the Abyssal Genesis generative jellyfish system.

**Approach**: 8 specialist agents do deep domain work, with BMad party mode providing strategic guardrails at key decision gates.

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: Specialist Analysis (Parallel)                        │
│  8 specialized agents analyze inputs and produce synthesis      │
├─────────────────────────────────────────────────────────────────┤
│  INPUT: 19 visual analyses + existing codebase                  │
│  OUTPUT: 8 synthesis documents + design/ directory structure    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1.5: BMad Strategic Review (Decision Gate)              │
│  PM + Architect party mode to prioritize and align             │
├─────────────────────────────────────────────────────────────────┤
│  INPUT: 8 specialist synthesis documents                        │
│  OUTPUT: Prioritization matrix + Architecture principles        │
│  COMMAND: gt bmad party pm,architect "<prompt>"                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: Cross-Disciplinary Integration (Parallel)            │
│  8 specialists review each other's work and find connections   │
├─────────────────────────────────────────────────────────────────┤
│  INPUT: All Stage 1 outputs + BMad priorities                  │
│  OUTPUT: Integration matrix + interface agreements              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: Specification Generation (Parallel)                  │
│  8 specialists create detailed specs and reference files        │
├─────────────────────────────────────────────────────────────────┤
│  INPUT: Integration matrix + interface agreements               │
│  OUTPUT: /design/ directory with all spec files                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3.5: BMad Feasibility & Planning (Decision Gate)        │
│  Scrum + QA + Dev party mode for implementation planning        │
├─────────────────────────────────────────────────────────────────┤
│  INPUT: All Stage 3 specification files                         │
│  OUTPUT: Implementation roadmap + Risk assessment               │
│  COMMAND: gt bmad party scrum,qa,dev "<prompt>"                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: Architecture Assembly (Sequential)                   │
│  Consolidate all work into final design architecture            │
├─────────────────────────────────────────────────────────────────┤
│  INPUT: All previous outputs + BMad roadmap                     │
│  OUTPUT: DESIGN_ARCHITECTURE.md + execution plan                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Specialist Analysis (8 Parallel Agents)

### Input Materials Available to All Agents

| Material | Location |
|----------|----------|
| 19 Visual Reference Analyses | `/docs/refs/analysis/*.md` |
| Existing CreatureSpec | `/src/jellyfish/creatures/CreatureSpec.ts` |
| BodyPlan Types | `/src/jellyfish/creatures/BodyPlan.ts` |
| Existing Archetypes | `/src/jellyfish/creatures/presets.ts` |
| TSL Shader Example | `/src/jellyfish/materials/BulbNodeMaterial.ts` |
| Look Presets | `/src/editor/look-presets.ts` |
| Post-Processing | `/src/post-processing/JellyfishPostProcessing.ts` |
| TSL Reference | `/mnt/c/Users/mehul/.config/opencode/skills/webgpu-threejs-tsl/REFERENCE.md` |

### Agent 1: Form & Shape Grammar Designer

**Role**: Analyze creature forms and shape grammars from visual references

**Stage 1 Prompt**:
```
You are the Form & Shape Grammar Designer for Abyssal Genesis.

CONTEXT:
- We have 19 visual reference analyses in /docs/refs/analysis/
- Existing system has 4 body plans: Medusa, CombJelly, Salp, Siphonophore
- See BodyPlan.ts and CreatureSpec.ts for current implementation

YOUR TASK:
1. Read all 19 visual reference analyses
2. Identify and categorize ALL distinct creature forms and shapes
3. For each form, extract:
   - Body structure and proportions
   - Symmetry type and order
   - Unique shape features
   - Relationship to existing body plans

DELIVERABLE:
Create /design/stage1-forms/01-form-synthesis.md with:
- Inventory of all creature forms discovered (with reference IDs)
- Form classification system (categories, relationships)
- Gaps: which forms are NOT covered by existing 4 body plans
- Recommended new body plan types or extensions needed

EXTEND EXISTING SYSTEM - do NOT propose rebuilding from scratch.
```

**Stage 3 Output**:
```
/design/forms/
├── coiled-medusa.md           # From ref 64970552
├── ribbon-siphonophore.md     # From ref 646c6dd5
├── ctenophora-lobed.md        # From ref 293411ea
├── cubozoa-box.md             # If found in analyses
└── form-grammar-rules.md      # Shape composition rules
```

---

### Agent 2: Modular Geometry Architect

**Role**: Design modular geometry system extensions

**Stage 1 Prompt**:
```
You are the Modular Geometry Architect for Abyssal Genesis.

CONTEXT:
- Current geometry system in CreatureSpec.ts defines: symmetry, spine curves, cross-sections, surface modulation
- See BulbNodeMaterial.ts for current shader-material integration
- We need to EXTEND this system for new creature forms

YOUR TASK:
1. Read all 19 visual reference analyses
2. For each creature form, identify required geometry primitives:
   - Base shape generation (bell, dome, cylinder, ribbon, box)
   - Cross-sectional shapes (circle, ellipse, superformula)
   - Surface features (frills, ridges, cells, lobes)
   - Appendage attachment systems

DELIVERABLE:
Create /design/stage1-geometry/02-geometry-synthesis.md with:
- Inventory of geometry primitives needed (grouped by creature forms)
- Analysis: which primitives exist in current system vs. new ones needed
- Proposed geometry module extensions
- Interface design: how new geometry modules integrate with CreatureSpec

FOCUS ON MODULARITY - each geometry component should be reusable across creature types.
```

**Stage 3 Output**:
```
/design/geometry/
├── coil-generator.md          # Spiral/helical geometry
├── ribbon-curve.md            # Sine-wave ribbon generation
├── box-geometry.md            # Cubomedusa bell shape
├── frill-generator.md         # Rim frills and projections
├── lobe-system.md             # Radial lobe arrangements
└── geometry-module-api.md     # Integration interface spec
```

---

### Agent 3: Shader & Materials Artist

**Role**: Design TSL shader patterns and material recipes

**Stage 1 Prompt**:
```
You are the Shader & Materials Artist for Abyssal Genesis.

CONTEXT:
- Current shader: BulbNodeMaterial.ts with 7-layer sine wave bioluminescence
- TSL (Three Shading Language) reference available
- Need EXTENSIONS for: iridescence, shell materials, translucency variations

YOUR TASK:
1. Read all 19 visual reference analyses, focusing on:
   - Bioluminescence patterns (diffraction, edge glow, pulsing)
   - Surface materials (translucent, gelatinous, ruffled, mosaic)
   - Color patterns (gradients, accents, internal structures)

DELIVERABLE:
Create /design/stage1-shaders/03-shader-synthesis.md with:
- Inventory of material types needed (with reference examples)
- Analysis: current BulbNodeMaterial capabilities vs. gaps
- Proposed new TSL shader patterns (with code snippets where possible)
- Material parameter system design

USE TSL PATTERNS - reference BulbNodeMaterial.ts for style, extend for new effects.
```

**Stage 3 Output**:
```
/design/shaders/
├── iridescence-material.md    # Diffraction grating shader
├── shell-material.md          # Hard glossy shell shader
├── gradient-vertical.md       # Vertical color gradient shader
├── edge-glow-fresnel.md       # Fresnel-based edge glow
├── translucency-sss.md        # Subsurface scattering variations
└── material-library.md        # Material recipe catalog
```

---

### Agent 4: Color & Palette Alchemist

**Role**: Design color palette system and evolution traits

**Stage 1 Prompt**:
```
You are the Color & Palette Alchemist for Abyssal Genesis.

CONTEXT:
- Current look system in look-presets.ts defines colors, materials, post-processing
- Need palette system for fxhash Open-Form evolution mechanics
- Generative variety comes from color inheritance + mutation

YOUR TASK:
1. Read all 19 visual reference analyses, extract ALL color palettes
2. For each palette, document:
   - Hex codes for each color region
   - Gradient relationships (vertical, radial)
   - Accent colors and their usage
   - Bioluminescence colors

DELIVERABLE:
Create /design/stage1-colors/04-color-synthesis.md with:
- Complete color palette inventory (organized by creature types)
- Color pattern analysis (common themes, variations)
- Proposed palette generation system (rules, constraints)
- Color evolution traits for fxhash (inheritance, mutation rules)

THINK IN GENERATIVE TERMS - how do colors create variety through evolution?
```

**Stage 3 Output**:
```
/design/colors/
├── deep-sea-palettes.md       # Core palette collections
├── gradient-system.md         # Gradient type definitions
├── accent-colors.md           # Accent color usage patterns
├── bioluminescence-colors.md  # Glow color catalog
└── color-evolution.md         # fxhash trait definitions
```

---

### Agent 5: Effect & Lighting Wizard

**Role**: Design particle systems and post-processing effects

**Stage 1 Prompt**:
```
You are the Effect & Lighting Wizard for Abyssal Genesis.

CONTEXT:
- Current post-processing in JellyfishPostProcessing.ts: bloom, lens dirt, vignette
- Particulate.js for physics simulation (original reference)
- Need particle systems for: tentacles, cilia, internal striations

YOUR TASK:
1. Read all 19 visual reference analyses, identify:
   - Particle system needs (tentacles, cilia, flowing effects)
   - Post-processing requirements (bloom intensity, aberration, blur)
   - Animation behaviors (pulsing, undulating, flowing)

DELIVERABLE:
Create /design/stage1-effects/05-effects-synthesis.md with:
- Particle system inventory (what types needed for which creatures)
- Post-processing chain variations (by creature type)
- Animation behavior patterns
- Performance considerations (LOD strategies)

BALANCE VISUAL IMPACT WITH PERFORMANCE - we need real-time framerates.
```

**Stage 3 Output**:
```
/design/effects/
├── particle-systems.md        # Tentacle, cilia, striation configs
├── post-processing-chains.md  # PP pipeline variations
├── animation-behaviors.md     # Motion pattern definitions
└── performance-lod.md         # Level of detail strategies
```

---

### Agent 6: Marine Biologist

**Role**: Provide creature trait definitions and biological accuracy

**Stage 1 Prompt**:
```
You are the Marine Biologist for Abyssal Genesis.

CONTEXT:
- 19 visual references represent real deep sea creatures
- Need scientifically-grounded trait definitions for generative system
- Balance biological accuracy with artistic interpretation

YOUR TASK:
1. Read all 19 visual reference analyses
2. For each creature, provide:
   - Scientific classification (phylum, class, order)
   - Biological terminology for features
   - Rarity factors (how common/rare in nature)
   - Trait relationships (which traits typically co-occur)

DELIVERABLE:
Create /design/stage1-biology/06-biology-synthesis.md with:
- Creature classification matrix (scientific names mapped to forms)
- Biological trait inventory (with scientific grounding)
- Rarity assignment (common, uncommon, rare, legendary)
- Trait correlation rules (biological constraints)

PROVIDE SCIENTIFIC AUTHORITY - this informs the "why" behind design decisions.
```

**Stage 3 Output**:
```
/design/biology/
├── creature-taxonomy.md       # Scientific classification
├── trait-definitions.md       # Complete trait catalog
├── rarity-factors.md          # Rarity assignment logic
└── biological-constraints.md  # Trait correlation rules
```

---

### Agent 7: Bioluminescence Expert

**Role**: Design light pattern systems and glow behaviors

**Stage 1 Prompt**:
```
You are the Bioluminescence Expert for Abyssal Genesis.

CONTEXT:
- Deep sea creatures use light for: predation, defense, communication
- Current system: BulbNodeMaterial with sine wave bioluminescence
- Need扩展: diffraction, pulsing, ripples, coordinated patterns

YOUR TASK:
1. Read all 19 visual reference analyses, focusing on:
   - Bioluminescence locations (edges, comb rows, internal, tentacles)
   - Light patterns (steady, pulsing, rippling, shimmering)
   - Color temperatures (cool blue/green vs. warm)
   - Animation behaviors

DELIVERABLE:
Create /design/stage1-bio/07-bioluminescence-synthesis.md with:
- Bioluminescence pattern inventory (by creature type)
- Light behavior classification (animation types)
- Proposed shader implementations for each pattern type
- Synchronization strategies (coordinated vs. independent)

CONNECT TO REAL BIOLOGY - these patterns should reflect actual deep sea behaviors.
```

**Stage 3 Output**:
```
/design/bioluminescence/
├── glow-patterns.md           # Light pattern catalog
├── animation-behaviors.md     # Pulse, ripple, wave definitions
├── color-temperature.md       # Glow color science
└── synchronization.md         # Coordinated light patterns
```

---

### Agent 8: Physics & Movement Specialist

**Role**: Design simulation configurations for creature motion

**Stage 1 Prompt**:
```
You are the Physics & Movement Specialist for Abyssal Genesis.

CONTEXT:
- Particulate.js for physics simulation (chain particles, springs)
- Creature movement: jet propulsion, pulsing, drifting, undulating
- Need movement configs for each creature type

YOUR TASK:
1. Read all 19 visual reference analyses, extract:
   - Movement characteristics (primary propulsion, secondary flows)
   - Tentacle dynamics (stiffness, drag, gravity)
   - Animation rhythms (pulse frequency, wave speed)

DELIVERABLE:
Create /design/stage1-physics/08-physics-synthesis.md with:
- Movement type inventory (jet, drift, undulate, row)
- Physics parameter ranges (stiffness, drag, gravity by creature)
- Animation rhythm definitions (frequency, amplitude)
- Proposed particulate.js configurations

GROUND IN REAL PHYSICS - movement should feel natural for each creature type.
```

**Stage 3 Output**:
```
/design/physics/
├── motion-types.md            # Movement classification
├── physics-parameters.md      # Stiffness, drag, gravity configs
├── animation-rhythms.md       # Pulse and wave timing
└── simulation-configs.md      # Particulate.js setup
```

---

## Stage 1.5: BMad Strategic Review (Decision Gate)

### Command
```bash
gt bmad party pm,architect "Review the 8 specialist synthesis documents and provide strategic guidance:

AS PM:
1. Which creature archetypes are MVP (must-have) vs. nice-to-have?
2. What features create the MOST generative variety value?
3. Prioritize: geometry extensions, shader patterns, or color systems?
4. What should we ship first for maximum impact?

AS ARCHITECT:
1. How do the proposed geometry modules compose together?
2. What are the technical tradeoffs between approaches?
3. Define the interface contracts between modules.
4. Is the system extensible for future creature types?

Base your recommendations on the synthesis documents in:
- /design/stage1-forms/
- /design/stage1-geometry/
- /design/stage1-shaders/
- /design/stage1-colors/
- /design/stage1-effects/
- /design/stage1-biology/
- /design/stage1-bio/
- /design/stage1-physics/

Output your decisions to /design/stage1.5-bmad-decisions.md"
```

### Expected Output
```
/design/stage1.5-bmad-decisions.md
├── MVP_ARCHITECTURES.md       # PM: prioritized creature list
├── FEATURE_PRIORITIZATION.md  # PM: what to build first
├── INTERFACE_CONTRACTS.md     # Architect: module integration
└── TECHNICAL_TRADEOFFS.md     # Architect: decision rationale
```

---

## Stage 2: Cross-Disciplinary Integration

### Agent Prompts (Parallel)

Each agent receives a unified prompt:

```
INTEGRATION PHASE - All Agents

CONTEXT:
- You have completed your Stage 1 synthesis
- BMad has provided strategic priorities (see /design/stage1.5-bmad-decisions/)
- Now you must align your work with other specialists

YOUR TASK:
1. Read ALL 8 Stage 1 synthesis documents
2. Read BMad decisions
3. Identify connections:
   - Your outputs that OTHER specialists depend on
   - Other specialists' outputs that YOU depend on
   - Conflicts or contradictions between designs

DELIVERABLE:
Create /design/stage2-integration/XX-integration-matrix.md with:
- Dependency graph (what you need from others)
- Interface requirements (what you provide to others)
- Conflict identification (where designs don't align)
- Proposed resolutions

BE THOROUGH - missed dependencies = blocked implementation later.
```

### Integration Matrix Template
```markdown
# Integration Matrix: [Agent Name]

## I Need From Others
| Specialist | What I Need | Why It Matters |
|------------|-------------|----------------|
| Geometry Architect | Coil primitive specs | Form Designer needs to reference coil geometry |
| Shader Artist | Material parameter names | Color Alchemist needs to define palettes correctly |

## I Provide To Others
| Specialist | What I Provide | Interface |
|------------|----------------|-----------|
| All | Form type definitions | /design/forms/form-grammar-rules.md |
| Geometry | Shape requirements | Direct spec in each form file |

## Conflicts & Resolutions
| Conflict | With | Resolution |
|----------|-----|------------|
| Form requires non-existent geometry | Geometry Architect | Add to geometry backlog |
```

---

## Stage 3: Specification Generation

### Agent Prompts (Parallel - Tailored to Each)

Based on integration findings, each agent creates detailed specs:

```
SPECIFICATION PHASE - [Agent Name]

CONTEXT:
- Integration complete, dependencies identified
- BMad priorities established
- Now create IMPLEMENTABLE specifications

YOUR TASK:
1. Create detailed spec files for your domain
2. Each spec must include:
   - Interface definition (inputs, outputs, parameters)
   - Implementation notes (technical guidance)
   - Examples (where helpful)
   - Dependencies on other specs (cite explicitly)

DELIVERABLE:
Create all spec files in your /design/[domain]/ directory as planned.

BE EXPLICIT - specs should be implementable by a developer without clarification.
```

---

## Stage 3.5: BMad Feasibility & Planning (Decision Gate)

### Command
```bash
gt bmad party scrum,qa,dev "Review ALL specification files in /design/ and create implementation plan:

AS SCRUM:
1. Is this design feasible to implement?
2. What should be the phased rollout sequence?
3. Estimate complexity for each module
4. Are we over-engineering anything?

AS QA:
1. How do we validate generative output quality?
2. What edge cases might break the system?
3. Testing strategies for shader performance?
4. How to test across different devices?

AS DEV:
1. Implementation complexity assessment
2. Code maintainability concerns
3. Technical risks and mitigations
4. Recommended implementation order

Base your analysis on spec files in:
- /design/forms/
- /design/geometry/
- /design/shaders/
- /design/colors/
- /design/effects/
- /design/biology/
- /design/bioluminescence/
- /design/physics/

Output to /design/stage3.5-bmad-planning.md"
```

### Expected Output
```
/design/stage3.5-bmad-planning.md
├── FEASIBILITY_ASSESSMENT.md   # Scrum: can we build this?
├── IMPLEMENTATION_PHASES.md    # Scrum: what order?
├── TESTING_STRATEGY.md         # QA: how to validate?
├── RISK_ASSESSMENT.md          # Dev: what could go wrong?
└── IMPLEMENTATION_ROADMAP.md   # Combined: execution plan
```

---

## Stage 4: Architecture Assembly

### Sequential Consolidation

```
ASSEMBLY PHASE

TASK: Consolidate ALL previous work into master architecture document

INPUTS:
- All Stage 1 synthesis documents
- Stage 1.5 BMad decisions
- Stage 2 integration matrix
- All Stage 3 specification files
- Stage 3.5 BMad planning

OUTPUT:
/design/DESIGN_ARCHITECTURE.md - Complete design architecture
/design/SCHEMA_EXTENSIONS.md - Extended CreatureSpec schema
/design/IMPLEMENTATION_ROADMAP.md - Phased execution plan
```

---

## Execution Commands

### To Launch This Convoy (When Ready)

```bash
# Navigate to project root
cd /mnt/c/Users/mehul/gt-hq/epic_jelly_webgpu/crew/mehul/apps/jellyfish-webgpu

# Stage 1: Launch 8 specialist agents (parallel, background)
# (Use Task tool with run_in_background=true for each agent)

# Stage 1.5: BMad Strategic Review
gt bmad party pm,architect "Review the 8 specialist synthesis documents..."

# Stage 2: Cross-Disciplinary Integration (8 agents, parallel)
# (Use Task tool with refined prompts)

# Stage 3: Specification Generation (8 agents, parallel)
# (Use Task tool with spec-focused prompts)

# Stage 3.5: BMad Feasibility & Planning
gt bmad party scrum,qa,dev "Review ALL specification files..."

# Stage 4: Architecture Assembly (consolidation)
# (Single agent to compile final documents)
```

---

## Deliverables Checklist

When convoy completes, verify:

- [ ] `/design/DESIGN_ARCHITECTURE.md` - Master architecture document
- [ ] `/design/SCHEMA_EXTENSIONS.md` - Extended CreatureSpec schema
- [ ] `/design/IMPLEMENTATION_ROADMAP.md` - Phased execution plan
- [ ] `/design/forms/` - Form reference files (8+ files)
- [ ] `/design/geometry/` - Geometry module specs (6+ files)
- [ ] `/design/shaders/` - TSL shader patterns (6+ files)
- [ ] `/design/colors/` - Palette definitions (5+ files)
- [ ] `/design/effects/` - Particle & PP configs (4+ files)
- [ ] `/design/biology/` - Creature traits (4+ files)
- [ ] `/design/bioluminescence/` - Glow patterns (4+ files)
- [ ] `/design/physics/` - Motion configs (4+ files)
- [ ] `/design/stage1.5-bmad-decisions/` - Strategic decisions
- [ ] `/design/stage3.5-bmad-planning/` - Implementation planning

---

## Tracking

All work is tracked in convoy: **hq-cv-mhmlo**

View convoy status:
```bash
gt convoy list
gt show hq-cv-mhmlo
```

Add beads (tasks) to convoy as work progresses:
```bash
gt bead create --convoy hq-cv-mhmlo --title "Stage 1: Form Analysis" --assignee form-designer
```

---

**Setup Complete. Ready to launch when you provide the go signal.**
