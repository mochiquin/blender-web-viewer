import { HERO_NODES, heroPoster } from '../graphics/plates';
import { attachPosterGuides } from '../ui/posterGuides';
import { SITE } from '../site';
import { el, type Room } from './room';

/** 序章: the hero poster. Its layers drift with the pointer at different depths (parallax). */
export function createPrelude(): Room {
  const element = el('section', 'room room-prelude');
  element.dataset.room = 'prelude';
  element.innerHTML = `
    <div class="hero-art plate-host">${heroPoster()}</div>
    <div class="hero-copy">
      <p class="eyebrow">FAN ARCHIVE · RECORD 00</p>
      <h1></h1>
      <p class="hero-en"></p>
      <p class="hero-tagline"></p>
      <div class="hero-actions">
        <a class="button primary" href="#/catalogue">进入图录 <small>CATALOGUE</small></a>
        <a class="button" href="#/inspect">检视室 <small>INSPECT</small></a>
      </div>
    </div>
    <p class="hero-caption"><span>01 — 03</span>以图为录 · 以模为证<small>SANCTUM · FIGURE · ARMAMENT</small></p>
    <p class="hero-side" aria-hidden="true">FAITH. &nbsp; FORM. &nbsp; CRAFT.</p>`;
  element.querySelector('h1')!.textContent = SITE.title;
  element.querySelector('.hero-en')!.textContent = SITE.titleEn;
  element.querySelector('.hero-tagline')!.textContent = SITE.tagline;
  const guides = attachPosterGuides(element, element.querySelector<HTMLElement>('.poster')!, HERO_NODES);

  let frame = 0;
  const onMove = (e: PointerEvent) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      element.style.setProperty('--mx', ((e.clientX / window.innerWidth - 0.5) * 2).toFixed(3));
      element.style.setProperty('--my', ((e.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
    });
  };

  return {
    element,
    enter() {
      window.addEventListener('pointermove', onMove);
    },
    leave() {
      window.removeEventListener('pointermove', onMove);
      guides.clear();
    },
  };
}
