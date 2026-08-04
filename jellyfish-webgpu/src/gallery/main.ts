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
import { ORDER_FAMILIES, SECTION_FAMILIES, SURFACE_TREATMENTS, BODY_TWEAKS, type Tweak } from './vesselCatalog';
import { FORM_LAYERS, applyLayers, CHARACTER_LAYER, COSTUME_LAYER, GESTURE_LAYER } from './layers';
import { CHARACTER_MODULES, sampleCharacterParams, readCharacterValues } from './characterCatalog';
import { mulberry32, hashString, randomSeed } from './prng';
import { GalleryStore, type StudioMode } from './model/galleryStore';
import { analyzeRecipe } from './model/analysis';
import { recipeHash, type SpecimenRecipe } from './model/recipe';
import { PARAMETER_REGISTRY } from './model/parameterRegistry';
import { buildStudyCandidates, createAxisStudy } from './model/study';
import { WORKSPACES, type GalleryWorkspace } from './workspaces';
import { DEFAULT_MATERIAL_RECIPE, MATERIAL_LOOK_PRESETS, cloneMaterialRecipe, type GalleryMaterialRecipe } from './materials';
import { defaultStudySheet } from './studySheet';

// ── Saved forms ──────────────────────────────────────────────────────

export interface SavedForm {
  id: string;
  seed: string;
  orderId: string;
  sectionId: string;
  surfaceId: string;
  tweaks: Record<string, number>;
  savedAt: number;
}

const STORAGE_KEY = 'jellyfish-gallery-saved';

