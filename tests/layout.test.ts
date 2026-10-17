import { describe, expect, it } from 'vitest';
import { parseRoute, routeHref } from '../src/router';
import { columnBounds, layoutLabels } from '../src/ui/labelLayout';

describe('layoutLabels', () => {
  const size = { width: 1000, height: 600 };

  it('puts labels on the side of the screen their part is on', () => {
    const placed = layoutLabels([{ x: 200, y: 300 }, { x: 800, y: 300 }], size);
    expect(placed[0]?.side).toBe('left');
    expect(placed[1]?.side).toBe('right');
    expect(placed[0]!.x).toBeLessThan(placed[1]!.x);
  });

  it('keeps labels in a column apart and in top-to-bottom order', () => {
    const anchors = [300, 302, 298, 305].map((y) => ({ x: 100, y }));
    const placed = layoutLabels(anchors, { ...size, gap: 50 });
    const ys = placed.map((p) => p!.y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(50 - 1e-9);
    // the part that is highest on screen keeps the highest label
    expect(placed[2]!.y).toBe(Math.min(...placed.map((p) => p!.y)));
  });

  it('keeps labels inside the margins, even when crowded at the bottom', () => {
    const anchors = Array.from({ length: 5 }, () => ({ x: 900, y: 590 }));
    const placed = layoutLabels(anchors, { ...size, gap: 40, margin: 60 });
    for (const p of placed) {
      expect(p!.y).toBeLessThanOrEqual(540);
      expect(p!.y).toBeGreaterThanOrEqual(60 - 1e-9);
    }
  });

  it('skips parts that are off screen', () => {
    expect(layoutLabels([null, { x: 10, y: 10 }], size)[0]).toBeNull();
  });
});

describe('router', () => {
  it.each([
    ['', { room: 'prelude' }],
    ['#/', { room: 'prelude' }],
    ['#/catalogue', { room: 'catalogue' }],
    ['#/inspect', { room: 'inspect', id: null }],
    ['#/inspect/sanctum', { room: 'inspect', id: 'sanctum' }],
    ['#/about', { room: 'about' }],
    ['#/nowhere', { room: 'prelude' }],
  ])('%s', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('round-trips routes through links', () => {
    for (const route of [{ room: 'inspect', id: 'my model' }, { room: 'catalogue' }] as const) {
      expect(parseRoute(routeHref(route))).toEqual(route);
    }
  });
});

describe('columnBounds', () => {
  const panelTopLeft = { left: 0, right: 300, top: 0, bottom: 280 };
  const stripBottom = { left: 400, right: 800, top: 520, bottom: 600 };

  it('starts a column below a panel it passes under', () => {
    expect(columnBounds(150, 600, [panelTopLeft], 20).top).toBe(300);
  });

  it('ends a column above a bar along the bottom', () => {
    expect(columnBounds(600, 600, [stripBottom], 20).bottom).toBe(500);
  });

  it('ignores boxes the column does not cross', () => {
    expect(columnBounds(900, 600, [panelTopLeft, stripBottom], 20)).toEqual({ top: 20, bottom: 580 });
  });

  it('feeds into the layout so labels stay below the panel', () => {
    const bounds = { left: columnBounds(160, 600, [panelTopLeft], 20) };
    const placed = layoutLabels([{ x: 100, y: 50 }], { width: 1000, height: 600, bounds });
    expect(placed[0]!.y).toBeGreaterThanOrEqual(300);
  });
});
