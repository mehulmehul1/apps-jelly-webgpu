import { JellyfishMaterialTestScene, MaterialTestConfig } from './scenes/JellyfishMaterialTest';

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
}

init().catch(console.error);