function loadSavedForms(): SavedForm[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSavedForms(forms: SavedForm[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
}

function toggleSaveForm(form: SavedForm): void {
  const saved = loadSavedForms();
  const idx = saved.findIndex((f) => f.id === form.id);
  if (idx >= 0) {
    saved.splice(idx, 1);
  } else {
    saved.push(form);
  }
  saveSavedForms(saved);
  updateSavedCount();
  updateHeroSaveButton();
}

function updateSavedCount(): void {
  const el = document.getElementById('saved-count');
  if (el) el.textContent = `(${loadSavedForms().length})`;
}

function updateHeroSaveButton(): void {
  const btn = document.getElementById('hero-save');
  if (!btn || !heroState) return;
  const saved = loadSavedForms();
  const isSaved = saved.some((f) => f.id === heroState!.tileId);
  btn.classList.toggle('saved', isSaved);
  btn.textContent = isSaved ? '♥ saved' : '♥ save';
}

// ── View state ──────────────────────────────────────────────────────

type ViewMode = 'all' | 'saved';
let currentView: ViewMode = 'all';

// ── Seed ───────────────────────────────────────────────────────────────

const url = new URL(window.location.href);
const SEED = url.searchParams.get('seed')?.trim() || randomSeed();
const seedLabel = document.getElementById('seedlabel');
if (seedLabel) seedLabel.textContent = `seed ${SEED}`;

// ── Scene ──────────────────────────────────────────────────────────────

/**
 * Per-tile deterministic rng. Character-layer appendages (tails, tentacles,
 * mouth arms) are seeded per tile so each of the 96 molds gets its own
 * variation from the same global SEED. The id encodes order/section/surface,
 * so any tile is reproducible: same seed + same tile id = same appendages.
 */
function tileRng(tileId: string): () => number {
  return mulberry32(hashString(`${SEED}::character::${tileId}`));
}

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

/** Rebuild the grid from the active filters and view mode. */
function refreshGrid(): void {
  const savedIds = new Set(loadSavedForms().map((f) => f.id));
  const defs = buildGridDefs().filter((d) => {
    if (currentView === 'saved' && !savedIds.has(d.id)) return false;
    const [orderId, sectionId, surfaceId] = d.id.split('::');
    return filters.order.has(orderId) && filters.section.has(sectionId) && filters.surface.has(surfaceId);
  });
  rebuildGridWithLayers(defs);
}

function rebuildGridWithLayers(sourceDefs = buildGridDefs()): void {
  const savedIds = new Set(loadSavedForms().map((f) => f.id));
  const defs = sourceDefs.filter((def) => {
    if (currentView === 'saved' && !savedIds.has(def.id)) return false;
    const [orderId, sectionId, surfaceId] = def.id.split('::');
    return filters.order.has(orderId) && filters.section.has(sectionId) && filters.surface.has(surfaceId);
  }).map((def) => {
    const [orderId, sectionId, surfaceId] = def.id.split('::');
    const identity: VesselIdentity = {
      orderId,
      sectionId: sectionId as VesselRequest['sectionId'],
      surfaceId: surfaceId as VesselRequest['surfaceId'],
    };
    const { spec } = sampleVesselSpec({ ...identity, seed: SEED }, undefined);
    const layered = applyLayers(spec, { spec, seed: SEED, rng: tileRng(def.id), tweaks: {} });
    return { id: def.id, label: def.label, spec: layered, materials: materialRecipe };
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
  FORM_LAYERS.forEach((layer) => {
    const btn = document.createElement('button');
    btn.className = 'layer-btn' + (layer.enabled ? ' active' : '');
    btn.textContent = layer.label;
    btn.title = layer.description;
    btn.addEventListener('click', () => {
      layer.enabled = !layer.enabled;
      btn.classList.toggle('active', layer.enabled);
      rebuildGridWithLayers();
    });
    bar.appendChild(btn);
  });
}

// ── Hero panel ─────────────────────────────────────────────────────────

interface HeroState {
  identity: VesselRequest;
  tileId: string;
  currentTweaks: Record<string, number>;
  modules: { tail: boolean; mouth: boolean; tentacles: boolean };
  recipe: SpecimenRecipe;
}

let heroState: HeroState | null = null;
const studioStore = new GalleryStore();

const heroPanel = document.getElementById('heropanel');
const wallRail = document.getElementById('wall-rail');
const focusRail = document.getElementById('focus-rail');
const wallWorkbench = document.getElementById('wall-workbench');
const focusWorkbench = document.getElementById('focus-workbench');
const workspaceLabel = document.getElementById('workspace-label');
const workbenchClose = document.getElementById('workbench-close');
const studioLocation = document.getElementById('studio-location');
const heroTitle = document.getElementById('hero-title');
const heroSub = document.getElementById('hero-sub');
const heroRecipeMeta = document.getElementById('hero-recipe-meta');
const workspaceTrail = document.getElementById('workspace-trail');
const workspacePromise = document.getElementById('workspace-promise');
const workspaceContent = document.getElementById('workspace-content');
const heroAnalysis = document.getElementById('hero-analysis');
const studioToast = document.getElementById('studio-toast');
const technicalDrawer = document.getElementById('technical-drawer');
const technicalContent = document.getElementById('technical-content');
const studySheet = document.getElementById('study-sheet');
const heroSave = document.getElementById('hero-save');
const heroBranch = document.getElementById('hero-branch');
const heroCopy = document.getElementById('hero-copy');
const heroBack = document.getElementById('hero-back');
const btnModeBeautiful = document.getElementById('btn-mode-beautiful');
const btnModeLaboratory = document.getElementById('btn-mode-laboratory');
const btnTechnical = document.getElementById('btn-technical');
let activeWorkspace: GalleryWorkspace = 'vessel';
let materialRecipe: GalleryMaterialRecipe = cloneMaterialRecipe(DEFAULT_MATERIAL_RECIPE);
let studyState = defaultStudySheet();

/** Rebuild the selected tile from heroState's current tweaks. */
function rebuildHeroTile(): void {
  if (!heroState) return;
  const effectiveTweaks = { ...heroState.currentTweaks };
  if (!heroState.modules.tail) effectiveTweaks.tailLength = 0;
  if (!heroState.modules.mouth) effectiveTweaks.mouthSize = 0;
  if (!heroState.modules.tentacles) effectiveTweaks.tentacleCount = 0;
  heroState.recipe.vessel.values = Object.fromEntries(Object.entries(heroState.currentTweaks).filter(([key]) => !key.startsWith('tail') && !key.startsWith('mouth') && !key.startsWith('tentacle')));
  heroState.recipe.character.values = Object.fromEntries(Object.entries(heroState.currentTweaks).filter(([key]) => key.startsWith('tail') || key.startsWith('mouth') || key.startsWith('tentacle')));
  heroState.recipe.character.modules = { ...heroState.modules };
  const { spec } = sampleVesselSpec(heroState.identity, heroState.currentTweaks);
  const layered = applyLayers(spec, { spec, seed: SEED, rng: tileRng(heroState.tileId), tweaks: effectiveTweaks });
  scene.replaceTile(heroState.tileId, {
    id: heroState.tileId,
    label: vesselLabel(heroState.identity),
    spec: layered,
    materials: materialRecipe,
  });
  updateRecipeMeta();
  renderHeroAnalysis();
}

function openHero(tile: GalleryTile): void {
  const [orderId, sectionId, surfaceId] = tile.id.split('::') as [
    string,
    VesselRequest['sectionId'],
    VesselRequest['surfaceId'],
  ];
  const identity: VesselRequest = { orderId, sectionId, surfaceId, seed: SEED };
  const initial = sampleVesselSpec(identity, undefined);

  const characterParams = sampleCharacterParams(tileRng(tile.id));
  const characterValues = readCharacterValues(characterParams);
  const modules = CHARACTER_LAYER.enabled ? { ...characterParams.features } : { tail: false, mouth: false, tentacles: false };
  heroState = {
    identity,
    tileId: tile.id,
    currentTweaks: { ...initial.values, ...characterValues },
    modules,
    recipe: {
      schemaVersion: 1,
      id: tile.id,
      createdAt: Date.now(),
      seed: SEED,
      vessel: { orderId, sectionId, surfaceId, values: { ...initial.values } },
      character: { modules, values: { ...characterValues } },
    },
  };

  if (heroTitle) heroTitle.textContent = vesselLabel(identity);
  if (heroSub) heroSub.textContent = vesselDescription(identity);
  activeWorkspace = 'vessel';
  document.body.classList.add('focus-mode');
  if (studioLocation) studioLocation.textContent = 'FOCUS · VESSEL';
  renderWorkspace();
  renderHeroAnalysis();
  updateRecipeMeta();

  heroPanel?.classList.add('visible');
  scene.viewTile(tile);
  updateHeroSaveButton();
}

function updateRecipeMeta(): void {
  if (!heroRecipeMeta || !heroState) return;
  heroRecipeMeta.textContent = `recipe ${recipeHash(heroState.recipe)} · seed ${heroState.recipe.seed} · ${heroState.recipe.parentId ? `branch of ${heroState.recipe.parentId}` : 'seeded specimen'}`;
}

function renderHeroAnalysis(): void {
  if (!heroAnalysis || !heroState) return;
  const analysis = analyzeRecipe(heroState.recipe);
  heroAnalysis.innerHTML = `<div class="analysis-budget">${analysis.budget.level} · ${analysis.budget.estimatedParticles} estimated particles</div>` + analysis.relationships.slice(0, 4).map((item) => `<div class="analysis-${item.severity}">${item.statement}</div>`).join('') + analysis.warnings.map((item) => `<div class="analysis-warning">warning · ${item.message}</div>`).join('');
}

function showStudioToast(message: string): void {
  if (!studioToast) return;
  studioToast.textContent = message;
  studioToast.classList.add('visible');
  window.setTimeout(() => studioToast.classList.remove('visible'), 2200);
}

function renderWorkspace(): void {
  if (!heroState || !workspaceContent || !workspaceTrail || !workspacePromise) return;
  workspaceTrail.innerHTML = '';
  for (const workspace of WORKSPACES) {
    const button = document.createElement('button');
    button.className = `workspace-step${workspace.id === activeWorkspace ? ' active' : ''}`;
    button.textContent = workspace.label;
    button.addEventListener('click', () => { activeWorkspace = workspace.id; renderWorkspace(); });
    workspaceTrail.appendChild(button);
  }
  const current = WORKSPACES.find((workspace) => workspace.id === activeWorkspace) ?? WORKSPACES[0];
  workspacePromise.textContent = current.promise;
  if (workspaceLabel) workspaceLabel.textContent = current.label;
  if (studioLocation) studioLocation.textContent = `FOCUS · ${current.label.toUpperCase()}`;
  wallRail?.setAttribute('aria-hidden', 'true');
  focusRail?.setAttribute('aria-hidden', 'false');
  wallWorkbench?.setAttribute('aria-hidden', 'true');
  focusWorkbench?.setAttribute('aria-hidden', 'false');
  workspaceContent.innerHTML = '';
  if (activeWorkspace === 'vessel') renderVesselWorkspace(workspaceContent);
  if (activeWorkspace === 'character') renderCharacterWorkspace(workspaceContent);
  if (activeWorkspace === 'costume') renderCostumeWorkspace(workspaceContent);
  if (activeWorkspace === 'gesture') renderGestureWorkspace(workspaceContent);
  if (activeWorkspace === 'study') renderStudyWorkspace(workspaceContent);
  renderTechnicalDrawer();
}

function sectionHeading(text: string): HTMLDivElement {
  const heading = document.createElement('div');
  heading.className = 'workspace-heading';
  heading.textContent = text;
  return heading;
}

function choiceGrid(items: Array<{ id: string; label: string; description: string }>, active: string, onSelect: (id: string) => void): HTMLDivElement {
  const grid = document.createElement('div');
  grid.className = 'choice-grid';
  for (const item of items) {
    const button = document.createElement('button');
    button.className = `choice-btn${item.id === active ? ' active' : ''}`;
    button.innerHTML = `${item.label}<small>${item.description}</small>`;
    button.addEventListener('click', () => onSelect(item.id));
    grid.appendChild(button);
  }
  return grid;
}

function renderVesselWorkspace(host: HTMLElement): void {
  if (!heroState) return;
  host.appendChild(sectionHeading('silhouette family'));
  host.appendChild(choiceGrid(ORDER_FAMILIES.map((item) => ({ id: item.id, label: item.label, description: item.description })), heroState.identity.orderId, (id) => {
    heroState!.identity = { ...heroState!.identity, orderId: id };
    const fresh = sampleVesselSpec(heroState!.identity, undefined);
    heroState!.currentTweaks = { ...fresh.values };
    rebuildHeroTile(); renderWorkspace();
  }));
  host.appendChild(sectionHeading('cross-section'));
  host.appendChild(choiceGrid(SECTION_FAMILIES.map((item) => ({ id: item.id, label: item.label, description: item.description })), heroState.identity.sectionId, (id) => {
    heroState!.identity = { ...heroState!.identity, sectionId: id as VesselRequest['sectionId'] };
    const fresh = sampleVesselSpec(heroState!.identity, undefined);
    heroState!.currentTweaks = { ...fresh.values };
    rebuildHeroTile(); renderWorkspace();
  }));
  host.appendChild(sectionHeading('surface treatment'));
  host.appendChild(choiceGrid(SURFACE_TREATMENTS.map((item) => ({ id: item.id, label: item.label, description: item.description })), heroState.identity.surfaceId, (id) => {
    heroState!.identity = { ...heroState!.identity, surfaceId: id as VesselRequest['surfaceId'] };
    const fresh = sampleVesselSpec(heroState!.identity, undefined);
    heroState!.currentTweaks = { ...fresh.values };
    rebuildHeroTile(); renderWorkspace();
  }));
  const advanced = document.createElement('details');
  advanced.className = 'advanced-panel';
  advanced.innerHTML = '<summary>continuous vessel controls</summary>';
  advanced.appendChild(sliderGroup('body', BODY_TWEAKS));
  host.appendChild(advanced);
}

function renderCharacterWorkspace(host: HTMLElement): void {
  if (!heroState) return;
  host.appendChild(sectionHeading('anatomy modules'));
  const modules: Array<[keyof HeroState['modules'], string, string]> = [['tail', 'Tail', 'reach'], ['mouth', 'Mouth', 'frill'], ['tentacles', 'Tentacles', 'density']];
  host.appendChild(choiceGrid(modules.map(([id, label, description]) => ({ id, label: `${heroState!.modules[id] ? 'Remove' : 'Add'} ${label}`, description })), '', (id) => {
    const key = id as keyof HeroState['modules'];
    heroState!.modules[key] = !heroState!.modules[key];
    if (heroState!.modules[key]) CHARACTER_LAYER.enabled = true;
    rebuildHeroTile(); renderWorkspace();
  }));
  const tweakByKey = new Map(CHARACTER_LAYER.tweaks.map((t) => [t.key, t]));
  for (const module of CHARACTER_MODULES) {
    const enabled = heroState.modules[module.id];
    if (!enabled) continue;
    host.appendChild(sectionHeading(module.label));
    const tweaks = module.tweakKeys.map((key) => tweakByKey.get(key)).filter((t): t is NonNullable<typeof t> => t !== undefined);
    host.appendChild(sliderGroup(module.label, tweaks));
  }
  host.appendChild(choiceGrid([{ id: 'curtain', label: 'Curtain', description: 'Merged soft veil.' }, { id: 'tube', label: 'Tube', description: 'Separate articulated tubes.' }], heroState.currentTweaks.tentacleStyle > 0.5 ? 'tube' : 'curtain', (id) => { heroState!.currentTweaks.tentacleStyle = id === 'tube' ? 1 : 0; rebuildHeroTile(); renderWorkspace(); }));
}

function renderCostumeWorkspace(host: HTMLElement): void {
  COSTUME_LAYER.enabled = true;
  host.appendChild(sectionHeading('whole-creature looks'));
  host.appendChild(choiceGrid(MATERIAL_LOOK_PRESETS.map((item) => ({ id: item.id, label: item.label, description: item.description })), '', (id) => {
    const preset = MATERIAL_LOOK_PRESETS.find((item) => item.id === id);
    if (preset) materialRecipe = cloneMaterialRecipe(preset.recipe);
    rebuildHeroTile(); renderWorkspace();
  }));
  host.appendChild(sectionHeading('part materials'));
  for (const [part, label] of [['bulb', 'Vessel'], ['gel', 'Gel'], ['tail', 'Tail'], ['mouth', 'Mouth'], ['tentacle', 'Tentacles']] as const) {
    const card = document.createElement('div');
    card.className = 'material-card';
    card.innerHTML = `<div class="material-card-title">${label}</div>`;
    const input = document.createElement('input'); input.type = 'color'; input.value = materialRecipe[part].colorA;
    input.addEventListener('input', () => { materialRecipe[part].colorA = input.value; rebuildHeroTile(); });
    card.appendChild(input);
    const opacity = document.createElement('input'); opacity.type = 'range'; opacity.min = '0'; opacity.max = '1'; opacity.step = '0.01'; opacity.value = String(materialRecipe[part].opacity);
    opacity.addEventListener('input', () => { materialRecipe[part].opacity = Number(opacity.value); rebuildHeroTile(); });
    card.appendChild(opacity);
    host.appendChild(card);
  }
}

function renderGestureWorkspace(host: HTMLElement): void {
  GESTURE_LAYER.enabled = true;
  if (!heroState) return;
  host.appendChild(sectionHeading('pose and motion'));
  host.appendChild(choiceGrid([{ id: 'still', label: 'Still', description: 'Resting form.' }, { id: 'breathing', label: 'Breathing', description: 'Soft pulse.' }, { id: 'drifting', label: 'Drifting', description: 'Pulse plus rotation.' }], 'still', (id) => {
    scene.setFloatEnabled(id !== 'still');
    scene.setRotateEnabled(id === 'drifting');
    showStudioToast(`${id} preview selected`);
  }));
  host.appendChild(sliderGroup('spine', [
    { key: 'spineCurve', label: 'body curve', min: 0, max: 1, step: 0.05 },
    { key: 'spineFreq', label: 'gesture rhythm', min: 0.5, max: 3, step: 0.1 },
  ]));
  host.appendChild(sectionHeading('colony composition'));
  host.appendChild(choiceGrid(['single', 'chain', 'arc', 'helix', 'cluster', 'sheet'].map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1), description: `Arrange units as a ${id}.` })), 'single', (id) => {
    const index = ['chain', 'arc', 'helix', 'cluster', 'sheet'].indexOf(id);
    heroState!.currentTweaks.gestureLayout = Math.max(0, index);
    heroState!.currentTweaks.colonyCount = id === 'single' ? 1 : Math.max(2, heroState!.currentTweaks.colonyCount ?? 5);
    rebuildHeroTile(); renderWorkspace();
  }));
  host.appendChild(sliderGroup('colony', [
    { key: 'colonyCount', label: 'unit count', min: 1, max: 12, step: 1 },
    { key: 'colonySpacing', label: 'spacing', min: 1, max: 5, step: 0.1 },
    { key: 'colonyScaleDecay', label: 'scale decay', min: 0.7, max: 1, step: 0.01 },
  ]));
}

