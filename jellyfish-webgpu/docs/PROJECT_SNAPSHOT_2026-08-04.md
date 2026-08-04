# Project Snapshot — Gallery View Tool

- **Snapshot Date**: 2026-08-04
- **Project**: `jellyfish-webgpu` (Samudra)
- **Status**: Gallery view tool implemented with full layer system, usability features, and character rendering

---

## What Was Built

### Gallery View Tool (`gallery.html` + `src/gallery/`)

A standalone gallery page showing a grid of 96 pure-vessel jellyfish forms (8 orders × 3 sections × 4 surfaces). The gallery is a self-contained HTML page that loads `src/gallery/main.ts` as an ES module.

### Files Modified/Created

| File | Status | Description |
|------|--------|-------------|
| `gallery.html` | Modified | Added topbar action buttons (All/Saved/Randomize), hero panel save button, view toggle, CSS for new UI elements |
| `src/gallery/main.ts` | Modified | Added save/like system (localStorage), view toggle (All/Saved), randomize button, hero panel save button wiring, `rebuildGridWithLayers()` |
| `src/gallery/layers.ts` | Rewritten | Full layer system with VESSEL_LAYER (existing), CHARACTER_LAYER, COSTUME_LAYER, GESTURE_LAYER — all implemented with deterministic RNG-based builds |
| `src/gallery/VesselScene.ts` | Modified | Ported tail, mouth, and tentacle rendering from `JellyfishArchetype.buildMeshes()` into `buildVesselGroup()` |
| `src/gallery/vesselCatalog.ts` | Unchanged | Form grammar for vessel layer (unchanged) |
| `src/gallery/vesselSampler.ts` | Unchanged | Deterministic spec sampling (unchanged) |
| `src/gallery/prng.ts` | Unchanged | Seeded PRNG (unchanged) |

---

## Layer System

### VESSEL_LAYER (active by default)
- Realized by `vesselSampler.ts` + `vesselCatalog.ts`
- The gallery grid IS the vessel layer sampling its full parameter space
- Tweaks: order family (silhouette), section kind (cross-section), surface treatment

### CHARACTER_LAYER (disabled by default)
- Enables `features.tail`, `features.mouth`, `features.tentacles` on the spec
- Sets geometry config: `tentacleSegments`, `tailArmSegments`, `tailRibsCount`
- Picks `tentacleStyle` (curtain vs tube) deterministically from seed
- Tweaks defined: tailLength, tentacleCount, tentacleSegments, mouthSize, tailRibs

### COSTUME_LAYER (disabled by default)
- Applies look/color overrides via `Partial<LookConfig>`
- Sets emitters (tentacle rib indices)
- Picks tentacle style
- Tweaks defined: emitterCount, tentacleStyle

### GESTURE_LAYER (disabled by default)
- Adds spine curve (sine type)
- Adds colony layout (chain/arc/helix/cluster/sheet)
- Tweaks defined: spineCurve, colonyCount

### Layer Application
- `applyLayers(base, io)` iterates all enabled layers in order
- Each layer's `build()` is a pure function of `(io, params)`
- Layers are applied during grid assembly and hero panel rebuilds

---

## Rendering Port (VesselScene → JellyfishArchetype)

Ported the following from `JellyfishArchetype.buildMeshes()` to `VesselScene.buildVesselGroup()`:

- **Tail mesh**: renders when `gd.faces.tail.length > 0` using `TailNodeMaterial`
- **Mouth mesh**: renders when `gd.faces.mouth.length > 0` using `TailNodeMaterial` with mouth-specific colors
- **Tentacle meshes**: supports both curtain mode (single merged mesh) and tube mode (per-group meshes)
- **Inner structural lines**: `gd.links.linesInner` with `InterpolatedLineMaterial`
- **Tail rib pulsing**: already existed in `applyExpansion()` for float animation

Materials imported: `TailNodeMaterial`, `TentacleNodeMaterial`

---

## Usability Features (Phase 1)

### Save/Like System
- `♥ save` button in hero panel
- Saved forms stored in `localStorage` under key `jellyfish-gallery-saved`
- `SavedForm` interface: `{ id, seed, orderId, sectionId, surfaceId, tweaks, savedAt }`
- Save button toggles between "♥ save" and "♥ saved" states
- Saved count displayed in topbar

