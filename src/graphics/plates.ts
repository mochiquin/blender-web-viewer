import { CATEGORIES, type Project } from '../projects';
import {
  bird,
  brokenAxis,
  constellation,
  crops,
  envelope,
  hexCluster,
  mosaic,
  rays,
  registration,
  ruler,
  sideColumn,
  sparkle,
  ticket,
  uiWindow,
  type Ink,
} from './collage';
import type { PosterLayer } from '../assets/slots';
import { renderSheets, type Sheet } from './sheets';
import { arc, brush, hashSeed, n, ring, rule, seeded, sweep, type Random } from './sketch';

/**
 * Graphic plates, laid out by hand on fixed grids so nothing collides:
 * - catalogue cards: 600 × 800, split into a header band, an art square and a footer;
 * - the hero poster: a 1000 × 1000 stack of sheets at different depths.
 * Colours are CSS variables so plates follow the site theme.
 */

const C: Ink = { ink: 'var(--ink)', paper: 'var(--paper)', cobalt: 'var(--cobalt)', accent: 'var(--accent)' };
const MUTED = 'var(--muted)';
const SERIF = "'Bodoni 72','Bodoni MT',Didot,Georgia,serif";
const MONO = "ui-monospace,Consolas,'Cascadia Mono',monospace";

/** Tick marks around a circle: long every quarter, medium every twelfth. */
function dial(cx: number, cy: number, r: number, count: number, rand: Random): string {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const len = (i % (count / 4) === 0 ? 18 : i % (count / 12) === 0 ? 10 : 4) * (0.8 + rand() * 0.4);
    d += `M${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}L${n(cx + Math.cos(a) * (r + len))} ${n(cy + Math.sin(a) * (r + len))}`;
  }
  return d;
}

function barcode(x: number, y: number, w: number, h: number, rand: Random): string {
  let bars = '';
  let cx = x;
  while (cx < x + w) {
    const bw = 1 + Math.floor(rand() * 3);
    if (rand() > 0.35) bars += `<rect x="${n(cx)}" y="${y}" width="${bw}" height="${h}" />`;
    cx += bw + 1 + Math.floor(rand() * 2);
  }
  return `<g fill="${C.ink}">${bars}</g>`;
}

/** The category emblem drawn in paper-coloured lines inside the disc. */
function emblem(category: Project['category'], cx: number, cy: number, r: number, rand: Random): string {
  if (category === 'cathedral') {
    // A pointed arch with a rose window and a spire line.
    const w = r * 0.62;
    return `<path d="M${n(cx - w)} ${n(cy + r * 0.62)}V${n(cy - r * 0.05)}Q${n(cx - w)} ${n(cy - r * 0.62)} ${n(cx)} ${n(cy - r * 0.9)}Q${n(cx + w)} ${n(cy - r * 0.62)} ${n(cx + w)} ${n(cy - r * 0.05)}V${n(cy + r * 0.62)}" />
<path d="${ring(cx, cy - r * 0.18, r * 0.24, rand, 0.6)}" /><path d="M${n(cx)} ${n(cy - r * 0.42)}V${n(cy + r * 0.06)}M${n(cx - r * 0.24)} ${n(cy - r * 0.18)}H${n(cx + r * 0.24)}" />
<path d="${rule(cx - w * 1.2, cy + r * 0.62, cx + w * 1.2, cy + r * 0.62, rand, 6, 1)}" />`;
  }
  if (category === 'sculpture') {
    // A standing figure on a plinth under a halo.
    return `<path d="${ring(cx, cy - r * 0.55, r * 0.34, rand, 0.6)}" /><circle cx="${n(cx)}" cy="${n(cy - r * 0.42)}" r="${n(r * 0.11)}" />
<path d="M${n(cx - r * 0.12)} ${n(cy - r * 0.28)}Q${n(cx - r * 0.32)} ${n(cy + r * 0.2)} ${n(cx - r * 0.24)} ${n(cy + r * 0.5)}H${n(cx + r * 0.24)}Q${n(cx + r * 0.32)} ${n(cy + r * 0.2)} ${n(cx + r * 0.12)} ${n(cy - r * 0.28)}" />
<path d="M${n(cx - r * 0.42)} ${n(cy + r * 0.5)}H${n(cx + r * 0.42)}V${n(cy + r * 0.66)}H${n(cx - r * 0.42)}Z" />`;
  }
  // A blade on the diagonal with a crossguard and two construction circles.
  const a = -Math.PI / 4;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const tip: [number, number] = [cx + ux * r * 0.78, cy + uy * r * 0.78];
  const hilt: [number, number] = [cx - ux * r * 0.42, cy - uy * r * 0.42];
  const px = -uy;
  const py = ux;
  return `<path d="M${n(hilt[0] + px * 8)} ${n(hilt[1] + py * 8)}L${n(tip[0])} ${n(tip[1])}L${n(hilt[0] - px * 8)} ${n(hilt[1] - py * 8)}" />
<path d="M${n(hilt[0] + px * r * 0.26)} ${n(hilt[1] + py * r * 0.26)}L${n(hilt[0] - px * r * 0.26)} ${n(hilt[1] - py * r * 0.26)}" />
<path d="M${n(hilt[0])} ${n(hilt[1])}L${n(cx - ux * r * 0.72)} ${n(cy - uy * r * 0.72)}" /><circle cx="${n(cx - ux * r * 0.78)}" cy="${n(cy - uy * r * 0.78)}" r="7" />
<path d="${ring(cx, cy, r * 0.5, rand, 0.5)}" opacity=".5" />`;
}

