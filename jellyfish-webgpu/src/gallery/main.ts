/**
 * main.ts — Vessel Gallery entry point.
 *
 * Wires the gallery page:
 *   - reads/mints a seed (deterministic per page load; ?seed= overrides)
 *   - assembles the vessel grid = order families × section kinds
 *   - renders the layer bar from FORM_LAYERS
 *   - click tile → hero panel with seeded tweak sliders + re-roll
 *   - slider drag → rebuild that tile's spec + geometry in place
 *
 * Determinism: the whole grid is a pure function of (seed). Re-render the
 * page with the same ?seed= and you get the same shelf of molds.
 */

import { VesselScene, type GalleryTile } from './VesselScene';
import {
  sampleVesselSpec,
  vesselLabel,
  vesselDescription,
  type VesselIdentity,
  type VesselRequest,
} from './vesselSampler';
import { ORDER_FAMILIES, SECTION_FAMILIES, SURFACE_TREATMENTS, type Tweak } from './vesselCatalog';
import { FORM_LAYERS } from './layers';
import { randomSeed } from './prng';

// ── Seed ───────────────────────────────────────────────────────────────

const url = new URL(window.location.href);
const SEED = url.searchParams.get('seed')?.trim() || randomSeed();
const seedLabel = document.getElementById('seedlabel');
if (seedLabel) seedLabel.textContent = `seed ${SEED}`;

// ── Scene ──────────────────────────────────────────────────────────────

const canvas = document.getElementById('gallery-canvas') as HTMLCanvasElement;
const scene = new VesselScene(canvas, {
  tileSpacing: 118,
  gridCols: 12,
  tileScale: 1,
});

// ── Grid assembly ──────────────────────────────────────────────────────

/**
 * All vessels on the shelf: every order family × every section kind ×
 * every surface treatment = 8 × 3 × 4 = 96 distinct forms.
 */
function buildGridDefs(): Array<{ id: string; label: string; spec: ReturnType<typeof sampleVesselSpec>['spec'] }> {
  const defs: Array<{ id: string; label: string; spec: ReturnType<typeof sampleVesselSpec>['spec'] }> = [];
  for (const order of ORDER_FAMILIES) {
    for (const section of SECTION_FAMILIES) {
      for (const surface of SURFACE_TREATMENTS) {
        const req: VesselIdentity = {
          orderId: order.id,
          sectionId: section.id,
          surfaceId: surface.id,
        };
        const { spec } = sampleVesselSpec({ ...req, seed: SEED });
        defs.push({
          id: `${req.orderId}::${req.sectionId}::${req.surfaceId}`,
          label: vesselLabel(req),
          spec,
        });
      }
    }
  }
  return defs;
}

// ── Filters ────────────────────────────────────────────────────────────

/** Active family sets per axis. Every set starts full (all 96 visible). */
interface FilterState {
  order: Set<string>;
  section: Set<string>;
  surface: Set<string>;
}

const filterHosts = {
  order: document.getElementById('filters-order'),
  section: document.getElementById('filters-section'),
  surface: document.getElementById('filters-surface'),
} as const;
const filterCount = document.getElementById('filter-count');

const filters: FilterState = {
  order: new Set(ORDER_FAMILIES.map((o) => o.id)),
  section: new Set(SECTION_FAMILIES.map((s) => s.id)),
  surface: new Set(SURFACE_TREATMENTS.map((s) => s.id)),
};

/** Rebuild the filter chips from the active set state. */
function renderFilters(): void {
  const renderGroup = (
    host: HTMLElement | null,
    axis: keyof FilterState,
    items: Array<{ id: string; label: string }>,
  ): void => {
    if (!host) return;
    host.innerHTML = '';
    for (const item of items) {
      const chip = document.createElement('button');
      chip.className = 'filter-chip' + (filters[axis].has(item.id) ? ' active' : '');
      chip.textContent = item.label;
      chip.title = `show / hide ${item.label} vessels`;
      chip.addEventListener('click', () => {
        const set = filters[axis];
        if (set.has(item.id)) set.delete(item.id);
        else set.add(item.id);
        renderFilters();
        refreshGrid();
      });
      host.appendChild(chip);
    }
  };
  renderGroup(filterHosts.order, 'order', ORDER_FAMILIES);
  renderGroup(filterHosts.section, 'section', SECTION_FAMILIES);
  renderGroup(filterHosts.surface, 'surface', SURFACE_TREATMENTS);
}