function renderStudyWorkspace(host: HTMLElement): void {
  host.appendChild(sectionHeading('choose a control to study'));
  const controls = PARAMETER_REGISTRY.filter((parameter) => parameter.studyable);
  for (const parameter of controls) {
    const row = document.createElement('button'); row.className = 'study-row'; row.innerHTML = `<strong>${parameter.artistLabel}</strong><small>${parameter.technicalLabel} · ${parameter.kind}</small><small>${parameter.description}</small>`;
    row.addEventListener('click', () => openStudySheet(parameter.path)); host.appendChild(row);
  }
}

function openStudySheet(path?: string): void {
  if (!studySheet) return;
  const parameter = PARAMETER_REGISTRY.find((item) => item.path === path) ?? PARAMETER_REGISTRY.find((item) => item.studyable);
  if (!parameter) return;
  studyState = { ...studyState, open: true, parameterPath: parameter.path, kind: parameter.kind === 'choice' ? 'choice' : 'range', lower: parameter.min, upper: parameter.max };
  studySheet.classList.add('visible');
  studySheet.innerHTML = `<div class="workspace-heading">study a control</div><div class="workspace-promise">${parameter.artistLabel}</div><div class="studio-meta">${parameter.description} Everything else stays fixed from the selected specimen.</div>`;
  const generate = document.createElement('button');
  generate.className = 'ghost-btn';
  generate.textContent = 'Generate study';
  generate.addEventListener('click', () => {
    if (!heroState) return;
    const values = parameter.kind === 'choice'
      ? (parameter.choices ?? []).map((choice) => Number(choice.value)).filter((value) => Number.isFinite(value))
      : Array.from({ length: 7 }, (_, index) => parameter.min + ((parameter.max - parameter.min) * index) / 6);
    const candidates = buildStudyCandidates(heroState.recipe, parameter, values, `${heroState.tileId}::study`);
    const study = createAxisStudy(heroState.recipe, parameter, values, parameter.kind === 'choice' ? 'canonical' : 'canonical', 'parameter-study', `${heroState.tileId}::study`);
    const defs = candidates.map(({ recipe, value }) => {
      const identity: VesselIdentity = { orderId: recipe.vessel.orderId, sectionId: recipe.vessel.sectionId, surfaceId: recipe.vessel.surfaceId };
      const { spec } = sampleVesselSpec({ ...identity, seed: recipe.seed }, recipe.vessel.values);
      const layered = applyLayers(spec, { spec, seed: recipe.seed, rng: tileRng(recipe.id), tweaks: { ...recipe.character.values, ...(recipe.gesture?.values ?? {}) } as Record<string, number> });
      return { id: recipe.id, label: `${parameter.artistLabel} · ${parameter.fmt?.(value) ?? defaultFmt(value)}`, spec: layered, materials: materialRecipe };
    });
    scene.setTiles(defs);
    scene.viewGrid();
    studioStore.addStudy(study);
    studySheet.classList.remove('visible');
    showStudioToast(`${parameter.kind === 'choice' ? 'comparison' : 'range study'} ready: ${parameter.artistLabel}`);
  });
  studySheet.appendChild(generate);
}

