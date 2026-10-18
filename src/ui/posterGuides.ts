import { bracketPath, nearest, reticlePath, type ScreenPoint } from './guides';

const SVG_NS = 'http://www.w3.org/2000/svg';
const f = (v: number) => v.toFixed(1);

/**
 * Pointer guides over a poster: a reticle follows the pointer and reaches out with construction
 * lines to the nearest key points, framing each with corner brackets and naming it.
 */
export function attachPosterGuides(room: HTMLElement, poster: HTMLElement, nodes: { x: number; y: number; name: string }[]) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('poster-guides');
  svg.setAttribute('aria-hidden', 'true');
  room.append(svg);

  let queued: PointerEvent | null = null;

  function draw(e: PointerEvent) {
    const roomBox = room.getBoundingClientRect();
    const box = poster.getBoundingClientRect();
    const p: ScreenPoint = { x: e.clientX - roomBox.left, y: e.clientY - roomBox.top };
    const scale = box.width / 1000;
    const points = nodes.map((node) => ({ x: box.left - roomBox.left + node.x * scale, y: box.top - roomBox.top + node.y * scale }));
    const near = nearest(p, points, 3, 280);
    let out = '';
    near.forEach((index, rank) => {
      const q = points[index];
      const s = 22;
      out += `<path d="M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}" class="reach${rank ? '' : ' first'}"/>`;
      out += `<path d="${bracketPath({ left: q.x - s, right: q.x + s, top: q.y - s, bottom: q.y + s }, 10, 0)}" class="frame${rank ? '' : ' hot'}"/>`;
      out += `<text x="${f(q.x + s + 8)}" y="${f(q.y - s + 4)}" class="readout">${String(index + 1).padStart(2, '0')} · ${nodes[index].name}</text>`;
    });
    out += `<path d="${reticlePath(p, 12)}" class="reticle"/>`;
    out += `<text x="${f(p.x + 18)}" y="${f(p.y + 30)}" class="readout dim">X ${Math.round((p.x - (box.left - roomBox.left)) / scale)} · Y ${Math.round((p.y - (box.top - roomBox.top)) / scale)}</text>`;
    svg.innerHTML = out;
    room.dataset.guides = String(near.length);
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!queued) requestAnimationFrame(() => {
      if (queued) draw(queued);
      queued = null;
    });
    queued = e;
  };
  const onLeave = () => {
    svg.innerHTML = '';
    room.dataset.guides = '0';
  };

  room.addEventListener('pointermove', onMove);
  room.addEventListener('pointerleave', onLeave);
  return { clear: onLeave };
}
