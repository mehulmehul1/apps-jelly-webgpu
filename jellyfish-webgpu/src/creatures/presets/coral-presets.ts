/**
 * coral-presets.ts
 *
 * Five coral presets using the real CoralArchetype (archetypeId: 'coral').
 *
 * Each preset's resource parameters are drawn from the Kaandorp (2013)
 * accretive growth model and Merks et al. (2003) Laplacian branching model:
 *
 *   c_total = (1-α)·c_nutrient + α·c_light
 *
 * - α (alpha):         light vs nutrient dominance
 * - diffusionLength:   maps to Péclet number inverse (Merks compactness)
 * - bifurcationThreshold: how much resource surplus is needed to split
 */

import { BodyPlan } from '../../jellyfish/creatures/BodyPlan';
import type { CreaturePreset } from '../../jellyfish/creatures/presets';
import type { CoralSpec } from '../../jellyfish/creatures/CreatureSpec';

// ── Shared post config ─────────────────────────────────────────────────────

const defaultPost = {
  lensDirtOpacity: 0.5,
  lensDirtFadeRate: 0.995,
  lensDirtSpawnSpread: 0.5,
  lensDirtMaxScale: 0.15,
  vignetteDarkness: 0.5,
  vignetteOffset: 1.25,
  vignetteColor: '#07070C',
};

// ═══════════════════════════════════════════════════════════════════════════
// Staghorn Coral  (Acropora cervicornis)
// — Fast-growing, densely branching, narrow angles.
//   α = 0.7 (light-driven — shallow, high-irradiance reef crest)
//   diffusionLength = 40 (relatively open structure)
//   bifurcationThreshold = 0.45 (frequent branching — Laplacian
//     instability runs strong in well-lit, well-flushed environments)
// ═══════════════════════════════════════════════════════════════════════════

const staghornSpec: CoralSpec = {
  id: 'staghorn',
  archetypeId: 'coral',
  bodyPlan: BodyPlan.Coral,

  growth: {
    maxGenerations: 6,
    maxBranches: 36,
    segmentLength: 4.5,
    bifurcationAngle: 0.52,  // ~30°
    phototropism: 0.45,
    randomFactor: 0.20,
  },

  resources: {
    alpha: 0.70,
    ambientLight: 0.15,
    diffusionLength: 40,
    growthRate: 0.9,
    bifurcationThreshold: 0.45,
  },

  morphology: {
    growthAxis: 'vertical',
    compactness: 0.3,
    branchThickness: 1.2,
    taper: 0.7,
    segmentsPerBranch: 4,
  },

  sway: {
    amplitude: 1.5,
    frequency: 0.6,
  },

  symmetry: { kind: 'radial', order: 8, breaking: 0.25 },
  crossSection: { kind: 'circle' },
  spine: { kind: 'none' },
  budget: { maxParticles: 5000 },
};

// ═══════════════════════════════════════════════════════════════════════════
// Sea Fan Coral  (Gorgonia ventalina)
// — Planar lattice branching confined to a 2D plane.
//   α = 0.85 (strongly light-driven — fans orient perpendicular to current
//     to maximise light capture while minimising drag)
//   diffusionLength = 55 (thin, open lattice needs long transport)
//   bifurcationThreshold = 0.4 (frequent branching creates dense mesh)
// ═══════════════════════════════════════════════════════════════════════════

const seaFanSpec: CoralSpec = {
  id: 'seaFan',
  archetypeId: 'coral',
  bodyPlan: BodyPlan.Coral,

  growth: {
    maxGenerations: 5,
    maxBranches: 30,
    segmentLength: 4.0,
    bifurcationAngle: 0.70,  // ~40° — wider spread for planar coverage
    phototropism: 0.30,
    randomFactor: 0.10,
  },

  resources: {
    alpha: 0.85,
    ambientLight: 0.10,
    diffusionLength: 55,
    growthRate: 0.8,
    bifurcationThreshold: 0.40,
  },

  morphology: {
    growthAxis: 'fan',
    compactness: 0.2,
    branchThickness: 0.9,
    taper: 0.6,
    segmentsPerBranch: 4,
  },

  sway: {
    amplitude: 2.0,
    frequency: 0.4,
  },

  symmetry: { kind: 'bilateral', order: 2, breaking: 0.15 },
  crossSection: { kind: 'ellipse', xScale: 1.0, zScale: 0.1 },
  spine: { kind: 'none' },
  budget: { maxParticles: 4000 },
};

