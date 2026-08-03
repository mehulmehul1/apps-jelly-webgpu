/**
 * vesselSampler.ts
 *
 * Composes a fully-validated, deterministic, pure-vessel JellyfishSpec from a
 * seed + catalog ids. This is the Vessel layer's build() — the single source of
 * truth for "what mold is this seed showing".
 *
 * Determinism contract: given (seed, orderId, sectionId, surfaceId, tweaks),
 * the returned spec is byte-identical across runs and machines. The seeded RNG
 * is drawn only here (and in catalog sampling) — JellyfishGeometry itself is
 * deterministic for pure vessels (no tentacle jitter).
 */

import type { JellyfishSpec } from '../jellyfish/creatures';
import { BodyPlan } from '../jellyfish/creatures';
import { validateCreatureSpec } from '../jellyfish/creatures';
import {
  sampleVesselParams,
  applyVesselParams,
  ORDER_FAMILIES,
  type SectionKind,
  type SurfaceKind,
  type Tweak,
} from './vesselCatalog';
import { hashString, mulberry32 } from './prng';

export interface VesselIdentity {
  orderId: string;
  sectionId: SectionKind;
  surfaceId: SurfaceKind;
}

/** Params needed to build a single vessel tile. */
export interface VesselRequest extends VesselIdentity {
  seed: string;
}

/** Human-readable label for a vessel (used in hero + hover). */
export function vesselLabel(req: VesselIdentity): string {
  const order = ORDER_FAMILIES.find((o) => o.id === req.orderId);
  return order?.label ?? req.orderId;
}

/** Sculptor-language description for a vessel's order family. */
export function vesselDescription(req: VesselIdentity): string {
  const order = ORDER_FAMILIES.find((o) => o.id === req.orderId);
  return order?.description ?? '';
}

/**
 * Build a validated pure-vessel spec for the given request.
 *
 * `tweaks` is an optional map of tweak key -> value that overrides the seeded
 * sampling (hero sliders). Values must respect the tweak's min/max/step.
 */
export interface VesselSample {
  spec: JellyfishSpec;
  warnings: string[];
  /** Current numeric state of every tweak key relevant to this identity. */
  values: Record<string, number>;
}

export function sampleVesselSpec(
  req: VesselRequest,
  tweaks?: Record<string, number>,
): VesselSample {
  const seedKey = `${req.seed}::${req.orderId}::${req.sectionId}::${req.surfaceId}`;
  const rng = mulberry32(hashString(seedKey));

  const params = sampleVesselParams(
    req.seed,
    req.orderId,
    req.sectionId,
    req.surfaceId,
    rng,
  );

  // Apply tweak overrides onto params (each tweak owns a write path).
  if (tweaks) {
    applyTweaksToParams(req, tweaks, params);
  }

  const base: JellyfishSpec = {
    id: `vessel-${req.seed}-${req.orderId}-${req.sectionId}-${req.surfaceId}`,
    archetypeId: 'jellyfish',
    bodyPlan: BodyPlan.Medusa,
  };

  const projected = applyVesselParams(base, params);
  const { spec, warnings } = validateCreatureSpec(projected);
  return { spec: spec as JellyfishSpec, warnings, values: readTweakValues(req, params) };
}

/** All tweak keys relevant to this identity (order + section + surface). */
export function tweakKeysFor(req: VesselIdentity): string[] {
  const order = ORDER_FAMILIES.find((o) => o.id === req.orderId);
  return [
    ...(order?.tweaks.map((t) => t.key) ?? []),
    ...sectionTweakTable(req.sectionId).map((t) => t.key),
    ...surfaceTweakTable(req.surfaceId).map((t) => t.key),
  ];
}

