/**
 * anemone-presets.ts
 *
 * Anemone presets using the real AnemoneArchetype (archetypeId: 'anemone').
 * Three presets: Magnificent (classic reef), Bubble-Tip (bulbous tips),
 * and Tube (elongated burrowing).
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

const magnificentSpec: AnemoneSpec = {
  id: 'magnificent',
  archetypeId: 'anemone',
  bodyPlan: BodyPlan.Anemone,

  stalk: {
    height: 35,
    width: 14,
    segments: 8,
    taper: 0.3,
  },
  tentacles: {
    count: 36,
    length: 20,
    thickness: 1.2,
    arrangement: 'ring',
  },
  sway: {
    amplitude: 3.0,
    frequency: 1.2,
    phase: 0.0,
  },
  baseShape: 'conical',

  symmetry: { kind: 'radial', order: 12, breaking: 0.1 },
  crossSection: { kind: 'circle' },
  spine: { kind: 'none' },
  budget: { maxParticles: 3000 },
};

const bubbleTipSpec: AnemoneSpec = {
  id: 'bubbleTip',
  archetypeId: 'anemone',
  bodyPlan: BodyPlan.Anemone,

  stalk: {
    height: 25,
    width: 18,
    segments: 6,
    taper: 0.15,
  },
  tentacles: {
    count: 24,
    length: 12,
    thickness: 2.0,
    arrangement: 'rows',
    rows: 3,
  },
  sway: {
    amplitude: 2.0,
    frequency: 0.9,
    phase: 0.5,
  },
  baseShape: 'flat',

  symmetry: { kind: 'radial', order: 8, breaking: 0.08 },
  crossSection: { kind: 'circle' },
  spine: { kind: 'none' },
  budget: { maxParticles: 2500 },
};

const tubeSpec: AnemoneSpec = {
  id: 'tube',
  archetypeId: 'anemone',
  bodyPlan: BodyPlan.Anemone,

  stalk: {
    height: 55,
    width: 8,
    segments: 12,
    taper: 0.0,
  },
  tentacles: {
    count: 16,
    length: 10,
    thickness: 0.8,
    arrangement: 'ring',
  },
  sway: {
    amplitude: 4.0,
    frequency: 0.6,
    phase: 1.0,
  },
  baseShape: 'columnar',

  symmetry: { kind: 'radial', order: 6, breaking: 0.12 },
  crossSection: { kind: 'circle' },
  spine: { kind: 'none' },
  budget: { maxParticles: 2000 },
};

// ── Presets ────────────────────────────────────────────────────────────────

export const magnificentPreset: CreaturePreset = {
  id: 'magnificent',
  name: 'Magnificent Anemone',
  spec: magnificentSpec,
  look: {
    bulb: {
      colorA: '#E87A9B',
      colorB: '#5C1A3A',
      opacity: 0.9,
      patternScale0: 1.0,
      patternScale1: 0.8,
      rimBoost: 1.2,
    },
    gel: { color: '#F0A0B8', opacity: 0.15 },
    tail: { colorA: '#E87A9B', colorB: '#5C1A3A', opacity: 0.8, scale: 1.0 },
    mouth: { colorA: '#E87A9B', colorB: '#5C1A3A', opacity: 0.8, scale: 1.0 },
    tentacle: { color: '#FDA4BA', opacity: 0.55, area: 500 },
    post: { bloomStrength: 0.25, bloomRadius: 0.4, bloomThreshold: 0.6, ...defaultPost },
  },
};

export const bubbleTipPreset: CreaturePreset = {
  id: 'bubbleTip',
  name: 'Bubble-Tip Anemone',
  spec: bubbleTipSpec,
  look: {
    bulb: {
      colorA: '#6BB87A',
      colorB: '#1A4A2A',
      opacity: 0.9,
      patternScale0: 1.2,
      patternScale1: 0.6,
      rimBoost: 1.0,
    },
    gel: { color: '#90D09F', opacity: 0.15 },
    tail: { colorA: '#6BB87A', colorB: '#1A4A2A', opacity: 0.8, scale: 1.0 },
    mouth: { colorA: '#6BB87A', colorB: '#1A4A2A', opacity: 0.8, scale: 1.0 },
    tentacle: { color: '#7FC98E', opacity: 0.6, area: 400 },
    post: { bloomStrength: 0.2, bloomRadius: 0.35, bloomThreshold: 0.65, ...defaultPost },
  },
};

export const tubePreset: CreaturePreset = {
  id: 'tube',
  name: 'Tube Anemone',
  spec: tubeSpec,
  look: {
    bulb: {
      colorA: '#D4A0A0',
      colorB: '#4A2020',
      opacity: 0.9,
      patternScale0: 0.6,
      patternScale1: 1.0,
      rimBoost: 1.5,
    },
    gel: { color: '#E0B8B8', opacity: 0.1 },
    tail: { colorA: '#D4A0A0', colorB: '#4A2020', opacity: 0.85, scale: 1.0 },
    mouth: { colorA: '#D4A0A0', colorB: '#4A2020', opacity: 0.85, scale: 1.0 },
    tentacle: { color: '#E0C0C0', opacity: 0.5, area: 300 },
    post: { bloomStrength: 0.15, bloomRadius: 0.3, bloomThreshold: 0.7, ...defaultPost },
  },
};

export const ANEMONE_PRESETS: CreaturePreset[] = [magnificentPreset, bubbleTipPreset, tubePreset];
