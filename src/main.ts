import './style.css';
import { PROJECTS } from './projects';
import { createAbout } from './rooms/about';
import { createCatalogue } from './rooms/catalogue';
import { createInspect } from './rooms/inspect';
import { createPrelude } from './rooms/prelude';
import type { Room } from './rooms/room';
import { parseRoute, type RoomName } from './router';
import { SITE } from './site';
import { enableDropZone } from './ui/dropzone';
import { enableRipples } from './ui/ripple';

document.querySelector('.brand-name')!.textContent = SITE.title;

const inspect = createInspect(PROJECTS);
const rooms: Record<RoomName, Room> = {
  prelude: createPrelude(),
  catalogue: createCatalogue(PROJECTS),
  inspect,
  about: createAbout(),
};

const container = document.querySelector<HTMLElement>('#rooms')!;
for (const room of Object.values(rooms)) {
  room.element.hidden = true;
  container.append(room.element);
}

let current: RoomName | null = null;
const wipe = document.querySelector<HTMLElement>('.wipe')!;

function navigate() {
  const route = parseRoute(window.location.hash);
  if (current && current !== route.room) {
    rooms[current].leave();
    rooms[current].element.hidden = true;
    // A cobalt bar sweeps across between rooms, like a light wipe.
    wipe.classList.remove('run');
    void wipe.offsetWidth;
    wipe.classList.add('run');
  }
  const room = rooms[route.room];
  room.element.hidden = false;
  document.body.dataset.room = route.room;
  document.querySelectorAll<HTMLElement>('.rooms a').forEach((a) => a.classList.toggle('active', a.dataset.room === route.room));
  current = route.room;
  room.enter(route);
  if (route.room !== 'inspect') document.body.dataset.state = 'ready';
}

window.addEventListener('hashchange', navigate);
navigate();

enableRipples(document.querySelector<HTMLElement>('#ripples')!);

// Drop a .glb anywhere on the site to open it in the inspect room.
const toast = document.querySelector<HTMLElement>('#toast')!;
enableDropZone(
  document.querySelector<HTMLElement>('#drop-overlay')!,
  (file) => inspect.loadFile(file),
  (name) => {
    toast.textContent = `${name} 不是 .glb / .gltf 文件 · not a .glb or .gltf file`;
    toast.hidden = false;
    setTimeout(() => (toast.hidden = true), 4000);
  },
);
