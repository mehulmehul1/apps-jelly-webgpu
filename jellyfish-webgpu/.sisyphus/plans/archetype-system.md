# Multi-Archetype Creature System

## TL;DR

> **Quick Summary**: Refactor the monolithic jellyfish rendering pipeline into a multi-archetype system. Extract a `CreatureArchetype` interface, wrap existing jellyfish code as `JellyfishArchetype`, then build `FishArchetype` (bilateral ring topology + undulation) and `AnemoneArchetype` (column + tentacle crown + sway) -- all sharing Particulate.js physics and the 5-material iridescent shader stack.
>
> **Deliverables**:
> - `CreatureArchetype` interface + registry pattern
> - `JellyfishArchetype` -- backward-compatible wrapper (12 existing presets)
> - `FishArchetype` -- bilateral vertebra rings + fin meshes + undulation animation
> - `AnemoneArchetype` -- column stalk + tentacle crown + sway animation
> - Scene refactored to archetype-agnostic dispatcher
> - Creature selector with archetype-category grouping
>
> **Estimated Effort**: Large (2-3 weeks engineering time)
> **Parallel Execution**: YES -- 4 waves
> **Critical Path**: Interface -> Scene refactor -> JellyfishArchetype -> Backward compat gate -> Fish/Anemone (parallel) -> Scene integration

---

## Context

### Original Request

The user wants to transform the current scene from a single jellyfish renderer into a multi-archetype creature system. The key insight: the existing "presets" are all variations of jellyfish -- real variety requires fundamentally different body plans (fish, anemone, etc.), each with its own particle topology, mesh generation, and animation logic -- while sharing the Particulate.js physics engine and the 5-material iridescent translucent shader stack.

### Interview Summary

**Key Discussions**:
- Archetype vs Preset distinction: presets are parameter configurations WITHIN an archetype; archetypes are fundamentally different body plans
- Option 2 (real CreatureArchetype interface with Fish, Anemone, etc.) selected over Option 1 (parameter overlay on jellyfish base)
- Particulate.js + 5-material iridescent stack confirmed as SHARED engine for ALL archetypes
- Each archetype gets unique: particle topology, constraint graph, mesh geometry, animation driver
- No cross-archetype morphing -- destroy-first model (swap archetype -> rebuild body + meshes)
- No dynamic plugin loading -- static registry of known archetypes
- No modular editor UI yet -- focus on runtime archetype system first

**Research Findings**:
- JellyfishGeometry.create() is 1158 lines of monolithic builder: core->bulb->tail->mouth->tentacles with mutable array pattern
- Scene animation loop: timePhase() -> updateRibs() -> tick() -> render()
- CreatureSpec has both generic and jellyfish-specific fields
- PhysicsBridge dual-buffer system exists but is unused debt
- nudgeFromMouse pattern: 5 pin constraints + directional force

### Metis Review

**Identified Gaps** (addressed):
- **CreatureSpec union design**: Must decide how spec shape maps to archetypeId
- **PRESETS restructuring**: Each preset currently lacks `archetypeId` -- must add field
- **PhysicsBridge debt**: Dual-buffer syscall pattern is unused -- documented as not-fixed
- **Animation params consolidation**: pulseSpeed/pulseAmplitude on scene -> move into archetype BodyData
- **Dispose safety**: Must ensure archetype.dispose() cleans up resources

---

## Work Objectives

### Core Objective
Transform monolithic jellyfish pipeline into multi-archetype system with CreatureArchetype interface, backward-compatible JellyfishArchetype, plus 2 new archetypes (Fish, Anemone).

### Concrete Deliverables
- `src/creatures/archetypes/CreatureArchetype.ts` -- interface
- `src/creatures/archetypes/archetypeRegistry.ts` -- registry
- `src/creatures/archetypes/JellyfishArchetype.ts` -- wraps existing code
- `src/creatures/archetypes/FishGeometryBuilder.ts` -- bilateral rings
- `src/creatures/archetypes/FishArchetype.ts` -- fish animation
- `src/creatures/archetypes/AnemoneGeometryBuilder.ts` -- column + tentacle crown
- `src/creatures/archetypes/AnemoneArchetype.ts` -- anemone animation
- `src/creatures/presets/fish-presets.ts` -- 2+ fish presets
- `src/creatures/presets/anemone-presets.ts` -- 2+ anemone presets
- `src/scenes/CreatureScene.ts` -- refactored scene
- `src/ui/CreatureSelectMenu.ts` -- grouped by archetype

