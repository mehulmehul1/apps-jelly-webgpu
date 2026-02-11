# jellyfish-webgpu Project Context

> **BMad Planning Foundation** - Project context and current state assessment

**Created**: 2025-02-08
**Project**: jellyfish-webgpu
**Status**: Active Development
**Version**: 0.1.0

---

## Project Overview

**jellyfish-webgpu** is a Three.js WebGPU simulation featuring soft-body jellyfish with procedural TSL (Three Shading Language) materials.

### Description
A browser-based jellyfish simulation that demonstrates advanced WebGPU graphics through:
- ~2000 particle soft-body physics simulation
- 5 custom TSL node materials (Bulb, Tentacles, Tail, Gel, Dust)
- Real-time physics interpolation (30fps physics → 60fps rendering)
- Interactive mouse nudging
- Live material editor with Tweakpane

### Tech Stack
- **Renderer**: Three.js WebGPU with TSL
- **Physics**: particulate.js (soft-body physics)
- **Language**: TypeScript
- **Build**: Vite
- **Testing**: Vitest (configured but not working)
- **UI**: Tweakpane (live editing)

---

## Current State

### ✅ What's Working

| Component | Status | Notes |
|-----------|--------|-------|
| **Build** | ✅ Passing | Builds successfully, 1.3MB bundle |
| **Development Server** | ✅ Working | `npm run dev` runs |
| **Production Build** | ✅ Working | `npm run build` creates dist/ |
| **Codebase** | ✅ Complete | 37 TypeScript files, full implementation |
| **Materials** | ✅ Complete | All 5 TSL materials implemented |
| **Physics** | ✅ Complete | Soft-body simulation working |
| **Editor** | ✅ Working | Live look editor with Tweakpane |
| **Post-Processing** | ✅ Working | Bloom, lens dirt, vignette |

### ⚠️ Known Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| **Tests not runnable** | High | Cannot run test suite (WSL binary issue) |
| **Large bundle size** | Medium | 1.3MB bundle, warning about code-splitting |
| **No git history** | Low | Fresh repo, no commits |
| **No documentation** | Medium | No README or docs for contributors |

### 🔧 Technical Debt

1. **Test Infrastructure**
   - Vitest configured but not executable in WSL
   - No test files found in src/
   - Need cross-platform test setup

2. **Build Optimization**
   - 1.3MB bundle needs code-splitting
   - ManualChunks configuration recommended
   - Consider dynamic imports

3. **Development Workflow**
   - No git repository initialized
   - No CI/CD pipeline
   - No pre-commit hooks

---

## Architecture Overview

### Project Structure

