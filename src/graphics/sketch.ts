/**
 * A small vocabulary of "hand-drawn" SVG marks for the graphic-design look:
 * rings that wobble and overshoot their start, rules that bow and run past their ends,
 * and brush strokes that swell and taper. All randomness comes from a seeded generator,
 * so the same seed always draws the same picture (no flicker between renders).
 */

export type Point = [number, number];
export type Random = () => number;

const TAU = Math.PI * 2;

/** Round to one decimal place: keeps SVG path strings short. */
export const n = (value: number) => (Math.round(value * 10) / 10).toString();

/** Deterministic pseudo-random numbers in [0, 1) (mulberry32). */
export function seeded(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn a string (e.g. a project id) into a stable seed. */
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Smooth curve through points (Catmull-Rom converted to cubic Béziers). */
export function smoothPath(points: Point[], closed = false): string {
  if (points.length < 2) return '';
  const at = (i: number) =>
    closed ? points[(i + points.length) % points.length] : points[Math.max(0, Math.min(points.length - 1, i))];
  let d = `M${n(points[0][0])} ${n(points[0][1])}`;
  const segments = closed ? points.length : points.length - 1;
  for (let i = 0; i < segments; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/**
 * A ring drawn in one stroke: the radius breathes slowly (two low-frequency sines, so it
 * wobbles rather than jitters) and the line runs a little past where it started.
 */
export function ring(cx: number, cy: number, radius: number, rand: Random, wobble = 1.5): string {
  const start = rand() * TAU;
  const sweep = TAU + 0.12 + rand() * 0.3;
  return arc(cx, cy, radius, start, start + sweep, rand, wobble);
}

export function arc(cx: number, cy: number, radius: number, from: number, to: number, rand: Random, wobble = 1.2): string {
  const phaseA = rand() * TAU;
  const phaseB = rand() * TAU;
  const steps = Math.max(8, Math.ceil((Math.abs(to - from) * radius) / 24));
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    const r = radius + (Math.sin(a * 2 + phaseA) * 0.65 + Math.sin(a * 5 + phaseB) * 0.35) * wobble;
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return smoothPath(points);
}

/** A ruled line drawn by hand: slightly bowed, with both ends overshooting their marks. */
export function rule(x1: number, y1: number, x2: number, y2: number, rand: Random, overshoot = 8, bow = 2): string {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const before = overshoot * (0.3 + rand());
  const after = overshoot * (0.3 + rand());
  const bend = (rand() - 0.5) * 2 * bow;
  const midX = (x1 + x2) / 2 - uy * bend;
  const midY = (y1 + y2) / 2 + ux * bend;
  return `M${n(x1 - ux * before)} ${n(y1 - uy * before)}Q${n(midX)} ${n(midY)} ${n(x2 + ux * after)} ${n(y2 + uy * after)}`;
}

/** A filled brush stroke along a path: thin at both ends, full width in the middle. */
export function brush(points: Point[], width: number): string {
  const left: Point[] = [];
  const right: Point[] = [];
  points.forEach((p, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let nx = -(next[1] - prev[1]);
    let ny = next[0] - prev[0];
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    const t = points.length === 1 ? 0.5 : i / (points.length - 1);
    const half = (width * Math.max(0.04, Math.sin(Math.PI * t) ** 0.7)) / 2;
    left.push([p[0] + nx * half, p[1] + ny * half]);
    right.push([p[0] - nx * half, p[1] - ny * half]);
  });
  right.reverse();
  return `${smoothPath(left)}L${n(right[0][0])} ${n(right[0][1])}${smoothPath(right).replace(/^M[^C]*/, '')}Z`;
}

/** Points along a gentle S-curve between two points, for brush sweeps. */
export function sweep(x1: number, y1: number, x2: number, y2: number, amplitude: number, steps = 14): Point[] {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / length;
  const ny = (x2 - x1) / length;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const offset = Math.sin(t * Math.PI * 1.6) * amplitude;
    return [x1 + (x2 - x1) * t + nx * offset, y1 + (y2 - y1) * t + ny * offset] as Point;
  });
}

/** Regular polygon points (e.g. 6 for a hexagon node). */
export function polygon(cx: number, cy: number, radius: number, sides: number, rotation = 0): Point[] {
  return Array.from({ length: sides }, (_, i) => {
    const a = rotation + (i / sides) * TAU;
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius] as Point;
  });
}

export const pointsAttr = (points: Point[]) => points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
