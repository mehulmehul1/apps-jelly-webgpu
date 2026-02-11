# Parametric Design Preview Tool

## Purpose

Interactive tool for designing, visualizing, and validating jellyfish geometry before code generation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DESIGN PREVIEW TOOL                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │   3D Viewport    │  │  Parameter Panel │  │   Output     │ │
│  │                  │  │                  │  │              │ │
│  │  ┌────┐         │  │  Body Shape:     │  │ [Live Config]│ │
│  │   ○  ○         │  │  ┌──────────┐    │  │              │ │
│  │  ╱ │ ╲         │  │  │bell      │▼  │  │ [SVG Export] │ │
│  │ ╱  │  ╲        │  │  └──────────┘    │  │              │ │
│  │────│────       │  │                  │  │ [Code Gen]   │ │
│  │    │          │  │  height:     [1.0]│  │              │ │
│  │               │  │  domeFactor: [0.3]│  │ [Presets]    │ │
│  │   [Orbit]     │  │  flareFactor:[0.8]│  │              │ │
│  │   [Pan]       │  │  ribCount:   [18] │  │ [Validate]   │ │
│  │   [Zoom]      │  │                  │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Generated Code (Live)                    │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ bellBell({                                         │  │  │
│  │  │   height: 1.0,                                    │  │  │
│  │  │   domeFactor: 0.3,                                │  │  │
│  │  │   flareFactor: 0.8,                               │  │  │
│  │  │   ribCount: 18,                                   │  │  │
│  │  │   ribProfile: (t) => bellProfile(t, {            │  │  │
│  │  │     domeFactor: 0.3,                              │  │  │
│  │  │     flareFactor: 0.8                              │  │  │
│  │  │   })                                              │  │  │
│  │  │ })                                                 │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation

### File: design/tools/preview.html