/**
 * A hand-drawn ring laid over a cover image. It turns with an overshoot when the card is
 * hovered or pressed; the dots and the sparkle make the turn easy to see.
 */
function coverRing(id: string, cx: number, cy: number, rand: Random): string {
  const r = 222;
  const dots = [0.4, 2.3, 4.1].map((a) => `<circle cx="${n(cx + Math.cos(a) * r)}" cy="${n(cy + Math.sin(a) * r)}" r="5" fill="${C.cobalt}" stroke="none" />`);
  return `<g class="plate-layer plate-ring" clip-path="url(#${id}-art)" fill="none" stroke="${C.cobalt}" aria-hidden="true">
  <path d="${ring(cx, cy, r, rand, 1.4)}" stroke-width="1.6" />
  <path d="${ring(cx, cy, r + 4, rand, 2)}" stroke-width=".7" opacity=".5" />
  <path d="${dial(cx, cy, r + 12, 72, rand)}" stroke-width="1" opacity=".8" />
  ${dots.join('')}
  <path d="${sparkle(cx, cy - r, 14)}" fill="${C.cobalt}" stroke="none" />
</g>`;
}

/**
 * A catalogue card, 600 × 800. Header band (number + category), art square, footer (title,
 * record line, barcode). Each zone owns its space, so the pieces never collide.
 */
