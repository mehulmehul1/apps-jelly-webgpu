# Jellyfish Archetype — Design Review & Current Progress

- Review Date: 2026-08-03
- Project: `jellyfish-webgpu` (Abyssal Genesis)
- Scope: Modular design, variety, proceduralism, and the "one formula → many forms" capability of the jellyfish archetype
- Status: **ACTIVE REVIEW — baseline for the next refactor round**

---

## 0. Executive Summary

The jellyfish archetype is a **multi-layer parametric pipeline** where a `CreatureSpec` flows
through 7 stages to produce a rendered, animated creature:

```
CreatureSpec (data)
  -> JellyfishGeometry (procedural soft-body topology builder)
    -> Particulate.js ParticleSystem (constraint-based physics)
      -> Three.js BufferGeometry (shared position/UV buffers)
        -> 5 TSL Node Materials (bulb, gel, tentacle, tail, dust)
          -> InterpolatedNodeMaterial (30fps physics -> 60fps render)
            -> Post-Processing (bloom, vignette, lens dirt)
```

**Bottom line:** The spec/validation/curve layer is senior-engineer-quality design, and the
preset catalog proves real reach (12+ visually distinct forms from one formula). But the
"single formula → many forms" story is delivered by a **hand-curated catalog over a monolith**,
not by the procedural engine. The geometry builder is where the modularity, proceduralism, and
form-generativity ambitions stop dead.

The system is **one refactor away** (split the geometry, type the seam, expose mouth params)
from being as good as its spec layer promises.

---

## 1. Scorecard

| Dimension | Grade | One-line verdict |
|---|---|---|
| Modular design | **B−** | Excellent spec layer, but a 1228-line geometry monolith + dead legacy system + `as any` perforated archetype seam |
| Variety | **B+** | Genuinely deep parameter space (~30 dials × 6 emitter strategies) — but presets only demo ~20 points and mutation is jellyfish-only |
| Proceduralism | **C+** | Parametric-procedural, not generative. No noise, no growth, no evolution — the one emergent archetype (coral) is the outlier |
| One formula → many forms | **B** | The formula has real reach (sponge/star/ascidian prove it), but it's a *shaped template*, not a generative grammar |

---

## 2. Architectural Map (as-built)

### 2.1 Layer overview

| Layer | Key files | Responsibility |
|---|---|---|
| Spec | `CreatureSpec.ts`, `BodyPlan.ts` | What the creature *is* |
| Curves | `RadiusProfileCurve.ts`, `SpineCurve.ts` | Silhouette / spine shaping functions |
| Geometry | `JellyfishGeometry.ts` | How the creature is *built* (particles + constraints + faces) |
| Factory | `CreatureFactory.ts` | Spec → multi-unit rigs (colonies) |
| Validation | `validate.ts` | Clamp to safe ranges + enforce particle budgets |
| Mutation | `mutate.ts` | Random small deltas (open-form iteration) |
| Physics | `Particulate.js`, `TentaclePhysics.ts`, `InterpolationSystem.ts` | How the creature *moves* |
| Materials | `materials/*.ts` (5 TSL materials) | How the creature *looks* |
| Archetype | `CreatureArchetype.ts`, `archetypeRegistry.ts`, `JellyfishArchetype.ts` | Archetype contract + jellyfish implementation |
| Presets | `presets.ts` (+ `anemone-presets.ts`, `coral-presets.ts`) | Catalog of ~20 hand-authored creatures |
| Scene/UI | `JellyfishMaterialTest.ts`, `JellyfishLookEditor.ts`, `CreatureSelectMenu.ts` | Runtime integration + controls |

### 2.2 Dependency flow

```
main.ts
  -> JellyfishMaterialTest.ts (main scene)
       -> JellyfishRenderer.ts (WebGPU/WebGL)
       -> InterpolationSystem.ts (fixed timestep)
       -> archetypeRegistry -> {JellyfishArchetype, AnemoneArchetype, CoralArchetype}
            -> CreatureFactory -> validate -> CreatureSpec types
            -> JellyfishGeometry -> RadiusProfileCurve, SpineCurve, AttachEmitters, BodyPlan
            -> Particulate.js (physics)
            -> TentaclePhysics.ts (articulated skeletons)
            -> coral-growth-compute.ts (Laplacian branching)
            -> 5 Node Materials -> InterpolatedNodeMaterial base
       -> JellyfishPostProcessing -> Bloom, LensDirt, Vignette
       -> JellyfishLookEditor -> look-presets.ts (LookConfig)
       -> CreatureSelectMenu -> presets.ts
       -> DustNodeMaterial -> createDustSystem()
```

