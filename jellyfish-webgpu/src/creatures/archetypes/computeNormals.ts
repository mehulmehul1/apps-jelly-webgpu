/**
 * computeNormals.ts
 *
 * Recompute smoothed vertex normals for an indexed triangle mesh from its
 * current (animated) positions — the soft-body sibling of Three.js's
 * `BufferGeometry.computeVertexNormals()`.
 *
 * Required because archetypes like Fish and Anemone displace their vertices
 * every physics frame (undulation / sway). If normals are computed only once
 * at build time, the TSL materials (bulb rim, gel, physical shading) keep
 * lighting the *undeformed* shape, which reads as broken shading while the
 * body moves.
 *
 * The normal accumulation here matches Three's approach: accumulate the cross
 * product of each triangle's edge vectors onto its three vertices, then
 * normalize per vertex. Call it once per frame with the live `positions`
 * buffer, the face `indices`, and a persistent `out` normal buffer.
 */

export function computeNormals(
  positions: Float32Array | ArrayLike<number>,
  indices: ArrayLike<number>,
  out: Float32Array,
): void {
  out.fill(0, 0, out.length);

  const triCount = indices.length;
  for (let i = 0; i + 2 < triCount; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;

    // Triangle corners
    const ax = positions[ia];
    const ay = positions[ia + 1];
    const az = positions[ia + 2];
    const bx = positions[ib];
    const by = positions[ib + 1];
    const bz = positions[ib + 2];
    const cx = positions[ic];
    const cy = positions[ic + 1];
    const cz = positions[ic + 2];

    // Edge vectors b-a, c-a
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;

    // Cross product (face normal, not yet normalized)
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    out[ia] += nx; out[ia + 1] += ny; out[ia + 2] += nz;
    out[ib] += nx; out[ib + 1] += ny; out[ib + 2] += nz;
    out[ic] += nx; out[ic + 1] += ny; out[ic + 2] += nz;
  }

  // Normalize each accumulated vertex normal.
  for (let i = 0; i < out.length; i += 3) {
    const nx = out[i];
    const ny = out[i + 1];
    const nz = out[i + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    out[i] = nx / len;
    out[i + 1] = ny / len;
    out[i + 2] = nz / len;
  }
}