```html
<!DOCTYPE html>
<html>
<head>
    <title>Jellyfish Design Preview</title>
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
        }
    }
    </script>
    <style>
        body { margin: 0; display: flex; height: 100vh; font-family: system-ui; }
        #viewport { flex: 1; background: #000510; }
        #controls { width: 320px; background: #1a1a2e; color: #eee; padding: 16px; overflow-y: auto; }
        #output { width: 400px; background: #0f0f1a; color: #0f8; padding: 16px; font-family: monospace; font-size: 12px; overflow-y: auto; }
        .param-group { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #333; }
        .param-label { display: block; margin-bottom: 4px; font-size: 12px; color: #88a; }
        .param-input { width: 100%; padding: 6px; background: #2a2a4a; border: 1px solid #444; color: #fff; border-radius: 4px; }
        .shape-select { width: 100%; padding: 8px; background: #2a2a4a; border: 1px solid #444; color: #fff; border-radius: 4px; margin-bottom: 12px; }
        button { width: 100%; padding: 10px; margin-top: 8px; background: #4a6fa5; border: none; color: #fff; border-radius: 4px; cursor: pointer; }
        button:hover { background: #5a7fb5; }
        .tab-container { display: flex; margin-bottom: 12px; }
        .tab { flex: 1; padding: 8px; background: #2a2a4a; border: none; color: #888; cursor: pointer; }
        .tab.active { background: #4a6fa5; color: #fff; }
    </style>
</head>
<body>
    <div id="viewport"></div>
    <div id="controls">
        <h3>🎨 Design Preview</h3>

        <div class="param-group">
            <label class="param-label">Body Shape</label>
            <select class="shape-select" id="shapeType">
                <option value="bell">Bell (Medusa)</option>
                <option value="egg">Egg (Comb Jelly)</option>
                <option value="barrel">Barrel (Salp)</option>
                <option value="tube">Tube (Ribbon)</option>
                <option value="disc">Disc (Moon Jelly)</option>
                <option value="sphere">Sphere (Colonial)</option>
            </select>
        </div>

        <div class="param-group">
            <label class="param-label">Height: <span id="heightVal">1.0</span></label>
            <input type="range" class="param-input" id="height" min="0.5" max="2.0" step="0.1" value="1.0">
        </div>

        <div class="param-group">
            <label class="param-label">Dome Factor: <span id="domeVal">0.3</span></label>
            <input type="range" class="param-input" id="domeFactor" min="0" max="1" step="0.05" value="0.3">
        </div>

        <div class="param-group">
            <label class="param-label">Flare Factor: <span id="flareVal">0.8</span></label>
            <input type="range" class="param-input" id="flareFactor" min="0" max="1" step="0.05" value="0.8">
        </div>

        <div class="param-group">
            <label class="param-label">Rib Count: <span id="ribVal">18</span></label>
            <input type="range" class="param-input" id="ribCount" min="8" max="32" step="2" value="18">
        </div>

        <div class="param-group">
            <label class="param-label">Symmetry: <span id="symVal">8</span></label>
            <input type="range" class="param-input" id="symmetry" min="3" max="16" step="1" value="8">
        </div>

        <button id="exportConfig">Export Config JSON</button>
        <button id="exportSVG">Export SVG Diagram</button>
        <button id="generateCode">Generate TypeScript Code</button>
    </div>
    <div id="output">
        <div class="tab-container">
            <button class="tab active" data-tab="config">Config</button>
            <button class="tab" data-tab="code">Code</button>
            <button class="tab" data-tab="svg">SVG</button>
        </div>
        <pre id="outputContent"></pre>
    </div>

    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000510);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        camera.position.set(3, 2, 4);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(document.getElementById('viewport').clientWidth, document.getElementById('viewport').clientHeight);
        document.getElementById('viewport').appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x4488ff, 0.5);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0x88ffff, 1);
        pointLight.position.set(5, 5, 5);
        scene.add(pointLight);

        // Grid helper
        const gridHelper = new THREE.GridHelper(10, 20, 0x224466, 0x112233);
        scene.add(gridHelper);

        // Jellyfish mesh (will be updated)
        let jellyfishMesh;

        function getProfileCurve(t, params) {
            const { height, domeFactor, flareFactor } = params;
            // Bell profile using Gaussian-like curve
            const bellShape = Math.exp(-Math.pow((t - 0.3) / 0.3, 2));
            const flare = 1 + flareFactor * Math.sin(t * Math.PI);
            return bellShape * flare;
        }

        function createJellyfishGeometry(params) {
            const { shapeType, height, domeFactor, flareFactor, ribCount, symmetry } = params;

            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            const uvs = [];
            const normals = [];

            const radialSegments = symmetry;
            const verticalSegments = ribCount;

            for (let i = 0; i <= verticalSegments; i++) {
                const t = i / verticalSegments;
                const radius = getProfileCurve(t, params);
                const y = t * height - height * 0.3;

                for (let j = 0; j <= radialSegments; j++) {
                    const theta = (j / radialSegments) * Math.PI * 2;
                    const x = Math.cos(theta) * radius;
                    const z = Math.sin(theta) * radius;

                    vertices.push(x, y, z);
                    normals.push(Math.cos(theta), 0, Math.sin(theta));
                    uvs.push(j / radialSegments, t);
                }
            }

            for (let i = 0; i < verticalSegments; i++) {
                for (let j = 0; j < radialSegments; j++) {
                    const a = i * (radialSegments + 1) + j;
                    const b = a + radialSegments + 1;
                    indices.push(a, b, a + 1);
                    indices.push(a + 1, b, b + 1);
                }
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();

            return geometry;
        }

        function updateMesh() {
            const params = {
                shapeType: document.getElementById('shapeType').value,
                height: parseFloat(document.getElementById('height').value),
                domeFactor: parseFloat(document.getElementById('domeFactor').value),
                flareFactor: parseFloat(document.getElementById('flareFactor').value),
                ribCount: parseInt(document.getElementById('ribCount').value),
                symmetry: parseInt(document.getElementById('symmetry').value)
            };

            if (jellyfishMesh) scene.remove(jellyfishMesh);

            const geometry = createJellyfishGeometry(params);
            const material = new THREE.MeshPhongMaterial({
                color: 0x00ced1,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,
                shininess: 100
            });

            jellyfishMesh = new THREE.Mesh(geometry, material);
            scene.add(jellyfishMesh);

            updateOutput(params);
        }

        function updateOutput(params) {
            const config = {
                bodyShape: params.shapeType,
                geometry: {
                    type: params.shapeType,
                    parameters: {
                        height: params.height,
                        domeFactor: params.domeFactor,
                        flareFactor: params.flareFactor,
                        ribCount: params.ribCount,
                        symmetry: params.symmetry
                    }
                }
            };

            const code = generateCode(params);
            const svg = generateSVG(params);

            document.getElementById('outputContent').textContent =
                JSON.stringify(config, null, 2);
        }

        function generateCode(params) {
            return `// Geometry configuration for ${params.shapeType}
const ${params.shapeType}Geometry: GeometryModuleConfig = {
  type: '${params.shapeType}',
  parameters: {
    height: ${params.height},
    domeFactor: ${params.domeFactor},
    flareFactor: ${params.flareFactor},
    ribCount: ${params.ribCount},
    symmetry: ${params.symmetry}
  }
};