### 2.3 The variety machinery (where forms come from)

- 7 radius-profile curve kinds (legacy_bell, legacy_tail, polyline, power, log_spiral, vesica, constant) — silhouette
- 3 cross-section kinds (circle, ellipse, superformula/Gielis) — breaks circularity → star/box/sponge forms
- 4 spine curve kinds (none, polyline, sine, helix) — curvature
- 3 surface modulation layers (lobes, ridges, frill) with independent `tRange` and `phase`
- 6 tentacle emitter strategies (band, spiral, phyllotaxis, vortexStreet, explicit, legacy)
- 2 tentacle rendering modes (curtain vs tube) with *different physics* (tube → articulated skeleton)
- Feature toggles (tail/mouth/tentacles), symmetry order/breaking, colony layouts (chain/arc/helix/cluster/sheet)

---

## 3. Modular Design Critique

### 3.1 What's genuinely good

1. **The spec layer is the best part of the codebase.** `CreatureSpec.ts` is a disciplined
   discriminated union (`JellyfishSpec | AnemoneSpec | CoralSpec`) with orthogonal concerns:
   `symmetry`, `spine`, `crossSection`, `surface`, `features`, `topology`, `profiles`,
   `emitters`, `colony`. Each is composable and independently validated.

2. **`validate.ts` is a real safety system, not decoration.** Every numeric is clamped to a
   safe range, and particle-budget enforcement *actually mutates topology* — it reduces
   `tentacleSegments` first, then `ribsCount`/`tailRibsCount` (`validate.ts:211-226`).
   Procedural resource management embedded in the right layer.

3. **Curve types are function-like data.** `RadiusProfileCurve` and `SpineCurve` are
   serializable, clampable, and evaluable — a clean pattern later archetypes inherit.

4. **The archetype registry pattern** (`registerArchetype`/`getArchetype`, self-registering on
   import) is the right seam for extending to new creatures.

### 3.2 Where it breaks

**1. `JellyfishGeometry.ts` is a monolith (1228 lines) doing five jobs at once.**
Vertex generation, Particulate constraint creation, face indexing, UV layout, and
tentacle-physics-config emission all live in one class with ~20 private fields and ~25 private
methods. `createRib` (lines 599–675) alone interleaves ring generation, constraint stats,
radial modulation, spine attachment, and link bookkeeping. Nothing prevents a
`RibBuilder` / `SkinBuilder` / `TentacleGroupBuilder` split, and the file is hostile to
extension — adding a new anatomy piece means editing this one class.

**2. Two parallel jellyfish systems coexist; one is dead.**
`JellyfishSystem.ts` (397 lines) is the legacy integration class — **zero usages anywhere in
`src/`** (verified via grep). `JellyfishTest.ts` is a legacy scene using it. The active path
goes through `JellyfishArchetype.ts`. Keeping the dead monolith in the tree alongside its
replacement is the clearest modular-design debt.

**3. The archetype contract is perforated with `as any`.**
`CreatureArchetype.ts` declares `geometryData: unknown` ("kept opaque" — line 41), which
*forces* the implementation to cheat:

```ts
// JellyfishArchetype.ts:63-66
const d = data as any;
const matPack = materials as any;
const refractionTarget = matPack.refractionTarget as THREE.RenderTarget | undefined;
```

The interface was designed to give type safety and then immediately defeats it. `buildMeshes`
reasons about `gd.faces.bulb`, `gd.ribs`, `gd.position` — all of which could be typed — but
the opaque `unknown` erases the entire contract.

**4. `createMaterials` is a stub that ignores its input.**
The interface promises "Create the material pack for a given look and refraction target." The
implementation:

```ts
// JellyfishArchetype.ts:54-56
createMaterials(_lookConfig: LookConfig, refractionTarget: unknown): UnitMaterialPack {
  return { refractionTarget } as unknown as UnitMaterialPack;
}
```

Materials are actually built *inside* `buildMeshes` with **hardcoded colors** (`0xFFA9D2`,
`0x70256C`, … lines 74–119) — the `lookConfig` parameter is discarded. Real look wiring
happens ad-hoc at the scene level (`JellyfishMaterialTest.ts:906-913` manually calls
`setDiffuse` on unit materials). The archetype's material seam is a fiction: it neither
produces the pack nor consumes the config.

**5. Cross-archetype contamination in tentacle physics.**
Jellyfish tube tentacles are configured with an anemone profile:

```ts
// JellyfishArchetype.ts:183
profileKey: 'actinia' as any,
```

