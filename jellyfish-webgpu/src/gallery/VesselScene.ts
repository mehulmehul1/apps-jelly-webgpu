/**
 * VesselScene.ts
 *
 * The gallery's renderer wrapper. Owns:
 *   - JellyfishRenderer (WebGPU w/ WebGL fallback)
 *   - one scene + perspective camera with hand-rolled orbit (drag/zoom)
 *   - a grid of pure-vessel tiles, each built from a validated spec via
 *     JellyfishGeometry.create + the archetype's mesh/material recipe
 *   - camera tweens between grid view and hero (selected tile) view
 *   - raycast tile selection
 *
 * Tiles are STATIC by default (no physics tick) — the initial particle layout
 * already IS the profile silhouette, which is exactly what a mold gallery
 * should show. The float toggle ports the viewer's Particulate pulse
 * (JellyfishArchetype.animateBody) so every tile breathes at once.
 */

import * as THREE from 'three/webgpu';
import { JellyfishRenderer } from '../jellyfish/JellyfishRenderer';
import { JellyfishGeometry, type JellyfishGeometryData } from '../jellyfish/JellyfishGeometry';
import {
  BulbNodeMaterial,
  GelNodeMaterial,
  InterpolatedLineMaterial,
  TailNodeMaterial,
  TentacleNodeMaterial,
} from '../jellyfish/materials';
import type { JellyfishSpec } from '../jellyfish/creatures';
import { createCreatureRig } from '../jellyfish/creatures/CreatureFactory';
import { DEFAULT_MATERIAL_RECIPE, hexToNumber, type GalleryMaterialRecipe } from './materials';

export interface GalleryTile {
  id: string;
  label: string;
  spec: JellyfishSpec;
  group: THREE.Group;
  hitBox: THREE.Mesh;
  geometryData: JellyfishGeometryData;
}

export interface GalleryTileDefinition {
  id: string;
  label: string;
  spec: JellyfishSpec;
  materials?: GalleryMaterialRecipe;
}

export interface GalleryView {
  azimuth: number;
  elevation: number;
  distance: number;
  target: THREE.Vector3;
}

export interface VesselSceneOptions {
  tileSpacing?: number;
  gridCols?: number;
  tileScale?: number;
}

