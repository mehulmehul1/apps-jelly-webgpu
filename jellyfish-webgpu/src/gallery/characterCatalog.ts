/**
 * characterCatalog.ts
 *
 * The Character layer's form grammar — the seeded appendage recipes that hang
 * off the Vessel mold: tail, mouth arms, tentacles.
 *
 * Mental model: a body-part workshop. Each tile's seed draws a distinct
 * recipe — which body parts exist (features), how many, how long, what style —
 * so the 96-tile grid reads as 96 DIFFERENT full jellyfish once Character is
 * enabled, instead of one cloned template.
 *
 * Mirrors vesselCatalog.ts: sampleCharacterParams(seed, rng) is a pure seeded
 * draw; applyCharacterParams() projects params onto a spec fragment; tweak
 * overrides route through the same flat-map mechanism as the Vessel layer.
 */

import type { JellyfishSpec } from '../jellyfish/creatures';
import { DEFAULT_GEOMETRY_CONFIG } from '../jellyfish/creatures/CreatureSpec';

// ──────────────────────────────────────────
// Tweak descriptors (hero sliders)
// ──────────────────────────────────────────

export interface Tweak {
  /** Stable key, also used to locate the value in CharacterParams */
  key: string;
  label: string;
  min: number;
  max: number;
  step: number; // 1 => integer slider
  /** Optional formatting for the value readout */
  fmt?: (v: number) => string;
}

export function fmtPlain(v: number): string {
  return v.toFixed(2);
}

export function fmtInt(v: number): string {
  return String(Math.round(v));
}

// ──────────────────────────────────────────
// Body-part module grammar
// ──────────────────────────────────────────

/** The three appendage systems the Character layer can switch on/off. */
export type CharacterModule = 'tail' | 'mouth' | 'tentacles';

export interface CharacterModuleDef {
  id: CharacterModule;
  label: string;
  description: string;
  /** Whether the module's feature flag is enabled for this recipe. */
  active: (p: CharacterParams) => boolean;
  /** Per-module tweak keys this module owns. */
  tweakKeys: string[];
}

/** Named style variants per module (map to concrete param bundles). */
export interface StyleVariant {
  id: string;
  label: string;
  /** Tweak keys this variant controls (its module's slider set). */
  scope: string[];
  /** Applies variant to params (mutates the recipe's style fields). */
  apply: (params: CharacterParams) => void;
}

// ──────────────────────────────────────────
// Character params
// ──────────────────────────────────────────

export interface CharacterParams {
  /** Which appendage systems exist. */
  features: {
    tail: boolean;
    mouth: boolean;
    tentacles: boolean;
  };
  /** Tail / mouth-arm chain (shares tail-arm geometry fields). */
  tail: {
    length: number; // 0..2 — drives tailArmSegments + feature flag
    ribs: number; // tailRibsCount
    radiusFactor: number; // tailRibRadiusFactor
    linkOffset: number; // tailLinkOffset
  };
  /** Tentacles. */
  tentacles: {
    count: number; // band emitter groupCount (THE actual tentacle count)
    segments: number; // tentacleSegments
    segmentLength: number; // tentacleSegmentLength
    weight: number; // tentacleWeightFactor
    style: 'curtain' | 'tube'; // tentacleStyle
  };
  /** Mouth arms (reuses tail-arm fields, shorter + thicker). */
  mouth: {
    size: number; // 0..1 — feature flag + length scale
    armSegments: number;
    armLength: number;
    armWeight: number;
  };
}

/** Defaults = the current hardcoded template (backward-compatible baseline). */
export function defaultCharacterParams(): CharacterParams {
  return {
    features: { tail: true, mouth: true, tentacles: true },
    tail: {
      length: 1.0,
      ribs: 15,
      radiusFactor: DEFAULT_GEOMETRY_CONFIG.tailRibRadiusFactor,
      linkOffset: DEFAULT_GEOMETRY_CONFIG.tailLinkOffset,
    },
    tentacles: {
      count: 6,
      segments: 120,
      segmentLength: DEFAULT_GEOMETRY_CONFIG.tentacleSegmentLength,
      weight: DEFAULT_GEOMETRY_CONFIG.tentacleWeightFactor,
      style: 'curtain',
    },
    mouth: {
      size: 0.5,
      armSegments: 100,
      armLength: 1,
      armWeight: 0.5,
    },
  };
}

// ──────────────────────────────────────────
// Seeded sampling — one distinct recipe per tile
// ──────────────────────────────────────────

