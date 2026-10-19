import * as THREE from 'three';
import type { Annotation } from '../projects';
import type { Viewer } from '../viewer/Viewer';
import { bracketPath, formatMetres, labelPoint, nearest, rectOf, reticlePath, type ScreenPoint } from './guides';
import { columnBounds, layoutLabels, type Anchor, type Rect } from './labelLayout';

const SVG_NS = 'http://www.w3.org/2000/svg';
const f = (v: number) => v.toFixed(1);

interface Item {
  annotation: Annotation;
  object: THREE.Object3D;
}

/**
 * The inspect room's graphic overlay, drawn in screen space over the 3D view each frame:
 * - a corner-bracket frame around every annotated part (the hovered one in cobalt, with a readout);
 * - a chain of lines joining the parts in order, each segment labelled with its real length;
 * - leader-line callouts out to label columns, drawn twice like misregistered print;
 * - cross-hair guides through the hovered part, and a pointer reticle that reaches to the nearest parts.
 */
/** Keep a frame inside the view, `margin` px from each edge. */
function clip(rect: Rect, width: number, height: number, margin: number): Rect {
  return {
    left: Math.max(rect.left, margin),
    right: Math.min(rect.right, width - margin),
    top: Math.max(rect.top, margin),
    bottom: Math.min(rect.bottom, height - margin),
  };
}

export class AnnotationOverlay {
  private svg: SVGSVGElement;
  private labels: HTMLElement[] = [];
  private items: Item[] = [];
  private box = new THREE.Box3();
  private centre = new THREE.Vector3();
  private corner = new THREE.Vector3();
  private hot: string | null = null;
  private pointer: ScreenPoint | null = null;
  visible = true;

