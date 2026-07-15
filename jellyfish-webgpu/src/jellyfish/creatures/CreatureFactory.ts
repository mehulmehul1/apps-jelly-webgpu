import { BodyPlan } from './BodyPlan';
import type { CreatureSpec, JellyfishSpec } from './CreatureSpec';
import { resolveGeometryConfig } from './CreatureSpec';
import { validateCreatureSpec } from './validate';

export interface CreatureUnit {
  id: string;
  spec: CreatureSpec;
  transform: {
    position: { x: number; y: number; z: number };
    scale: number;
  };
}

export interface CreatureRig {
  spec: CreatureSpec;
  units: CreatureUnit[];
  warnings: string[];
}

/**
 * Expand a CreatureSpec into one or more units (for colonies).
 * This stays renderer-agnostic; it only defines per-unit transforms and per-unit spec overrides.
 */
export function createCreatureRig(input: CreatureSpec): CreatureRig {
  const { spec, warnings } = validateCreatureSpec(input);

  if (spec.bodyPlan !== BodyPlan.Siphonophore || spec.archetypeId !== 'jellyfish') {
    return {
      spec,
      units: [
        {
          id: spec.id,
          spec,
          transform: { position: { x: 0, y: 0, z: 0 }, scale: 1 },
        },
      ],
      warnings,
    };
  }

  const colony = (spec as JellyfishSpec).colony ?? { count: 5, spacing: 34, scaleDecay: 0.92 };
  const count = colony.count;
  const spacing = colony.spacing;
  const decay = colony.scaleDecay ?? 0.92;
  const layout = colony.layout ?? 'chain';

  const units: CreatureUnit[] = [];
  for (let i = 0; i < count; i++) {
    const scale = Math.pow(decay, i);
    let x = 0;
    let y = -i * spacing;
    let z = 0;

    if (layout === 'arc') {
      const arc = colony.arc ?? { radius: Math.max(40, spacing * 1.2), angle: Math.PI * 0.85 };
      const t = count === 1 ? 0.5 : i / (count - 1);
      const a = (t - 0.5) * arc.angle;
      x = Math.sin(a) * arc.radius;
      y = -i * spacing;
      z = Math.cos(a) * arc.radius - arc.radius;
    } else if (layout === 'helix') {
      const helix = colony.helix ?? { radius: Math.max(20, spacing * 0.6), turns: 1.5 };
      const t = count === 1 ? 0 : i / (count - 1);
      const a = Math.PI * 2 * helix.turns * t;
      x = Math.cos(a) * helix.radius;
      z = Math.sin(a) * helix.radius;
      y = -i * spacing;
    } else if (layout === 'cluster') {
      const cl = colony.cluster ?? { radius: Math.max(30, spacing) };
      const a = (i / Math.max(1, count)) * Math.PI * 2;
      const r = cl.radius * Math.sqrt(i / Math.max(1, count - 1));
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      y = -(i % 3) * (spacing * 0.6);
    } else if (layout === 'sheet') {
      const sh = colony.sheet ?? { rows: 2, cols: 3, spacingX: spacing * 1.2, spacingY: spacing };
      const row = Math.floor(i / sh.cols);
      const col = i % sh.cols;
      x = (col - (sh.cols - 1) / 2) * sh.spacingX;
      y = -(row - (sh.rows - 1) / 2) * sh.spacingY;
      z = 0;
    }

    units.push({
      id: `${spec.id}:${i}`,
      spec: {
        ...spec,
        // per-unit geometry scaling handled by transform; keep spec stable
      },
      transform: { position: { x, y, z }, scale },
    });
  }

  return { spec, units, warnings };
}
