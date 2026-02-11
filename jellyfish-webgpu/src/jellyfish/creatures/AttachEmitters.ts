export type AttachEmitter =
  | {
      kind: 'legacy_tentacles';
      groupCount: number;
      groupStartRib: number;
      groupRibOffset: number;
    }
  | {
      kind: 'band';
      /** Number of groups to attach */
      groupCount: number;
      /** Inclusive rib range */
      ribRange: [start: number, end: number];
      /** Optional jitter in ribs */
      jitter?: number;
    }
  | {
      kind: 'spiral';
      groupCount: number;
      ribRange: [start: number, end: number];
      /** Spiral pitch as ribs-per-group (can be fractional) */
      pitch: number;
      jitter?: number;
    }
  | {
      kind: 'phyllotaxis';
      groupCount: number;
      ribRange: [start: number, end: number];
      /** Golden-angle multiplier; 1.0 is the canonical distribution */
      golden?: number;
      jitter?: number;
    }
  | {
      kind: 'vortexStreet';
      groupCount: number;
      /** Two rib bands to alternate between */
      bandA: [start: number, end: number];
      bandB: [start: number, end: number];
      jitter?: number;
    }
  | {
      kind: 'explicit';
      ribs: number[];
    };

export interface ResolvedTentacleGroups {
  ribIndices: number[];
}

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v | 0));
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Resolve tentacle attachment ribs (one rib per group).
 * Note: ribs are indices into the *bulb* ribs (not tail ribs).
 */
export function resolveTentacleGroups(
  emitter: AttachEmitter | undefined,
  opts: {
    rng: () => number;
    ribCount: number;
  }
): ResolvedTentacleGroups {
  const rng = opts.rng;
  const ribsCount = opts.ribCount;

  const em: AttachEmitter =
    emitter ??
    ({
      kind: 'legacy_tentacles',
      groupCount: 3,
      groupStartRib: 6,
      groupRibOffset: 4,
    } satisfies AttachEmitter);

  if (em.kind === 'explicit') {
    const ribIndices = em.ribs.map((r) => clampInt(r, 0, Math.max(0, ribsCount - 1)));
    return { ribIndices };
  }

  if (em.kind === 'legacy_tentacles') {
    const ribIndices: number[] = [];
    for (let i = 0; i < em.groupCount; i++) {
      ribIndices.push(clampInt(em.groupStartRib + em.groupRibOffset * i, 0, Math.max(0, ribsCount - 1)));
    }
    return { ribIndices };
  }

  const ribIndices: number[] = [];

  const resolveRange = (range: [number, number]) => {
    const [startRaw, endRaw] = range;
    const start = clampInt(Math.min(startRaw, endRaw), 0, Math.max(0, ribsCount - 1));
    const end = clampInt(Math.max(startRaw, endRaw), 0, Math.max(0, ribsCount - 1));
    return { start, end, span: Math.max(1, end - start) };
  };

  const applyJitter = (rib: number, jitter: number | undefined) => {
    const j = Math.max(0, (jitter ?? 0) | 0);
    if (j > 0) rib += randInt(rng, -j, j);
    return clampInt(rib, 0, Math.max(0, ribsCount - 1));
  };

  if (em.kind === 'band') {
    const { start, span } = resolveRange(em.ribRange);
    const groupCount = Math.max(0, em.groupCount | 0);
    if (groupCount === 0) return { ribIndices: [] };

    for (let i = 0; i < groupCount; i++) {
      const t = groupCount === 1 ? 0.5 : i / (groupCount - 1);
      const rib = Math.round(start + t * span);
      ribIndices.push(applyJitter(rib, em.jitter));
    }
    return { ribIndices };
  }

  if (em.kind === 'spiral') {
    const { start, end, span } = resolveRange(em.ribRange);
    const groupCount = Math.max(0, em.groupCount | 0);
    if (groupCount === 0) return { ribIndices: [] };

    for (let i = 0; i < groupCount; i++) {
      const t = groupCount === 1 ? 0.5 : i / (groupCount - 1);
      // Move along the range, plus a pitch term to keep it "spiraling" in index space.
      const base = start + t * span;
      const rib = Math.round(base + i * em.pitch);
      // Wrap inside [start,end]
      const wrapped = start + (((rib - start) % (span + 1)) + (span + 1)) % (span + 1);
      ribIndices.push(applyJitter(wrapped, em.jitter));
    }
    return { ribIndices };
  }

  if (em.kind === 'phyllotaxis') {
    const { start, span } = resolveRange(em.ribRange);
    const groupCount = Math.max(0, em.groupCount | 0);
    if (groupCount === 0) return { ribIndices: [] };

    const golden = em.golden ?? 1.0;
    const phi = (Math.sqrt(5) - 1) / 2; // 0.618...
    for (let i = 0; i < groupCount; i++) {
      const u = (i * phi * golden) % 1;
      const rib = Math.round(start + u * span);
      ribIndices.push(applyJitter(rib, em.jitter));
    }
    return { ribIndices };
  }

  // vortexStreet
  const groupCount = Math.max(0, em.groupCount | 0);
  if (groupCount === 0) return { ribIndices: [] };
  const a = resolveRange(em.bandA);
  const b = resolveRange(em.bandB);
  for (let i = 0; i < groupCount; i++) {
    const whichA = i % 2 === 0;
    const band = whichA ? a : b;
    const u = groupCount === 1 ? 0.5 : (i / Math.max(1, groupCount - 1));
    const rib = Math.round(band.start + u * band.span);
    ribIndices.push(applyJitter(rib, em.jitter));
  }
  return { ribIndices };
}
