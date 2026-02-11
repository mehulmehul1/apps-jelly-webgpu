# Geometry System Advanced Elicitation
## Leg: hq-leg-aftfk | Project: Abyssal Genesis - Jellyfish WebGPU
**Date:** 2026-02-08
**Facilitator:** Modular Geometry Architect
**Objective:** Use 5 elicitation methods to analyze geometry system requirements

---

## PHASE 2: ADVANCED ELICITATION

### METHOD 1: ARCHITECTURE DECISION RECORDS (ADR)

#### ADR-001: Geometry Primitive System
**Status:** Proposed
**Date:** 2026-02-08

**Context:**
Deep sea creatures require diverse geometric forms - from smooth bells to flowing tentacles. Need a system that supports both parametric precision and organic variation.

**Decision:**
Hybrid parametric-procedural system combining:
- Parametric base shapes for predictable bell forms
- Procedural displacement for organic surface variation
- Spline-based curves for tentacle generation
- Metaball merging for smooth organic transitions

**Consequences:**
- **Positive:** Flexible system supporting creature diversity
- **Positive:** Performance through GPU acceleration
- **Negative:** Increased system complexity
- **Negative:** Requires careful parameter management

**Alternatives Considered:**
1. Pure parametric - Too rigid for organic forms
2. Pure procedural - Too unpredictable for consistent design
3. Pure metaball - Performance issues at scale
4. Pure mesh-based - Limited runtime modification

---

#### ADR-002: Tentacle Architecture
**Status:** Proposed
**Date:** 2026-02-08

**Context:**
Tentacles are fundamental to deep sea creatures, requiring:
- Long, flexible structures
- Natural movement simulation
- Variable thickness and branching
- Performance-efficient rendering

**Decision:**
Segmented Verlet integration chain system with:
- Catmull-Rom spline interpolation for smooth curves
- Per-segment radius control for thickness variation
- Hierarchical branching for complex structures
- GPU compute for physics simulation

**Consequences:**
- **Positive:** Natural, physics-based movement
- **Positive:** Efficient GPU computation
- **Positive:** Easy branching and variation
- **Negative:** Requires careful parameter tuning
- **Negative:** May need constraint solving for collisions

**Alternatives Considered:**
1. Forward kinematics - Less natural movement
2. Inverse kinematics - Computationally expensive
3. Pure procedural animation - Less interactive
4. Static mesh animation - Limited variation

---

#### ADR-003: Surface Detail Strategy
**Status:** Proposed
**Date:** 2026-02-08

**Context:**
Deep sea creatures exhibit:
- Fine surface texture (papillae, warts)
- Internal structure visibility
- Bioluminescent patterns
- Translucency and subsurface scattering

**Decision:**
Multi-layered approach:
- Base geometry for primary shape
- Normal mapping for micro-topography
- Vertex displacement for macro features
- Thickness attributes for subsurface scattering
- Separate geometry for internal structures

**Consequences:**
- **Positive:** Rich visual detail without excessive geometry
- **Positive:** Performance-friendly approach
- **Positive:** Supports bioluminescence visualization
- **Negative:** Multiple texture coordinate sets required
- **Negative:** Increased shader complexity

**Alternatives Considered:**
1. Pure geometry - Performance prohibitive
2. Pure texture-based - Limited depth perception
3. Vertex-only detail - Insufficient resolution

---

### METHOD 2: ALGORITHM OLYMPICS

#### Competition 1: Bell Surface Generation

**Contestants:**

1. **Parametric Sphere Deformation**
   - Approach: Start with sphere, apply mathematical deformations
   - Performance: Excellent (GPU-friendly)
   - Flexibility: Good (parameter-driven)
   - Organic Quality: Fair (too regular)
   - **Score: 7/10**

2. **Metaball Field**
   - Approach: Implicit surface from field of balls
   - Performance: Poor (CPU marching cubes)
   - Flexibility: Excellent (organic merging)
   - Organic Quality: Excellent (natural blobs)
   - **Score: 6/10**

3. **Subdivision Surface**
   - Approach: Refine coarse mesh
   - Performance: Good (GPU subdivision)
   - Flexibility: Excellent (artistic control)
   - Organic Quality: Excellent (smooth curves)
   - **Score: 9/10** ✅ WINNER

4. **Parametric Patch (NURBS)**
   - Approach: Mathematical surface patches
   - Performance: Fair (evaluation cost)
   - Flexibility: Excellent (precise control)
   - Organic Quality: Good (smooth but regular)
   - **Score: 7/10**

