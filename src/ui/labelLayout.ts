export interface Anchor {
  /** Screen position of the part, in CSS pixels. */
  x: number;
  y: number;
}

export interface PlacedLabel {
  index: number;
  side: 'left' | 'right';
  /** Where the label's leader line ends (the label's attachment point). */
  x: number;
  y: number;
}

export interface LayoutOptions {
  width: number;
  height: number;
  /** Horizontal position of each label column, as a fraction of the width. */
  columns?: [number, number];
  /** Minimum vertical distance between labels in the same column. */
  gap?: number;
  /** Keep labels this far from the top and bottom edges. */
  margin?: number;
  /** Per-column vertical limits (e.g. to stay clear of panels); overrides `margin`. */
  bounds?: Partial<Record<'left' | 'right', { top: number; bottom: number }>>;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Vertical room for a label column at `x`, given UI boxes on screen: boxes in the top half that
 * the column passes through push the top down, boxes in the bottom half pull the bottom up.
 */
export function columnBounds(x: number, height: number, obstacles: Rect[], margin = 24, labelWidth = 0): { top: number; bottom: number } {
  let top = margin;
  let bottom = height - margin;
  for (const box of obstacles) {
    const overlaps = box.right > x - labelWidth && box.left < x + labelWidth;
    if (!overlaps) continue;
    const middle = (box.top + box.bottom) / 2;
    if (middle < height / 2) top = Math.max(top, box.bottom + margin);
    else bottom = Math.min(bottom, box.top - margin);
  }
  return { top, bottom };
}

/**
 * Place callout labels for annotated parts, like a product breakdown drawing: parts on the left
 * half get a label in the left column, the rest on the right; within a column labels keep the
 * parts' top-to-bottom order and are pushed apart so they never overlap.
 */
export function layoutLabels(anchors: (Anchor | null)[], options: LayoutOptions): (PlacedLabel | null)[] {
  const { width, height, columns = [0.16, 0.84], gap = 52, margin = 72, bounds = {} } = options;
  const result: (PlacedLabel | null)[] = anchors.map(() => null);

  const sides: Record<'left' | 'right', { index: number; y: number }[]> = { left: [], right: [] };
  anchors.forEach((anchor, index) => {
    if (!anchor) return;
    sides[anchor.x < width / 2 ? 'left' : 'right'].push({ index, y: anchor.y });
  });

  for (const side of ['left', 'right'] as const) {
    const items = sides[side].sort((a, b) => a.y - b.y);
    const top = bounds[side]?.top ?? margin;
    const bottom = Math.max(top, bounds[side]?.bottom ?? height - margin);
    // Pass 1: push down to keep the gap; pass 2: pull back up if we ran past the bottom.
    const ys = items.map((item) => Math.min(Math.max(item.y, top), bottom));
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
    if (ys.length && ys[ys.length - 1] > bottom) {
      ys[ys.length - 1] = bottom;
      for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - gap);
    }
    const x = width * columns[side === 'left' ? 0 : 1];
    items.forEach((item, i) => {
      result[item.index] = { index: item.index, side, x, y: ys[i] };
    });
  }
  return result;
}
