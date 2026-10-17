/** A random number generator: returns numbers in [0, 1). */
export type Rng = () => number;

/**
 * Seeded random numbers (mulberry32). The same seed always draws the same plate,
 * so graphics stay put between page loads instead of jittering.
 */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn a string (such as a model id) into a stable seed. */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const range = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
