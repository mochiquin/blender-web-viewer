/**
 * Small collage pieces for the posters: interface windows, tickets, envelopes, star sparkles,
 * birds, node constellations, hexagon clusters and pixel mosaics. Each returns an SVG fragment
 * at an explicit position, so a composition is laid out by hand like a print layout.
 */
import { brush, n, pointsAttr, polygon, ring, rule, type Point, type Random } from './sketch';

export interface Ink {
  ink: string;
  paper: string;
  cobalt: string;
  accent: string;
}

const MONO = "ui-monospace,Consolas,'Cascadia Mono',monospace";

/** A little interface window: title bar, three dots, a few text lines. */
export function uiWindow(x: number, y: number, w: number, h: number, title: string, c: Ink, rand: Random, rotate = 0, weight = 1): string {
  const lines = Array.from({ length: 3 }, (_, i) => {
    const len = w * (0.35 + rand() * 0.45);
    return `<path d="M${n(x + 14)} ${n(y + 38 + i * 14)}h${n(len)}" />`;
  }).join('');
  return `<g transform="rotate(${rotate} ${n(x + w / 2)} ${n(y + h / 2)})" stroke="${c.ink}" stroke-width="${weight}" fill="none">
<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${c.paper}" />
<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="20" fill="${c.ink}" />
${[0, 1, 2].map((i) => `<circle cx="${n(x + w - 14 - i * 10)}" cy="${n(y + 10)}" r="2.6" fill="${c.paper}" stroke="none" />`).join('')}
<text x="${n(x + 8)}" y="${n(y + 14)}" font-family="${MONO}" font-size="10" letter-spacing="1.5" fill="${c.paper}" stroke="none">${title}</text>
<g opacity=".7">${lines}</g></g>`;
}

/** A ticket stub with a perforated edge and two lines of small print. */
export function ticket(x: number, y: number, w: number, title: string, lines: string[], c: Ink, rotate = 0, weight = 1): string {
  const h = 64;
  return `<g transform="rotate(${rotate} ${n(x + w / 2)} ${n(y + h / 2)})">
<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${h}" fill="${c.paper}" stroke="${c.ink}" stroke-width="${weight}" />
<path d="M${n(x + w * 0.72)} ${n(y)}v${h}" stroke="${c.ink}" stroke-width="${weight}" stroke-dasharray="3 4" />
<text x="${n(x + 12)}" y="${n(y + 24)}" font-family="${MONO}" font-size="14" font-weight="600" fill="${c.ink}">${title}</text>
${lines.map((line, i) => `<text x="${n(x + 12)}" y="${n(y + 40 + i * 12)}" font-family="${MONO}" font-size="8.5" letter-spacing="1" fill="${c.ink}" opacity=".7">${line}</text>`).join('')}
<circle cx="${n(x + w * 0.86)}" cy="${n(y + h / 2)}" r="12" fill="${c.cobalt}" /></g>`;
}

/** An envelope: a rectangle with its flap folded. */
export function envelope(x: number, y: number, size: number, c: Ink, rotate = 0, weight = 1): string {
  const w = 54 * size;
  const h = 36 * size;
  return `<g transform="rotate(${rotate} ${n(x)} ${n(y)})" fill="${c.paper}" stroke="${c.ink}" stroke-width="${weight}">
<rect x="${n(x - w / 2)}" y="${n(y - h / 2)}" width="${n(w)}" height="${n(h)}" />
<path d="M${n(x - w / 2)} ${n(y - h / 2)}L${n(x)} ${n(y + h * 0.1)}L${n(x + w / 2)} ${n(y - h / 2)}" fill="none" /></g>`;
}

/** A four-pointed sparkle. */
export function sparkle(x: number, y: number, size: number): string {
  const k = size * 0.18;
  return `M${n(x)} ${n(y - size)}Q${n(x + k)} ${n(y - k)} ${n(x + size)} ${n(y)}Q${n(x + k)} ${n(y + k)} ${n(x)} ${n(y + size)}Q${n(x - k)} ${n(y + k)} ${n(x - size)} ${n(y)}Q${n(x - k)} ${n(y - k)} ${n(x)} ${n(y - size)}Z`;
}

/** A simple bird in flight: two curved wings meeting at the body. */
export function bird(x: number, y: number, size: number, flip = false): string {
  const s = flip ? -size : size;
  return `M${n(x - s)} ${n(y - size * 0.25)}Q${n(x - s * 0.45)} ${n(y - size * 0.75)} ${n(x)} ${n(y)}Q${n(x + s * 0.45)} ${n(y - size * 0.9)} ${n(x + s * 1.1)} ${n(y - size * 0.45)}`;
}

/** Nodes of different sizes tied together by hand-drawn lines, like a construction diagram. */
export function constellation(cx: number, cy: number, radius: number, count: number, c: Ink, rand: Random, weight = 1): string {
  const nodes = Array.from({ length: count }, () => {
    const a = rand() * Math.PI * 2;
    const d = radius * (0.25 + rand() * 0.75);
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.8, r: 3 + rand() * 12 };
  }).sort((a, b) => a.x - b.x);
  let lines = '';
  nodes.forEach((p, i) => {
    if (i) lines += rule(nodes[i - 1].x, nodes[i - 1].y, p.x, p.y, rand, 4, 3);
    if (i > 1 && rand() > 0.55) {
      const q = nodes[Math.floor(rand() * (i - 1))];
      lines += rule(q.x, q.y, p.x, p.y, rand, 3, 4);
    }
  });
  const marks = nodes
    .map((p, i) =>
      p.r < 6
        ? `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(p.r * 0.6)}" fill="${i % 3 ? c.ink : c.accent}" />`
        : `<path d="${ring(p.x, p.y, p.r, rand, 0.5)}" fill="${c.paper}" stroke="${c.ink}" stroke-width="${weight}" />`,
    )
    .join('');
  return `<path d="${lines}" fill="none" stroke="${c.ink}" stroke-width="${0.8 * weight}" opacity=".75" />${marks}`;
}

