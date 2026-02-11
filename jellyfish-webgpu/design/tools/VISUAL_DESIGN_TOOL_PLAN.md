# Visual Design Tool - Implementation Plan

**Created**: 2026-02-09
**Purpose**: Interactive tool for designing, visualizing, and validating jellyfish geometry before code generation

---

## Overview

The Visual Design Tool is a standalone web application that allows designers and developers to:
1. **Visually design** jellyfish geometry using real-time 3D preview
2. **Export specifications** as JSON, TypeScript code, and SVG diagrams
3. **Validate parameter ranges** before committing to implementation
4. **Cross-reference** with existing codebase for compatibility

---

## Architecture

### Tech Stack (Reusing Existing Dependencies)

```
┌─────────────────────────────────────────────────────────────┐
│                    VISUAL DESIGN TOOL                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend Layer                          Rendering Layer       │
│  ┌──────────────┐                       ┌──────────────┐      │
│  │   Vue 3 /    │  ← Reactivity          │   Three.js   │      │
│  │   Vanilla    │                       │   (WebGPU)   │      │
│  │   JS + HTML  │                       └──────────────┘      │
│  └──────────────┘                             ↑               │
│        ↓                                       │               │
│  UI Layer                                 Geometry Layer       │
│  ┌──────────────┐                       ┌──────────────┐      │
│  │  Tweakpane   │  ← Already in deps!   │  Reuse from  │      │
│  │  Controls    │                       │  Jellyfish   │      │
│  │  + Custom    │                       │  Geometry.ts │      │
│  └──────────────┘                       └──────────────┘      │
│        ↓                                       ↑               │
│  Export Layer                              Spec Layer           │
│  ┌──────────────┐                       ┌──────────────┐      │
│  │ JSON Export  │                       │  Creature    │      │
│  │ TS Code      │                       │  Spec Types  │      │
│  │ SVG Diagram  │                       │  (Existing)  │      │
│  └──────────────┘                       └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **No new frameworks** | Use existing Tweakpane + Three.js |
| **Reuse existing geometry code** | Import `JellyfishGeometry` directly |
| **Standalone HTML entry** | Can open file:// or serve via vite |
| **Module-based architecture** | Each feature is self-contained |
| **Export-first design** | Every view generates code |

---

## File Structure

```
/design-tools/
├── index.html                 # Entry point
├── main.ts                    # Bootstrap
├── App.vue                    # Optional: Vue component
├── lib/
│   ├── GeometryPreview.ts     # Three.js scene wrapper
│   ├── SpecEditor.ts          # Spec parameter editor
│   ├── ExportManager.ts       # Export functionality
│   └── DiagramGenerator.ts    # SVG generation
├── ui/
│   ├── ControlPanel.ts        # Tweakpane integration
│   ├── Viewport.ts            # 3D viewport
│   └── OutputPanel.ts         # Code/SVG output
├── data/
│   ├── presets.ts             # Archetype presets
│   └── templates.ts           # Code templates
└── types/
    └── design-tool.ts         # Tool-specific types
```

---

## Module Specifications

### 1. GeometryPreview.ts

**Purpose**: Wraps the existing `JellyfishGeometry` for preview rendering

```typescript
interface GeometryPreviewOptions {
  canvas: HTMLCanvasElement;
  spec: CreatureSpec;
  wireframe?: boolean;
  showNormals?: boolean;
  showConstraints?: boolean;
  backgroundColor?: number;
}

export class GeometryPreview {
  private renderer: THREE.WebGPURenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private geometry: JellyfishGeometryData;
  private mesh: THREE.Mesh;

  constructor(options: GeometryPreviewOptions);

  // Update preview when spec changes
  updateSpec(spec: CreatureSpec): void;

  // Get snapshot for SVG export
  getSnapshot(width: number, height: number): string;

  // Dispose
  dispose(): void;
}
```

**Key Features**:
- Reuses `JellyfishGeometry.create(spec)` directly
- Renders with wireframe toggle
- OrbitControls for interaction
- Snapshot for SVG generation

### 2. SpecEditor.ts

**Purpose**: Live spec editing with validation

```typescript
export class SpecEditor {
  private spec: CreatureSpec;
  private tweakpane: any;
  private listeners: Map<string, Set<Function>>;

  constructor(container: HTMLElement, initialSpec: CreatureSpec);

  // Get current spec
  getSpec(): CreatureSpec;

  // Update spec programmatically
  setSpec(spec: CreatureSpec): void;

  // Listen for changes
  onChange(callback: (spec: CreatureSpec) => void): void;

  // Preset loader
  loadPreset(presetId: string): void;

  // Validation
  validate(): ValidationResult;
}
```

**UI Structure (using Tweakpane)**:
```
┌─ Body Shape ─────────────────────────────┐
│ ◉ Medusa  ○ Comb Jelly  ○ Salp         │
│ ○ Siphonophore  ○ Anemone                │
└──────────────────────────────────────────┘

