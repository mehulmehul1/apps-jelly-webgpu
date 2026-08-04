/**
 * layers.ts
 *
 * The extendible layer-stack skeleton for the gallery.
 *
 * Concept (sculptor's shelf):
 *   Vessel    — the blank mold (profile, cross-section, surface)          [ACTIVE]
 *   Character — body parts added to the mold (mouth arms, tail, tentacles)
 *   Costume   — surface dressing (emitters, look/color, tentacle style)
 *   Gesture   — life (spine curve, colony layout, pulse motion, drift)
 *
 * Each layer owns a slice of the JellyfishSpec. The gallery applies layers
 * in order, Vessel first, so later layers see the earlier ones' output.
 */

import type { JellyfishSpec } from '../jellyfish/creatures';
import type { LookConfig } from '../editor/look-presets';
import {
  sampleCharacterParams,
  applyCharacterParams,
  applyCharacterTweaks,
  CHARACTER_TWEAKS,
} from './characterCatalog';

/** Runtime spec input/output for one layer. */
export interface LayerIO {
  spec: JellyfishSpec;
  seed: string;
  rng: () => number;
  /** Layer-specific tweak values from the hero panel. */
  tweaks: Record<string, number>;
}

/** A form-grammar layer. `build` must be a pure function of (io, params). */
export interface FormLayer {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  tweaks: Tweak[];
  /**
   * Spec field paths (dot-notation) this layer is the sole authority for.
   * `applyLayers()` throws on conflict when two ENABLED non-base layers
   * claim the same field. Keeps the layer stack a true composable grammar.
   */
  owns: string[];
  /**
   * Base layers run first and are excluded from conflict enforcement — they
   * may set baseline values (e.g. Vessel zeroes tentacles) that modulatory
   * layers intentionally override.
   */
  isBase?: boolean;
  build(io: LayerIO): JellyfishSpec;
}

/** A tweak slider descriptor for the hero panel. */
export interface Tweak {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  fmt?: (v: number) => string;
}

function fmtInt(v: number): string {
  return String(Math.round(v));
}

function fmtPlain(v: number): string {
  return v.toFixed(2);
}

// ── Vessel layer (implemented) ─────────────────────────────────
// The Vessel layer is realized by vesselSampler.ts + vesselCatalog.ts;
// the gallery's grid IS the vessel layer sampling its full parameter space.
export const VESSEL_LAYER: FormLayer = {
  id: 'vessel',
  label: 'Vessel',
  description: 'The blank mold — silhouette, cross-section, surface.',
  enabled: true,
  tweaks: [],
  // The base layer: owns the bell's shape + the "pure vessel" reset. It is
  // realized by vesselSampler.ts before applyLayers() runs; this identity
  // pass keeps the layer interface uniform for downstream layers.
  isBase: true,
  owns: [
    'profiles.bulb',
    'crossSection',
    'surface.ridges',
    'surface.frill',
    'lobes',
    'symmetry',
    'topology',
    'geometry.size',
    'geometry.ribsCount',
    'geometry.ribRadius',
    'geometry.totalSegments',
    'geometry.segmentsCount',
  ],
  build(io: LayerIO): JellyfishSpec {
    // Pure vessels are built by the sampler; this identity pass keeps the
    // layer interface uniform for downstream layers.
    return io.spec;
  },
};

// ── Character layer ────────────────────────────────────────────
// Enables tail, mouth, and tentacles on the vessel spec.
// Deterministic: uses the seeded RNG so the same seed always
// produces the same character features.
// Rendering is ported from JellyfishArchetype.buildMeshes()
// into VesselScene.buildVesselGroup().
export const CHARACTER_LAYER: FormLayer = {
  id: 'character',
  label: 'Character',
  description: 'Body parts — mouth arms, tail, tentacles.',
  enabled: false,
  tweaks: CHARACTER_TWEAKS,
  owns: [
    'features.tail',
    'features.mouth',
    'features.tentacles',
    'geometry.tentacleSegments',
    'geometry.tentacleSegmentLength',
    'geometry.tentacleWeightFactor',
    'geometry.tailRibsCount',
    'geometry.tailRibRadiusFactor',
    'geometry.tailArmSegments',
    'geometry.tailArmSegmentLength',
    'geometry.tailArmWeight',
    'tentacleStyle',
    'emitters.tentacles',
    'profiles.tail',
  ],
  build(io: LayerIO): JellyfishSpec {
    // 1. Sample a seeded recipe per tile (deterministic: same seed → same recipe).
    const params = sampleCharacterParams(io.rng);

    // 2. Hero tweak overrides (slider values from the hero panel).
    if (io.tweaks && Object.keys(io.tweaks).length > 0) {
      applyCharacterTweaks(io.tweaks, params);
    }

    // 3. Project onto spec.
    return applyCharacterParams(io.spec, params);
  },
};

