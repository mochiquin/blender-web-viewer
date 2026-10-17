/**
 * A poster is a stack of transparent sheets sharing one 1000 × 1000 coordinate space.
 * Each sheet has a depth: deeper sheets move less with the pointer (parallax), may be blurred
 * (depth of field), and are drawn with thinner lines, so the composition reads front to back.
 */
export interface Sheet {
  /** 0 = far background, 1 = picture plane, > 1 = in front. */
  depth: number;
  /** Blur in px for depth of field. */
  blur?: number;
  /** Extra class names, e.g. "spin" for a slowly turning sheet. */
  className?: string;
  defs?: string;
  body: string;
}

/** Line weight multiplier for a depth: hairlines far away, marker-thick up front. */
export function weightFor(depth: number): number {
  if (depth < 0.3) return 0.6;
  if (depth < 0.6) return 0.85;
  if (depth < 1) return 1.15;
  return 1.55;
}

/** Scale every stroke-width in a fragment by its sheet's depth weight. */
export function applyWeight(body: string, depth: number): string {
  const k = weightFor(depth);
  return body.replace(/stroke-width="([\d.]+)"/g, (_, v: string) => `stroke-width="${(Number(v) * k).toFixed(2)}"`);
}

/** Render sheets as stacked <svg> elements inside one container (HTML string). */
export function renderSheets(sheets: Sheet[], className: string, label: string): string {
  const layers = sheets
    .map((sheet) => {
      const classes = ['sheet', sheet.className].filter(Boolean).join(' ');
      const style = `--d:${sheet.depth}${sheet.blur ? `;--blur:${sheet.blur}px` : ''}`;
      const defs = sheet.defs ? `<defs>${sheet.defs}</defs>` : '';
      return `<svg class="${classes}" style="${style}" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}${applyWeight(sheet.body, sheet.depth)}</svg>`;
    })
    .join('');
  return `<div class="poster ${className}" role="img" aria-label="${label}">${layers}</div>`;
}
