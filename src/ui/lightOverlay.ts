import * as THREE from 'three';
import { seeded } from '../graphics/rng';
import { brush, n, ring, rule, sweep } from '../graphics/sketch';
import type { Annotation } from '../projects';
import type { Viewer } from '../viewer/Viewer';
import { LightPuzzle, type PressResult } from './lightPuzzle';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, className: string, parent: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  node.setAttribute('class', className);
  parent.append(node);
  return node;
}

/** A four-pointed star, for the sparks around the burst. */
const sparkle = (cx: number, cy: number, r: number) =>
  `M${n(cx)} ${n(cy - r)}L${n(cx + r * 0.22)} ${n(cy - r * 0.22)}L${n(cx + r)} ${n(cy)}L${n(cx + r * 0.22)} ${n(cy + r * 0.22)}L${n(cx)} ${n(cy + r)}L${n(cx - r * 0.22)} ${n(cy + r * 0.22)}L${n(cx - r)} ${n(cy)}L${n(cx - r * 0.22)} ${n(cy - r * 0.22)}Z`;

/**
 * The light-path game drawn over the 3D view: a hand-drawn marker on each part the light passes,
 * to be joined in the order the light travels. Joined points are inked in as a line; the open end
 * follows the pointer as a dashed band. Elements persist and only their attributes change per
 * frame, so a marker never disappears under a click.
 */
export class LightOverlay {
  private svg: SVGSVGElement;
  private light: SVGGElement;
  private chainPath: SVGPathElement;
  private band: SVGPathElement;
  private burst: SVGGElement;
  private marks: SVGGElement[] = [];
  private objects: THREE.Object3D[] = [];
  private path: Annotation[] = [];
  private puzzle = new LightPuzzle(0);
  private pointer: { x: number; y: number } | null = null;
  private box = new THREE.Box3();
  active = false;
  onResult?: (result: PressResult, index: number) => void;

