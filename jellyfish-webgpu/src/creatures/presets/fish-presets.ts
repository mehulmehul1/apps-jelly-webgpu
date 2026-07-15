/**
 * fish-presets.ts
 *
 * Six fish presets: mackerel (streamlined), angelfish (deep body),
 * clownfish (compact), puffer (round), neon tetra (tiny), moorish idol (tall fin).
 * Exports named presets for direct import and an array for batch use.
 */

import { BodyPlan } from '../../jellyfish/creatures/BodyPlan';
import type { CreaturePreset } from '../../jellyfish/creatures/presets';
import type { FishSpec } from '../../jellyfish/creatures/CreatureSpec';
import type { LookConfig } from '../../editor/look-presets';

// ── Specs ──────────────────────────────────────────────────────────────────

const mackerelSpec: FishSpec = {
  id: 'mackerel',
  archetypeId: 'fish',
  bodyPlan: BodyPlan.Fish,

  vertebraCount: 35,
  bodyLength: 50,
  bodyWidth: 10,
  bodyDepth: 7,

  // Streamlined torpedo shape: pointed head, thick middle, tapering tail.
  bodyProfile: {
    kind: 'polyline',
    points: [
      [0.0, 0.1],   // Snout
      [0.05, 0.4],  // Head
      [0.15, 0.85], // Shoulder
      [0.35, 1.0],  // Thickest point
      [0.55, 0.85], // Mid-body taper
      [0.75, 0.55], // Rear taper
      [0.9, 0.3],   // Tail peduncle
      [1.0, 0.05],  // Tail fin attachment
    ],
  },

  fins: [
    { kind: 'dorsal', attachmentT: 0.3, span: 3, height: 3.5, length: 2, flutterSpeed: 0.8, flutterAmplitude: 0.2 },
    { kind: 'dorsal', attachmentT: 0.55, span: 2.5, height: 2.5, length: 1.5, flutterSpeed: 0.8, flutterAmplitude: 0.2 },
    { kind: 'pectoral', attachmentT: 0.2, span: 3, height: 3, length: 1.5, flutterSpeed: 1.2, flutterAmplitude: 0.3 },
    { kind: 'anal', attachmentT: 0.6, span: 2.5, height: 2, length: 1.5, flutterSpeed: 0.8, flutterAmplitude: 0.2 },
    { kind: 'caudal', attachmentT: 1.0, span: 8, height: 6, length: 1, flutterSpeed: 0.5, flutterAmplitude: 0.15 },
  ],

  undulation: {
    amplitude: 2.5,
    frequency: 3.0,
    speed: 2.0,
    finFlutter: 1.2,
  },

  symmetry: { kind: 'bilateral', order: 2, breaking: 0.05 },
  crossSection: { kind: 'ellipse', xScale: 1.0, zScale: 0.7 },
  spine: { kind: 'none' },

  budget: { maxParticles: 2500 },
};

const angelfishSpec: FishSpec = {
  id: 'angelfish',
  archetypeId: 'fish',
  bodyPlan: BodyPlan.Fish,

  vertebraCount: 25,
  bodyLength: 45,
  bodyWidth: 6,
  bodyDepth: 18,

  // Deep disc-like body: tall, narrow, almost circular.
  bodyProfile: {
    kind: 'polyline',
    points: [
      [0.0, 0.15],  // Mouth
      [0.03, 0.4],  // Head
      [0.1, 0.75],  // Forehead
      [0.25, 0.95], // Upper body
      [0.45, 1.0],  // Deepest point
      [0.65, 0.85], // Lower body
      [0.85, 0.4],  // Tail peduncle
      [1.0, 0.1],   // Tail
    ],
  },

  fins: [
    { kind: 'dorsal', attachmentT: 0.25, span: 6, height: 8, length: 4, flutterSpeed: 0.6, flutterAmplitude: 0.15 },
    { kind: 'anal', attachmentT: 0.55, span: 5, height: 6, length: 3, flutterSpeed: 0.6, flutterAmplitude: 0.15 },
    { kind: 'pectoral', attachmentT: 0.2, span: 2, height: 2.5, length: 1, flutterSpeed: 1.0, flutterAmplitude: 0.25 },
    { kind: 'pelvic', attachmentT: 0.4, span: 2, height: 2, length: 1, flutterSpeed: 1.0, flutterAmplitude: 0.25 },
    { kind: 'caudal', attachmentT: 1.0, span: 7, height: 5, length: 1, flutterSpeed: 0.4, flutterAmplitude: 0.1 },
  ],

  undulation: {
    amplitude: 1.5,
    frequency: 1.5,
    speed: 1.0,
    finFlutter: 0.8,
  },

  symmetry: { kind: 'bilateral', order: 2, breaking: 0.08 },
  crossSection: { kind: 'ellipse', xScale: 0.5, zScale: 1.0 },
  spine: { kind: 'none' },

  budget: { maxParticles: 2000 },
};