export function projectPlate(project: Project, size: { width?: number; height?: number } = {}, cover?: string): string {
  const rand = seeded(hashSeed(project.id));
  const id = `pl-${project.id}`;
  const cat = CATEGORIES[project.category];
  const W = 600;
  const H = 800;
  // Art square: x 40..560, y 110..630; disc centred in it.
  const cx = 300;
  const cy = 370;
  const disc = 150;

  const defs = `<pattern id="${id}-dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2.2" fill="${C.ink}" /></pattern>
<radialGradient id="${id}-fade"><stop offset=".3" stop-color="#fff" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></radialGradient>
<mask id="${id}-mask"><rect width="${W}" height="${H}" fill="url(#${id}-fade)" /></mask>`;

  const drawn = `
<circle cx="${cx + 80}" cy="${cy - 70}" r="210" fill="url(#${id}-dots)" mask="url(#${id}-mask)" opacity=".28" />
<g class="plate-layer plate-far"><circle cx="${cx}" cy="${cy}" r="${disc}" fill="${C.cobalt}" /></g>
<g class="plate-layer plate-mid" fill="none" stroke="${C.ink}">
  <path d="${ring(cx, cy, disc + 34, rand, 1.4)}" stroke-width="1.6" />
  <path d="${ring(cx, cy, disc + 37, rand, 2)}" stroke-width=".7" opacity=".45" />
  <path d="${dial(cx, cy, disc + 52, 72, rand)}" stroke-width="1" />
  <path d="${arc(cx, cy, disc + 96, -2.5, -0.7, rand)}" stroke-width="1" stroke-dasharray="3 6" />
  <path d="${brokenAxis(60, cy, 540, cy, 4, rand)}" stroke-width=".8" opacity=".4" />
</g>
<g class="plate-layer plate-near" fill="none" stroke="${C.paper}" stroke-width="2.2" stroke-linejoin="round">${emblem(project.category, cx, cy, disc, rand)}</g>
<path d="${brush(sweep(70, cy + disc + 20, 530, cy + disc - 40, 16), 14)}" fill="${C.cobalt}" opacity=".9" />
<path d="${sparkle(cx + disc + 30, cy - disc - 10, 12)}" fill="${C.accent}" />`;

  // A cover image from src/assets/covers/ replaces the drawn emblem in the art square.
  const art = cover
    ? `<clipPath id="${id}-art"><rect x="40" y="110" width="520" height="520" /></clipPath>
<image href="${esc(cover)}" x="40" y="110" width="520" height="520" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}-art)" class="plate-cover" />
${coverRing(id, cx, cy, rand)}
<rect x="40" y="110" width="520" height="520" fill="none" stroke="${C.ink}" stroke-width="1.2" />`
    : drawn;

  const header = `
<text x="40" y="96" font-family="${SERIF}" font-size="96" font-weight="700" fill="none" stroke="${C.ink}" stroke-width="1.6">${project.number}</text>
<text x="45" y="99" font-family="${SERIF}" font-size="96" font-weight="700" fill="none" stroke="${C.cobalt}" stroke-width="1" opacity=".7">${project.number}</text>
<text x="560" y="58" text-anchor="end" font-size="26" font-weight="600" fill="${C.ink}" letter-spacing="8">${esc(cat.name)}</text>
<text x="560" y="86" text-anchor="end" font-family="${MONO}" font-size="16" fill="${MUTED}" letter-spacing="4">${cat.en}</text>`;

  const footer = `
<path d="${rule(40, 650, 560, 650, rand, 6, 1)}" fill="none" stroke="${C.ink}" stroke-width="1.4" />
<text x="40" y="702" font-size="38" font-weight="600" fill="${C.ink}">${esc(project.title)}</text>
<text x="40" y="734" font-family="${MONO}" font-size="18" fill="${MUTED}" letter-spacing="2">${esc(project.titleEn)}</text>
<text x="40" y="772" font-family="${MONO}" font-size="17" fill="${MUTED}">REC.${project.number} · ${cat.glyph}</text>
${barcode(420, 750, 140, 24, rand)}`;

  const w = size.width ?? W;
  const h = size.height ?? H;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${w}" height="${h}" class="plate" role="img" aria-label="${cat.en} ${project.number}: ${esc(project.titleEn)}">
<defs>${defs}</defs>
<rect width="${W}" height="${H}" fill="${C.paper}" />
${art}${header}${footer}
${crops(16, 16, W - 16, H - 16, C.ink, 18, 1)}
</svg>`;
}

export interface HeroOptions {
  /** Big outlined numeral in the corner. */
  mark?: string;
  /** Artwork layers from src/assets/poster/, merged into the stack by depth. */
  layers?: PosterLayer[];
  /** Text running around the disc. */
  legend?: string;
}

/**
 * The hero poster: a 1000 × 1000 stack of sheets centred on a cobalt disc. Far sheets are
 * hairline and blurred; near sheets are heavy and move most with the pointer.
 */
export function heroPoster({ mark = '01', legend = 'TRAVELS · A FAN 3D ARCHIVE · SANCTUM · FIGURE · ARMAMENT · ', layers = [] }: HeroOptions = {}): string {
  const rand = seeded(7);
  const cx = 560;
  const cy = 500;
  const disc = 230;

  // A tall pointed window behind everything, echoing the sanctum.
  const window = `M330 960V430Q330 150 560 40Q790 150 790 430V960`;

  const sheets: Sheet[] = [
    {
      depth: 0.12,
      blur: 3,
      body: `<path d="${window}" fill="none" stroke="${C.ink}" stroke-width="2" opacity=".12" />
<path d="${brush(sweep(30, 880, 980, 300, 70), 150)}" fill="${C.cobalt}" opacity=".08" />`,
    },
    {
      depth: 0.3,
      defs: `<pattern id="hero-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="2.4" fill="${C.ink}" /></pattern>
<radialGradient id="hero-fade"><stop offset=".25" stop-color="#fff" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></radialGradient>
<mask id="hero-mask"><rect width="1000" height="1000" fill="url(#hero-fade)" /></mask>`,
      body: `<circle cx="300" cy="700" r="270" fill="url(#hero-dots)" mask="url(#hero-mask)" opacity=".3" />
<g fill="none" stroke="${C.ink}" opacity=".35"><circle cx="${cx}" cy="${cy}" r="360" stroke-width="1" /><circle cx="${cx}" cy="${cy}" r="430" stroke-width="1" stroke-dasharray="1 9" /></g>`,
    },
    {
      depth: 0.4,
      body: `${rays(cx, cy, disc + 60, 520, 56, C.ink, rand)}
<g fill="none" stroke="${C.ink}">
  <path d="${ring(cx, cy, disc + 70, rand, 2)}" stroke-width="1.3" />
  <path d="${ring(cx, cy, disc + 72, rand, 2.6)}" stroke-width=".6" opacity=".4" />
  <path d="${ring(cx, cy, disc + 40, rand, 1.4)}" stroke-width=".8" stroke-dasharray="2 6" />
  <path d="${dial(cx, cy, disc + 70, 96, rand)}" stroke-width=".9" opacity=".7" />
  <path d="${brokenAxis(cx, 60, cx, 940, 5, rand)}${brokenAxis(70, cy, 950, cy, 5, rand)}" stroke-width=".6" opacity=".35" />
</g>
${ruler(955, 230, 770, C.ink, rand)}${sideColumn(36, 140, 'SANCTUM · FIGURE · ARMAMENT · FAN ARCHIVE', C.ink)}
${registration(80, 90, 18, C.ink, rand)}${registration(920, 920, 18, C.ink, rand)}${crops(16, 16, 984, 984, C.ink)}`,
    },
    {
      depth: 0.45,
      className: 'spin',
      defs: `<path id="hero-orbit" d="M${cx} ${cy - 395}a395 395 0 1 1 0 790a395 395 0 1 1 0-790" />`,
      body: `<text font-family="${MONO}" font-size="15" font-weight="600" letter-spacing="6" fill="${C.ink}"><textPath href="#hero-orbit">${legend.repeat(2)}</textPath></text>
<path d="${ring(cx, cy, 378, rand, 1.2)}" fill="none" stroke="${C.ink}" stroke-width="1.6" stroke-dasharray=".5 11" stroke-linecap="round" />
${[0.4, 1.9, 3.3, 4.6].map((a, k) => `<circle cx="${n(cx + Math.cos(a) * 378)}" cy="${n(cy + Math.sin(a) * 378)}" r="${k % 2 ? 4 : 7}" fill="${C.paper}" stroke="${C.accent}" stroke-width="1.6" />`).join('')}`,
    },
    {
      depth: 0.5,
      className: 'spin rev',
      body: `<path d="${brush(arcPoints(cx, cy, disc + 92, 2.2, 3.9), 20)}" fill="${C.accent}" />
<path d="${arc(cx, cy, disc + 104, 2.3, 4.6, rand, 1)}" fill="none" stroke="${C.accent}" stroke-width="1" />`,
    },
    {
      depth: 0.6,
      defs: `<pattern id="hero-paper-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="2" fill="${C.paper}" /></pattern>
<linearGradient id="hero-disc-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".05" /><stop offset="1" stop-color="#fff" /></linearGradient>
<mask id="hero-disc-mask"><rect width="1000" height="1000" fill="url(#hero-disc-fade)" /></mask>`,
      body: `<path d="${ring(cx, cy, disc, rand, 1.8)}" fill="${C.cobalt}" />
<circle cx="${cx}" cy="${cy}" r="${disc - 2}" fill="url(#hero-paper-dots)" mask="url(#hero-disc-mask)" opacity=".4" />
<path d="${ring(cx, cy, disc + 2, rand, 1.4)}" fill="none" stroke="${C.ink}" stroke-width="1.2" />
<path d="${ring(cx, cy, disc + 2, rand, 1.4)}" fill="none" stroke="${C.ink}" stroke-width="1" opacity=".45" transform="translate(1.5 1)" />`,
    },
    {
      depth: 0.9,
      body: `<path d="${ring(cx, 230, 170, rand, 1.6, 0.22)}" fill="none" stroke="${C.ink}" stroke-width="2.6" />
<path d="${brush(arcPoints(cx, 230, 170, 0.25, 2.9, 0.22), 10)}" fill="${C.accent}" />
<g fill="none" stroke="${C.paper}" stroke-width="2.4" stroke-linejoin="round">${emblem('cathedral', cx, cy + 10, disc * 0.95, rand)}</g>
<path d="${brush(sweep(380, 640, 760, 420, 14), 20)}" fill="${C.paper}" opacity=".55" />
${constellation(210, 300, 130, 8, C, rand)}
${hexCluster(845, 760, 26, C)}
${mosaic(850, 250, 60, 12, [C.cobalt, C.accent, C.ink, '#c7cecd'], rand)}`,
    },
    {
      depth: 1,
      className: 'collage',
      body: `${uiWindow(70, 590, 210, 96, 'RECORD · 01', C, rand, -4)}
${uiWindow(700, 80, 180, 76, 'SANCTUM', C, rand, 2)}
${ticket(610, 830, 240, 'TRAVELS', ['SANCTUM · FIGURE · ARMAMENT', 'FAN ARCHIVE · NON-COMMERCIAL'], C, 2)}
${envelope(300, 160, 1.2, C, -10)}${envelope(905, 470, 1, C, 12)}`,
    },
    {
      depth: 1.15,
      body: `<g fill="none" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round">${Array.from({ length: 9 }, (_, i) => {
        const x = 690 + i * 32 + rand() * 20;
        const y = 330 - i * 22 + rand() * 30;
        return `<path class="bird" style="--i:${i}" d="${bird(x, y, 10 + rand() * 8, i % 3 === 0)}" />`;
      }).join('')}</g>
