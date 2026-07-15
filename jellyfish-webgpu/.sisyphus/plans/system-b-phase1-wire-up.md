# Phase 1: System B End-to-End Wire-Up

## TL;DR

> **Quick Summary**: Wire the existing System B scaffolding (FormDefinition + CreatureGraph + CreatureAssembler) end-to-end so a multi-part creature — a Comb Jelly bell with 8 rim-attached tentacles — actually renders, animates, and survives scene transitions. This is the smallest possible step toward the modular creature generator vision.
>
> **Deliverables**:
> - Sockets populated on the Comb Jelly FormDefinition
> - A Tentacle appendage FormDefinition
> - A multi-part CreatureGraph constant (bell + tentacles)
> - Fix `resolveSocket` to return rim surface positions (not spine center)
> - Fix `updateFromGraph` to handle multiple meshes
> - Fix resource cleanup for System B creatures (no leaks)
> - Verified working in browser via VisualLab
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 5 -> Task 6

---

## Work Objectives

### Core Objective
Wire System B end-to-end so a multi-part creature (1 body + 8 appendages) can be defined as a CreatureGraph, assembled by CreatureAssembler, rendered with Three.js meshes, and animated with Particulate physics.

### Concrete Deliverables
- Modified: `src/jellyfish/creatures/migrated/forms.ts` — add sockets to COMB_JELLY_FORM, add TENTACLE_FORM, add COMB_JELLY_MULTI_GRAPH
- Modified: `src/jellyfish/builder/GeometryGenerator.ts` — fix `resolveSocket` for 'rib' type (rim surface)
- Modified: `src/scenes/JellyfishMaterialTest.ts` — fix multi-mesh handling, fix dispose, add guards

### Definition of Done
- [ ] `bun run dev` starts without errors
- [ ] Open browser -> Click "OPEN VISUAL BUILDER" -> Select "Comb Jelly" preset -> See bell + 8 tentacles
- [ ] Tentacles hang from the bell's rim (not from the spine center)
- [ ] Bell pulses and tentacles move with physics
- [ ] Close builder -> Re-open -> No Three.js resource warnings in console
- [ ] Switch between presets multiple times -> No crashes, no leaks

### Must Have
- Sockets populated on COMB_JELLY_FORM (`rim: { type: 'rib', perRib: true }`)
- TENTACLE_FORM as a simple tapering appendage
- COMB_JELLY_MULTI_GRAPH constant with 8 child nodes, each on a different `ribIndex`
- `resolveSocket('rib')` returns rim surface (spine center + radius * outward direction)
- `updateFromGraph` iterates ALL meshes, assigns position/positionPrev to each
- Resource cleanup for System B creatures (dispose physics + materials)

### Must NOT Have (Guardrails)
- **NO System A file changes**: JellyfishSystem.ts, JellyfishGeometry.ts, CreatureSpec.ts, presets.ts, ArchetypeCatalog.ts, createCreatureRig.ts are off limits
- **NO VisualLab UI changes**: No multi-node graph construction UI, no new React components
- **NO new type system changes**: No new fields on FormDefinition, SocketDefinition, or CreatureGraph
- **NO perRib expansion in GraphTraverser**: Use explicit child nodes with `ribIndex: 0..7`
- **NO fixing socket types beyond 'rib'**: 'surface' and 'center' remain as-is
- **NO second appendage form**: Only ONE tentacle FormDefinition

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (Vitest configured but non-functional due to WSL path issues)
- **Automated tests**: NO unit tests (project limitation)
- **Verification method**: Agent-executed browser QA via dev-browser + console assertions

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/system-b-phase1/`.

- **Frontend**: dev-browser skill — Navigate, open VisualLab, load preset, inspect DOM/console
- **Console**: Bash with browser console log monitoring
- **Visual**: Screenshots captured at key steps

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — can start in parallel):
├── Task 1: Populate sockets + create tentacle form + multi-part graph
└── Task 2: Fix resolveSocket for 'rib' type (rim surface position + outward rotation)

Wave 2 (After Wave 1 — depends on new forms + socket fixes):
├── Task 3: Fix updateFromGraph for multi-mesh rendering
├── Task 4: Fix dispose/cleanup for System B creatures
└── Task 5: Add null guards and edge-case handling

Wave 3 (Verification):
└── Task 6: End-to-end QA — browser verification of multi-part creature
```

