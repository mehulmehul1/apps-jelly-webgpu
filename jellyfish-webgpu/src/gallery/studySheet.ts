import type { ParameterDescriptor } from './model/parameterRegistry';
import { studyValues } from './model/study';
import type { SpecimenRecipe } from './model/recipe';

export type StudyKind = 'range' | 'choice';

export interface StudyChoice {
  id: string;
  label: string;
  description: string;
  value: number | string;
}

export interface StudySheetState {
  open: boolean;
  parameterPath: string | null;
  kind: StudyKind | null;
  lower: number;
  upper: number;
  steps: number;
  choices: StudyChoice[];
}

export function defaultStudySheet(): StudySheetState {
  return { open: false, parameterPath: null, kind: null, lower: 0, upper: 1, steps: 7, choices: [] };
}

export function buildStudyValues(parameter: ParameterDescriptor, lower: number, upper: number, steps: number): number[] {
  return studyValues(parameter, lower, upper, steps);
}

export function choiceStudyRecipes(
  baseline: SpecimenRecipe,
  path: string,
  choices: StudyChoice[],
): SpecimenRecipe[] {
  const key = path.split('.').at(-1) ?? path;
  return choices.map((choice, index) => {
    const recipe = structuredClone(baseline);
    recipe.id = `${baseline.id}::choice-${key}-${index + 1}`;
    recipe.parentId = baseline.id;
    if (recipe.character.values[key] !== undefined) recipe.character.values[key] = Number(choice.value);
    if (recipe.gesture?.values[key] !== undefined) recipe.gesture.values[key] = choice.value;
    return recipe;
  });
}
