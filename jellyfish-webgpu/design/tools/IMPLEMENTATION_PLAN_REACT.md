# Visual Design Tool - React Implementation Plan

**Framework**: React
**Location**: `/src/design-tools/`
**Timing**: After Stage 3 Phase 1 (Code Analysis)
**Status**: Ready to Implement

---

## Architecture (React)

```
/src/design-tools/
├── index.tsx                 # Entry point (export DesignTool component)
├── DesignTool.tsx            # Main component
├── components/
│   ├── Viewport.tsx          # Three.js canvas wrapper
│   ├── ControlPanel.tsx      # Parameter controls (Tweakpane wrapper)
│   ├── OutputPanel.tsx       # Code/SVG output display
│   ├── PresetSelector.tsx    # Archetype preset switcher
│   └── ComparisonView.tsx    # Side-by-side spec comparison
├── lib/
│   ├── GeometryPreview.ts    # Three.js scene management
│   ├── SpecManager.ts        # Spec state & validation
│   ├── ExportManager.ts      # JSON/TS/SVG/MD export
│   └── DiagramGenerator.ts   # SVG diagram generation
├── hooks/
│   ├── useGeometry.ts        # Hook for geometry generation
│   ├── useSpecEditor.ts      # Hook for Tweakpane integration
│   └── useExport.ts          # Hook for export functionality
├── types/
│   └── index.ts              # Design tool types
└── data/
    ├── presets.ts            # Archetype presets (import from creatures/presets.ts)
    └── templates.ts          # Code generation templates
```

---

## Component Structure

### DesignTool.tsx (Main)

```tsx
interface DesignToolProps {
  initialSpec?: CreatureSpec;
  onSpecChange?: (spec: CreatureSpec) => void;
  readonly?: boolean;
}

export function DesignTool({ initialSpec, onSpecChange, readonly }: DesignToolProps) {
  const [spec, setSpec] = useState<CreatureSpec>(initialSpec || DEFAULT_SPEC);
  const [view, setView] = useState<'single' | 'compare'>('single');
  const [compareSpec, setCompareSpec] = useState<CreatureSpec>();

  return (
    <div className="design-tool">
      <div className="toolbar">
        <PresetSelector value={spec} onChange={setSpec} />
        <ViewToggle value={view} onChange={setView} />
        <ExportButton spec={spec} />
      </div>

      <div className="main-content">
        <Viewport spec={spec} />
        <ControlPanel spec={spec} onChange={setSpec} />
        <OutputPanel spec={spec} />
      </div>

      {view === 'compare' && (
        <ComparisonPanel specA={spec} specB={compareSpec} />
      )}
    </div>
  );
}
```

### Viewport.tsx

```tsx
interface ViewportProps {
  spec: CreatureSpec;
  wireframe?: boolean;
  showNormals?: boolean;
}

export function Viewport({ spec, wireframe = true }: ViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preview = useGeometry(spec);

  useEffect(() => {
    if (canvasRef.current && preview) {
      preview.attach(canvasRef.current);
    }
    return () => preview?.dispose();
  }, [preview]);

  return (
    <div className="viewport">
      <canvas ref={canvasRef} />
      <div className="viewport-overlay">
        <span>{spec.id}</span>
        <span>{preview?.particleCount || 0} particles</span>
      </div>
    </div>
  );
}
```

### ControlPanel.tsx

```tsx
interface ControlPanelProps {
  spec: CreatureSpec;
  onChange: (spec: CreatureSpec) => void;
}

export function ControlPanel({ spec, onChange }: ControlPanelProps) {
  const paneRef = useRef<Tweakpane>(null);
  const params = useSpecEditor(spec, onChange);

  useEffect(() => {
    const pane = new Tweakpane.Pane({
      container: paneRef.current,
    });

    // Body shape selector
    pane.addInput(params, 'bodyPlan', {
      options: {
        'Medusa': 'medusa',
        'Comb Jelly': 'comb_jelly',
        'Salp': 'salp',
        // ...
      }
    }).on('change', (v) => updateSpec('bodyPlan', v.value));

    // Geometry params
    const geometryFolder = pane.addFolder({ title: 'Geometry' });
    geometryFolder.addInput(params.geometry, 'height', { min: 0.5, max: 2.0 });
    geometryFolder.addInput(params.geometry, 'domeFactor', { min: 0, max: 1 });
    // ...

    return () => pane.dispose();
  }, [spec]);

  return <div ref={paneRef} className="control-panel" />;
}
```

