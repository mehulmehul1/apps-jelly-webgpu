# Stage 1.5: BMad Strategic Review - PM & Architect Party Mode
## Abyssal Genesis - Jellyfish WebGPU Project

**Date:** 2026-02-08
**Team:** PM + Architect Strategic Review
**Status:** COMPLETE
**Next Phase:** Stage 2 Integration

---

## EXECUTIVE SUMMARY

This document synthesizes **all Stage 1 outputs** from 8 specialist domains into a coherent strategic roadmap. The review analyzed:

- **7 Synthesis Documents** (Forms, Geometry, Shaders, Effects, Physics, Bioluminescence, Mathematical Forms)
- **6 Brainstorming Transcripts** (Forms, Geometry, Shaders, Effects, Physics, Bioluminescence)
- **330+ Geometry Ideas**, **225+ Form Ideas**, **210+ Effects Ideas**, **210+ Physics Ideas**, **150+ Bioluminescence Ideas**

**Key Strategic Decisions:**

1. **MVP Prioritization:** Focus on 3 creature archetypes for maximum impact
2. **Technical Architecture:** Modular composition with well-defined interfaces
3. **Implementation Phasing:** 5-phase rollout over 10 weeks
4. **Feature Value:** Geometry extensions provide highest generative variety
5. **Performance Target:** 60 FPS with 100+ creatures on mid-range hardware

---

## 1. MVP_ARCHITECTURES.md

### Creature Archetype Prioritization

#### MUST-HAVE (Tier 1) - Ship First

**1. Classic Medusozoa (Bell Jellyfish)**
- **Rationale:** Most iconic jellyfish form, covers widest range of visual references
- **Generative Value:** High - bell variations, tentacle arrangements, surface features
- **Technical Feasibility:** Well-understood geometry, all primitives exist
- **Implementation Priority:** WEEK 1-2
- **Key Features:**
  - Hemispherical to flattened bell shapes
  - Marginal tentacles (20-200 count)
  - Oral arms (0-8 count)
  - Radial bioluminescence patterns
  - Bell pulsing animation

**2. Comb Jelly (Ctenophora)**
- **Rationale:** Unique visual identity, rainbow iridescence is technically impressive
- **Generative Value:** Medium - body variations limited, but comb rows create diversity
- **Technical Feasibility:** Requires new iridescence shader technique
- **Implementation Priority:** WEEK 3-4
- **Key Features:**
  - Ellipsoidal body shape
  - 8 comb rows with rainbow diffraction
  - 0-2 long tentacles
  - Metachronal wave animation
  - Thin-film interference shader

**3. Siphonophore (Colonial Jellyfish)**
- **Rationale:** Demonstrates modular architecture, enables novel silhouettes
- **Generative Value:** Very High - extreme length-to-width ratios, colonial arrangements
- **Technical Feasibility:** Requires ribbon geometry and chain systems
- **Implementation Priority:** WEEK 5-6
- **Key Features:**
  - Ribbon or segmented body forms
  - Dorsal spines and ventral filaments
  - Edge bioluminescence
  - Undulating motion
  - Modular zooid specialization

#### NICE-TO-HAVE (Tier 2) - Ship Later

**4. Box Jellyfish (Cubozoa)**
- **Rationale:** Shows angular variation, but visually similar to Medusozoa
- **Implementation Priority:** WEEK 7-8
- **Key Features:** Box-shaped bell, 4 pedalium clusters, complex bioluminescent patterns

**5. Sea Anemone (Actiniaria)**
- **Rationale:** Adds sessile variety, but limited movement
- **Implementation Priority:** WEEK 9-10
- **Key Features:** Columnar base, crown of tentacles, oral disc, radial pulse

#### FUTURE (Tier 3) - Post-MVP

**6. Colonial Forms (Pyrosomes, etc.)**
- **Rationale:** Extends Siphonophore concept to spherical/helical arrangements
- **Implementation Priority:** Phase 2

**7. Ribbon Forms (Specialized)**
- **Rationale:** Covered partially by Siphonophore, may not need separate body plan
- **Implementation Priority:** Phase 2

### Justification Summary

| Priority | Creature Type | Visual Impact | Technical Complexity | Generative Value | Total Score |
|----------|--------------|---------------|---------------------|------------------|-------------|
| **1** | Classic Medusozoa | 9/10 | 3/10 (Low) | 9/10 | **21/30** |
| **2** | Comb Jelly | 10/10 | 7/10 (High) | 7/10 | **24/30** |
| **3** | Siphonophore | 8/10 | 6/10 (Medium) | 10/10 | **24/30** |
| 4 | Box Jellyfish | 6/10 | 5/10 (Medium) | 5/10 | 16/30 |
| 5 | Sea Anemone | 7/10 | 4/10 (Low-Medium) | 6/10 | 17/30 |
| 6 | Colonial Forms | 7/10 | 9/10 (Very High) | 8/10 | 24/30 |
| 7 | Ribbon Forms | 5/10 | 5/10 (Medium) | 4/10 | 14/30 |

**Decision:** Ship Tier 1 creatures first (Medusozoa, Comb Jelly, Siphonophore). These provide maximum visual variety while covering the most important technical challenges.

---

## 2. FEATURE_PRIORITIZATION.md

### What Creates Most Generative Variety

**Ranking by Combinatorial Potential:**

1. **Geometry Extensions** (1000+ combinations)
   - Bell shapes × Tentacle types × Surface features
   - 5 bells × 10 tentacles × 10 features = 500 base creatures
   - Parameter ranges multiply this 10-100×
   - **Build First**

