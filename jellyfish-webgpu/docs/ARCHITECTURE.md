# jellyfish-webgpu Architecture Document

> **BMad Planning Foundation** - Technical architecture and system design

**Created**: 2025-02-08
**Project**: jellyfish-webgpu
**Status**: Current Architecture

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Browser                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Vite Dev Server                          │ │
│  │  - Hot Module Replacement                                 │ │
│  │  - TypeScript Compilation                                  │ │
│  │  - Source Maps                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Main Application                            │ │
│  │  (JellyfishMaterialTestScene)                              │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              InterpolationSystem                       │ │ │
│  │  │  - 30fps physics → 60fps rendering                   │ │ │
│  │  │  - Fixed timestep accumulator                          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                           │                                 │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              JellyfishSystem                          │ │ │
│  │  │  - Manages particle physics                           │ │ │
│  │  │  - Generates geometry                                  │ │ │
│  │  │  - Creates meshes                                     │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                           │                                 │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │           Materials (5 TSL Node Materials)             │ │ │
│  │  │  - Bulb, Tentacles, Tail, Gel, Dust                   │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                           │                                 │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              Post-Processing                          │ │ │
│  │  │  - Bloom, Lens Dirt, Vignette                         │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Three.js WebGPU                           │ │
│  │  - Renderer, Scene, Camera                                 │ │
│  │  - TSL (Three Shading Language)                           │ │
│  │  - Node-based materials                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Browser WebGPU                            │ │
│  │  - GPU compute + rendering                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Framework
- **Three.js v0.180.0**: 3D graphics library
- **WebGPU**: Modern GPU API (with WebGL fallback)
- **TSL**: Three Shading Language for node materials

### Physics Engine
- **particulate.js v0.3.1**: Soft-body particle physics
- **Verlet Integration**: Position-based dynamics
- **Constraints**: Distance, angle, pin constraints

### Build Tools
- **Vite v5.0.0**: Fast dev server and bundler
- **TypeScript v5.3.0**: Type-safe JavaScript
- **Vitest v1.0.0**: Unit testing framework

### Development Tools
- **Tweakpane v4.0.3**: Live parameter editing
- **ESLint**: (not configured) - Linting
- **Prettier**: (not configured) - Code formatting

---

## Component Architecture

### Core Systems

#### 1. InterpolationSystem
**Location**: `src/systems/physics-bridge/InterpolationSystem.ts`

**Purpose**: Bridges fixed-rate physics to variable-rate rendering

**Key Features**:
- Fixed 30fps physics timestep (33.33ms)
- Accumulator-based interpolation
- Smooth 60fps+ rendering
- Spiral-of-death prevention

**Interface**:
```typescript
update(deltaTime: number, physicsCallback: Function): number
// Returns: interpolation factor (0.0 - 1.0)
```

#### 2. JellyfishSystem
**Location**: `src/jellyfish/JellyfishSystem.ts`

**Purpose**: Main integration class for jellyfish simulation

**Responsibilities**:
- Creates JellyfishGeometryData
- Instantiates meshes with materials
- Updates physics simulation
- Manages animation state
- Handles user interaction (nudge)

**Key Methods**:
```typescript
updatePhysics(delta: number): void
setStepProgress(progress: number): void
nudge(direction: Vector3, magnitude: number): void
moveTo(x, y, z): void
```

#### 3. JellyfishGeometry
**Location**: `src/jellyfish/JellyfishGeometry.ts`

**Purpose**: Procedural geometry generation

**Generates**:
- Vertex positions and normals
- Face indices for bulb, tail, mouth
- Link indices for constraint lines
- Tentacle line segments
- Inner constraint lines

**Configuration**:
```typescript
segmentsCount: number
totalSegments: number
ribsCount: number
ribRadius: number
tentacleSegments: number
```

#### 4. Material System
**Location**: `src/jellyfish/materials/`

**Materials**:
1. **BulbNodeMaterial**: Procedural pattern with bioluminescent glow
2. **TentacleNodeMaterial**: Distance-based glow fade
3. **TailNodeMaterial**: Pattern variation with gradient
4. **GelNodeMaterial**: Rim lighting overlay
5. **DustNodeMaterial**: Animated atmospheric particles

