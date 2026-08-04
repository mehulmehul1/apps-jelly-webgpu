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