2. **Shader Patterns** (500+ combinations)
   - Color palettes × Bioluminescence patterns × Material properties
   - Enhances geometry but doesn't create new silhouettes
   - **Build Second**

3. **Color Systems** (200+ combinations)
   - Temperature ranges × Saturation levels × Gradient patterns
   - Important for visual distinction
   - **Build Third**

4. **Animation Behaviors** (100+ combinations)
   - Pulse frequencies × Wave patterns × Synchronization modes
   - Adds life but less visible in static images
   - **Build Fourth**

5. **Particle Effects** (50+ combinations)
   - Glow patterns × Environmental particles × Trail effects
   - Performance-intensive, polish feature
   - **Build Fifth**

### Phased Implementation Approach

#### Phase 1: Foundation (Weeks 1-2)
**Goal:** Basic creature generation and rendering

- Parametric bell shapes (hemisphere, ellipsoid, flattened)
- Simple chain tentacles (Verlet integration)
- Basic material shaders (transparency, subsurface scattering)
- Static rendering pipeline
- **Target:** 10 base creature variants

#### Phase 2: Core Creatures (Weeks 3-4)
**Goal:** Three must-have archetypes functional

- Medusozoa complete system (bells, tentacles, oral arms)
- Comb jelly system (iridescence shader, comb rows)
- Siphonophore system (ribbon geometry, chains)
- Bell pulsing animation
- Basic bioluminescence (point sources)
- **Target:** 50 creature variants

#### Phase 3: Visual Enhancement (Weeks 5-6)
**Goal:** Shader patterns and color systems

- Bioluminescence pattern system (20+ patterns)
- Color temperature gradients (depth-based)
- Surface feature shaders (ridges, bumps, veins)
- Advanced materials (fresnel, iridescence)
- Post-processing pipeline (bloom, vignette)
- **Target:** 200 creature variants

#### Phase 4: Animation & Physics (Weeks 7-8)
**Goal:** Movement and interaction

- Tentacle undulation physics
- Metachronal wave coordination
- Particle systems (marine snow, flow trails)
- Interactive behaviors (mouse response)
- Performance optimization (LOD, instancing)
- **Target:** 500 creature variants

#### Phase 5: Polish & Variety (Weeks 9-10)
**Goal:** Maximum generative variety

- Advanced geometry (coiled tentacles, branching)
- Rare creature types (box jellies, anemones)
- Quality presets (potato to ultra)
- Archetype library (100+ presets)
- User interface controls
- **Target:** 1000+ creature variants

### Feature Value Decision Matrix

| Feature | Generative Value | Implementation Cost | ROI | Priority |
|---------|-----------------|-------------------|-----|----------|
| Bell Shape Variations | 9/10 | 3/10 | **3.0** | P1 |
| Tentacle Type Diversity | 8/10 | 5/10 | **1.6** | P1 |
| Surface Feature Modifiers | 7/10 | 4/10 | **1.75** | P2 |
| Bioluminescence Patterns | 7/10 | 6/10 | **1.17** | P2 |
| Color Grading Systems | 6/10 | 3/10 | **2.0** | P1 |
| Animation Behaviors | 5/10 | 7/10 | **0.71** | P3 |
| Particle Effects | 4/10 | 8/10 | **0.5** | P4 |
| Post-Processing | 5/10 | 5/10 | **1.0** | P3 |

**ROI = Generative Value ÷ Implementation Cost**
**Higher ROI = Build First**

---

## 3. INTERFACE_CONTRACTS.md

### Module Integration Specifications

#### Core Geometry Interface

```typescript
/**
 * Base interface for all geometry modules
 * All geometry generators must implement this contract
 */
interface IGeometryModule {
  /**
   * Module identification
   */
  readonly name: string;
  readonly type: GeometryPrimitiveType;
  readonly version: string;

  /**
   * Generate geometry from creature specification
   * @param spec - Creature specification with parameters
   * @returns Generated geometry with all required attributes
   */
  generate(spec: CreatureSpec): Promise<GeneratedGeometry>;

  /**
   * Validate module parameters before generation
   * @param parameters - Module-specific parameters
   * @returns Validation result with errors if any
   */
  validate(parameters: unknown): ValidationResult;

  /**
   * Get module dependencies
   * @returns Array of module IDs this module depends on
   */
  getDependencies(): string[];

  /**
   * Get attachment points for child modules
   * @param spec - Creature specification
   * @returns Array of attachment points
   */
  getAttachmentPoints(spec: CreatureSpec): AttachmentPoint[];
}

/**
 * Generated geometry output contract
 * All geometry modules must return this structure
 */
interface GeneratedGeometry {
  // Core mesh data (WebGPU buffers)
  readonly vertexBuffer: GPUBuffer;
  readonly indexBuffer: GPUBuffer;
  readonly vertexCount: number;
  readonly indexCount: number;

  // Vertex attributes
  readonly positions: Float32Array;      // vec3<f32>
  readonly normals: Float32Array;        // vec3<f32>
  readonly uvs: Float32Array;            // vec2<f32>

  // Custom attributes (optional)
  readonly thickness?: Float32Array;      // f32 - for subsurface scattering
  readonly vertexColors?: Float32Array;   // vec4<f32> - RGBA
  readonly bioluminescence?: Float32Array; // f32 - emission intensity
  readonly fresnel?: Float32Array;        // f32 - edge glow factor

  // Attachment points for child modules
  readonly attachmentPoints: readonly AttachmentPoint[];

  // Metadata
  readonly boundingBox: BoundingBox;
  readonly generationTime: number;        // milliseconds
}

/**
 * Attachment point contract
 * Defines where child modules can attach
 */
interface AttachmentPoint {
  readonly id: string;
  readonly position: Vector3;            // World position
  readonly normal: Vector3;              // Surface normal
  readonly tangent: Vector3;             // Surface tangent
  readonly bitangent: Vector3;           // Surface bitangent

  // Attachment constraints
  readonly type: AttachmentType;
  readonly capacity: number;             // Max children
  readonly allowedChildTypes: readonly GeometryPrimitiveType[];

  // Spacing parameters
  readonly spacing: SpacingMode;
  readonly distribution: DistributionMode;
}

type AttachmentType =
  | 'radial'          // Even spacing around circle
  | 'bilateral'       // Left-right pairs
  | 'clustered'       // Groups in specific regions
  | 'explicit'        // Artist-defined positions
  | 'surface';        // Constrained to surface

type SpacingMode =
  | 'uniform'         // Even distribution
  | 'gradient'        // Variable density
  | 'random'          // Random positions
  | 'phyllotaxis';    // Golden-angle spiral

type DistributionMode =
  | 'linear'          // Straight line
  | 'radial'          // Circular arc
  | 'spherical'       // Sphere surface
  | 'cylindrical';    // Cylinder surface
```

