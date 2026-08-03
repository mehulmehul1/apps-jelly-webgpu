/**
 * Deterministic seeded PRNG utilities for the vessel gallery.
 *
 * Every vessel in the gallery must be a pure function of a seed — this is the
 * same contract fxhash mints will need. All randomness flows through a
 * mulberry32 stream derived from a base seed so tiles are reproducible.
 */

/** mulberry32 — tiny fast deterministic PRNG. Returns () => [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** String → 32-bit seed (stable across runs). */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Generate a fresh random seed string for a new page load. */
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Uniform random in [min, max). */
export function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Uniform random integer in [min, max] inclusive. */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

/** Pick a random element. */
export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Pick one item from a weighted array of [item, weight] pairs. */
export function pickWeighted<T>(rng: () => number, items: ReadonlyArray<readonly [T, number]>): T {
  const total = items.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

/** Seeded shuffle (Fisher–Yates). Returns a new array. */
export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