/** Read the current numeric value of every tweak key from the params. */
function readTweakValues(
  req: VesselRequest,
  params: ReturnType<typeof sampleVesselParams>,
): Record<string, number> {
  const values: Record<string, number> = {};

  // Order family values
  const profile = params.profile;
  switch (profile.kind) {
    case 'polyline':
      // Store crown/flare/jitter as read-only best-guess from the points.
      values['moldCrown'] = Math.min(...profile.points.map((p) => p[1]));
      values['moldFlare'] = Math.max(...profile.points.map((p) => p[1]));
      values['moldJitter'] = 0.12;
      break;
    case 'power':
      if (req.orderId === 'cone') values['coneExponent'] = profile.exponent;
      else values['parasolExponent'] = profile.exponent;
      break;
    case 'log_spiral':
      values['spiralA'] = profile.a;
      values['spiralB'] = profile.b;
      break;
    case 'vesica':
      values['eggPower'] = profile.power ?? 1;
      break;
    case 'constant':
      values['lanternValue'] = profile.value;
      break;
    default:
      break;
  }

  // Section values
  if (params.sectionKind === 'ellipse') {
    values['ellipseX'] = params.section.xScale;
    values['ellipseZ'] = params.section.zScale;
  } else if (params.sectionKind === 'superformula') {
    values['sfM'] = params.section.sf.m;
    values['sfN1'] = params.section.sf.n1;
    values['sfN2'] = params.section.sf.n2;
    values['sfN3'] = params.section.sf.n3;
  }

  // Surface values
  if (params.surface.ridges) {
    values['ridgeCount'] = params.surface.ridges.count;
    values['ridgeAmp'] = params.surface.ridges.amplitude;
  }
  if (params.surface.frill) {
    values['frillAmp'] = params.surface.frill.amplitude;
    values['frillFreq'] = params.surface.frill.frequency;
  }
  if (params.surface.lobes) {
    values['lobeCount'] = params.surface.lobes.count;
    values['lobeAmp'] = params.surface.lobes.amplitude;
  }

  return values;
}

/**
 * Route tweak values into the params object. Each tweak's key is namespaced by
 * its family (e.g. `coneExponent`, `sfM`, `frillAmp`) so a flat map works.
 */
function applyTweaksToParams(
  req: VesselRequest,
  tweaks: Record<string, number>,
  params: ReturnType<typeof sampleVesselParams>,
): void {
  // Order family tweaks
  const order = ORDER_FAMILIES.find((o) => o.id === req.orderId);
  if (order) {
    // The mold family re-derives its polyline from all three tweaks at once.
    if (req.orderId === 'mold') {
      applyMoldTweaks(tweaks, params);
    } else {
      for (const t of order.tweaks) {
        if (tweaks[t.key] !== undefined) applyOrderTweak(req, t, tweaks[t.key], params);
      }
    }
  }

  // Section tweaks
  const sectionTweaks = sectionTweakTable(req.sectionId);
  for (const t of sectionTweaks) {
    if (tweaks[t.key] !== undefined) applySectionTweak(req, t, tweaks[t.key], params);
  }

  // Surface tweaks
  const surfaceTweaks = surfaceTweakTable(req.surfaceId);
  for (const t of surfaceTweaks) {
    if (tweaks[t.key] !== undefined) applySurfaceTweak(req, t, tweaks[t.key], params);
  }
}

/**
 * The mold family is a polyline whose shape depends on crown/flare/jitter
 * together. If any of those tweaks is present, re-derive the whole polyline.
 */
function applyMoldTweaks(
  tweaks: Record<string, number>,
  params: ReturnType<typeof sampleVesselParams>,
): void {
  const hasAny = ['moldCrown', 'moldFlare', 'moldJitter'].some((k) => tweaks[k] !== undefined);
  if (!hasAny || params.profile.kind !== 'polyline') return;

  const n = params.profile.points.length;
  const crown = clampNum(tweaks['moldCrown'] ?? 0.2, 0.05, 0.45);
  const flare = clampNum(tweaks['moldFlare'] ?? 0.7, 0.3, 1.0);
  const jitter = clampNum(tweaks['moldJitter'] ?? 0.12, 0, 0.35);

  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const bell = Math.sin(Math.PI * Math.pow(t, 0.9));
    const j = (Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1; // deterministic pseudo-noise
    const v = crown + (flare - crown) * bell + (j - 0.5) * 2 * jitter;
    pts.push([t, Math.max(0.06, Math.min(1, v))]);
  }
  params.profile = { kind: 'polyline', points: pts };
}