### OutputPanel.tsx

```tsx
interface OutputPanelProps {
  spec: CreatureSpec;
}

export function OutputPanel({ spec }: OutputPanelProps) {
  const [format, setFormat] = useState<'json' | 'ts' | 'svg' | 'md'>('json');
  const { exportAsJSON, exportAsTS, exportAsSVG, exportAsMD } = useExport(spec);

  const getOutput = () => {
    switch (format) {
      case 'json': return exportAsJSON();
      case 'ts': return exportAsTS();
      case 'svg': return exportAsSVG('side');
      case 'md': return exportAsMD();
    }
  };

  return (
    <div className="output-panel">
      <div className="output-tabs">
        <Tab active={format === 'json'} onClick={() => setFormat('json')}>JSON</Tab>
        <Tab active={format === 'ts'} onClick={() => setFormat('ts')}>TypeScript</Tab>
        <Tab active={format === 'svg'} onClick={() => setFormat('svg')}>SVG</Tab>
        <Tab active={format === 'md'} onClick={() => setFormat('md')}>Markdown</Tab>
      </div>
      <pre className="output-content">{getOutput()}</pre>
      <CopyButton content={getOutput()} />
    </div>
  );
}
```

---

## Custom Hooks

### useGeometry.ts

```ts
export function useGeometry(spec: CreatureSpec) {
  const previewRef = useRef<GeometryPreview | null>(null);

  const { data: geometry, isLoading } = useQuery({
    queryKey: ['geometry', spec],
    queryFn: () => JellyfishGeometry.create(spec),
    staleTime: 0,
  });

  useEffect(() => {
    if (geometry && !previewRef.current) {
      previewRef.current = new GeometryPreview({
        geometry,
        wireframe: true,
      });
    }
  }, [geometry]);

  const update = useCallback(() => {
    previewRef.current?.updateGeometry(geometry);
  }, [geometry]);

  return {
    preview: previewRef.current,
    geometry,
    update,
    particleCount: geometry?.system.positions.length / 3 || 0,
  };
}
```

### useSpecEditor.ts

```ts
export function useSpecEditor(spec: CreatureSpec, onChange: (spec: CreatureSpec) => void) {
  const params = useMemo(() => ({
    // Flatten spec for Tweakpane
    bodyPlan: spec.bodyPlan,
    geometry: {
      height: spec.geometry?.height || 1.0,
      domeFactor: getGeometryParam(spec, 'domeFactor') || 0.3,
      // ...
    },
    symmetry: spec.symmetry,
    crossSection: spec.crossSection,
    // ...
  }), [spec]);

  const updateSpec = useCallback((path: string, value: any) => {
    const newSpec = { ...spec };
    set(newSpec, path, value);
    onChange(newSpec);
  }, [spec, onChange]);

  return { params, updateSpec };
}
```

### useExport.ts

```ts
export function useExport(spec: CreatureSpec) {
  const exportAsJSON = useCallback(() => {
    return JSON.stringify(spec, null, 2);
  }, [spec]);

  const exportAsTS = useCallback(() => {
    return generateTypeScriptSpec(spec);
  }, [spec]);

  const exportAsSVG = useCallback((view: 'side' | 'front' | 'cross') => {
    return generateSVGDiagram(spec, view);
  }, [spec]);

  const exportAsMD = useCallback(() => {
    return generateMarkdownDoc(spec);
  }, [spec]);

  const exportAll = useCallback(() => ({
    json: exportAsJSON(),
    typescript: exportAsTS(),
    svg: {
      side: exportAsSVG('side'),
      front: exportAsSVG('front'),
      cross: exportAsSVG('cross'),
    },
    markdown: exportAsMD(),
  }), [exportAsJSON, exportAsTS, exportAsSVG, exportAsMD]);

  return { exportAsJSON, exportAsTS, exportAsSVG, exportAsMD, exportAll };
}
```

