import * as THREE from 'three';
import type { Annotation } from '../projects';
import type { Viewer } from '../viewer/Viewer';
import { columnBounds, layoutLabels, type Anchor, type Rect } from './labelLayout';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Leader-line callouts that follow the model as the camera moves: a ring on the part, an
 * elbow line out to a label column, drawn twice with a slight offset like misregistered print.
 */
export class AnnotationOverlay {
  private svg: SVGSVGElement;
  private labels: HTMLElement[] = [];
  private items: { annotation: Annotation; object: THREE.Object3D }[] = [];
  private box = new THREE.Box3();
  private centre = new THREE.Vector3();
  visible = true;

  /**
   * @param obstacles UI elements (panels, cards) that labels must not hide behind.
   */
  constructor(private host: HTMLElement, private viewer: Viewer, private obstacles: () => HTMLElement[] = () => []) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.classList.add('annotation-lines');
    this.svg.setAttribute('aria-hidden', 'true');
    host.append(this.svg);
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

  /** Highlight the callout for a hovered part. */
  highlight(partName: string | null): void {
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
    const anchors: (Anchor | null)[] = this.items.map(({ object }) => {
      this.box.setFromObject(object);
      if (this.box.isEmpty()) return null;
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

    let lines = '';
    placed.forEach((spot, i) => {
      const anchor = anchors[i];
      const label = this.labels[i];
      if (!spot || !anchor) {
        label.hidden = true;
        return;
      }
      label.hidden = false;
      label.classList.toggle('left', spot.side === 'left');
      label.style.transform = `translate(${spot.x.toFixed(1)}px, ${spot.y.toFixed(1)}px)`;
      // Elbow: from the part, diagonally to a knee, then level into the label.
      const dir = spot.side === 'left' ? 1 : -1;
      const kneeX = spot.x + dir * 36;
      const d = `M${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)}L${kneeX.toFixed(1)} ${spot.y.toFixed(1)}L${spot.x.toFixed(1)} ${spot.y.toFixed(1)}`;
      lines += `<circle cx="${anchor.x.toFixed(1)}" cy="${anchor.y.toFixed(1)}" r="7" class="ring"/><circle cx="${anchor.x.toFixed(1)}" cy="${anchor.y.toFixed(1)}" r="2" class="dot"/>`;
      lines += `<path d="${d}" class="lead"/><path d="${d}" class="lead echo" transform="translate(1.5 1)"/>`;
    });
    this.svg.innerHTML = lines;
  }

  clear(): void {
    for (const label of this.labels) label.remove();
    this.labels = [];
    this.items = [];
    this.svg.innerHTML = '';
    this.host.dataset.callouts = '0';
  }
}
