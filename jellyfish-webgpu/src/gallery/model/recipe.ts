import type { SectionKind, SurfaceKind } from '../vesselCatalog';

export const RECIPE_SCHEMA_VERSION = 1 as const;

export interface CharacterModules {
  tail: boolean;
  mouth: boolean;
  tentacles: boolean;
}

export interface SpecimenRecipe {
  schemaVersion: typeof RECIPE_SCHEMA_VERSION;
  id: string;
  parentId?: string;
  createdAt: number;
  seed: string;
  vessel: {
    orderId: string;
    sectionId: SectionKind;
    surfaceId: SurfaceKind;
    values: Record<string, number>;
  };
  character: {
    modules: CharacterModules;
    values: Record<string, number>;
  };
  costume?: { values: Record<string, number> };
  gesture?: { values: Record<string, number | string> };
}

export type SpecimenSource = 'seeded' | 'branch' | 'study';

export interface WallSpecimen {
  recipe: SpecimenRecipe;
  label: string;
  source: SpecimenSource;
  parentId?: string;
  studyId?: string;
  favorite: boolean;
}

export function cloneRecipe(recipe: SpecimenRecipe): SpecimenRecipe {
  return structuredClone(recipe);
}

export function recipeIdentity(recipe: SpecimenRecipe): string {
  return JSON.stringify({
    schemaVersion: recipe.schemaVersion,
    seed: recipe.seed,
    vessel: recipe.vessel,
    character: recipe.character,
    costume: recipe.costume,
    gesture: recipe.gesture,
  });
}

export function recipeHash(recipe: SpecimenRecipe): string {
  let hash = 2166136261 >>> 0;
  for (const char of recipeIdentity(recipe)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash.toString(16).padStart(8, '0');
}

export function branchRecipe(recipe: SpecimenRecipe, id: string, now = Date.now()): SpecimenRecipe {
  const branch = cloneRecipe(recipe);
  branch.id = id;
  branch.parentId = recipe.id;
  branch.createdAt = now;
  return branch;
}
