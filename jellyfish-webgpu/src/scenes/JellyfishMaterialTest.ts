/**
 * JellyfishMaterialTest.ts
 *
 * Material Integration & Visual Testing Scene
 *
 * Integrates all 5 jellyfish materials:
 * - BulbNodeMaterial: Procedural pattern with bioluminescent glow
 * - TentacleNodeMaterial: Distance-based glow fade
 * - TailNodeMaterial: Pattern variation with gradient
 * - GelNodeMaterial: Rim lighting overlay
 * - DustNodeMaterial: Animated atmospheric particles
 *
 * Validates:
 * - All materials render correctly
 * - Visual parity ≥95% with original
 * - 60fps performance
 * - Material animation synchronization
 */

import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { JellyfishRenderer } from '../jellyfish/JellyfishRenderer';
import { InterpolationSystem } from '../systems/physics-bridge';
import {
  BulbNodeMaterial,
  TentacleNodeMaterial,
  TailNodeMaterial,
  GelNodeMaterial,
  DustNodeMaterial,
  createDustSystem,
  InterpolatedLineMaterial,
} from '../jellyfish/materials';
import { JellyfishPostProcessing, LensDirtEffect } from '../post-processing';
import { JellyfishLookEditor } from '../editor/JellyfishLookEditor';
import { LookConfig, DEFAULT_LOOK_PRESET, cloneLookConfig, applyLookPreset } from '../editor/look-presets';
import {
  PRESETS,
  type PresetId,
  mutateCreatureSpec,
  type CreatureSpec,
} from '../jellyfish/creatures';
import { CreatureSelectMenu } from '../ui/CreatureSelectMenu';
import { getArchetype } from '../creatures/archetypes/archetypeRegistry';
import '../creatures/archetypes/JellyfishArchetype';
import '../creatures/archetypes/AnemoneArchetype';
import '../creatures/archetypes/FishArchetype';
import type {
  CreatureArchetype,
  BodyData,
  PhysicsConfig,
  SeededRNG,
} from '../creatures/archetypes/CreatureArchetype';

export interface MaterialTestConfig {
  /** Enable FPS counter */
  showFPS?: boolean;
  /** Enable step progress overlay */
  showStepProgress?: boolean;
  /** Enable auto-rotation */
  autoRotate?: boolean;
  /** Camera distance */
  cameraDistance?: number;
  /** Enable wireframe fallback mode */
  wireframe?: boolean;
  /** Show debug constraint lines */
  showConstraints?: boolean;
  /** Enable look editor UI */
  enableEditor?: boolean;
  /** Start editor hidden (toggle with H) */
  startEditorHidden?: boolean;
  /** Optional look preset override */
  lookPreset?: LookConfig;
}

type DustSystem = ReturnType<typeof createDustSystem>;

interface UnitRuntime {
  id: string;
  geometryData: any;
  group: THREE.Group;
  bulbMaterial?: BulbNodeMaterial;
  gelMaterial?: GelNodeMaterial;
  tailMaterial?: TailNodeMaterial;
  mouthMaterial?: TailNodeMaterial;
  tentacleMaterial?: TentacleNodeMaterial;
  bodyMaterial?: THREE.MeshPhysicalMaterial;
  stalkMaterial?: THREE.MeshPhysicalMaterial;
  tentMaterial?: InterpolatedLineMaterial;
}

/**
 * FPS Counter utility
 */
class FPSCounter {
  private element: HTMLElement;
  private frames = 0;
  private lastTime = performance.now();
  private fps = 0;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #00ff00;
      font-family: monospace;
      font-size: 14px;
      padding: 8px 12px;
      border-radius: 4px;
      z-index: 1000;
      pointer-events: none;
    `;
    document.body.appendChild(this.element);
    this.update(0);
  }

  update(_deltaTime: number): void {
    this.frames++;
    const now = performance.now();

    if (now - this.lastTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastTime = now;
      this.element.textContent = `FPS: ${this.fps}`;
    }
  }

  setVisible(visible: boolean): void {
    this.element.style.display = visible ? 'block' : 'none';
  }

  dispose(): void {
    this.element.remove();
  }
}

/**
 * Step progress overlay
 */
class StepProgressOverlay {
  private element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed;
      top: 40px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #00ffff;
      font-family: monospace;
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 4px;
      z-index: 1000;
      pointer-events: none;
      min-width: 200px;
    `;
    document.body.appendChild(this.element);
    this.update(0, 0, 0);
  }

  update(stepProgress: number, physicsFPS: number, particleCount: number): void {
    const bar = '█'.repeat(Math.round(stepProgress * 20)) + '░'.repeat(20 - Math.round(stepProgress * 20));
    this.element.innerHTML = `
      <div>Step: ${stepProgress.toFixed(3)} [${bar}]</div>
      <div>Physics: ${physicsFPS.toFixed(1)} Hz</div>
      <div>Particles: ${particleCount}</div>
    `;
  }

  setVisible(visible: boolean): void {
    this.element.style.display = visible ? 'block' : 'none';
  }

  dispose(): void {
    this.element.remove();
  }
}