#### Tentacle System Interface

```typescript
/**
 * Tentacle module interface
 * All tentacle types must implement this contract
 */
interface ITentacleModule extends IGeometryModule {
  /**
   * Update tentacle physics
   * @param deltaTime - Time since last frame
   * @param time - Total elapsed time
   * @param parameters - Animation parameters
   */
  updatePhysics(
    deltaTime: number,
    time: number,
    parameters: TentaclePhysicsParameters
  ): void;

  /**
   * Get current tentacle tip position
   * Useful for collision detection and interaction
   */
  getTipPosition(): Vector3;

  /**
   * Get tentacle curve points
   * Useful for rendering trails and effects
   */
  getCurvePoints(): readonly Vector3[];
}

/**
 * Tentacle physics parameters
 */
interface TentaclePhysicsParameters {
  // Verlet integration parameters
  readonly segmentCount: number;
  readonly segmentLength: number;
  readonly stiffness: number;           // 0-1, 1 = rigid
  readonly damping: number;            // 0-1, 1 = no oscillation

  // Forces
  readonly gravity: Vector3;
  readonly buoyancy: Vector3;
  readonly waterVelocity: Vector3;
  readonly turbulence: number;         // 0-1

  // Animation
  readonly waveFrequency: number;      // Hz
  readonly waveAmplitude: number;      // 0-1
  readonly waveSpeed: number;          // Units per second
  readonly phaseOffset: number;        // Radians
}
```

#### Material System Interface

```typescript
/**
 * Material module interface
 * All material shaders must implement this contract
 */
interface IMaterialModule {
  /**
   * Create WebGPU material from specification
   * @param spec - Material specification
   * @returns Material with render pipeline
   */
  createMaterial(spec: MaterialSpec): Promise<Material>;

  /**
   * Update material uniforms
   * @param material - Material to update
   * @param time - Current animation time
   * @param parameters - Dynamic parameters
   */
  updateMaterial(
    material: Material,
    time: number,
    parameters: MaterialParameters
  ): void;
}

/**
 * Material specification
 */
interface MaterialSpec {
  // Base properties
  readonly baseColor: Color;
  readonly opacity: number;            // 0-1
  readonly translucency: number;       // 0-1, subsurface scattering
  readonly roughness: number;          // 0-1
  readonly metalness: number;          // 0-1
  readonly thickness: number;          // World units

  // Bioluminescence
  readonly emissiveColor: Color;
  readonly emissiveIntensity: number;  // 0-1
  readonly emissivePattern: Texture | null;

  // Special effects
  readonly iridescence: IridescenceSpec | null;
  readonly fresnel: FresnelSpec | null;
  readonly subsurfaceScattering: SubsurfaceSpec | null;
}

/**
 * Bioluminescence pattern interface
 */
interface IBioluminescenceModule {
  /**
   * Create bioluminescence pattern
   * @param type - Pattern type
   * @param parameters - Pattern parameters
   * @returns Pattern texture and animation data
   */
  createPattern(
    type: BioluminescencePatternType,
    parameters: BioluminescenceParameters
  ): Promise<BioluminescencePattern>;

  /**
   * Update pattern animation
   * @param pattern - Pattern to update
   * @param time - Current animation time
   * @param deltaTime - Time since last frame
   */
  updatePattern(
    pattern: BioluminescencePattern,
    time: number,
    deltaTime: number
  ): void;
}

type BioluminescencePatternType =
  | 'point_source'      // Individual photocytes
  | 'diffuse_glow'      // Scattered emission
  | 'linear_pattern'    // Lines, canals
  | 'wave_propagation'  // Traveling waves
  | 'spiral_vortex'     // Rotating spiral
  | 'edge_glow';        // Fresnel-based
```

#### Animation System Interface