**Common Features**:
- Physics interpolation (stepProgress uniform)
- TSL node-based shaders
- Dynamic parameter updates
- WebGPU/WebGL compatibility

---

## Data Flow

### Initialization Flow

```
1. init() called
   ↓
2. Create InterpolationSystem
   ↓
3. Create JellyfishSystem
   ├─ Generate geometry (JellyfishGeometry)
   ├─ Create particle system (particulate.js)
   ├─ Create meshes with materials
   └─ Set up material interpolation
   ↓
4. Initialize scene (camera, renderer)
   ↓
5. Start animation loop
```

### Render Loop Flow

```
requestAnimationFrame()
   ↓
calculate delta time
   ↓
InterpolationSystem.update(delta, physicsCallback)
   ├─ Accumulate time
   ├─ Run physics steps at 30fps
   └─ Return interpolation factor (0.0 - 1.0)
   ↓
For each interpolated material:
   material.setStepProgress(factor)
   ↓
JellyfishSystem.updatePhysics(delta)
   ├─ Update animation time
   ├─ Tick particle physics
   └─ Mark position buffers for update
   ↓
Render scene
   ↓
Post-processing (bloom, lens dirt, vignette)
   ↓
Update UI (FPS counter, step progress)
```

---

## Physics Architecture

### Particle System

**Library**: particulate.js v0.3.1

**Configuration**:
- ~2000 particles
- Soft-body constraints (distance, angle)
- Pin constraints (5 anchor points)
- Verlet integration

**Particle Types**:
1. **Top Pin**: Bell top anchor
2. **Mid Pin**: Middle anchor
3. **Bottom Pin**: Bell bottom anchor
4. **Tail Pin**: Tail section anchor
5. **Tentacle Pin**: Tentacle base anchor
6. **Dynamic Particles**: Soft-body simulation particles

**Constraints**:
- Distance constraints (structural integrity)
- Angle constraints (bending resistance)
- Pin constraints (anchoring)

---

## Material System Architecture

### TSL Material Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                   Uniform Inputs                             │
│  - position: vec3f (current vertex position)               │
│  - positionPrev: vec3f (previous physics frame)            │
│  - stepProgress: float (0.0 = prev, 1.0 = current)       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   TSL Node Graph                            │
│  - Calculate interpolated position                         │
│  - Apply material-specific effects                         │
│  - Generate final color/opacity                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Output Color                             │
│  - vec4f(r, g, b, a)                                       │
└─────────────────────────────────────────────────────────────┘
```

### Material Examples

#### BulbNodeMaterial
- Procedural pattern generation
- Bioluminescent glow
- Rim lighting boost

#### TentacleNodeMaterial
- Distance-based fade
- Emissive glow
- Transparency gradient

---

## Performance Architecture

### Optimization Strategies

1. **Physics Decoupling**
   - Fixed 30fps physics
   - Interpolated 60fps+ rendering
   - Reduces CPU load

2. **Buffer Updates**
   - Only update position/positionPrev attributes
   - Mark needsUpdate = true after physics tick
   - GPU handles vertex displacement

3. **Material Updates**
   - Single uniform update (stepProgress)
   - All materials synchronized
   - No per-frame texture updates

4. **Post-Processing**
   - Single pass bloom
   - Lens dirt texture lookup
   - Vignette fragment shader

### Performance Bottlenecks

| Area | Current State | Optimization Potential |
|------|--------------|----------------------|
| **Bundle Size** | 1.3MB | HIGH - Code splitting needed |
| **Particle Count** | ~2000 | MEDIUM - Configurable |
| **Draw Calls** | Multiple | LOW - Already optimized |
| **Material Complexity** | 5 TSL materials | MEDIUM - Simplify if needed |

---

## Build Architecture

### Vite Configuration

**Build Pipeline**:
1. TypeScript compilation (esbuild)
2. Module bundling (Rollup)
3. Asset optimization
4. Source map generation
5. Output to `dist/`

**Output**:
- `dist/index.html` (0.47 kB)
- `dist/index.js` (1.3 MB) ⚠️

### Code-Splitting Opportunities

```javascript
// Dynamic imports recommended
const JellyfishMaterialTest = lazy(() => import('./scenes/JellyfishMaterialTest'))
const CreatureFactory = lazy(() => import('./jellyfish/creatures/CreatureFactory'))
const PostProcessing = lazy(() => import('./post-processing'))
```

---

## Testing Architecture

### Current State
- **Framework**: Vitest v1.0.0
- **Status**: Configured but not executable (WSL issue)
- **Test Files**: None found in src/

### Recommended Test Structure

```
src/
├── jellyfish/
│   ├── JellyfishSystem.ts
│   └── JellyfishSystem.test.ts     ← Add this
├── systems/
│   └── physics-bridge/
│       ├── InterpolationSystem.ts
│       └── InterpolationSystem.test.ts  ← Already exists!
└── materials/
    ├── BulbNodeMaterial.ts
    └── BulbNodeMaterial.test.ts      ← Add this
