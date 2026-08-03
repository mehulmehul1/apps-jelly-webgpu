# Anemone Enhancement Plan

**Project**: jellyfish-webgpu
**Created**: 2026-07-17
**Status**: Ready for Implementation
**Phases**: 5 Waves (Spec → Anatomy → Behavior → Species → Verification)

---

## Overview

Transform `AnemoneArchetype` from a simple stalk+crown model into a biologically accurate sea anemone with:
- **Tier 1**: Mesenteries, sphincter types, column regions, oral disc anatomy
- **Tier 2**: Behavioral state machine, asymmetric tentacle timing, acontia ejection
- **Tier 3**: Species presets (Actinia, Metridium, Anthopleura, Edwardsia)

---

## Wave 1: Spec Extension + Data

### 1.1 Extend `AnemoneSpec` (CreatureSpec.ts)
```typescript
interface AnemoneSpec extends CreatureSpecBase {
  // ... existing fields ...
  
  // NEW: Mesentery system
  mesenteries?: {
    cycles: number;           // 6, 12, 24, 48... (hexamerous)
    perfectCycles: number;    // how many cycles reach actinopharynx (typically 1)
    retractorType: 'diffuse' | 'restricted' | 'circumscribed' | 'palmate';
    mesoglealThickness: number;
  };
  
  // NEW: Sphincter system
  sphincter?: {
    type: 'endodermal' | 'mesogleal' | 'absent' | 'marginal';
    strength: number;         // 0.0-1.0 (constraint tightness)
    position: 'margin' | 'capitulum';
  };
  
  // NEW: Column regions
  columnRegions?: {
    scapusHeightRatio: number;     // lower column (stiff)
    scapulusHeightRatio: number;   // mid column (muscular)
    capitulumHeightRatio: number;  // upper column (flexible)
    verrucae?: {
      present: boolean;
      density: number;
      rows: number;
    };
  };
  
  // NEW: Oral disc
  oralDisc?: {
    mouthGape: number;         // 0.0-1.0
    peristomeHeight: number;
    siphonoglyphs: 1 | 2 | 3;
    actinopharynxDepth: number;
  };
  
  // NEW: Acontia
  acontia?: {
    present: boolean;
    cinclideRows: number;
    nematocystDensity: number;
    ejectionForce: number;
  };
}
```

### 1.2 Add Species Preset Data Files
Create 4 new presets in `src/creatures/presets/anemone-presets.ts`:
- `magnificent` (Actinia equina) — 6 mesenteries, weak endodermal sphincter, ~192 tentacles, verrucae rows, green/red morphs
- `plumose` (Metridium senile) — many mesenteries, lobed crown, feathery tentacles, acontia present
- `aggregate` (Anthopleura elegantissima) — verrucae, strong retractors, symbiotic (zooxanthellae), clonal fission
- `burrowing` (Edwardsia) — 8 mesenteries bilateral, physa, no basal disc, burrowing form

### 1.3 Update Type Exports
- Export new interfaces from `src/jellyfish/creatures/index.ts`
- Add preset IDs to `PresetId` type

---

## Wave 2: Tier 1 — Anatomy (Structural)

### 2.1 Mesentery Constraint Topology
In `AnemoneArchetype.buildBody()`:
- Generate radial septa: `mesenteryCycles × 2` mesenteries as DistanceConstraints from oral disc center to pedal disc
- Add AngleConstraints along each mesentery for bending resistance (AngleConstraint exists in particulate.js!)
- Mesentery particles get `weight = 2.0` (denser tissue)
- Perfect mesenteries (first cycle): extend to actinopharynx ring
- Imperfect mesenteries: terminate at mid-column

### 2.2 Sphincter System
- Ring of particles at oral disc margin
- DistanceConstraint ring with dynamic `setDistance(targetRadius)`
- Sphincter type → constraint parameters:
  - `endodermal` (Actinia): tight range `[0.15, 0.25]`, high iteration count
  - `mesogleal` (Metridium): wider range `[0.3, 0.6]`, lower iteration count
  - `absent`: no ring constraint, only retractor pull