// ── Shared post config (same defaults used by all jellyfish presets) ───────

const defaultPost = {
  lensDirtOpacity: 0.5,
  lensDirtFadeRate: 0.995,
  lensDirtSpawnSpread: 0.5,
  lensDirtMaxScale: 0.15,
  vignetteDarkness: 0.5,
  vignetteOffset: 1.25,
  vignetteColor: '#07070C',
};

// ── Presets ────────────────────────────────────────────────────────────────

export const mackerelPreset: CreaturePreset = {
  id: 'mackerel',
  name: 'Mackerel',
  spec: mackerelSpec,
  look: {
    bulb: {
      colorA: '#8DB8E8',
      colorB: '#1A3A5C',
      opacity: 0.9,
      patternScale0: 0.8,
      patternScale1: 0.6,
      rimBoost: 1.2,
    },
    gel: { color: '#A8CCF0', opacity: 0.2 },
    tail: { colorA: '#8DB8E8', colorB: '#1A3A5C', opacity: 0.85, scale: 1.0 },
    mouth: { colorA: '#8DB8E8', colorB: '#1A3A5C', opacity: 0.85, scale: 1.0 },
    tentacle: { color: '#8DB8E8', opacity: 0.0, area: 100 },
    post: { bloomStrength: 0.15, bloomRadius: 0.3, bloomThreshold: 0.7, ...defaultPost },
  } as Partial<LookConfig>,
};

export const angelfishPreset: CreaturePreset = {
  id: 'angelfish',
  name: 'Angelfish',
  spec: angelfishSpec,
  look: {
    bulb: {
      colorA: '#C0C0C0',
      colorB: '#2A2A4A',
      opacity: 0.9,
      patternScale0: 1.2,
      patternScale1: 0.8,
      rimBoost: 1.5,
    },
    gel: { color: '#D0D0E0', opacity: 0.15 },
    tail: { colorA: '#C0C0C0', colorB: '#2A2A4A', opacity: 0.85, scale: 1.0 },
    mouth: { colorA: '#C0C0C0', colorB: '#2A2A4A', opacity: 0.85, scale: 1.0 },
    tentacle: { color: '#C0C0C0', opacity: 0.0, area: 100 },
    post: { bloomStrength: 0.15, bloomRadius: 0.3, bloomThreshold: 0.7, ...defaultPost },
  } as Partial<LookConfig>,
};

// ── Clownfish ──────────────────────────────────────────────────────────────

const clownfishSpec: FishSpec = {
  id: 'clownfish',
  archetypeId: 'fish',
  bodyPlan: BodyPlan.Fish,

  vertebraCount: 28,
  bodyLength: 35,
  bodyWidth: 12,
  bodyDepth: 8,

  // Compact oval body: blunt head, rounded mid, quick taper.
  bodyProfile: {
    kind: 'polyline',
    points: [
      [0.0, 0.2],
      [0.05, 0.5],
      [0.15, 0.9],
      [0.35, 1.0],
      [0.55, 0.9],
      [0.75, 0.6],
      [0.9, 0.3],
      [1.0, 0.08],
    ],
  },

  fins: [
    { kind: 'dorsal', attachmentT: 0.25, span: 3, height: 2.5, length: 3, flutterSpeed: 0.7, flutterAmplitude: 0.2 },
    { kind: 'pectoral', attachmentT: 0.2, span: 2.5, height: 2, length: 1.5, flutterSpeed: 1.1, flutterAmplitude: 0.3 },
    { kind: 'anal', attachmentT: 0.55, span: 2, height: 1.8, length: 2, flutterSpeed: 0.7, flutterAmplitude: 0.2 },
    { kind: 'caudal', attachmentT: 1.0, span: 6, height: 5, length: 1, flutterSpeed: 0.5, flutterAmplitude: 0.15 },
  ],

  undulation: {
    amplitude: 2.0,
    frequency: 2.5,
    speed: 1.8,
    finFlutter: 1.0,
  },

  symmetry: { kind: 'bilateral', order: 2, breaking: 0.05 },
  crossSection: { kind: 'ellipse', xScale: 1.0, zScale: 0.6 },
  spine: { kind: 'none' },

  budget: { maxParticles: 2200 },
};

// ── Pufferfish ─────────────────────────────────────────────────────────────

