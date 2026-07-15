import type { CreatureSpec } from '../../jellyfish/creatures/CreatureSpec';
import type { LookConfig } from '../../editor/look-presets';
import type { Vector3 as Vec3 } from 'three';

// ── Supporting types ─────────────────────────────────────────────────────
// These don't exist as standalone modules yet; they'll be extracted later
// once the first concrete archetype (JellyfishArchetype) lands.

/** Seeded pseudo-random number generator (PRNG) interface. */
export interface SeededRNG {
  /** Returns a float in [0, 1). */
  random(): number;
}

/** Top-level physics engine configuration. */
export interface PhysicsConfig {
  readonly timestep: number;
  readonly gravity?: { readonly x: number; readonly y: number; readonly z: number };
}

/** Physics components owned by a body (collision, springs, constraints…). */
export interface PhysicsComponents {
  readonly [key: string]: unknown;
}

/** Aggregated material pack produced by an archetype's `createMaterials`. */
export interface UnitMaterialPack {
  readonly [key: string]: unknown;
}

/** Options forwarded to `buildMeshes`. */
export interface MeshOptions {
  readonly wireframe?: boolean;
  readonly [key: string]: unknown;
}

// ── Body data ────────────────────────────────────────────────────────────

/** Archetype-specific body data returned by `buildBody`. */
export interface BodyData {
  /** Archetype-specific geometry payload — kept opaque. */
  geometryData: unknown;
  /** Physics components attached to this body. */
  physicsComponents: PhysicsComponents;
  /** Named animation channels → current value. */
  animationState: Record<string, number>;
}

// ── Archetype contract ───────────────────────────────────────────────────

/**
 * Every creature archetype (jellyfish, siphonophore, ctenophore, …)
 * must implement this interface.  Archetypes are registered once via
 * {@link registerArchetype} and looked up by `id` at runtime.
 */
export interface CreatureArchetype {
  /** Stable machine-readable identifier (e.g. `"jellyfish"`, `"ctenophore"`). */
  readonly id: string;

  /** Human-readable label shown in UI (e.g. `"Jellyfish"`). */
  readonly label: string;

  /** Build the soft-body data from a spec, physics config and RNG. */
  buildBody(spec: CreatureSpec, config: PhysicsConfig, rng: SeededRNG): BodyData;

  /** Create Three.js meshes from body data. */
  buildMeshes(data: BodyData, materials: UnitMaterialPack, options: MeshOptions): UnitRuntime[];

  /** Create the material pack for a given look and refraction target. */
  createMaterials(lookConfig: LookConfig, refractionTarget: unknown): UnitMaterialPack;

  /** Per-frame body animation (pulse, undulation, …). */
  animateBody(data: BodyData, time: number, delta: number, amplitude: number): void;

  /** Optional: external force response (mouse nudge, current, …). */
  applyInteraction?(data: BodyData, force: number, origin: Vec3): void;

  /** Tear down GPU / physics resources. */
  dispose(data: BodyData): void;
}

/** Minimal runtime unit returned by `buildMeshes`. */
export interface UnitRuntime {
  readonly id: string;
  /** THREE.Group at runtime — typed as unknown to avoid importing Three here. */
  readonly group: unknown;
  readonly [key: string]: unknown;
}
