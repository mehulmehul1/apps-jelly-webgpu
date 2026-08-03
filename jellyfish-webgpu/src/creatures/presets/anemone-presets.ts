/**
 * anemone-presets.ts
 *
 * Anemone presets using the real AnemoneArchetype (archetypeId: 'anemone').
 * Four biologically accurate species: Actinia, Metridium, Anthopleura, Edwardsia
 */

import { BodyPlan } from '../../jellyfish/creatures/BodyPlan';
import type { CreaturePreset } from '../../jellyfish/creatures/presets';
import type { AnemoneSpec } from '../../jellyfish/creatures/CreatureSpec';

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

// ── Specs ──────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// Biologically Accurate Species Presets
// ═══════════════════════════════════════════════════════════════════════════

// Actinia equina — Beadlet Anemone
const actiniaSpec: AnemoneSpec = {
  id: 'actinia',
  archetypeId: 'anemone',
  bodyPlan: BodyPlan.Anemone,

  stalk: {
    height: 30,
    width: 16,
    segments: 8,
    taper: 0.2,
  },
  tentacles: {
    count: 192,
    length: 12,
    thickness: 0.8,
    arrangement: 'rows',
    rows: 6,
  },
  sway: {
    amplitude: 1.5,
    frequency: 1.0,
    phase: 0.0,
  },
  baseShape: 'flat',

  symmetry: { kind: 'radial', order: 6, breaking: 0.05 },
  crossSection: { kind: 'circle' },
  spine: { kind: 'none' },
  budget: { maxParticles: 4000 },

  // Tier 1: Anatomical accuracy
  mesenteries: {
    cycles: 6,
    perfectCycles: 1,
    retractorType: 'diffuse',
    mesoglealThickness: 0.4,
  },
  sphincter: {
    type: 'endodermal',
    strength: 0.65,
    position: 'margin',
  },
  columnRegions: {
    scapusHeightRatio: 0.55,
    scapulusHeightRatio: 0.25,
    capitulumHeightRatio: 0.2,
    verrucae: {
      present: true,
      density: 0.8,
      rows: 12,
    },
  },
  oralDisc: {
    mouthGape: 0.25,
    peristomeHeight: 0.1,
    siphonoglyphs: 2,
    actinopharynxDepth: 0.6,
  },
  acontia: {
    present: false,
    cinclideRows: 0,
    nematocystDensity: 0,
    ejectionForce: 0,
  },
};

// Metridium senile — Plumose Anemone
const metridiumSpec: AnemoneSpec = {
  id: 'metridium',
  archetypeId: 'anemone',
  bodyPlan: BodyPlan.Anemone,

  stalk: {
    height: 80,
    width: 20,
    segments: 16,
    taper: 0.1,
  },
  tentacles: {
    count: 700,
    length: 8,
    thickness: 0.4,
    arrangement: 'rows',
    rows: 12,
  },
  sway: {
    amplitude: 3.0,
    frequency: 0.7,
    phase: 0.3,
  },
  baseShape: 'conical',

  symmetry: { kind: 'radial', order: 12, breaking: 0.08 },
  crossSection: { kind: 'circle' },
  spine: { kind: 'none' },
  budget: { maxParticles: 5000 },

  // Tier 1: Anatomical accuracy
  mesenteries: {
    cycles: 24,
    perfectCycles: 1,
    retractorType: 'diffuse',
    mesoglealThickness: 0.25,
  },
  sphincter: {
    type: 'mesogleal',
    strength: 0.3,
    position: 'margin',
  },
  columnRegions: {
    scapusHeightRatio: 0.6,
    scapulusHeightRatio: 0.25,
    capitulumHeightRatio: 0.15,
    verrucae: {
      present: false,
      density: 0,
      rows: 0,
    },
  },
  oralDisc: {
    mouthGape: 0.15,
    peristomeHeight: 0.3,  // prominent parapet
    siphonoglyphs: 2,
    actinopharynxDepth: 0.7,
  },
  acontia: {
    present: true,
    cinclideRows: 4,
    nematocystDensity: 0.9,
    ejectionForce: 1.5,
  },
};

// Anthopleura elegantissima — Aggregate Anemone
const anthopleuraSpec: AnemoneSpec = {
  id: 'anthopleura',
  archetypeId: 'anemone',
  bodyPlan: BodyPlan.Anemone,

  stalk: {
    height: 40,
    width: 18,
    segments: 10,
    taper: 0.25,
  },
  tentacles: {
    count: 128,
    length: 10,
    thickness: 0.6,
    arrangement: 'rows',
    rows: 8,
  },
  sway: {
    amplitude: 2.0,
    frequency: 1.1,
    phase: 0.2,
  },
  baseShape: 'conical',

  symmetry: { kind: 'radial', order: 8, breaking: 0.1 },
  crossSection: { kind: 'circle' },
  spine: { kind: 'none' },
  budget: { maxParticles: 3500 },

  // Tier 1: Anatomical accuracy
  mesenteries: {
    cycles: 12,
    perfectCycles: 1,
    retractorType: 'restricted',
    mesoglealThickness: 0.35,
  },
  sphincter: {
    type: 'endodermal',
    strength: 0.7,
    position: 'margin',
  },
  columnRegions: {
    scapusHeightRatio: 0.5,
    scapulusHeightRatio: 0.3,
    capitulumHeightRatio: 0.2,
    verrucae: {
      present: true,
      density: 0.6,
      rows: 8,
    },
  },
  oralDisc: {
    mouthGape: 0.3,
    peristomeHeight: 0.15,
    siphonoglyphs: 2,
    actinopharynxDepth: 0.55,
  },
  acontia: {
    present: false,
    cinclideRows: 0,
    nematocystDensity: 0,
    ejectionForce: 0,
  },
};

