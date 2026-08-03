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
 * Tiles are STATIC (no physics tick) — the initial particle layout already
 * IS the profile silhouette, which is exactly what a mold gallery should show.
 */

import * as THREE from 'three/webgpu';
import { JellyfishRenderer } from '../jellyfish/JellyfishRenderer';
import { JellyfishGeometry, type JellyfishGeometryData } from '../jellyfish/JellyfishGeometry';
import {
  BulbNodeMaterial,
  GelNodeMaterial,
  InterpolatedLineMaterial,
} from '../jellyfish/materials';
import type { JellyfishSpec } from '../jellyfish/creatures';

export interface GalleryTile {
  id: string;
  label: string;
  spec: JellyfishSpec;
  group: THREE.Group;
  hitBox: THREE.Mesh;
  geometryData: JellyfishGeometryData;
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

  // Orbit state
  private view: GalleryView = {
    azimuth: 0,
    elevation: 0.35,
    distance: 260,
    target: new THREE.Vector3(0, 0, 0),
  };
  private targetView: GalleryView = { ...this.view, target: this.view.target.clone() };
  private dragging = false;
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
  setTiles(defs: Array<{ id: string; label: string; spec: JellyfishSpec }>): void {
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
  replaceTile(id: string, def: { id: string; label: string; spec: JellyfishSpec }): GalleryTile | null {
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

  private buildTile(def: { id: string; label: string; spec: JellyfishSpec }, x: number, y: number): GalleryTile {
    const gd = JellyfishGeometry.create(def.spec);
    const group = this.buildVesselGroup(gd);

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
  private buildVesselGroup(gd: JellyfishGeometryData): THREE.Group {
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
    bulbMaterial.setDiffuse(0xFFA9D2);
    bulbMaterial.setDiffuseB(0x70256C);
    bulbMaterial.setOpacity(0.78);

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

    const gelMaterial = new GelNodeMaterial({ diffuse: 0x415AB5, opacity: 0.28 });
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

    this.renderer.render(this.scene, this.camera);
  }

  // ── Input ─────────────────────────────────────────────────────────────

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('pointerleave', () => {
      this.pointer.set(-2, -2);
    });
  }

  private onPointerDown = (ev: PointerEvent): void => {
    this.dragging = true;
    this.lastPointer = { x: ev.clientX, y: ev.clientY };
    this.canvas.setPointerCapture?.(ev.pointerId);
  };

  private onPointerMove = (ev: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    );

    if (!this.dragging) return;
    const dx = ev.clientX - this.lastPointer.x;
    const dy = ev.clientY - this.lastPointer.y;
    this.lastPointer = { x: ev.clientX, y: ev.clientY };

    // Dragging orbits (azimuth + elevation), even in hero view.
    this.targetView.azimuth -= dx * 0.005;
    this.targetView.elevation += dy * 0.005;
  };

  private onPointerUp = (ev: PointerEvent): void => {
    if (!this.dragging) {
      this.pickTile();
      return;
    }
    // If the pointer barely moved, treat as a click.
    const moved = Math.hypot(ev.clientX - this.lastPointer.x, ev.clientY - this.lastPointer.y);
    this.dragging = false;
    if (moved < 4) this.pickTile();
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
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.renderer.dispose();
  }
}