### View Toggle
- `All` / `Saved` toggle buttons in topbar
- `currentView` state (`'all'` | `'saved'`)
- `refreshGrid()` filters by saved view mode

### Randomize Button
- Generates new seed via `randomSeed()`
- Updates URL `?seed=` parameter
- Reloads page with new seed for fresh grid

### Layer Bar
- Buttons for each layer (Vessel, Character, Costume, Gesture)
- Click to toggle layer on/off
- Active layers shown with pink highlight
- Grid rebuilds with `applyLayers()` when layers change

---

## Build Status

- `npm run build` ✅ passes (77 modules, 5.78s)
- TypeScript errors in `layers.ts` and `main.ts` ✅ all fixed
- Remaining TS errors are pre-existing in unrelated files (`presets.ts`, `TailNodeMaterial.ts`, etc.)

---

## Next Steps

### Phase 2A — Character Layer Tweak Sliders in Hero Panel
- Add Character layer tweak sliders to the hero panel (`renderHeroSliders()`)
- When Character layer is active, show tail length, tentacle count, mouth size, tail ribs sliders
- Tweak values should flow through `applyLayers()` when rebuilding the hero tile

### Phase 2B — Costume Layer Tweak Sliders
- Add emitter count and tentacle style sliders to hero panel
- Allow users to control costume parameters per-tile

### Phase 2C — Gesture Layer Tweak Sliders
- Add spine curve, colony count sliders to hero panel
- Wire gesture parameters into the spec

### Phase 3 — Layer Bar Interactivity Enhancement
- Layer bar should show which layers are active with visual feedback
- Consider a "layer opacity" or "layer blend" control
- Add keyboard shortcuts for layer toggling

### Phase 4 — Performance & Polish
- Verify all 96 tiles render correctly with Character layer enabled
- Check frame rate with tail/mouth/tentacle geometry active
- Add loading state when switching layers (grid rebuild is synchronous but could be slow)
- Consider lazy-loading layer modules for code-splitting

### Phase 5 — Integration with Main Viewer
- Wire gallery layer selections back to the main viewer (`/` route)
- Share layer state between gallery and viewer
- Allow "open in viewer" from gallery hero panel

### Phase 6 — Save Format Enhancement
- Save format currently includes tweak values ✅
- Consider saving layer enabled state per saved form
- Consider saving camera view state per saved form

---

## Key Design Decisions

1. **Deterministic layers**: All layer `build()` functions use seeded RNG so the same seed always produces the same output. This ensures the gallery grid is reproducible.

2. **Layer ordering**: Vessel → Character → Costume → Gesture. Later layers see earlier layers' output and can override fields.

3. **Rendering port strategy**: Tail/mouth/tentacle rendering was ported directly from `JellyfishArchetype.buildMeshes()` rather than refactoring the archetype. This keeps the gallery independent of the viewer's archetype system.

4. **localStorage for saves**: Simple key-value storage under `jellyfish-gallery-saved`. No backend required. Tweak values are included in the save payload.

5. **Layer bar as toggle**: Clicking a layer button toggles it on/off and rebuilds the grid. This gives immediate visual feedback about which layers are active.

---

## Update History

- **2026-08-04**: Initial gallery snapshot — 96-form vessel gallery, layer stack, character rendering, save/view controls.
- **2026-08-04**: Procedural Sculpture Studio foundation — recipe model, parameter registry, studio modes, construction bench, branch/study actions, taste persistence, diagnostics, and versioned storage.

## Procedural Sculpture Studio Foundation

The gallery is now being shaped as an artist-facing instrument rather than only a tile browser. The current implementation establishes the domain boundary for a comparative specimen wall and parts bench while preserving the existing deterministic WebGPU renderer.

### Artist-facing interaction surface