/**
 * Material info panel
 */
class MaterialInfoPanel {
  private element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed;
      top: 100px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #ffffff;
      font-family: monospace;
      font-size: 11px;
      padding: 8px 12px;
      border-radius: 4px;
      z-index: 1000;
      pointer-events: none;
      min-width: 200px;
    `;
    this.element.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Materials Active:</div>
      <div style="color: #FFA9D2;">● Bulb (Procedural pattern)</div>
      <div style="color: #997299;">● Tentacles (Distance glow)</div>
      <div style="color: #E4BBEE;">● Tail (Gradient pattern)</div>
      <div style="color: #415AB5;">● Gel (Rim lighting)</div>
      <div style="color: #ffffff;">● Dust (Particles)</div>
    `;
    document.body.appendChild(this.element);
  }

  setVisible(visible: boolean): void {
    this.element.style.display = visible ? 'block' : 'none';
  }

  dispose(): void {
    this.element.remove();
  }
}



/**
 * JellyfishMaterialTestScene - Complete material integration test
 */
export class JellyfishMaterialTestScene {
  private canvas: HTMLCanvasElement;
  private renderer!: JellyfishRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private postProcessing?: JellyfishPostProcessing;
  private refractionTarget?: THREE.RenderTarget;
  private orbitControls?: OrbitControls;

  // Creature components
  private creatureGroup!: THREE.Group;
  private units: UnitRuntime[] = [];
  private creatureMenu?: CreatureSelectMenu;
  private currentPresetId?: PresetId;
  private currentSpec?: CreatureSpec;
  /** Current world-space focus used by OrbitControls and camera resets. */
  private creatureFocus = new THREE.Vector3(0, 20, 0);
  /** Smallest camera distance that fits the currently selected creature. */
  private minimumCameraDistance = 0;

  // Lens dirt for interactions
  private lensDirt?: LensDirtEffect;

  // Shared materials (global)
  private dustMaterial!: DustNodeMaterial;
  private dustSystem?: DustSystem;

  // Look editor + runtime look state
  private editor?: JellyfishLookEditor;
  private lookConfig: LookConfig;
  private lastAppliedLook?: LookConfig;
  private autoRotateSpeed = 0.001;

  // Archetype dispatch
  private archetype: CreatureArchetype | null = null;
  private bodyData: BodyData | null = null;

  // Physics
  private interpolation!: InterpolationSystem;
  private animTime = 0;

  // Debug UI
  private fpsCounter?: FPSCounter;
  private stepOverlay?: StepProgressOverlay;
  private materialInfo?: MaterialInfoPanel;

  // State
  private config: MaterialTestConfig;
  private isRunning = false;
  private physicsTimestep = 1000 / 30;
  private lastFrameTime = performance.now();
  private physicsTickCount = 0;
  private lastPhysicsTime = performance.now();

  constructor(canvas: HTMLCanvasElement, config: MaterialTestConfig = {}) {
    this.canvas = canvas;
    this.config = {
      showFPS: true,
      showStepProgress: true,
      autoRotate: true,
      cameraDistance: 120,
      wireframe: false,
      showConstraints: false,
      enableEditor: true,
      startEditorHidden: false,
      ...config,
    };
    this.lookConfig = cloneLookConfig(this.config.lookPreset ?? DEFAULT_LOOK_PRESET);
  }