// ═══════════════════════════════════════════════════════════════════════════
// Brain Coral  (Diploria labyrinthiformis)
// — Massive dome with meandroid surface folds.  Few branches, very thick.
//   α = 0.40 (nutrient-driven — slower-growing, deeper/calmer water)
//   diffusionLength = 18 (short transport → compact, spherical — Merks'
//     "compactification" at low Péclet number)
//   bifurcationThreshold = 0.80 (very high — branches almost never split,
//     growth is a slowly accreting dome)
// ═══════════════════════════════════════════════════════════════════════════

const brainCoralSpec: CoralSpec = {
  id: 'brainCoral',
  archetypeId: 'coral',
  bodyPlan: BodyPlan.Coral,

  growth: {
    maxGenerations: 3,
    maxBranches: 10,
    segmentLength: 3.5,
    bifurcationAngle: 0.87,   // ~50°
    phototropism: 0.20,
    randomFactor: 0.30,
  },

  resources: {
    alpha: 0.40,
    ambientLight: 0.30,
    diffusionLength: 18,
    growthRate: 0.4,
    bifurcationThreshold: 0.80,
  },

  morphology: {
    growthAxis: 'hemispherical',
    compactness: 0.9,
    branchThickness: 4.0,
    taper: 0.3,
    segmentsPerBranch: 3,
  },

  sway: {
    amplitude: 0.5,
    frequency: 0.2,
  },

  symmetry: { kind: 'radial', order: 6, breaking: 0.08 },
  crossSection: { kind: 'circle' },
  spine: { kind: 'none' },
  budget: { maxParticles: 2000 },
};

// ═══════════════════════════════════════════════════════════════════════════
// Organ Pipe Coral  (Tubipora musica)
// — Parallel vertical tubes connected at the base by horizontal stolons.
//   α = 0.50 (balanced — moderate light, moderate flow)
//   diffusionLength = 30 (moderate)
//   bifurcationThreshold = 0.90 (branches grow mostly parallel, rarely split)
// ═══════════════════════════════════════════════════════════════════════════

const organPipeSpec: CoralSpec = {
  id: 'organPipe',
  archetypeId: 'coral',
  bodyPlan: BodyPlan.Coral,

  growth: {
    maxGenerations: 4,
    maxBranches: 20,
    segmentLength: 5.0,
    bifurcationAngle: 0.10,  // ~6° — nearly parallel
    phototropism: 0.15,
    randomFactor: 0.08,
  },

  resources: {
    alpha: 0.50,
    ambientLight: 0.25,
    diffusionLength: 30,
    growthRate: 0.6,
    bifurcationThreshold: 0.90,
  },

  morphology: {
    growthAxis: 'vertical',
    compactness: 0.6,
    branchThickness: 1.8,
    taper: 0.2,
    segmentsPerBranch: 5,
  },

  sway: {
    amplitude: 0.8,
    frequency: 0.3,
  },

  symmetry: { kind: 'radial', order: 6, breaking: 0.12 },
  crossSection: { kind: 'circle' },
  spine: { kind: 'none' },
  budget: { maxParticles: 3000 },
};

// ═══════════════════════════════════════════════════════════════════════════
// Table Coral  (Acropora tabulata)
// — Horizontal plate on a narrow stalk, layered tiers.
//   α = 0.75 (light-driven — table morphology maximises surface area
//     for zooxanthellae)
//   diffusionLength = 50 (long transport to sustain the wide plate)
//   bifurcationThreshold = 0.35 (frequent horizontal splitting creates
//     the tabular plate)
// ═══════════════════════════════════════════════════════════════════════════

const tableCoralSpec: CoralSpec = {
  id: 'tableCoral',
  archetypeId: 'coral',
  bodyPlan: BodyPlan.Coral,

  growth: {
    maxGenerations: 4,
    maxBranches: 24,
    segmentLength: 4.0,
    bifurcationAngle: 1.40,  // ~80° — very wide for horizontal spread
    phototropism: 0.10,
    randomFactor: 0.15,
  },

  resources: {
    alpha: 0.75,
    ambientLight: 0.15,
    diffusionLength: 50,
    growthRate: 0.7,
    bifurcationThreshold: 0.35,
  },

  morphology: {
    growthAxis: 'hemispherical',
    compactness: 0.25,
    branchThickness: 0.8,
    taper: 0.8,
    segmentsPerBranch: 3,
  },

  sway: {
    amplitude: 1.0,
    frequency: 0.5,
  },

  symmetry: { kind: 'radial', order: 4, breaking: 0.2 },
  crossSection: { kind: 'circle' },
  spine: { kind: 'none' },
  budget: { maxParticles: 3500 },
};

// ── Presets ────────────────────────────────────────────────────────────────

