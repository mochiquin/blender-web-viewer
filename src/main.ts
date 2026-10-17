import './style.css';
import { createDemoModel } from './demo/demoModel';
import { findProject, modelUrl, PROJECTS, type Project } from './projects';
import { enableDropZone } from './ui/dropzone';
import { createPanel } from './ui/panel';
import { loadModel } from './viewer/loadModel';
import { formatCount, type ModelStats } from './viewer/modelStats';
import { Viewer } from './viewer/Viewer';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

const hoverLabel = $('#hover-label');
const status = $('#status');

const viewer = new Viewer($('#viewport'), {
  onHover: (name) => {
    hoverLabel.hidden = !name;
    hoverLabel.textContent = name ?? '';
  },
});

// Expose state on <body> so the browser smoke test can check what happened.
function setState(state: 'loading' | 'ready' | 'error') {
  document.body.dataset.state = state;
}

function showStatus(message: string, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
  status.hidden = false;
}

function renderInfo(title: string, description: string, tools: string[] = []) {
  $('#project-title').textContent = title;
  $('#project-description').textContent = description;
  $('#project-tools').textContent = tools.join(' · ');
}

function renderStats(stats: ModelStats | null) {
  const list = $('#stats');
  list.replaceChildren();
  if (!stats) return;
  const [x, y, z] = stats.size.map((n) => n.toFixed(2));
  const rows: [string, string][] = [
    ['Triangles', formatCount(stats.triangles)],
    ['Vertices', formatCount(stats.vertices)],
    ['Meshes', String(stats.meshes)],
    ['Materials', String(stats.materials)],
    ['Textures', String(stats.textures)],
    ['Size (m)', `${x} × ${y} × ${z}`],
  ];
  for (const [label, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.append(dt, dd);
  }
  document.body.dataset.meshes = String(stats.meshes);
}

async function showModel(source: { url: string | null }, title: string, description: string, tools?: string[]) {
  setState('loading');
  renderInfo(title, description, tools);
  showStatus('Loading…');
  try {
    if (source.url) {
      const { scene, animations } = await loadModel(source.url, (f) => showStatus(`Loading… ${Math.round(f * 100)}%`));
      viewer.setModel(scene, animations);
    } else {
      viewer.setModel(createDemoModel());
    }
    panel.resetForNewModel();
    renderStats(viewer.stats);
    status.hidden = true;
    setState('ready');
  } catch (error) {
    console.error(error);
    showStatus(`Could not load model: ${error instanceof Error ? error.message : String(error)}`, true);
    setState('error');
  }
}

function showProject(project: Project) {
  const url = new URL(window.location.href);
  url.searchParams.set('model', project.id);
  history.replaceState(null, '', url);
  return showModel({ url: modelUrl(project, import.meta.env.BASE_URL) }, project.title, project.description, project.tools);
}

const initial = findProject(PROJECTS, new URLSearchParams(window.location.search).get('model'));
const panel = createPanel(viewer, PROJECTS, initial.id, (id) => showProject(findProject(PROJECTS, id)));

enableDropZone(
  $('#drop-overlay'),
  (file) => {
    const url = URL.createObjectURL(file);
    showModel({ url }, file.name, 'Local preview. The file stays on your computer.').finally(() => URL.revokeObjectURL(url));
  },
  (name) => showStatus(`${name} is not a .glb or .gltf file`, true),
);

showProject(initial);
