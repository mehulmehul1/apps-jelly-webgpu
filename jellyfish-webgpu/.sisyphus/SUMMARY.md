# Samudra Jellyfish WebGPU — Sisyphus Summary

## Project
WebGPU-powered jellyfish visualization with a multi-creature archetype system.

## Architecture

### Core Archetype System
- **`Archetype` interface** (`src/creatures/archetypes/Archetype.ts`) — Contract: `create()`, `animate()`, `createDebugGUI()`
- **`archetypeRegistry`** (`src/creatures/archetypes/archetypeRegistry.ts`) — Global registry. Stores named archetypes and forwards lifecycle calls. Each archetype file calls `registerArchetype(...)` as a side-effect at module level.
- **Scene** (`src/scene.ts`) — Imports all archetype files as side-effects. After `init()`, reads registered archetypes and exposes a dropdown to switch between them.

### Completed Archetypes (all registered and clean)

| Archetype | Geometry | Animation | Presets | File |
|---|---|---|---|---|
| **Jellyfish** | Bell (lathe), Arms, Tentacles (curve), Oral Arms | Bell pulse, Tentacle wave, Drift | Moon Jelly, Lion's Mane, Box Jelly, Crystal, Flower Hat, Violet, Fried Egg, Spotted Lagoon | `JellyfishArchetype.ts` |
| **Fish** | Body (capped cylinder), Tail (swept), Pectoral+Dorsal+Fins | Body wiggle, Tail sway, Fin flutter, Depth hover | Clownfish, Angelfish, Puffer, Neon Tetra, Moorish Idol | `FishArchetype.ts` |
| **Anemone** | Stalk (tapered), Tentacles (swept), Base disc | Tentacle sway, Stalk flex, Bend-to-current | Magnificent, Bubble-Tip, Tube, Starlet, Beadlet | `AnemoneArchetype.ts` |

### Presets
- `jellyfish-presets.ts` — 8 named jellyfish configurations
- `fish-presets.ts` — 5 named fish configurations (inline inside FishArchetype)
- `anemone-presets.ts` — 5 named anemone configurations (inline inside AnemoneArchetype)

## Completed Work

### Phase A — Archetype System Foundation
1. [x] **Archetype interface** — Defined core contract
2. [x] **Archetype Registry** — Global named registry with delegation
3. [x] **JellyfishArchetype extraction** — Moved all jellyfish logic from scene into standalone archetype
4. [x] **Jellyfish presets** — 8 named configurations
5. [x] **Backward compat gate** — `createJellyfish()` wrapper preserves old API
6. [x] **Scene integration** — Side-effect imports all archetypes, dropdown for selection

### Phase B — Creature Expansion
7. [x] **FishSpec + AnemoneSpec** — Full type definitions for both creatures
8. [x] **FishArchetype** — Geometry builder (body/tail/fins) + animation driver + 5 presets
9. [x] **AnemoneArchetype** — Geometry builder (stalk/tentacles/base) + animation driver + 5 presets

### Verification
- All diagnostics clean across every file
- `tsc` compiles without errors
- All archetypes self-register via side-effect imports

## Relevant Paths
```
src/
  creatures/
    archetypes/
      Archetype.ts
      archetypeRegistry.ts
      JellyfishArchetype.ts
      FishArchetype.ts
      AnemoneArchetype.ts
    presets/
      jellyfish-presets.ts
      fish-presets.ts
```

## Plans
- `.sisyphus/plans/archetype-system.md` — Phase A plan
- `.sisyphus/plans/system-b-phase1-wire-up.md` — Phase B plan (completed)

## Evidence Logs
- `.sisyphus/evidence/` — Compile checks, backward compat verification, baseline counts
