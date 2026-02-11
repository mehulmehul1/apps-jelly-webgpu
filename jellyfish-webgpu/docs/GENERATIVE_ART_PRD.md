# Generative Deep Sea Creature Art Collection - Product Requirements Document

> **BMad Planning Artifact** - Product Requirements Document (PRD)
>
> **Created**: 2025-02-08
> **Product**: jellyfish-webgpu → Generative Art Collection
> **Status**: Draft
> **Version**: 1.0

---

## Executive Summary

**Product Name**: Abyssal Genesis - Open-Form Generative Deep Sea Creature Art Collection

**Product Vision**: Create a masterpiece open-form algorithmic art collection featuring iridescent, bioluminescent, organic, and translucent deep sea creatures. Each piece evolves through collector interaction, creating unique lineages of digital organisms with true generative variety.

**Platform**: fxhash (open-form generative art marketplace)

**Target Release**: Q2 2025

---

## Product Vision

### The Artist's Statement

> "The deep ocean is Earth's last frontier — a realm where evolution has crafted forms of alien beauty. In the crushing darkness, life creates its own light through bioluminescence. This collection celebrates that alien evolution through digital generative art."

**Artistic Goals**:
1. **Visual Mastery**: Highest quality shaders featuring iridescence, bioluminescence, translucency, and organic movement
2. **True Generativity**: Modular, mix-match geometry system creating infinite creature variety
3. **Evolutionary Narrative**: Open-form mechanics where collectors evolve creatures through generations
4. **Technical Excellence**: WebGPU-powered real-time rendering at 60fps

### What Makes This Unique

| Aspect | Traditional Long-Form | Our Open-Form Approach |
|--------|----------------------|------------------------|
| **Output** | Static random outputs | Evolving lineages |
| **Collector Role** | Passive recipient | Active co-creator |
| **Variety** | Fixed parameter space | Infinite evolutionary paths |
| **Rarity** | Pre-determined traits | Emergent through exploration |
| **Community** | Individual ownership | Collaborative evolution |

---

## Target Audience

### Primary Audience: fxhash Collectors

**Demographics**:
- Age: 25-45
- Tech-savvy, interested in blockchain/digital art
- Appreciation for generative art and creative coding
- Disposition toward experimentation and discovery

**Psychographics**:
- Seek unique, evolving digital experiences
- Value technical excellence and innovation
- Enjoy collaborative/curation aspects of generative art
- Willing to explore deep parametric spaces

**Motivations**:
1. **Aesthetic Appreciation**: Beautiful, visually striking creatures
2. **Technical Curiosity**: Interest in WebGL/WebGPU, shaders, simulation
3. **Speculative Investment**: Belief in art's appreciative value
4. **Creative Participation**: Desire to shape evolution outcomes
5. **Community Status**: Recognition for discovering rare lineages

### Secondary Audience: Creative Coding Community

**Demographics**: Generative artists, WebGL developers, open-source contributors

**Value Proposition**:
- Open-source codebase for learning
- Demonstration of advanced techniques (WebGPU, TSL, physics)
- Modular architecture for extension

---

## Product Requirements

### Core Requirements

#### REQ-1: Modular Geometry System (MUST HAVE)
**Description**: Creature geometry must be composed of interchangeable, parametric modules that can combine in infinite ways.

**Acceptance Criteria**:
- [ ] Geometry broken into: Body modules, appendage modules, surface modules, emitter modules
- [ ] Each module has 5+ parameters (size, count, distribution, etc.)
- [ ] Modules connect via standardized interface (attachment points, constraints)
- [ ] At least 10 distinct body modules, 10 appendage modules, 5 surface modules
- [ ] Module compatibility matrix prevents impossible combinations
- [ ] System supports "franken-creature" combinations across types

**Rationale**: Enables true generative variety vs. fixed templates

#### REQ-2: Bioluminescent Shader System (MUST HAVE)
**Description**: Highest quality TSL shaders featuring iridescence, translucency, glow, and organic light patterns.