- Added **Beautiful** and **Laboratory** mode controls.
- The selected specimen inspector now includes a **construction bench** for Tail, Mouth, and Tentacles.
- Character modules can be explicitly added or removed; module presence is represented separately from numeric values in the draft recipe.
- Added **branch** action language so the current specimen can become a preserved parent-linked working form.
- Added a first **study** action that generates a deterministic one-axis specimen row from the unified parameter registry.
- Added **copy** action for the exact recipe plus compiled spec JSON.
- Added readable relationship and budget analysis in the inspector: estimated particles, comfortable/watch/heavy/blocked status, and statements about tentacle density, detail, tail balance, symmetry, and colony cost.
- Beautiful mode emphasizes artistic labels such as `bell scale`, `tail reach`, `tendril density`, and `organic irregularity`; Laboratory mode exposes the same controls as technical inspection.

### Exact specimen recipe model

New `SpecimenRecipe` state is separate from Three.js objects and UI state. It contains:

- Schema version, stable recipe id, optional parent id, creation timestamp, and seed.
- Vessel identity and vessel tweak values.
- Explicit Character module presence: `tail`, `mouth`, and `tentacles`.
- Character tweak values retained independently of whether a module is currently present, enabling reversible removal/re-add during editing.
- Optional Costume and Gesture value maps.

Recipe identity and an FNV-style hash are available for Laboratory inspection. Camera position, mode, favorites, studies, taste ranges, and derived analysis are intentionally not embedded in the exact recipe.

### Parameter registry

Added `src/gallery/model/parameterRegistry.ts` as a shared dual-vocabulary registry. It gathers the existing Vessel and Character descriptors and adds Costume and Gesture descriptors with:

- Artistic label.
- Technical path.
- Description.
- Layer and group ownership.
- Numeric type and canonical min/max/step.
- Formatting and study eligibility.

The registry is intended to become the shared source of truth for future range studies, parameter relationships, labels, and Beautiful/Laboratory presentation.

### Study and taste foundations

Added:

- `src/gallery/model/study.ts` — deterministic one-axis values, canonical bounds, three cold-start probe values, favorite-range inference, candidate recipe generation, and study metadata.
- `src/gallery/model/tasteProfile.ts` — favorite observations, explicit ranges, confidence/sample count, and repeated combination observations.
- `src/gallery/model/analysis.ts` — pure budget estimation and artist-readable relationships/warnings.
- `src/gallery/persistence.ts` — versioned `jellyfish-gallery-studio` storage with migration from the previous `jellyfish-gallery-saved` format.
- `src/gallery/model/galleryStore.ts` — initial wall/selection/draft/favorite/study/mode state boundary and persistence actions.

The persistence document is versioned as:

```ts
{
  version: 3,
  specimens,
  favorites,
  studies,
  tasteProfile,
}
```

Existing legacy saves migrate into exact recipe records with Vessel values preserved and Character modules initially disabled because the old format did not encode per-module presence.

### Current implementation limits

This update establishes the studio foundation, not the complete final instrument. The following remain planned:

- Full per-recipe layer compilation replacing the remaining global layer toggle path.
- Auto-composed parent/study/branch wall families and family collapse/pinning.
- Full before/after layer-addition range studies.
- Named part recipe cards with editable/provisional vocabulary.
- Complete per-specimen Costume and Gesture editing.
- Taste profile cards and quiet Beautiful-mode recommendations in the visible UI.
- Interactive lower/upper endpoint marking and favorite-derived range application.
- Two-axis study matrices; the data model is one-axis now and can extend later.
- Stable branch persistence and lineage rendering across reloads.
- Renderer tile-level update queue and full-wall performance tuning.
- Cross-device sync or external recipe export/import.

### Files added/changed in this update

| File | Description |
|------|-------------|
| `src/gallery/model/recipe.ts` | Exact `SpecimenRecipe`, wall metadata, cloning, branch identity, recipe hash |
| `src/gallery/model/parameterRegistry.ts` | Unified artistic/technical parameter descriptors and canonical ranges |
| `src/gallery/model/study.ts` | One-axis study values, cold-start probes, favorite ranges, candidate generation |
| `src/gallery/model/tasteProfile.ts` | Parameter and combination taste observations with confidence |
| `src/gallery/model/analysis.ts` | Pure geometry/particle estimates, relationship statements, warnings |
| `src/gallery/persistence.ts` | Versioned storage and legacy save migration |
| `src/gallery/model/galleryStore.ts` | Initial studio state/store boundary |
| `src/gallery/main.ts` | Studio mode controls, recipe-backed hero state, module tray, branch/study/copy/analysis actions, layered grid rebuild fix |
| `gallery.html` | Beautiful/Laboratory controls, construction bench, analysis panel, studio actions, mode styling |