// Profile function
function profile(t: number, p: typeof ${params.shapeType}Geometry.parameters): number {
  const bellShape = Math.exp(-Math.pow((t - 0.3) / 0.3, 2));
  const flare = 1 + p.flareFactor * Math.sin(t * Math.PI);
  return bellShape * flare;
}`;
        }

        function generateSVG(params) {
            const width = 300;
            const height = 400;
            const margin = 50;

            let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
            svg += `  <!-- ${params.shapeType.toUpperCase()} Side View -->\n`;
            svg += `  <defs>\n`;
            svg += `    <linearGradient id="depth" x1="0%" y1="0%" x2="0%" y2="100%">\n`;
            svg += `      <stop offset="0%" style="stop-color:#87CEEB"/>\n`;
            svg += `      <stop offset="100%" style="stop-color:#000033"/>\n`;
            svg += `    </linearGradient>\n`;
            svg += `  </defs>\n`;
            svg += `  <rect width="100%" height="100%" fill="#000510"/>\n`;

            // Generate bell profile path
            svg += `  <path d="`;
            const steps = 20;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const r = getProfileCurve(t, params);
                const x = width / 2 - r * 100;
                const y = margin + t * (height - 2 * margin);
                if (i === 0) svg += `M ${x} ${y}`;
                else svg += ` L ${x} ${y}`;
            }
            svg += `" fill="url(#depth)" stroke="#00CED1" stroke-width="2" opacity="0.8"/>\n`;

            // Mirror for full shape
            svg += `  <path d="`;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const r = getProfileCurve(t, params);
                const x = width / 2 + r * 100;
                const y = margin + t * (height - 2 * margin);
                if (i === 0) svg += `M ${x} ${y}`;
                else svg += ` L ${x} ${y}`;
            }
            svg += `" fill="url(#depth)" stroke="#00CED1" stroke-width="2" opacity="0.8"/>\n`;

            // Labels
            svg += `  <text x="10" y="20" fill="#88a" font-size="12">${params.shapeType} Profile</text>\n`;
            svg += `  <text x="10" y="38" fill="#68a" font-size="10">height: ${params.height}, dome: ${params.domeFactor}, flare: ${params.flareFactor}</text>\n`;
            svg += `  <text x="10" y="53" fill="#68a" font-size="10">ribs: ${params.ribCount}, symmetry: ${params.symmetry}</text>\n`;

            svg += `</svg>`;
            return svg;
        }

        // Event listeners
        ['height', 'domeFactor', 'flareFactor', 'ribCount', 'symmetry', 'shapeType'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                document.getElementById(id + 'Val').textContent = e.target.value;
                updateMesh();
            });
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const params = {
                    shapeType: document.getElementById('shapeType').value,
                    height: parseFloat(document.getElementById('height').value),
                    domeFactor: parseFloat(document.getElementById('domeFactor').value),
                    flareFactor: parseFloat(document.getElementById('flareFactor').value),
                    ribCount: parseInt(document.getElementById('ribCount').value),
                    symmetry: parseInt(document.getElementById('symmetry').value)
                };

                if (tab.dataset.tab === 'config') {
                    updateOutput(params);
                } else if (tab.dataset.tab === 'code') {
                    document.getElementById('outputContent').textContent = generateCode(params);
                } else if (tab.dataset.tab === 'svg') {
                    document.getElementById('outputContent').textContent = generateSVG(params);
                }
            });
        });

        // Initial render
        updateMesh();

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // Resize handler
        window.addEventListener('resize', () => {
            const width = document.getElementById('viewport').clientWidth;
            const height = document.getElementById('viewport').clientHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        });
    </script>
</body>
</html>
```

## Usage

1. Open `preview.html` in browser
2. Adjust parameters to see real-time 3D preview
3. Export:
   - **Config JSON**: For spec documents
   - **TypeScript Code**: Directly usable
   - **SVG Diagram**: For documentation

## Integration with Spec Generation

Each specialist uses this tool to:
1. Design their domain's components visually
2. Validate parameter ranges
3. Export diagrams for spec documents
4. Generate boilerplate code

## Output Examples

### Config JSON (for spec documents)
```json
{
  "bodyShape": "bell",
  "geometry": {
    "type": "bell",
    "parameters": {
      "height": 1.0,
      "domeFactor": 0.3,
      "flareFactor": 0.8,
      "ribCount": 18,
      "symmetry": 8
    }
  }
}
```

### TypeScript Code (for implementation)
```typescript
const bellGeometry: GeometryModuleConfig = {
  type: 'bell',
  parameters: {
    height: 1.0,
    domeFactor: 0.3,
    flareFactor: 0.8,
    ribCount: 18,
    symmetry: 8
  }
};
```

### SVG (for documentation)
![Bell profile diagram with annotations]
