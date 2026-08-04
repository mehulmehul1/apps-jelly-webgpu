export interface ParameterTaste {
  favorites: number[];
  explicit?: { lower: number; upper: number };
  confidence: number;
  observationCount: number;
}

export interface TasteCombination {
  paths: string[];
  ranges?: Record<string, { lower: number; upper: number }>;
  observationCount: number;
  confidence: number;
}

export interface TasteProfile {
  parameters: Record<string, ParameterTaste>;
  combinations: TasteCombination[];
}

export const EMPTY_TASTE_PROFILE: TasteProfile = { parameters: {}, combinations: [] };

export function recordFavorite(profile: TasteProfile, values: Record<string, number>, combinationPaths: string[] = []): TasteProfile {
  const next: TasteProfile = structuredClone(profile);
  for (const [path, value] of Object.entries(values)) {
    const state = next.parameters[path] ?? { favorites: [], confidence: 0, observationCount: 0 };
    state.favorites.push(value);
    state.observationCount += 1;
    state.confidence = Math.min(1, state.observationCount / 8);
    next.parameters[path] = state;
  }
  if (combinationPaths.length > 1) {
    const paths = [...new Set(combinationPaths)].sort();
    const existing = next.combinations.find((item) => item.paths.join('|') === paths.join('|'));
    if (existing) {
      existing.observationCount += 1;
      existing.confidence = Math.min(1, existing.observationCount / 5);
    } else {
      next.combinations.push({ paths, observationCount: 1, confidence: 0.2 });
    }
  }
  return next;
}

export function setExplicitRange(profile: TasteProfile, path: string, lower: number, upper: number): TasteProfile {
  const next: TasteProfile = structuredClone(profile);
  const state = next.parameters[path] ?? { favorites: [], confidence: 0, observationCount: 0 };
  state.explicit = { lower: Math.min(lower, upper), upper: Math.max(lower, upper) };
  next.parameters[path] = state;
  return next;
}

export function preferredRange(profile: TasteProfile, path: string): { lower: number; upper: number; confidence: number; sampleCount: number } | undefined {
  const state = profile.parameters[path];
  if (!state) return undefined;
  const values = state.favorites;
  const range = state.explicit ?? (values.length >= 2 ? { lower: Math.min(...values), upper: Math.max(...values) } : undefined);
  if (!range) return undefined;
  return { ...range, confidence: state.confidence, sampleCount: state.observationCount };
}