**Acceptance Criteria**:
- [ ] Shader pipeline supports: fresnel iridescence, subsurface scattering, volumetric glow
- [ ] Animated light patterns: pulses, waves, ripples, sparks
- [ ] Color system: bioluminescent palette (blues, cyans, magentas, greens)
- [ ] Light responds to: depth (fxhash), animation phase, interaction
- [ ] Performance: maintains 60fps with 2000+ particles
- [ ] At least 5 distinct bioluminescent behaviors

**Rationale**: Visual quality is primary value proposition

#### REQ-3: Open-Form Evolution System (MUST HAVE)
**Description**: Integration with fxhash open-form API enabling evolutionary mechanics.

**Acceptance Criteria**:
- [ ] Uses `$fx.lineage` array for evolution tracking
- [ ] Implements `$fx.randAt(depth)` for depth-based traits
- [ ] Root traits establish lineage characteristics (body type, palette)
- [ ] Inherited traits pass between generations
- [ ] Random mutations appear after depth thresholds
- [ ] Evolution mechanics incentive both horizontal (breadth) and vertical (depth) exploration
- [ ] Deterministic: same seed sequence always produces same creature

**Rationale**: Core mechanic for collector engagement and platform fit

#### REQ-4: Creature Type Variety (MUST HAVE)
**Description**: Multiple distinct deep sea creature archetypes with unique behaviors and aesthetics.

**Acceptance Criteria**:
- [ ] At least 5 base creature types implemented:
  - Medusozoa (jellyfish)
  - Actiniaria (sea anemones)
  - Ctenophora (comb jellies)
  - Siphonophora (colonial organisms)
  - Holothurioidea (sea cucumbers)
- [ ] Each type has unique: body plan, movement pattern, bioluminescence style
- [ ] Cross-type hybrids possible through modular system
- [ ] Each type has 3+ archetypes/variants

**Rationale**: Variety drives collection value and exploration

#### REQ-5: Performance & Quality (MUST HAVE)
**Description**: Professional-grade technical implementation.

**Acceptance Criteria**:
- [ ] 60fps rendering on modern GPUs
- [ ] Bundle size under 500KB (code-splitting)
- [ ] Mobile-responsive (iOS Safari, Android Chrome)
- [ ] WebGPU with WebGL2 fallback
- [ ] Error handling for edge cases
- [ ] Smooth loading experience

**Rationale**: Professional quality required for marketplace success

### Nice-to-Have Requirements

#### REQ-6: Interactive Elements (SHOULD HAVE)
- Mouse/touch interaction causing creature reactions
- Click to "nudge" or disturb creature
- Drag to rotate view

#### REQ-7: Procedural Audio (COULD HAVE)
- Procedural underwater ambience
- Bioluminescence-synced audio pulses
- Depth-based soundscape evolution

#### REQ-8: Documentation (SHOULD HAVE)
- Open-source repository with clear structure
- Code comments explaining techniques
- Tutorial/essay on artistic vision

---

## Success Metrics

### Primary Metrics (fxhash Platform)

| Metric | Target | Timeframe |
|--------|--------|-----------|
| **Primary Sales** | 500+ mints | First week |
| **Evolution Rate** | 60%+ mints have children | First month |
| **Average Depth** | 3+ generations | First month |
| **Collector Retention** | 40%+ evolve more than once | First month |
| **Secondary Market** | 30%+ of primary volume | First 3 months |

### Secondary Metrics (Community)

| Metric | Target | Timeframe |
|--------|--------|-----------|
| **GitHub Stars** | 500+ | First month |
| **Twitter/X Mentions** | 1000+ | First month |
| **Featured Articles** | 3+ (creative coding blogs) | First 3 months |
| **Forks/Contributions** | 50+ | First 3 months |

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Performance** | 60fps 95th percentile | fx(lens) telemetry |
| **Load Time** | <3s first paint | fx(lens) telemetry |
| **Error Rate** | <0.1% render failures | fx(lens) telemetry |
| **Bundle Size** | <500KB | Build output |

---

## User Stories

### Epic 1: Modular Geometry System

**US-1.1: Module Definition**
> As a developer, I want to define geometry modules with standardized interfaces, so that they can combine in infinite ways.

**US-1.2: Body Modules**
> As a collector, I want creatures to have varied body shapes (bell, barrel, tube, sphere), so that each lineage has unique silhouettes.

