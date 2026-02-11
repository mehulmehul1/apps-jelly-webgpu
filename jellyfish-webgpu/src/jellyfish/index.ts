/**
 * Jellyfish module index
 * 
 * Exports all jellyfish-related classes and types
 */

export {
  JellyfishGeometry,
  type JellyfishGeometryData,
  type RibData,
  type SkinData,
  type TentacleGroup,
} from './JellyfishGeometry';

export {
  JellyfishRenderer,
  type RendererType,
} from './JellyfishRenderer';

// Re-export materials
export {
  InterpolatedNodeMaterial,
  InterpolatedStandardMaterial,
  InterpolatedPhysicalMaterial,
  InterpolatedLineMaterial,
  InterpolatedPointsMaterial,
  type InterpolatedMaterial
} from './materials';
