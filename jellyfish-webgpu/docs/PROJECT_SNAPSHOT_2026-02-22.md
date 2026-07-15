# Project Snapshot

- Snapshot Date: 2026-02-22
- Project: `jellyfish-webgpu`
- Status: Active prototype with runtime scene + visual builder integration

## Runtime Overview

- Entry point launches WebGPU scene and mounts React overlay UI (`src/main.ts`).
- Main scene is `JellyfishMaterialTestScene` with soft-body physics, post-processing, and look editor (`src/scenes/JellyfishMaterialTest.ts`).
- Build/dev scripts run via Vite; fxhash scripts exist for export workflows (`package.json`).

## Current Creature Set

Implemented archetypes in `src/jellyfish/creatures/presets.ts`:

1. Comb Jelly
2. Salp
3. Siphonophore
4. Anemone Crown
5. Glass Sponge
6. Ascidia Egg
7. Echinoderm Star

Additional slot:

- `customLab` (loads a saved visual-lab form from `localStorage`).

## Generative System Shape

- `CreatureSpec` is the central modular schema (symmetry, spine, cross-section, surface, emitters, colony, budgets).
- `validateCreatureSpec` clamps geometry, topology, emitter counts, and particle budgets.
- `mutateCreatureSpec` applies small modular mutations for iterative exploration.
- `JellyfishGeometry` generates procedural mesh + particle/constraint structures from spec.

## Visual Builder State

- Visual lab UI exists and is wired to scene updates (`src/editor/visual-lab/VisualLab.tsx` -> `updateFromGraph`).
- Graph types and assembler are implemented:
  - `FormDefinition`
  - `CreatureGraph` (`Part` + `Distributor`)
  - `GraphTraverser`
  - `CreatureAssembler`
- Current limitation: hook graph construction is still simplified and marked with TODO (`src/editor/visual-lab/useVisualLabState.ts`).

## Stage 3 Planning Status

- Stage 3 docs target 12-15 archetypes, migrating existing 7 first.
- Stage 3 checklist currently tracks early progress with many pending deliverables.

## Known Technical Gaps

- Typecheck currently fails on multiple existing editor/typing mismatches (not fixed in this snapshot).
- Some docs describe aspirational architecture beyond current implementation.