┌─ Geometry ──────────────────────────────┐
│ height:     [━━━━○━━━━] 1.0             │
│ domeFactor: [━━━○━━━━━] 0.3             │
│ flareFactor:[━━━━○━━━━] 0.8             │
│ ribCount:   [━━━━━○━━━] 18              │
└──────────────────────────────────────────┘

┌─ Symmetry ──────────────────────────────┐
│ kind:  [Radial ▼]                       │
│ order: [━━━━━○━━━━] 8                  │
│ breaking: [━━○━━━━━━] 0.12              │
└──────────────────────────────────────────┘

┌─ Cross Section ─────────────────────────┐
│ kind: [Circle ▼]                        │
│ xScale: [━━━━━○━━━━] 1.0               │
│ zScale: [━━━━━○━━━━] 1.0               │
│ twist: [━━○━━━━━━] 0.0                 │
└──────────────────────────────────────────┘

┌─ Actions ───────────────────────────────┐
│ [Export Config] [Export Code] [Export SVG]│
│ [Load Preset ▼] [Save Preset]           │
└──────────────────────────────────────────┘
```

### 3. ExportManager.ts

**Purpose**: Generate various output formats

```typescript
export interface ExportOptions {
  format: 'json' | 'typescript' | 'svg' | 'markdown';
  includeComments?: boolean;
  prettier?: boolean;
}

export class ExportManager {
  // Export current spec as JSON
  exportAsJSON(spec: CreatureSpec): string;

  // Export as TypeScript code
  exportAsTypeScript(spec: CreatureSpec, options?: ExportOptions): string;

  // Export as SVG diagram
  exportAsSVG(spec: CreatureSpec, view: 'side' | 'front' | 'cross'): string;

  // Export as Markdown documentation
  exportAsMarkdown(spec: CreatureSpec): string;

  // Generate all at once
  exportAll(spec: CreatureSpec): {
    json: string;
    typescript: string;
    svg: { side: string; front: string; cross: string };
    markdown: string;
  };
}
```

### 4. DiagramGenerator.ts

**Purpose**: Generate SVG diagrams from spec

```typescript
export interface DiagramOptions {
  width: number;
  height: number;
  showAnnotations?: boolean;
  showGrid?: boolean;
  colorScheme?: 'default' | 'scientific' | 'artistic';
}

export class DiagramGenerator {
  // Side view - shows profile curve
  generateSideView(spec: CreatureSpec, options: DiagramOptions): SVGElement;

  // Front view - shows cross-section
  generateFrontView(spec: CreatureSpec, options: DiagramOptions): SVGElement;

  // Cross-section detail
  generateCrossSection(spec: CreatureSpec, options: DiagramOptions): SVGElement;

  // Full multi-view sheet
  generateSheet(spec: CreatureSpec): SVGElement;
}
```

**SVG Output Example**:
```xml
<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="100%" height="100%" fill="#0a0a15"/>

  <!-- Grid -->
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a1a2a" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)"/>

  <!-- Title -->
  <text x="20" y="30" fill="#88aaff" font-size="16" font-family="monospace">
    MEDUSA - Side View
  </text>

  <!-- Profile curve (generated from spec) -->
  <path d="M 200 450 Q 250 150 400 150 Q 550 150 600 450"
        fill="none" stroke="#00ced1" stroke-width="2"/>

  <!-- Annotations -->
  <g class="annotations">
    <line x1="200" y1="450" x2="150" y2="450" stroke="#666" stroke-width="1"/>
    <text x="140" y="455" fill="#888" font-size="12" text-anchor="end">base</text>

    <line x1="400" y1="150" x2="350" y2="100" stroke="#666" stroke-width="1"/>
    <text x="340" y="95" fill="#888" font-size="12" text-anchor="end">apex (height: 1.0)</text>
  </g>

  <!-- Parameter table -->
  <g transform="translate(620, 50)">
    <text x="0" y="0" fill="#00ced1" font-size="14" font-weight="bold">Parameters</text>
    <text x="0" y="25" fill="#aaa" font-size="11">height: 1.0</text>
    <text x="0" y="45" fill="#aaa" font-size="11">domeFactor: 0.3</text>
    <text x="0" y="65" fill="#aaa" font-size="11">flareFactor: 0.8</text>
    <text x="0" y="85" fill="#aaa" font-size="11">ribCount: 18</text>
  </g>
</svg>
```

---

## Integration with Existing Code

### Import Map

```json
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.180.0/webgpu/build/three.webgpu.js",
    "particulate": "https://cdn.jsdelivr.net/npm/particulate@0.3.1/dist/esm/index.js",
    "tweakpane": "https://cdn.jsdelivr.net/npm/tweakpane@4.0.3/dist/tweakpane.min.js"
  }
}
```

### Code Reuse

```typescript
// Import existing geometry builder
import { JellyfishGeometry } from '/src/jellyfish/JellyfishGeometry.js';
import type { CreatureSpec } from '/src/jellyfish/creatures/CreatureSpec.js';
import { ARCHETYPES } from '/src/jellyfish/creatures/presets.js';