### Definition of Done
- [ ] All 12 existing jellyfish presets render identically before/after
- [ ] Fish archetype: visible undulation + stable physics + 2 presets
- [ ] Anemone archetype: visible sway + stable physics + 2 presets
- [ ] Scene can switch between all 3 archetypes without errors
- [ ] Creature selector shows archetype categories
- [ ] Zero LSP errors

### Must Have
- Backward compatibility -- existing presets must look identical
- CreatureArchetype interface clean enough for 3rd party authors
- Fish and Anemone presets visible and animating in the scene
- Shared Particulate.js + 5-material shader stack

### Must NOT Have (Guardrails)
- NO cross-archetype morphing -- destroy-first model only
- NO dynamic plugin loading -- static registry only
- NO modular editor/builder UI -- runtime first
- NO changing JellyfishGeometry internals -- wrap existing code
- NO PhysicsBridge refactoring -- document debt
- NO removing existing preset functionality

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** -- ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None (agent QA scenarios instead)

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-N-slug.ext`.
- Count verification: Bash scripts
- Physics stability: Bash + tick simulation
- Visual: Playwright screenshots
- Compile: `bun run tsc --noEmit`

---

## Execution Strategy

### Parallel Waves

Wave 1 (Foundation -- Start Immediately): Task 1 (interface) + Task 2 (union) + Task 3 (BodyPlan) + Task 4 (baseline)
Wave 2 (Scene + Backward Compat -- MUST complete first): Task 5 (scene refactor) + Task 6 (JellyfishArchetype) + Task 7 (gate)
Wave 3 (MAX PARALLEL): Task 8-11 (Fish: spec, geometry, animation, presets) + Task 12-14 (Anemone: spec, geometry, animation)
Wave 4 (Integration + Polish): Task 15 (integrate) + Task 16 (UI) + Task 17 (benchmark) + Task 18 (docs)
FINAL (4 parallel reviews): F1 (compliance) + F2 (quality) + F3 (QA) + F4 (scope)

Critical Path: T1 -> T5 -> T6 -> T7 -> [T15-T17] -> F1-F4

---
## TODOs

- [ ] 1. Define CreatureArchetype interface

  **What to do**:
  Create `src/creatures/archetypes/CreatureArchetype.ts` with:
  - `buildBody(spec, config, rng) -> BodyData`
  - `buildMeshes(data, materials, options) -> UnitRuntime[]`
  - `createMaterials(lookConfig, refractionTarget) -> UnitMaterialPack`
  - `animateBody(data, time, delta, amplitude)`
  - `applyInteraction?(data, force, origin)`
  - `dispose(data)`

  Create `src/creatures/archetypes/archetypeRegistry.ts`:
  - `registerArchetype(a)`, `getArchetype(id)`, `getAllArchetypes()`

  **Must NOT do**: Keep `geometryData` as `unknown`; don't implement any archetype.

  **Parallelization**: YES -- Wave 1 (with Tasks 2, 3, 4)

  **References**: `src/jellyfish/creatures/CreatureSpec.ts`, `src/jellyfish/JellyfishGeometry.ts`

  **Acceptance Criteria**:
  - [ ] CreatureArchetype interface compiles
  - [ ] Registry module exports registerArchetype/getArchetype
  - [ ] `bun run tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: Interface compiles
    Tool: Bash
    Steps:
      1. Run `bun run tsc --noEmit 2>&1`
    Expected Result: No TypeScript errors
    Evidence: .sisyphus/evidence/task-1-interface-compile.txt
  ```

  **Commit**: YES -- `feat(archetypes): define CreatureArchetype interface + registry`

- [ ] 2. Redesign CreatureSpec as discriminated union

  **What to do**:
  Refactor `src/jellyfish/creatures/CreatureSpec.ts`:
  1. `CreatureSpec` becomes discriminated union on `archetypeId`
  2. `CreatureSpecBase` with shared fields (label, seed, unitCount, bodyPlan, materials, look, physics)
  3. `JellyfishSpec extends CreatureSpecBase` -- keeps ALL existing fields
  4. `FishSpec extends CreatureSpecBase` -- minimal stub (expanded in Task 8)

  **Must NOT do**: Don't change existing field names; don't remove fields.

  **Parallelization**: YES -- Wave 1

  **Acceptance Criteria**:
  - [ ] CreatureSpec is a discriminated union with `archetypeId` discriminant
  - [ ] All existing presets still create valid JellyfishSpec objects
  - [ ] `bun run tsc --noEmit` passes

  **Commit**: YES -- `refactor(creatures): CreatureSpec discriminated union on archetypeId`

- [ ] 3. BodyPlan enum audit + deprecation

  **What to do**:
  - Add `@deprecated` JSDoc to BodyPlan enum
  - Add `BodyPlan.Fish` and `BodyPlan.Anemone` members
  - Create mapping: `CREATURE_ARCHETYPE_BY_BODYPLAN`

  **Parallelization**: YES -- Wave 1

  **Acceptance Criteria**:
  - [ ] BodyPlan.Fish and BodyPlan.Anemone exist
  - [ ] All existing BodyPlan references still compile

  **Commit**: YES (with Task 2)

- [ ] 4. Baseline preset counts

  **What to do**:
  Create `scripts/capture-baseline-counts.ts`: for each of 12 presets, create geometry via `JellyfishGeometry.create()`, log counts, save to `.sisyphus/evidence/archetype-baseline-counts.json`. This is the backward-compat reference.

  **Parallelization**: YES -- Wave 1

  **Acceptance Criteria**:
  - [ ] Script runs without errors
  - [ ] Outputs JSON with all 12 presets, each with positive counts

  **Commit**: YES -- `test(archetypes): capture baseline preset counts`

- [ ] 5. Refactor scene to archetype-agnostic delegate

  **What to do**:
  Refactor scene to dispatch via CreatureArchetype:
  1. Store `archetype: CreatureArchetype` + `bodyData: BodyData`
  2. `setCreature(spec)` -> resolve archetypeId -> `buildBody()` -> `buildMeshes()`
  3. `animate()` -> `this.archetype.animateBody(this.bodyData, time, delta)`
  4. `nudgeFromMouse()` -> `this.archetype.applyInteraction?.(...)`
  5. `dispose()` -> `this.archetype.dispose(this.bodyData)`
  6. Move pulseSpeed/pulseAmplitude into archetype BodyData

  Keep shared: InterpolationSystem, updateMaterials(), creatureMenu, editor, fpsCounter.

  **Must NOT do**: Don't change animation loop structure; don't break backward compat.

  **Parallelization**: NO -- Sequential (depends on Task 1)

  **References**: `src/scenes/JellyfishMaterialTest.ts` (full scene file)

  **Acceptance Criteria**:
  - [ ] Scene compiles -- setCreature() works via archetype dispatch
  - [ ] Animation loop dispatches to archetype.animateBody()
  - [ ] Scene still creates InterpolationSystem

  **Commit**: YES (with Task 6) -- `refactor(scene): archetype-agnostic scene`

- [ ] 6. Extract JellyfishArchetype

  **What to do**:
  Create `src/creatures/archetypes/JellyfishArchetype.ts`:
  1. `buildBody(spec, rng)` -> calls `JellyfishGeometry.create(spec)`, wraps in BodyData
  2. `animateBody(data, time, delta)` -> calls updateRibs() (EXACT current logic)
  3. `buildMeshes(data, materials)` -> calls createUnitMesh() with geometry
  4. `applyInteraction(data, force, origin)` -> moves 5 pin constraints
  5. `dispose(data)` -> disposes geometry + materials + physics

  Register: `registerArchetype(new JellyfishArchetype())`

  **CRITICAL**: Copy EXACT updateRibs() math; must produce identical output.

  **Parallelization**: NO -- Sequential (depends on Task 5)

  **Acceptance Criteria**:
  - [ ] All 12 presets produce identical counts as baseline
  - [ ] Scene renders without errors

  **Commit**: YES (with Task 5)

- [ ] 7. Backward compat verification gate

  **What to do**:
  1. Run count comparison script -- verify ALL 12 presets match baseline exactly
  2. For 3 presets: screenshot + visual parity check
  3. If ANY preset mismatches: STOP. Do not proceed to Wave 3.

  **Must NOT do**: Don't skip this gate.

  **Parallelization**: NO -- Sequential (depends on Task 6)

  **Acceptance Criteria**:
  - [ ] All 12 presets match baseline counts exactly
  - [ ] 3 screenshots visually identical

  **Commit**: NO (verification only)

- [ ] 8. FishSpec type definition

  **What to do**:
  Add to CreatureSpec discriminated union:
  ```
  FishSpec extends CreatureSpecBase {
    archetypeId: 'fish';
    bodyPlan: BodyPlan.Fish;
    vertebraCount: number;       // 20-60
    bodyLength: number;
    bodyWidth: number;
    bodyDepth: number;
    bodyProfile: RadiusProfileCurve;
    crossSection: { kind: 'ellipse'; xScale; zScale };
    fins: FishFinConfig[];
    spineCurve?: SpineCurve;
    undulation: { amplitude; frequency; speed; finFlutter };
  }
  ```

  **Must NOT do**: Don't implement geometry builder yet.

  **Parallelization**: YES -- Wave 3 (with Tasks 9, 10, 12, 13, 14)

  **Acceptance Criteria**:
  - [ ] FishSpec compiles in CreatureSpec union
  - [ ] `bun run tsc --noEmit` passes

  **Commit**: YES -- `feat(archetypes): define FishSpec type`

- [ ] 9. Fish geometry builder

  **What to do**:
  Create FishGeometryBuilder.ts -- standalone fish topology:
  1. Spine: vertebraCount particles along body axis
  2. Each vertebra: elliptical ring, segments particles per ring
  3. Constraints: spine DistanceConstraint (bendable), rib rings, skin between, radial
  4. Pins: head (0), mid-body (1), tail (2)
  5. Fin meshes: extrude from attachment vertebra (dorsal, pectoral, caudal, anal)
  6. Same mutable array pattern as JellyfishGeometry

  **Must NOT do**: Don't import JellyfishGeometry; no tentacles/mouth arms.

  **Parallelization**: YES -- Wave 3

  **References**: `src/jellyfish/JellyfishGeometry.ts` (pattern)

  **Acceptance Criteria**:
  - [ ] Fish geometry created with N vertebra rings + fins
  - [ ] No inverted faces
  - [ ] Physics tick stable

  **Commit**: YES (with Task 10) -- `feat(archetypes): Fish geometry builder`

- [ ] 10. Fish animation driver

  **What to do**:
  FishArchetype.animateBody():
  - Undulation: traveling sine wave head-to-tail
  - Lateral bend: sin(time*freq - t*speed) * amplitude * t
  - Modulate vertebra ring constraints
  - Fin flutter: rapid oscillation

  **Must NOT do**: Don't use jellyfish bell pulse math.

  **Parallelization**: YES -- Wave 3

  **Acceptance Criteria**:
  - [ ] Visible undulation + fin flutter
  - [ ] No constraint explosions

  **Commit**: YES (with Task 9)

- [ ] 11. Fish presets (2+)

  **What to do**:
  Create fish-presets.ts: mackerel (streamlined, 30 vertebrae, fast) + angelfish (deep body, 20 vertebrae, slow, large fins).

  **Parallelization**: YES -- Wave 3

  **Acceptance Criteria**:
  - [ ] Both presets visible + animate correctly

  **Commit**: YES (with Task 15)

- [ ] 12. AnemoneSpec type definition

  **What to do**:
  Add to CreatureSpec union:
  ```
  AnemoneSpec extends CreatureSpecBase {
    archetypeId: 'anemone';
    bodyPlan: BodyPlan.Anemone;
    stalk: { height; width; segments; taper };
    tentacles: { count; length; thickness; arrangement; rows };
    sway: { amplitude; frequency; phase };
    baseShape: 'flat' | 'conical' | 'columnar';
  }
  ```

  **Parallelization**: YES -- Wave 3

  **Acceptance Criteria**:
  - [ ] AnemoneSpec compiles in union

  **Commit**: YES -- `feat(archetypes): define AnemoneSpec type`

- [ ] 13. Anemone geometry builder

  **What to do**:
  Create AnemoneGeometryBuilder.ts:
  1. Stalk: stacked rings (tapered), DistanceConstraint per ring + vertical
  2. Base disc: flat fan of particles (pedal disc)
  3. Tentacles: chains of 8-16 particles from crown rim (radial arrangement)
  4. Pin: base disc center (immovable)
  5. Faces: stalk mesh (quadrilateral skin), tentacles as thin tubes

  **Parallelization**: YES -- Wave 3

  **Acceptance Criteria**:
  - [ ] Anemone geometry: stalk + tentacles
  - [ ] Physics stable

  **Commit**: YES (with Task 14)

- [ ] 14. Anemone animation driver

  **What to do**:
  AnemoneArchetype.animateBody():
  - Stalk sway: gentle sinusoidal column bend
  - Tentacle wave: traveling wave base-to-tip
  - Crown rotation: slow periodic rotation

  **Parallelization**: YES -- Wave 3

  **Acceptance Criteria**:
  - [ ] Stalk sways + tentacles wave + no explosions

  **Commit**: YES (with Task 13)

- [ ] 15. Integrate Fish + Anemone into scene

  **What to do**:
  1. Import and register FishArchetype + AnemoneArchetype
  2. Add fish and anemone presets to PRESETS array
  3. Verify switching between all 3 archetypes works without errors

  **Parallelization**: YES -- Wave 4 (with Tasks 16, 17, 18)

  **Acceptance Criteria**:
  - [ ] All 3 archetypes selectable + animate correctly

  **Commit**: YES -- `feat(archetypes): integrate Fish/Anemone into scene`

- [ ] 16. Creature selector with archetype categories

  **What to do**:
  Update CreatureSelectMenu to group presets by archetypeId with category headers.

  **Parallelization**: YES -- Wave 4

  **Acceptance Criteria**:
  - [ ] Creature selector groups presets under archetype category headers

  **Commit**: YES -- `feat(ui): group presets by archetype category`

- [ ] 17. Performance benchmark

  **What to do**:
  Measure: load time per archetype, fps (30s avg), particle/vertex/draw counts.

  **Parallelization**: YES -- Wave 4

  **Acceptance Criteria**:
  - [ ] Benchmark data for all 3 archetypes

  **Commit**: NO (report only)

- [ ] 18. Architecture decisions record

  **What to do**:
  Document: why interface over base class, why discriminated union, why destroy-first, physics debt, future plugin system.

  **Parallelization**: YES -- Wave 4

  **Commit**: YES -- `docs(archetypes): record architecture decisions`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** -- `oracle`
  Verify all Must Have present, Must NOT Have absent, evidence files exist.

- [ ] F2. **Code Quality Review** -- `unspecified-high`
  Run `tsc --noEmit` + linter. Check for `as any`, empty catches, console.log in prod.

- [ ] F3. **Real Manual QA** -- `unspecified-high`
  Execute EVERY QA scenario. Test integration + edge cases (empty state, rapid switching, dispose/rebuild).

- [ ] F4. **Scope Fidelity Check** -- `deep`
  For each task: spec vs actual diff. 1:1 verification. Check Must NOT do compliance.

---

## Commit Strategy

- **Task 1**: `feat(archetypes): define CreatureArchetype interface + registry`
- **Tasks 2+3**: `refactor(creatures): CreatureSpec discriminated union + BodyPlan deprecation`
- **Task 4**: `test(archetypes): capture baseline preset counts`
- **Tasks 5+6**: `refactor(scene): archetype-agnostic scene + JellyfishArchetype`
- **Task 7**: (no commit -- verification only)
- **Task 8**: `feat(archetypes): define FishSpec type`
- **Tasks 9+10**: `feat(archetypes): Fish geometry builder + animation`
- **Task 11**: (committed with Task 15)
- **Task 12**: `feat(archetypes): define AnemoneSpec type`
- **Tasks 13+14**: `feat(archetypes): Anemone geometry builder + animation`
- **Tasks 15+16**: `feat(archetypes): integrate Fish/Anemone + UI categories`
- **Task 17**: (no commit -- report)
- **Task 18**: `docs(archetypes): record architecture decisions`

---

## Success Criteria

### Verification Commands
```bash
bun run tsc --noEmit                          # Zero errors
bun run scripts/capture-baseline-counts.ts     # Generates JSON
bun run scripts/compare-archetype-counts.ts    # All pass
```

### Final Checklist
- [ ] All 12 jellyfish presets render identically
- [ ] Fish archetype: 2 presets with undulation animation
- [ ] Anemone archetype: 2 presets with sway animation
- [ ] Creature selector grouped by archetype category
- [ ] Switching archetypes works without errors
- [ ] Zero LSP errors