const pufferSpec: FishSpec = {
  id: 'puffer',
  archetypeId: 'fish',
  bodyPlan: BodyPlan.Fish,

  vertebraCount: 20,
  bodyLength: 30,
  bodyWidth: 20,
  bodyDepth: 18,

  // Round bulbous body: nearly circular profile.
  bodyProfile: {
    kind: 'polyline',
    points: [
      [0.0, 0.15],
      [0.05, 0.55],
      [0.15, 0.9],
      [0.35, 1.0],
      [0.55, 1.0],
      [0.75, 0.8],
      [0.9, 0.4],
      [1.0, 0.08],
    ],
  },

  fins: [
    { kind: 'dorsal', attachmentT: 0.4, span: 4, height: 2, length: 2.5, flutterSpeed: 0.6, flutterAmplitude: 0.15 },
    { kind: 'pectoral', attachmentT: 0.3, span: 4, height: 3, length: 1.5, flutterSpeed: 1.0, flutterAmplitude: 0.2 },
    { kind: 'anal', attachmentT: 0.6, span: 3, height: 2, length: 2, flutterSpeed: 0.6, flutterAmplitude: 0.15 },
    { kind: 'caudal', attachmentT: 1.0, span: 5, height: 4, length: 1, flutterSpeed: 0.4, flutterAmplitude: 0.1 },
  ],

  undulation: {
    amplitude: 1.5,
    frequency: 1.8,
    speed: 1.2,
    finFlutter: 0.7,
  },

  symmetry: { kind: 'bilateral', order: 2, breaking: 0.06 },
  crossSection: { kind: 'ellipse', xScale: 1.0, zScale: 0.9 },
  spine: { kind: 'none' },

  budget: { maxParticles: 1800 },
};

// ── Neon Tetra ─────────────────────────────────────────────────────────────

const neonTetraSpec: FishSpec = {
  id: 'neonTetra',
  archetypeId: 'fish',
  bodyPlan: BodyPlan.Fish,

  vertebraCount: 30,
  bodyLength: 22,
  bodyWidth: 4,
  bodyDepth: 3,

  // Slim, streamlined: thin from head to tail.
  bodyProfile: {
    kind: 'polyline',
    points: [
      [0.0, 0.1],
      [0.05, 0.35],
      [0.15, 0.7],
      [0.35, 0.95],
      [0.55, 0.9],
      [0.75, 0.6],
      [0.9, 0.25],
      [1.0, 0.05],
    ],
  },

  fins: [
    { kind: 'dorsal', attachmentT: 0.35, span: 2, height: 1.5, length: 1.5, flutterSpeed: 0.9, flutterAmplitude: 0.25 },
    { kind: 'pectoral', attachmentT: 0.2, span: 1.5, height: 1.2, length: 1, flutterSpeed: 1.3, flutterAmplitude: 0.35 },
    { kind: 'anal', attachmentT: 0.55, span: 1.5, height: 1, length: 1.5, flutterSpeed: 0.9, flutterAmplitude: 0.25 },
    { kind: 'caudal', attachmentT: 1.0, span: 3.5, height: 2.5, length: 0.8, flutterSpeed: 0.6, flutterAmplitude: 0.2 },
  ],

  undulation: {
    amplitude: 2.5,
    frequency: 4.0,
    speed: 3.0,
    finFlutter: 1.5,
  },

  symmetry: { kind: 'bilateral', order: 2, breaking: 0.04 },
  crossSection: { kind: 'ellipse', xScale: 1.0, zScale: 0.5 },
  spine: { kind: 'none' },

  budget: { maxParticles: 1500 },
};

// ── Moorish Idol ──────────────────────────────────────────────────────────

const moorishIdolSpec: FishSpec = {
  id: 'moorishIdol',
  archetypeId: 'fish',
  bodyPlan: BodyPlan.Fish,

  vertebraCount: 28,
  bodyLength: 40,
  bodyWidth: 8,
  bodyDepth: 14,

  // Disc-like tall body with trailing fin.
  bodyProfile: {
    kind: 'polyline',
    points: [
      [0.0, 0.1],
      [0.05, 0.4],
      [0.15, 0.85],
      [0.35, 1.0],
      [0.55, 0.9],
      [0.75, 0.55],
      [0.9, 0.25],
      [1.0, 0.05],
    ],
  },

  fins: [
    { kind: 'dorsal', attachmentT: 0.2, span: 5, height: 10, length: 5, flutterSpeed: 0.5, flutterAmplitude: 0.12 },
    { kind: 'pectoral', attachmentT: 0.2, span: 2.5, height: 2, length: 1.5, flutterSpeed: 1.0, flutterAmplitude: 0.25 },
    { kind: 'anal', attachmentT: 0.5, span: 3, height: 3, length: 2.5, flutterSpeed: 0.6, flutterAmplitude: 0.15 },
    { kind: 'caudal', attachmentT: 1.0, span: 4, height: 3.5, length: 0.8, flutterSpeed: 0.4, flutterAmplitude: 0.1 },
  ],

  undulation: {
    amplitude: 1.8,
    frequency: 2.0,
    speed: 1.5,
    finFlutter: 0.9,
  },

  symmetry: { kind: 'bilateral', order: 2, breaking: 0.07 },
  crossSection: { kind: 'ellipse', xScale: 0.6, zScale: 1.0 },
  spine: { kind: 'none' },

  budget: { maxParticles: 2200 },
};

