import { JellyfishMaterialTestScene, MaterialTestConfig } from './scenes/JellyfishMaterialTest';
import { createRoot } from 'react-dom/client';
import * as React from 'react';
import { VisualLab } from './editor/visual-lab/VisualLab';
import type { CreatureGraph } from './jellyfish/graph/CreatureGraph';
import type { FormDefinition } from './jellyfish/graph/FormDefinition';

/**
 * Main entry point for the Jellyfish WebGPU TSL Port - Material Integration
 * 
 * This runs the JellyfishMaterialTestScene which demonstrates:
 * - All 5 materials integrated: Bulb, Tentacles, Tail, Gel, Dust
 * - WebGPU renderer with WebGL fallback
 * - Physics interpolation (30fps physics → 60fps render)
 * - ~2000 particle soft-body simulation
 * - Mouse interaction for nudging the jellyfish
 * - Material animation synchronization
 * - FPS counter and debug overlays
 */

async function init() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Configuration for the material test scene
  const config: MaterialTestConfig = {
    showFPS: true,
    showStepProgress: true,
    autoRotate: true,
    cameraDistance: 120,
    wireframe: false,
    showConstraints: false,
    enableEditor: true,
    startEditorHidden: false,
  };

  // Create and initialize the material test scene
  const testScene = new JellyfishMaterialTestScene(canvas, config);

  try {
    await testScene.initialize();
    testScene.start();

    console.log('[Jellyfish] Material Integration Test running');
    console.log('[Jellyfish] All 5 materials active:');
    console.log('  - BulbNodeMaterial: Procedural pattern with bioluminescent glow');
    console.log('  - TentacleNodeMaterial: Distance-based glow fade');
    console.log('  - TailNodeMaterial: Pattern variation with gradient');
    console.log('  - GelNodeMaterial: Rim lighting overlay');
    console.log('  - DustNodeMaterial: Animated atmospheric particles');
    console.log('[Jellyfish] Click and drag on the canvas to nudge the jellyfish');
  } catch (error) {
    console.error('[Jellyfish] Failed to initialize test scene:', error);
  }

  // Mount React UI
  const rootEl = document.getElementById('root');
  if (rootEl) {
    // Create a simple UI state manager
    let isBuilderOpen = false;

    // Create Entry Button
    const enterBtn = document.createElement('button');
    enterBtn.textContent = '📐 OPEN VISUAL BUILDER';
    enterBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        background: #ff00ff;
        color: white;
        border: none;
        padding: 10px 20px;
        font-family: monospace;
        font-weight: bold;
        cursor: pointer;
        border-radius: 4px;
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
    `;
    document.body.appendChild(enterBtn);

    const root = createRoot(rootEl);

    // Initial Render
    const renderUI = () => {
      root.render(
        React.createElement(VisualLab, {
          visible: isBuilderOpen,
          onClose: () => {
            isBuilderOpen = false;
            testScene.setUIVisibility(true);
            testScene.restore();
            enterBtn.style.display = 'block';
            renderUI();
          },
          onUpdate: (graph: CreatureGraph, forms: FormDefinition[]) => {
            testScene.updateFromGraph(graph, forms);
          }
        })
      );
    };

    enterBtn.onclick = () => {
      isBuilderOpen = true;
      testScene.setUIVisibility(false);
      enterBtn.style.display = 'none';
      renderUI();
    };

    // Render initially (Hidden)
    renderUI();
  }
}

init().catch(console.error);
