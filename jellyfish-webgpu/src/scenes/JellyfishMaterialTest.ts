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
import * as Particulate from 'particulate';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { JellyfishRenderer } from '../jellyfish/JellyfishRenderer';
import { JellyfishGeometry, JellyfishGeometryData } from '../jellyfish/JellyfishGeometry';
import { InterpolationSystem } from '../systems/physics-bridge';
import {
  BulbNodeMaterial,
  TentacleNodeMaterial,
  TailNodeMaterial,
  GelNodeMaterial,
  DustNodeMaterial,
  createDustSystem,
  InterpolatedLineMaterial
} from '../jellyfish/materials';
import { JellyfishPostProcessing, LensDirtEffect } from '../post-processing';
import { JellyfishLookEditor } from '../editor/JellyfishLookEditor';
import { LookConfig, DEFAULT_LOOK_PRESET, cloneLookConfig, applyLookPreset } from '../editor/look-presets';
import {
  ARCHETYPES,
  type ArchetypeId,
  createCreatureRig,
  type CreatureRig,
  mutateCreatureSpec,
  type CreatureSpec,
} from '../jellyfish/creatures';
import { CreatureSelectMenu } from '../ui/CreatureSelectMenu';
import { CreatureAssembler } from '../jellyfish/builder/CreatureAssembler';
import type { CreatureGraph } from '../jellyfish/graph/CreatureGraph';
import type { FormDefinition } from '../jellyfish/graph/FormDefinition';

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
  geometryData: JellyfishGeometryData;
  group: THREE.Group;
  bulbMaterial: BulbNodeMaterial;
  gelMaterial: GelNodeMaterial;
  tailMaterial?: TailNodeMaterial;
  mouthMaterial?: TailNodeMaterial;
  tentacleMaterial?: TentacleNodeMaterial;
}

interface CustomPhysicsRuntime {
  system: Particulate.ParticleSystem;
  ribs: {
    constraint: Particulate.DistanceConstraint,
    initialDist: number[],
    v: number
  }[];
  radials: {
    constraint: Particulate.DistanceConstraint,
    initialDist: number[],
    v: number
  }[];
  geometry: THREE.BufferGeometry;
  position: THREE.BufferAttribute;
  positionPrev: THREE.BufferAttribute;

  // Instance-level tuning
  pulseAmplitude: number;
  pulseWave: number;    // 0 = uniform, > 0 = wave factor
  stiffness: number;
  damping: number;
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
  private creatureRig!: CreatureRig;
  private creatureGroup!: THREE.Group;
  private units: UnitRuntime[] = [];
  private customMaterials: BulbNodeMaterial[] = [];
  private customPhysics: CustomPhysicsRuntime[] = [];
  private creatureMenu?: CreatureSelectMenu;
  private currentArchetypeId?: ArchetypeId;
  private currentSpec?: CreatureSpec;

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
  private pulseSpeed = 0.5;
  private pulseAmplitude = 0.15;

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