```typescript
/**
 * Animation module interface
 * All animation systems must implement this contract
 */
interface IAnimationModule {
  /**
   * Initialize animation for creature
   * @param geometry - Creature geometry to animate
   * @param spec - Animation specification
   * @returns Animation controller
   */
  initialize(
    geometry: GeneratedGeometry,
    spec: AnimationSpec
  ): Promise<AnimationController>;

  /**
   * Update animation state
   * @param controller - Animation controller
   * @param deltaTime - Time since last frame
   * @param time - Total elapsed time
   */
  update(
    controller: AnimationController,
    deltaTime: number,
    time: number
  ): void;
}

/**
 * Bell pulsing animation specification
 */
interface BellPulsingSpec {
  readonly frequency: number;          // Hz, 0.1-5.0
  readonly amplitude: number;          // 0-1, fraction of bell diameter
  readonly wavePattern: WavePattern;
  readonly phaseOffset: number;        // Radians
  readonly contractionDuration: number; // 0-1, fraction of cycle
}

type WavePattern =
  | 'radial'      // Outward from center
  | 'spiral'      // Rotating spiral
  | 'random';     // Chaotic pattern
```

#### Physics System Interface

```typescript
/**
 * Physics module interface
 * All physics systems must implement this contract
 */
interface IPhysicsModule {
  /**
   * Initialize physics simulation
   * @param geometry - Creature geometry
   * @param spec - Physics specification
   * @returns Physics body
   */
  initialize(
    geometry: GeneratedGeometry,
    spec: PhysicsSpec
  ): Promise<PhysicsBody>;

  /**
   * Step physics simulation
   * @param body - Physics body to update
   * @param deltaTime - Time since last step
   */
  step(body: PhysicsBody, deltaTime: number): void;

  /**
   * Apply environmental forces
   * @param body - Physics body
   * @param forces - Environmental forces
   */
  applyForces(
    body: PhysicsBody,
    forces: EnvironmentalForces
  ): void;
}

/**
 * Physics specification
 */
interface PhysicsSpec {
  // Integration method
  readonly integration: IntegrationMethod;
  readonly substeps: number;           // Physics steps per frame

  // Constraints
  readonly constraints: ConstraintSpec[];

  // Collision
  readonly collisionEnabled: boolean;
  readonly collisionRadius: number;
}

type IntegrationMethod =
  | 'verlet'      // Stable for chains
  | 'euler'       // Simple but unstable
  | 'runge-kutta'; // High precision
```

### Module Composition Rules

#### Rule 1: Dependency Ordering
```
Base Shape (no dependencies)
  ↓
Attachment Points (depends on Base Shape)
  ↓
Tentacles/Arms (depends on Attachment Points)
  ↓
Surface Features (depends on Base Shape, Tentacles)
  ↓
Material Attributes (depends on final Geometry)
  ↓
Animation Setup (depends on Materials)
  ↓
Optimization (depends on everything)
```

#### Rule 2: Parallel Generation
These module groups can be generated in parallel:
- Multiple independent Base Shapes
- Separate Tentacle Clusters
- Independent Surface Features
- Different Material Attribute Channels

These must be sequential:
- Attachment Points (need Base Shape)
- Tentacles (need Attachment Points)
- Materials (need final Geometry)

#### Rule 3: Version Compatibility
```typescript
interface ModuleVersion {
  major: number;  // Breaking changes
  minor: number;  // New features, backward compatible
  patch: number;  // Bug fixes
}

// Compatibility rules:
// - Same major: Compatible
// - Different major: Incompatible, requires migration
// - Module major > Core major: May not work
// - Module major < Core major: Should work with fallback
```

---

## 4. TECHNICAL_TRADEOFFS.md

### Architecture Decision Records (ADR)

#### ADR-001: Subdivision Surfaces vs. Parametric Surfaces

**Context:** Need to generate organic bell shapes for jellyfish creatures.

**Decision:** Use **Parametric Surfaces** (mathematical functions) instead of subdivision surfaces.

**Rationale:**
- **Pros:**
  - Direct control over vertex count (predictable performance)
  - Easier to animate (modify parameters, not mesh topology)
  - Smaller memory footprint (store parameters, not control points)
  - Better for generative variety (continuous parameter space)
  - WebGPU-friendly (can generate in compute shader)
- **Cons:**
  - Limited to mathematically describable shapes
  - Harder to create arbitrary organic forms
  - Requires mathematical expertise

**Alternatives Considered:**
1. **Subdivision Surfaces** (Catmull-Clark)
   - Pros: Arbitrary organic shapes, artist-friendly
   - Cons: Unpredictable vertex counts, harder to animate, larger memory

2. **Metaballs**
   - Pros: Very organic blob merging
   - Cons: Expensive to compute, hard to control precisely

**Implementation:**
```typescript
// Parametric bell function
function bellGeometry(
  radius: number,
  height: number,
  segments: number,
  deformation: BellDeformation
): GeneratedGeometry {
  // Generate vertices from mathematical function
  const vertices = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    for (let j = 0; j <= segments; j++) {
      const phi = (j / segments) * Math.PI / 2;

      // Parametric equation with deformation
      const r = radius * (1 - deformation.curve * Math.sin(phi));
      const y = height * Math.cos(phi);
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      vertices.push(x, y, z);
    }
  }
  // ... generate indices, normals, etc.
}
```

**Status:** Accepted
**Consequences:**
- Geometry system built around parametric equations
- All bell shapes use mathematical functions
- Artists work with parameters, not control points
- Performance is predictable and optimal

---

#### ADR-002: Verlet Integration vs. Euler Integration

**Context:** Need physics simulation for tentacle chains.

**Decision:** Use **Verlet Integration** for all chain-based physics.

**Rationale:**
- **Pros:**
  - Numerically stable (no energy drift)
  - Simple constraint solving
  - Easy to implement
  - Good performance
  - Symplectic (preserves phase space volume)
- **Cons:**
  - Velocity is implicit (harder to get velocity-dependent forces)
  - Less precise than higher-order methods
  - Fixed time step recommended