/** Rebuild the grid from the active filters. */
function refreshGrid(): void {
  const defs = buildGridDefs().filter((d) => {
    const [orderId, sectionId, surfaceId] = d.id.split('::');
    return (
      filters.order.has(orderId) &&
      filters.section.has(sectionId) &&
      filters.surface.has(surfaceId)
    );
  });
  scene.setTiles(defs);
  scene.viewGrid();
  if (filterCount) filterCount.textContent = `${defs.length} / ${ORDER_FAMILIES.length * SECTION_FAMILIES.length * SURFACE_TREATMENTS.length} forms`;
}

// ── Layer bar ──────────────────────────────────────────────────────────

function renderLayerBar(): void {
  const bar = document.getElementById('layerbar');
  if (!bar) return;
  bar.innerHTML = '';
  FORM_LAYERS.forEach((layer, i) => {
    const btn = document.createElement('button');
    btn.className = 'layer-btn' + (layer.enabled ? ' active' : '');
    btn.textContent = `${i + 1} ${layer.label}`;
    btn.title = layer.description;
    btn.disabled = !layer.enabled;
    bar.appendChild(btn);
  });
}

// ── Hero panel ─────────────────────────────────────────────────────────

interface HeroState {
  identity: VesselRequest;
  tileId: string;
  currentTweaks: Record<string, number>;
}

let heroState: HeroState | null = null;

const heroPanel = document.getElementById('heropanel');
const heroTitle = document.getElementById('hero-title');
const heroSub = document.getElementById('hero-sub');
const heroSurface = document.getElementById('hero-surface');
const heroSliders = document.getElementById('hero-sliders');
const heroReroll = document.getElementById('hero-reroll');
const heroBack = document.getElementById('hero-back');

/** Rebuild the selected tile from heroState's current tweaks. */
function rebuildHeroTile(): void {
  if (!heroState) return;
  const { spec } = sampleVesselSpec(heroState.identity, heroState.currentTweaks);
  scene.replaceTile(heroState.tileId, {
    id: heroState.tileId,
    label: vesselLabel(heroState.identity),
    spec,
  });
}

function openHero(tile: GalleryTile): void {
  const [orderId, sectionId, surfaceId] = tile.id.split('::') as [
    string,
    VesselRequest['sectionId'],
    VesselRequest['surfaceId'],
  ];
  const identity: VesselRequest = { orderId, sectionId, surfaceId, seed: SEED };
  const initial = sampleVesselSpec(identity, undefined);

  heroState = {
    identity,
    tileId: tile.id,
    currentTweaks: { ...initial.values },
  };

  if (heroTitle) heroTitle.textContent = vesselLabel(identity);
  if (heroSub) heroSub.textContent = vesselDescription(identity);

  renderSurfacePicker();
  renderHeroSliders();

  heroPanel?.classList.add('visible');
  scene.viewTile(tile);
}

/** Surface treatment picker (plain / ridges / frill / lobes). */
function renderSurfacePicker(): void {
  if (!heroSurface || !heroState) return;
  heroSurface.innerHTML = '';
  for (const surface of SURFACE_TREATMENTS) {
    const btn = document.createElement('button');
    btn.className = 'surface-btn' + (surface.id === heroState.identity.surfaceId ? ' active' : '');
    btn.textContent = surface.label;
    btn.title = surface.description;
    btn.addEventListener('click', () => setSurface(surface.id));
    heroSurface.appendChild(btn);
  }
}

