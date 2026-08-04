export interface GalleryMaterialPart {
  colorA: string;
  colorB?: string;
  opacity: number;
  scale?: number;
  patternScale0?: number;
  patternScale1?: number;
  rimBoost?: number;
  area?: number;
  glow?: boolean;
}

export interface GalleryMaterialRecipe {
  bulb: GalleryMaterialPart;
  gel: GalleryMaterialPart;
  tail: GalleryMaterialPart;
  mouth: GalleryMaterialPart;
  tentacle: GalleryMaterialPart;
  lines: GalleryMaterialPart;
}

export interface MaterialLookPreset {
  id: string;
  label: string;
  description: string;
  recipe: GalleryMaterialRecipe;
}

export const DEFAULT_MATERIAL_RECIPE: GalleryMaterialRecipe = {
  bulb: { colorA: '#FFA9D2', colorB: '#70256C', opacity: 0.78, patternScale0: 1, patternScale1: 1, rimBoost: 1 },
  gel: { colorA: '#415AB5', opacity: 0.28 },
  tail: { colorA: '#E4BBEE', colorB: '#241138', opacity: 0.75, scale: 20 },
  mouth: { colorA: '#EFA6F0', colorB: '#4A67CE', opacity: 0.65, scale: 3 },
  tentacle: { colorA: '#997299', opacity: 0.25, area: 2000, glow: true },
  lines: { colorA: '#F99EBD', opacity: 0.06 },
};

export const MATERIAL_LOOK_PRESETS: MaterialLookPreset[] = [
  {
    id: 'moonlit',
    label: 'Moonlit',
    description: 'Cool glass-blue body with a quiet violet underside.',
    recipe: {
      bulb: { colorA: '#B9E7FF', colorB: '#234C91', opacity: 0.72, patternScale0: 0.8, patternScale1: 1.2, rimBoost: 1.4 },
      gel: { colorA: '#5D8CFF', opacity: 0.22 },
      tail: { colorA: '#B7D8FF', colorB: '#1B275B', opacity: 0.7, scale: 16 },
      mouth: { colorA: '#C5D8FF', colorB: '#536EC5', opacity: 0.58, scale: 3 },
      tentacle: { colorA: '#7DA5F5', opacity: 0.2, area: 1800, glow: true },
      lines: { colorA: '#BBD7FF', opacity: 0.05 },
    },
  },
  {
    id: 'coral',
    label: 'Coral',
    description: 'Warm pinks and ember reds that make the anatomy feel close.',
    recipe: {
      bulb: { colorA: '#FFB18D', colorB: '#8F244C', opacity: 0.8, patternScale0: 1.2, patternScale1: 0.9, rimBoost: 1.1 },
      gel: { colorA: '#FF5E76', opacity: 0.25 },
      tail: { colorA: '#FFC0A8', colorB: '#4D1635', opacity: 0.78, scale: 18 },
      mouth: { colorA: '#FFB0BA', colorB: '#A93768', opacity: 0.68, scale: 3.5 },
      tentacle: { colorA: '#D9657A', opacity: 0.3, area: 2200, glow: true },
      lines: { colorA: '#FFD0B5', opacity: 0.07 },
    },
  },
  {
    id: 'glass',
    label: 'Glass',
    description: 'Pale translucency, low saturation, and a sharp rim.',
    recipe: {
      bulb: { colorA: '#E7FAFF', colorB: '#6677B5', opacity: 0.46, patternScale0: 0.55, patternScale1: 0.7, rimBoost: 2.3 },
      gel: { colorA: '#A3C8FF', opacity: 0.16 },
      tail: { colorA: '#D8E9FF', colorB: '#4C588D', opacity: 0.4, scale: 11 },
      mouth: { colorA: '#D4E8FF', colorB: '#6C84C6', opacity: 0.36, scale: 2 },
      tentacle: { colorA: '#B9D9FF', opacity: 0.14, area: 1400, glow: false },
      lines: { colorA: '#E4F6FF', opacity: 0.12 },
    },
  },
  {
    id: 'violet-bloom',
    label: 'Violet Bloom',
    description: 'Dense violet glow with luminous pink anatomy.',
    recipe: {
      bulb: { colorA: '#F6A6FF', colorB: '#3C126D', opacity: 0.82, patternScale0: 1.5, patternScale1: 1.4, rimBoost: 1.8 },
      gel: { colorA: '#9D45E9', opacity: 0.34 },
      tail: { colorA: '#F09AFF', colorB: '#260D4F', opacity: 0.82, scale: 22 },
      mouth: { colorA: '#FF9FEF', colorB: '#723EBC', opacity: 0.72, scale: 4 },
      tentacle: { colorA: '#D56AF1', opacity: 0.34, area: 2800, glow: true },
      lines: { colorA: '#F6B6FF', opacity: 0.1 },
    },
  },
];

export function cloneMaterialRecipe(recipe: GalleryMaterialRecipe): GalleryMaterialRecipe {
  return structuredClone(recipe);
}

export function mergeMaterialRecipe(base: GalleryMaterialRecipe, patch: Partial<GalleryMaterialRecipe>): GalleryMaterialRecipe {
  return {
    ...cloneMaterialRecipe(base),
    ...Object.fromEntries(Object.entries(patch).map(([part, value]) => [part, { ...base[part as keyof GalleryMaterialRecipe], ...value }])),
  } as GalleryMaterialRecipe;
}

export function hexToNumber(hex: string): number {
  const normalized = hex.replace('#', '');
  return Number.parseInt(normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized, 16);
}
