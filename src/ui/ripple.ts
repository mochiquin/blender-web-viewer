const LETTERS = 'NACTIEVSOKRL';
const MAX_MARKS = 6;
/** Clicks on these keep their own feedback, so no mark is drawn over them. */
const SKIP = 'a, button, input, select, textarea, canvas, .lil-gui, [data-no-ripple]';

const pad = (value: number) => String(Math.max(0, Math.round(value))).padStart(4, '0');

/** Markup for one click mark: a ring, a crosshair, a stamped letter and the coordinates. */
export function rippleMarkup(x: number, y: number, letter: string): string {
  return `<i></i><i></i><b>${letter}</b><span>${pad(x)} · ${pad(y)}</span>`;
}

/** Click marks like annotations on a print: they appear where you click and fade out. */
export function enableRipples(layer: HTMLElement, rand: () => number = Math.random) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('pointerdown', (event) => {
    if (reduced.matches || event.button !== 0 || (event.target as Element | null)?.closest(SKIP)) return;
    while (layer.childElementCount >= MAX_MARKS) layer.firstElementChild?.remove();
    const mark = document.createElement('div');
    mark.className = 'ripple';
    mark.style.left = `${event.clientX}px`;
    mark.style.top = `${event.clientY}px`;
    mark.innerHTML = rippleMarkup(event.clientX, event.clientY, LETTERS[Math.floor(rand() * LETTERS.length)]);
    layer.append(mark);
    setTimeout(() => mark.remove(), 1500);
  });
}
