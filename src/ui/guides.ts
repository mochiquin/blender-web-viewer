/**
 * Geometry for the "graphic guidance" overlays: corner-bracket frames around key points,
 * lines between nodes, and a pointer reticle that reaches out to the nearest nodes.
 * Pure functions on screen coordinates, so they are easy to test.
 */
import type { Rect } from './labelLayout';

export interface ScreenPoint {
  x: number;
  y: number;
}

const f = (v: number) => v.toFixed(1);

/** Bounding rectangle of projected points (e.g. a 3D box's eight corners); null if none. */
export function rectOf(points: (ScreenPoint | null)[]): Rect | null {
  const visible = points.filter((p): p is ScreenPoint => p !== null);
  if (!visible.length) return null;
  return {
    left: Math.min(...visible.map((p) => p.x)),
    right: Math.max(...visible.map((p) => p.x)),
    top: Math.min(...visible.map((p) => p.y)),
    bottom: Math.max(...visible.map((p) => p.y)),
  };
}

/**
 * Four corner brackets around a rectangle, like a camera's focus frame. `pad` grows the frame,
 * `length` is each bracket arm (clamped so small frames still read as four corners).
 */
export function bracketPath(rect: Rect, length = 14, pad = 6): string {
  const l = rect.left - pad;
  const r = rect.right + pad;
  const t = rect.top - pad;
  const b = rect.bottom + pad;
  const arm = Math.max(4, Math.min(length, (r - l) / 3, (b - t) / 3));
  return (
    `M${f(l)} ${f(t + arm)}V${f(t)}H${f(l + arm)}` +
    `M${f(r - arm)} ${f(t)}H${f(r)}V${f(t + arm)}` +
    `M${f(r)} ${f(b - arm)}V${f(b)}H${f(r - arm)}` +
    `M${f(l + arm)} ${f(b)}H${f(l)}V${f(b - arm)}`
  );
}

/** Indices of the `count` nodes closest to `from`, nearest first, ignoring any beyond `maxDistance`. */
export function nearest(from: ScreenPoint, nodes: (ScreenPoint | null)[], count: number, maxDistance = Infinity): number[] {
  return nodes
    .map((node, index) => ({ index, d: node ? Math.hypot(node.x - from.x, node.y - from.y) : Infinity }))
    .filter((n) => n.d <= maxDistance)
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((n) => n.index);
}

/** A reticle: ring, gap ticks on four sides and a centre dot. */
export function reticlePath(p: ScreenPoint, radius = 14): string {
  const r = radius;
  const g = r * 0.45;
  return (
    `M${f(p.x - r)} ${f(p.y)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0` +
    `M${f(p.x)} ${f(p.y - r - g)}V${f(p.y - r + g)}M${f(p.x)} ${f(p.y + r - g)}V${f(p.y + r + g)}` +
    `M${f(p.x - r - g)} ${f(p.y)}H${f(p.x - r + g)}M${f(p.x + r - g)} ${f(p.y)}H${f(p.x + r + g)}`
  );
}

/** Distance in metres, e.g. 0.42 m or 12.3 m. */
export function formatMetres(d: number): string {
  return d < 10 ? `${d.toFixed(2)} m` : `${d.toFixed(1)} m`;
}

/** Midpoint of two points, nudged off the line so a label does not sit on the stroke. */
export function labelPoint(a: ScreenPoint, b: ScreenPoint, offset = 8): ScreenPoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: (a.x + b.x) / 2 - (dy / len) * offset, y: (a.y + b.y) / 2 + (dx / len) * offset };
}
