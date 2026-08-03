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
  /** Multiplier on each lobe sphere's radius (0.5 - 2.5; 1 = spheres sized by amplitude) */
  radiusScale?: number;
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

  /** Tentacle rendering style: 'curtain' = one merged mesh, 'tube' = separate meshes per group */
  tentacleStyle?: 'curtain' | 'tube';

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
// Anemone — column + tentacle crown
// ──────────────────────────────────────────
export interface AnemoneSpec extends CreatureSpecBase {
  archetypeId: 'anemone';
  bodyPlan: BodyPlan.Anemone;

  /** Stalk geometry */
  stalk: {
    height: number;
    width: number;
    segments: number;
    taper: number; // 0 = column, 1 = cone, negative = bulge
  };
  /** Tentacle crown */
  tentacles: {
    count: number;
    length: number;
    thickness: number;
    /** Radial arrangement: 'ring' | 'rows' | 'random' */
    arrangement: 'ring' | 'rows' | 'random';
    /** Number of rows if arrangement === 'rows' */
    rows?: number;
  };
  /** Sway animation parameters */
  sway: {
    amplitude: number;
    frequency: number;
    phase: number;
  };
  /** Base disc shape */
  baseShape: 'flat' | 'conical' | 'columnar';

  // ════════════════════════════════════════════════════════════════════
  // Tier 1: Anatomical Accuracy Extensions
  // ════════════════════════════════════════════════════════════════════

  /** Mesentery system (internal radial septa) */
  mesenteries?: {
    /** Number of mesentery cycles (hexamerous: 6, 12, 24, 48...) */
    cycles: number;
    /** How many cycles reach the actinopharynx (typically 1) */
    perfectCycles: number;
    /** Retractor muscle morphology */
    retractorType: 'diffuse' | 'restricted' | 'circumscribed' | 'palmate';
    /** Mesogleal thickness fraction (0.0-1.0) */
    mesoglealThickness: number;
  };

  /** Sphincter muscle at oral disc margin */
  sphincter?: {
    /** Sphincter type (affects constraint topology & strength) */
    type: 'endodermal' | 'mesogleal' | 'absent' | 'marginal';
    /** Contraction strength 0.0-1.0 (constraint tightness) */
    strength: number;
    /** Position along column */
    position: 'margin' | 'capitulum';
  };

  /** Column region differentiation */
  columnRegions?: {
    /** Lower column (stiff, verrucae-bearing) height ratio */
    scapusHeightRatio: number;
    /** Mid column (muscular, retractor attachments) height ratio */
    scapulusHeightRatio: number;
    /** Upper column (flexible, flexible) height ratio */
    capitulumHeightRatio: number;
    /** Adhesive verrucae on scapus */
    verrucae?: {
      present: boolean;
      density: number;    // particles per unit area
      rows: number;       // longitudinal rows
    };
  };

  /** Oral disc anatomy */
  oralDisc?: {
    /** Mouth opening width 0.0-1.0 */
    mouthGape: number;
    /** Peristome elevation */
    peristomeHeight: number;
    /** Number of siphonoglyphs (ciliated grooves) */
    siphonoglyphs: 1 | 2 | 3;
    /** Actinopharynx depth (internal) */
    actinopharynxDepth: number;
  };

  /** Acontia (defensive thread organs) */
  acontia?: {
    present: boolean;
    /** Number of cinclide rows on column */
    cinclideRows: number;
    /** Nematocyst density on acontia */
    nematocystDensity: number;
    /** Ejection force multiplier */
    ejectionForce: number;
  };
}

// ──────────────────────────────────────────
// Coral — branching particle-spring colony
// ──────────────────────────────────────────
export interface CoralSpec extends CreatureSpecBase {
  archetypeId: 'coral';
  bodyPlan: BodyPlan.Coral;

  /** Branching growth parameters */
  growth: {
    /** Maximum branching depth (3-8) */
    maxGenerations: number;
    /** Total branch count cap */
    maxBranches: number;
    /** Length of each branch segment in world units */
    segmentLength: number;
    /** Bifurcation angle in radians */
    bifurcationAngle: number;
    /** How strongly branches bend toward light (0-1) */
    phototropism: number;
    /** Random noise in growth direction (0-1) */
    randomFactor: number;
  };

  /**
   * Resource field parameters — Kaandorp & Merks accretive growth model.
   *
   * Growth potential at each tip is: c_total = (1-α)·c_nutrient + α·c_light
   * where c_light is computed from ray-occlusion toward the light source and
   * c_nutrient is a diffusion-distance proxy from the colony base.
   *
   * Branching emerges spontaneously (Merks 2003) when c_total exceeds the
   * bifurcation threshold — tips well-supplied by the Laplacian resource
   * field grow faster and bifurcate, while sheltered tips stall.
   */
  resources: {
    /**
     * Light contribution weight α ∈ [0,1].
     * 0 = growth driven entirely by nutrient diffusion,
     * 1 = growth driven entirely by light exposure.
     */
    alpha: number;
    /** Ambient light fraction — minimum light even when occluded. */
    ambientLight: number;
    /**
     * Diffusion length — how far nutrients travel from the base.
     * Long → thin, open, lacy branching (high Péclet equivalent).
     * Short → compact, dense, spherical growth (low Péclet equivalent).
     * Maps to the Merks compactness parameter via Péclet number.
     */
    diffusionLength: number;
    /** Growth rate multiplier G — scales all deposition. */
    growthRate: number;
    /**
     * Resource threshold for spontaneous bifurcation.
     * Lower = branches split more readily.
     * The Laplacian instability naturally concentrates resources at
     * exposed tips, so bifurcation happens even with moderate thresholds.
     */
    bifurcationThreshold: number;
  };

  /** Colony morphology */
  morphology: {
    /** Overall growth habit — biases the base growth direction field */
    growthAxis: 'vertical' | 'fan' | 'hemispherical' | 'encrusting';
    /** Branch density / compactness (0=open lacy, 1=dense) */
    compactness: number;
    /** Base branch thickness in world units */
    branchThickness: number;
    /** Taper from base to tip (0=uniform tube, 1=strong taper) */
    taper: number;
    /** Particles per branch chain (2-6) */
    segmentsPerBranch: number;
  };

  /** Sway animation */
  sway: {
    amplitude: number;
    frequency: number;
  };
}

// ──────────────────────────────────────────
// Discriminated union
// ──────────────────────────────────────────
export type CreatureSpec = JellyfishSpec | AnemoneSpec | CoralSpec;

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