### Verification status

- `npm run build` ✅ passes; gallery bundle emitted successfully (`gallery.js` ~54 kB before gzip).
- Gallery-specific TypeScript changes ✅ clean under `npm run typecheck`.
- Repository-wide `npm run typecheck` ⚠️ still reports pre-existing errors in `AttachEmitters.ts`, `CreatureFactory.ts`, `creatures/presets.ts`, `JellyfishGeometry.ts`, and `TailNodeMaterial.ts`; no new gallery model/main errors remain.
- `npm test -- --run` ⚠️ 29 tests passed, 2 existing `InterpolationSystem`/`PhysicsBridge` tests failed; no gallery studio tests exist yet.
- `npm run build` ✅ passes; Vite emits the gallery bundle successfully, with the existing large shared Three.js chunk warning.
- Manual browser verification of all new controls and full-wall performance is still pending and should be recorded here after running the gallery through the browser.

## Next Steps — Studio Instrument

1. Make all wall specimens complete independent recipes rather than relying on global layer enablement.
2. Replace the hero panel with a wall-preserving specimen inspector and auto-composed families.
3. Implement full before/after range studies when adding Tail, Mouth, Tentacles, Costume, or Gesture.
4. Add named provisional part recipes with physical subtitles and advanced drawers.
5. Add visible taste profile cards, endpoint marking, favorite-derived ranges, and combination suggestions.
6. Persist branch lineage and study candidates as exact recipes.
7. Add renderer tile-level updates, loading/failure states, and performance budgets for all-layer walls.
8. Add two-axis parameter matrices only after one-axis studies are artistically useful.
9. Add recipe export/import and optional range-profile export.
10. Re-run browser, determinism, typecheck, build, and full-wall performance verification after each studio phase.

---

## UX Reset Update — Focused Gallery Workspaces

### Problem addressed

The previous studio foundation still behaved like the original cluttered hero panel: all controls were visible together, Beautiful/Laboratory were mostly cosmetic, Study immediately replaced the wall without a question, categorical properties were presented as numeric controls, and Costume/Gesture spec changes were not fully consumed by the gallery renderer.

### New navigation model

The gallery now uses a focused workspace sequence:

```text
Wall → Vessel → Character → Costume → Gesture → Study
```

- **Wall** remains the starting destination.
- Selecting a specimen opens a focused specimen panel instead of exposing every layer at once.
- Only the active workspace renders its controls.
- A workspace trail makes the next destination explicit.
- A Technical drawer holds recipe/seed/budget JSON instead of putting diagnostics on the primary Beautiful surface.
- The old always-visible Motion Tweakpane and old global layer bar are removed from the main interaction path.

### Workspace behavior

- **Vessel**: silhouette family, cross-section, and surface treatment use choice cards; continuous body controls are grouped under an advanced disclosure.
- **Character**: Tail, Mouth, and Tentacles are explicit anatomy modules; the active module controls are shown in the Character workspace. Tentacle type is now Curtain/Tube choice buttons rather than a fake slider.
- **Costume**: whole-creature material looks plus per-part material cards for Vessel, Gel, Tail, Mouth, and Tentacles. Color and opacity changes now flow into the gallery tile material construction.
- **Gesture**: separate pose/motion and colony sections. Still/Breathing/Drifting choices control preview motion; Single/Chain/Arc/Helix/Cluster/Sheet choices control the compiled colony layout and unit count.
- **Study**: opens a Study Sheet with a grouped control list, artistic label, technical path, description, and control kind before generating any comparison.

### Discrete versus continuous controls

`src/gallery/model/parameterRegistry.ts` now distinguishes:

- `continuous` — slider/range study.
- `integer` — count/detail control.
- `boolean` — toggle semantics.
- `choice` — segmented choice/comparison semantics.

At minimum, tentacle style, vessel family, cross-section, surface treatment, and colony layout are represented as choices rather than sliders.

### Costume renderer integration

Added `src/gallery/materials.ts` with a serializable `GalleryMaterialRecipe` and four whole-creature material looks:

- Moonlit.
- Coral.
- Glass.
- Violet Bloom.