---

## TODOs

- [ ] 1. Populate Sockets + Create Tentacle Form + Multi-Part Graph

  **What to do**:
  - Add `sockets: { rim: { type: 'rib', perRib: true } }` to COMB_JELLY_FORM
  - Create TENTACLE_FORM: a new FormDefinition with:
    - id: 'tentacle', name: 'Tentacle', category: 'Appendage'
    - Geometry: tapering profile (`{ kind: 'linear', start: 0.3, end: 0.05 }`), circular cross-section (m=4, n1=1, n2=1, n3=1, a=1, b=1), straight spine, scale y=2
    - Material: translucent glowing colors
    - No sockets (tentacle has no further attachment points)
  - Create COMB_JELLY_MULTI_GRAPH: a CreatureGraph with:
    - Root: formId: 'comb_jelly_bell' (same as existing)
    - 8 children, each as: `{ id: 'tentacle_N', type: 'Part', formId: 'tentacle', placement: { socket: 'rim', ribIndex: N, offset: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 }, children: [] }`
  - Export + add to MIGRATED_FORMS
  - Update loadPreset() in VisualLab to use the new multi-part graph

  **Must NOT do**:
  - Do NOT modify MOON_JELLY_FORM or SIPHONOPHORE_UNIT_FORM
  - Do NOT create more than one appendage form
  - Do NOT implement perRib expansion logic

  **Recommended Agent Profile**:
  - **Category**: deep | **Skills**: []

  **Parallelization**:
  - **Wave**: 1 | **Parallel**: YES (with Task 2)
  - **Blocks**: Task 3, Task 4, Task 5, Task 6
  - **Blocked By**: None

  **References**:
  - `forms.ts` — EXISTING file, add to it
  - `FormDefinition.ts` — Interface to implement
  - `CreatureGraph.ts` — Interface for the multi-part graph
  - `Socket.ts` — SocketDefinition type
  - `VisualLab.tsx:62-73` — loadPreset function

  **Acceptance Criteria**:
  - [ ] forms.ts compiles with no type errors
  - [ ] COMB_JELLY_FORM has sockets.rim defined
  - [ ] TENTACLE_FORM is valid with category: 'Appendage'
  - [ ] Multi-part graph has root.children.length === 8
  - [ ] Each child has unique ribIndex (0-7)
  - [ ] MIGRATED_FORMS includes TENTACLE_FORM

  **QA Scenarios**:

  Scenario: TypeScript compilation
    Tool: Bash
    Steps:
      1. cd jellyfish-webgpu && npx tsc --noEmit
    Expected: Exit code 0
    Evidence: .sisyphus/evidence/system-b-phase1/task1-tsc.txt

  Scenario: Multi-part graph structure
    Tool: Bash (node -e)
    Steps:
      1. node -e "console.log(require('./src/jellyfish/creatures/migrated/forms').COMB_JELLY_MULTI_GRAPH.root.children.length)"
    Expected: Outputs "8"
    Evidence: .sisyphus/evidence/system-b-phase1/task1-children-count.txt

  **Commit**: YES
  - Message: `feat(graph): populate sockets on comb jelly form, add tentacle form and multi-part graph`
  - Files: src/jellyfish/creatures/migrated/forms.ts, src/editor/visual-lab/VisualLab.tsx