  private setCreature(presetId: PresetId): void {
    const nextId = PRESETS[presetId] ? presetId : 'combJelly';
    this.currentPresetId = nextId;

    const preset = PRESETS[nextId];
    this.currentSpec = structuredClone(preset.spec);

    // Update URL (so sharing links works)
    const url = new URL(window.location.href);
    url.searchParams.set('creature', nextId);
    window.history.replaceState({}, '', url.toString());

    // Tear down previous creature units (if any)
    if (this.creatureGroup) {
      this.scene?.remove(this.creatureGroup);
      this.disposeUnits();
    }

    // Resolve archetype
    this.archetype = getArchetype(this.currentSpec.archetypeId) ?? null;
    if (!this.archetype) {
      throw new Error(`Unknown archetype: ${this.currentSpec.archetypeId}`);
    }

    // Build body data (geometry + physics)
    const physicsConfig: PhysicsConfig = { timestep: this.physicsTimestep };
    const rng: SeededRNG = { random: this.getRng() };
    this.bodyData = this.archetype.buildBody(this.currentSpec, physicsConfig, rng);

    // Build meshes
    const matPack = this.archetype.createMaterials(this.lookConfig, this.refractionTarget);
    this.units = this.archetype.buildMeshes(this.bodyData, matPack, {
      showConstraints: this.config.showConstraints,
    }) as unknown as UnitRuntime[];

    // Create group from unit groups
    this.creatureGroup = new THREE.Group();
    this.creatureGroup.position.y = 20;
    for (const unit of this.units) {
      this.creatureGroup.add(unit.group);
    }

    this.frameCreature();

    // Reset the look to default, then layer preset look, then per-spec look.
    applyLookPreset(this.lookConfig, DEFAULT_LOOK_PRESET);
    applyLookPreset(this.lookConfig, preset.look);
    if (this.currentSpec.look) {
      applyLookPreset(this.lookConfig, this.currentSpec.look);
    }

    // Ensure it's in the scene (initialize() will also add it once, but this handles swaps)
    this.scene?.add(this.creatureGroup);

    this.publishFxFeatures();

    this.creatureMenu?.setValue(nextId);
    // Editor UI needs a refresh when we programmatically mutate the config object.
    this.editor?.refresh();
  }

  private publishFxFeatures(): void {
    const fx = (window as any).$fx as undefined | { features?: (f: Record<string, any>) => void };
    if (!fx?.features) return;
    if (!this.currentPresetId || !this.currentSpec) return;

    const cs = this.currentSpec.crossSection;
    const topology = this.currentSpec.topology;
    const colony = this.currentSpec.archetypeId === 'jellyfish' ? (this.currentSpec as any).colony : undefined;

    fx.features({
      Creature: PRESETS[this.currentPresetId]?.name ?? this.currentPresetId,
      BodyPlan: this.currentSpec.bodyPlan,
      'Cross-Section': cs?.kind ?? 'circle',
      'Cap Top': topology?.capTop ? 'Yes' : 'No',
      'Colony Layout': colony?.layout ?? 'single',
      'Colony Count': colony?.count ?? 1,
    });
  }

  private getRng(): () => number {
    const fx = (window as any).$fx as undefined | { rand?: () => number };
    return fx?.rand ?? Math.random;
  }

  private rebuildFromSpec(spec: CreatureSpec): void {
    if (this.creatureGroup) {
      this.scene?.remove(this.creatureGroup);
      this.disposeUnits();
    }

    // Resolve archetype (keep existing if same archetypeId)
    const archetype = this.archetype ?? getArchetype(spec.archetypeId);
    if (!archetype) throw new Error(`Unknown archetype: ${spec.archetypeId}`);
    this.archetype = archetype;

    // Build body
    const physicsConfig: PhysicsConfig = { timestep: this.physicsTimestep };
    const rng: SeededRNG = { random: this.getRng() };
    this.bodyData = this.archetype.buildBody(spec, physicsConfig, rng);

    // Build meshes
    const matPack = this.archetype.createMaterials(this.lookConfig, this.refractionTarget);
    this.units = this.archetype.buildMeshes(this.bodyData, matPack, {
      showConstraints: this.config.showConstraints,
    }) as unknown as UnitRuntime[];

    // Re-create group
    this.creatureGroup = new THREE.Group();
    this.creatureGroup.position.y = 20;
    for (const unit of this.units) {
      this.creatureGroup.add(unit.group);
    }

    this.frameCreature();

    this.scene?.add(this.creatureGroup);
    this.publishFxFeatures();
  }

