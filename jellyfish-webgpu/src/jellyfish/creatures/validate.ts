import { BodyPlan } from './BodyPlan';
import type { CreatureSpec, JellyfishGeometryConfig } from './CreatureSpec';
import { DEFAULT_GEOMETRY_CONFIG, resolveGeometryConfig } from './CreatureSpec';

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v | 0));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function clampFinite(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return clamp(v, min, max);
}

export function estimateParticlesForConfig(cfg: JellyfishGeometryConfig, tentacleGroupCount: number): number {
  const core = 8;

  const bulb = cfg.ribsCount * cfg.totalSegments;
  const tail = cfg.tailRibsCount * cfg.totalSegments;

  // Tentacles: each segment is a ring (totalSegments particles)
  const tentacles = tentacleGroupCount * cfg.tentacleSegments * cfg.totalSegments;

  // Mouth arms: roughly 2 points per segment (inner+outer), times ~13 arms from legacy generator
  // This is a coarse bound; exact depends on mouth logic.
  const approxMouthArms = 13;
  const mouth = approxMouthArms * cfg.tailArmSegments * 2;

  return core + bulb + tail + tentacles + mouth;
}

export interface ValidationResult {
  spec: CreatureSpec;
  warnings: string[];
}

/**
 * Clamp + sanitize a CreatureSpec to stay within safe aesthetic/perf limits.
 * This is intentionally conservative: better "pretty + stable" than "explode".
 */
