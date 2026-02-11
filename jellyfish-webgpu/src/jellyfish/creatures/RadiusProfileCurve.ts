export type RadiusProfileCurve =
  | { kind: 'legacy_bell' }
  | { kind: 'legacy_tail' }
  | { kind: 'polyline'; points: Array<[t: number, v: number]> }
  | { kind: 'power'; exponent: number; min?: number; max?: number }
  | { kind: 'log_spiral'; a: number; b: number; min?: number; max?: number }
  | { kind: 'vesica'; min?: number; max?: number; power?: number }
  | { kind: 'constant'; value: number };

function clamp01(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function evalPolyline(points: Array<[number, number]>, t: number): number {
  if (points.length === 0) return 1;
  if (points.length === 1) return points[0][1];

  const tt = clamp01(t);
  // Ensure sorted by t (defensive; presets should already be sorted)
  const pts = points.slice().sort((a, b) => a[0] - b[0]);

  if (tt <= pts[0][0]) return pts[0][1];
  if (tt >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];

  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, v0] = pts[i];
    const [t1, v1] = pts[i + 1];
    if (tt >= t0 && tt <= t1) {
      const u = (tt - t0) / Math.max(1e-6, t1 - t0);
      return lerp(v0, v1, u);
    }
  }

  return pts[pts.length - 1][1];
}

// Ported from the original JellyfishGeometry formulas so the default look is preserved.
function legacyBell(t: number): number {
  const tt = clamp01(t);
  return Math.sin(Math.PI - Math.PI * 0.55 * tt * 1.8) + Math.log(tt * 100 + 2) / 3;
}

function legacyTail(t: number): number {
  const tt = clamp01(t);
  return Math.sin(0.25 * tt * Math.PI + 0.5 * Math.PI) * (1 - 0.9 * tt);
}

export function evalRadiusProfile(curve: RadiusProfileCurve | undefined, t: number): number {
  const c: RadiusProfileCurve = curve ?? { kind: 'legacy_bell' };
  switch (c.kind) {
    case 'legacy_bell':
      return legacyBell(t);
    case 'legacy_tail':
      return legacyTail(t);
    case 'polyline':
      return evalPolyline(c.points, t);
    case 'power': {
      const tt = clamp01(t);
      const v = Math.pow(tt, c.exponent);
      const min = c.min ?? 0;
      const max = c.max ?? 1;
      return lerp(min, max, v);
    }
    case 'log_spiral': {
      // Interpreted as radius scale changing exponentially along t:
      // r(t) = a * exp(b * t), remapped into [min,max] if provided.
      const tt = clamp01(t);
      const raw = c.a * Math.exp(c.b * tt);
      const min = c.min ?? raw;
      const max = c.max ?? raw;
      if (min === max) return raw;
      // Normalize by endpoints if min/max are not explicitly set.
      if (c.min === undefined && c.max === undefined) {
        const r0 = c.a * Math.exp(c.b * 0);
        const r1 = c.a * Math.exp(c.b * 1);
        const u = (raw - r0) / Math.max(1e-6, r1 - r0);
        return lerp(0, 1, u);
      }
      return clamp(raw, Math.min(min, max), Math.max(min, max));
    }
    case 'vesica': {
      // Lens-ish profile: high mid, tapered ends.
      // Base is sin(pi*t) in [0..1], with optional power shaping.
      const tt = clamp01(t);
      const p = c.power ?? 1.0;
      const base = Math.pow(Math.sin(Math.PI * tt), p);
      const min = c.min ?? 0;
      const max = c.max ?? 1;
      return lerp(min, max, base);
    }
    case 'constant':
      return c.value;
    default: {
      const _exhaustive: never = c;
      return _exhaustive;
    }
  }
}