  constructor(private host: HTMLElement, private viewer: Viewer) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'light-svg');
    this.svg.setAttribute('aria-hidden', 'true');
    host.append(this.svg);
    this.light = svgEl('g', 'lp-layer', this.svg);
    this.band = svgEl('path', 'lp-band', this.light);
    this.chainPath = svgEl('path', 'lp-chain', this.light);
    this.burst = svgEl('g', 'lp-burst', this.light);
    this.burst.innerHTML =
      Array.from({ length: 22 }, (_, i) => {
        const rand = seeded(i + 90);
        const a = (i / 22) * Math.PI * 2;
        const r0 = 26 + rand() * 14;
        const r1 = 90 + rand() * 110;
        const mid = (r0 + r1) / 2;
        return `<path d="${brush([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a + 0.01) * mid, Math.sin(a + 0.01) * mid], [Math.cos(a) * r1, Math.sin(a) * r1]], 2 + rand() * 4)}"/>`;
      }).join('') +
      `<path class="lp-burst-ring" d="${ring(0, 0, 60, seeded(7), 2)}"/>` +
      [0, 1, 2, 3].map((k) => `<path class="lp-spark" d="${sparkle(Math.cos(k * 1.6) * 80, Math.sin(k * 1.6) * 60, 12)}"/>`).join('');

    this.svg.addEventListener('click', (event) => {
      const mark = (event.target as Element).closest<SVGGElement>('.lp-mark');
      if (mark) {
        event.stopPropagation();
        this.press(Number(mark.dataset.key));
      }
    });
    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      this.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    host.addEventListener('pointerleave', () => (this.pointer = null));
  }

  /** The points of the current path, in light order, as world-space centres of their parts. */
  centres(): THREE.Vector3[] {
    return this.objects.map((object) => this.box.setFromObject(object).getCenter(new THREE.Vector3()));
  }

  /** Build the markers for a model's light path. Entries whose part is missing are skipped. */
  set(path: Annotation[] = []): void {
    this.clear();
    for (const entry of path) {
      const object = this.viewer.findPart(entry.part);
      if (!object) continue;
      this.path.push(entry);
      this.objects.push(object);
      const i = this.marks.length;
      const rand = seeded(i * 19 + 3);
      const g = svgEl('g', 'lp-mark', this.light);
      g.dataset.key = String(i);
      g.innerHTML =
        `<circle class="lp-hit" r="26"/>` +
        `<path class="lp-ring" d="${ring(0, 0, 15, rand, 1)}"/>` +
        `<path class="lp-ring echo" transform="translate(2 1.4)" d="${ring(0, 0, 15, rand, 1.3)}"/>` +
        `<path class="lp-cross" d="${rule(-24, 0, 24, 0, rand, 0, 0.4)}${rule(0, -24, 0, 24, rand, 0, 0.4)}"/>` +
        `<text x="22" y="-14"></text><text class="en" x="22" y="0"></text>`;
      const [label, note] = g.querySelectorAll('text');
      label.textContent = entry.label;
      note.textContent = entry.note ?? entry.part;
      this.marks.push(g);
    }
    this.puzzle = new LightPuzzle(this.marks.length);
  }

  get length(): number {
    return this.marks.length;
  }

  /** The first and last labels, for a hint about which way the light runs. */
  get ends(): [string, string] | null {
    return this.path.length > 1 ? [this.path[0].label, this.path[this.path.length - 1].label] : null;
  }

  setActive(on: boolean): void {
    this.active = on;
    this.restart();
    this.host.classList.toggle('light-mode', on);
    this.svg.style.display = on ? '' : 'none';
  }

  /** Clear the chain and any solved state, keeping the markers. */
  restart(): void {
    this.puzzle.reset();
    this.host.classList.remove('solved', 'miss');
    this.marks.forEach((m) => m.classList.remove('lit'));
    this.chainPath.setAttribute('d', '');
    this.band.setAttribute('d', '');
  }

  private press(index: number): void {
    if (!this.active) return;
    const result = this.puzzle.press(index);
    if (result === 'ignored') return;
    if (result === 'miss') {
      this.marks.forEach((m) => m.classList.remove('lit'));
      this.host.classList.remove('miss');
      void this.host.offsetWidth; // restart the shake
      this.host.classList.add('miss');
    } else {
      this.marks[index].classList.add('lit');
      if (result === 'solved') this.host.classList.add('solved');
    }
    this.onResult?.(result, index);
  }

  /** Reposition the markers and the chain; call once per rendered frame. */
  update(): void {
    if (!this.active) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width) return;
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const spots = this.centres().map((centre) => this.viewer.toScreen(centre));
    spots.forEach((spot, i) => {
      this.marks[i].setAttribute('transform', spot ? `translate(${n(spot.x)} ${n(spot.y)})` : '');
      this.marks[i].style.display = spot ? '' : 'none';
    });

    const chain = this.puzzle.chain;
    const solved = this.puzzle.solved;
    let d = '';
    for (let k = 1; k < chain.length; k++) {
      const a = spots[chain[k - 1]];
      const b = spots[chain[k]];
      if (!a || !b) continue;
      d += solved ? brush(sweep(a.x, a.y, b.x, b.y, 4, 10), 9) : rule(a.x, a.y, b.x, b.y, seeded(k * 13), 10, 5);
    }
    this.chainPath.setAttribute('d', d);
    this.chainPath.classList.toggle('brush', solved);

    const last = chain.length ? spots[chain[chain.length - 1]] : null;
    this.band.setAttribute('d', last && this.pointer && !solved ? `M${n(last.x)} ${n(last.y)}L${n(this.pointer.x)} ${n(this.pointer.y)}` : '');
    const end = spots[spots.length - 1];
    if (end) this.burst.setAttribute('transform', `translate(${n(end.x)} ${n(end.y)})`);
  }

  clear(): void {
    for (const mark of this.marks) mark.remove();
    this.marks = [];
    this.objects = [];
    this.path = [];
    this.puzzle = new LightPuzzle(0);
  }
}