- [ ] 2. Fix resolveSocket for 'rib' type sockets

  **What to do**:
  - In GeometryGenerator.ts, modify resolveSocket(form, socketName, u, v, ribIndex):
    - For socket name matching 'rib' pattern (e.g. 'rim'):
      1. Default to bottom ring: targetV = 1.0
      2. If ribIndex provided: targetV = ribIndex / 32 (clamped 0-1)
      3. Evaluate spine frame at targetV via evalSpine(targetV, spine)
      4. Evaluate radius: radius = evalRadiusProfile(profile, targetV) * 10
      5. Outward direction = frame.normal (default) rotated by angle around frame.tangent
      6. Position = spine pos + outward * radius * scale.x
      7. Rotation: quaternion from world-up to outward direction
    - Keep 'tip' and 'root' behavior unchanged

  **Must NOT do**:
  - Do NOT change heightSegments constant (32)
  - Do NOT add new fields to FormDefinition
  - Do NOT implement 'surface' or 'center' socket types

  **Recommended Agent Profile**:
  - **Category**: deep | **Skills**: []

  **Parallelization**:
  - **Wave**: 1 | **Parallel**: YES (with Task 1)
  - **Blocks**: Task 3, Task 6
  - **Blocked By**: None

  **References**:
  - GeometryGenerator.ts:257-275 — EXISTING resolveSocket
  - GeometryGenerator.ts:34-92 — evalSpine function
  - RadiusProfileCurve.ts — evalRadiusProfile
  - GeometryGenerator.ts:99-255 — generate() showing vertex computation pattern

  **Acceptance Criteria**:
  - [ ] resolveSocket('comb_jelly_bell', 'rim', _, _, 0) returns rim position, not spine center
  - [ ] Different ribIndex (0-7) returns positions distributed around the rim
  - [ ] Returned rotation points outward from rim
  - [ ] Tip and root sockets still work as before

  **QA Scenarios**:

  Scenario: Rim positions form a ring
    Tool: Bash (node)
    Steps:
      1. Import forms.ts and GeometryGenerator
      2. Call resolveSocket for ribIndex=0..7
      3. Check positions are at y≈-10, radial distance≈10
    Expected: 8 positions on a ring
    Failure: All positions at (0, -10, 0) — spine center
    Evidence: .sisyphus/evidence/system-b-phase1/task2-rim-positions.txt

  Scenario: Tip socket regression
    Tool: Bash (node)
    Steps:
      1. resolveSocket('comb_jelly_bell', 'tip')
    Expected: (0, -10, 0) — bottom of spine
    Evidence: .sisyphus/evidence/system-b-phase1/task2-tip-position.txt

  **Commit**: YES
  - Message: `fix(graph): resolveSocket returns rim surface positions for rib type sockets`
  - Files: src/jellyfish/builder/GeometryGenerator.ts

- [ ] 3. Fix updateFromGraph for multi-mesh rendering

  **What to do**:
  - In JellyfishMaterialTest.ts, modify updateFromGraph() (line 421):
    - Replace `const mesh = group.children[0] as THREE.Mesh` with group traversal:
      ```
      const meshes: THREE.Mesh[] = [];
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });
      ```
    - Track vertex offset. For EACH mesh:
      - Get vertexCount from mesh.geometry.attributes.position.count
      - Create Float32Array view into physics buffer: `new Float32Array(system.positions.buffer, vertexOffset * 4, vertexCount * 3)`
      - Assign as BufferAttribute on mesh.geometry
      - Same for positionPrev
      - Increment vertexOffset by vertexCount
    - Store meshes in CustomPhysicsRuntime
    - In updatePhysics() (line 1359), update ALL stored meshes' position/positionPrev needsUpdate

  **Must NOT do**:
  - Do NOT change CreatureAssembler output format
  - Do NOT change System A path (units)

  **Recommended Agent Profile**:
  - **Category**: deep | **Skills**: []

  **Parallelization**:
  - **Wave**: 2 | **Parallel**: NO (depends on Task 1 + Task 2)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1, Task 2

  **References**:
  - JellyfishMaterialTest.ts:421-543 — updateFromGraph
  - JellyfishMaterialTest.ts:1344-1367 — updatePhysics
  - JellyfishMaterialTest.ts:512-519 — specific lines to replace
  - JellyfishMaterialTest.ts:85-99 — CustomPhysicsRuntime type

  **Acceptance Criteria**:
  - [ ] All meshes have position and positionPrev BufferAttributes
  - [ ] Each mesh's position corresponds to its own vertices
  - [ ] Physics tick updates all meshes
  - [ ] No Three.js warnings

  **QA Scenarios**:

  Scenario: Multi-mesh renders in browser
    Tool: dev-browser
    Steps:
      1. Open browser > Click "OPEN VISUAL BUILDER" > Select "Comb Jelly"
      2. Check creatureGroup.children.length
    Expected: 9 meshes (1 bell + 8 tentacles)
    Evidence: .sisyphus/evidence/system-b-phase1/task3-mesh-count.txt

  Scenario: No console errors
    Tool: dev-browser console
    Steps: Same setup, watch console for 10s
    Expected: No Three.js warnings
    Evidence: .sisyphus/evidence/system-b-phase1/task3-console-clean.txt

  **Commit**: YES
  - Message: `fix(scene): handle multi-mesh rendering in updateFromGraph`
  - Files: src/scenes/JellyfishMaterialTest.ts

