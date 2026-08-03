/**
 * vesselCatalog.ts
 *
 * The Vessel layer's form grammar — the exhaustive set of distinct bell molds.
 *
 * Mental model: a sculptor's shelf of blank vases. Three axes define the blank:
 *
 *   1. ORDER   — the silhouette family (which radius profile the bell follows)
 *   2. SECTION — the cross-section mold (how the rim/lattice is shaped radially)
 *   3. SURFACE — surface treatment (ridges, frill, lobes) applied on top
 *
 * Each order family carries "tweaks": the specific levers a sculptor would turn
 * to push that family through its range. Tweaks are layer-owned, seed-seeded,
 * and drive pure data (spec fragments) — no renderer knowledge here.
 */

import type { RadiusProfileCurve } from '../jellyfish/creatures';

// ──────────────────────────────────────────
// Tweak descriptors (hero sliders)
// ──────────────────────────────────────────

export interface Tweak {
  /** Stable key, also used to locate the value in VesselParams */
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
// Order families (silhouette)
// ──────────────────────────────────────────

export interface OrderFamily {
  id: string;
  label: string;
  /** Sculptor-language description shown in the hero */
  description: string;
  /** Seeded profile sample for this family */
  sampleProfile: (rng: () => number) => RadiusProfileCurve;
  /** Hero sliders for this family */
  tweaks: Tweak[];
}

export const ORDER_FAMILIES: OrderFamily[] = [
  {
    id: 'medusa',
    label: 'Medusa',
    description: 'The classic bell — rounded crown, wide flare, open mouth.',
    sampleProfile: () => ({ kind: 'legacy_bell' }),
    tweaks: [],
  },
  {
    id: 'teardrop',
    label: 'Teardrop',
    description: 'A pulled teardrop — narrow crown, heavy rounded lower body.',
    sampleProfile: () => ({ kind: 'legacy_tail' }),
    tweaks: [],
  },
  {
    id: 'mold',
    label: 'Custom Mold',
    description: 'A freeform polyline mold — draw the silhouette with points, the seed sculpts the breaks.',
    sampleProfile: (rng) => {
      const n = 4 + Math.floor(rng() * 3); // 4-6 control points
      const pts: Array<[number, number]> = [];
      // Keep a soft bell bias so results stay "vessel-like", not noise.
      const crown = 0.12 + rng() * 0.18;
      const flare = 0.55 + rng() * 0.4;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const bell = Math.sin(Math.PI * Math.pow(t, 0.9 + rng() * 0.4));
        const v = crown + (flare - crown) * bell + (rng() - 0.5) * 0.18;
        pts.push([t, Math.max(0.06, Math.min(1, v))]);
      }
      return { kind: 'polyline', points: pts };
    },
    tweaks: [
      { key: 'moldCrown', label: 'crown', min: 0.05, max: 0.45, step: 0.01, fmt: fmtPlain },
      { key: 'moldFlare', label: 'flare', min: 0.3, max: 1.0, step: 0.01, fmt: fmtPlain },
      { key: 'moldJitter', label: 'jitter', min: 0, max: 0.35, step: 0.01, fmt: fmtPlain },
    ],
  },
  {
    id: 'cone',
    label: 'Cone',
    description: 'Convex cone — steep, tapering, minimal skirt.',
    sampleProfile: (rng) => ({
      kind: 'power',
      exponent: 0.35 + rng() * 0.6,
      min: 0.0,
      max: 1.0,
    }),
    tweaks: [
      { key: 'coneExponent', label: 'steepness', min: 0.25, max: 0.95, step: 0.01, fmt: fmtPlain },
    ],
  },
  {
    id: 'parasol',
    label: 'Parasol',
    description: 'Concave parasol — tall dome that balloons then flares wide.',
    sampleProfile: (rng) => ({
      kind: 'power',
      exponent: 1.3 + rng() * 2.0,
      min: 0.0,
      max: 1.0,
    }),
    tweaks: [
      { key: 'parasolExponent', label: 'balloon', min: 1.05, max: 4.0, step: 0.05, fmt: fmtPlain },
    ],
  },
  {
    id: 'spiral',
    label: 'Spiral Helm',
    description: 'Logarithmic spiral helm — a horn that winds outward as it drops.',
    sampleProfile: (rng) => ({
      kind: 'log_spiral',
      a: 0.4 + rng() * 0.8,
      b: 0.6 + rng() * 1.6,
      min: 0.0,
      max: 1.0,
    }),
    tweaks: [
      { key: 'spiralA', label: 'start', min: 0.2, max: 1.5, step: 0.05, fmt: fmtPlain },
      { key: 'spiralB', label: 'wind', min: 0.2, max: 3.0, step: 0.05, fmt: fmtPlain },
    ],
  },
  {
    id: 'egg',
    label: 'Egg',
    description: 'Vesica lens — a full egg/lemon, pinched at top and bottom.',
    sampleProfile: (rng) => ({
      kind: 'vesica',
      min: 0.0,
      max: 1.0,
      power: 0.7 + rng() * 1.6,
    }),
    tweaks: [
      { key: 'eggPower', label: 'fullness', min: 0.5, max: 2.6, step: 0.05, fmt: fmtPlain },
    ],
  },
  {
    id: 'lantern',
    label: 'Lantern',
    description: 'Constant lantern — a straight-sided cylinder of uniform girth.',
    sampleProfile: (rng) => ({
      kind: 'constant',
      value: 0.35 + rng() * 0.45,
    }),
    tweaks: [
      { key: 'lanternValue', label: 'girth', min: 0.2, max: 0.9, step: 0.01, fmt: fmtPlain },
    ],
  },
];