A jellyfish's articulated tentacles run on an anemone's species profile, smuggled in with
`as any`. This couples the jellyfish archetype to `anemone-presets` internals.

---

## 4. Variety Critique

### 4.1 Where variety actually comes from

The parameter space is **real and deep** — the system's strongest claim (see §2.3). The **12
jellyfish presets are visually distinct and genuinely impressive**: comb jelly, salp,
siphonophore colony, glass sponge, ascidian, echinoderm star, disc jelly, box jelly, sea
nettle, lobe jelly. The star and glass sponge stretching out of the same bell formula is the
best evidence the formula has reach.

### 4.2 Where variety is shallow

1. **Presets demo ~20 points of a much larger space.** The theoretical space is thousands of
   combinations; the presets barely sample it. There is no slider-driven *form* editor (the
   `JellyfishLookEditor` only edits *look*, not *form*; the spec is only mutated via M/R keys).
   A user cannot explore the space; they can only pick from a catalog or roll dice.

2. **Mutation is jellyfish-only.** `mutate.ts:26-29` explicitly passes anemone/coral specs
   through unchanged. The RNG-driven "open form" iteration exists for one of three archetypes.

3. **Variety is shaping, not structure.** Topology (rib lattice, constraint network, pin
   skeleton) is fixed; variety comes from deforming the same graph. The `BodyPlan` taxonomy is
   **decorative**: `CREATURE_ARCHETYPE_BY_BODYPLAN` maps 8 of 10 body plans → `'jellyfish'`.
   `Disc`, `Box`, `Nettle`, `LobeJelly` produce distinct *silhouettes* purely through preset
   `crossSection`/`profiles` values — no body-plan-specific geometry code exists for them.
   Worse, there's a **taxonomy inconsistency**: the `salp` preset declares
   `bodyPlan: BodyPlan.CombJelly` (`presets.ts:112`), contradicting the `Salp` enum member.
   BodyPlan is a label, not a driver.

4. **The mutation RNG is order-fragile.** `getRadialMod` (`JellyfishGeometry.ts:331`) calls
   `this.rng()` inside per-ring closures; reproducibility depends on call order. Combined with
   `Math.random` as the default (`JellyfishGeometry.ts:409`), seeded determinism is
   aspirational, not guaranteed.

---

## 5. Proceduralism Critique

**The honest classification: the jellyfish is parametric-procedural, not generative.**

### 5.1 What's genuinely procedural

- Superformula cross-sections (real Gielis math, clamped for constraint stability)
- Curve-driven profiles and spines
- Radial modulation layers composited as multiplicative sinusoids
- **Adaptive budget enforcement** in `validate.ts` (topology auto-shrinks to fit particle
  budget) — the most "procedural" thing in the jellyfish path
- The **coral archetype is a different species of proceduralism entirely** — Kaandorp/Merks
  accretive growth, Laplacian resource fields, emergent branching. It's the only archetype
  that *grows*.

### 5.2 What's decorative or missing

1. **No noise fields.** Every modulation is a fixed-frequency sine/cos. Organic irregularity
   comes only from the cheap `breaking` jitter — there's no Perlin/Simplex shaping, no
   multi-octave variation. The design docs explicitly recommended noise-based approaches; the
   jellyfish uses none.

2. **No evolution — random jitter only.** `mutateCreatureSpec` picks 1–3 modules and applies
   small deltas. There's no fitness, no selection, no crossover — a random walk, not an
   evolutionary search. The docs' "open form iteration" ambition is met at the shallowest level.

3. **Every mutation is a full rebuild.** mutate → validate → `JellyfishGeometry.create()` →
   fresh particle system → fresh mesh group. No incremental morphing, no reuse — expensive and
   non-continuous, which kills the "alive iteration" feel the feature was named for.

4. **Curves are index-parameterized, not arc-length-parameterized.** Ribs are placed at
   `index/total` — evenly spaced in *index*. With twist/spine applied, surface density becomes
   non-uniform. This is a correctness gap that limits how far the shaping dials can be pushed
   before the mesh degrades.

---

## 6. "One Formula → Many Forms" Critique

**The claim is mostly true, with a structural asterisk.**

### 6.1 The strongest evidence *for*

One entry point — `JellyfishGeometry.create(spec?)` — produces medusae, ctenophores, a
siphonophore colony, a glass sponge, an ascidian, an echinoderm star, box jelly, sea nettle,
lobe jelly. That's a breadth most "procedural creature" projects don't achieve.

### 6.2 The asterisks