export function validateCreatureSpec(input: CreatureSpec): ValidationResult {
  const warnings: string[] = [];

  const spec: CreatureSpec = structuredClone(input);
  const cfg = resolveGeometryConfig(spec);

  // Basic topology sanity
  cfg.totalSegments = clampInt(cfg.totalSegments, 12, 96);
  cfg.segmentsCount = clampInt(cfg.segmentsCount, 1, 12);
  cfg.ribsCount = clampInt(cfg.ribsCount, 6, 60);
  cfg.tailRibsCount = clampInt(cfg.tailRibsCount, 0, 80);
  cfg.size = clamp(cfg.size, 10, 120);
  cfg.ribRadius = clamp(cfg.ribRadius, 2, 40);
  cfg.tailRibRadiusFactor = clamp(cfg.tailRibRadiusFactor, 0, 60);

  cfg.tentacleSegments = clampInt(cfg.tentacleSegments, 0, 220);
  cfg.tentacleSegmentLength = clamp(cfg.tentacleSegmentLength, 0.25, 4.0);
  cfg.tentacleWeightFactor = clamp(cfg.tentacleWeightFactor, 0.1, 4.0);

  cfg.tailArmSegments = clampInt(cfg.tailArmSegments, 0, 180);
  cfg.tailArmSegmentLength = clamp(cfg.tailArmSegmentLength, 0.25, 3.0);
  cfg.tailArmWeight = clamp(cfg.tailArmWeight, 0.05, 2.0);

  // Lobes sanity
  if (spec.lobes) {
    spec.lobes.count = clampInt(spec.lobes.count, 0, 24);
    spec.lobes.amplitude = clamp(spec.lobes.amplitude, 0, 0.6);
    if (spec.lobes.tRange) {
      const a = clamp(spec.lobes.tRange[0], 0, 1);
      const b = clamp(spec.lobes.tRange[1], 0, 1);
      spec.lobes.tRange = [Math.min(a, b), Math.max(a, b)];
    }
  }

  // Symmetry sanity
  if (spec.symmetry) {
    spec.symmetry.order = clampInt(spec.symmetry.order, 1, 24);
    spec.symmetry.breaking = clamp(spec.symmetry.breaking ?? 0, 0, 1);
    spec.symmetry.phase = clamp(spec.symmetry.phase ?? 0, -Math.PI * 4, Math.PI * 4);
  }

  // Surface sanity
  if (spec.surface?.frill) {
    spec.surface.frill.amplitude = clamp(spec.surface.frill.amplitude, 0, 0.8);
    spec.surface.frill.frequency = clamp(spec.surface.frill.frequency, 0, 64);
  }
  if (spec.surface?.ridges) {
    spec.surface.ridges.count = clampInt(spec.surface.ridges.count, 0, 32);
    spec.surface.ridges.amplitude = clamp(spec.surface.ridges.amplitude, 0, 0.6);
  }
  if (spec.surface?.cells) {
    spec.surface.cells.scale = clamp(spec.surface.cells.scale, 0.1, 20);
    spec.surface.cells.warp = clamp(spec.surface.cells.warp, 0, 2);
  }

  // Cross-section sanity (this feeds directly into trig + pow; keep it stable)
  if (spec.crossSection) {
    const cs = spec.crossSection;
    cs.rotation = clampFinite(cs.rotation ?? 0, -Math.PI * 8, Math.PI * 8, 0);
    cs.twist = clampFinite(cs.twist ?? 0, -Math.PI * 12, Math.PI * 12, 0);

    if (cs.kind === 'ellipse') {
      cs.xScale = clampFinite(cs.xScale ?? 1.0, 0.15, 3.0, 1.0);
      cs.zScale = clampFinite(cs.zScale ?? 1.0, 0.15, 3.0, 1.0);
    }

    if (cs.kind === 'superformula') {
      cs.superformula = cs.superformula ?? { m: 5, n1: 0.35, n2: 0.35, n3: 0.35, a: 1, b: 1 };
      const sf = cs.superformula;
      sf.m = clampInt(sf.m, 0, 24);
      sf.a = clampFinite(sf.a ?? 1.0, 0.1, 2.0, 1.0);
      sf.b = clampFinite(sf.b ?? 1.0, 0.1, 2.0, 1.0);
      sf.n1 = clampFinite(sf.n1, 0.05, 5.0, 0.35);
      sf.n2 = clampFinite(sf.n2, 0.05, 5.0, 0.35);
      sf.n3 = clampFinite(sf.n3, 0.05, 5.0, 0.35);
    }

    if (cs.kind === 'circle') {
      cs.xScale = undefined;
      cs.zScale = undefined;
      cs.superformula = undefined;
    }
  }

  // Topology toggles
  if (spec.topology) {
    // Default capTop intent is bodyPlan-dependent; if explicitly set we preserve it.
    if (typeof spec.topology.capTop !== 'boolean') {
      spec.topology.capTop = spec.bodyPlan !== BodyPlan.Salp;
    }
  } else {
    spec.topology = { capTop: spec.bodyPlan !== BodyPlan.Salp };
  }

  // Colony sanity
  if (spec.bodyPlan === BodyPlan.Siphonophore) {
    spec.colony = spec.colony ?? { count: 4, spacing: 30, scaleDecay: 0.92 };
    spec.colony.count = clampInt(spec.colony.count, 2, 12);
    spec.colony.spacing = clamp(spec.colony.spacing, 10, 120);
    spec.colony.scaleDecay = clamp(spec.colony.scaleDecay ?? 0.92, 0.7, 1.0);
    spec.colony.layout = spec.colony.layout ?? 'chain';
    if (spec.colony.arc) {
      spec.colony.arc.radius = clamp(spec.colony.arc.radius, 10, 250);
      spec.colony.arc.angle = clamp(spec.colony.arc.angle, -Math.PI * 2, Math.PI * 2);
    }
    if (spec.colony.helix) {
      spec.colony.helix.radius = clamp(spec.colony.helix.radius, 0, 250);
      spec.colony.helix.turns = clamp(spec.colony.helix.turns, 0, 12);
    }
    if (spec.colony.cluster) {
      spec.colony.cluster.radius = clamp(spec.colony.cluster.radius, 0, 300);
    }
    if (spec.colony.sheet) {
      spec.colony.sheet.rows = clampInt(spec.colony.sheet.rows, 1, 8);
      spec.colony.sheet.cols = clampInt(spec.colony.sheet.cols, 1, 8);
      spec.colony.sheet.spacingX = clamp(spec.colony.sheet.spacingX, 5, 200);
      spec.colony.sheet.spacingY = clamp(spec.colony.sheet.spacingY, 5, 200);
    }
  } else {
    spec.colony = undefined;
  }

  // Tentacle emitter sanity: clamp group counts in budget
  const maxTentacleGroups = spec.budget?.maxTentacleGroups ?? 8;
  const emitter = spec.emitters?.tentacles;
  if (emitter?.kind === 'legacy_tentacles') {
    emitter.groupCount = clampInt(emitter.groupCount, 0, maxTentacleGroups);
  }
  if (emitter?.kind === 'band') {
    emitter.groupCount = clampInt(emitter.groupCount, 0, maxTentacleGroups);
    emitter.jitter = clampInt(emitter.jitter ?? 0, 0, 4);
  }
  if (emitter?.kind === 'spiral') {
    emitter.groupCount = clampInt(emitter.groupCount, 0, maxTentacleGroups);
    emitter.pitch = clamp(emitter.pitch, -12, 12);
    emitter.jitter = clampInt(emitter.jitter ?? 0, 0, 4);
  }
  if (emitter?.kind === 'phyllotaxis') {
    emitter.groupCount = clampInt(emitter.groupCount, 0, maxTentacleGroups);
    emitter.golden = clamp(emitter.golden ?? 1.0, 0.25, 2.5);
    emitter.jitter = clampInt(emitter.jitter ?? 0, 0, 4);
  }
  if (emitter?.kind === 'vortexStreet') {
    emitter.groupCount = clampInt(emitter.groupCount, 0, maxTentacleGroups);
    emitter.jitter = clampInt(emitter.jitter ?? 0, 0, 4);
  }
  if (emitter?.kind === 'explicit') {
    emitter.ribs = emitter.ribs.slice(0, maxTentacleGroups);
  }

  // Particle budget
  const maxParticles = spec.budget?.maxParticles ?? 9000;
  // Rough tentacle group count guess for estimating budget
  const tentacleGroupGuess =
    emitter?.kind === 'explicit'
      ? emitter.ribs.length
      : emitter?.kind === 'band'
        ? emitter.groupCount
        : emitter?.kind === 'legacy_tentacles'
          ? emitter.groupCount
          : 3;

  let estimate = estimateParticlesForConfig(cfg, tentacleGroupGuess);
  if (estimate > maxParticles) {
    // First cut: reduce tentacle segments, then ribs.
    const ratio = maxParticles / Math.max(1, estimate);
    cfg.tentacleSegments = Math.floor(cfg.tentacleSegments * ratio);
    estimate = estimateParticlesForConfig(cfg, tentacleGroupGuess);

    if (estimate > maxParticles) {
      cfg.ribsCount = Math.max(8, Math.floor(cfg.ribsCount * ratio));
      cfg.tailRibsCount = Math.floor(cfg.tailRibsCount * ratio);
    }

    warnings.push(
      `Particle budget exceeded (est ${estimate.toFixed(0)} > ${maxParticles}); clamped topology.`
    );
  }

  spec.geometry = {
    ...DEFAULT_GEOMETRY_CONFIG,
    ...cfg,
  };

  return { spec, warnings };
}