**Winner: Subdivision Surface**
- Best balance of performance, flexibility, and organic quality
- GPU-friendly implementation
- Artist-controllable through edge loop placement

---

#### Competition 2: Tentacle Curve Generation

**Contestants:**

1. **Catmull-Rom Splines**
   - Approach: Interpolating curves through control points
   - Performance: Excellent (simple calculation)
   - Flexibility: Good (easy point manipulation)
   - Movement Quality: Good (smooth interpolation)
   - **Score: 8/10** ✅ WINNER

2. **Bezier Curves**
   - Approach: Control point approximation
   - Performance: Excellent
   - Flexibility: Good (intuitive control)
   - Movement Quality: Fair (doesn't pass through points)
   - **Score: 6/10**

3. **B-Splines**
   - Approach: Basis function combination
   - Performance: Good
   - Flexibility: Excellent (local control)
   - Movement Quality: Good (smooth curves)
   - **Score: 7/10**

4. **Procedural Sine Waves**
   - Approach: Mathematical wave functions
   - Performance: Excellent (GPU-tractable)
   - Flexibility: Fair (limited control)
   - Movement Quality: Fair (repetitive)
   - **Score: 5/10**

**Winner: Catmull-Rom Splines**
- Passes through control points (easier to direct)
- Smooth interpolation for natural movement
- Easy to implement with Verlet physics
- Performance-friendly

---

#### Competition 3: Surface Displacement

**Contestants:**

1. **Vertex Shader Displacement**
   - Approach: GPU-based vertex movement
   - Performance: Excellent (parallel processing)
   - Flexibility: Good (shader-based control)
   - Visual Quality: Good (smooth displacement)
   - **Score: 9/10** ✅ WINNER

2. **CPU Geometry Modification**
   - Approach: Pre-compute displaced geometry
   - Performance: Poor (CPU-bound)
   - Flexibility: Excellent (any algorithm)
   - Visual Quality: Excellent (unconstrained)
   - **Score: 5/10**

3. **Normal Mapping Only**
   - Approach: Fake detail with lighting
   - Performance: Excellent (no geometry change)
   - Flexibility: Good (texture-based)
   - Visual Quality: Fair (no silhouette change)
   - **Score: 6/10**

4. **Tessellation Shader**
   - Approach: Dynamic subdivision + displacement
   - Performance: Good (adaptive detail)
   - Flexibility: Excellent (detail on demand)
   - Visual Quality: Excellent (true detail)
   - **Score: 8/10**

**Winner: Vertex Shader Displacement**
- Best performance/quality ratio
- GPU-based (parallel)
- Animation-friendly
- Good balance of detail and efficiency

---

### METHOD 3: PERFORMANCE PROFILER PANEL

#### Scenario 1: 100 Jellyfish on Screen

**Geometry Breakdown:**
- Bell: 2,000 vertices (subdivision surface)
- Tentacles: 20 × 50 segments = 1,000 vertices
- Oral Arms: 4 × 100 segments = 400 vertices
- **Total per creature:** 3,400 vertices
- **Total for 100:** 340,000 vertices

**Performance Budget:**
- Target: 60 FPS = 16.67ms per frame
- Geometry: ~2ms (12%)
- Skinning: ~3ms (18%)
- Rendering: ~8ms (48%)
- **Total: ~13ms (78% - acceptable)**

**Optimization Strategies:**
1. **LOD System:**
   - High (< 20 units): Full detail
   - Medium (20-50 units): 50% reduction
   - Low (> 50 units): 75% reduction

2. **Instancing:**
   - Share base geometry
   - Instance transforms only
   - 90% memory reduction

3. **GPU Skinning:**
   - Compute shader animation
   - Parallel processing
   - 10× faster than CPU

**Verdict:** Feasible with optimizations

---

#### Scenario 2: Single Creature Close-up

**Geometry Requirements:**
- Ultra-high detail bell: 50,000 vertices
- Dense tentacle system: 50 × 200 segments = 10,000 vertices
- Complex oral arms: 8 × 500 segments = 4,000 vertices
- Internal structures: 5,000 vertices
- **Total: 69,000 vertices**

**Performance Impact:**
- Geometry processing: ~0.5ms
- Complex materials: ~4ms
- Post-processing: ~3ms
- **Total: ~7.5ms (45% - excellent)**

**Optimization Strategies:**
1. **Tessellation-on-demand:**
   - Base mesh: 10,000 vertices
   - Tessellation factor: 5×
   - Adaptive based on screen size

2. **Material simplification:**
   - Use pre-integrated subsurface scattering
   - Approximate bioluminescence
   - Deferred rendering for multiple lights

**Verdict:** Feasible with single creature focus

---

#### Scenario 3: Background Swarm (1,000 creatures)

**Geometry Requirements:**
- Simplified bells: 200 vertices each
- Minimal tentacles: 5 × 10 segments = 50 vertices
- **Total per creature:** 250 vertices
- **Total for 1,000:** 250,000 vertices

**Performance Budget:**
- Geometry: ~1ms
- Simple materials: ~2ms
- Instanced rendering: ~1ms
- **Total: ~4ms (24% - excellent)**

**Optimization Strategies:**
1. **Aggressive LOD:**
   - Single quad with displacement for distant
   - Sprite rendering for very distant
   - Progressive mesh simplification

2. **Batch Rendering:**
   - Single draw call per creature type
   - Instance buffer transforms
   - Material sorting for state changes

**Verdict:** Easily feasible

---

### METHOD 4: RUBBER DUCK DEBUGGING

#### Session 1: Why Do We Need Modular Geometry?

**Q: Why can't we just model each creature individually?**

A: Well, we could, but:
1. **Procedural generation requires modularity** - We need to generate creatures on-the-fly
2. **Variation is essential** - Deep sea creatures show enormous diversity
3. **Performance matters** - Reusable geometry is more efficient
4. **Artist workflow** - Modular system lets artists mix and match
5. **Future extensibility** - New creatures from existing parts

**Q: But doesn't modularity limit creativity?**

A: Actually, it enhances creativity:
- **Combinatorial explosion** - 10 bells × 10 tentacle types = 100 creatures
- **Parameter ranges** - Continuous variation, not discrete choices
- **Mixing systems** - Bell from jellyfish + tentacles from ctenophore
- **Evolution potential** - Mutate parameters for new forms

**Q: How do we handle organic irregularity?**

A: Multiple strategies:
- **Noise injection** - Perlin/Simplex displacement
- **Parameter variation** - Slight randomization
- **Asymmetry options** - Break symmetry intentionally
- **Growth simulation** - Procedural development over time

---

#### Session 2: How Do Tentacles Move Naturally?

**Q: Why Verlet integration for tentacles?**

A: Natural movement simulation:
1. **Physics-based** - Gravity, water resistance, inertia
2. **Constraint satisfaction** - Segment length constraints
3. **Easy to implement** - Simple integration scheme
4. **Stable** - Less prone to explosion than RK4
5. **GPU-friendly** - Parallel computation

**Q: Won't 100 tentacles × 50 segments be slow?**

A: Actually, efficient:
- **GPU compute** - Parallelize across tentacles
- **Only update visible** - LOD for distance
- **Simplified physics** - Don't need full accuracy
- **Cache results** - Reuse physics frames

**Q: How do we prevent tentacles from tangling?**

A: Multiple strategies:
- **Collision detection** - Only when necessary (performance)
- **Repulsion forces** - Keep tentacles apart
- **Flow field influence** - Water currents separate them
- **Visual tricks** - Transparency hides minor intersections

---

#### Session 3: What About Bioluminescence Geometry?

**Q: Do we need special geometry for bioluminescence?**

A: Yes and no:
- **Base geometry** - Standard creature mesh
- **Emissive attributes** - Vertex colors or texture
- **Separate mesh** - For complex internal glow
- **Particle systems** - For point-source bioluminescence

**Q: How do we make it look like it's coming from inside?**

A: Material and shader tricks:
- **Thickness attribute** - For subsurface scattering
- **Fresnel effect** - Edge glow
- **Inner mesh** - Separate emissive geometry
- **Volumetric approach** - Raymarching for volume glow

**Q: Won't that be expensive?**

A: Manageable:
- **Thresholding** - Only glow above brightness
- **Bloom post-process** - Cheap glow effect
- **Deferred shading** - Efficient multiple lights
- **Approximate SSS** - Don't need full simulation

---

### METHOD 5: FIRST PRINCIPLES ANALYSIS

#### Principle 1: What is a Jellyfish, Fundamentally?

**Biological Reality:**
- **95% water** - Nearly neutrally buoyant
- **Radial symmetry** - No front/back/left/right
- **Gelatinous mesoglea** - Jelly-like substance between layers
- **Single cavity** - Gastrovascular chamber for digestion/circulation
- **Nerve net** - Decentralized nervous system

**Geometric Implications:**
1. **Thin-walled vessels** - Shell geometry, not solid
2. **Symmetry operations** - Radial replication
3. **Deformable bodies** - Soft body dynamics
4. **Hollow interiors** - Internal cavity visible
5. **Pulsing motion** - Periodic scaling/contraction

**Implementation Strategy:**
- Two-layer mesh (inner/outer surfaces)
- Radial parameter system (4-fold, 8-fold symmetry)
- Vertex shader deformation for pulsing
- Transparency for internal visibility
- Thickness attribute for subsurface scattering

---

#### Principle 2: How Do Creatures Move Through Water?

**Physics of Aquatic Locomotion:**
- **Drag force** - Proportional to velocity squared
- **Reynolds number** - Ratio of inertial to viscous forces
- **Added mass** - Water moves with creature
- **Vortex shedding** - Alternating vortices create thrust

**Geometric Implications:**
1. **Streamlining** - Reduce drag with teardrop shapes
2. **Flexible bodies** - Bend with water flow
3. **Surface area** - More area = more drag/thrust
4. **Undulation** - Wave propagation along body

**Implementation Strategy:**
- **Pulsing bells** - Periodic scaling for jet propulsion
- **Undulating tentacles** - Sine wave propagation
- **Drag coefficients** - Per-vertex velocity dampening
- **Water interaction** - Simple fluid dynamics approximation

---

#### Principle 3: What Creates the Visual Appearance?

**Light-Matter Interaction:**
- **Translucency** - Light passes through material
- **Scattering** - Light redirects in tissue
- **Refraction** - Light bends at interfaces
- **Absorption** - Light absorbed by pigments
- **Bioluminescence** - Chemical light emission

**Geometric Implications:**
1. **Thickness matters** - Thicker = more scattering
2. **Surface normal** - Affects refraction
3. **Internal structure** - Visible through transparency
4. **Emissive surfaces** - Self-illuminated geometry

**Implementation Strategy:**
- **Vertex thickness** - Store thickness per vertex
- **Dual normals** - Inner and outer surface normals
- **Internal mesh** - Separate geometry for organs
- **Emissive channels** - Vertex color for bioluminescence
- **Refraction approximation** - Simple fresnel-based

---

#### Principle 4: How Does Geometry Scale?

**Allometric Growth:**
- Different parts grow at different rates
- Proportions change with size
- Surface area vs volume relationships
- Square-cube law implications

**Geometric Implications:**
1. **Non-uniform scaling** - Different axes scale differently
2. **Proportion parameters** - Size ratios, not absolute sizes
3. **Thickness scaling** - Walls don't scale with volume
4. **Density variation** - Larger creatures need different structure

**Implementation Strategy:**
- **Size parameters** - Base size × multipliers
- **Proportion presets** - Species-specific ratios
- **Thickness curves** - Function of creature size
- **LOD integration** - Simpler geometry for small creatures

---

#### Principle 5: What Makes Geometry "Modular"?

**Modularity Principles:**
- **Interface consistency** - Standard connections
- **Independence** - Modules don't depend on each other
- **Composability** - Combine modules freely
- **Reusability** - Use modules in multiple contexts
- **Extensibility** - Easy to add new modules

**Geometric Implications:**
1. **Attachment points** - Standardized connection interfaces
2. **Parameter isolation** - Module parameters don't conflict
3. **Boundary matching** - Seamlessly blend between modules
4. **Scaling independence** - Modules work at any scale

**Implementation Strategy:**
- **Module registry** - Centralized module management
- **Interface contracts** - Defined input/output
- **Blend zones** - Smooth transitions between modules
- **Parameter namespacing** - Avoid parameter conflicts
- **Module versioning** - Support evolution

---

## ELICITATION SUMMARY

### Key Decisions:

1. **Hybrid Geometry System:** Parametric base + Procedural detail
2. **Subdivision Surfaces:** For bell morphology
3. **Verlet Integration:** For tentacle physics
4. **GPU Acceleration:** Compute shaders for performance
5. **Modular Architecture:** Composable creature parts

### Performance Targets:

- **100 creatures:** 60 FPS achievable
- **Single creature:** Ultra-high detail feasible
- **1,000 creatures:** Efficient with instancing

### Technical Approach:

- **Multi-layered meshes** for internal/external structures
- **Vertex attributes** for material properties
- **Shader-based deformation** for animation
- **LOD system** for scalability
- **Instance rendering** for efficiency

---

**Facilitator:** Modular Geometry Architect
**Date:** 2026-02-08
**Status:** Complete - Ready for Phase 3: Analysis & Synthesis