function clampNum(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function applyOrderTweak(
  req: VesselRequest,
  t: Tweak,
  v: number,
  params: ReturnType<typeof sampleVesselParams>,
): void {
  const profile = params.profile;
  switch (t.key) {
    case 'coneExponent':
      params.profile = { kind: 'power', exponent: v, min: 0, max: 1 };
      break;
    case 'parasolExponent':
      params.profile = { kind: 'power', exponent: v, min: 0, max: 1 };
      break;
    case 'spiralA':
      params.profile = {
        kind: 'log_spiral',
        a: v,
        b: profile.kind === 'log_spiral' ? profile.b : 1,
        min: 0,
        max: 1,
      };
      break;
    case 'spiralB':
      params.profile = {
        kind: 'log_spiral',
        a: profile.kind === 'log_spiral' ? profile.a : 0.8,
        b: v,
        min: 0,
        max: 1,
      };
      break;
    case 'eggPower':
      params.profile = { kind: 'vesica', min: 0, max: 1, power: v };
      break;
    case 'lanternValue':
      params.profile = { kind: 'constant', value: v };
      break;
    default:
      break;
  }
  void req;
}

function sectionTweakTable(sectionId: SectionKind): Tweak[] {
  switch (sectionId) {
    case 'ellipse':
      return [
        { key: 'ellipseX', label: 'x', min: 0.2, max: 2.6, step: 0.05 },
        { key: 'ellipseZ', label: 'z', min: 0.2, max: 2.6, step: 0.05 },
      ];
    case 'superformula':
      return [
        { key: 'sfM', label: 'lobes', min: 0, max: 12, step: 1 },
        { key: 'sfN1', label: 'n1', min: 0.1, max: 2.5, step: 0.05 },
        { key: 'sfN2', label: 'n2', min: 0.1, max: 4.0, step: 0.05 },
        { key: 'sfN3', label: 'n3', min: 0.1, max: 4.0, step: 0.05 },
      ];
    default:
      return [];
  }
}

function applySectionTweak(
  req: VesselRequest,
  t: Tweak,
  v: number,
  params: ReturnType<typeof sampleVesselParams>,
): void {
  switch (t.key) {
    case 'ellipseX':
      params.section.xScale = v;
      break;
    case 'ellipseZ':
      params.section.zScale = v;
      break;
    case 'sfM':
      params.section.sf.m = Math.round(v);
      break;
    case 'sfN1':
      params.section.sf.n1 = v;
      break;
    case 'sfN2':
      params.section.sf.n2 = v;
      break;
    case 'sfN3':
      params.section.sf.n3 = v;
      break;
    default:
      break;
  }
  void req;
}

function surfaceTweakTable(surfaceId: SurfaceKind): Tweak[] {
  switch (surfaceId) {
    case 'ridges':
      return [
        { key: 'ridgeCount', label: 'rows', min: 3, max: 24, step: 1 },
        { key: 'ridgeAmp', label: 'depth', min: 0.02, max: 0.5, step: 0.01 },
      ];
    case 'frill':
      return [
        { key: 'frillAmp', label: 'amplitude', min: 0.02, max: 0.6, step: 0.01 },
        { key: 'frillFreq', label: 'frequency', min: 2, max: 40, step: 1 },
      ];
    case 'lobes':
      return [
        { key: 'lobeCount', label: 'lobes', min: 3, max: 16, step: 1 },
        { key: 'lobeAmp', label: 'depth', min: 0.02, max: 0.5, step: 0.01 },
      ];
    default:
      return [];
  }
}

function applySurfaceTweak(
  req: VesselRequest,
  t: Tweak,
  v: number,
  params: ReturnType<typeof sampleVesselParams>,
): void {
  switch (t.key) {
    case 'ridgeCount':
      params.surface.ridges = { ...(params.surface.ridges ?? { amplitude: 0.2 }), count: Math.round(v) };
      break;
    case 'ridgeAmp':
      params.surface.ridges = { ...(params.surface.ridges ?? { count: 10 }), amplitude: v };
      break;
    case 'frillAmp':
      params.surface.frill = { ...(params.surface.frill ?? { frequency: 12 }), amplitude: v };
      break;
    case 'frillFreq':
      params.surface.frill = { ...(params.surface.frill ?? { amplitude: 0.2 }), frequency: Math.round(v) };
      break;
    case 'lobeCount':
      params.surface.lobes = { ...(params.surface.lobes ?? { amplitude: 0.2 }), count: Math.round(v) };
      break;
    case 'lobeAmp':
      params.surface.lobes = { ...(params.surface.lobes ?? { count: 8 }), amplitude: v };
      break;
    default:
      break;
  }
  void req;
}
