# Parallel Artist Campaign — 5-Agent Plan (Abyssal Genesis)

**Date**: 2026-08-03
**Project**: jellyfish-webgpu (Samudra)
**Goal**: maximum *artistic* progress via 5 agents running in parallel, with
two headline tracks — **Coral rethink** (using better research/docs) and
**Anemone with proper anatomy** — amplified by a shared shader/look pipeline
and generative variety.

---

## Current state (ground truth)

- **3 archetypes** live: `jellyfish` (12 presets, backward-compatible, working),
  `anemone` (4 species presets), `coral` (5 presets). Fish was removed.
- **Anemone is half-wired**: `AnemoneArchetype.ts` `animateBody`/`buildMeshes`
  reference `mesenteries`, `sphincter`, `columnRegions`, `acontiaChains`,
  `tentacleConfigs` — but `AnemoneGeometryData` never declares them and
  `buildBody` never populates them → ~25 type errors, dead anatomy code.
- **Shared infrastructure**: `CreatureArchetype` interface + registry,
  `CreatureSpec` discriminated union (`JellyfishSpec | AnemoneSpec | CoralSpec`),
  TSL material stack (`Bulb/Gel/Tail/Tentacle/Dust` + `Interpolated*`),
  `particulate.js`, `computeNormals` (added, per-frame soft-body normals),
  `TentaclePhysics` (Larbourette 2009), post-processing.
- `npm run build` ✅, `vitest` ✅ (8 pass). `tsc` has pre-existing errors
  (half-wired anemone + `post`-config type mismatches — not blocking Vite).

---

## Why parallelization is safe here

Each archetype already owns **exclusive files**, and the shared surface is small.
We make it fully parallel by doing a tiny **Phase 0 refactor** so every agent
owns files nobody else touches, then branch + merge with one integrator.

**File-ownership map (one owner per file, no overlap):**

| Agent | Exclusive files | Shared files it reads (frozen API) |
|---|---|---|
| A — Lead/Integrator | `CreatureArchetype.ts`, `archetypeRegistry.ts`, `scenes/JellyfishMaterialTest.ts`, `jellyfish/creatures/index.ts` (aggregator), `CreatureSpec.ts` (union only), `BodyPlan.ts`, `CreatureFactory.ts`, `validate.ts`, `JellyfishArchetype.ts` | — |
| B — Anemone Anatomy | `archetypes/AnemoneArchetype.ts`, `presets/anemone-presets.ts`, `specs/AnemoneSpec.ts`, `archetypes/TentaclePhysics.ts` | materials, registry, `computeNormals`, `TentaclePhysics` API |
| C — Coral Rethink | `archetypes/CoralArchetype.ts`, `archetypes/coral-growth-compute.ts`, `presets/coral-presets.ts`, `specs/CoralSpec.ts` | materials, registry |
| D — Shader/Look | `jellyfish/materials/*`, `editor/*`, `post-processing/*` | (defines the material API) |
| E — Variety/UX | `jellyfish/creatures/mutate.ts`, `ui/CreatureSelectMenu.ts`, `jellyfish/creatures/presets.ts` (aggregator), new species preset files, fxhash wiring | registry, specs (read-only) |

---

## Phase 0 — Integration Lead unlocks parallelism (Agent A, first)

Do *only this* before spinning everyone else, so no two agents ever edit the
same file:

1. **Split per-archetype specs out of `CreatureSpec.ts`** into
   `src/creatures/specs/JellyfishSpec.ts`, `AnemoneSpec.ts`, `CoralSpec.ts`;
   leave `CreatureSpec.ts` as the union + shared base re-export. Now B owns
   `AnemoneSpec.ts`, C owns `CoralSpec.ts`, nobody else touches them.
2. **Freeze the shared buildMeshes/createMaterials contract** and the
   `TentaclePhysics` exports — document it in `docs/ARCHITECTURE.md` so B and
   C (and A's jellyfish) can't drift.
3. **Set up git branches**: `agent/b-anemone`, `agent/c-coral`, `agent/d-material`,
   `agent/e-variety`. `main` stays green; A integrates.
4. Commit the normal-compute fix and fish-removal already in the tree as a
   clean baseline first.

**Exit gate for Phase 0**: 4 clean file-silos exist, contract documented,
`npm run build` + scoped `npm run typecheck` green.

---

## The 5 agents (run in parallel after Phase 0)

### Agent A — System Architect & Integration Lead  *(keeps the ship afloat)*
- **Role**: owns all shared files; keeps `main` building; is the sole merger.
  Reviews + integrates B/C/D/E branches; resolves conflicts; keeps `index.ts`
  importing every new archetype/preset so they self-register.
- **Artistic job**: none directly — its job is to let the other four make art
  without breaking each other.

### Agent B — Anemone Anatomy Specialist  *(headline track 1)*
- **Mission**: *"Proper actual anatomy"* — finish the half-wired Tier-1/2 model.
- **Scope** (from your `anemone-enhancement.md` plan):
  - **Tier 1 — structure**: radial mesenteries governed by `cycles`/`perfectCycles`
    + `retractorType` (diffuse/restricted/circumscribed/palmate); sphincter
    `type` (endodermal/mesogleal/absent/marginal) with dynamic ring
    distance-constraint; column regions (scapus/scapulus/capitulum) with
    per-region weights + verrucae; oral disc (mouthGape, siphonoglyphs,
    actinopharynxDepth).
  - **Tier 2 — behavior**: state machine `IDLE→FEEDING→WITHDRAWING→AGONISTIC`
    with hysteresis; asymmetric tentacle timing (precomputed phase offsets);
    acontia ejection (pre-allocated folded chains); interaction-driven
    transitions wired to `applyInteraction`.
  - **Tier 3 — species fidelity**: make Actinia / Metridium / Anthopleura /
    Edwardsia anatomically distinct (tentacle counts, column form, burrowing
    physa, acontia presence/absence).
- **Acceptance**: type errors in `AnemoneArchetype.ts` → 0; all 4 presets
  animate stably; radial mesentery alignment within ±15°; sphincter radius
  changes >40% open↔closed; acontia ejects without particle explosion.
- **Files**: `AnemoneArchetype.ts`, `anemone-presets.ts`, `specs/AnemoneSpec.ts`,
  `TentaclePhysics.ts`.

### Agent C — Coral Rethink Specialist  *(headline track 2)*
- **Mission**: *"Use the better research and docs and rethink"* — rebuild the
  coral to be biologically real and artistically striking.
- **Inputs**: ingest the research/docs you'll point at (plus the in-repo
  Kaandorp/Merks notes and `docs/GENERATIVE_ART_PRD.md`).