/**
 * Deterministically sample a full appendage recipe for (seed, orderId).
 * Pure function of the seeded rng — same inputs, same recipe.
 *
 * Every draw flows through `rng` in a fixed order so the recipe is stable.
 * Ranges are bounded to keep the grid's worst-case appendage particle count
 * reasonable (tentacle groups × segments × 96 tiles).
 */
export function sampleCharacterParams(rng: () => number): CharacterParams {
  const p = defaultCharacterParams();

  // Which body parts exist. Weighted so single-part and paired creatures are
  // common, full trios slightly rarer, and bare (no appendage) creatures
  // occasionally appear for contrast against Character ON.
  const roll = rng();
  if (roll < 0.08) {
    p.features = { tail: false, mouth: false, tentacles: false };
  } else if (roll < 0.25) {
    // Single part
    const which = Math.floor(rng() * 3);
    p.features = {
      tail: which === 0,
      mouth: which === 1,
      tentacles: which === 2,
    };
  } else if (roll < 0.55) {
    // Two parts
    const skip = Math.floor(rng() * 3);
    p.features = {
      tail: skip !== 0,
      mouth: skip !== 1,
      tentacles: skip !== 2,
    };
  }
  // else: all three (default true)

  // Tail / mouth-arm chain
  p.tail.length = 0.4 + rng() * 1.3; // 0.4..1.7
  p.tail.ribs = 4 + Math.floor(rng() * 22); // 4..25
  p.tail.radiusFactor = 12 + rng() * 24; // 12..36
  p.tail.linkOffset = 1 + rng() * 2; // 1..3

  // Mouth arms — scale with mouth size; when mouth is off, size is moot but
  // still sampled so the value readout is stable across tiles.
  p.mouth.size = 0.15 + rng() * 0.8; // 0.15..0.95
  p.mouth.armSegments = 40 + Math.floor(rng() * 100); // 40..139
  p.mouth.armLength = 0.6 + rng() * 1.4; // 0.6..2.0
  p.mouth.armWeight = 0.35 + rng() * 0.9; // 0.35..1.25

  // Tentacles
  p.tentacles.count = 1 + Math.floor(rng() * 9); // 1..9
  p.tentacles.segments = 40 + Math.floor(rng() * 120); // 40..159
  p.tentacles.segmentLength = 1.0 + rng() * 1.2; // 1.0..2.2
  p.tentacles.weight = 0.8 + rng() * 1.0; // 0.8..1.8
  p.tentacles.style = rng() < 0.7 ? 'curtain' : 'tube';

  return p;
}

// ──────────────────────────────────────────
// Params → spec fragment (pure)
// ──────────────────────────────────────────

/**
 * Project character params onto a JellyfishSpec fragment. Merges onto the
 * caller's spec (which is the Vessel layer's output — pure mold).
 */
export function applyCharacterParams(
  base: JellyfishSpec,
  params: CharacterParams,
): JellyfishSpec {
  const spec: JellyfishSpec = structuredClone(base);

  spec.features = { ...params.features };

  const cfg = { ...(spec.geometry ?? {}) };
  cfg.tailArmSegments = Math.max(
    10,
    Math.round(DEFAULT_GEOMETRY_CONFIG.tailArmSegments * params.tail.length),
  );
  // IMPORTANT: only count tail ribs when the tail feature is actually on. If a
  // tail-less creature still reports tailRibsCount > 0, the tentacle emitter
  // resolves attach ribs that index past the bulb-rib pool, ribAt() returns
  // undefined, and JellyfishGeometry.create throws — dropping tiles mid-grid.
  cfg.tailRibsCount = params.features.tail
    ? Math.max(0, Math.round(params.tail.ribs))
    : 0;
  cfg.tailRibRadiusFactor = params.tail.radiusFactor;
  cfg.tailLinkOffset = params.tail.linkOffset;

  cfg.tentacleSegments = Math.max(20, Math.round(params.tentacles.segments));
  cfg.tentacleSegmentLength = params.tentacles.segmentLength;
  cfg.tentacleWeightFactor = params.tentacles.weight;
  spec.geometry = cfg;

  // Mouth arms reuse tail-arm fields but shorter/thicker.
  if (params.features.mouth) {
    spec.geometry = {
      ...(spec.geometry ?? {}),
      tailArmSegments: Math.max(
        10,
        Math.round(params.mouth.armSegments * (0.5 + params.mouth.size * 0.5)),
      ),
      tailArmSegmentLength: params.mouth.armLength,
      tailArmWeight: params.mouth.armWeight,
    };
  }

  spec.tentacleStyle = params.tentacles.style;

  // Emitters: tentacleCount → band emitter groupCount (the actual tentacle
  // count control, resolved against real ribCount at geometry build time).
  if (params.features.tentacles && params.tentacles.count > 0) {
    spec.emitters = {
      tentacles: {
        kind: 'band',
        groupCount: params.tentacles.count,
        ribRange: [0, 18],
        jitter: 1,
      },
    };
  } else {
    spec.emitters = { tentacles: { kind: 'explicit', ribs: [] } };
  }

  return spec;
}