// ── Preset exports ─────────────────────────────────────────────────────────

export const clownfishPreset: CreaturePreset = {
  id: 'clownfish',
  name: 'Clownfish',
  spec: clownfishSpec,
  look: {
    bulb: {
      colorA: '#F57A2E',
      colorB: '#4A1A00',
      opacity: 0.9,
      patternScale0: 0.8,
      patternScale1: 1.2,
      rimBoost: 1.3,
    },
    gel: { color: '#FFB07A', opacity: 0.2 },
    tail: { colorA: '#F57A2E', colorB: '#4A1A00', opacity: 0.85, scale: 1.0 },
    mouth: { colorA: '#F57A2E', colorB: '#4A1A00', opacity: 0.85, scale: 1.0 },
    tentacle: { color: '#FFFFFF', opacity: 0.0, area: 100 },
    post: { bloomStrength: 0.15, bloomRadius: 0.3, bloomThreshold: 0.7, ...defaultPost },
  },
};

export const pufferPreset: CreaturePreset = {
  id: 'puffer',
  name: 'Pufferfish',
  spec: pufferSpec,
  look: {
    bulb: {
      colorA: '#C8B060',
      colorB: '#5A4A20',
      opacity: 0.95,
      patternScale0: 1.5,
      patternScale1: 0.8,
      rimBoost: 1.0,
    },
    gel: { color: '#E0D090', opacity: 0.15 },
    tail: { colorA: '#C8B060', colorB: '#5A4A20', opacity: 0.9, scale: 1.0 },
    mouth: { colorA: '#C8B060', colorB: '#5A4A20', opacity: 0.9, scale: 1.0 },
    tentacle: { color: '#C8B060', opacity: 0.0, area: 100 },
    post: { bloomStrength: 0.1, bloomRadius: 0.25, bloomThreshold: 0.75, ...defaultPost },
  },
};

export const neonTetraPreset: CreaturePreset = {
  id: 'neonTetra',
  name: 'Neon Tetra',
  spec: neonTetraSpec,
  look: {
    bulb: {
      colorA: '#40C0E0',
      colorB: '#003050',
      opacity: 0.85,
      patternScale0: 0.6,
      patternScale1: 1.4,
      rimBoost: 2.0,
    },
    gel: { color: '#80D8F0', opacity: 0.2 },
    tail: { colorA: '#40C0E0', colorB: '#003050', opacity: 0.8, scale: 0.8 },
    mouth: { colorA: '#40C0E0', colorB: '#003050', opacity: 0.8, scale: 0.8 },
    tentacle: { color: '#40C0E0', opacity: 0.0, area: 100 },
    post: { bloomStrength: 0.3, bloomRadius: 0.5, bloomThreshold: 0.5, ...defaultPost },
  },
};

export const moorishIdolPreset: CreaturePreset = {
  id: 'moorishIdol',
  name: 'Moorish Idol',
  spec: moorishIdolSpec,
  look: {
    bulb: {
      colorA: '#2A2A2A',
      colorB: '#0A0A0A',
      opacity: 0.9,
      patternScale0: 0.5,
      patternScale1: 0.5,
      rimBoost: 1.0,
    },
    gel: { color: '#505050', opacity: 0.15 },
    tail: { colorA: '#EEEEEE', colorB: '#2A2A2A', opacity: 0.85, scale: 1.2 },
    mouth: { colorA: '#EEEEEE', colorB: '#2A2A2A', opacity: 0.85, scale: 1.2 },
    tentacle: { color: '#CCCC40', opacity: 0.0, area: 100 },
    post: { bloomStrength: 0.15, bloomRadius: 0.3, bloomThreshold: 0.7, ...defaultPost },
  },
};

export const FISH_PRESETS: CreaturePreset[] = [
  mackerelPreset,
  angelfishPreset,
  clownfishPreset,
  pufferPreset,
  neonTetraPreset,
  moorishIdolPreset,
];