// ── Costume layer ──────────────────────────────────────────────
// Applies surface dressing: look/color only. (Tentacle style and
// emitters live in Character — this layer owns the color/material.)
export const COSTUME_LAYER: FormLayer = {
  id: 'costume',
  label: 'Costume',
  description: 'Dressing — look/color.',
  enabled: false,
  tweaks: [
    { key: 'hue', label: 'hue', min: 0, max: 360, step: 1, fmt: (v) => `${Math.round(v)}°` },
    { key: 'sat', label: 'saturation', min: 30, max: 90, step: 1, fmt: (v) => `${Math.round(v)}%` },
  ],
  owns: ['look'],
  build(io: LayerIO): JellyfishSpec {
    const spec = { ...io.spec };
    const t = io.tweaks;
    const rng = io.rng;

    // Look/color override — use valid LookConfig partial fields
    const hue = t.hue ?? rng() * 360;
    const sat = t.sat ?? 60;
    spec.look = {
      bulb: {
        colorA: `hsl(${hue}, ${sat}%, 60%)`,
        colorB: `hsl(${(hue + 30) % 360}, ${sat - 10}%, 40%)`,
        rimBoost: t.rimBoost ?? 0.3 + rng() * 0.4,
      },
      tail: {
        colorA: `hsl(${(hue + 180) % 360}, ${sat}%, 55%)`,
        colorB: `hsl(${(hue + 210) % 360}, ${sat - 10}%, 35%)`,
      },
      tentacle: {
        color: `hsl(${hue}, ${sat - 20}%, 50%)`,
      },
    } as Partial<LookConfig>;

    return spec;
  },
};

// ── Gesture layer ──────────────────────────────────────
// Adds life: spine curve, colony layout, pulse motion, drift.
// Deterministic: uses the seeded RNG so the same seed always
// produces the same gesture choices.
export const GESTURE_LAYER: FormLayer = {
  id: 'gesture',
  label: 'Gesture',
  description: 'Life — spine curve, colony layout, pulse, drift.',
  enabled: false,
  tweaks: [
    { key: 'spineCurve', label: 'spine curve', min: 0, max: 1, step: 0.05, fmt: fmtPlain },
    { key: 'spineFreq', label: 'spine frequency', min: 0.5, max: 3, step: 0.1, fmt: fmtPlain },
    { key: 'colonyCount', label: 'colony count', min: 1, max: 12, step: 1, fmt: fmtInt },
    { key: 'colonySpacing', label: 'colony spacing', min: 1, max: 5, step: 0.1, fmt: fmtPlain },
    { key: 'colonyScaleDecay', label: 'colony decay', min: 0.7, max: 1, step: 0.01, fmt: fmtPlain },
  ],
  owns: ['spine', 'colony'],
  build(io: LayerIO): JellyfishSpec {
    const spec = { ...io.spec };
    const t = io.tweaks;
    const rng = io.rng;

    // Spine curve — use valid SpineCurve type
    const spineCurve = t.spineCurve ?? rng() * 0.5;
    if (spineCurve > 0.05) {
      spec.spine = {
        kind: 'sine',
        ampX: spineCurve * 2,
        ampZ: spineCurve * 2,
        freq: t.spineFreq ?? 1 + rng() * 2,
        phase: rng() * Math.PI * 2,
      };
    }

    // Colony layout
    const colonyCount = Math.round(t.colonyCount ?? Math.floor(rng() * 12) + 1);
    if (colonyCount > 1) {
      spec.colony = {
        count: colonyCount,
        spacing: t.colonySpacing ?? 1.5 + rng() * 2,
        scaleDecay: t.colonyScaleDecay ?? 0.7 + rng() * 0.3,
        layout: (['chain', 'arc', 'helix', 'cluster', 'sheet'] as const)[
          Math.floor(rng() * 5)
        ],
      };
    }

    return spec;
  },
};

/** All layers in application order. */
export const FORM_LAYERS: FormLayer[] = [
  VESSEL_LAYER,
  CHARACTER_LAYER,
  COSTUME_LAYER,
  GESTURE_LAYER,
];

/**
 * Detect spec-field ownership conflicts among ENABLED non-base layers.
 * Returns one entry per field claimed by 2+ enabled layers.
 */
export function enabledLayerConflicts(): Array<{ field: string; layers: string[] }> {
  const claims = new Map<string, string[]>();
  for (const layer of FORM_LAYERS) {
    if (!layer.enabled || layer.isBase) continue;
    for (const field of layer.owns) {
      const list = claims.get(field) ?? [];
      list.push(layer.id);
      claims.set(field, list);
    }
  }
  return [...claims.entries()]
    .filter(([, layers]) => layers.length > 1)
    .map(([field, layers]) => ({ field, layers }));
}

/**
 * Apply every enabled layer to a base spec, in order.
 * Throws on ownership conflicts so a composable layer stack can't silently
 * produce conflicting output (e.g. two layers both writing tentacleStyle).
 */
export function applyLayers(base: JellyfishSpec, io: LayerIO): JellyfishSpec {
  const conflicts = enabledLayerConflicts();
  if (conflicts.length > 0) {
    const detail = conflicts.map((c) => `  ${c.field} ← ${c.layers.join(' + ')}`).join('\n');
    throw new Error(`Layer field-ownership conflict:\n${detail}`);
  }

  let spec = base;
  for (const layer of FORM_LAYERS) {
    if (layer.enabled) {
      spec = layer.build({ ...io, spec });
    }
  }
  return spec;
}