export class VesselScene {
  private renderer: JellyfishRenderer;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);

  private tiles: GalleryTile[] = [];
  private tileLookup = new Map<string, GalleryTile>();

  // Motion state — ALL motion OFF by default (rest/no-motion view).
  // Float (Particulate sine breathing) and axis rotation are opt-in via
  // the pane: turn either on to see motion, off to return to rest.
  private floatEnabled = false;
  private floatTime = 0;
  private floatSettle = 0; // seconds remaining to relax back to rest after disable
  private floatPulseSpeed = 0.175;  // viewer default 0.5 scaled by gentle 0.35×
  private floatAmplitude = 0.15;    // viewer: animationState.pulseAmplitude
  private rotateEnabled = false;
  private rotateSpeed = 0.08;  // rad/s — gentle axis rotation (~80s/rev)

  // Orbit state
  private view: GalleryView = {
    azimuth: 0,
    elevation: 0.35,
    distance: 260,
    target: new THREE.Vector3(0, 0, 0),
  };
  private targetView: GalleryView = { ...this.view, target: this.view.target.clone() };
  private dragging = false;
  private activePointerId: number | null = null;
  private lastPointer = { x: 0, y: 0 };

  private canvas: HTMLCanvasElement;
  private onSelect: ((tile: GalleryTile | null) => void) | null = null;

  private opts: Required<Pick<VesselSceneOptions, 'tileSpacing' | 'gridCols' | 'tileScale'>> = {
    tileSpacing: 120,
    gridCols: 8,
    tileScale: 1,
  };

  constructor(canvas: HTMLCanvasElement, opts: VesselSceneOptions = {}) {
    this.canvas = canvas;
    this.renderer = new JellyfishRenderer(canvas);
    Object.assign(this.opts, opts);
    this.bindEvents();
  }

  async init(): Promise<boolean> {
    const ok = await this.renderer.init();
    if (!ok) return false;

    this.scene.background = null; // transparent → page CSS background shows
    this.camera = new THREE.PerspectiveCamera(40, 1, 1, 6000);
    this.camera.position.set(0, 0, this.view.distance);

    this.onResize();
    window.addEventListener('resize', this.onResize);
    return true;
  }

  // ── Tiles ─────────────────────────────────────────────────────────────

  /**
   * Rebuild the whole grid from a list of tile definitions.
   * Disposes previous tiles first.
   */
  setTiles(defs: GalleryTileDefinition[]): void {
    this.clearTiles();
    const cols = Math.min(this.opts.gridCols, Math.max(1, defs.length));
    const rows = Math.ceil(defs.length / cols);

    defs.forEach((def, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (col - (cols - 1) / 2) * this.opts.tileSpacing;
      const y = -((rows - 1) / 2 - row) * this.opts.tileSpacing * 0.92;
      const tile = this.buildTile(def, x, y);
      this.tiles.push(tile);
      this.tileLookup.set(tile.id, tile);
      this.scene.add(tile.group);
      this.scene.add(tile.hitBox);
    });

    // Frame the grid
    if (this.tiles.length > 0) {
      const span = Math.max(cols, rows) * this.opts.tileSpacing;
      this.targetView.distance = span * 1.05;
      this.targetView.target.set(0, 0, 0);
    }
  }

  /** Replace a single tile in place (hero tweaks / re-roll). */
  replaceTile(id: string, def: GalleryTileDefinition): GalleryTile | null {
    const old = this.tileLookup.get(id);
    if (!old) return null;

    const pos = old.group.position.clone();
    this.disposeTile(old);
    this.tiles = this.tiles.filter((t) => t.id !== id);

    const tile = this.buildTile(def, pos.x, pos.y);
    tile.group.position.copy(pos);
    tile.hitBox.position.copy(pos);
    this.tiles.push(tile);
    this.tileLookup.set(id, tile);
    this.scene.add(tile.group);
    this.scene.add(tile.hitBox);
    return tile;
  }

  private buildTile(def: GalleryTileDefinition, x: number, y: number): GalleryTile {
    const rig = createCreatureRig(def.spec);
    const primary = rig.units[0];
    const gd = JellyfishGeometry.create(primary.spec);
    const group = new THREE.Group();
    for (const unit of rig.units) {
      const unitGeometry = unit === primary ? gd : JellyfishGeometry.create(unit.spec);
      const unitGroup = this.buildVesselGroup(unitGeometry, def.materials ?? DEFAULT_MATERIAL_RECIPE);
      unitGroup.position.set(unit.transform.position.x, unit.transform.position.y, unit.transform.position.z);
      unitGroup.scale.setScalar(unit.transform.scale);
      group.add(unitGroup);
    }

    // Invisible hit proxy for selection (robust from any orbit angle).
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(56 * this.opts.tileScale, 96 * this.opts.tileScale, 56 * this.opts.tileScale),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitBox.userData.tileId = def.id;

    group.position.set(x, y, 0);
    hitBox.position.set(x, y, 0);

    return { id: def.id, label: def.label, spec: def.spec, group, hitBox, geometryData: gd };
  }

  /**
   * Mirror of JellyfishArchetype.buildMeshes, but vessel-only: bulb + gel
   * overlay (+ subtle structural lines). No tail/mouth/tentacles.
   */
  private buildVesselGroup(gd: JellyfishGeometryData, materials: GalleryMaterialRecipe): THREE.Group {
    const group = new THREE.Group();
    const s = this.opts.tileScale;

    // Bulb
    const bulbGeo = new THREE.BufferGeometry();
    bulbGeo.setAttribute('position', gd.position);
    bulbGeo.setAttribute('positionPrev', gd.positionPrev);
    bulbGeo.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
    bulbGeo.setAttribute('normal', gd.geometry.attributes.normal);
    bulbGeo.setIndex(gd.faces.bulb);
    bulbGeo.computeVertexNormals();

    const bulbMaterial = new BulbNodeMaterial();
    bulbMaterial.setDiffuse(hexToNumber(materials.bulb.colorA));
    bulbMaterial.setDiffuseB(hexToNumber(materials.bulb.colorB ?? materials.bulb.colorA));
    bulbMaterial.setOpacity(materials.bulb.opacity);

    const bulbMesh = new THREE.Mesh(bulbGeo, bulbMaterial);
    bulbMesh.scale.setScalar(0.95 * s);
    group.add(bulbMesh);

    // Gel overlay (slightly larger, rim-glow)
    const gelGeo = new THREE.BufferGeometry();
    gelGeo.setAttribute('position', gd.position);
    gelGeo.setAttribute('positionPrev', gd.positionPrev);
    gelGeo.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
    gelGeo.setAttribute('normal', gd.geometry.attributes.normal);
    gelGeo.setIndex(gd.faces.bulb);
    gelGeo.computeVertexNormals();

    const gelMaterial = new GelNodeMaterial({ diffuse: hexToNumber(materials.gel.colorA), opacity: materials.gel.opacity });
    gelMaterial.setStepProgress(1);

    const gelMesh = new THREE.Mesh(gelGeo, gelMaterial);
    gelMesh.scale.setScalar(1.05 * s);
    group.add(gelMesh);

    // Structural lines (subtle wireframe)
    if (gd.links.linesFore.length > 0) {
      const lfGeo = new THREE.BufferGeometry();
      lfGeo.setAttribute('position', gd.position);
      lfGeo.setAttribute('positionPrev', gd.positionPrev);
      lfGeo.setIndex(gd.links.linesFore);
      const lfMat = new InterpolatedLineMaterial({
        color: 0xffdde9,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      group.add(new THREE.LineSegments(lfGeo, lfMat));
    }

    group.scale.setScalar(1);

    // ── Tail mesh ──────────────────────────────────────────
    if (gd.faces.tail.length > 0) {
      const tailGeo = new THREE.BufferGeometry();
      tailGeo.setAttribute('position', gd.position);
      tailGeo.setAttribute('positionPrev', gd.positionPrev);
      tailGeo.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
      tailGeo.setAttribute('normal', gd.geometry.attributes.normal);
      tailGeo.setIndex(gd.faces.tail);
      tailGeo.computeVertexNormals();

      const tailMaterial = new TailNodeMaterial();
      tailMaterial.setDiffuse(hexToNumber(materials.tail.colorA));
      tailMaterial.setDiffuseB(hexToNumber(materials.tail.colorB ?? materials.tail.colorA));
      tailMaterial.updateOpacity(materials.tail.opacity);
      if (materials.tail.scale !== undefined) tailMaterial.setScale(materials.tail.scale);

      const tailMesh = new THREE.Mesh(tailGeo, tailMaterial);
      tailMesh.scale.setScalar(0.95 * s);
      group.add(tailMesh);
    }

    // ── Mouth mesh ────────────────────────────────────────
    if (gd.faces.mouth.length > 0) {
      const mouthGeo = new THREE.BufferGeometry();
      mouthGeo.setAttribute('position', gd.position);
      mouthGeo.setAttribute('positionPrev', gd.positionPrev);
      mouthGeo.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
      mouthGeo.setAttribute('normal', gd.geometry.attributes.normal);
      mouthGeo.setIndex(gd.faces.mouth);
      mouthGeo.computeVertexNormals();

      const mouthMaterial = new TailNodeMaterial();
      mouthMaterial.setDiffuse(hexToNumber(materials.mouth.colorA));
      mouthMaterial.setDiffuseB(hexToNumber(materials.mouth.colorB ?? materials.mouth.colorA));
      mouthMaterial.setScale(materials.mouth.scale ?? 3);
      mouthMaterial.updateOpacity(materials.mouth.opacity);

      const mouthMesh = new THREE.Mesh(mouthGeo, mouthMaterial);
      group.add(mouthMesh);
    }

    // ── Tentacle meshes ───────────────────────────────────
    const tentacleStyle = (gd.spec as JellyfishSpec).tentacleStyle ?? 'curtain';
    const tentacleMaterial = new TentacleNodeMaterial({
      color: hexToNumber(materials.tentacle.colorA),
      transparent: true,
      opacity: materials.tentacle.opacity,
      depthTest: true,
      depthWrite: false,
      useGlow: materials.tentacle.glow ?? tentacleStyle !== 'tube',
    });
    tentacleMaterial.setArea(materials.tentacle.area ?? 2000);
    const tubeTentacleMaterial =
      tentacleStyle === 'tube'
        ? new TentacleNodeMaterial({
            color: hexToNumber(materials.tentacle.colorA),
            transparent: true,
            opacity: materials.tentacle.opacity,
            depthTest: true,
            depthWrite: false,
            useGlow: false,
          })
        : tentacleMaterial;

    if (tentacleStyle === 'tube' && gd.faces.tentacleGroups.length > 0) {
      for (const groupFaces of gd.faces.tentacleGroups) {
        if (groupFaces.length === 0) continue;
        const tentGeo = new THREE.BufferGeometry();
        tentGeo.setAttribute('position', gd.position);
        tentGeo.setAttribute('positionPrev', gd.positionPrev);
        tentGeo.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
        tentGeo.setIndex(groupFaces);
        tentGeo.computeVertexNormals();
        group.add(new THREE.Mesh(tentGeo, tubeTentacleMaterial));
      }
    } else if (gd.faces.tentacles.length > 0) {
      const tentGeo = new THREE.BufferGeometry();
      tentGeo.setAttribute('position', gd.position);
      tentGeo.setAttribute('positionPrev', gd.positionPrev);
      tentGeo.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
      tentGeo.setIndex(gd.faces.tentacles);
      tentGeo.computeVertexNormals();
      group.add(new THREE.Mesh(tentGeo, tentacleMaterial));
    }

    // ── Inner structural lines ────────────────────────────
    if (gd.links.linesInner.length > 0) {
      const liGeo = new THREE.BufferGeometry();
      liGeo.setAttribute('position', gd.position);
      liGeo.setAttribute('positionPrev', gd.positionPrev);
      liGeo.setIndex(gd.links.linesInner);
      const liMat = new InterpolatedLineMaterial({
        color: 0xf99ebd,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      group.add(new THREE.LineSegments(liGeo, liMat));
    }

    return group;
  }

  // ── Selection ─────────────────────────────────────────────────────────

  setOnSelect(cb: (tile: GalleryTile | null) => void): void {
    this.onSelect = cb;
  }

  getTile(id: string): GalleryTile | undefined {
    return this.tileLookup.get(id);
  }

  getTiles(): GalleryTile[] {
    return [...this.tiles];
  }

  // ── Views (grid ↔ hero) ───────────────────────────────────────────────

  /** Tween to the grid overview. */
  viewGrid(): void {
    this.targetView.azimuth = 0;
    this.targetView.elevation = 0.35;
    this.targetView.distance = this.initialGridDistance();
    this.targetView.target.set(0, 0, 0);
  }

  /** Tween to a selected tile (hero), framing the vessel's actual geometry. */
  viewTile(tile: GalleryTile): void {
    // Bounds of the bell geometry in local space, then to world space.
    const box = new THREE.Box3().setFromBufferAttribute(tile.geometryData.position);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = this.opts.tileScale;

    const worldCenter = tile.group.position.clone().add(center.multiplyScalar(s));
    const radius = size.length() * 0.5 * s;

    // Fit the vessel's bounding sphere inside the vertical FOV.
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const fitDistance = (radius * 1.15) / Math.sin(fovRad / 2);

    this.targetView.target.copy(worldCenter);
    this.targetView.distance = Math.max(60, fitDistance);
    this.targetView.azimuth = 0.5;
    this.targetView.elevation = 0.35;
  }

  private initialGridDistance(): number {
    const cols = Math.min(this.opts.gridCols, Math.max(1, this.tiles.length));
    const rows = Math.ceil(this.tiles.length / cols);
    const span = Math.max(cols, rows) * this.opts.tileSpacing;
    return span * 1.05;
  }

  // ── Render loop ───────────────────────────────────────────────────────

  /** Advance camera toward target view; render. */
  render(dt: number): void {
    if (!this.camera) return;

    // Ease toward target view (frame-rate independent)
    const k = 1 - Math.pow(0.001, dt);
    this.view.azimuth += (this.targetView.azimuth - this.view.azimuth) * k;
    this.view.elevation += (this.targetView.elevation - this.view.elevation) * k;
    this.view.distance += (this.targetView.distance - this.view.distance) * k;
    this.view.target.lerp(this.targetView.target, k);

    // Clamp elevation to avoid flipping under the grid
    this.view.elevation = Math.max(0.05, Math.min(1.5, this.view.elevation));

    // Camera position from spherical coords around target
    const e = this.view.elevation;
    const a = this.view.azimuth;
    const cx = this.view.target.x + this.view.distance * Math.cos(e) * Math.sin(a);
    const cy = this.view.target.y + this.view.distance * Math.sin(e);
    const cz = this.view.target.z + this.view.distance * Math.cos(e) * Math.cos(a);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.view.target);

    if (this.rotateEnabled) {
      // Gentle axis rotation — independent of the pulse, ON by default.
      const rot = this.rotateSpeed * dt;
      for (const tile of this.tiles) tile.group.rotation.y += rot;
    }

    if (this.floatEnabled) {
      this.pulseTiles(dt);
    } else if (this.floatSettle > 0) {
      // Relax back to rest shape after float is switched off.
      this.floatSettle = Math.max(0, this.floatSettle - dt);
      this.applyExpansion(1.0, dt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Toggle the viewer's Particulate pulse on all tiles at once.
   * Port of JellyfishArchetype.animateBody: scale each rib's rest distance
   * sinusoidally, then tick the particle system so the soft body breathes.
   * On disable, tiles settle back to their rest shape over ~1s instead of
   * freezing mid-pulse.
   */
  setFloatEnabled(enabled: boolean): void {
    if (enabled === this.floatEnabled) return;
    this.floatEnabled = enabled;
    this.floatTime = 0;
    if (!enabled) this.floatSettle = 1.0;
  }

  /** Pulse speed in cycles/sec (viewer default 0.5). Slowest ~0.005 = 400s cycle. */
  setFloatSpeed(speed: number): void {
    this.floatPulseSpeed = Math.max(0.005, Math.min(4, speed));
  }

  /** Pulse amplitude as a fraction of rest length (viewer default 0.15). */
  setFloatAmplitude(amp: number): void {
    this.floatAmplitude = Math.max(0, Math.min(0.6, amp));
  }

  /** Spin every tile on its own vertical axis. */
  setRotateEnabled(enabled: boolean): void {
    this.rotateEnabled = enabled;
  }

  /** Per-tile spin rate in rad/s (default 0.08 ≈ 80s/rev). */
  setRotateSpeed(radPerSec: number): void {
    this.rotateSpeed = Math.max(0.005, Math.min(4, radPerSec));
  }

  private pulseTiles(dt: number): void {
    this.floatTime += dt * this.floatPulseSpeed;
    const phase = (Math.sin(this.floatTime * Math.PI - Math.PI * 0.5) + 1) * 0.5;
    const expansion = 1.0 + phase * this.floatAmplitude;
    this.applyExpansion(expansion, dt);
  }

  /** Scale every rib's rest distance by `expansion`, then step the particle system. */
  private applyExpansion(expansion: number, dt: number): void {
    for (const tile of this.tiles) {
      const gd = tile.geometryData;

      // Pulse bell ribs
      for (const rib of gd.ribs) {
        if (!rib.initialDistances) continue;
        if (rib.outer && rib.initialDistances.outer) {
          rib.outer.setDistance(
            rib.initialDistances.outer[0] * expansion,
            rib.initialDistances.outer[1] * expansion,
          );
        }
        if (rib.inner && rib.initialDistances.inner) {
          rib.inner.setDistance(
            rib.initialDistances.inner[0] * expansion,
            rib.initialDistances.inner[1] * expansion,
          );
        }
      }

      // Pulse tail ribs for secondary motion
      for (const rib of gd.tailRibs) {
        if (!rib.initialDistances) continue;
        if (rib.outer && rib.initialDistances.outer) {
          rib.outer.setDistance(
            rib.initialDistances.outer[0] * expansion,
            rib.initialDistances.outer[1] * expansion,
          );
        }
      }

      // Tick Particulate physics, then upload the deformed positions
      gd.system.tick(dt);
      gd.position.needsUpdate = true;
      gd.positionPrev.needsUpdate = true;
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('pointerleave', () => {
      this.pointer.set(-2, -2);
    });
  }

  private onPointerDown = (ev: PointerEvent): void => {
    if (ev.currentTarget !== this.canvas) return;
    this.activePointerId = ev.pointerId;
    this.dragging = true;
    this.lastPointer = { x: ev.clientX, y: ev.clientY };
    this.canvas.setPointerCapture?.(ev.pointerId);
  };

  private onPointerMove = (ev: PointerEvent): void => {
    if (ev.currentTarget !== this.canvas || ev.pointerId !== this.activePointerId) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    );
    if (!this.dragging) return;
    const dx = ev.clientX - this.lastPointer.x;
    const dy = ev.clientY - this.lastPointer.y;
    this.lastPointer = { x: ev.clientX, y: ev.clientY };
    this.targetView.azimuth -= dx * 0.0025;
    this.targetView.elevation += dy * 0.0025;
  };

  private onPointerUp = (ev: PointerEvent): void => {
    if (ev.currentTarget !== this.canvas || ev.pointerId !== this.activePointerId) return;
    const moved = Math.hypot(ev.clientX - this.lastPointer.x, ev.clientY - this.lastPointer.y);
    this.canvas.releasePointerCapture?.(ev.pointerId);
    this.activePointerId = null;
    this.dragging = false;
    if (moved < 4) this.pickTile();
  };

  private onPointerCancel = (ev: PointerEvent): void => {
    if (ev.pointerId !== this.activePointerId) return;
    this.canvas.releasePointerCapture?.(ev.pointerId);
    this.activePointerId = null;
    this.dragging = false;
  };

  private onWheel = (ev: WheelEvent): void => {
    ev.preventDefault();
    this.targetView.distance *= 1 + Math.sign(ev.deltaY) * 0.12;
    this.targetView.distance = Math.max(30, Math.min(2000, this.targetView.distance));
  };

  private pickTile(): void {
    if (!this.camera || !this.onSelect) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.tiles.map((t) => t.hitBox), false);
    if (hits.length > 0) {
      const id = (hits[0].object as THREE.Mesh).userData.tileId as string;
      this.onSelect(this.tileLookup.get(id) ?? null);
    } else {
      this.onSelect(null);
    }
  }

  private onResize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  };

  // ── Cleanup ───────────────────────────────────────────────────────────

  clearTiles(): void {
    for (const t of this.tiles) this.disposeTile(t);
    this.tiles = [];
    this.tileLookup.clear();
  }

  private disposeTile(tile: GalleryTile): void {
    this.scene.remove(tile.group);
    this.scene.remove(tile.hitBox);
    tile.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    tile.hitBox.geometry.dispose();
    (tile.hitBox.material as THREE.Material).dispose();
  }

  dispose(): void {
    this.clearTiles();
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.renderer.dispose();
  }
}