**Alternatives Considered:**
1. **Euler Integration**
   - Pros: Simple, velocity explicit
   - Cons: Unstable, energy drift, poor for chains

2. **Runge-Kutta 4**
   - Pros: High precision, stable
   - Cons: Complex, expensive (4 evaluations per step)

**Implementation:**
```typescript
// Verlet integration for tentacle chain
function verletStep(
  positions: Vector3[],
  previousPositions: Vector3[],
  constraints: Constraint[],
  deltaTime: number
): void {
  // 1. Update positions (Verlet integration)
  for (let i = 0; i < positions.length; i++) {
    const velocity = positions[i].clone()
      .sub(previousPositions[i]);
    const temp = positions[i].clone();

    // Apply forces
    positions[i].add(velocity);
    positions[i].add(gravity.multiply(deltaTime * deltaTime));

    previousPositions[i] = temp;
  }

  // 2. Solve constraints (iterative relaxation)
  for (let iter = 0; iter < constraintIterations; iter++) {
    for (const constraint of constraints) {
      constraint.solve(positions);
    }
  }
}
```

**Status:** Accepted
**Consequences:**
- All tentacle physics uses Verlet integration
- Chains are stable even with many segments
- Performance is good with iterative constraint solving
- Artists adjust stiffness and damping, not solver parameters

---

#### ADR-003: Compute Shaders vs. Vertex Shaders for Animation

**Context:** Need to animate thousands of creatures with complex deformations.

**Decision:** Use **Compute Shaders** for heavy animation, **Vertex Shaders** for simple deformation.

**Rationale:**
- **Compute Shaders:**
  - Pros: Full access to all vertices, can do complex physics, can share data between vertices
  - Cons: More complex setup, requires read-back for some operations
- **Vertex Shaders:**
  - Pros: Simple, no extra pass, GPU-friendly
  - Cons: Limited per-vertex processing, no inter-vertex communication

**Hybrid Approach:**
- **Simple pulsing:** Vertex shader (bell scaling, undulation)
- **Complex physics:** Compute shader (tentacle chains, soft body)
- **Particles:** Compute shader (always)

**Implementation:**
```typescript
// Vertex shader for simple bell pulsing
// bell-pulsing.wgsl
@vertex
fn bellPulsing(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @builtin(vertex_index) vertexIndex: u32,

  // Uniforms
  @group(0) @binding(0) uniforms: BellPulsingUniforms
) -> VertexOutput {
  // Calculate pulse intensity
  let pulse = sin(uniforms.time * uniforms.frequency) * 0.5 + 0.5;
  let intensity = pulse * uniforms.amplitude;

  // Apply radial displacement
  let direction = normalize(position);
  let displaced = position * (1.0 + intensity * direction.y);

  // Output
  var output: VertexOutput;
  output.position = uniforms.mvp * vec4<f32>(displaced, 1.0);
  output.normal = normal;
  output.uv = uv;
  return output;
}

// Compute shader for tentacle physics
// tentacle-physics.wgsl
@compute @workgroup_size(256)
fn tentaclePhysics(
  @builtin(global_invocation_id) id: vec3<u32>,

  // Storage buffers
  @group(0) @binding(0) positions: StorageTexture<rgba32float>,
  @group(0) @binding(1) previousPositions: StorageTexture<rgba32float>,
  @group(0) @binding(2) constraints: StorageTexture<rgba32float>
) {
  let index = id.x;
  if (index >= uniforms.segmentCount) { return; }

  // Verlet integration
  // ... complex physics here
}
```

**Status:** Accepted
**Consequences:**
- Simple animations use vertex shaders (performance)
- Complex physics use compute shaders (capability)
- Artists don't need to know which is used
- System automatically selects appropriate method

---

#### ADR-004: Instanced Rendering vs. Individual Draw Calls

**Context:** Need to render 100+ creatures at 60 FPS.

**Decision:** Use **Instanced Rendering** for identical creatures, **Individual Draw Calls** for unique creatures.

**Rationale:**
- **Instanced Rendering:**
  - Pros: One draw call for many creatures, very fast
  - Cons: All instances must have same geometry (can vary transforms and materials)
- **Individual Draw Calls:**
  - Pros: Each creature can be unique
  - Cons: One draw call per creature (slower)

**Hybrid Approach:**
- Group identical creatures by archetype
- Use instancing for groups of 10+ same creatures
- Use individual draws for unique or rare creatures

**Implementation:**
```typescript
// Rendering pipeline
function renderCreatures(
  creatures: Creature[],
  device: GPUDevice
): void {
  // Group by archetype
  const groups = groupBy(creatures, c => c.archetype);

  for (const [archetype, group] of groups) {
    if (group.length >= 10) {
      // Use instanced rendering
      renderInstanced(group, device);
    } else {
      // Use individual draw calls
      for (const creature of group) {
        renderIndividual(creature, device);
      }
    }
  }
}
```

**Status:** Accepted
**Consequences:**
- Performance scales with creature uniqueness
- 100 unique creatures: ~100 draw calls (acceptable)
- 1000 creatures with 10 archetypes: ~10 draw calls (excellent)
- Artists should reuse archetypes for performance

---

#### ADR-005: Procedural Generation vs. Preset Library

**Context:** Need to balance variety with ease of use.

**Decision:** **Both** - Procedural generation for variety, preset library for accessibility.

**Rationale:**
- **Procedural Generation:**
  - Pros: Infinite variety, small file size, exploration
  - Cons: Can generate bad results, requires tweaking
- **Preset Library:**
  - Pros: Curated quality, easy to use, predictable
  - Cons: Limited variety, larger file size