`VesselScene` tile definitions now accept material recipes. Bulb, gel, tail, mouth, tentacle, and related material construction consumes recipe values instead of the previous hardcoded palette. This establishes the renderer seam needed for per-body-part shader/material exploration.

### Gesture renderer integration

Gesture layer compilation now exposes a categorical `gestureLayout` value and produces a Siphonophore colony spec when colony count is greater than one. `VesselScene` expands the compiled spec through the existing renderer-agnostic `createCreatureRig()` path and builds positioned/scaled unit groups for chain, arc, helix, cluster, and sheet layouts.

The focused Gesture workspace also owns the simple motion preview controls rather than the global page-level Tweakpane.

### Study Sheet behavior

The Study Sheet now requires explicit control selection before generation:

1. Choose a control from the grouped registry.
2. See whether it is continuous/integer/choice.
3. Confirm generation.
4. Generate a deterministic comparison while keeping the selected recipe as baseline.

Continuous controls generate a numeric range row. Choice controls generate a categorical comparison. This replaces the previous opaque `study` action that silently replaced the gallery.

### Files added/changed

| File | Change |
|------|--------|
| `src/gallery/workspaces.ts` | Workspace definitions and step order |
| `src/gallery/materials.ts` | Material recipe type, defaults, whole-creature looks, color helpers |
| `src/gallery/studySheet.ts` | Study sheet state and choice-study helpers |
| `src/gallery/model/parameterRegistry.ts` | Explicit continuous/integer/boolean/choice metadata |
| `src/gallery/main.ts` | Focused workspace navigation, choice controls, material workspace, gesture workspace, technical drawer, Study Sheet generation |
| `src/gallery/VesselScene.ts` | Material recipe inputs and renderer-agnostic colony unit expansion |
| `src/gallery/layers.ts` | Gesture layout choice and Siphonophore colony compilation |
| `gallery.html` | Focused workspace shell, step trail, technical drawer, Study Sheet, choice/material styling |

### Known limitations after this slice

- Browser-level manual verification of every workspace and every colony layout remains pending.
- Recipe material/gesture state is not yet fully serialized into the versioned persistence document.
- Gesture spine curvature is still represented in the spec but requires further geometry/animation work to become a visibly curved focused specimen.
- Per-part shader texture/pattern uniforms beyond the currently exposed material setters need additional material API work.
- Study range endpoints and taste-profile suggestions are not yet exposed in the Study Sheet UI.
- Parent/variant family strip rendering is reserved in the focused shell but not yet populated with full lineage data.
- The main gallery still contains some legacy saved-form compatibility code while persistence migration is completed.

### Verification

- `npm run build` ✅ passes; gallery bundle emits successfully.
- Gallery-specific TypeScript changes ✅ clean; repository-wide typecheck still reports the existing unrelated errors in creature/material files.
- `npm test -- --run` ⚠️ 29 tests pass and the same 2 existing `InterpolationSystem`/`PhysicsBridge` tests fail.
- Manual browser verification and full-wall performance measurements remain the next validation task.

---

## Spatial Studio Redesign Update

### Why the prior UX was replaced

The previous focused workspace pass still preserved a fixed right-side overlay and a vertically stacked control dump. This made the gallery feel like the original Tweakpane UI with new labels rather than a design tool. It also allowed canvas camera behavior to leak into UI interaction because `VesselScene` listened for pointer movement/up events on `window`.

### Three-zone studio layout

The gallery now uses an explicit spatial shell:

```text
┌──────────────┬────────────────────────────────────┐
│ construction │                                    │
│ rail         │          specimen stage             │
│              │          canvas only                │
├──────────────┴────────────────────────────────────┤
│                 active workbench                   │
└────────────────────────────────────────────────────┘
```

- Left rail: specimen wall state or focused five-stage construction graph.
- Center: large specimen canvas with no control overlay.
- Bottom: active node workbench with horizontal cards.
- Header: compact studio identity, mode, technical access, and new-seed action.
- Workbench can collapse without changing the specimen stage.

Primary controls no longer live in a floating right panel. The old hero panel is retained only as a hidden compatibility target while the explicit rail/stage/workbench shell is active.

### Five-stage construction graph

Focused specimens expose:

```text
Vessel → Character → Costume → Gesture → Study
```

Selecting a stage changes only the bottom workbench. The center specimen and left specimen identity remain stable. This gives each control a clear destination instead of presenting all properties in one scrollable surface.

### Pointer ownership fix

`VesselScene` camera input is now canvas-owned:

- Pointer movement/up listeners are attached to the canvas, not `window`.
- Active pointer id is tracked.
- Pointer capture/release is explicit.
- `pointercancel` releases the session.
- Wheel zoom remains canvas-only.

This prevents clicking workbench controls, rail buttons, color inputs, and technical UI from orbiting the specimen or triggering canvas selection.

### Workbench model

The bottom workbench uses authored cards rather than a single Tweakpane tree:

- Vessel: silhouette, cross-section, surface, and body cards.
- Character: presence, Tail, Mouth, Tentacles, and Curtain/Tube choice.
- Costume: whole looks and per-part material cards.
- Gesture: mode, pose, pulse, drift, colony layout, and colony geometry.
- Study: explicit control selection and generation workflow.

The parameter registry distinguishes continuous, integer, boolean, and choice controls. Categorical values such as tentacle style and colony layout are no longer treated as numeric sliders.

### Current limitations

- The spatial shell is implemented, but the hidden compatibility hero nodes and some legacy state names remain in `main.ts` and should be removed once manual browser verification confirms all workbench paths.
- The workbench is horizontally scrollable and needs visual testing at multiple viewport widths.
- Gesture colony composition is renderer-backed through the existing rig path, but focused framing and all layout variants still require manual visual verification.
- Costume material recipe wiring is present, but all shader-specific uniforms are not yet surfaced as authored cards.
- The Technical drawer remains a compact diagnostic overlay; it should eventually become a Laboratory workbench card to fully eliminate overlays.

### Verification

- `npm run build` ✅ passes; Vite emits the spatial studio gallery bundle.
- Gallery-specific TypeScript ✅ clean; repository-wide typecheck still reports pre-existing errors in creature/material files.
- `npm test -- --run` ⚠️ 29 tests pass; the same 2 existing `InterpolationSystem`/`PhysicsBridge` tests fail.
- Manual verification still required: click every workbench control while observing camera stability, verify all node transitions, inspect Costume changes, inspect Gesture colony layouts, and test responsive workbench behavior.

---

## UI Guideline Review and Interaction Polish

### Review basis

The gallery was reviewed against the local `userinterface-wiki` guidance, especially:

- Fitts target sizing.
- Hick's law and progressive disclosure.
- Miller-style chunking.
- Consistent spacing scale.
- Tabular numeric display.
- Reduced-motion behavior.
- Clear spatial boundaries between interactive regions.

### Changes made

- Added a shared spacing token scale from 4px through 48px.
- Increased header, rail, node, and choice targets to comfortable 36–48px minimum heights.
- Added visible active and pressed states to rail buttons, node buttons, choice cards, and header actions.
- Added `font-variant-numeric: tabular-nums` to numeric control readouts.
- Added consistent 180ms UI transitions and subtle 98% pressed feedback.
- Added `prefers-reduced-motion: reduce` handling for all UI transitions and animations.
- Kept the construction graph and workbench cards grouped by task instead of presenting the whole parameter space simultaneously.
- Preserved explicit canvas/UI boundaries so workbench interaction does not pass through to camera input.

### Current shipping state

- `gallery.html` now uses the three-zone shell: construction rail, specimen stage, and bottom workbench.
- `VesselScene.ts` uses canvas-only pointer capture with pointer IDs and `pointercancel`; the former window-level pointer listeners are removed.
- `main.ts` routes node selection into the bottom workbench and updates the studio location label as the active node changes.
- The old right-side hero panel remains only as a hidden compatibility target and is not part of the primary surface.

### Follow-up improvements

- Remove the hidden compatibility hero DOM and legacy hero state once browser verification confirms the new workbench path.
- Move the remaining Technical drawer into the Laboratory workbench so all primary UI uses explicit layout zones.
- Add browser-level pointer regression coverage for clicking every workbench control during/after canvas drags.
- Validate responsive workbench behavior at narrow viewports.
- Continue reducing the remaining control surface using authored card groups and parameter-specific studies.