// ──────────────────────────────────────────
// Tweak routing
// ──────────────────────────────────────────

/** All Character tweak keys (mirrors the slider descriptor list). */
export const CHARACTER_TWEAKS: Tweak[] = [
  { key: 'tailLength', label: 'tail length', min: 0, max: 2, step: 0.05, fmt: fmtPlain },
  { key: 'tailRibs', label: 'tail ribs', min: 0, max: 30, step: 1, fmt: fmtInt },
  { key: 'tailRadius', label: 'tail radius', min: 0, max: 40, step: 1, fmt: fmtInt },
  { key: 'tailLink', label: 'link offset', min: 0, max: 5, step: 0.1, fmt: fmtPlain },
  { key: 'tentacleCount', label: 'tentacles', min: 0, max: 16, step: 1, fmt: fmtInt },
  { key: 'tentacleSegments', label: 'tentacle detail', min: 20, max: 200, step: 10, fmt: fmtInt },
  { key: 'tentacleWeight', label: 'tentacle weight', min: 0.5, max: 2.5, step: 0.05, fmt: fmtPlain },
  { key: 'tentacleStyle', label: 'tentacle style', min: 0, max: 1, step: 1, fmt: fmtInt },
  { key: 'mouthSize', label: 'mouth size', min: 0, max: 1, step: 0.05, fmt: fmtPlain },
  { key: 'mouthArmLength', label: 'arm length', min: 0.4, max: 2.5, step: 0.05, fmt: fmtPlain },
  { key: 'mouthArmWeight', label: 'arm weight', min: 0.2, max: 1.5, step: 0.05, fmt: fmtPlain },
];

/**
 * Workshop module groupings — the hero panel renders Character sliders in
 * these groups (Tail / Tentacles / Mouth) instead of one flat list.
 */
export const CHARACTER_MODULES: CharacterModuleDef[] = [
  {
    id: 'tail',
    label: 'Tail',
    description: 'Long segmented arm hanging off the bell.',
    active: (p) => p.features.tail,
    tweakKeys: ['tailLength', 'tailRibs', 'tailRadius', 'tailLink'],
  },
  {
    id: 'tentacles',
    label: 'Tentacles',
    description: 'Fringe below the bell — curtain or band.',
    active: (p) => p.features.tentacles,
    tweakKeys: ['tentacleCount', 'tentacleSegments', 'tentacleWeight', 'tentacleStyle'],
  },
  {
    id: 'mouth',
    label: 'Mouth',
    description: 'Short frilly arms under the bell.',
    active: (p) => p.features.mouth,
    tweakKeys: ['mouthSize', 'mouthArmLength', 'mouthArmWeight'],
  },
];

/**
 * Read the current numeric value of every Character tweak key from params.
 * Used to seed the hero sliders after sampling.
 */
export function readCharacterValues(params: CharacterParams): Record<string, number> {
  return {
    tailLength: params.tail.length,
    tailRibs: params.tail.ribs,
    tailRadius: params.tail.radiusFactor,
    tailLink: params.tail.linkOffset,
    tentacleCount: params.tentacles.count,
    tentacleSegments: params.tentacles.segments,
    tentacleWeight: params.tentacles.weight,
    tentacleStyle: params.tentacles.style === 'tube' ? 1 : 0,
    mouthSize: params.mouth.size,
    mouthArmLength: params.mouth.armLength,
    mouthArmWeight: params.mouth.armWeight,
  };
}

/**
 * Route tweak overrides onto params (hero sliders). Each key owns a write
 * path; feature flags derive from the tuned values, same as the template.
 */