**Hybrid Approach:**
- 100+ curated presets for quick access
- Procedural generation for exploration
- "Generate Similar" button from presets

**Implementation:**
```typescript
interface CreatureGeneration {
  // Preset library
  presets: CreaturePreset[];  // 100+ curated creatures

  // Procedural generation
  generate(spec: Partial<CreatureSpec>): Creature;
  generateSimilar(preset: CreaturePreset, variance: number): Creature;
  random(): Creature;
  breed(parent1: Creature, parent2: Creature): Creature;
}

// Artist workflow
// 1. Start with preset (known good)
// 2. Adjust parameters (fine-tune)
// 3. Generate similar (explore variants)
// 4. Save as new preset (build library)
```

**Status:** Accepted
**Consequences:**
- Beginners use presets (accessible)
- Advanced users use procedural generation (powerful)
- System supports both workflows
- Library grows over time (user-generated content)

---

### Performance Budget Allocation

#### Target: 60 FPS with 100 creatures

**Frame Time Budget:** 16.67ms (60 FPS)

| System | Budget | Percentage |
|--------|--------|------------|
| Geometry Generation | 2.0ms | 12% |
| Physics Simulation | 3.0ms | 18% |
| Animation Update | 1.0ms | 6% |
| Vertex Shading | 2.0ms | 12% |
| Fragment Shading | 4.0ms | 24% |
| Post-Processing | 2.5ms | 15% |
| Overhead | 2.17ms | 13% |
| **Total** | **16.67ms** | **100%** |

#### Quality Tiers

| Tier | Creatures | Particles | Post-Processing | Target Hardware |
|------|-----------|-----------|-----------------|-----------------|
| Potato | 20 | 100 | Low | Integrated GPU, < 2GB RAM |
| Low | 50 | 500 | Medium | Discrete GPU, 4GB RAM |
| Medium | 100 | 2000 | High | Mid-range GPU, 8GB RAM |
| High | 200 | 5000 | Ultra | High-end GPU, 16GB RAM |
| Ultra | 500+ | 20000 | Ultra + Extra | Top-tier GPU, 32GB RAM |

---

## 5. BRAINSTORMING_HIGHLIGHTS.md

### Best Ideas from Transcripts

#### Forms Brainstorming (225 ideas)

**High-Impact Ideas (Preserve for Future):**