export const staghornPreset: CreaturePreset = {
  id: 'staghorn',
  name: 'Staghorn Coral',
  spec: staghornSpec,
  look: {
    bulb: {
      colorA: '#F5D0A9',
      colorB: '#B86A3A',
      opacity: 0.85,
      patternScale0: 1.0,
      patternScale1: 0.8,
      rimBoost: 1.2,
    },
    gel: { color: '#F5E0C0', opacity: 0.08 },
    tail: { colorA: '#F5D0A9', colorB: '#B86A3A', opacity: 0.8, scale: 1.0 },
    mouth: { colorA: '#F5D0A9', colorB: '#B86A3A', opacity: 0.8, scale: 1.0 },
    tentacle: { color: '#F5D0A9', opacity: 0.4, area: 300 },
    post: { bloomStrength: 0.15, bloomRadius: 0.35, bloomThreshold: 0.65, ...defaultPost },
  },
};

export const seaFanPreset: CreaturePreset = {
  id: 'seaFan',
  name: 'Sea Fan Coral',
  spec: seaFanSpec,
  look: {
    bulb: {
      colorA: '#D4A0E8',
      colorB: '#5A1A80',
      opacity: 0.8,
      patternScale0: 1.2,
      patternScale1: 0.6,
      rimBoost: 1.0,
    },
    gel: { color: '#E0C0F0', opacity: 0.1 },
    tail: { colorA: '#D4A0E8', colorB: '#5A1A80', opacity: 0.75, scale: 1.0 },
    mouth: { colorA: '#D4A0E8', colorB: '#5A1A80', opacity: 0.75, scale: 1.0 },
    tentacle: { color: '#E0C0F0', opacity: 0.35, area: 250 },
    post: { bloomStrength: 0.2, bloomRadius: 0.4, bloomThreshold: 0.6, ...defaultPost },
  },
};

export const brainCoralPreset: CreaturePreset = {
  id: 'brainCoral',
  name: 'Brain Coral',
  spec: brainCoralSpec,
  look: {
    bulb: {
      colorA: '#C8D0A0',
      colorB: '#4A6A2A',
      opacity: 0.9,
      patternScale0: 2.0,
      patternScale1: 1.5,
      rimBoost: 1.5,
    },
    gel: { color: '#D8E0B0', opacity: 0.06 },
    tail: { colorA: '#C8D0A0', colorB: '#4A6A2A', opacity: 0.85, scale: 1.0 },
    mouth: { colorA: '#C8D0A0', colorB: '#4A6A2A', opacity: 0.85, scale: 1.0 },
    tentacle: { color: '#D8E0B0', opacity: 0.3, area: 200 },
    post: { bloomStrength: 0.1, bloomRadius: 0.25, bloomThreshold: 0.75, ...defaultPost },
  },
};

export const organPipePreset: CreaturePreset = {
  id: 'organPipe',
  name: 'Organ Pipe Coral',
  spec: organPipeSpec,
  look: {
    bulb: {
      colorA: '#E06040',
      colorB: '#801010',
      opacity: 0.85,
      patternScale0: 0.8,
      patternScale1: 1.2,
      rimBoost: 1.3,
    },
    gel: { color: '#E88060', opacity: 0.08 },
    tail: { colorA: '#E06040', colorB: '#801010', opacity: 0.8, scale: 1.0 },
    mouth: { colorA: '#E06040', colorB: '#801010', opacity: 0.8, scale: 1.0 },
    tentacle: { color: '#E88060', opacity: 0.35, area: 200 },
    post: { bloomStrength: 0.15, bloomRadius: 0.3, bloomThreshold: 0.7, ...defaultPost },
  },
};

export const tableCoralPreset: CreaturePreset = {
  id: 'tableCoral',
  name: 'Table Coral',
  spec: tableCoralSpec,
  look: {
    bulb: {
      colorA: '#E8D8A0',
      colorB: '#6A5020',
      opacity: 0.85,
      patternScale0: 1.0,
      patternScale1: 1.0,
      rimBoost: 1.1,
    },
    gel: { color: '#F0E8C0', opacity: 0.08 },
    tail: { colorA: '#E8D8A0', colorB: '#6A5020', opacity: 0.8, scale: 1.0 },
    mouth: { colorA: '#E8D8A0', colorB: '#6A5020', opacity: 0.8, scale: 1.0 },
    tentacle: { color: '#F0E8C0', opacity: 0.3, area: 250 },
    post: { bloomStrength: 0.15, bloomRadius: 0.35, bloomThreshold: 0.65, ...defaultPost },
  },
};

export const CORAL_PRESETS: CreaturePreset[] = [
  staghornPreset,
  seaFanPreset,
  brainCoralPreset,
  organPipePreset,
  tableCoralPreset,
];