- State-driven: `setDistance()` called from animateBody based on state

### 2.3 Column Region Physics
- Three regions with distinct particle weights and constraint densities:
  - **Scapus** (lower 40%): weight 1.5, dense cross-bracing, high AngleConstraint count
  - **Scapulus** (mid 30%): weight 1.0, standard constraints, retractor attachment points
  - **Capitulum** (upper 30%): weight 0.6, fewer constraints, flexible
- Verrucae (if present): localized constraint density increase on scapus

### 2.4 Oral Disc Anatomy
- Mouth slit: remove particles along directive axis, create gap
- Peristome: elevated ring of particles around mouth
- Siphonoglyphs: 1-3 ciliated grooves (visual only, affects UV)
- Actinopharynx: internal tube constraint from mouth to gastrovascular cavity floor

---

## Wave 3: Tier 2 — Behavior (Dynamic)

### 3.1 State Machine
```typescript
type AnemoneState = 'IDLE' | 'FEEDING' | 'WITHDRAWING' | 'AGONISTIC';

interface AnemoneAnimationState {
  currentState: AnemoneState;
  stateTimer: number;
  stateDuration: number;
  trigger: 'none' | 'prey_contact' | 'threat' | 'disturbance' | 'recovery';
  hysteresisTimer: number;  // prevents rapid state flipping
}
```

State transitions:
- `IDLE` → `FEEDING` (prey_contact, duration 10-60s)
- `IDLE` → `WITHDRAWING` (threat/disturbance, duration 2-10s)
- `IDLE` → `AGONISTIC` (conspecific contact, duration 30-120s)
- `FEEDING` → `IDLE` (timeout or prey_ingested)
- `WITHDRAWING` → `IDLE` (recovery, duration 60-3600s — slow!)
- `AGONISTIC` → `IDLE` (opponent_retreats or timeout)

### 3.2 Asymmetric Tentacle Timing
- Pre-compute per-tentacle phase offsets: `phase = basePhase + tentacleIndex * 0.15 + noise(0.05)`
- Fast contract: 0.1-0.3s (retractor muscle speed ~30μm/s)
- Slow extend: 2-5s (circular muscle speed ~0.6μm/s)
- Timing asymmetry factor: 10-50x difference

### 3.3 Acontia Ejection
- Pre-allocate folded acontia chains inside column (cinclide positions)
- On `AGONISTIC` state trigger: unfold + extend through cinclides using PointForce
- Nematocyst discharge: visual effect + force on nearby particles
- Retract: contract DistanceConstraints back to folded state

### 3.4 Interaction Response
- `applyInteraction()`: mouse nudge → state transition based on force/duration
- Light touch → `FEEDING` (prey simulation)
- Strong/rapid → `WITHDRAWING`
- Sustained contact → `AGONISTIC`

---

## Wave 4: Tier 3 — Species Presets

### 4.1 Actinia (magnificent)
- 6 mesentery cycles, perfectCycles: 1
- Sphincter: endodermal, strength 0.6
- 192 tentacles in 6 concentric cycles
- Verrucae: 12 rows, adhesive
- Retractors: diffuse
- Color: red/brown base, blue/green morphs

### 4.2 Metridium (plumose)
- 24+ mesentery cycles, perfectCycles: 1
- Sphincter: mesogleal, strength 0.3
- 500-1000+ fine tentacles (lobed crown)
- Acontia: present, cinclide rows: 4
- Catch tentacles: 12-18 specialized
- Column: smooth, parapet at capitulum
- Color: white/cream/orange/grey

### 4.3 Anthopleura (aggregate)
- 6-12 mesentery cycles
- Sphincter: endodermal palmate, strength 0.7
- 64-167 tentacles
- Verrucae: prominent, non-adhesive
- Retractors: restricted/circumscribed (strong)
- Zooxanthellae: color shifts with light
- Clonal: fission parameter

