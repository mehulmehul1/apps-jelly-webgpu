/**
 * Capture baseline particle/constraint/vertex counts for all 12 jellyfish presets.
 * Run: bun run scripts/capture-baseline-counts.ts
 */
import { PRESETS } from '../src/jellyfish/creatures/presets';
import { JellyfishGeometry } from '../src/jellyfish/JellyfishGeometry';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface PresetCounts {
  particleCount: number;
  constraintCount: number;
  vertexCount: number;
  faceCount: number;
}

const results: Record<string, PresetCounts> = {};

const presetIds = Object.keys(PRESETS) as Array<keyof typeof PRESETS>;

for (const id of presetIds) {
  const preset = PRESETS[id];
  const data = JellyfishGeometry.create(preset.spec);

  const particleCount = data.system.positions.length / 3;

  // Constraint count: global + local + pin constraints
  const ps = data.system as any;
  const constraintCount: number =
    (ps._globalConstraints?.length ?? 0) +
    (ps._localConstraints?.length ?? 0) +
    (ps._pinConstraints?.length ?? 0);

  // Face count: faces are stored as index triplets
  const totalFaceIndices =
    data.faces.bulb.length + data.faces.tail.length + data.faces.mouth.length;
  const faceCount = totalFaceIndices / 3;

  // Vertex count: each particle is a vertex
  const vertexCount = particleCount;

  results[id] = { particleCount, constraintCount, vertexCount, faceCount };

  console.log(
    `${id}: ${particleCount} particles, ${constraintCount} constraints, ${vertexCount} verts, ${faceCount} faces`,
  );
}

// Write output
const outDir = join(process.cwd(), '.sisyphus', 'evidence');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'archetype-baseline-counts.json');
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nBaseline counts saved to ${outPath}`);
