import { CATEGORIES, type Project } from '../projects';
import { arc, brush, hashSeed, n, pointsAttr, polygon, ring, rule, seeded, sweep, type Random } from './sketch';

/**
 * Graphic "plates": catalogue cards and the hero poster, drawn as SVG in a print-design
 * language (cobalt disc, halftone, wobbly rings, outlined numbers, registration marks).
 * Colours are CSS variables so the plates follow the site theme.
 */

const INK = 'var(--ink)';
const PAPER = 'var(--paper)';
const COBALT = 'var(--cobalt)';
const MUTED = 'var(--muted)';
const SERIF = "'Bodoni 72','Bodoni MT',Didot,Georgia,serif";
const MONO = "ui-monospace,Consolas,'Cascadia Mono',monospace";

/** Registration (crop) marks in the four corners, like a print proof. */
function cropMarks(w: number, h: number, inset = 10, len = 10): string {
  const c = (x: number, y: number, dx: number, dy: number) =>
    `<path d="M${x} ${y + dy * len}V${y}H${x + dx * len}" />`;
  return `<g fill="none" stroke="${INK}" stroke-width=".8" opacity=".55">${c(inset, inset, 1, 1)}${c(w - inset, inset, -1, 1)}${c(inset, h - inset, 1, -1)}${c(w - inset, h - inset, -1, -1)}</g>`;
}

/** A barcode strip from the seed: purely decorative. */
function barcode(x: number, y: number, w: number, h: number, rand: Random): string {
  let bars = '';
  let cx = x;
  while (cx < x + w) {
    const bw = 0.6 + rand() * 2.2;
    if (rand() > 0.35) bars += `<rect x="${n(cx)}" y="${y}" width="${n(bw)}" height="${h}" />`;
    cx += bw + 0.8;
  }
  return `<g fill="${INK}">${bars}</g>`;
}

/** Tick marks around a circle, longer every quarter, like a dial. */
function dial(cx: number, cy: number, r: number, count: number, rand: Random): string {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const long = i % (count / 4) === 0 ? 12 : i % (count / 12) === 0 ? 7 : 3;
    const len = long * (0.8 + rand() * 0.4);
    d += `M${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}L${n(cx + Math.cos(a) * (r + len))} ${n(cy + Math.sin(a) * (r + len))}`;
  }
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width=".8" />`;
}

/** The category's construction figure: a triangle (sanctum), circle (sculpture) or diamond (armament). */
function glyphFigure(category: Project['category'], cx: number, cy: number, r: number, rand: Random): string {
  const sides = category === 'cathedral' ? 3 : category === 'weapon' ? 4 : 0;
  if (!sides) {
    return `<path d="${ring(cx, cy, r, rand, 1.2)}" /><path d="${ring(cx, cy, r * 0.62, rand, 0.8)}" />`;
  }
  const pts = polygon(cx, cy, r, sides, -Math.PI / 2);
  const edges = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return `<path d="${rule(p[0], p[1], q[0], q[1], rand, 6, 1.5)}" />`;
  });
  const spokes = pts.map((p) => `<path d="${rule(cx, cy, p[0], p[1], rand, 0, 0.8)}" opacity=".6" />`);
  return edges.join('') + spokes.join('');
}

export interface PlateOptions {
  width?: number;
  height?: number;
}

/** A catalogue card for one project. */
export function projectPlate(project: Project, { width = 300, height = 400 }: PlateOptions = {}): string {
  const rand = seeded(hashSeed(project.id));
  const id = `pl-${project.id}`;
  const cat = CATEGORIES[project.category];
  const cx = width * 0.56;
  const cy = height * 0.42;
  const disc = width * 0.27;

  const halftone = `<pattern id="${id}-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.15" fill="${INK}" /></pattern>`;
  const fade = `<radialGradient id="${id}-fade"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${id}-mask"><rect width="${width}" height="${height}" fill="url(#${id}-fade)"/></mask>`;

  const accent = brush(sweep(width * 0.12, height * 0.7, width * 0.88, height * 0.6, 10), 9);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="plate" role="img" aria-label="${cat.en} ${project.number}: ${escapeXml(project.titleEn)}">
<defs>${halftone}${fade}</defs>
<rect width="${width}" height="${height}" fill="${PAPER}" />
<circle cx="${n(cx + disc * 0.5)}" cy="${n(cy - disc * 0.3)}" r="${n(disc * 1.25)}" fill="url(#${id}-dots)" mask="url(#${id}-mask)" opacity=".35" />
<g class="plate-layer plate-far"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(disc)}" fill="${COBALT}" /></g>
<g class="plate-layer plate-mid" fill="none" stroke="${INK}" stroke-width="1">
  <path d="${ring(cx, cy, disc * 1.32, rand)}" />
  <path d="${ring(cx, cy, disc * 1.32 + 2.5, rand, 2)}" opacity=".45" />
  ${dial(cx, cy, disc * 1.5, 48, rand)}
  <path d="${arc(cx, cy, disc * 1.8, -2.4, -0.6, rand)}" stroke-dasharray="3 4" />
