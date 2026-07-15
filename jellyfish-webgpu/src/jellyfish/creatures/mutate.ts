import { BodyPlan } from './BodyPlan';
import type { CreatureSpec, JellyfishSpec } from './CreatureSpec';
import { validateCreatureSpec } from './validate';

export interface Rng {
  next: () => number;
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function jitter(rng: () => number, v: number, amount: number): number {
  return v + (rng() * 2 - 1) * amount;
}

/**
 * Mutate 1-3 traits of a CreatureSpec.
 * Intended for "open form" style iteration: small deltas, stable identity.
 */
export function mutateCreatureSpec(input: CreatureSpec, rngLike: Rng | (() => number)): CreatureSpec {
  // Only JellyfishSpec supports mutation — pass stubs through unchanged
  if (input.archetypeId !== 'jellyfish') {
    return structuredClone(input);
  }

  const rng = typeof rngLike === 'function' ? rngLike : rngLike.next;
  const next: JellyfishSpec = structuredClone(input) as JellyfishSpec;

  const passes = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < passes; i++) {
    const module = pick(rng, ['silhouette', 'topology', 'crossSection', 'symmetry', 'surface', 'tentacles', 'spine', 'colony'] as const);

    switch (module) {
      case 'silhouette': {
        next.geometry = next.geometry ?? {};
        next.geometry.size = clamp(jitter(rng, next.geometry.size ?? 40, 8), 12, 110);
        next.geometry.ribRadius = clamp(jitter(rng, next.geometry.ribRadius ?? 15, 3.5), 3, 35);
        break;
      }
      case 'topology': {
        next.geometry = next.geometry ?? {};
        next.geometry.ribsCount = Math.round(clamp(jitter(rng, next.geometry.ribsCount ?? 20, 6), 8, 60));
        next.geometry.tailRibsCount = Math.round(
          clamp(jitter(rng, next.geometry.tailRibsCount ?? 15, 10), 0, 80)
        );
        next.topology = next.topology ?? { capTop: next.bodyPlan !== BodyPlan.Salp };
        if (next.bodyPlan === BodyPlan.Salp) {
          next.topology.capTop = rng() < 0.85 ? false : true;
        } else if (rng() < 0.15) {
          next.topology.capTop = !next.topology.capTop;
        }
        break;
      }
      case 'crossSection': {
        // Cross-section is the big silhouette dial; keep mutations small.
        next.crossSection = next.crossSection ?? { kind: 'ellipse', xScale: 1.1, zScale: 0.85, rotation: 0, twist: 0 };

        if (rng() < 0.25) {
          next.crossSection.kind = pick(rng, ['circle', 'ellipse', 'superformula']);
        }

        next.crossSection.rotation = jitter(rng, next.crossSection.rotation ?? 0, 0.3);
        next.crossSection.twist = jitter(rng, next.crossSection.twist ?? 0, 0.35);

        if (next.crossSection.kind === 'ellipse') {
          next.crossSection.xScale = clamp(jitter(rng, next.crossSection.xScale ?? 1.0, 0.35), 0.25, 2.5);
          next.crossSection.zScale = clamp(jitter(rng, next.crossSection.zScale ?? 1.0, 0.35), 0.25, 2.5);
        } else if (next.crossSection.kind === 'superformula') {
          next.crossSection.superformula = next.crossSection.superformula ?? { m: 5, a: 1, b: 1, n1: 0.35, n2: 0.35, n3: 0.35 };
          const sf = next.crossSection.superformula;
          if (rng() < 0.4) sf.m = Math.round(clamp(jitter(rng, sf.m, 3), 0, 16));
          sf.n1 = clamp(jitter(rng, sf.n1, 0.25), 0.05, 2.5);
          sf.n2 = clamp(jitter(rng, sf.n2, 0.25), 0.05, 2.5);
          sf.n3 = clamp(jitter(rng, sf.n3, 0.25), 0.05, 2.5);
          sf.a = clamp(jitter(rng, sf.a ?? 1, 0.15), 0.25, 2.0);
          sf.b = clamp(jitter(rng, sf.b ?? 1, 0.15), 0.25, 2.0);
        }
        break;
      }
      case 'symmetry': {
        next.symmetry = next.symmetry ?? { kind: 'radial', order: 8, breaking: 0.1, phase: 0 };
        if (next.symmetry.kind === 'radial') {
          next.symmetry.order = Math.round(clamp(jitter(rng, next.symmetry.order, 3), 1, 24));
        }
        next.symmetry.breaking = clamp(jitter(rng, next.symmetry.breaking ?? 0, 0.18), 0, 1);
        next.symmetry.phase = jitter(rng, next.symmetry.phase ?? 0, 0.5);
        break;
      }
      case 'surface': {
        next.surface = next.surface ?? {};
        if (rng() < 0.5) {
          const r = next.surface.ridges ?? { count: next.symmetry?.order ?? 8, amplitude: 0.12, phase: 0, tRange: [0.15, 0.95] as [number, number] };
          r.amplitude = clamp(jitter(rng, r.amplitude, 0.1), 0, 0.6);
          r.count = Math.round(clamp(jitter(rng, r.count, 3), 0, 32));
          r.phase = jitter(rng, r.phase ?? 0, 0.6);
          next.surface.ridges = r;
        } else {
          const f = next.surface.frill ?? { amplitude: 0.12, frequency: 18, phase: 0, tRange: [0.75, 1.0] as [number, number] };
          f.amplitude = clamp(jitter(rng, f.amplitude, 0.12), 0, 0.8);
          f.frequency = clamp(jitter(rng, f.frequency, 8), 0, 64);
          f.phase = jitter(rng, f.phase ?? 0, 0.8);
          next.surface.frill = f;
        }
        break;
      }
      case 'tentacles': {
        // Keep tentacles mostly off for salp/comb jelly unless user enables them.
        if (next.bodyPlan === BodyPlan.Salp || next.bodyPlan === BodyPlan.CombJelly) break;
        next.geometry = next.geometry ?? {};
        next.geometry.tentacleSegments = Math.round(
          clamp(jitter(rng, next.geometry.tentacleSegments ?? 120, 35), 0, 220)
        );
        next.geometry.tentacleSegmentLength = clamp(
          jitter(rng, next.geometry.tentacleSegmentLength ?? 1.5, 0.35),
          0.25,
          4
        );
        break;
      }
      case 'spine': {
        // Only modulate amplitude/phase for sine/helix spines.
        if (!next.spine || next.spine.kind === 'none') {
          if (rng() < 0.6) {
            next.spine = { kind: 'sine', ampX: 4, ampZ: 4, freq: 0.5, phase: rng() * Math.PI * 2 };
          }
          break;
        }
        if (next.spine.kind === 'sine') {
          next.spine.ampX = clamp(jitter(rng, next.spine.ampX, 3), 0, 30);
          next.spine.ampZ = clamp(jitter(rng, next.spine.ampZ, 3), 0, 30);
          next.spine.freq = clamp(jitter(rng, next.spine.freq, 0.4), 0, 6);
          next.spine.phase = jitter(rng, next.spine.phase ?? 0, 0.8);
        } else if (next.spine.kind === 'helix') {
          next.spine.radius = clamp(jitter(rng, next.spine.radius, 6), 0, 60);
          next.spine.turns = clamp(jitter(rng, next.spine.turns, 0.6), 0, 12);
          next.spine.phase = jitter(rng, next.spine.phase ?? 0, 0.8);
        }
        break;
      }
      case 'colony': {
        if (next.bodyPlan !== BodyPlan.Siphonophore) break;
        next.colony = next.colony ?? { count: 5, spacing: 34, scaleDecay: 0.92 };
        next.colony.count = Math.round(clamp(jitter(rng, next.colony.count, 2), 2, 12));
        next.colony.spacing = clamp(jitter(rng, next.colony.spacing, 10), 10, 120);
        next.colony.scaleDecay = clamp(jitter(rng, next.colony.scaleDecay ?? 0.92, 0.05), 0.7, 1.0);
        if (rng() < 0.33) {
          next.colony.layout = pick(rng, ['chain', 'arc', 'helix', 'cluster', 'sheet']);
        }
        break;
      }
    }
  }

  return validateCreatureSpec(next).spec;
}