1. **Cross-Plan Parameter System** (Idea #397)
   - **Source:** Forms synthesis, gap analysis
   - **Concept:** Allow mixing features across body plans (e.g., tentacles on Comb Jellies)
   - **Value:** Breaks rigidity of body plan system, enables hybrid creatures
   - **Implementation:** Phase 2, after core body plans stable

2. **Allometric Scaling Rules** (Idea #98)
   - **Source:** Forms elicitation, stakeholder round table
   - **Concept:** Proportions change non-linearly with size (larger ≠ simply scaled)
   - **Value:** Creates biological authenticity, prevents uncanny valley
   - **Implementation:** Phase 3, parameter coupling system

3. **Imperfection Injection** (Idea #97)
   - **Source:** Forms elicitation, stakeholder round table
   - **Concept:** Add subtle asymmetry and irregularity to avoid artificial appearance
   - **Value:** Essential for visual authenticity
   - **Implementation:** Phase 1, base geometry generation

4. **Silhouette Variety Focus** (Idea #103)
   - **Source:** Forms elicitation, stakeholder round table
   - **Concept:** Visual distinction matters more than internal detail
   - **Value:** Guides LOD priorities, emphasizes recognizable shapes
   - **Implementation:** Phase 1, creature archetypes

**Underdeveloped but Promising:**

5. **Temporal Forms** (Ideas #241-250)
   - **Concept:** Forms that change with behavior, life cycle, environment
   - **Examples:** Growth progression, regeneration, metamorphosis, seasonal changes
   - **Value:** Adds narrative dimension, dynamic visual interest
   - **Implementation:** Phase 3, animation system extension

6. **Environmental Interaction Forms** (Ideas #251-260)
   - **Concept:** Forms adapted to specific environmental conditions
   - **Examples:** Current-influenced shapes, predator-response geometry
   - **Value:** Creates ecosystem coherence, storytelling opportunities
   - **Implementation:** Phase 4, advanced parameter coupling

#### Geometry Brainstorming (330 ideas)

**High-Impact Ideas (Preserve for Future):**

1. **Modular Component System** (Ideas #141-150)
   - **Source:** Geometry brainstorming, domain 12
   - **Concept:** Interchangeable bells, tentacle packs, oral arm assemblies
   - **Value:** Enables combinatorial explosion, artist-friendly workflow
   - **Implementation:** Phase 1, core architecture

2. **Procedural Generation Algorithms** (Ideas #81-90)
   - **Source:** Geometry brainstorming, domain 6
   - **Concept:** L-systems, marching cubes, metaballs, Voronoi, reaction-diffusion
   - **Value:** Generates organic complexity impossible manually
   - **Implementation:** Phase 3, advanced geometry

3. **Animation-Ready Topology** (Ideas #121-130)
   - **Source:** Geometry brainstorming, domain 10
   - **Concept:** Edge flow management, skinning weights, morph targets
   - **Value:** Critical for natural movement, prevents animation nightmares
   - **Implementation:** Phase 1, base topology design

4. **WebGPU-Specific Optimization** (Ideas #101-110)
   - **Source:** Geometry brainstorming, domain 8
   - **Concept:** Storage buffers, compute passes, bindless textures
   - **Value:** Essential for performance at scale
   - **Implementation:** Phase 1, buffer architecture

**Underdeveloped but Promising:**

5. **Bioluminescence Geometry** (Ideas #201-210)
   - **Concept:** Geometry specifically for light emission
   - **Examples:** Point light arrays, line emission, volume emission
   - **Value:** Tight coupling between form and light creates stunning effects
   - **Implementation:** Phase 2, bioluminescence system

6. **Organic Simulation Geometry** (Ideas #191-200)
   - **Concept:** Forms that respond to growth, erosion, fluid dynamics
   - **Examples:** Growth simulation, fluid influence, collision response
   - **Value:** Creates living, breathing creatures
   - **Implementation:** Phase 4, advanced simulation

#### Effects Brainstorming (210 ideas)

**High-Impact Ideas (Preserve for Future):**

1. **Point-Cloud Photophores** (Idea #1)
   - **Source:** Effects brainstorming, section 1
   - **Concept:** Individual light-emitting cells scattered across surface
   - **Value:** Creates magical sparkle effect, scientifically authentic
   - **Implementation:** Phase 2, bioluminescence particles

2. **Marine Snow** (Idea #13)
   - **Source:** Effects brainstorming, section 2
   - **Concept:** Slow-descending organic debris particles
   - **Value:** Essential underwater atmosphere, depth perception
   - **Implementation:** Phase 1, environmental particles

3. **Fresnel Rim Lighting** (Idea #141)
   - **Source:** Effects brainstorming, section 6
   - **Concept:** Edge enhancement for translucent creatures
   - **Value:** Makes creatures pop against dark background
   - **Implementation:** Phase 1, base material shader

4. **Adaptive Gaussian Bloom** (Idea #20)
   - **Source:** Effects brainstorming, top 20 list
   - **Concept:** Quality-tiered bloom for performance scaling
   - **Value:** Essential for bioluminescence, performance-critical
   - **Implementation:** Phase 1, post-processing pipeline

**Underdeveloped but Promising:**

5. **Vortex Ring Particles** (Idea #27)
   - **Concept:** Toroidal flow patterns from jet propulsion
   - **Value:** Visually stunning, scientifically accurate propulsion visualization
   - **Implementation:** Phase 3, advanced particles

6. **Temporal Effects** (Ideas #97-108)
   - **Concept:** Motion blur, afterimage, time-lapse effects
   - **Value:** Adds cinematic quality, emphasizes movement
   - **Implementation:** Phase 4, advanced post-processing

#### Physics Brainstorming (210 ideas)

**High-Impact Ideas (Preserve for Future):**

1. **Verlet Integration** (Idea #61)
   - **Source:** Physics brainstorming, section 3
   - **Concept:** Stable integration for particle chains
   - **Value:** Essential for tentacle physics, prevents explosion
   - **Implementation:** Phase 1, physics foundation

2. **Perlin Noise Flow Fields** (Idea #69)
   - **Source:** Physics brainstorming, section 3
   - **Concept:** Natural-looking turbulence for water movement
   - **Value:** Creates organic underwater feel
   - **Implementation:** Phase 2, environmental forces

3. **Steering Behaviors** (Idea #94)
   - **Source:** Physics brainstorming, section 3
   - **Concept:** Seek, flee, wander, arrive, pursue, evade
   - **Value:** Creates intelligent creature movement
   - **Implementation:** Phase 3, creature AI

4. **Soft Body Volume Conservation** (Idea #66)
   - **Source:** Physics brainstorming, section 3
   - **Concept:** Maintaining creature volume under deformation
   - **Value:** Prevents unrealistic collapse, adds weight
   - **Implementation:** Phase 3, advanced physics

**Underdeveloped but Promising:**

5. **Tentacle Dynamics Deep Dive** (Ideas #151-180)
   - **Concept:** Comprehensive physics for passive and active tentacle behaviors
   - **Examples:** Gravity sagging, drag streaming, targeted reaching, rippling
   - **Value:** Rich variety of tentacle behaviors, essential for realism
   - **Implementation:** Phase 2-4, iterative enhancement

6. **Movement Rhythms & Timing** (Ideas #181-200)
   - **Concept:** Pulse patterns, wave patterns, temporal coordination
   - **Examples:** Accelerando, burst patterns, metachronal waves
   - **Value:** Creates hypnotic, organic movement quality
   - **Implementation:** Phase 2, animation timing system

#### Bioluminescence Brainstorming (150 ideas)

**High-Impact Ideas (Preserve for Future):**

1. **Spiral Vortex Pattern** (Idea #27)
   - **Source:** Bioluminescence brainstorming, section 2
   - **Concept:** Rotating spiral light pattern (Atolla jellyfish)
   - **Value:** Visually stunning, iconic deep-sea behavior
   - **Implementation:** Phase 2, advanced patterns

2. **Comb Row Rainbow Diffraction** (Idea #177)
   - **Source:** Bioluminescence brainstorming, species patterns
   - **Concept:** Iridescent wave propagation along comb rows
   - **Value:** Technically impressive, beautiful visual
   - **Implementation:** Phase 2, iridescence shader

3. **Depth-Based Color Temperature** (Idea #126)
   - **Source:** Bioluminescence brainstorming, section 3
   - **Concept:** Color shifts with ocean depth (6500K → 4000K)
   - **Value:** Scientific authenticity, visual coherence
   - **Implementation:** Phase 1, color grading system

4. **Luciferin-Luciferase Kinetics** (Synthesis section 4)
   - **Source:** Bioluminescence synthesis, chemical mechanisms
   - **Concept:** Exponential decay, millisecond onset
   - **Value:** Biologically authentic glow behavior
   - **Implementation:** Phase 2, animation timing

**Underdeveloped but Promising:**

5. **Quantum Superposition Ideas** (Brainstorming section)
   - **Concept:** Schrödinger's glow, entangled pairs, wave function collapse
   - **Value:** Avant-garde artistic possibilities, experimental
   - **Implementation:** Phase 5, experimental features

6. **Social Bioluminescence** (Ideas #386-397)
   - **Concept:** Swarm synchronization, mass spawning, competitive displays
   - **Value:** Creates group behaviors, narrative possibilities
   - **Implementation:** Phase 4, multi-creature coordination

### Cross-Cutting Themes

**Recurring Ideas Across Domains:**

1. **Modularity > Monoliths**
   - Every domain emphasizes component-based architecture
   - Enables combinatorial variety
   - Supports iterative development

2. **Performance First**
   - Every brainstorming session included optimization ideas
   - LOD, instancing, compute shaders recur across domains
   - 60 FPS target is non-negotiable

3. **Biological Authenticity**
   - Real deep-sea creatures inspire all ideas
   - Scientific accuracy enhances artistic impact
   - "Uncanny valley" is a real risk

4. **Artist Workflow**
   - Parameters > Hardcoded values
   - Visual feedback > Code
   - Exploration > Manual placement

5. **Generative Variety**
   - Combinatorial systems > Hand-authored content
   - Procedural generation > Fixed library
   - Parameter space > Individual specimens

### Ideas to Fast-Track

**Implement in Phase 1 (Weeks 1-2):**

1. **Parametric Bell Shapes** (Geometry)
   - Foundation for all creatures
   - Enormous combinatorial value
   - Technically straightforward

2. **Verlet Tentacle Chains** (Physics)
   - Stable, proven approach
   - Essential for creature movement
   - Enables many variations

3. **Fresnel Rim Lighting** (Effects)
   - High visual impact, low cost
   - Makes creatures pop
   - Essential for underwater feel

4. **Point-Source Bioluminescence** (Bioluminescence)
   - Simple particle system
   - Magical sparkle effect
   - Scientifically authentic

**Implement in Phase 2 (Weeks 3-4):**

5. **Modular Component System** (Geometry)
   - Artist-friendly workflow
   - Combinatorial explosion
   - Enables rapid iteration

6. **Iridescence Shader** (Effects/Bioluminescence)
   - Technically impressive
   - Comb jelly signature effect
   - High visual impact

7. **Marine Snow Particles** (Effects)
   - Essential atmosphere
   - Depth perception
   - Performance-friendly

**Defer to Phase 3+ (Weeks 5+):**

8. **Soft Body Physics** (Physics)
   - High complexity
   - Performance concerns
   - Polish feature

9. **Quantum Effects** (Bioluminescence)
   - Experimental
   - Niche appeal
   - High risk

10. **Social Behaviors** (All domains)
    - Multi-creature coordination
    - Complex interactions
    - Advanced feature

### Ideas to Preserve for Future

**Keep for Phase 2 (Post-MVP):**

1. **Cross-Plan Parameter System** (Forms)
2. **Temporal Forms** (Forms)
3. **Environmental Interaction Forms** (Forms)
4. **Organic Simulation Geometry** (Geometry)
5. **Vortex Ring Particles** (Effects)
6. **Temporal Effects** (Effects)
7. **Soft Body Volume Conservation** (Physics)
8. **Social Bioluminescence** (Bioluminescence)

**Keep for Experimental Phase (Phase 5+):**

1. **Quantum Superposition Ideas** (Bioluminescence)
2. **Consciousness Expression Patterns** (Bioluminescence)
3. **Alternative Physics Simulations** (Physics)
4. **Schrödinger's Glow** (Bioluminescence)

---

## CONCLUSION

This strategic review synthesizes **1000+ ideas** from Stage 1 into a coherent roadmap for Stage 2 implementation.

### Key Decisions Summary

1. **MVP Creatures:** Medusozoa, Comb Jelly, Siphonophore (Tier 1)
2. **Feature Priority:** Geometry extensions → Shader patterns → Color systems
3. **Technical Architecture:** Modular composition with parametric surfaces and Verlet physics
4. **Performance Target:** 60 FPS with 100 creatures on mid-range hardware
5. **Implementation Timeline:** 10 weeks across 5 phases

### Risk Mitigation

- **Uncanny Valley:** Imperfection injection, allometric scaling (Phase 1)
- **Performance Meltdown:** LOD system, adaptive quality, compute shaders (Phase 1)
- **Animation Nightmare:** Animation-ready topology, skinning weights (Phase 1)
- **Monotonous Ocean:** Broad parameter ranges, distinct archetypes (Phase 1)

### Success Metrics

- **Visual Variety:** 1000+ unique creatures
- **Performance:** 60 FPS with 100 creatures (Medium tier)
- **Biological Coverage:** 95% of observed deep-sea forms
- **Artist Workflow:** Generate creature in < 10 seconds
- **User Engagement:** Average session > 10 minutes

---

**Stage 1.5 Status:** COMPLETE
**Stage 2 Ready:** YES
**Next Steps:** Begin implementation with Phase 1: Foundation

---

**Document:** Stage 1.5 BMad Strategic Review
**Date:** 2026-02-08
**Team:** PM + Architect Party Mode
**Project:** Abyssal Genesis - Epic Jellyfish WebGPU
**Location:** /mnt/c/Users/mehul/gt-hq/epic_jelly_webgpu/crew/mehul/apps/jellyfish-webgpu/design/stage1.5-bmad-decisions.md