**US-1.3: Appendage Modules**
> As a collector, I want creatures to have diverse appendages (tentacles, tendrils, cilia, filaments), so that movement and form vary widely.

**US-1.4: Surface Modules**
> As a collector, I want creatures to have surface features (frills, ridges, bumps, bioluminescent cells), so that texture and detail add richness.

### Epic 2: Bioluminescent Shaders

**US-2.1: Fresnel Iridescence**
> As a viewer, I want creatures to shimmer with rainbow iridescence at viewing angles, so that they feel otherworldly.

**US-2.2: Subsurface Scattering**
> As a viewer, I want creature bodies to appear translucent with internal glow, so that they feel organic and alive.

**US-2.3: Animated Light Patterns**
> As a viewer, I want bioluminescence to pulse, wave, and ripple across creatures, so that they feel like living organisms.

### Epic 3: Open-Form Evolution

**US-3.1: Root Traits**
> As a collector, I want root mints to establish lineage-defining characteristics (body type, palette), so that my lineage has identity.

**US-3.2: Inherited Traits**
> As a collector, I want evolved creatures to inherit parent traits, so that lineages tell a visual story.

**US-3.3: Mutations**
> As a collector, I want surprise mutations to appear at depth thresholds, so that deep exploration rewards discovery.

**US-3.4: Depth Mechanics**
> As a collector, I want visual complexity to increase with depth, so that older lineages show evolution.

### Epic 4: Creature Types

**US-4.1: Medusozoa**
> As a collector, I want classic jellyfish with pulsing bells and trailing tentacles, so that I can collect familiar forms.

**US-4.2: Actiniaria**
> As a collector, I want sea anemones with radial tentacles and swaying bodies, so that I have variety beyond jellyfish.

**US-4.3: Ctenophora**
> As a collector, I want comb jellies with iridescent cilia rows, so that I have unique visual effects.

**US-4.4: Hybrids**
> As a collector, I want hybrid creatures combining traits from multiple types, so that discovery feels limitless.

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    fxhash Open-Form API                     │
│  $fx.lineage[] | $fx.depth | $fx.randAt(depth)            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Generative Engine (NEW)                    │
│  - ModuleComposer: Assembles creature from modules          │
│  - EvolutionController: Manages fxhash lineage mechanics    │
│  - TraitSystem: Root, inherited, mutation traits            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Existing Jellyfish System (EXTEND)             │
│  - JellyfishSystem: Physics, geometry generation            │
│  - InterpolationSystem: 30fps physics → 60fps render        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              NEW: Modular Geometry System                   │
│  - BodyModule, AppendageModule, SurfaceModule              │
│  - ModuleRegistry: Available modules & compatibility        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              NEW: Bioluminescent Shaders                    │
│  - IridescenceNodeMaterial                                  │
│  - SubsurfaceScatteringNodeMaterial                         │
│  - BioluminescenceAnimateNodeMaterial                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Three.js WebGPU Renderer                  │
│  - Post-processing: Bloom, Vignette, Lens Dirt              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components to Build

1. **GenerativeEngine** (NEW)
   - `ModuleComposer`: Selects and combines modules based on fxhash randomness
   - `EvolutionController`: Implements open-form mechanics
   - `TraitSystem`: Manages trait inheritance and mutation

2. **ModularGeometrySystem** (NEW)
   - `BodyModule`: Bell, barrel, tube, sphere, etc.
   - `AppendageModule`: Tentacle, tendril, filament, cilia
   - `SurfaceModule`: Frills, ridges, bioluminescent cells
   - `ModuleRegistry`: Compatibility and parameter definitions

3. **BioluminescentShaders** (EXTEND existing)
   - Enhance existing 5 materials with new effects
   - Add: iridescence, subsurface scattering, animated patterns

4. **CreatureTypes** (EXTEND existing)
   - Add: Actiniaria, Ctenophora, Holothurioidea
   - Refactor: Medusozoa (existing jellyfish)

---

## Dependencies & Integration

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| fxhash SDK | Latest | Open-form API |
| three | ^0.180.0 | WebGPU renderer |
| particulate | ^0.3.1 | Physics simulation |

### Internal Dependencies