```

### Test Categories Needed

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: System interaction testing
3. **Visual Tests**: Screenshot/regression testing
4. **Performance Tests**: FPS and bundle size benchmarks

---

## Deployment Architecture

### Current State
- No deployment configured
- No CI/CD pipeline
- No hosting set up

### Recommended Deployment Options

#### Option 1: GitHub Pages
- Free hosting
- Easy setup
- Good for portfolios

#### Option 2: Netlify/Vercel
- Free tier available
- Automatic deployments
- CDN included

#### Option 3: fxhash
- Creative coding platform
- NFT/art focused
- Already configured in scripts

---

## Security Considerations

### Current Security Posture

| Aspect | Status | Notes |
|--------|--------|-------|
| **Input Validation** | N/A | No user input currently |
| **XSS Prevention** | Low Risk | No dynamic HTML |
| **Dependency Vulnerabilities** | ⚠️ Check | 46 vulnerabilities in npm audit |
| **HTTPS** | N/A | Not deployed |

---

## Extension Points

### Easy to Add

1. **New Materials**: Copy existing material, modify TSL
2. **New Creatures**: Add to ARCHETYPES in creatures/presets.ts
3. **New Scenes**: Create new scene class
4. **New Post-Processing**: Add effects to pipeline

### Harder to Add

1. **New Physics Behaviors**: Requires particulate.js knowledge
2. **New Geometry Types**: Modify JellyfishGeometry
3. **Performance Optimizations**: Requires profiling expertise

---

## Technical Debt

### High Priority
1. **Fix test infrastructure** (blocker for development)
2. **Reduce bundle size** (performance issue)
3. **Initialize git repository** (source control)

### Medium Priority
4. **Add documentation** (onboarding)
5. **Set up CI/CD** (automation)
6. **Add error handling** (robustness)

### Low Priority
7. **Code splitting** (optimization)
8. **Accessibility** (WCAG compliance)
9. **Internationalization** (future proofing)

---

## Dependencies Graph

```
jellyfish-webgpu
├── three (0.180.0)
│   └── @types/three
├── particulate (0.3.1)
├── tweakpane (4.0.3)
├── vite (5.0.0)
├── vitest (1.0.0)
└── typescript (5.3.0)
```

---

## Architecture Decision Records

### ADR-001: WebGPU over WebGL
**Decision**: Use WebGPU as primary renderer with WebGL fallback
**Rationale**: Future-proof, better performance, TSL support
**Consequences**: Modern browsers only, graceful degradation needed

### ADR-002: Fixed Timestep Physics
**Decision**: 30fps fixed physics with interpolation
**Rationale**: Deterministic physics, smooth rendering, reduced CPU
**Consequences**: Slight input lag acceptable for this use case

### ADR-003: TSL Node Materials
**Decision**: Use TSL node materials over custom shaders
**Rationale**: Easier to maintain, better Three.js integration
**Consequences**: WebGPU primarily, requires fallback for WebGL

---

## Next Session Architecture Tasks

Based on what you want to work on, architecture tasks could include:

1. **Fix Tests**: Set up cross-platform testing
2. **Optimize Bundle**: Implement code-splitting
3. **Add Features**: Extend materials, creatures, scenes
4. **Performance**: Profile and optimize rendering
5. **Deployment**: Set up hosting and CI/CD

---

**Document Status**: ✅ Complete
**Related**: PROJECT_CONTEXT.md
**Next**: Wait for your input on desired work

---

**Quick Commands Reference**:
```bash
npm run dev          # Start development
npm run build        # Production build
npm run typecheck    # Check types
cd ../..              # Back to rig root
```