${(
  [
    [820, 420, 18, C.accent],
    [260, 470, 13, C.cobalt],
    [520, 900, 15, C.ink],
  ] as const
)
  .map(([x, y, s, fill]) => `<path class="twinkle" d="${sparkle(x, y, s)}" fill="${fill}" />`)
  .join('')}`,
    },
    {
      depth: 1.35,
      body: `<text x="66" y="966" font-family="${SERIF}" font-size="280" fill="none" stroke="${C.cobalt}" stroke-width="1.4" opacity=".35">${esc(mark)}</text>
<text x="60" y="962" font-family="${SERIF}" font-size="280" fill="none" stroke="${C.accent}" stroke-width="1.8">${esc(mark)}</text>`,
    },
    {
      depth: 0.6,
      className: 'construct',
      body: `<g fill="none" stroke="${C.accent}" stroke-width=".9">
<path d="${rule(cx - disc - 60, cy, cx + disc + 60, cy, rand, 8, 1)}${rule(cx, cy - disc - 60, cx, cy + disc + 60, rand, 8, 1)}" />
<rect x="${cx - disc}" y="${cy - disc}" width="${disc * 2}" height="${disc * 2}" stroke-dasharray="4 6" />
<path d="M${cx - disc} ${cy + disc + 40}H${cx + disc}M${cx - disc} ${cy + disc + 28}v24M${cx + disc} ${cy + disc + 28}v24" /></g>
<text x="${cx}" y="${cy + disc + 70}" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${C.accent}">Ø ${disc * 2} · DISC R ${disc}</text>
<text x="${cx + disc + 20}" y="${cy - disc}" font-family="${MONO}" font-size="12" fill="${C.accent}">HALO 340 × 75</text>`,
    },
  ];
  // Artwork layers slot in among the drawn sheets by depth; the construction overlay stays on top.
  const construct = sheets.filter((s) => s.className === 'construct');
  const art: Sheet[] = layers.map((layer) => ({
    depth: layer.depth,
    blur: layer.blur,
    className: 'art',
    body: `<image href="${esc(layer.url)}" x="0" y="0" width="1000" height="1000" preserveAspectRatio="xMidYMid meet" data-layer="${esc(layer.key)}" />`,
  }));
  const stack = [...sheets.filter((s) => s.className !== 'construct'), ...art].sort((a, b) => a.depth - b.depth);
  return renderSheets([...stack, ...construct], 'hero-poster', 'Hero poster: a cobalt disc with rings, rays and a halo');
}

/** Points along an arc (no wobble), for brush strokes that follow a ring. */
function arcPoints(cx: number, cy: number, r: number, from: number, to: number, squash = 1): [number, number][] {
  const steps = 24;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * squash] as [number, number];
  });
}

function esc(text: string): string {
  return text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
}