- **Scope**:
  - Rethink the **accretive-growth branch model** in `coral-growth-compute.ts`
    — improve the Laplacian resource field, phototropism, bifurcation

### Agent D — Shader & Material Look Specialist  *(the artistic multiplier)*
- **Mission**: one gorgeous, *shared* visual language across all archetypes.
- **Scope**:
  - Unify the **TSL stack** (Bulb/Gel/Tail/Tentacle/Dust + `Interpolated*`)
    around iridescence + bioluminescence + translucency; tune the hot params
    (rim boost, pattern scale, refraction/dispersion, emissive, subsurface).
  - Give coral and anemone the same caliber of look as the best jellyfish —
    they currently use thinner inline materials.
  - Curate a shared `look-presets` palette set all archetypes can reference.
- **Guardrail**: keep the material **public API surface stable** for the frozen
  contract (A/B/C consume it); any API change ships as a small A-coordinated
  patch.
- **Files**: `jellyfish/materials/*`, `editor/*`, `post-processing/*`.

### Agent E — Generative Variety & UX Specialist  *(the "infinite creatures" engine)*
- **Mission**: turn the curated archetypes into an endless gallery.
- **Scope**:
  - **Seeded mutation** (`mutate.ts`): parameter-space variation per archetype
    with sane ranges + validate; a "Mutate (M)" flow producing new, valid,
    named creatures.
  - **Species expansion**: new preset files for jellyfish/anemone/coral that
    reuse B's anatomy and C's morphology + D's looks (no new core code).
  - **fxhash open-form** wiring: `$fx.rand()`, `$fx.depth`, `$fx.lineage`,
    root-traits → lineage inheritance → random mutation; `fxhash:dev/build`
    scripts already exist (`package.json`).
  - **UX polish**: `CreatureSelectMenu` grouping, random/mutate buttons,
    camera framing per creature.
- **Acceptance**: mutate produces only valid specs; 3–5 new species per
  archetype; fxhash build runs.
- **Files**: `mutate.ts`, `ui/CreatureSelectMenu.ts`, `jellyfish/creatures/presets.ts`,
  new `presets/*` files, fxhash wiring.

---

## Orchestration / cadence

1. **Branch per agent** (`agent/a…e`) off `main` after Phase 0.
2. **Integration**: Agent A merges branches at checkpoints (end of each session
   or on signal). A resolves conflicts, keeps `index.ts` wired, re-runs
   `npm run build` + `npx vitest`.
3. **Key dependency**: D's material API is the main cross-dependency. Freeze it
   early so B/C aren't blocked; D can enrich look *values* without API breakage.
4. **Daily sync**: one short A-led status; A broadcasts what landed so B/C/E
   align look/anatomy choices.

## Guardrails (non-negotiable)

- ❌ No agent edits another agent's files (ownership map above).
- ❌ No `as any` shortcuts in new anatomy code (B); no new constraint types
  beyond particulate.js 8 (B); no hand-judged "looks right" gates.
- ✅ Objective acceptance per agent (type count, bounds, stability tests).
- ✅ Each agent keeps its own files `tsc`-clean.
- ✅ Particle/vertex budget: <5000 per creature, 60fps on reference hardware.
- ✅ Commit per logical unit; message convention `feat(<domain>): …`.

## Suggested first execution slice (one session)

1. **Agent A**: Phase 0 (spec split + contract freeze + branches). Small.
2. Spin **B** (anemone anatomy) + **C** (coral rethink) — the two headline
   tracks, both file-siloed.
3. Spin **D** (materials) to set the shared look; **E** (variety/UX) starts with
   mutation + fxhash wiring so it's not blocked.
4. A integrates B/C/D at the first checkpoint; D's API lands first so B/C can
   adopt the richer look afterward.

## Open items for you (the human)

1. **Coral research/docs paths** — point Agent C at the actual better docs
   (folders/repos/URLs) so it ingests them.
2. **Artistic priority** — which look wins first: coral, anemone, or jellyfish?
   (Recommend: D lifts all three, biased to your two headline tracks.)
3. **fxhash scope** — full open-form now, or defer until archetypes look great?

    thresholds so branching is emergent and organic.
  - Fix the known **"ghost shell" artifact** (jellyfish-only features leaking
    onto coral) noted in `CoralArchetype.ts`.
  - Morphology per habit: `fan` (sea fan lattice), `hemispherical`,
    `vertical` (staghorn/organ-pipe), `encrusting`. Add **polyp tips** +
    tip-glow detail.
  - Sway: gentle current-driven sway; surface-mesh architecture; keep normals
    correct (already done via recompute).
- **Acceptance**: 5+ presets render distinct forms; no ghost shell; growth is
  bounded (vertex budget); sway stable.
- **Files**: `CoralArchetype.ts`, `coral-growth-compute.ts`, `coral-presets.ts`,
  `specs/CoralSpec.ts`.