// Use directly in preview
const geometry = JellyfishGeometry.create(currentSpec);
const mesh = new THREE.Mesh(geometry.geometry, material);
```

---

## User Workflow

```
1. Open Tool
   └─> Loads with default Medusa preset

2. Adjust Parameters
   ├─> Change height slider
   ├─> Adjust domeFactor
   └─> Real-time 3D preview updates

3. Test Variations
   ├─> Switch body plan (Bell → Egg → Barrel)
   ├─> Modify cross-section (Circle → Ellipse → Superformula)
   └─> Add surface details (ridges, frills)

4. Export Results
   ├─> Export Config JSON → for spec documents
   ├─> Export TypeScript → for implementation
   ├─> Export SVG → for documentation
   └─> Export All → complete package

5. Save Preset
   └─> Save custom configuration for later
```

---

## Implementation Phases

### Phase 1: Foundation (1-2 hours)
- [ ] Create HTML entry point with import map
- [ ] Set up basic Three.js scene
- [ ] Import and use `JellyfishGeometry.create()`
- [ ] Basic wireframe rendering

### Phase 2: UI Integration (2-3 hours)
- [ ] Integrate Tweakpane for controls
- [ ] Map spec parameters to UI controls
- [ ] Connect UI changes to geometry regeneration

### Phase 3: Export Functionality (2-3 hours)
- [ ] JSON export (spec dump)
- [ ] TypeScript code generation
- [ ] SVG diagram generation
- [ ] Markdown documentation

### Phase 4: Advanced Features (2-3 hours)
- [ ] Multiple archetypes switcher
- [ ] Preset save/load
- [ ] Comparison view (two specs side-by-side)
- [ ] Screenshot export

### Phase 5: Polish (1-2 hours)
- [ ] Styling and theming
- [ ] Help/tooltip system
- [ ] Error handling
- [ ] Performance optimization

**Total Estimate**: 8-13 hours

---

## Quick Start Implementation

### Minimal Working Example (1 hour)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Jellyfish Design Tool</title>
  <style>
    body { margin: 0; display: flex; }
    #viewport { flex: 1; background: #000510; }
    #controls { width: 300px; background: #1a1a2e; color: #eee; padding: 16px; }
  </style>
</head>
<body>
  <div id="viewport"></div>
  <div id="controls">
    <h3>🎨 Design Tool</h3>
    <label>Height: <span id="h-val">1.0</span></label>
    <input type="range" id="height" min="0.5" max="2.0" step="0.1" value="1.0">

    <label>Dome: <span id="d-val">0.3</span></label>
    <input type="range" id="dome" min="0" max="1" step="0.05" value="0.3">

    <button id="export">Export JSON</button>
    <pre id="output"></pre>
  </div>

  <script type="module">
    import * as THREE from 'three/webgpu';
    import { JellyfishGeometry } from '/src/jellyfish/JellyfishGeometry.js';

    // Setup scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 100);

    const canvas = document.querySelector('#viewport');
    const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Create geometry from spec
    let currentSpec = {
      id: 'test',
      bodyPlan: 'medusa',
      geometry: { height: 1.0, domeFactor: 0.3, flareFactor: 0.8, ribsCount: 18 }
    };

    function updateGeometry() {
      const data = JellyfishGeometry.create(currentSpec);
      const mesh = new THREE.Mesh(data.geometry,
        new THREE.MeshBasicMaterial({ wireframe: true, color: 0x00ced1 })
      );
      scene.add(mesh);
      renderer.render(scene, camera);
    }

    updateGeometry();

    // Wire up controls
    document.getElementById('height').oninput = (e) => {
      currentSpec.geometry.height = parseFloat(e.target.value);
      document.getElementById('h-val').textContent = e.target.value;
      scene.clear();
      updateGeometry();
    };

    document.getElementById('export').onclick = () => {
      document.getElementById('output').textContent =
        JSON.stringify(currentSpec, null, 2);
    };
  </script>
</body>
</html>
```

---

## Questions for Implementation

1. **Framework choice**: Vanilla JS or Vue 3 component?
   - Vanilla: Simpler, no build step for standalone
   - Vue: Better reactivity, can integrate into main app later

2. **Location**: Where should the tool live?
   - `/design-tools/` - standalone from main app
   - `/src/design-tools/` - part of main app
   - Separate repo/package

3. **Deployment**: How should it be served?
   - `npm run design-tool` - separate vite entry
   - Static HTML file:// compatible
   - Integrated into main app as `/design` route

4. **Presets**: Load from existing `presets.ts`?
   - Yes: Import directly for consistency
   - No: Copy/paste preset data

---

## Next Steps

1. **Approve this plan** - Any modifications needed?
2. **Choose implementation approach** - Vanilla vs Vue
3. **Decide on location** - Separate folder or integrated
4. **Begin Phase 1** - Create foundation

Once approved, I can create:
- `index.html` - Entry point
- `main.ts` - Bootstrap
- `GeometryPreview.ts` - Preview wrapper
- `SpecEditor.ts` - Parameter editor
- `ExportManager.ts` - Export functionality
- `DiagramGenerator.ts` - SVG generation