---

## Integration with Main App

### Option 1: Separate Route

```tsx
// App.tsx
import { DesignTool } from './design-tools';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainScene />} />
      <Route path="/design" element={<DesignTool />} />
    </Routes>
  );
}
```

### Option 2: Modal/Overlay

```tsx
// MainScene.tsx
import { DesignToolModal } from './design-tools';

function MainScene() {
  const [designToolOpen, setDesignToolOpen] = useState(false);

  return (
    <>
      <Canvas>{/* ... */}</Canvas>
      <button onClick={() => setDesignToolOpen(true)}>Open Design Tool</button>
      {designToolOpen && (
        <DesignToolModal onClose={() => setDesignToolOpen(false)} />
      )}
    </>
  );
}
```

### Option 3: Standalone Dev Server

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "dev:design-tool": "vite --mode design-tool"
  }
}
```

```ts
// vite.config.ts
export default defineConfig(({ mode }) => ({
  // ...
  build: mode === 'design-tool' ? {
    rollupOptions: {
      input: {
        design: '/src/design-tools/index.html',
      },
    },
  } : undefined,
}));
```

---

## Dependencies

No new dependencies needed! Uses existing:
- `three` - Already installed
- `particulate` - Already installed
- `tweakpane` - Already installed

Only React-specific deps if not already using React in main app:
- `react` and `react-dom` (if needed)
- OR use Preact for smaller bundle

---

## Implementation Timeline

**After Stage 3 Phase 1 (Code Analysis Complete)**

### Week 1: Core Components
- [ ] Set up React structure
- [ ] DesignTool.tsx main component
- [ ] Viewport.tsx with Three.js
- [ ] Import and use `JellyfishGeometry`

### Week 2: Controls & Export
- [ ] ControlPanel with Tweakpane integration
- [ ] OutputPanel with all export formats
- [ ] useGeometry hook
- [ ] useSpecEditor hook
- [ ] useExport hook

### Week 3: Advanced Features
- [ ] PresetSelector with all 15 archetypes
- [ ] ComparisonView for side-by-side
- [ ] Save/Load custom presets
- [ ] Screenshot export

### Week 4: Polish & Integration
- [ ] Styling with theme
- [ ] Error handling
- [ ] Performance optimization
- [ ] Documentation
- [ ] Integration into main app

---

## Files to Create

```
/src/design-tools/
├── index.tsx
├── DesignTool.tsx
├── components/
│   ├── Viewport.tsx
│   ├── ControlPanel.tsx
│   ├── OutputPanel.tsx
│   ├── PresetSelector.tsx
│   └── ComparisonView.tsx
├── lib/
│   ├── GeometryPreview.ts
│   ├── SpecManager.ts
│   ├── ExportManager.ts
│   └── DiagramGenerator.ts
├── hooks/
│   ├── useGeometry.ts
│   ├── useSpecEditor.ts
│   └── useExport.ts
├── types/
│   └── index.ts
├── data/
│   └── presets.ts
└── styles.css
```

---

## Next Steps (After Stage 3 Phase 1)

1. ✅ Stage 3 Phase 1: Code Analysis (8 specialists analyze existing code)
2. → **Build Design Tool** ← We are here
3. Stage 3 Phase 2: Visual Design (use tool to create diagrams)
4. Stage 3 Phase 3-6: Specifications (use tool to validate)

---

**Status**: Planned, ready to implement after Stage 3 Phase 1
