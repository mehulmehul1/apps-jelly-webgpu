/**
 * Physics Bridge Module
 * 
 * Exports the interpolation system and physics bridge for connecting
 * Particulate.js physics with WebGPU rendering.
 */

export { InterpolationSystem } from './InterpolationSystem';
export type { InterpolationSystemConfig, PhysicsTickCallback } from './InterpolationSystem';
export { PhysicsBridge } from './PhysicsBridge';
export type { PhysicsSystemInterface, BufferAttributes } from './PhysicsBridge';
