import { BODY_TWEAKS, ORDER_FAMILIES, SECTION_FAMILIES, SURFACE_TREATMENTS, type Tweak } from '../vesselCatalog';
import { CHARACTER_TWEAKS } from '../characterCatalog';

export type ParameterKind = 'continuous' | 'integer' | 'boolean' | 'choice';
export type ParameterLayer = 'vessel' | 'character' | 'costume' | 'gesture';

export interface ParameterChoice {
  id: string;
  label: string;
  description: string;
  value: number | string;
}

export interface ParameterDescriptor {
  path: string;
  artistLabel: string;
  technicalLabel: string;
  description: string;
  layer: ParameterLayer;
  group: string;
  kind: ParameterKind;
  min: number;
  max: number;
  step: number;
  fmt?: (value: number) => string;
  choices?: ParameterChoice[];
  studyable: boolean;
}

const artistNames: Record<string, [string, string]> = {
  size: ['bell scale', 'geometry.size'], ribsCount: ['body ribs', 'geometry.ribsCount'], totalSegments: ['surface resolution', 'geometry.totalSegments'], ribRadius: ['body fullness', 'geometry.ribRadius'], twist: ['turning motion', 'crossSection.twist'], symmetryOrder: ['order', 'symmetry.order'], symmetryBreaking: ['organic irregularity', 'symmetry.breaking'],
  tailLength: ['tail reach', 'character.tail.length'], tailRibs: ['tail rhythm', 'character.tail.ribs'], tailRadius: ['tail weight', 'character.tail.radiusFactor'], tailLink: ['tail articulation', 'character.tail.linkOffset'],
  tentacleCount: ['tendril density', 'character.tentacles.count'], tentacleSegments: ['tendril resolution', 'character.tentacles.segments'], tentacleWeight: ['tendril weight', 'character.tentacles.weight'], tentacleStyle: ['tendril weave', 'character.tentacles.style'],
  mouthSize: ['mouth presence', 'character.mouth.size'], mouthArmLength: ['mouth reach', 'character.mouth.armLength'], mouthArmWeight: ['mouth weight', 'character.mouth.armWeight'], hue: ['color temperature', 'costume.hue'], sat: ['color intensity', 'costume.saturation'],
  spineCurve: ['body gesture', 'gesture.spine.curve'], spineFreq: ['gesture rhythm', 'gesture.spine.frequency'], colonyCount: ['colony abundance', 'gesture.colony.count'], colonySpacing: ['colony spacing', 'gesture.colony.spacing'], colonyScaleDecay: ['colony taper', 'gesture.colony.scaleDecay'],
};

function descriptor(t: Tweak, layer: ParameterLayer, group: string, key = t.key): ParameterDescriptor {
  const [artistLabel, technicalLabel] = artistNames[key] ?? [t.label, `${layer}.${key}`];
  return { path: technicalLabel, artistLabel, technicalLabel, description: `Tune ${t.label} across its safe procedural range.`, layer, group, kind: t.step >= 1 && Number.isInteger(t.min) && Number.isInteger(t.max) ? 'integer' : 'continuous', min: t.min, max: t.max, step: t.step, fmt: t.fmt, studyable: true };
}

function choice(path: string, artistLabel: string, technicalLabel: string, description: string, layer: ParameterLayer, group: string, choices: ParameterChoice[]): ParameterDescriptor {
  return { path, artistLabel, technicalLabel, description, layer, group, kind: 'choice', min: 0, max: choices.length - 1, step: 1, choices, studyable: true };
}