- [ ] 4. Fix resource cleanup for System B creatures

  **What to do**:
  - In disposeUnits() at line 580:
    - Add loop to clean this.customPhysics: dispose ParticleSystem, clear array
    - Add loop to clean this.customMaterials: mat.dispose(), clear array
  - In restore() at line 600: call new cleanup before switching to System A
  - In updateFromGraph() at line 421: clean customPhysics + customMaterials BEFORE rebuilding (null-safe)

  **Must NOT do**:
  - Do NOT modify System A dispose logic
  - Do NOT add dispose calls before first init (null-safe only)

  **Recommended Agent Profile**:
  - **Category**: deep | **Skills**: []

  **Parallelization**:
  - **Wave**: 2 | **Parallel**: YES (with Task 3, Task 5)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:
  - JellyfishMaterialTest.ts:580-595 — disposeUnits
  - JellyfishMaterialTest.ts:600-603 — restore
  - JellyfishMaterialTest.ts:421-426 — top of updateFromGraph
  - Particulate.js: ParticleSystem dispose/destroy API

  **Acceptance Criteria**:
  - [ ] System B -> System A transition: no dispose warnings
  - [ ] System A -> System B -> System A: no memory leak
  - [ ] Calling updateFromGraph twice: old resources cleaned first

  **QA Scenarios**:

  Scenario: Cycle between A and B three times
    Tool: dev-browser
    Steps:
      1. Open browser (System A renders)
      2. Open VisualLab > Select "Comb Jelly" (System B)
      3. Close VisualLab (System A)
      4. Repeat 3x
    Expected: No warnings, stable performance
    Evidence: .sisyphus/evidence/system-b-phase1/task4-cycle-clean.txt

  Scenario: Console dispose monitoring
    Tool: dev-browser
    Steps: Same cycles, watch console
    Expected: Clean console, no dispose warnings
    Evidence: .sisyphus/evidence/system-b-phase1/task4-dispose-clean.txt

  **Commit**: YES
  - Message: `fix(scene): clean up System B resources on dispose and restore`
  - Files: src/scenes/JellyfishMaterialTest.ts

