import type { SpecimenRecipe } from './recipe';

export interface SpecimenAnalysis {
  relationships: Array<{ parameterPath: string; statement: string; severity: 'info' | 'warning' }>;
  budget: {
    estimatedParticles: number;
    estimatedVertices: number;
    estimatedIndices: number;
    score: number;
    level: 'comfortable' | 'watch' | 'heavy' | 'blocked';
  };
  warnings: Array<{ code: string; message: string; parameterPaths: string[] }>;
}

export function analyzeRecipe(recipe: SpecimenRecipe): SpecimenAnalysis {
  const v = recipe.vessel.values;
  const c = recipe.character.values;
  const g = recipe.gesture?.values ?? {};
  const tailCost = recipe.character.modules.tail ? (c.tailRibs ?? 0) * (c.tailLength ?? 0) * 12 : 0;
  const tentacleCost = recipe.character.modules.tentacles ? (c.tentacleCount ?? 0) * (c.tentacleSegments ?? 0) : 0;
  const mouthCost = recipe.character.modules.mouth ? (c.mouthSize ?? 0) * (c.mouthArmLength ?? 0) * 24 : 0;
  const colonyMultiplier = Math.max(1, Math.round(Number(g.colonyCount ?? 1)));
  const estimatedParticles = Math.round(((v.ribsCount ?? 20) * (v.totalSegments ?? 36) + tailCost + tentacleCost + mouthCost) * colonyMultiplier);
  const estimatedVertices = Math.round(estimatedParticles * 2.2);
  const estimatedIndices = Math.round(estimatedVertices * 1.7);
  const score = estimatedParticles / 3500;
  const level = score > 1.6 ? 'blocked' : score > 1 ? 'heavy' : score > 0.65 ? 'watch' : 'comfortable';
  const relationships: SpecimenAnalysis['relationships'] = [];
  const warnings: SpecimenAnalysis['warnings'] = [];

  if (recipe.character.modules.tentacles) {
    relationships.push({ parameterPath: 'character.tentacles.count', statement: 'More tendril density adds lower-body visual weight and emitter groups.', severity: 'info' });
    relationships.push({ parameterPath: 'character.tentacles.segments', statement: 'More tendril detail makes the gesture finer but increases simulation cost.', severity: 'info' });
  }
  if (recipe.character.modules.tail && (c.tailLength ?? 0) > 1.25 && (c.tailRadius ?? 0) > 24) {
    warnings.push({ code: 'heavy-tail', message: 'Long, heavy tail may pull the composition downward.', parameterPaths: ['character.tail.length', 'character.tail.radiusFactor'] });
    relationships.push({ parameterPath: 'character.tail.length', statement: 'Long reach with heavy weight creates a strong vertical gesture.', severity: 'warning' });
  }
  if ((v.symmetryBreaking ?? 0) > 0.7) {
    relationships.push({ parameterPath: 'symmetry.breaking', statement: 'High imperfection trades clean order for organic irregularity.', severity: 'info' });
  }
  if (colonyMultiplier > 1) {
    relationships.push({ parameterPath: 'gesture.colony.count', statement: 'Colony count multiplies visual rhythm and geometry cost.', severity: colonyMultiplier > 8 ? 'warning' : 'info' });
  }
  if (level === 'blocked') {
    warnings.push({ code: 'geometry-budget', message: 'This recipe exceeds the comfortable gallery geometry budget.', parameterPaths: ['geometry.ribsCount', 'geometry.totalSegments', 'character.tentacles.segments', 'gesture.colony.count'] });
  }
  return { relationships, budget: { estimatedParticles, estimatedVertices, estimatedIndices, score, level }, warnings };
}
