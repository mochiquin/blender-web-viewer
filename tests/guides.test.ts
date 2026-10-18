import { describe, expect, it } from 'vitest';
import { HERO_NODES } from '../src/graphics/plates';
import { bracketPath, formatMetres, labelPoint, nearest, rectOf, reticlePath } from '../src/ui/guides';

const nums = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('rectOf', () => {
  it('wraps projected points and ignores ones behind the camera', () => {
    expect(rectOf([{ x: 10, y: 40 }, null, { x: 30, y: 5 }])).toEqual({ left: 10, right: 30, top: 5, bottom: 40 });
    expect(rectOf([null, null])).toBeNull();
  });
});

describe('bracketPath', () => {
  it('draws four corners just outside the rectangle', () => {
    const d = bracketPath({ left: 100, right: 200, top: 50, bottom: 150 }, 14, 6);
    expect((d.match(/M/g) ?? []).length).toBe(4);
    const values = nums(d);
    expect(Math.min(...values)).toBe(44); // top - pad
    expect(Math.max(...values)).toBe(206); // right + pad
  });

  it('shortens the arms on tiny frames so the corners never cross', () => {
    const d = bracketPath({ left: 0, right: 6, top: 0, bottom: 6 }, 30, 0);
    const first = nums(d).slice(0, 4); // M x y V y H x
    expect(first[1] - first[2]).toBeLessThanOrEqual(4);
  });
});

describe('nearest', () => {
  const nodes = [{ x: 0, y: 0 }, { x: 10, y: 0 }, null, { x: 100, y: 0 }];

  it('returns the closest nodes first and skips missing ones', () => {
    expect(nearest({ x: 9, y: 0 }, nodes, 3)).toEqual([1, 0, 3]);
  });

  it('respects the count and the reach', () => {
    expect(nearest({ x: 9, y: 0 }, nodes, 1)).toEqual([1]);
    expect(nearest({ x: 9, y: 0 }, nodes, 3, 20)).toEqual([1, 0]);
  });
});

describe('small helpers', () => {
  it('draws a reticle without broken numbers', () => {
    expect(reticlePath({ x: 50, y: 50 })).not.toMatch(/NaN/);
  });

  it('formats metres', () => {
    expect(formatMetres(0.4213)).toBe('0.42 m');
    expect(formatMetres(12.34)).toBe('12.3 m');
  });

  it('puts measure labels beside the line, not on it', () => {
    const p = labelPoint({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
    expect(p.x).toBe(50);
    expect(Math.abs(p.y)).toBe(10);
  });

  it('keeps every hero key point inside the poster', () => {
    for (const node of HERO_NODES) {
      expect(node.x).toBeGreaterThan(0);
      expect(node.x).toBeLessThan(1000);
      expect(node.y).toBeGreaterThan(0);
      expect(node.y).toBeLessThan(1000);
    }
  });
});
