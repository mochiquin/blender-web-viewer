import { SITE } from '../site';
import { el, type Room } from './room';

/** 关于: who made this, the fan-work disclaimer, credits and links. */
export function createAbout(): Room {
  const element = el('section', 'room room-about');
  element.dataset.room = 'about';
  const links = Object.entries(SITE.links)
    .filter(([, url]) => url)
    .map(([name, url]) => {
      const href = name === 'email' ? `mailto:${url}` : url;
      return `<li><a href="${href}" target="_blank" rel="noopener">${name}</a></li>`;
    })
    .join('');

  element.innerHTML = `
    <header class="room-header"><p class="eyebrow">ABOUT · COLOPHON</p><h2>关于</h2></header>
    <div class="about-grid">
      <article class="card">
        <h3>作者 · Author</h3>
        <p class="author"></p>
        <p>3D artist and developer. Models, textures and graphics on this site are my own work unless marked otherwise.</p>
        <ul class="links">${links}</ul>
      </article>
      <article class="card">
        <h3>技术 · Built with</h3>
        <ul class="tech">
          <li>TypeScript, Vite</li>
          <li>Three.js (WebGL), glTF with Draco / Meshopt</li>
          <li>SVG graphics generated in code</li>
          <li>Blender, ZBrush, Substance 3D Painter</li>
        </ul>
      </article>
      <article class="card disclaimer">
        <h3>声明 · Disclaimer</h3>
        <p class="disclaimer-text"></p>
      </article>
    </div>`;
  element.querySelector('.author')!.textContent = SITE.author;
  element.querySelector('.disclaimer-text')!.textContent = SITE.disclaimer;
  return { element, enter() {}, leave() {} };
}