export const PARAMETER_REGISTRY: ParameterDescriptor[] = [
  ...BODY_TWEAKS.map((t) => descriptor(t, 'vessel', 'Body')),
  ...ORDER_FAMILIES.flatMap((family) => family.tweaks.map((t) => descriptor(t, 'vessel', family.label, t.key))),
  ...SECTION_FAMILIES.flatMap((family) => family.tweaks.map((t) => descriptor(t, 'vessel', family.label, t.key))),
  ...SURFACE_TREATMENTS.flatMap((surface) => surface.tweaks.map((t) => descriptor(t, 'vessel', surface.label, t.key))),
  ...CHARACTER_TWEAKS.filter((t) => t.key !== 'tentacleStyle').map((t) => descriptor(t, 'character', t.key.startsWith('tail') ? 'Tail' : t.key.startsWith('tentacle') ? 'Tentacles' : 'Mouth')),
  choice('character.tentacles.style', 'tendril weave', 'character.tentacles.style', 'Choose curtain or tube construction.', 'character', 'Tentacles', [
    { id: 'curtain', label: 'Curtain', description: 'A soft merged veil of tendrils.', value: 0 },
    { id: 'tube', label: 'Tube', description: 'Separate articulated tendril tubes.', value: 1 },
  ]),
  choice('vessel.order', 'silhouette family', 'vessel.order', 'Choose the primary body mold.', 'vessel', 'Silhouette', ORDER_FAMILIES.map((family) => ({ id: family.id, label: family.label, description: family.description, value: family.id }))),
  choice('vessel.section', 'cross-section', 'vessel.section', 'Choose the radial mold.', 'vessel', 'Cross-section', SECTION_FAMILIES.map((family) => ({ id: family.id, label: family.label, description: family.description, value: family.id }))),
  choice('vessel.surface', 'surface treatment', 'vessel.surface', 'Choose the skin rhythm.', 'vessel', 'Surface', SURFACE_TREATMENTS.map((surface) => ({ id: surface.id, label: surface.label, description: surface.description, value: surface.id }))),
  descriptor({ key: 'hue', label: 'hue', min: 0, max: 360, step: 1, fmt: (v) => `${Math.round(v)}°` }, 'costume', 'Palette'),
  descriptor({ key: 'sat', label: 'saturation', min: 30, max: 90, step: 1, fmt: (v) => `${Math.round(v)}%` }, 'costume', 'Palette'),
  descriptor({ key: 'spineCurve', label: 'spine curve', min: 0, max: 1, step: 0.05 }, 'gesture', 'Spine'),
  descriptor({ key: 'spineFreq', label: 'spine frequency', min: 0.5, max: 3, step: 0.1 }, 'gesture', 'Spine'),
  descriptor({ key: 'colonyCount', label: 'colony count', min: 1, max: 12, step: 1 }, 'gesture', 'Colony'),
  descriptor({ key: 'colonySpacing', label: 'colony spacing', min: 1, max: 5, step: 0.1 }, 'gesture', 'Colony'),
  descriptor({ key: 'colonyScaleDecay', label: 'colony taper', min: 0.7, max: 1, step: 0.01 }, 'gesture', 'Colony'),
  choice('gesture.colony.layout', 'colony layout', 'gesture.colony.layout', 'Choose how units arrange in space.', 'gesture', 'Colony', ['chain', 'arc', 'helix', 'cluster', 'sheet'].map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1), description: `Arrange the colony as a ${id}.`, value: id }))),
];

export function parameterByKey(key: string): ParameterDescriptor | undefined { return PARAMETER_REGISTRY.find((parameter) => parameter.path.endsWith(`.${key}`)); }
export function parameterByPath(path: string): ParameterDescriptor | undefined { return PARAMETER_REGISTRY.find((parameter) => parameter.path === path); }
export function parametersForLayer(layer: ParameterLayer): ParameterDescriptor[] { return PARAMETER_REGISTRY.filter((parameter) => parameter.layer === layer); }
export function clampParameterValue(parameter: ParameterDescriptor, value: number): number { const clamped = Math.max(parameter.min, Math.min(parameter.max, value)); const steps = Math.round((clamped - parameter.min) / parameter.step); return parameter.min + steps * parameter.step; }
