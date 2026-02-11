/**
 * Post-processing module for jellyfish effects
 *
 * Exports:
 * - JellyfishPostProcessing - TSL post-processing pipeline with bloom
 * - BloomConfig - Configuration interface for bloom parameters
 * - PostProcessingConfig - Main configuration interface
 * - LensDirtEffect - Lens dirt particle effect for interactions
 * - LensDirtConfig - Configuration for lens dirt effect
 * - createLensDirtTexture - Procedural texture generator
 * - createVignetteNode - TSL vignette effect function
 * - VignetteEffect - Class for runtime vignette management
 * - VignetteConfig - Configuration for vignette effect
 */

export {
  JellyfishPostProcessing,
  type BloomConfig,
  type PostProcessingConfig,
} from './JellyfishPostProcessing';

export {
  LensDirtEffect,
  type LensDirtConfig,
} from './LensDirtEffect';

export {
  createLensDirtTexture,
  type LensDirtTextureConfig,
} from './LensDirtTexture';

export {
  createVignetteNode,
  VignetteEffect,
  type VignetteConfig,
} from './VignetteNode';

export { default } from './JellyfishPostProcessing';
