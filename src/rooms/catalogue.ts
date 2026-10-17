import { projectPlate } from '../graphics/plates';
import { CATEGORIES, type Category, type Project } from '../projects';
import { routeHref } from '../router';
import { el, type Room } from './room';

/** 图录: one plate per entry, filterable by category. Clicking a plate opens it in the inspect room. */
export function createCatalogue(projects: Project[]): Room {
  const element = el('section', 'room room-catalogue');
  element.dataset.room = 'catalogue';

  const header = el(
    'header',
    'room-header',
    `<p class="eyebrow">CATALOGUE · ${String(projects.length).padStart(2, '0')} RECORDS</p><h2>图录</h2>`,
  );
  const filters = el('div', 'filters');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter by category');
  const grid = el('div', 'plate-grid');

  const options: (Category | 'all')[] = ['all', ...(Object.keys(CATEGORIES) as Category[])];
  for (const option of options) {
    const button = el('button', 'chip');
    button.type = 'button';
    button.dataset.filter = option;
    button.textContent = option === 'all' ? '全部 ALL' : `${CATEGORIES[option].name} ${CATEGORIES[option].en}`;
    button.addEventListener('click', () => applyFilter(option));
    filters.append(button);
  }

  for (const project of projects) {
    const card = el('a', 'plate-card');
    card.href = routeHref({ room: 'inspect', id: project.id });
    card.dataset.category = project.category;
    card.innerHTML = projectPlate(project);
    grid.append(card);
  }

  const local = el(
    'a',
    'plate-card plate-local',
    `<div class="local-inner"><span class="local-plus">+</span><strong>载入本地模型</strong><small>LOAD YOUR OWN .GLB<br/>The file stays on your computer</small></div>`,
  );
  local.href = routeHref({ room: 'inspect', id: 'local' });
  grid.append(local);

  function applyFilter(option: Category | 'all') {
    filters.querySelectorAll<HTMLElement>('.chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.filter === option));
    grid.querySelectorAll<HTMLElement>('.plate-card[data-category]').forEach((card) => {
      card.hidden = option !== 'all' && card.dataset.category !== option;
    });
  }
  applyFilter('all');

  element.append(header, filters, grid);
  return { element, enter() {}, leave() {} };
}