function renderTechnicalDrawer(): void {
  if (!technicalContent || !heroState) return;
  const analysis = analyzeRecipe(heroState.recipe);
  technicalContent.innerHTML = `<div>recipe ${recipeHash(heroState.recipe)}</div><div>seed ${heroState.recipe.seed}</div><div>budget ${analysis.budget.level} · ${analysis.budget.estimatedParticles} particles</div><pre>${JSON.stringify(heroState.recipe, null, 2)}</pre>`;
}

function closeHero(): void {
  heroState = null;
  document.body.classList.remove('focus-mode');
  wallRail?.setAttribute('aria-hidden', 'false');
  focusRail?.setAttribute('aria-hidden', 'true');
  wallWorkbench?.setAttribute('aria-hidden', 'false');
  focusWorkbench?.setAttribute('aria-hidden', 'true');
  if (studioLocation) studioLocation.textContent = 'SPECIMEN WALL';
  heroPanel?.classList.remove('visible');
  studySheet?.classList.remove('visible');
  scene.viewGrid();
}

function sliderGroup(groupLabel: string, tweaks: Tweak[]): HTMLElement {
  const wrap = document.createElement('div');
  const heading = document.createElement('div'); heading.className = 'workspace-heading'; heading.textContent = groupLabel; wrap.appendChild(heading);
  for (const t of tweaks) {
    const row = document.createElement('div'); row.className = 'slider-row';
    const head = document.createElement('div'); head.className = 'slider-head';
    const name = document.createElement('span'); name.textContent = t.label;
    const val = document.createElement('span'); val.className = 'val'; val.textContent = (t.fmt ?? defaultFmt)(heroState?.currentTweaks[t.key] ?? t.min); head.append(name, val);
    const input = document.createElement('input'); input.type = 'range'; input.min = String(t.min); input.max = String(t.max); input.step = String(t.step); input.value = String(heroState?.currentTweaks[t.key] ?? t.min);
    input.addEventListener('input', () => { const value = Number(input.value); if (heroState) { heroState.currentTweaks[t.key] = value; val.textContent = (t.fmt ?? defaultFmt)(value); } rebuildHeroTile(); });
    row.append(head, input); wrap.appendChild(row);
  }
  return wrap;
}

