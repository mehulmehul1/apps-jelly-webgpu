import type { ParameterDescriptor } from './parameterRegistry';
import { clampParameterValue } from './parameterRegistry';
import { branchRecipe, type SpecimenRecipe } from './recipe';

export type StudyRangeSource = 'canonical' | 'explicit' | 'favorites' | 'probes';
export type StudyPurpose = 'layer-addition' | 'parameter-study' | 'taste-refinement';

export interface AxisStudy {
  id: string;
  baselineRecipeId: string;
  parameterPath: string;
  values: number[];
  rangeSource: StudyRangeSource;
  lower: number;
  upper: number;
  stepCount: number;
  candidateRecipeIds: string[];
  purpose: StudyPurpose;
}

export interface StudyCandidate {
  recipe: SpecimenRecipe;
  value: number;
}

export function studyValues(parameter: ParameterDescriptor, lower = parameter.min, upper = parameter.max, stepCount = 9): number[] {
  const lo = clampParameterValue(parameter, Math.min(lower, upper));
  const hi = clampParameterValue(parameter, Math.max(lower, upper));
  const count = Math.max(2, Math.min(25, Math.round(stepCount)));
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    values.push(clampParameterValue(parameter, lo + (hi - lo) * t));
  }
  return [...new Set(values)];
}

export function coldStartProbes(parameter: ParameterDescriptor): number[] {
  return [parameter.min, clampParameterValue(parameter, parameter.min + (parameter.max - parameter.min) * 0.5), parameter.max];
}

export function favoriteRange(values: number[], parameter: ParameterDescriptor): { lower: number; upper: number; sampleCount: number } | undefined {
  if (values.length < 2) return undefined;
  return {
    lower: clampParameterValue(parameter, Math.min(...values)),
    upper: clampParameterValue(parameter, Math.max(...values)),
    sampleCount: values.length,
  };
}

export function getRecipeValue(recipe: SpecimenRecipe, key: string): number | undefined {
  return recipe.vessel.values[key] ?? recipe.character.values[key] ?? recipe.costume?.values[key] ?? recipe.gesture?.values[key];
}

export function buildStudyCandidates(
  baseline: SpecimenRecipe,
  parameter: ParameterDescriptor,
  values: number[],
  idPrefix: string,
  now = Date.now(),
): StudyCandidate[] {
  return values.map((value, index) => {
    const recipe = branchRecipe(baseline, `${idPrefix}-${index + 1}`, now + index);
    const target = recipe.vessel.values[keyFromPath(parameter.path)] !== undefined
      ? recipe.vessel.values
      : parameter.layer === 'character'
        ? recipe.character.values
        : parameter.layer === 'costume'
          ? (recipe.costume ??= { values: {} }).values
          : (recipe.gesture ??= { values: {} }).values;
    target[keyFromPath(parameter.path)] = value;
    return { recipe, value };
  });
}

function keyFromPath(path: string): string {
  return path.split('.').at(-1) ?? path;
}

export function createAxisStudy(
  baseline: SpecimenRecipe,
  parameter: ParameterDescriptor,
  values: number[],
  rangeSource: StudyRangeSource,
  purpose: StudyPurpose,
  id: string,
): AxisStudy {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    id,
    baselineRecipeId: baseline.id,
    parameterPath: parameter.path,
    values: sorted,
    rangeSource,
    lower: sorted[0] ?? parameter.min,
    upper: sorted.at(-1) ?? parameter.max,
    stepCount: sorted.length,
    candidateRecipeIds: sorted.map((_, index) => `${id}-${index + 1}`),
    purpose,
  };
}

export function cloneStudy(study: AxisStudy): AxisStudy {
  return structuredClone(study);
}