```
jellyfish-webgpu/
├── src/
│   ├── main.ts                    # Entry point - MaterialTestScene
│   ├── jellyfish/                 # Core jellyfish simulation
│   │   ├── JellyfishSystem.ts     # Main integration class
│   │   ├── JellyfishGeometry.ts   # Procedural geometry
│   │   ├── JellyfishRenderer.ts   # WebGPU renderer
│   │   ├── materials/             # TSL materials (5 files)
│   │   └── creatures/             # Creature specification system
│   ├── scenes/                    # Scene implementations
│   │   ├── JellyfishMaterialTest.ts # Main scene
│   │   └── JellyfishTest.ts       # Basic scene
│   ├── systems/physics-bridge/     # Physics-to-render interpolation
│   ├── post-processing/           # Visual effects
│   ├── editor/                    # Live editing tools
│   └── ui/                        # UI components
├── public/                        # Static assets
├── dist/                          # Build output (1.3MB)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

### Key Components

#### 1. JellyfishSystem
- **Purpose**: Main integration class
- **Responsibilities**:
  - Manages particle physics (particulate.js)
  - Generates procedural geometry
  - Creates meshes with interpolated materials
  - Handles animation loop
  - Manages user interaction (nudge)

#### 2. Materials System
- **BulbNodeMaterial**: Procedural pattern with bioluminescent glow
- **TentacleNodeMaterial**: Distance-based glow fade
- **TailNodeMaterial**: Pattern variation with gradient
- **GelNodeMaterial**: Rim lighting overlay
- **DustNodeMaterial**: Animated atmospheric particles
- **InterpolatedNodeMaterial**: Base for physics interpolation

#### 3. Physics Bridge
- **InterpolationSystem**: Fixed timestep (30fps) → smooth rendering (60fps)
- **PhysicsBridge**: Connects particulate.js to Three.js

#### 4. Creature System
- **BodyPlan**: Medusa, CombJelly, Salp, Siphonophore types
- **CreatureSpec**: Configuration for creature generation
- **Archetypes**: Pre-defined creature templates
- **Presets**: Look configurations for different styles

---

## Dependencies

### Runtime Dependencies
```json
{
  "particulate": "^0.3.1",      // Soft-body physics
  "tweakpane": "^4.0.3",         // Live editing UI
  "three": "^0.180.0"            // 3D graphics with WebGPU
}
```

### Dev Dependencies
```json
{
  "@types/three": "^0.180.0",
  "typescript": "^5.3.0",
  "vite": "^5.0.0",
  "vitest": "^1.0.0"
}
```

---

## Performance Profile

### Current Metrics
- **Bundle Size**: 1.3MB (needs optimization)
- **Particle Count**: ~2000 particles
- **Physics Rate**: 30fps (fixed timestep)
- **Target Render Rate**: 60fps+
- **Build Time**: ~5 seconds

### Performance Considerations
- WebGPU backend for hardware acceleration
- WebGL fallback for compatibility
- Physics interpolation decouples sim from render
- Material animation synchronization required

---

## Development Workflow

### Available Scripts
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run tests (not working)
npm run test:ui      # Run tests with UI
npm run typecheck    # TypeScript type checking
npm run fxhash:dev   # Build + fxhash dev server
npm run fxhash:build # Build + fxhash production
```

### Development Server
- **URL**: http://localhost:5173
- **Hot Reload**: Enabled
- **Source Maps**: Enabled

---

## Creature System

### Supported Body Plans
1. **Medusa**: Classic jellyfish with bell + tentacles
2. **CombJelly**: Ctenophore-like with lobed body
3. **Salp**: Barrel-shaped colonial tunicate
4. **Siphonophore**: Colony of multiple zooids

### Creature Customization
- **Symmetry**: Radial, bilateral, spiral
- **Cross-section**: Circle, ellipse, superformula
- **Surface features**: Frills, ridges, cells
- **Profiles**: Bulb and tail radius curves
- **Emitters**: Tentacle attachment points
- **Colony configs**: Chain, arc, helix, cluster layouts

### Available Archetypes
- `combJelly` - Comb jelly with pink/purple bioluminescence
- `salp` - Transparent barrel shape
- `siphonophore` - Colonial organism
- `anemone` - Radial symmetry with tentacles
- `glassSponge` - Angular lattice structure
- `ascidia` - Tunicate-like
- `star` - Star-shaped morphology

---

## Next Session Preparation

### Questions for Product Owner (You)

1. **Primary Goal**: What is the main objective for this project?
   - Portfolio piece?
   - Production application?
   - Learning/experimentation?
   - Creative coding artwork?

2. **Target Audience**: Who will use this?
   - Other developers?
   - General public?
   - Creative coders?
   - Art/tech community?

3. **Scope Definition**: What do you want to work on?
   - Fix technical issues (tests, bundle size)?
   - Add new features (more creatures, interactions)?
   - Improve performance?
   - Prepare for deployment/sharing?
   - Something else?

4. **Success Criteria**: How do we know when we're done?
   - Performance targets?
   - Feature checklist?
   - Deployment ready?

---

## Files Referenced

- **Source Code**: `epic_jelly_webgpu/crew/mehul/apps/jellyfish-webgpu/src/`
- **Package**: `epic_jelly_webgpu/crew/mehul/apps/jellyfish-webgpu/package.json`
- **Build Config**: `epic_jelly_webgpu/crew/mehul/apps/jellyfish-webgpu/vite.config.ts`

---

**Document Status**: ✅ Complete
**Next Step**: Wait for your input on project goals and desired work
**Session**: Handoff prepared for next session

---

## Quick Reference for Next Session

When you return, tell me:
1. What you want to build/fix/improve
2. Who this is for (audience)
3. Any constraints or preferences

I'll then create the appropriate BMad artifacts (PRD, architecture, stories) and we can get to work!