| Component | Dependency | Notes |
|-----------|------------|-------|
| GenerativeEngine | fxhash SDK | Must be initialized first |
| ModularGeometrySystem | GenerativeEngine | Uses module composer |
| BioluminescentShaders | ModularGeometrySystem | Requires geometry data |
| CreatureTypes | All systems | Integration point |

---

## Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Performance degradation** with complex modules | High | Medium | LOD system, module complexity budget |
| **WebGPU compatibility** issues | High | Low | WebGL2 fallback, testing matrix |
| **Bundle size** exceeds limits | Medium | High | Code-splitting, lazy loading |
| **Determinism bugs** in evolution | Critical | Medium | Comprehensive testing, seed validation |

### Product Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Collector engagement** low | High | Medium | Incentivize exploration with rare mutations |
| **Platform rejection** by fxhash | Critical | Low | Early review with fxhash team |
| **Visual quality** not competitive | High | Medium | Iterative visual polish, user testing |
| **Saturation** of similar projects | Medium | Low | Focus on unique shader quality |

---

## Roadmap

### Phase 1: Foundation (Weeks 1-4)
- Sprint 1: Modular geometry system architecture
- Sprint 2: Bioluminescent shader system
- Sprint 3: fxhash open-form integration
- Sprint 4: Core creature types (medusozoa, actiniaria)

### Phase 2: Expansion (Weeks 5-8)
- Sprint 5: Additional creature types (ctenophora, siphonophora)
- Sprint 6: Advanced evolution mechanics
- Sprint 7: Performance optimization
- Sprint 8: Polish and testing

### Phase 3: Launch (Weeks 9-10)
- Sprint 9: fxhash submission and review
- Sprint 10: Launch preparation and documentation

---

## Open Questions

1. **Pricing Strategy**: What is the mint price? (Recommendation: 5-10 tezos)
2. **Edition Size**: How many root mints? (Recommendation: 500-1000)
3. **Depth Limits**: Should there be a maximum evolution depth? (Recommendation: No hard limit, but diminishing returns after depth 10)
4. **Mutation Rates**: What probability for random mutations? (Recommendation: 1-5% per depth level)
5. **Audio**: Include procedural audio or focus purely on visual? (Recommendation: Visual-only for initial release)

---

## Appendix: fxhash Open-Form Mechanics

### Evolution Strategies

Our implementation will use **multiple strategies** from fxhash docs:

1. **Depth-Based Traits** (`$fx.depth`)
   - Creature complexity increases with depth
   - More appendages, surface details at deeper levels

2. **Root Traits** (`$fx.randAt(0)`)
   - Body type selected at root
   - Color palette established at root
   - Lineage identity defined at root

3. **Inherited Traits** (loop through `$fx.lineage`)
   - Module selections pass through generations
   - Parameter values inherited with small mutations
   - Bioluminescence patterns evolve

4. **Random Mutations** (`$fx.randAt(n)` > threshold)
   - New module types appear after depth 4
   - Color shifts and palette additions
   - Structural anomalies

### Code Pattern

```typescript
// Root traits (lineage-defining)
const bodyType = BODY_TYPES[Math.floor($fx.randAt(0) * BODY_TYPES.length)]
const basePalette = PALETTES[Math.floor($fx.randAt(0) * PALETTES.length)]

// Inherited traits (reproduce parent decisions)
let currentModules = []
for (let i = 0; i < $fx.depth; i++) {
  const moduleChoice = Math.floor($fx.randAt(i) * AVAILABLE_MODULES.length)
  currentModules.push(AVAILABLE_MODULES[moduleChoice])
}

// Current generation traits
const currentAppendage = APPENDAGES[Math.floor($fx.rand() * APPENDAGES.length)]

// Mutations (after depth threshold)
if ($fx.depth > 3) {
  for (let i = 0; i < $fx.depth; i++) {
    if ($fx.randAt(i) > 0.98) {
      // Add rare mutation
      addMutation()
    }
  }
}
```

---

**Document Status**: ✅ Draft Complete
**Next Step**: Create Epic Breakdown document
**Related**: ARCHITECTURE.md, PROJECT_CONTEXT.md
**Bead**: ejw-prd (to be created)