### 4.4 Edwardsia (burrowing)
- 8 mesenteries (bilateral, not radial)
- Sphincter: absent
- Physa: pointed aboral end for burrowing
- No basal disc — pedal disc = physa
- 8-12 marginal tentacles only
- Acontia: absent
- Column: worm-like, translucent
- Burrowing behavior: peristaltic waves

---

## Wave 5: Verification

### 5.1 Extended Stability Tests
Extend `ArchetypeStability.test.ts`:
- All 7 presets (3 existing + 4 new) with `amplitude: 1.0`
- State machine: run 30s, verify valid transitions only
- Mesentery alignment: radial angle stays within ±15°
- Sphincter: opens/closes within spec radii
- Acontia: ejects/retracts without particle explosion

### 5.2 Performance Benchmarks
Playwright benchmarks per species:
- Particle count target: <5000 total
- Frame time target: <16ms (60fps) at 3 iterations
- Memory: no leak over 10 preset cycles

### 5.3 Acceptance Criteria (Automated)
- ✅ All stability tests pass
- ✅ State machine logs show no invalid transitions
- ✅ Mesentery radial deviation < 15° over 60s
- ✅ Sphincter radius change > 40% between open/closed
- ✅ 7/7 presets load without error
- ✅ FPS > 55 on reference hardware

---

## Implementation Order (Commits)

1. `feat(anemone): extend AnemoneSpec with mesentery/sphincter/column/oralDisc/acontia fields`
2. `feat(anemone): add 4 species preset data files (magnificent, plumose, aggregate, burrowing)`
3. `feat(anemone): Tier 1 mesentery constraint topology (radial septa + AngleConstraints)`
4. `feat(anemone): Tier 1 sphincter system (dynamic ring DistanceConstraint + type params)`
5. `feat(anemone): Tier 1 column region physics (scapus/scapulus/capitulum weights)`
6. `feat(anemone): Tier 1 oral disc anatomy (mouth gape, peristome, siphonoglyphs)`
7. `feat(anemone): Tier 2 state machine (IDLE/FEEDING/WITHDRAWING/AGONISTIC)`
8. `feat(anemone): Tier 2 asymmetric tentacle timing (pre-computed phase offsets)`
9. `feat(anemone): Tier 2 acontia ejection system (pre-allocated folded chains)`
10. `feat(anemone): Tier 2 interaction-driven state transitions`
11. `feat(anemone): Tier 3 Actinia (magnificent) preset`
12. `feat(anemone): Tier 3 Metridium (plumose) preset`
13. `feat(anemone): Tier 3 Anthopleura (aggregate) preset`
14. `feat(anemone): Tier 3 Edwardsia (burrowing) preset`
15. `test(anemone): extend ArchetypeStability tests for all 7 presets + state machine`
16. `test(anemone): add performance benchmarks + memory leak test`

---

## Guardrails (Non-Negotiable)

- ❌ No visual debug tools for mesenteries/sphincters
- ❌ No human-judgment acceptance criteria ("looks right")
- ❌ No coral/colonial features (separate archetype)
- ❌ No VolumeConstraint simulation (use cross-bracing)
- ❌ No new constraint types beyond particulate.js 8
- ❌ No new unit tests (Vitest WSL broken) — agent QA only
- ✅ All acceptance criteria automated
- ✅ Commit per logical unit (see above)
- ✅ Particle budget < 5000 per anemone
- ✅ State machine hysteresis prevents flapping

---

## Dependencies

- Particulate.js: `DistanceConstraint.setDistance()`, `AngleConstraint`, `PointConstraint.setPosition()`
- Existing: `CreatureArchetype` interface, `archetypeRegistry`, `JellyfishLookEditor` for look params
- UI: `CreatureSelectMenu` already handles preset switching