/** A centre hexagon (cobalt) ringed by six numbered cells. */
export function hexCluster(cx: number, cy: number, size: number, c: Ink, weight = 1): string {
  const cells: Point[] = [[0, 0], ...Array.from({ length: 6 }, (_, k) => {
    const a = (k / 6) * Math.PI * 2 - Math.PI / 6;
    return [Math.cos(a) * size * 1.78, Math.sin(a) * size * 1.78] as Point;
  })];
  return cells
    .map(([dx, dy], k) => {
      const main = k === 0;
      const hex = pointsAttr(polygon(cx + dx, cy + dy, size, 6, Math.PI / 6));
      const label = main ? '' : `<text x="${n(cx + dx)}" y="${n(cy + dy + 4)}" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${c.cobalt}">0${k}</text>`;
      return `<polygon points="${hex}" fill="${main ? c.cobalt : c.paper}" stroke="${main ? c.paper : c.cobalt}" stroke-width="${1.3 * weight}" />${label}`;
    })
    .join('');
}

/** A loose oval of square pixels that thin out towards the edge. */
export function mosaic(cx: number, cy: number, radius: number, cell: number, fills: string[], rand: Random): string {
  let out = '';
  for (let y = cy - radius; y < cy + radius; y += cell) {
    for (let x = cx - radius * 0.7; x < cx + radius * 0.7; x += cell) {
      const d = Math.hypot((x - cx) / (radius * 0.7), (y - cy) / radius);
      if (d < 1 && rand() > d * 0.9) {
        const fill = fills[Math.min(fills.length - 1, Math.floor(d * fills.length + rand() * 0.8))];
        out += `<rect x="${n(x)}" y="${n(y)}" width="${n(cell - 1)}" height="${n(cell - 1)}" fill="${fill}" />`;
      }
    }
  }
  return out;
}

/** Thin tapered rays around a centre, like a halo of light. */
export function rays(cx: number, cy: number, inner: number, outer: number, count: number, fill: string, rand: Random): string {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + rand() * 0.07;
    const start = inner + rand() * inner * 0.1;
    const end = outer * (0.65 + rand() * 0.35);
    const pts: Point[] = [
      [cx + Math.cos(a) * start, cy + Math.sin(a) * start],
      [cx + Math.cos(a) * (start + end) / 2, cy + Math.sin(a) * (start + end) / 2],
      [cx + Math.cos(a) * end, cy + Math.sin(a) * end],
    ];
    return `<path d="${brush(pts, 2 + rand() * 5)}" fill="${fill}" opacity="${n(0.25 + rand() * 0.5)}" />`;
  }).join('');
}

/** An axis broken into dashes, each running a little past its end. */
export function brokenAxis(x1: number, y1: number, x2: number, y2: number, parts: number, rand: Random): string {
  let d = '';
  for (let i = 0; i < parts; i++) {
    const t0 = i / parts + rand() * 0.03;
    const t1 = (i + 1) / parts - 0.02 - rand() * 0.05;
    d += rule(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0, x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1, rand, 6, 1.6);
  }
  return d;
}

/** A vertical ruler with ticks and Y labels every fifth tick. */
export function ruler(x: number, top: number, bottom: number, ink: string, rand: Random): string {
  let d = rule(x, top, x, bottom, rand, 6, 1.2);
  let labels = '';
  for (let y = top, k = 0; y <= bottom; y += 20, k++) {
    const len = k % 5 === 0 ? 14 : 6;
    d += `M${x} ${n(y)}h${n(len * (0.85 + rand() * 0.3))}`;
    if (k % 5 === 0) labels += `<text x="${x + 18}" y="${n(y + 4)}" font-family="${MONO}" font-size="11" fill="${ink}" opacity=".7">Y${k / 5 + 1}</text>`;
  }
  return `<path d="${d}" fill="none" stroke="${ink}" stroke-width=".9" opacity=".7" />${labels}`;
}

/** A printer's registration mark: a ring with a cross through it. */
export function registration(x: number, y: number, size: number, ink: string, rand: Random): string {
  return `<path d="${ring(x, y, size * 0.42, rand, 0.4)}${rule(x - size, y, x + size, y, rand, 0, 0.5)}${rule(x, y - size, x, y + size, rand, 0, 0.5)}" fill="none" stroke="${ink}" stroke-width=".9" />`;
}

/** Crop marks in the corners of a box. */
export function crops(x0: number, y0: number, x1: number, y1: number, ink: string, len = 26, weight = 1.1): string {
  return `<path d="M${x0} ${y0 + len}V${y0}H${x0 + len}M${x1 - len} ${y0}H${x1}V${y0 + len}M${x1} ${y1 - len}V${y1}H${x1 - len}M${x0 + len} ${y1}H${x0}V${y1 - len}" fill="none" stroke="${ink}" stroke-width="${weight}" />`;
}

/** Text running down the side, rotated 90°. */
export function sideColumn(x: number, y: number, text: string, ink: string): string {
  return `<text transform="translate(${x} ${y}) rotate(90)" font-family="${MONO}" font-size="12" font-weight="600" letter-spacing="5" fill="${ink}" opacity=".55">${text}</text>`;
}