</g>
<g class="plate-layer plate-near" fill="none" stroke="${PAPER}" stroke-width="1.4">${glyphFigure(project.category, cx, cy, disc * 0.72, rand)}</g>
<path d="${accent}" fill="${COBALT}" opacity=".85" />
<text x="18" y="${height * 0.2}" font-family="${SERIF}" font-size="${width * 0.34}" font-weight="700" fill="none" stroke="${INK}" stroke-width="1.1">${project.number}</text>
<text x="21" y="${height * 0.2 + 2}" font-family="${SERIF}" font-size="${width * 0.34}" font-weight="700" fill="none" stroke="${COBALT}" stroke-width=".7" opacity=".7">${project.number}</text>
<text x="${width - 22}" y="30" font-size="16" fill="${INK}" writing-mode="vertical-rl" letter-spacing="6">${escapeXml(cat.name)}</text>
<text x="${width - 18}" y="${height - 96}" font-family="${MONO}" font-size="9" fill="${MUTED}" text-anchor="end" letter-spacing="2">${cat.en}</text>
<path d="${rule(18, height - 86, width - 18, height - 86, rand, 6, 1)}" stroke="${INK}" stroke-width=".9" fill="none" />
<text x="18" y="${height - 60}" font-size="19" font-weight="600" fill="${INK}">${escapeXml(project.title)}</text>
<text x="18" y="${height - 42}" font-family="${MONO}" font-size="9.5" fill="${MUTED}" letter-spacing="1.5">${escapeXml(project.titleEn)}</text>
${barcode(width - 92, height - 34, 74, 14, rand)}
<text x="18" y="${height - 22}" font-family="${MONO}" font-size="9" fill="${MUTED}">REC.${project.number} · ${cat.glyph}</text>
${cropMarks(width, height)}
</svg>`;
}

/** The hero poster: big cobalt disc, halftone sun, ring inscription and a flock of marks. */
export function heroPlate(width = 1200, height = 800, seed = 6): string {
  const rand = seeded(seed);
  const cx = width * 0.6;
  const cy = height * 0.48;
  const r = Math.min(width, height) * 0.27;
  const inscription = 'ARCHIVE OF THE MASSES · RECORD · SANCTUM · FIGURE · ARMAMENT · ';
  const hex = polygon(width * 0.12, height * 0.18, 36, 6, Math.PI / 6);

  const flock = Array.from({ length: 9 }, (_, i) => {
    const x = cx + r * 1.2 + rand() * width * 0.25;
    const y = cy - r * 0.9 + rand() * r * 0.8;
    const s = 6 + rand() * 9;
    return `<path class="bird" style="--i:${i}" d="M${n(x - s)} ${n(y)}Q${n(x - s / 2)} ${n(y - s * 0.7)} ${n(x)} ${n(y)}Q${n(x + s / 2)} ${n(y - s * 0.7)} ${n(x + s)} ${n(y)}" />`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" class="hero-plate" aria-hidden="true">
<defs>
  <pattern id="hero-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.7" fill="${INK}" /></pattern>
  <radialGradient id="hero-fade"><stop offset=".2" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="hero-mask"><rect width="${width}" height="${height}" fill="url(#hero-fade)"/></mask>
  <path id="hero-ring-path" d="M${n(cx - r * 1.42)} ${n(cy)}a${n(r * 1.42)} ${n(r * 1.42)} 0 1 1 ${n(r * 2.84)} 0a${n(r * 1.42)} ${n(r * 1.42)} 0 1 1 ${n(-r * 2.84)} 0" />
</defs>
<g class="layer" style="--depth:.2"><circle cx="${n(cx - r * 0.9)}" cy="${n(cy - r * 0.5)}" r="${n(r * 1.5)}" fill="url(#hero-dots)" mask="url(#hero-mask)" opacity=".28" /></g>
<g class="layer" style="--depth:.45"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${COBALT}" /></g>
<g class="layer spin" style="--depth:.6" fill="none" stroke="${INK}" stroke-width="1.2">
  <path d="${ring(cx, cy, r * 1.22, rand, 2.5)}" />
  <path d="${ring(cx, cy, r * 1.22 + 4, rand, 3)}" opacity=".4" />
  ${dial(cx, cy, r * 1.6, 96, rand)}
  <text font-family="${MONO}" font-size="13" letter-spacing="5" fill="${INK}" stroke="none"><textPath href="#hero-ring-path">${inscription.repeat(2)}</textPath></text>
</g>
<g class="layer" style="--depth:.8" fill="none" stroke="${INK}" stroke-width="1">
  <path d="${rule(width * 0.06, cy, cx - r * 1.7, cy, rand, 14, 2)}" />
  <path d="${rule(cx, height * 0.08, cx, cy - r * 1.65, rand, 10, 2)}" />
  <polygon points="${pointsAttr(hex)}" />
  <path d="${brush(sweep(width * 0.08, height * 0.86, width * 0.55, height * 0.8, 18), 16)}" fill="${COBALT}" stroke="none" opacity=".9" />
</g>
<g class="layer flock" style="--depth:1.1" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round">${flock}</g>
<text class="layer" style="--depth:.35" x="${n(cx - r * 0.55)}" y="${n(cy + r * 0.45)}" font-family="${SERIF}" font-size="${n(r * 1.25)}" font-weight="700" fill="none" stroke="${PAPER}" stroke-width="2">06</text>
${cropMarks(width, height, 18, 18)}
</svg>`;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
}