function defaultFmt(v: number): string { return Number.isInteger(v) ? String(v) : v.toFixed(2); }

// ── Studio actions ──────────────────────────────────────────────

heroBranch?.addEventListener('click', () => {
  if (!heroState) return;
  const branchId = `${heroState.tileId}::branch-${Date.now().toString(36)}`;
  const parentTileId = heroState.tileId;
  heroState.recipe.id = branchId;
  heroState.recipe.parentId = parentTileId;
  studioStore.updateDraft((draft) => {
    draft.id = branchId;
    draft.parentId = parentTileId;
  });
  rebuildHeroTile();
  showStudioToast('branched — parent preserved, current form is now editable');
});

heroCopy?.addEventListener('click', async () => {
  if (!heroState) return;
  const { spec } = sampleVesselSpec(heroState.identity, heroState.currentTweaks);
  const payload = JSON.stringify({ recipe: heroState.recipe, spec }, null, 2);
  try {
    await navigator.clipboard.writeText(payload);
    showStudioToast('recipe + compiled spec copied');
  } catch {
    showStudioToast('copy unavailable — use Laboratory mode to inspect the recipe');
  }
});

function setStudioMode(mode: StudioMode): void {
  document.body.classList.toggle('laboratory', mode === 'laboratory');
  btnModeBeautiful?.classList.toggle('active', mode === 'beautiful');
  btnModeLaboratory?.classList.toggle('active', mode === 'laboratory');
  studioStore.setMode(mode);
  if (heroState) { renderWorkspace(); renderHeroAnalysis(); updateRecipeMeta(); }
}