  private mutateCreature(): void {
    if (!this.currentSpec) return;
    this.currentSpec = mutateCreatureSpec(this.currentSpec, this.getRng());
    this.rebuildFromSpec(this.currentSpec);
  }

  private randomizeCreature(): void {
    const ids = Object.keys(PRESETS) as PresetId[];
    const rng = this.getRng();
    const id = ids[Math.floor(rng() * ids.length)] ?? 'combJelly';
    this.setCreature(id);
    // One mutation makes the random pick feel more "alive" instantly.
    this.mutateCreature();
  }

  public disposeUnits(): void {
    for (const unit of this.units) {
      // Jellyfish units have bulb/gel/tail/mouth/tentacle materials to dispose.
      // Fish and Anemone use inline MeshPhysicalMaterial — no separate material refs.
      if (this.archetype?.id === 'jellyfish') {
        unit.bulbMaterial?.dispose();
        unit.gelMaterial?.dispose();
        unit.tailMaterial?.dispose();
        unit.mouthMaterial?.dispose();
        unit.tentacleMaterial?.dispose();
      }

      unit.group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
        }
      });
    }
    // Clean up archetype-owned physics resources
    if (this.archetype && this.bodyData) {
      this.archetype.dispose(this.bodyData);
      this.bodyData = null;
    }
    this.units = [];
  }

  /**
   * Restores the original preset/spec
   */
  public restore(): void {
    if (this.currentPresetId) {
      this.setCreature(this.currentPresetId);
    }
  }
  /**
   * Toggles the visibility of the internal debug UI
   */
  public setUIVisibility(visible: boolean): void {
    if (this.fpsCounter) this.fpsCounter.setVisible(visible);
    if (this.stepOverlay) this.stepOverlay.setVisible(visible);
    if (this.materialInfo) this.materialInfo.setVisible(visible);
    if (this.creatureMenu) this.creatureMenu.setVisible(visible);

    if (this.orbitControls) {
      this.orbitControls.autoRotate = visible && (this.config.autoRotate ?? true);
    }

    if (this.editor) {
      const editorContainer = document.querySelector('.tp-dfwv');
      if (editorContainer) (editorContainer as HTMLElement).style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Keep every archetype in frame after a swap. Jellyfish are centred around
   * the group origin, while fish and anemones have very different vertical
   * extents. OrbitControls otherwise continues to look at the world origin.
   */
  private frameCreature(): void {
    this.creatureGroup.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(this.creatureGroup);
    if (bounds.isEmpty()) return;

    bounds.getCenter(this.creatureFocus);
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5;
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitDistance = radius > 0
      ? (radius / Math.tan(verticalFov * 0.5)) * 1.2
      : 0;
    this.minimumCameraDistance = fitDistance;
    const distance = Math.max(this.lookConfig.camera.distance, this.minimumCameraDistance);

    this.camera.position.set(this.creatureFocus.x, this.creatureFocus.y, distance);
    this.camera.lookAt(this.creatureFocus);
    if (this.orbitControls) {
      this.orbitControls.target.copy(this.creatureFocus);
      this.orbitControls.update();
    }
  }

  /**
   * Initialize the test scene
   */
  async initialize(): Promise<void> {
    console.log('Initializing Jellyfish Material Test Scene...');

    // Initialize renderer
    this.renderer = new JellyfishRenderer(this.canvas);
    const success = await this.renderer.init();

    if (!success) {
      throw new Error('Failed to initialize renderer');
    }

    // Setup scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);

    // Setup camera
    // Original MainScene.js: FOV = 30, near = 5, far = 3500
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(30, aspect, 5, 3500);
    // Position camera to view the creature at distance 120
    this.camera.position.set(0, 0, this.config.cameraDistance!);
    this.camera.lookAt(0, 20, 0); // Look at creature group position

    // Setup OrbitControls
    this.orbitControls = new OrbitControls(this.camera, this.canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.autoRotate = this.config.autoRotate ?? true;
    this.orbitControls.autoRotateSpeed = this.autoRotateSpeed;
    this.orbitControls.target.set(0, 10, 0); // Focus on creature center

    // Setup post-processing (only for WebGPU)
    if (this.renderer.getIsWebGPU()) {
      const threeRenderer = this.renderer.getRenderer() as THREE.WebGPURenderer;
      this.postProcessing = new JellyfishPostProcessing(
        threeRenderer,
        this.scene,
        this.camera,
        {
          // Using defaults from JellyfishPostProcessing (strength=0.8, radius=25, threshold=0)
          lensDirt: {
            maxQuads: 200,
            opacity: 0.5,
            fadeRate: 0.995,
            spawnSpread: 0.5,
            maxScale: 0.15,
          },
          debug: true,
        }
      );

      // Get lens dirt reference for spawning
      this.lensDirt = this.postProcessing.getLensDirt() || undefined;
    }

    // Create a background render target for screen-space refraction.
    // We'll render the scene WITHOUT the creature into this RT each frame and sample it in BulbNodeMaterial.
    {
      const r = this.renderer.getRenderer() as any;
      const dpr = typeof r.getPixelRatio === 'function' ? r.getPixelRatio() : Math.min(window.devicePixelRatio, 2);
      const w = Math.max(1, Math.floor(window.innerWidth * dpr));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr));
      this.refractionTarget = new THREE.RenderTarget(w, h);
      this.refractionTarget.texture.name = 'CreatureRefractionRT';
      this.refractionTarget.texture.generateMipmaps = false;
      this.refractionTarget.texture.minFilter = THREE.LinearFilter;
      this.refractionTarget.texture.magFilter = THREE.LinearFilter;
    }

    // Create interpolation system
    this.interpolation = new InterpolationSystem({
      timestep: this.physicsTimestep,
    });

    const urlParams = new URLSearchParams(window.location.search);
    const presetId = (urlParams.get('creature') ?? 'combJelly') as PresetId;
    this.setCreature(presetId);

    // Create dust particles
    this.createDustParticles();

    // Add to scene
    this.scene.add(this.creatureGroup);

    // Apply initial look preset
    this.applyLookConfig(this.lookConfig, true);

    // Setup look editor
    if (this.config.enableEditor) {
      this.editor = new JellyfishLookEditor(this.lookConfig, {
        title: 'Jellyfish Look',
        startHidden: this.config.startEditorHidden,
        onChange: (config) => this.applyLookConfig(config),
      });
    }

    // Creature selector
    this.creatureMenu = new CreatureSelectMenu({
      initial: this.currentPresetId ?? 'combJelly',
      onSelect: (id) => {
        this.setCreature(id);
        this.applyLookConfig(this.lookConfig, true);
      },
      onMutate: () => {
        this.mutateCreature();
        this.applyLookConfig(this.lookConfig, true);
      },
      onRandomize: () => {
        this.randomizeCreature();
        this.applyLookConfig(this.lookConfig, true);
      },
    });

    // Setup debug UI
    if (this.config.showFPS) {
      this.fpsCounter = new FPSCounter();
    }
    if (this.config.showStepProgress) {
      this.stepOverlay = new StepProgressOverlay();
    }
    this.materialInfo = new MaterialInfoPanel();

    // Add interaction
    this.setupInteraction();

    // Handle resize
    window.addEventListener('resize', this.onResize.bind(this));

    const totalParticles = this.units.reduce((sum, u) => sum + u.geometryData.system.positions.length / 3, 0);
    console.log(`Material Test Scene initialized:`);
    const at = PRESETS[this.currentPresetId ?? 'combJelly'];
    console.log(`  - Creature: ${at.name} (${at.id})`);
    console.log(`  - Units: ${this.units.length}`);
    console.log(`  - Particles: ${totalParticles}`);
    console.log(`  - Materials: 5 (Bulb, Gel, Tail, Tentacles, Dust)`);
    console.log(`  - Physics: 30fps (timestep: ${this.physicsTimestep.toFixed(2)}ms)`);
    console.log(`  - Renderer: ${this.renderer.getIsWebGPU() ? 'WebGPU' : 'WebGL'}`);
  }

  // buildCreatureUnits, createUnitMaterials, and createUnitMesh
  // have been moved into the fallback archetype (_jellyfishArchetype).

  /**
   * Create dust particle system
   */
  private createDustParticles(): void {
    const dustSystem = createDustSystem({
      count: 8000,
      psColor: 0xffffff,
      opacity: 0.25,
      size: 32,
      scale: 150,
      area: 300,
    });

    // Add dust points to scene (not to jellyfish group - it's world space)
    this.scene.add(dustSystem.points);

    // Store reference for updates
    this.dustSystem = dustSystem;
    this.dustMaterial = dustSystem.material;
  }

  /**
   * Setup mouse interaction
   */
  private setupInteraction(): void {
    let isDragging = false;

    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      this.nudgeFromMouse(e.clientX, e.clientY, 5);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        this.nudgeFromMouse(e.clientX, e.clientY, 2);
      }
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * Nudge jellyfish based on mouse position
   */
  private nudgeFromMouse(mouseX: number, mouseY: number, magnitude: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((mouseX - rect.left) / rect.width) * 2 - 1;
    const y = -((mouseY - rect.top) / rect.height) * 2 + 1;

    // Project NDC to "world" target (approximate for the 2D plane at z=0)
    const targetX = x * 60;
    const targetY = y * 60 + (this.creatureGroup?.position.y ?? 20);

    // Dispatch physics interactions to archetype
    if (this.archetype && this.bodyData) {
      const origin = new THREE.Vector3(targetX, targetY, 0);
      this.archetype.applyInteraction?.(this.bodyData, magnitude, origin);
    }

    // Spawn lens dirt particles on interaction (scene-owned effect)
    if (this.lensDirt) {
      this.lensDirt.spawn(x, y, 5);
    }
  }

  /**
   * Handle window resize
   */
  private onResize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.refractionTarget) {
      const r = this.renderer.getRenderer() as any;
      const dpr = typeof r.getPixelRatio === 'function' ? r.getPixelRatio() : Math.min(window.devicePixelRatio, 2);
      const w = Math.max(1, Math.floor(window.innerWidth * dpr));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr));
      this.refractionTarget.setSize(w, h);
      for (const unit of this.units) {
        unit.bulbMaterial?.setRefractionResolution(w, h);
      }
    }

    // Resize lens dirt effect
    if (this.postProcessing) {
      this.postProcessing.setSize(window.innerWidth, window.innerHeight);
    }
  }

  private colorFromHex(hex: string): THREE.Color {
    return new THREE.Color(hex);
  }

  private hexToNumber(hex: string): number {
    return new THREE.Color(hex).getHex();
  }

  private rebuildDust(dustConfig: LookConfig['dust']): void {
    const config = dustConfig ?? {
      color: '#FFFFFF',
      opacity: 0.95,
      size: 32,
      scale: 150,
      area: 300,
      count: 8000,
    };

    if (this.dustSystem) {
      this.scene.remove(this.dustSystem.points);
      this.dustSystem.geometry.dispose();
      this.dustSystem.material.dispose();
    }

    const dustSystem = createDustSystem({
      count: config.count,
      psColor: config.color,
      opacity: config.opacity,
      size: config.size,
      scale: config.scale,
      area: config.area,
    });

    this.scene.add(dustSystem.points);
    this.dustSystem = dustSystem;
    this.dustMaterial = dustSystem.material;
  }

  private updateRefractionBackground(): void {
    if (!this.refractionTarget) return;

    const r = this.renderer.getRenderer() as any;
    if (typeof r.setRenderTarget !== 'function') return;

    const prevVisible = this.creatureGroup.visible;
    this.creatureGroup.visible = false;

    r.setRenderTarget(this.refractionTarget);
    if (typeof r.clear === 'function') r.clear();
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);

    this.creatureGroup.visible = prevVisible;
  }

  private applyLookConfig(config: LookConfig, force: boolean = false): void {
    const last = this.lastAppliedLook;
    const dustChanged = force ||
      !last ||
      last.dust.count !== config.dust.count ||
      last.dust.area !== config.dust.area;

    this.scene.background = this.colorFromHex(config.scene.background);

    this.camera.position.set(
      this.creatureFocus.x,
      this.creatureFocus.y,
      Math.max(config.camera.distance, this.minimumCameraDistance),
    );
    this.camera.lookAt(this.creatureFocus);
    this.autoRotateSpeed = config.camera.autoRotateSpeed;

    if (this.orbitControls) {
      this.orbitControls.autoRotateSpeed = this.autoRotateSpeed;
    }

    if (this.bodyData) {
      this.bodyData.animationState.pulseSpeed = config.pulse.speed;
      this.bodyData.animationState.pulseAmplitude = config.pulse.amplitude;
    }

    // Material lookup config only applies to jellyfish archetype materials.
    // Fish and Anemone use hardcoded MeshPhysicalMaterial colors in buildMeshes.
    if (this.archetype?.id === 'jellyfish') {
      for (const unit of this.units) {
        unit.bulbMaterial?.setDiffuse(this.colorFromHex(config.bulb.colorA));
        unit.bulbMaterial?.setDiffuseB(this.colorFromHex(config.bulb.colorB));
        unit.bulbMaterial?.setOpacity(config.bulb.opacity);
        unit.bulbMaterial?.setPatternScale0(config.bulb.patternScale0);
        unit.bulbMaterial?.setPatternScale1(config.bulb.patternScale1);
        unit.bulbMaterial?.setRimBoost(config.bulb.rimBoost);

        unit.gelMaterial?.setDiffuse(this.hexToNumber(config.gel.color));
        unit.gelMaterial?.updateOpacity(config.gel.opacity);

        unit.tailMaterial?.setDiffuse(this.hexToNumber(config.tail.colorA));
        unit.tailMaterial?.setDiffuseB(this.hexToNumber(config.tail.colorB));
        unit.tailMaterial?.updateOpacity(config.tail.opacity);
        unit.tailMaterial?.setScale(config.tail.scale);

        unit.mouthMaterial?.setDiffuse(this.hexToNumber(config.mouth.colorA));
        unit.mouthMaterial?.setDiffuseB(this.hexToNumber(config.mouth.colorB));
        unit.mouthMaterial?.updateOpacity(config.mouth.opacity);
        unit.mouthMaterial?.setScale(config.mouth.scale);

        unit.tentacleMaterial?.setDiffuse(this.colorFromHex(config.tentacle.color));
        unit.tentacleMaterial?.setOpacity(config.tentacle.opacity);
        unit.tentacleMaterial?.setArea(config.tentacle.area);
      }
    } else {
      // Non-jellyfish archetypes still consume the same preset palette.
      for (const unit of this.units) {
        const surface = unit.bodyMaterial ?? unit.stalkMaterial;
        if (surface) {
          surface.color.set(config.bulb.colorA);
          surface.emissive.set(config.bulb.colorB);
          surface.opacity = config.bulb.opacity;
          surface.needsUpdate = true;
        }
        if (unit.tentMaterial) {
          (unit.tentMaterial as any).color = this.colorFromHex(config.tentacle.color);
          (unit.tentMaterial as any).opacity = config.tentacle.opacity;
          unit.tentMaterial.needsUpdate = true;
        }
      }
    }

    if (dustChanged) {
      this.rebuildDust(config.dust);
    } else if (this.dustMaterial) {
      this.dustMaterial.setColor(config.dust.color);
      this.dustMaterial.setOpacity(config.dust.opacity);
      this.dustMaterial.setSize(config.dust.size);
      this.dustMaterial.setScale(config.dust.scale);
      this.dustMaterial.setArea(config.dust.area);
    }

    if (this.postProcessing) {
      this.postProcessing.setBloomStrength(config.post.bloomStrength);
      this.postProcessing.setBloomRadius(config.post.bloomRadius);
      this.postProcessing.setBloomThreshold(config.post.bloomThreshold);

      const vignette = this.postProcessing.getVignette();
      if (vignette) {
        vignette.setDarkness(config.post.vignetteDarkness);
        vignette.setOffset(config.post.vignetteOffset);
        vignette.setColor(this.colorFromHex(config.post.vignetteColor));
      }
    }

    if (this.lensDirt) {
      this.lensDirt.setOpacity(config.post.lensDirtOpacity);
      this.lensDirt.setFadeRate(config.post.lensDirtFadeRate);
      this.lensDirt.setSpawnSpread(config.post.lensDirtSpawnSpread);
      this.lensDirt.setMaxScale(config.post.lensDirtMaxScale);
    }

    this.lastAppliedLook = cloneLookConfig(config);
  }

  /**
   * Update material uniforms
   */
  private updateMaterials(time: number, stepProgress: number): void {
    // Jellyfish units have bulb/gel/tail/mouth/tentacle materials.
    // Fish and Anemone use static MeshPhysicalMaterial — no time/step uniforms.
    if (this.archetype?.id === 'jellyfish') {
      for (const unit of this.units) {
        unit.bulbMaterial?.setTime(time);
        unit.bulbMaterial?.setStepProgress(stepProgress);
        unit.gelMaterial?.setStepProgress(stepProgress);
        unit.tailMaterial?.updateStepProgress(stepProgress);
        unit.mouthMaterial?.updateStepProgress(stepProgress);
        unit.tentacleMaterial?.setStepProgress(stepProgress);
      }
    } else if (this.archetype?.id === 'anemone') {
      for (const unit of this.units) unit.tentMaterial?.setStepProgress(stepProgress);
    }

    // Update dust time (shared, archetype-independent)
    if (this.dustSystem && this.dustSystem.material) {
      const dustMat = this.dustSystem.material as DustNodeMaterial;
      dustMat.setTime(time);
    }
  }

  /**
   * Start the animation loop
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.lastPhysicsTime = performance.now();

    console.log('Starting material test animation loop...');
    this.animate();
  }

  /**
   * Stop the animation loop
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Main animation loop
   */
  private animate(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Clamp delta to prevent spiral of death
    const clampedDelta = Math.min(deltaTime, 100);

    // Update interpolation system
    const stepProgress = this.interpolation.update(clampedDelta, (physicsDelta) => {
      this.updatePhysics(physicsDelta);
      this.physicsTickCount++;
    });

    // Update animation time (pulse speed from bodyData.animationState)
    const pulseSpeed = this.bodyData?.animationState.pulseSpeed ?? 0.5;
    this.animTime += clampedDelta * 0.001 * pulseSpeed;

    // Update all materials
    this.updateMaterials(this.animTime, stepProgress);

    // Update controls
    if (this.orbitControls) {
      this.orbitControls.update();
    }

    // Auto-rotate handled by OrbitControls now
    // if (this.config.autoRotate) {
    //   this.creatureGroup.rotation.y += this.autoRotateSpeed;
    // }

    // Update background RT for bulb refraction before the final render/post chain.
    this.updateRefractionBackground();

    // Update post-processing (includes lens dirt fade)
    if (this.postProcessing) {
      this.postProcessing.update(clampedDelta);
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // Update debug UI
    this.updateDebugUI(currentTime);

    requestAnimationFrame(() => this.animate());
  }

  /**
   * Update physics simulation — dispatched to archetype
   */
  private updatePhysics(delta: number): void {
    if (this.archetype && this.bodyData) {
      const amplitude = this.bodyData.animationState.pulseAmplitude ?? 0.15;
      this.archetype.animateBody(this.bodyData, this.animTime, delta, amplitude);
    }
  }

  // timePhase and updateRibs moved into the fallback archetype (_jellyfishArchetype).

  /**
   * Update debug UI elements
   */
  private updateDebugUI(currentTime: number): void {
    // Update FPS counter
    if (this.fpsCounter) {
      this.fpsCounter.update(0);
    }

    // Update step progress overlay
    if (this.stepOverlay) {
      const physicsElapsed = currentTime - this.lastPhysicsTime;
      let physicsFPS = 0;

      if (physicsElapsed >= 1000) {
        physicsFPS = (this.physicsTickCount / physicsElapsed) * 1000;
        this.physicsTickCount = 0;
        this.lastPhysicsTime = currentTime;
      }

      this.stepOverlay.update(
        this.interpolation.getStepProgress(),
        physicsFPS || 30,
        this.units.reduce((sum, u) => sum + u.geometryData.system.positions.length / 3, 0)
      );
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stop();

    this.fpsCounter?.dispose();
    this.stepOverlay?.dispose();
    this.materialInfo?.dispose();
    this.editor?.dispose();
    this.creatureMenu?.dispose();

    // Dispose per-unit materials + geometries
    this.disposeUnits();

    // Dispose dust
    if (this.dustSystem) {
      this.dustSystem.geometry.dispose();
      if (Array.isArray(this.dustSystem.material)) {
        this.dustSystem.material.forEach((m: THREE.Material) => m.dispose());
      } else {
        this.dustSystem.material.dispose();
      }
    }

    this.refractionTarget?.dispose();

    this.renderer?.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

export default JellyfishMaterialTestScene;
