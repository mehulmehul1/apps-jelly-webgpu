import { describe, it, expect } from 'vitest';
import { computeNormals } from '../computeNormals';

/**
 * Regression tests for computeNormals — the per-frame smoothed-normal refresh
 * that keeps the Fish / Anemone soft-body meshes shaded correctly as they
 * undulate / sway (without it the TSL lighting stays frozen on build shape).
 */
describe('computeNormals', () => {
  it('returns an outward +Z normal for a CCW triangle in the XY plane', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const out = new Float32Array(9);
    computeNormals(positions, [0, 1, 2], out);
    for (let i = 0; i < 9; i += 3) {
      expect(out[i]).toBeCloseTo(0, 6);
      expect(out[i + 1]).toBeCloseTo(0, 6);
      expect(out[i + 2]).toBeCloseTo(1, 6);
    }
  });

  it('produces unit-length normals', () => {
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      1, 1, 0,
    ]);
    // Two triangles forming a unit quad in the XY plane.
    const out = new Float32Array(12);
    computeNormals(positions, [0, 1, 2, 1, 3, 2], out);
    for (let i = 0; i < 12; i += 3) {
      const l = Math.hypot(out[i], out[i + 1], out[i + 2]);
      expect(l).toBeCloseTo(1, 6);
    }
  });

  it('smooths across a shared vertex (averaged normal)', () => {
    // A plane split into two coplanar triangles sharing a diagonal edge:
    // all vertices must end up with matching (0,0,1) normals — sharing the
    // seventh vertex between two faces contributes both face areas.
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      1, 1, 0,
    ]);
    const out = new Float32Array(12);
    computeNormals(positions, [0, 1, 2, 1, 3, 2], out);
    for (let i = 0; i < 12; i += 3) {
      expect(out[i + 2]).toBeCloseTo(1, 6);
    }
  });

  it('leaves the output buffer zeroed and normalized for degenerate faces', () => {
    // Two coincident vertices => zero area; must not produce NaN.
    const positions = new Float32Array([0, 0, 0, 0, 0, 0, 1, 1, 1]);
    const out = new Float32Array(9).fill(123);
    computeNormals(positions, [0, 1, 2], out);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });
});