// Edwardsia — Burrowing Anemone (bilateral!)
const edwardsiaSpec: AnemoneSpec = {
  id: 'edwardsia',
  archetypeId: 'anemone',
  bodyPlan: BodyPlan.Anemone,

  stalk: {
    height: 60,
    width: 6,
    segments: 20,
    taper: -0.1, // slight bulge at physa
  },
  tentacles: {
    count: 12,
    length: 8,
    thickness: 0.5,
    arrangement: 'ring',
  },
  sway: {
    amplitude: 5.0,
    frequency: 0.5,
    phase: 0.0,
  },
  baseShape: 'columnar',

  symmetry: { kind: 'bilateral', order: 2, breaking: 0.35 },
  crossSection: { kind: 'ellipse', xScale: 1.2, zScale: 0.8 },
  spine: { kind: 'none' },
  budget: { maxParticles: 2200 },

  // Tier 1: Anatomical accuracy (bilateral, 8 mesenteries)
  mesenteries: {
    cycles: 4,  // bilateral = 8 total (4 pairs)
    perfectCycles: 2,
    retractorType: 'restricted',
    mesoglealThickness: 0.5,
  },
  sphincter: {
    type: 'absent',
    strength: 0,
    position: 'margin',
  },
  columnRegions: {
    scapusHeightRatio: 0.3,
    scapulusHeightRatio: 0.4,
    capitulumHeightRatio: 0.3,
    verrucae: {
      present: false,
      density: 0,
      rows: 0,
    },
  },
  oralDisc: {
    mouthGape: 0.2,
    peristomeHeight: 0.05,
    siphonoglyphs: 1,
    actinopharynxDepth: 0.5,
  },
  acontia: {
    present: false,
    cinclideRows: 0,
    nematocystDensity: 0,
    ejectionForce: 0,
  },
};

// ── Presets ────────────────────────────────────────────────────────────────

export const actiniaPreset: CreaturePreset = {
  id: 'actinia',
  name: 'Actinia equina (Beadlet)',
  spec: actiniaSpec,
  look: {
    bulb: {
      colorA: '#C84040',
      colorB: '#4A1010',
      opacity: 0.95,
      patternScale0: 0.8,
      patternScale1: 1.2,
      rimBoost: 1.5,
    },
    gel: { color: '#D88080', opacity: 0.1 },
    tail: { colorA: '#C84040', colorB: '#4A1010', opacity: 0.9, scale: 1.0 },
    mouth: { colorA: '#FF6060', colorB: '#4A1010', opacity: 0.8, scale: 1.0 },
    tentacle: { color: '#FF8080', opacity: 0.7, area: 300 },
    post: { bloomStrength: 0.3, bloomRadius: 0.5, bloomThreshold: 0.5, ...defaultPost },
  },
};

export const metridiumPreset: CreaturePreset = {
  id: 'metridium',
  name: 'Metridium senile (Plumose)',
  spec: metridiumSpec,
  look: {
    bulb: {
      colorA: '#F8F8F0',
      colorB: '#A0A090',
      opacity: 0.85,
      patternScale0: 0.5,
      patternScale1: 1.5,
      rimBoost: 2.0,
    },
    gel: { color: '#E0E0D0', opacity: 0.12 },
    tail: { colorA: '#F8F8F0', colorB: '#A0A090', opacity: 0.7, scale: 1.0 },
    mouth: { colorA: '#FFFFFF', colorB: '#C0C0B0', opacity: 0.6, scale: 1.0 },
    tentacle: { color: '#F0F0E8', opacity: 0.4, area: 200 },
    post: { bloomStrength: 0.25, bloomRadius: 0.45, bloomThreshold: 0.6, ...defaultPost },
  },
};

export const anthopleuraPreset: CreaturePreset = {
  id: 'anthopleura',
  name: 'Anthopleura elegantissima (Aggregate)',
  spec: anthopleuraSpec,
  look: {
    bulb: {
      colorA: '#60C060',
      colorB: '#1A4A1A',
      opacity: 0.9,
      patternScale0: 1.1,
      patternScale1: 0.7,
      rimBoost: 1.3,
    },
    gel: { color: '#80E080', opacity: 0.15 },
    tail: { colorA: '#60C060', colorB: '#1A4A1A', opacity: 0.8, scale: 1.0 },
    mouth: { colorA: '#90E090', colorB: '#1A4A1A', opacity: 0.8, scale: 1.0 },
    tentacle: { color: '#A0F0A0', opacity: 0.55, area: 450 },
    post: { bloomStrength: 0.2, bloomRadius: 0.4, bloomThreshold: 0.65, ...defaultPost },
  },
};

export const edwardsiaPreset: CreaturePreset = {
  id: 'edwardsia',
  name: 'Edwardsia (Burrowing)',
  spec: edwardsiaSpec,
  look: {
    bulb: {
      colorA: '#D0D0E0',
      colorB: '#606080',
      opacity: 0.7,
      patternScale0: 0.4,
      patternScale1: 2.0,
      rimBoost: 1.8,
    },
    gel: { color: '#B0B0D0', opacity: 0.08 },
    tail: { colorA: '#D0D0E0', colorB: '#606080', opacity: 0.6, scale: 1.0 },
    mouth: { colorA: '#D0D0E0', colorB: '#606080', opacity: 0.5, scale: 1.0 },
    tentacle: { color: '#E0E0F0', opacity: 0.35, area: 250 },
    post: { bloomStrength: 0.1, bloomRadius: 0.25, bloomThreshold: 0.75, ...defaultPost },
  },
};

export const ANEMONE_PRESETS: CreaturePreset[] = [
  actiniaPreset,
  metridiumPreset,
  anthopleuraPreset,
  edwardsiaPreset,
];
