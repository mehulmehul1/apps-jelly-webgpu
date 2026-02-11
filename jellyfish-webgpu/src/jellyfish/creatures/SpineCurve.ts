export type SpineCurve =
  | { kind: 'none' }
  | { kind: 'polyline'; points: Array<[t: number, x: number, z: number]> }
  | { kind: 'sine'; ampX: number; ampZ: number; freq: number; phase?: number }
  | { kind: 'helix'; radius: number; turns: number; phase?: number };

function clamp01(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function evalPolyline(points: Array<[number, number, number]>, t: number): { x: number; z: number } {
  if (points.length === 0) return { x: 0, z: 0 };
  if (points.length === 1) return { x: points[0][1], z: points[0][2] };

  const tt = clamp01(t);
  const pts = points.slice().sort((a, b) => a[0] - b[0]);
  if (tt <= pts[0][0]) return { x: pts[0][1], z: pts[0][2] };
  if (tt >= pts[pts.length - 1][0]) return { x: pts[pts.length - 1][1], z: pts[pts.length - 1][2] };

  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, x0, z0] = pts[i];
    const [t1, x1, z1] = pts[i + 1];
    if (tt >= t0 && tt <= t1) {
      const u = (tt - t0) / Math.max(1e-6, t1 - t0);
      return { x: lerp(x0, x1, u), z: lerp(z0, z1, u) };
    }
  }

  return { x: pts[pts.length - 1][1], z: pts[pts.length - 1][2] };
}

export function evalSpineOffset(curve: SpineCurve | undefined, t: number): { x: number; z: number } {
  const c: SpineCurve = curve ?? { kind: 'none' };
  const tt = clamp01(t);
  switch (c.kind) {
    case 'none':
      return { x: 0, z: 0 };
    case 'polyline':
      return evalPolyline(c.points, tt);
    case 'sine': {
      const phase = c.phase ?? 0;
      const a = Math.PI * 2 * c.freq * tt + phase;
      return { x: Math.sin(a) * c.ampX, z: Math.cos(a) * c.ampZ };
    }
    case 'helix': {
      const phase = c.phase ?? 0;
      const a = Math.PI * 2 * c.turns * tt + phase;
      return { x: Math.cos(a) * c.radius, z: Math.sin(a) * c.radius };
    }
    default: {
      const _exhaustive: never = c;
      return _exhaustive;
    }
  }
}