export function applyCharacterTweaks(
  tweaks: Record<string, number>,
  params: CharacterParams,
): void {
  if (tweaks.tailLength !== undefined) {
    params.tail.length = tweaks.tailLength;
    params.features.tail = params.tail.length > 0.1;
  }
  if (tweaks.tailRibs !== undefined) {
    params.tail.ribs = Math.round(tweaks.tailRibs);
  }
  if (tweaks.tailRadius !== undefined) {
    params.tail.radiusFactor = tweaks.tailRadius;
  }
  if (tweaks.tailLink !== undefined) {
    params.tail.linkOffset = tweaks.tailLink;
  }
  if (tweaks.tentacleCount !== undefined) {
    params.tentacles.count = Math.round(tweaks.tentacleCount);
    params.features.tentacles = params.tentacles.count > 0;
  }
  if (tweaks.tentacleSegments !== undefined) {
    params.tentacles.segments = Math.round(tweaks.tentacleSegments);
  }
  if (tweaks.tentacleWeight !== undefined) {
    params.tentacles.weight = tweaks.tentacleWeight;
  }
  if (tweaks.mouthSize !== undefined) {
    params.mouth.size = tweaks.mouthSize;
    params.features.mouth = params.mouth.size > 0.1;
  }
  if (tweaks.mouthArmLength !== undefined) {
    params.mouth.armLength = tweaks.mouthArmLength;
  }
  if (tweaks.mouthArmWeight !== undefined) {
    params.mouth.armWeight = tweaks.mouthArmWeight;
  }
  if (tweaks.tentacleStyle !== undefined) {
    params.tentacles.style = tweaks.tentacleStyle > 0.5 ? 'tube' : 'curtain';
  }
}

/**
 * Bridge a style variant to hero tweak values. Computes the variant's param
 * bundle from the canonical baseline and returns only the tweak keys the
 * variant's module scopes — so clicking a preset leaves the other modules'
 * slider positions untouched.
 */
export function variantToTweaks(variant: StyleVariant): Record<string, number> {
  const params = defaultCharacterParams();
  variant.apply(params);
  const all = readCharacterValues(params);
  const out: Record<string, number> = {};
  for (const key of variant.scope) {
    if (all[key] !== undefined) out[key] = all[key];
  }
  return out;
}

/** Style variants for the workshop (Option 2). */
export const CHARACTER_STYLE_VARIANTS: StyleVariant[] = [
  {
    id: 'tail-solid',
    label: 'Tail · solid',
    scope: ['tailLength', 'tailRibs', 'tailRadius', 'tailLink'],
    apply: (p) => {
      p.tail.length = 1.0;
      p.tail.ribs = 18;
      p.tail.radiusFactor = 16;
      p.tail.linkOffset = 2;
    },
  },
  {
    id: 'tail-segmented',
    label: 'Tail · segmented',
    scope: ['tailLength', 'tailRibs', 'tailRadius', 'tailLink'],
    apply: (p) => {
      p.tail.length = 1.4;
      p.tail.ribs = 26;
      p.tail.radiusFactor = 12;
      p.tail.linkOffset = 1;
    },
  },
  {
    id: 'tent-curtain',
    label: 'Tentacles · curtain',
    scope: ['tentacleCount', 'tentacleSegments', 'tentacleWeight', 'tentacleStyle'],
    apply: (p) => {
      p.tentacles.style = 'curtain';
      p.tentacles.count = 6;
      p.tentacles.segments = 120;
    },
  },
  {
    id: 'tent-band',
    label: 'Tentacles · band',
    scope: ['tentacleCount', 'tentacleSegments', 'tentacleWeight', 'tentacleStyle'],
    apply: (p) => {
      p.tentacles.style = 'tube';
      p.tentacles.count = 10;
      p.tentacles.segments = 90;
      p.tentacles.weight = 1.3;
    },
  },
  {
    id: 'mouth-short',
    label: 'Mouth · short frills',
    scope: ['mouthSize', 'mouthArmLength', 'mouthArmWeight'],
    apply: (p) => {
      p.mouth.size = 0.6;
      p.mouth.armLength = 0.8;
      p.mouth.armWeight = 0.7;
    },
  },
  {
    id: 'mouth-flowing',
    label: 'Mouth · flowing',
    scope: ['mouthSize', 'mouthArmLength', 'mouthArmWeight'],
    apply: (p) => {
      p.mouth.size = 0.9;
      p.mouth.armLength = 1.8;
      p.mouth.armWeight = 0.4;
    },
  },
];