// ──────────────────────────────────────────
// Section families (cross-section)
// ──────────────────────────────────────────

export type SectionKind = 'circle' | 'ellipse' | 'superformula';

export interface SectionFamily {
  id: SectionKind;
  label: string;
  description: string;
  tweaks: Tweak[];
}

export const SECTION_FAMILIES: SectionFamily[] = [
  {
    id: 'circle',
    label: 'Round',
    description: 'Pure circular cross-section — the default vessel mouth.',
    tweaks: [],
  },
  {
    id: 'ellipse',
    label: 'Ellipse',
    description: 'Ribbon/oval mold — squash the tube into a flat band.',
    tweaks: [
      { key: 'ellipseX', label: 'x scale', min: 0.2, max: 2.6, step: 0.05, fmt: fmtPlain },
      { key: 'ellipseZ', label: 'z scale', min: 0.2, max: 2.6, step: 0.05, fmt: fmtPlain },
    ],
  },
  {
    id: 'superformula',
    label: 'Star',
    description: 'Superformula mold (Gielis) — star, gear, petal cross-sections.',
    tweaks: [
      { key: 'sfM', label: 'lobes', min: 0, max: 12, step: 1, fmt: fmtInt },
      { key: 'sfN1', label: 'n1', min: 0.1, max: 2.5, step: 0.05, fmt: fmtPlain },
      { key: 'sfN2', label: 'n2', min: 0.1, max: 4.0, step: 0.05, fmt: fmtPlain },
      { key: 'sfN3', label: 'n3', min: 0.1, max: 4.0, step: 0.05, fmt: fmtPlain },
    ],
  },
];

// ──────────────────────────────────────────
// Surface treatments
// ──────────────────────────────────────────

export type SurfaceKind = 'plain' | 'ridges' | 'frill' | 'lobes';

export interface SurfaceTreatment {
  id: SurfaceKind;
  label: string;
  description: string;
  tweaks: Tweak[];
}

export const SURFACE_TREATMENTS: SurfaceTreatment[] = [
  {
    id: 'plain',
    label: 'Plain',
    description: 'Clean mold, no surface modulation.',
    tweaks: [],
  },
  {
    id: 'ridges',
    label: 'Ridges',
    description: 'Longitudinal comb rows down the body.',
    tweaks: [
      { key: 'ridgeCount', label: 'rows', min: 3, max: 24, step: 1, fmt: fmtInt },
      { key: 'ridgeAmp', label: 'depth', min: 0.02, max: 0.5, step: 0.01, fmt: fmtPlain },
    ],
  },
  {
    id: 'frill',
    label: 'Frill',
    description: 'Rim ruffles — a fluted collar around the bell edge.',
    tweaks: [
      { key: 'frillAmp', label: 'amplitude', min: 0.02, max: 0.6, step: 0.01, fmt: fmtPlain },
      { key: 'frillFreq', label: 'frequency', min: 2, max: 40, step: 1, fmt: fmtInt },
    ],
  },
  {
    id: 'lobes',
    label: 'Lobes',
    description: 'Radial lobes — scalloped segments ringing the body.',
    tweaks: [
      { key: 'lobeCount', label: 'lobes', min: 3, max: 16, step: 1, fmt: fmtInt },
      { key: 'lobeAmp', label: 'depth', min: 0.02, max: 0.5, step: 0.01, fmt: fmtPlain },
      { key: 'lobeScale', label: 'radius scale', min: 0.5, max: 2.5, step: 0.05, fmt: fmtPlain },
    ],
  },
];

// ──────────────────────────────────────────
// Seeded param sampling for each axis
// ──────────────────────────────────────────