btnModeBeautiful?.addEventListener('click', () => setStudioMode('beautiful'));
btnModeLaboratory?.addEventListener('click', () => setStudioMode('laboratory'));

// ── Save button ──────────────────────────────────────────────

heroSave?.addEventListener('click', () => {
  if (!heroState) return;
  const { identity, currentTweaks } = heroState;
  const form: SavedForm = {
    id: heroState.tileId,
    seed: SEED,
    orderId: identity.orderId,
    sectionId: identity.sectionId,
    surfaceId: identity.surfaceId,
    tweaks: { ...currentTweaks },
    savedAt: Date.now(),
  };
  toggleSaveForm(form);
});

// ── View toggle ──────────────────────────────────────────────

const btnViewAll = document.getElementById('btn-view-all');
const btnViewSaved = document.getElementById('btn-view-saved');

function setViewMode(mode: ViewMode): void {
  currentView = mode;
  btnViewAll?.classList.toggle('active', mode === 'all');
  btnViewSaved?.classList.toggle('active', mode === 'saved');
  refreshGrid();
}

btnViewAll?.addEventListener('click', () => setViewMode('all'));
btnViewSaved?.addEventListener('click', () => setViewMode('saved'));

// ── Randomize ────────────────────────────────────────────────

document.getElementById('btn-randomize')?.addEventListener('click', () => {
  const newSeed = randomSeed();
  window.history.replaceState(null, '', `?seed=${newSeed}`);
  location.reload();
});

// ── Wiring ─────────────────────────────────────────────────────────────

scene.setOnSelect((tile) => {
  // Empty-canvas clicks do nothing — only the back button leaves the hero.
  if (!tile) return;
  // Re-clicking the vessel you're already inspecting keeps your tweaks.
  if (heroState && heroState.tileId === tile.id) return;
  openHero(tile);
});

heroBack?.addEventListener('click', closeHero);

btnTechnical?.addEventListener('click', () => {
  technicalDrawer?.classList.toggle('visible');
  renderTechnicalDrawer();
});

workbenchClose?.addEventListener('click', () => {
  document.body.classList.toggle('workbench-collapsed');
});

// ── Boot ───────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  renderLayerBar();
  const ok = await scene.init();
  if (!ok) {
    document.getElementById('hint')!.textContent = 'WebGPU unavailable — falling back to WebGL.';
  }

  renderFilters();
  refreshGrid();
  updateSavedCount();

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
