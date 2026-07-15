import type { LookConfig } from '../../editor/look-presets';
import { BodyPlan } from './BodyPlan';
import type { AttachEmitter } from './AttachEmitters';
import type { RadiusProfileCurve } from './RadiusProfileCurve';
import type { SpineCurve } from './SpineCurve';

export interface RadialLobesSpec {
  /** How many lobes around the circumference (e.g. 8 for comb jelly-ish ridges) */
  count: number;
  /** Amplitude as a fraction of radius (0.0 - 0.6 recommended) */
  amplitude: number;
  /** Phase offset in radians */
  phase?: number;
  /** Where lobes are active along the body, 0..1 (optional) */
  tRange?: [number, number];
}

export interface JellyfishGeometryConfig {
  size: number;
  yOffset: number;

  // Bulb topology
  segmentsCount: number;
  totalSegments: number;
  ribsCount: number;
  ribRadius: number;

  // Tentacles
  tentacleSegments: number;
  tentacleSegmentLength: number;
  tentacleWeightFactor: number;

  // Tail ribs
  tailRibsCount: number;
  tailRibRadiusFactor: number;
  tailLinkOffset: number;

  // Mouth arms (reuses tail arm params)
  tailArmSegments: number;
  tailArmSegmentLength: number;
  tailArmWeight: number;
}

// ──────────────────────────────────────────
// Base interface — fields shared by ALL archetypes
// ──────────────────────────────────────────
export interface CreatureSpecBase {
  id: string;
  archetypeId: string;
  bodyPlan: BodyPlan;

  /**
   * Symmetry intent. This doesn't force strict symmetry everywhere; it provides
   * defaults + guardrails that other modules can opt into.
   */
  symmetry?: {
    kind: 'radial' | 'bilateral' | 'spiral';
    /** For radial symmetry (5 = echinoderm, 8 = sponge lattice vibe, 12 = anemone crown, etc.) */
    order: number;
    /**
     * 0 = perfect symmetry, 1 = very broken.
     * Used as a "controlled imperfection" dial by modules that support it.
     */
    breaking?: number;
    phase?: number;
  };

  /** Optional xz-offset spine curve (creates huge silhouette variety with minimal topology changes) */
  spine?: SpineCurve;

  /**
   * Cross-section shaping. This is the main "stop looking like a bulb" lever:
   * a medusa ring lattice can look tubular, ribbon-like, star-ish, etc, by
   * breaking the circular cross-section into ellipse/superformula silhouettes.
   */
  crossSection?: {
    kind: 'circle' | 'ellipse' | 'superformula';
    /** Base rotation in radians */
    rotation?: number;
    /** Twist amount in radians across t=0..1 (added to rotation per rib) */
    twist?: number;

    // Ellipse
    xScale?: number;
    zScale?: number;

    // Superformula (see: Johan Gielis). Values are clamped in validate().
    superformula?: {
      /** lobes/arms, e.g. 5 for star-ish, 8 for comb-ish */
      m: number;
      a?: number;
      b?: number;
      n1: number;
      n2: number;
      n3: number;
    };
  };

  /** Topology toggles (caps, etc). */
  topology?: {
    /** Close the very top with a fan (default: true except Salp) */
    capTop?: boolean;
  };

  /** Surface shaping modules */
  surface?: {
    /** Rim ruffles / frills */
    frill?: {
      amplitude: number;
      frequency: number;
      tRange?: [number, number];
      phase?: number;
    };
    /** Longitudinal ridges (comb rows, sponge lattices). Implemented as a lobe-like modulation. */
    ridges?: {
      count: number;
      amplitude: number;
      tRange?: [number, number];
      phase?: number;
    };
    /**
     * "Cells" are mostly a material concept for now (UV/pattern decisions).
     * We keep the spec to unlock future tessellation geometry.
     */
    cells?: {
      scale: number;
      warp: number;
    };
  };

  /** Enable/disable major anatomy pieces without having to push counts to zero */
  features?: {
    tail?: boolean;
    mouth?: boolean;
    tentacles?: boolean;
  };

  /** Optional look override applied on top of the current LookConfig */
  look?: Partial<LookConfig>;

  /** Soft limits to keep creatures in a "pretty" budget */
  budget?: {
    maxParticles?: number;
    maxTentacleGroups?: number;
  };
}

// ──────────────────────────────────────────
// Jellyfish — full spec with ALL existing fields (backward compat)
// ──────────────────────────────────────────
export interface JellyfishSpec extends CreatureSpecBase {
  archetypeId: 'jellyfish';

  /** Geometry config (merged with defaults) */
  geometry?: Partial<JellyfishGeometryConfig>;

  /** Radius profiles controlling silhouette */
  profiles?: {
    bulb?: RadiusProfileCurve;
    tail?: RadiusProfileCurve;
  };

  /** Optional radial lobes (comb jelly ridges, frills) */
  lobes?: RadialLobesSpec;

  /** Attachment emitter specs (first-class) */
  emitters?: {
    tentacles?: AttachEmitter;
  };

  /** Colony config (siphonophore) */
  colony?: {
    count: number;
    spacing: number;
    /** Down-chain scale multiplier (1 = no change) */
    scaleDecay?: number;
    layout?: 'chain' | 'arc' | 'helix' | 'cluster' | 'sheet';
    arc?: { radius: number; angle: number };
    helix?: { radius: number; turns: number };
    cluster?: { radius: number };
    sheet?: { rows: number; cols: number; spacingX: number; spacingY: number };
  };
}

// ──────────────────────────────────────────
// Fish — minimal stub
// ──────────────────────────────────────────
export interface FishSpec extends CreatureSpecBase {
  archetypeId: 'fish';
}

// ──────────────────────────────────────────
// Anemone — minimal stub
// ──────────────────────────────────────────
export interface AnemoneSpec extends CreatureSpecBase {
  archetypeId: 'anemone';
}

// ──────────────────────────────────────────
// Discriminated union
// ──────────────────────────────────────────
export type CreatureSpec = JellyfishSpec | FishSpec | AnemoneSpec;

export const DEFAULT_GEOMETRY_CONFIG: JellyfishGeometryConfig = {
  size: 40,
  yOffset: 20,

  segmentsCount: 4,
  totalSegments: 36,
  ribsCount: 20,
  ribRadius: 15,

  tentacleSegments: 120,
  tentacleSegmentLength: 1.5,
  tentacleWeightFactor: 1.25,

  tailRibsCount: 15,
  tailRibRadiusFactor: 20,
  tailLinkOffset: 2,

  tailArmSegments: 100,
  tailArmSegmentLength: 1,
  tailArmWeight: 0.5,
};

export function resolveGeometryConfig(spec: JellyfishSpec): JellyfishGeometryConfig {
  return {
    ...DEFAULT_GEOMETRY_CONFIG,
    ...(spec.geometry ?? {}),
  };
}
