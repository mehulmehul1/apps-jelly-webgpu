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
 *
 * Only the Vessel layer is implemented today. The others exist as stubs so
 * the UI chrome (layer bar) is already wired and future layers slot in
 * without touching the gallery shell.
 */

import type { JellyfishSpec } from '../jellyfish/creatures';

/** Runtime spec input/output for one layer. */
export interface LayerIO {
  spec: JellyfishSpec;
  seed: string;
  rng: () => number;
}

/** A form-grammar layer. `build` must be a pure function of (io, params). */
export interface FormLayer {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  build(io: LayerIO): JellyfishSpec;
}

// ── Vessel layer (implemented) ─────────────────────────────────────────
// The Vessel layer is realized by vesselSampler.ts + vesselCatalog.ts; the
// gallery's grid IS the vessel layer sampling its full parameter space.
export const VESSEL_LAYER: FormLayer = {
  id: 'vessel',
  label: 'Vessel',
  description: 'The blank mold — silhouette, cross-section, surface.',
  enabled: true,
  build(io: LayerIO): JellyfishSpec {
    // Pure vessels are built by the sampler; this identity pass keeps the
    // layer interface uniform for downstream layers.
    return io.spec;
  },
};

// ── Stubs (future layers) ──────────────────────────────────────────────

export const CHARACTER_LAYER: FormLayer = {
  id: 'character',
  label: 'Character',
  description: 'Body parts — mouth arms, tail, tentacles.',
  enabled: false,
  build(io: LayerIO): JellyfishSpec {
    return io.spec;
  },
};

export const COSTUME_LAYER: FormLayer = {
  id: 'costume',
  label: 'Costume',
  description: 'Dressing — emitters, look, tentacle style.',
  enabled: false,
  build(io: LayerIO): JellyfishSpec {
    return io.spec;
  },
};

export const GESTURE_LAYER: FormLayer = {
  id: 'gesture',
  label: 'Gesture',
  description: 'Life — spine curve, colony layout, pulse, drift.',
  enabled: false,
  build(io: LayerIO): JellyfishSpec {
    return io.spec;
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
 * Apply every enabled layer to a base spec, in order. Today this is a
 * no-op passthrough for the pure vessel (the sampler already produced the
 * final spec); it exists so the moment a stub flips to enabled, the gallery
 * shell starts composing without restructuring.
 */
export function applyLayers(base: JellyfishSpec, io: LayerIO): JellyfishSpec {
  let spec = base;
  for (const layer of FORM_LAYERS) {
    if (layer.enabled) {
      spec = layer.build({ ...io, spec });
    }
  }
  return spec;
}
