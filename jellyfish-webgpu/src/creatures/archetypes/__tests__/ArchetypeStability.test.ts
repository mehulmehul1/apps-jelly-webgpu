import { describe, expect, it } from 'vitest';
import { PRESETS } from '../../../jellyfish/creatures';
import { fishArchetype } from '../FishArchetype';
import { anemoneArchetype } from '../AnemoneArchetype';

const archetypes = [fishArchetype, anemoneArchetype] as const;

describe('non-jellyfish archetype stability', () => {
  for (const archetype of archetypes) {
    const presets = Object.values(PRESETS).filter(
      (preset) => preset.spec.archetypeId === archetype.id,
    );

    for (const preset of presets) {
      it(`${preset.name} remains finite and bounded for ten seconds`, () => {
        const body = archetype.buildBody(
          structuredClone(preset.spec),
          { timestep: 1000 / 30 },
          { random: () => 0.5 },
        );
        const positions = (body.geometryData as any).system.positions as Float32Array;

        for (let tick = 0; tick < 300; tick++) {
          archetype.animateBody(body, tick / 30, 1000 / 30, 0.15);
        }

        let maxCoordinate = 0;
        for (const value of positions) {
          expect(Number.isFinite(value)).toBe(true);
          maxCoordinate = Math.max(maxCoordinate, Math.abs(value));
        }
        expect(maxCoordinate).toBeLessThan(250);
      });
    }
  }
});