export interface VesselParams {
  profile: RadiusProfileCurve;
  sectionKind: SectionKind;
  section: {
    rotation: number;
    twist: number;
    xScale: number;
    zScale: number;
    sf: { m: number; n1: number; n2: number; n3: number };
  };
  surface: {
    ridges?: { count: number; amplitude: number };
    frill?: { amplitude: number; frequency: number };
    lobes?: { count: number; amplitude: number; radiusScale?: number };
  };
  symmetryOrder: number;
}

/**
 * Deterministically sample the full vessel parameter space for a given
 * (order, section, surface) triple. Pure function of (seed, ids) — the same
 * inputs always produce the same params.
 */
export function sampleVesselParams(
  seed: string,
  orderId: string,
  sectionId: SectionKind,
  surfaceId: SurfaceKind,
  rng: () => number,
): VesselParams {
  const order = ORDER_FAMILIES.find((o) => o.id === orderId) ?? ORDER_FAMILIES[0];

  const params: VesselParams = {
    profile: order.sampleProfile(rng),
    sectionKind: sectionId,
    section: {
      rotation: (rng() - 0.5) * 0.6,
      twist: (rng() - 0.5) * 0.4,
      xScale: 1,
      zScale: 1,
      sf: { m: 0, n1: 0.35, n2: 0.35, n3: 0.35 },
    },
    surface: {},
    // Plain surface = truly plain: symmetry order 1 suppresses the auto-ridge
    // fallback in getRadialMod, so the blank mold stays perfectly smooth.
    symmetryOrder: surfaceId === 'plain' ? 1 : 1 + Math.floor(rng() * 6),
  };

  switch (sectionId) {
    case 'ellipse':
      params.section.xScale = 0.5 + rng() * 1.6;
      params.section.zScale = 0.5 + rng() * 1.6;
      break;
    case 'superformula':
      params.section.sf = {
        m: Math.floor(rng() * 12),
        n1: 0.15 + rng() * 1.6,
        n2: 0.2 + rng() * 2.6,
        n3: 0.2 + rng() * 2.6,
      };
      break;
  }

  switch (surfaceId) {
    case 'ridges':
      params.surface.ridges = {
        count: 3 + Math.floor(rng() * 18),
        amplitude: 0.03 + rng() * 0.35,
      };
      break;
    case 'frill':
      params.surface.frill = {
        amplitude: 0.03 + rng() * 0.4,
        frequency: 4 + Math.floor(rng() * 28),
      };
      break;
    case 'lobes':
      params.surface.lobes = {
        count: 3 + Math.floor(rng() * 10),
        amplitude: 0.03 + rng() * 0.35,
        radiusScale: 0.6 + rng() * 1.2,
      };
      break;
  }

  void seed;
  return params;
}

// ──────────────────────────────────────────
// Params → spec fragment (pure)
// ──────────────────────────────────────────

import type { JellyfishSpec } from '../jellyfish/creatures';

/**
 * Project vessel params onto a pure-vessel JellyfishSpec fragment.
 * The caller merges this into a base spec (id, bodyPlan, etc).
 */
export function applyVesselParams(
  base: JellyfishSpec,
  params: VesselParams,
): JellyfishSpec {
  const spec: JellyfishSpec = structuredClone(base);

  spec.profiles = { bulb: params.profile };

  spec.crossSection = {
    kind: params.sectionKind,
    rotation: params.section.rotation,
    twist: params.section.twist,
  };
  if (params.sectionKind === 'ellipse') {
    spec.crossSection.xScale = params.section.xScale;
    spec.crossSection.zScale = params.section.zScale;
  } else if (params.sectionKind === 'superformula') {
    spec.crossSection.superformula = { ...params.section.sf, a: 1, b: 1 };
  }

  spec.surface = {};
  if (params.surface.ridges) {
    spec.surface.ridges = { ...params.surface.ridges };
  }
  if (params.surface.frill) {
    spec.surface.frill = { ...params.surface.frill };
  }
  if (params.surface.lobes) {
    spec.lobes = { ...params.surface.lobes, phase: params.section.rotation };
  }

  spec.symmetry = {
    kind: 'radial',
    order: params.symmetryOrder,
    breaking: 0,
    phase: params.section.rotation,
  };

  // Pure vessel: no appendages.
  spec.features = { tail: false, mouth: false, tentacles: false };
  spec.geometry = {
    ...(spec.geometry ?? {}),
    tentacleSegments: 0,
    tailArmSegments: 0,
    tailRibsCount: 0,
  };
  spec.emitters = { tentacles: { kind: 'explicit', ribs: [] } };

  return spec;
}