  /**
   * @param obstacles UI elements (panels, cards) that labels must not hide behind.
   */
  constructor(private host: HTMLElement, private viewer: Viewer, private obstacles: () => HTMLElement[] = () => []) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.classList.add('annotation-lines');
    this.svg.setAttribute('aria-hidden', 'true');
    host.append(this.svg);
    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      this.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    host.addEventListener('pointerleave', () => (this.pointer = null));
  }

  /** Attach callouts for the current model. Annotations whose part is missing are skipped. */
  set(annotations: Annotation[] = []): void {
    this.clear();
    for (const annotation of annotations) {
      const object = this.viewer.findPart(annotation.part);
      if (!object) continue;
      this.items.push({ annotation, object });
      const label = document.createElement('div');
      label.className = 'callout';
      label.dataset.part = annotation.part;
      const index = String(this.items.length).padStart(2, '0');
      label.innerHTML = `<span class="callout-no">${index}</span><span class="callout-text"><strong></strong><small></small></span>`;
      label.querySelector('strong')!.textContent = annotation.label;
      label.querySelector('small')!.textContent = annotation.note ?? annotation.part;
      this.host.append(label);
      this.labels.push(label);
    }
    this.host.dataset.callouts = String(this.items.length);
  }

  /** Highlight the callout and frame for a hovered part. */
  highlight(partName: string | null): void {
    this.hot = partName;
    for (const label of this.labels) label.classList.toggle('hot', label.dataset.part === partName);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.svg.style.display = visible ? '' : 'none';
    for (const label of this.labels) label.hidden = !visible;
  }

  /** Recompute positions; call once per rendered frame. */
  update(): void {
    if (!this.visible || !this.items.length) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;

    // Project each part: its centre (anchor), screen-space frame and world centre.
    const worldCentres: THREE.Vector3[] = [];
    const frames: (Rect | null)[] = [];
    const anchors: (Anchor | null)[] = this.items.map(({ object }) => {
      this.box.setFromObject(object);
      if (this.box.isEmpty()) {
        worldCentres.push(new THREE.Vector3());
        frames.push(null);
        return null;
      }
      worldCentres.push(this.box.getCenter(new THREE.Vector3()));
      const corners: (ScreenPoint | null)[] = [];
      for (let i = 0; i < 8; i++) {
        this.corner.set(i & 1 ? this.box.max.x : this.box.min.x, i & 2 ? this.box.max.y : this.box.min.y, i & 4 ? this.box.max.z : this.box.min.z);
        corners.push(this.viewer.toScreen(this.corner));
      }
      frames.push(rectOf(corners));
      return this.viewer.toScreen(this.box.getCenter(this.centre));
    });

    const compact = width < 720;
    this.host.classList.toggle('compact-callouts', compact);
    const columns: [number, number] = compact ? [0.12, 0.88] : [0.16, 0.84];
    const hostBox = this.host.getBoundingClientRect();
    const rects: Rect[] = this.obstacles()
      .filter((node) => !node.hidden && node.offsetParent !== null)
      .map((node) => {
        const r = node.getBoundingClientRect();
        return { left: r.left - hostBox.left, right: r.right - hostBox.left, top: r.top - hostBox.top, bottom: r.bottom - hostBox.top };
      });
    const labelWidth = compact ? 36 : 150;
    const bounds = {
      left: columnBounds(width * columns[0] - labelWidth / 2, height, rects, 28, labelWidth / 2),
      right: columnBounds(width * columns[1] + labelWidth / 2, height, rects, 28, labelWidth / 2),
    };
    const placed = layoutLabels(anchors, { width, height, columns, gap: compact ? 38 : 54, bounds });

    let back = ''; // guides under the callouts
    let front = '';

    // Chain: join parts in annotation order, labelling each segment with its real length.
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1];
      const b = anchors[i];
      if (!a || !b) continue;
      back += `<path d="M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}" class="chain"/>`;
      if (!compact) {
        const at = labelPoint(a, b, 10);
        back += `<text x="${f(at.x)}" y="${f(at.y)}" class="measure">${formatMetres(worldCentres[i - 1].distanceTo(worldCentres[i]))}</text>`;
      }
    }

    placed.forEach((spot, i) => {
      const anchor = anchors[i];
      const label = this.labels[i];
      const frame = frames[i];
      const isHot = this.items[i].annotation.part === this.hot;
      if (!spot || !anchor) {
        label.hidden = true;
        return;
      }
      label.hidden = false;
      label.classList.toggle('left', spot.side === 'left');
      label.style.transform = `translate(${spot.x.toFixed(1)}px, ${spot.y.toFixed(1)}px)`;

      // Frame around the part; the hovered part gets cobalt brackets, cross-hairs and a readout.
      // Large parts (floors, whole arcades) would draw frames around most of the screen, so
      // only small parts get a resting frame; the hovered part is always framed, clipped to view.
      const small = frame && frame.right - frame.left < width * 0.35 && frame.bottom - frame.top < height * 0.45;
      if (frame && (isHot || small)) {
        const shown = isHot ? clip(frame, width, height, 16) : frame;
        back += `<path d="${bracketPath(shown, isHot ? 18 : 12, isHot ? 10 : 6)}" class="frame${isHot ? ' hot' : ''}"/>`;
        if (isHot) {
          const c = worldCentres[i];
          back += `<path d="M0 ${f(anchor.y)}H${width}M${f(anchor.x)} 0V${height}" class="cross"/>`;
          const tx = Math.min(Math.max(shown.left - 10, 8), width - 260);
          const ty = Math.max(shown.top - 16, 16);
          back += `<text x="${f(tx)}" y="${f(ty)}" class="readout">${String(i + 1).padStart(2, '0')} · X ${c.x.toFixed(2)}  Y ${c.y.toFixed(2)}  Z ${c.z.toFixed(2)}</text>`;
        }
      }

      // Leader line: from the part, diagonally to a knee, then level into the label.
      const dir = spot.side === 'left' ? 1 : -1;
      const kneeX = spot.x + dir * 36;
      const d = `M${f(anchor.x)} ${f(anchor.y)}L${f(kneeX)} ${f(spot.y)}L${f(spot.x)} ${f(spot.y)}`;
      front += `<circle cx="${f(anchor.x)}" cy="${f(anchor.y)}" r="7" class="ring"/><circle cx="${f(anchor.x)}" cy="${f(anchor.y)}" r="2" class="dot"/>`;
      front += `<path d="${d}" class="lead"/><path d="${d}" class="lead echo" transform="translate(1.5 1)"/>`;
    });

    // Pointer reticle reaching out to the two nearest parts.
    if (this.pointer && !compact) {
      const p = this.pointer;
      const near = nearest(p, anchors, 2, 360);
      for (const index of near) {
        const a = anchors[index]!;
        front += `<path d="M${f(p.x)} ${f(p.y)}L${f(a.x)} ${f(a.y)}" class="reach"/>`;
      }
      front += `<path d="${reticlePath(p)}" class="reticle"/>`;
      if (near.length) front += `<text x="${f(p.x + 22)}" y="${f(p.y - 18)}" class="readout">→ ${near.map((i) => String(i + 1).padStart(2, '0')).join(' / ')}</text>`;
    }

    this.svg.innerHTML = back + front;
  }

  clear(): void {
    for (const label of this.labels) label.remove();
    this.labels = [];
    this.items = [];
    this.svg.innerHTML = '';
    this.host.dataset.callouts = '0';
  }
}