1. **It's a template, not a grammar.** Every form is the same graph: bell lattice + optional
   tail + optional mouth arms + optional tentacle groups. Forms requiring *different topology*
   are unreachable: a rhizostome's frilly branched oral arms, a siphonophore's continuous
   ribbon (the colony is just N identical scaled medusae — `CreatureFactory.ts` never varies
   per-unit specs beyond scale), branching tentacles. The parameter axes are orthogonal dials
   on one graph — which is exactly the "modular foundations" the docs praised, but it caps the
   reach at what the fixed lattice can express.

2. **The mouth-arm lever is hardcoded and unexposed.** The mouth is the second most distinctive
   jellyfish feature, and it's baked:

   ```ts
   // JellyfishGeometry.ts:955-959
   this.createMouthArmGroup(1.0, 0, 4, 3);
   this.createMouthArmGroup(0.8, 1, 8, 3, 3);
   this.createMouthArmGroup(0.5, 7, 9, 6);
   ```

   Magic numbers, zero spec parameters. There is no `mouth:` section in `JellyfishSpec` beyond
   feature toggles and look. **This is the single biggest missed form lever.**

3. **Look variety is decoupled from form variety.** The look system is rich on paper
   (`patternScale0/1`, `rimBoost`, refraction IOR/dispersion in `BulbNodeMaterial`) but the
   archetype path hardcodes material colors and the scene re-applies a handful of fields
   manually. The 5 materials' full parameter surfaces are barely driven by presets. Form
   changes and appearance changes are two disconnected pipelines.

4. **Design-intent drift.** The `forms-synthesis` docs promised parameter *coupling*
   ("related features must vary together") and *allometric scaling* ("proportions change
   non-linearly with size"). The implementation has neither — params are independent and scale
   is uniform. The docs also specified the orthogonal-axis grammar (geometry × symmetry ×
   appendage × surface × translucency) — the spec partially delivers this, which is why the
   spec layer reads better than the geometry layer.

---

## 7. Prioritized Recommendations (next refactor round)

1. **Delete `JellyfishSystem.ts` + `JellyfishTest.ts`** — dead code is the worst debt here; the
   archetype path fully supersedes it.
2. **Type the archetype seam properly.** Replace `geometryData: unknown` with a real
   `JellyfishGeometryData`-shaped contract (or a `UnitData` interface) and kill the `as any` in
   `JellyfishArchetype`. ~1 hour, removes the biggest modularity lie.
3. **Make `createMaterials(lookConfig)` real** — move material construction out of
   `buildMeshes`, consume the look config, delete the scene-level `setDiffuse` hack. Also fix
   the `profileKey: 'actinia' as any` contamination with a real jellyfish profile.
4. **Split `JellyfishGeometry` into builders** (`RibBuilder`, `SkinBuilder`,
   `TentacleGroupBuilder`, `MouthArmBuilder`) — highest ROI for the "many forms" goal, because
   it makes new anatomy (branching tentacles, param'd mouth arms) a new module instead of an
   edit to a monolith.
5. **Expose the mouth-arm params in `JellyfishSpec`** and stop hardcoding
   `createMouthArmGroup` magic numbers.
6. **Add a form editor (spec sliders), not just look sliders** — the parameter space exists but
   is only reachable via presets and dice.
7. **Seeded determinism end-to-end** — thread one `SeededRNG` from scene → mutation → geometry
   and remove `Math.random` defaults, so `fxhash` reproducibility actually holds.

---

## 8. Progress Status

- **Archetype count:** 3 registered (jellyfish, anemone, coral) — jellyfish is the flagship.
- **Preset catalog:** 12 jellyfish + 4 anemone + 5 coral = 21 presets.
- **Tests:** `ArchetypeStability.test.ts` (anemone only — **jellyfish stability is untested**),
  `computeNormals.test.ts`, `InterpolationSystem.test.ts`.
- **Known gaps tracked from this review:**
  - Dead legacy system in tree (`JellyfishSystem.ts`, `JellyfishTest.ts`)
  - `as any` in archetype seam (JellyfishArchetype.ts:63-66, 183, 302)
  - `createMaterials` stub ignoring lookConfig (JellyfishArchetype.ts:54-56)
  - Mouth-arm magic numbers (JellyfishGeometry.ts:955-959)
  - Mutation jellyfish-only (mutate.ts:26-29)
  - Salp/BodyPlan taxonomy inconsistency (presets.ts:112)
  - No jellyfish stability test
  - No form editor (spec sliders) — look editor only

---

*This document supersedes informal critique notes and serves as the baseline for the next
refactor round. Update the Status: line at the top when the recommendations land.*