- [ ] 5. Add null guards and edge-case handling

  **What to do**:
  - In updateFromGraph():
    - Guard: `if (group.children.length === 0) return;` with console.warn
    - Guard: `if (physics.particles.length === 0) return;` with console.warn
    - Null check for graph and forms parameters
    - All guards warn + early return (no crashes)

  **Must NOT do**:
  - Do NOT add heavy validation
  - Do NOT throw — warn and return gracefully

  **Recommended Agent Profile**:
  - **Category**: quick | **Skills**: []

  **Parallelization**:
  - **Wave**: 2 | **Parallel**: YES (with Task 3, Task 4)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**: Existing console.warn patterns in the file

  **Acceptance Criteria**:
  - [ ] Empty graph -> console warning, no crash
  - [ ] null/undefined graph -> early return
  - [ ] Unknown form ID -> warning
  - [ ] Normal operation unaffected

  **QA Scenarios**:

  Scenario: Empty graph doesn't crash
    Tool: dev-browser console
    Steps:
      1. In console: testScene.updateFromGraph({root:{id:'root',type:'Part',formId:'nonexistent',children:[]}}, [])
    Expected: Console warning, no crash
    Evidence: .sisyphus/evidence/system-b-phase1/task5-empty-graph.txt

  **Commit**: YES (groups with task 3 or 4)
  - Message: `fix(scene): add null guards and edge-case handling to updateFromGraph`
  - Files: src/scenes/JellyfishMaterialTest.ts

- [ ] 6. End-to-end verification

  **What to do**:
  - Run bun run dev, verify no compilation errors
  - Execute ALL QA scenarios from Tasks 1-5
  - Verify multi-part creature renders in browser
  - Run cycle test (System A -> B -> A -> B) 3x
  - Capture screenshots of key states
  - Log all console output

  **Must NOT do**:
  - Do NOT start new feature work
  - Do NOT fix out-of-scope issues (note them for later)

  **Recommended Agent Profile**:
  - **Category**: unspecified-high | **Skills**: [dev-browser]

  **Parallelization**:
  - **Wave**: 3 (final) | **Parallel**: NO
  - **Blocks**: Nothing (final verification)
  - **Blocked By**: Tasks 1-5

  **Acceptance Criteria**:
  - [ ] All QA scenarios pass
  - [ ] Multi-part creature visible in browser (screenshots)
  - [ ] Console free of errors/warnings
  - [ ] Three cycle iterations with no leaks

  **QA Scenarios**:

  Scenario: Full visual verification
    Tool: dev-browser
    Steps:
      1. Open browser, let scene load
      2. Screenshot default creature
      3. Click "OPEN VISUAL BUILDER"
      4. Select "Comb Jelly" preset
      5. Wait 2s, screenshot
    Expected: Bell + 8 tentacles visible
    Evidence: .sisyphus/evidence/system-b-phase1/task6-multi-creature.png

  Scenario: Three-cycle leak check
    Tool: dev-browser
    Steps: Close -> Open -> Select -> Wait (3x)
    Expected: No warnings, stable
    Evidence: .sisyphus/evidence/system-b-phase1/task6-cycle.txt

  **Commit**: NO

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — oracle
  Verify Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT

- [ ] F2. **Code Quality Review** — unspecified-high
  tsc --noEmit | Lint | Review for AI slop | VERDICT

- [ ] F3. **Real Manual QA** — unspecified-high (+ dev-browser)
  Execute EVERY QA scenario | Cross-task integration | Evidence captured

- [ ] F4. **Scope Fidelity Check** — deep
  Each task's diff vs spec | 1:1 mapping | No contamination

---

## Commit Strategy

- **Task 1**: `feat(graph): populate sockets on comb jelly form, add tentacle form and multi-part graph`
- **Task 2**: `fix(graph): resolveSocket returns rim surface positions for rib type sockets`
- **Task 3**: `fix(scene): handle multi-mesh rendering in updateFromGraph`
- **Task 4**: `fix(scene): clean up System B resources on dispose and restore`
- **Task 5**: `fix(scene): add null guards and edge-case handling to updateFromGraph`
- **Task 6**: (no commit)

---

## Success Criteria

### Verification Commands
```
cd C:\Users\mehul\OneDrive\Desktop\Studio\PROJECTS\samudra\apps-jelly-webgpu\jellyfish-webgpu
bun run dev
# Open browser -> Verify multi-part creature renders
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All QA scenarios pass
- [ ] Multi-part creature renders with bell + 8 tentacles
- [ ] No memory leaks on scene transitions