/** Rebuild slider DOM: order tweaks, then section tweaks, then surface tweaks. */
function renderHeroSliders(): void {
  if (!heroSliders || !heroState) return;
  heroSliders.innerHTML = '';
  const { orderId, sectionId, surfaceId } = heroState.identity;
  const order = ORDER_FAMILIES.find((o) => o.id === orderId);
  if (order && order.tweaks.length > 0) {
    heroSliders.appendChild(sliderGroup('silhouette', order.tweaks));
  }
  const section = SECTION_FAMILIES.find((s) => s.id === sectionId);
  if (section && section.tweaks.length > 0) {
    heroSliders.appendChild(sliderGroup('cross-section', section.tweaks));
  }
  const surface = SURFACE_TREATMENTS.find((s) => s.id === surfaceId);
  if (surface && surface.tweaks.length > 0) {
    heroSliders.appendChild(sliderGroup('surface', surface.tweaks));
  }
}

/** Switch the hero vessel's surface treatment (keeps order + section). */
function setSurface(surfaceId: VesselRequest['surfaceId']): void {
  if (!heroState || heroState.identity.surfaceId === surfaceId) return;
  heroState.identity = { ...heroState.identity, surfaceId };
  const fresh = sampleVesselSpec(heroState.identity, undefined);
  heroState.currentTweaks = { ...fresh.values };
  renderSurfacePicker();
  renderHeroSliders();
  rebuildHeroTile();
}

function closeHero(): void {
  heroState = null;
  heroPanel?.classList.remove('visible');
  scene.viewGrid();
}

function sliderGroup(groupLabel: string, tweaks: Tweak[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.marginTop = '10px';
  const heading = document.createElement('div');
  heading.textContent = groupLabel;
  heading.style.cssText = 'font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#5d6a8f;margin-bottom:8px;';
  wrap.appendChild(heading);

  for (const t of tweaks) {
    const row = document.createElement('div');
    row.className = 'slider-row';

    const head = document.createElement('div');
    head.className = 'slider-head';
    const name = document.createElement('span');
    name.textContent = t.label;
    const val = document.createElement('span');
    val.className = 'val';
    val.textContent = (t.fmt ?? defaultFmt)(heroState?.currentTweaks[t.key] ?? t.min);
    head.appendChild(name);
    head.appendChild(val);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(t.min);
    input.max = String(t.max);
    input.step = String(t.step);
    input.value = String(heroState?.currentTweaks[t.key] ?? t.min);

    input.addEventListener('input', () => {
      const v = Number(input.value);
      if (heroState) {
        heroState.currentTweaks[t.key] = v;
        val.textContent = (t.fmt ?? defaultFmt)(v);
      }
      rebuildHeroTile();
    });

    row.appendChild(head);
    row.appendChild(input);
    wrap.appendChild(row);
  }
  return wrap;
}

function defaultFmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

// ── Wiring ─────────────────────────────────────────────────────────────

scene.setOnSelect((tile) => {
  // Empty-canvas clicks do nothing — only the back button leaves the hero.
  if (!tile) return;
  // Re-clicking the vessel you're already inspecting keeps your tweaks.
  if (heroState && heroState.tileId === tile.id) return;
  openHero(tile);
});

heroReroll?.addEventListener('click', () => {
  if (!heroState) return;
  heroState.identity = {
    ...heroState.identity,
    orderId: ORDER_FAMILIES[Math.floor(Math.random() * ORDER_FAMILIES.length)].id,
  };
  const fresh = sampleVesselSpec(heroState.identity, undefined);
  heroState.currentTweaks = { ...fresh.values };
  if (heroTitle) heroTitle.textContent = vesselLabel(heroState.identity);
  if (heroSub) heroSub.textContent = vesselDescription(heroState.identity);
  rebuildHeroTile();
});

heroBack?.addEventListener('click', closeHero);

// ── Boot ───────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  renderLayerBar();
  const ok = await scene.init();
  if (!ok) {
    document.getElementById('hint')!.textContent = 'WebGPU unavailable — falling back to WebGL.';
  }

  renderFilters();
  refreshGrid();

  let last = performance.now();
  const loop = (now: number): void => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    scene.render(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot().catch((err) => {
  console.error(err);
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = 'Failed to boot gallery — see console.';
});