  private setCreature(archetypeId: ArchetypeId): void {
    const nextId = ARCHETYPES[archetypeId] ? archetypeId : 'combJelly';
    this.currentArchetypeId = nextId;

    const archetype = ARCHETYPES[nextId];
    this.currentSpec = structuredClone(archetype.spec);

    // Update URL (so sharing links works)
    const url = new URL(window.location.href);
    url.searchParams.set('creature', nextId);
    window.history.replaceState({}, '', url.toString());

    // Tear down previous creature units (if any)
    if (this.creatureGroup) {
      this.scene?.remove(this.creatureGroup);
      this.disposeUnits();
    }

    // Build creature rig (1 unit for most, multiple units for siphonophore)
    if (nextId === 'customLab') {
      this.loadCustomFromLab();
      return;
    }

    this.creatureRig = createCreatureRig(this.currentSpec);
    if (this.creatureRig.warnings.length > 0) {
      console.warn('[CreatureRig] Validation warnings:', this.creatureRig.warnings);
    }

    // Reset the look to default, then layer archetype look, then per-spec look.
    applyLookPreset(this.lookConfig, DEFAULT_LOOK_PRESET);
    applyLookPreset(this.lookConfig, archetype.look);
    if (this.creatureRig.spec.look) {
      applyLookPreset(this.lookConfig, this.creatureRig.spec.look);
    }

    // Rebuild
    this.buildCreatureUnits(this.creatureRig);

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
    if (!this.currentArchetypeId || !this.currentSpec) return;

    const cs = this.currentSpec.crossSection;
    const topology = this.currentSpec.topology;
    const colony = this.currentSpec.colony;

    fx.features({
      Creature: ARCHETYPES[this.currentArchetypeId]?.name ?? this.currentArchetypeId,
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

    this.creatureRig = createCreatureRig(spec);
    if (this.creatureRig.warnings.length > 0) {
      console.warn('[CreatureRig] Validation warnings:', this.creatureRig.warnings);
    }
    this.buildCreatureUnits(this.creatureRig);
    this.scene?.add(this.creatureGroup);
    this.publishFxFeatures();
  }

  private mutateCreature(): void {
    if (!this.currentSpec) return;
    this.currentSpec = mutateCreatureSpec(this.currentSpec, this.getRng());
    this.rebuildFromSpec(this.currentSpec);
  }

  private randomizeCreature(): void {
    const ids = Object.keys(ARCHETYPES) as ArchetypeId[];
    const rng = this.getRng();
    const id = ids[Math.floor(rng() * ids.length)] ?? 'combJelly';
    this.setCreature(id);
    // One mutation makes the random pick feel more "alive" instantly.
    this.mutateCreature();
  }

  /**
   * Updates the displayed creature from a CreatureGraph (Visual Builder Mode)
   */
  public updateFromGraph(graph: CreatureGraph, forms: FormDefinition[]): void {
    if (this.creatureGroup) {
      this.scene?.remove(this.creatureGroup);
      this.disposeUnits(); // Clean up physics units
    }

    // Use the Assembler to build the visual representation
    const assembler = new CreatureAssembler(forms);
    const { group, materials, physics } = assembler.assemble(graph);
    this.creatureGroup = group;
    this.customMaterials = materials;

    // Initialize Custom Physics
    const system = Particulate.ParticleSystem.create(Array.from(physics.particles), 2);

    // Get physics config from root form if available
    const rootNode = graph.root;
    const rootForm = (rootNode && rootNode.type === 'Part') ? forms.find(f => f.id === rootNode.formId) : null;
    const physicsConfig = rootForm?.physics;

    const ribRuntime: { constraint: Particulate.DistanceConstraint, initialDist: number[], v: number }[] = [];
    const radRuntime: { constraint: Particulate.DistanceConstraint, initialDist: number[], v: number }[] = [];

    // Map rib start indices to v for radial lookups
    const ribMap = new Map<number, { v: number }>();
    physics.ribs.forEach(r => ribMap.set(r.start, { v: r.v }));

    // Stiffness logic: 1.0 (default) = 0.8 to 1.2 range. Higher = tighter.
    const stiffness = physicsConfig?.stiffness ?? 1.0;
    const spread = 0.2 / stiffness;
    const rangeMin = 1.0 - spread;
    const rangeMax = 1.0 + spread;

    physics.constraints.forEach(c => {
      const avgDist = c.distances[0];
      const constraint = Particulate.DistanceConstraint.create([avgDist * rangeMin, avgDist * rangeMax], c.indices);
      system.addConstraint(constraint);

      // Check if this matches a rib for pulsing
      const ribInfo = ribMap.get(c.indices[0]);
      if (ribInfo && c.indices.length === 2 && Math.abs(c.indices[0] - c.indices[1]) === 1) {
        // This is a horizontal ring segment
        ribRuntime.push({ constraint, initialDist: [avgDist * 0.8, avgDist * 1.2], v: ribInfo.v });
      }
    });

    physics.radials.forEach(r => {
      const avgDist = r.distances[0];
      const constraint = Particulate.DistanceConstraint.create([avgDist * rangeMin, avgDist * rangeMax], r.indices);
      system.addConstraint(constraint);

      const rimPoint = r.indices[1];
      const ribInfo = physics.ribs.find(rb => rimPoint >= rb.start && rimPoint < rb.start + rb.count);
      radRuntime.push({ constraint, initialDist: [avgDist * 0.8, avgDist * 1.2], v: ribInfo?.v ?? 0 });
    });

    // Add Spine Constraints (vertical center-to-center)
    physics.spine?.forEach(s => {
      const avgDist = s.distances[0];
      const constraint = Particulate.DistanceConstraint.create([avgDist * rangeMin, avgDist * rangeMax], s.indices);
      system.addConstraint(constraint);
    });

    // Add Axis Constraints (to keep spine straight but flexible)
    physics.axis?.forEach(a => {
      if (a.indices.length >= 3) {
        const top = a.indices[0];
        const bot = a.indices[a.indices.length - 1];
        const mid = a.indices.slice(1, -1);
        const axis = Particulate.AxisConstraint.create(top, bot, mid);
        system.addConstraint(axis);
      }
    });

    // Apply System-level damping (Note: Particulate API might vary, commenting out for now)
    // system.damping = physicsConfig?.damping ?? 0.05;

    // Apply Gravity if set
    // if (physicsConfig?.gravity) {
    //   system.gravity.set(0, physicsConfig.gravity, 0);
    // }

    // Add pinning for anchors
    const topPin = Particulate.PointConstraint.create([0, 0, 0], physics.anchors.top);
    system.addPinConstraint(topPin);

    // Optional: pin mid/bottom for more stability if needed (matches Salp legacy)
    // const midPin = Particulate.PointConstraint.create([0, 0, 0], physics.anchors.mid);
    // system.addPinConstraint(midPin);

    // Get the mesh to update its attributes
    const mesh = group.children[0] as THREE.Mesh;

    // IMPORTANT: Shaders need these specific buffers to animate
    const position = new THREE.BufferAttribute(system.positions, 3);
    const positionPrev = new THREE.BufferAttribute(system.positionsPrev, 3);

    mesh.geometry.setAttribute('position', position);
    mesh.geometry.setAttribute('positionPrev', positionPrev);

    // IMPORTANT: Shaders need these specific buffers to animate

    this.customPhysics = [{
      system,
      ribs: ribRuntime,
      radials: radRuntime,
      geometry: mesh.geometry,
      position,
      positionPrev,
      pulseAmplitude: physicsConfig?.pulseAmplitude ?? this.pulseAmplitude,
      pulseWave: physicsConfig?.pulseWave ?? 0, // Default to uniform for Salp-like behavior if 0
      stiffness: physicsConfig?.stiffness ?? 1.0,
      damping: physicsConfig?.damping ?? 0.05
    }];

    // Position it centrally
    this.creatureGroup.position.y = 0;

    // Add to scene
    this.scene?.add(this.creatureGroup);

    console.log('[Scene] Updated from Graph:', graph);
  }

  private loadCustomFromLab(): void {
    try {
      const stored = localStorage.getItem('jelly_saved_forms');
      if (!stored) {
        console.warn('[Scene] No custom forms found in localStorage');
        return;
      }

      const library = JSON.parse(stored);
      const names = Object.keys(library);
      if (names.length === 0) return;

      // Prioritize "icecream" as requested, otherwise take last
      const name = names.includes('icecream') ? 'icecream' : names[names.length - 1];
      const form = library[name] as FormDefinition;

      console.log(`[Scene] Loading custom form from Lab: "${name}"`);

      // Wrap in a simple graph
      const graph: CreatureGraph = {
        root: {
          id: 'root',
          type: 'Part',
          formId: form.id,
          children: []
        }
      };

      this.updateFromGraph(graph, [form]);

    } catch (e) {
      console.error('[Scene] Failed to load custom form', e);
    }
  }

  public disposeUnits(): void {
    for (const unit of this.units) {
      unit.bulbMaterial.dispose();
      unit.gelMaterial.dispose();
      unit.tailMaterial?.dispose();
      unit.mouthMaterial?.dispose();
      unit.tentacleMaterial?.dispose();

      unit.group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
        }
      });
    }
    this.units = [];
  }

  /**
   * Restores the original archetype/spec (Exits Builder Mode)
   */
  public restore(): void {
    if (this.currentArchetypeId) {
      this.setCreature(this.currentArchetypeId);
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

    if (this.editor) {
      const editorContainer = document.querySelector('.tp-dfwv');
      if (editorContainer) (editorContainer as HTMLElement).style.display = visible ? 'block' : 'none';
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
    const archetypeId = (urlParams.get('creature') ?? 'combJelly') as ArchetypeId;
    this.setCreature(archetypeId);

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
      initial: this.currentArchetypeId ?? 'combJelly',
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
    const at = ARCHETYPES[this.currentArchetypeId ?? 'combJelly'];
    console.log(`  - Creature: ${at.name} (${at.id})`);
    console.log(`  - Units: ${this.units.length}`);
    console.log(`  - Particles: ${totalParticles}`);
    console.log(`  - Materials: 5 (Bulb, Gel, Tail, Tentacles, Dust)`);
    console.log(`  - Physics: 30fps (timestep: ${this.physicsTimestep.toFixed(2)}ms)`);
    console.log(`  - Renderer: ${this.renderer.getIsWebGPU() ? 'WebGPU' : 'WebGL'}`);
  }

  /**
   * Build creature units (single body or colony)
   */
  private buildCreatureUnits(rig: CreatureRig): void {
    this.units = [];
    this.creatureGroup = new THREE.Group();
    this.creatureGroup.position.y = 20;

    for (const unit of rig.units) {
      const geometryData = JellyfishGeometry.create(unit.spec);
      const materials = this.createUnitMaterials();
      const runtime: UnitRuntime = {
        id: unit.id,
        geometryData,
        group: new THREE.Group(),
        ...materials,
      };

      runtime.group = this.createUnitMesh(runtime);
      runtime.group.position.set(unit.transform.position.x, unit.transform.position.y, unit.transform.position.z);
      runtime.group.scale.setScalar(unit.transform.scale);

      this.units.push(runtime);
      this.creatureGroup.add(runtime.group);
    }
  }

  /**
   * Create materials for a single unit
   */
  private createUnitMaterials(): Omit<UnitRuntime, 'id' | 'geometryData' | 'group'> {
    const bulbMaterial = new BulbNodeMaterial();
    // Default values from original Medusae.js reference
    bulbMaterial.setDiffuse(0xFFA9D2);
    bulbMaterial.setDiffuseB(0x70256C); // Fixed: was 0x90256C
    bulbMaterial.setOpacity(0.75); // Fixed: was 0.65
    if (this.refractionTarget) {
      bulbMaterial.setRefractionTexture(this.refractionTarget.texture);
      bulbMaterial.setRefractionStrength(0); // Start with no refraction
      bulbMaterial.setIor(1.33);
      bulbMaterial.setDispersion(0.03);
      bulbMaterial.setRefractionResolution(this.refractionTarget.width, this.refractionTarget.height);
    }

    const gelMaterial = new GelNodeMaterial({
      diffuse: 0x415AB5,
      opacity: 0.25, // Fixed: was 0.35
    });

    const tailMaterial = new TailNodeMaterial();
    tailMaterial.setDiffuse(0xE4BBEE); // Fixed: was 0x997299
    tailMaterial.setDiffuseB(0x241138); // Fixed: was 0x100515
    tailMaterial.updateOpacity(0.75); // Fixed: was 0.45

    const mouthMaterial = new TailNodeMaterial();
    mouthMaterial.setDiffuse(0xEFA6F0); // Fixed: was 0x997299
    mouthMaterial.setDiffuseB(0x4A67CE); // Fixed: was 0x241138
    mouthMaterial.setScale(3);
    mouthMaterial.updateOpacity(0.65); // Fixed: was 0.45

    const tentacleMaterial = new TentacleNodeMaterial({
      color: 0x997299,
      transparent: true,
      opacity: 0.25, // Fixed: was 0.5
      depthTest: true,
      depthWrite: false,
    });
    tentacleMaterial.setArea(2000); // Fixed: was 2500

    return {
      bulbMaterial,
      gelMaterial,
      tailMaterial,
      mouthMaterial,
      tentacleMaterial,
    };
  }

  /**
   * Create the mesh group for a single unit
   */
  private createUnitMesh(unit: UnitRuntime): THREE.Group {
    const group = new THREE.Group();
    const gd = unit.geometryData;

    // Bulb mesh
    const bulbGeometry = new THREE.BufferGeometry();
    bulbGeometry.setAttribute('position', gd.position);
    bulbGeometry.setAttribute('positionPrev', gd.positionPrev);
    bulbGeometry.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
    bulbGeometry.setAttribute('normal', gd.geometry.attributes.normal);
    bulbGeometry.setIndex(gd.faces.bulb);
    bulbGeometry.computeVertexNormals();
    const bulbMesh = new THREE.Mesh(bulbGeometry, unit.bulbMaterial);
    bulbMesh.scale.setScalar(0.95);
    group.add(bulbMesh);

    // Gel overlay mesh (slightly larger)
    const gelGeometry = new THREE.BufferGeometry();
    gelGeometry.setAttribute('position', gd.position);
    gelGeometry.setAttribute('positionPrev', gd.positionPrev);
    gelGeometry.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
    gelGeometry.setAttribute('normal', gd.geometry.attributes.normal);
    gelGeometry.setIndex(gd.faces.bulb);
    gelGeometry.computeVertexNormals();
    const gelMesh = new THREE.Mesh(gelGeometry, unit.gelMaterial);
    gelMesh.scale.setScalar(1.05);
    group.add(gelMesh);

    // Tail mesh
    if (gd.faces.tail.length > 0 && unit.tailMaterial) {
      const tailGeometry = new THREE.BufferGeometry();
      tailGeometry.setAttribute('position', gd.position);
      tailGeometry.setAttribute('positionPrev', gd.positionPrev);
      tailGeometry.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
      tailGeometry.setAttribute('normal', gd.geometry.attributes.normal);
      tailGeometry.setIndex(gd.faces.tail);
      tailGeometry.computeVertexNormals();
      const tailMesh = new THREE.Mesh(tailGeometry, unit.tailMaterial);
      tailMesh.scale.setScalar(0.95);
      group.add(tailMesh);
    }

    // Mouth mesh
    if (gd.faces.mouth.length > 0 && unit.mouthMaterial) {
      const mouthGeometry = new THREE.BufferGeometry();
      mouthGeometry.setAttribute('position', gd.position);
      mouthGeometry.setAttribute('positionPrev', gd.positionPrev);
      mouthGeometry.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
      mouthGeometry.setAttribute('normal', gd.geometry.attributes.normal);
      mouthGeometry.setIndex(gd.faces.mouth);
      mouthGeometry.computeVertexNormals();
      const mouthMesh = new THREE.Mesh(mouthGeometry, unit.mouthMaterial);
      group.add(mouthMesh);
    }

    // Tentacle lines
    if (gd.links.tentacles.length > 0 && unit.tentacleMaterial) {
      const tentacleGeometry = new THREE.BufferGeometry();
      tentacleGeometry.setAttribute('position', gd.position);
      tentacleGeometry.setAttribute('positionPrev', gd.positionPrev);
      tentacleGeometry.setAttribute('normal', gd.geometry.attributes.normal);
      tentacleGeometry.setIndex(gd.links.tentacles);
      const tentacleLines = new THREE.LineSegments(tentacleGeometry, unit.tentacleMaterial);
      group.add(tentacleLines);
    }

    // LinesFore - smooth curved lines following the surface
    if (gd.links.linesFore.length > 0) {
      const linesForeGeometry = new THREE.BufferGeometry();
      linesForeGeometry.setAttribute('position', gd.position);
      linesForeGeometry.setAttribute('positionPrev', gd.positionPrev);
      linesForeGeometry.setIndex(gd.links.linesFore);

      const linesForeMaterial = new InterpolatedLineMaterial({
        color: 0xffdde9, // Light pink
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });

      const linesFore = new THREE.LineSegments(linesForeGeometry, linesForeMaterial);
      group.add(linesFore);
    }

    // LinesInner - smooth inner structure lines
    if (gd.links.linesInner.length > 0) {
      const linesInnerGeometry = new THREE.BufferGeometry();
      linesInnerGeometry.setAttribute('position', gd.position);
      linesInnerGeometry.setAttribute('positionPrev', gd.positionPrev);
      linesInnerGeometry.setIndex(gd.links.linesInner);

      const linesInnerMaterial = new InterpolatedLineMaterial({
        color: 0xf99ebd, // Muted pink
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });

      const linesInner = new THREE.LineSegments(linesInnerGeometry, linesInnerMaterial);
      group.add(linesInner);
    }

    // Inner constraint lines (for visual structure)
    if (this.config.showConstraints) {
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', gd.position);
      lineGeometry.setAttribute('positionPrev', gd.positionPrev);
      lineGeometry.setIndex(gd.links.bulb);

      const lineMaterial = new InterpolatedLineMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.3,
      });

      const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
      group.add(lineSegments);
    }

    return group;
  }

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
    // Camera is at distance 120, FOV 45
    const targetX = x * 60;
    const targetY = y * 60 + this.creatureGroup.position.y; // group y-offset

    const direction = new THREE.Vector3(x, y, 0).normalize();

    for (const unit of this.units) {
      const { pinConstraints } = unit.geometryData;
      const size = unit.geometryData.config.size;

      // Convert target to unit-local coordinates (unit group is offset under creatureGroup)
      const ux = unit.group.position.x;
      const uy = unit.group.position.y;
      const localX = targetX - ux;
      const localY = targetY - uy;

      // 1. Move the anchor pins (The "Core") - snapping
      pinConstraints.top.setPosition(localX, localY + size, 0);
      pinConstraints.mid.setPosition(localX, localY, 0);
      pinConstraints.bottom.setPosition(localX, localY - size, 0);
      pinConstraints.tail.setPosition(localX, localY - size * 2, 0);
      pinConstraints.tentacle.setPosition(localX, localY - size * 2.5, 0);

      // 2. Apply nudge force to the rest of the body (The "Softness")
      const system = unit.geometryData.system;
      const positions = system.positions;
      const particleCount = positions.length / 3;

      for (let i = 5; i < particleCount; i++) {
        const idx = i * 3;
        const px = positions[idx];
        const pz = positions[idx + 2];
        const dist = Math.sqrt(px * px + pz * pz);
        const factor = Math.min(1, dist / 20) * magnitude;

        positions[idx] += direction.x * factor;
        positions[idx + 1] += direction.y * factor;
        positions[idx + 2] += direction.z * factor;
      }
    }

    // Spawn lens dirt particles on interaction
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
        unit.bulbMaterial.setRefractionResolution(w, h);
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

    this.camera.position.set(0, 0, config.camera.distance);
    this.autoRotateSpeed = config.camera.autoRotateSpeed;

    if (this.orbitControls) {
      this.orbitControls.autoRotateSpeed = this.autoRotateSpeed;
    }

    this.pulseSpeed = config.pulse.speed;
    this.pulseAmplitude = config.pulse.amplitude;

    for (const unit of this.units) {
      unit.bulbMaterial.setDiffuse(this.colorFromHex(config.bulb.colorA));
      unit.bulbMaterial.setDiffuseB(this.colorFromHex(config.bulb.colorB));
      unit.bulbMaterial.setOpacity(config.bulb.opacity);
      unit.bulbMaterial.setPatternScale0(config.bulb.patternScale0);
      unit.bulbMaterial.setPatternScale1(config.bulb.patternScale1);
      unit.bulbMaterial.setRimBoost(config.bulb.rimBoost);

      unit.gelMaterial.setDiffuse(this.hexToNumber(config.gel.color));
      unit.gelMaterial.updateOpacity(config.gel.opacity);

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
    // Update time-based materials
    for (const unit of this.units) {
      unit.bulbMaterial.setTime(time);
    }

    for (const mat of this.customMaterials) {
      mat.setTime(time);
    }

    // Update dust time
    if (this.dustSystem && this.dustSystem.material) {
      const dustMat = this.dustSystem.material as DustNodeMaterial;
      dustMat.setTime(time);
    }

    // Update step progress for all interpolated materials
    for (const unit of this.units) {
      unit.bulbMaterial.setStepProgress(stepProgress);
      unit.gelMaterial.setStepProgress(stepProgress);
      unit.tailMaterial?.updateStepProgress(stepProgress);
      unit.mouthMaterial?.updateStepProgress(stepProgress);
      unit.tentacleMaterial?.setStepProgress(stepProgress);
    }

    for (const mat of this.customMaterials) {
      mat.setStepProgress(stepProgress);
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

    // Update animation time
    this.animTime += clampedDelta * 0.001 * this.pulseSpeed;

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
   * Update physics simulation
   */
  private updatePhysics(delta: number): void {
    // Update rib constraints with pulse animation
    const phase = this.timePhase(this.animTime);

    for (const unit of this.units) {
      this.updateRibs(unit.geometryData, phase);

      // Tick physics
      unit.geometryData.system.tick(delta * 0.001);

      // Mark buffers for update
      unit.geometryData.position.needsUpdate = true;
      unit.geometryData.positionPrev.needsUpdate = true;
    }

    for (const cp of this.customPhysics) {
      this.updateCustomRibs(cp, this.animTime);
      cp.system.tick(delta * 0.001);
      cp.position.needsUpdate = true;
      cp.positionPrev.needsUpdate = true;
    }
  }

  /**
   * Calculate pulse phase
   */
  private timePhase(time: number): number {
    return (Math.sin(time * Math.PI - Math.PI * 0.5) + 1) * 0.5;
  }

  private updateRibs(geometryData: JellyfishGeometryData, phase: number): void {
    // expansion factor: 1.0 (rest) to 1.15 (expanded)
    const expansion = 1.0 + phase * this.pulseAmplitude;

    // Pulse bell ribs
    geometryData.ribs.forEach((rib) => {
      if (rib.initialDistances) {
        if (rib.outer && rib.initialDistances.outer) {
          rib.outer.setDistance(
            rib.initialDistances.outer[0] * expansion,
            rib.initialDistances.outer[1] * expansion
          );
        }
        if (rib.inner && rib.initialDistances.inner) {
          rib.inner.setDistance(
            rib.initialDistances.inner[0] * expansion,
            rib.initialDistances.inner[1] * expansion
          );
        }
      }
    });

    // Pulse tail ribs for secondary motion
    geometryData.tailRibs.forEach((rib) => {
      if (rib.initialDistances && rib.outer && rib.initialDistances.outer) {
        rib.outer.setDistance(
          rib.initialDistances.outer[0] * expansion,
          rib.initialDistances.outer[1] * expansion
        );
      }
    });
  }

  private updateCustomRibs(physics: CustomPhysicsRuntime, time: number): void {
    // Pulse outer rings
    physics.ribs.forEach(rib => {
      // Peristaltic Wave: offset phase by v * pulseWave
      // This makes the pulse 'travel' along the body
      const localPhase = this.timePhase(time - rib.v * physics.pulseWave);
      const expansion = 1.0 + localPhase * physics.pulseAmplitude;

      rib.constraint.setDistance(
        rib.initialDist[0] * expansion,
        rib.initialDist[1] * expansion
      );
    });

    // Pulse radials (center to rim distance)
    physics.radials.forEach(rad => {
      const localPhase = this.timePhase(time - rad.v * physics.pulseWave);
      const expansion = 1.0 + localPhase * physics.pulseAmplitude;

      rad.constraint.setDistance(
        rad.initialDist[0] * expansion,
        rad.initialDist[1] * expansion
      );
    });
  }

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
