/**
 * Materials module index
 * 
 * Exports all jellyfish material classes and related types
 */

export {
  InterpolatedNodeMaterial,
  InterpolatedStandardMaterial,
  InterpolatedPhysicalMaterial,
  InterpolatedLineMaterial,
  InterpolatedPointsMaterial,
  type InterpolatedMaterial
} from './InterpolatedNodeMaterial';

export {
  BulbNodeMaterial,
  type BulbMaterialUniforms
} from './BulbNodeMaterial';

export {
  TentacleNodeMaterial,
  type TentacleNodeMaterialParameters
} from './TentacleNodeMaterial';

export {
  TailNodeMaterial,
  type TailMaterialUniforms
} from './TailNodeMaterial';

export {
  GelNodeMaterial,
  type GelMaterialUniforms
} from './GelNodeMaterial';

export {
  DustNodeMaterial,
  createDustTexture,
  createDustGeometry,
  createDustSystem,
  type DustNodeMaterialParameters
} from './DustNodeMaterial';
