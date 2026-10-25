import type { Object3D } from 'three';
import { COVERS, CUSTOM_BACKDROPS } from '../assets';
import { projectPlate } from '../graphics/plates';
import { CATEGORIES, DEFAULT_BACKDROP, findProject, modelUrl, type BackdropId, type Project } from '../projects';
import { routeHref, type Route } from '../router';
import { PRESETS } from '../scenes';
import { AnnotationOverlay } from '../ui/annotations';
import { LightOverlay } from '../ui/lightOverlay';
import { isModelFile } from '../ui/dropzone';
import { createPanel } from '../ui/panel';
import { createReport } from '../ui/report';
import { loadModel } from '../viewer/loadModel';
import { budgetWarnings, formatCount, type ModelStats } from '../viewer/modelStats';
import { Viewer } from '../viewer/Viewer';
import { el, type Room } from './room';

const LOCAL_ID = 'local';

/**
 * 检视室: the 3D viewer with leader-line callouts, backdrops, a strip of entries and
 * local .glb preview. WebGL starts only the first time the room is opened.
 */
export function createInspect(projects: Project[]): Room & { loadFile(file: File): void; reject(name: string): void } {
  const element = el('section', 'room room-inspect');
  element.dataset.room = 'inspect';
  element.innerHTML = `
    <div class="backdrop" data-backdrop="paper"><div class="backdrop-art"></div></div>
    <div class="stage">
      <div class="viewport"></div>
      <div class="grain" aria-hidden="true"></div>
    </div>
    <aside class="card info">
      <p class="eyebrow record"></p>
      <h2 class="info-title"></h2>
      <p class="title-en muted"></p>
      <p class="description"></p>
      <p class="tools muted"></p>
      <dl class="stats"></dl>
    </aside>
    <div class="panel-host"></div>
    <div class="report-host"></div>
    <div class="pill hover-label" hidden></div>
    <div class="pill status" role="status" hidden></div>
    <div class="empty-local" hidden>
      <div class="empty-inner">
        <span class="local-plus">+</span>
        <p><strong>拖入 .glb 文件，或</strong></p>
        <label class="button primary">选择文件 <small>CHOOSE FILE</small><input type="file" accept=".glb,.gltf" hidden /></label>
        <p class="muted">文件只在你的浏览器里打开，不会上传。<br/>Your file never leaves your computer.</p>
      </div>
    </div>
    <nav class="strip" aria-label="Entries"></nav>`;

  const $ = <T extends HTMLElement>(selector: string) => element.querySelector<T>(selector)!;
  const stage = $('.stage');
  const backdrop = $('.backdrop');
  const status = $('.status');
  const hoverLabel = $('.hover-label');
  const emptyLocal = $('.empty-local');
  const fileInput = $<HTMLInputElement>('input[type=file]');

  // Thumbnail strip: one mini plate per entry plus the local slot.
  const strip = $('.strip');
  for (const project of projects) {
    const link = el('a', 'strip-item', projectPlate(project, { width: 150, height: 200 }, COVERS[project.id]));
    link.href = routeHref({ room: 'inspect', id: project.id });
    link.dataset.id = project.id;
    link.title = project.title;
    strip.append(link);
  }
  const localLink = el('a', 'strip-item strip-local', '<span>+</span><small>LOCAL</small>');
  localLink.href = routeHref({ room: 'inspect', id: LOCAL_ID });
  localLink.dataset.id = LOCAL_ID;
  localLink.title = '载入本地模型';
  strip.append(localLink);

  let viewer: Viewer | null = null;
  let overlay: AnnotationOverlay | null = null;
  let lightOverlay: LightOverlay | null = null;
  let currentLightPath: Project['lightPath'] = [];
  let panel: ReturnType<typeof createPanel> | null = null;
  let currentId: string | null = null;
  let localFile: File | null = null;
  let report: ReturnType<typeof createReport> | null = null;
  let active = false;
  let tourTimer = 0;
  let checked = new Set<Object3D>();
  let currentAnnotations: Project['annotations'] = [];

  function ensureViewer(): Viewer {
    if (viewer) return viewer;
    viewer = new Viewer($('.viewport'));
    report = createReport($('.report-host'), { onPrev: () => step(-1), onNext: () => step(1), onClose: exitInspect });
    overlay = new AnnotationOverlay(stage, viewer, () => [$('.info'), $('.panel-host'), report!.element, strip]);
    lightOverlay = new LightOverlay(stage, viewer);
    lightOverlay.setActive(false);
    lightOverlay.onResult = (result) => {
      if (result === 'solved') {
        viewer!.setBeam(lightOverlay!.centres());
        showStatus('光路贯通 · The light passes through');
      } else if (result === 'miss') {
        showStatus('顺序不对，重新来 · Not that way, start again', true);
      } else {
        status.hidden = true;
      }
    };
    viewer.events.onFrame = () => {
      overlay?.update();
      lightOverlay?.update();
    };
    viewer.events.onSelect = (name) => {
      if (!name || lightOverlay?.active) return;
      const index = viewer!.parts().findIndex((part) => (part.name || '(unnamed mesh)') === name);
      if (index >= 0) {
        stopTour();
        inspectPart(index);
      }
    };
    viewer.events.onHover = (name) => {
      hoverLabel.hidden = !name;
      hoverLabel.textContent = name ?? '';
      overlay?.highlight(name);
    };
    panel = createPanel($('.panel-host'), viewer, {
      onBackdrop: setBackdrop,
      onCallouts: (visible) => overlay?.setVisible(visible),
      onTour: () => (tourTimer ? stopTour() : startTour()),
      onExit: exitInspect,
      onLight: () => setLightMode(!lightOverlay?.active),
    });
    return viewer;
  }

  const backdropArt = $('.backdrop-art');

  /** Look at one part: ghost the rest, fly to it and list what was checked. */
  function inspectPart(index: number) {
    const v = viewer;
    if (!v || !report) return;
    const parts = v.parts();
    if (!parts.length) return;
    if (lightOverlay?.active) setLightMode(false);
    const part = parts[((index % parts.length) + parts.length) % parts.length];
    const data = v.reportFor(part);
    if (!data) return;
    v.focusPart(part);
    overlay?.setVisible(false); // the callouts would crowd the close-up
    checked.add(part);
    const name = part.name || '(unnamed mesh)';
    const note = currentAnnotations?.find((a) => a.part === name);
    report.show({
      index: parts.indexOf(part),
      total: parts.length,
      checked: checked.size,
      name: note ? `${note.label} · ${name}` : name,
      note: note?.note,
      report: data,
    });
  }

  function step(direction: number) {
    stopTour();
    const v = viewer;
    if (!v) return;
    const parts = v.parts();
    const at = v.focus ? parts.indexOf(v.focus) : direction > 0 ? -1 : 0;
    inspectPart(at + direction);
  }

  function exitInspect() {
    stopTour();
    viewer?.focusPart(null);
    report?.hide();
    overlay?.setVisible(panel?.state.callouts ?? true);
  }

  /** The light-path game: join the glowing points in the order the light travels. */
  function setLightMode(on: boolean) {
    const v = viewer;
    if (!v || !lightOverlay || !panel) return;
    if (on && !lightOverlay.length) return;
    if (on) exitInspect();
    lightOverlay.setActive(on);
    v.setBeam(null);
    overlay?.setVisible(!on && panel.state.callouts);
    panel.setLight(lightOverlay.length > 0, on);
    if (on) {
      const ends = lightOverlay.ends;
      showStatus(ends ? `按光的方向依次点亮，从「${ends[0]}」到「${ends[1]}」 · Join the points in the light's order` : '按光的方向依次点亮 · Join the points in order');
    } else {
      status.hidden = true;
    }
  }

  function stopTour() {
    window.clearInterval(tourTimer);
    tourTimer = 0;
    panel?.setTouring(false);
  }

  /** Walk through every part in turn, a few seconds each. */
  function startTour() {
    const v = viewer;
    if (!v) return;
    checked = new Set();
    let index = 0;
    inspectPart(0);
    panel?.setTouring(true);
    tourTimer = window.setInterval(() => {
      index++;
      if (index >= v.parts().length) {
        stopTour();
        showStatus(`${v.parts().length} 个部件检查完成 · Inspection complete`);
        return;
      }
      inspectPart(index);
    }, 3400);
  }

  window.addEventListener('keydown', (event) => {
    if (active && lightOverlay?.active && event.key === 'Escape') {
      setLightMode(false);
      event.preventDefault();
      return;
    }
    if (!active || !viewer?.focus || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLElement && event.target.closest('input, select, textarea')) return;
    if (event.key === 'Escape') exitInspect();
    else if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'ArrowLeft') step(-1);
    else return;
    event.preventDefault();
    // Capture phase: lil-gui stops key events at its own root, which would swallow them while a panel button has focus.
  }, true);

  /** Built-in backdrops are pure CSS; custom ones show the image or loop from src/assets/backdrops/. */
  function setBackdrop(id: BackdropId) {
    const custom = CUSTOM_BACKDROPS.find((b) => b.id === id);
    backdrop.dataset.backdrop = custom ? 'custom' : id;
    backdropArt.replaceChildren();
    if (custom) {
      const media = document.createElement(custom.kind === 'video' ? 'video' : 'img');
      media.src = custom.url;
      media.className = 'backdrop-media';
      media.setAttribute('alt', '');
      if (media instanceof HTMLVideoElement) {
        media.autoplay = media.loop = media.muted = media.playsInline = true;
      }
      backdropArt.append(media);
    }
    element.toggleAttribute('data-backdrop-dark', id === 'dusk' || id.endsWith('-dark'));
  }

  function setState(state: 'loading' | 'ready' | 'error' | 'empty') {
    element.dataset.state = state;
    document.body.dataset.state = state;
  }

  function showStatus(message: string, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
    status.hidden = false;
  }

  function renderInfo(record: string, title: string, titleEn: string, description: string, tools: string[] = []) {
    $('.record').textContent = record;
    $('.info-title').textContent = title;
    $('.title-en').textContent = titleEn;
    $('.description').textContent = description;
    $('.tools').textContent = tools.join(' · ');
  }

  function renderStats(stats: ModelStats | null) {
    const list = $('.stats');
    list.replaceChildren();
    if (!stats) return;
    const [x, y, z] = stats.size.map((v) => v.toFixed(2));
    const rows: [string, string][] = [
      ['Triangles', formatCount(stats.triangles)],
      ['Meshes', String(stats.meshes)],
      ['Materials', String(stats.materials)],
      ['Textures', stats.textures ? `${stats.textures} · ~${stats.textureMB} MB` : '0'],
      ['Size (m)', `${x} × ${y} × ${z}`],
    ];
    for (const [label, value] of rows) {
      const dt = el('dt');
      dt.textContent = label;
      const dd = el('dd');
      dd.textContent = value;
      list.append(dt, dd);
    }
    document.body.dataset.meshes = String(stats.meshes);
  }

  function markActive(id: string) {
    strip.querySelectorAll<HTMLElement>('.strip-item').forEach((item) => item.classList.toggle('active', item.dataset.id === id));
  }

  async function show(project: Project) {
    const v = ensureViewer();
    emptyLocal.hidden = true;
    setState('loading');
    const cat = CATEGORIES[project.category];
    renderInfo(`REC.${project.number} · ${cat.name} ${cat.en}`, project.title, project.titleEn, project.description, project.tools);
    showStatus('载入中 · Loading…');
    try {
      const url = modelUrl(project, import.meta.env.BASE_URL);
      if (url) {
        const { scene, animations } = await loadModel(url, (f) => showStatus(`载入中 · Loading… ${Math.round(f * 100)}%`));
        v.setModel(scene, animations);
      } else {
        v.setModel(PRESETS[project.preset ?? project.category]());
      }
      afterLoad(project.annotations, project.backdrop ?? DEFAULT_BACKDROP, project.lightPath);
    } catch (error) {
      fail(error);
    }
  }

  async function showLocal(file: File) {
    const v = ensureViewer();
    emptyLocal.hidden = true;
    setState('loading');
    renderInfo('LOCAL · 本地预览', file.name, 'LOCAL PREVIEW', '本地预览，文件只在你的浏览器里打开。Local preview: the file stays on your computer.');
    showStatus('载入中 · Loading…');
    const url = URL.createObjectURL(file);
    try {
      const { scene, animations } = await loadModel(url, (f) => showStatus(`载入中 · Loading… ${Math.round(f * 100)}%`));
      v.setModel(scene, animations);
      afterLoad([], DEFAULT_BACKDROP);
    } catch (error) {
      fail(error);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function afterLoad(annotations: Project['annotations'], backdropId: BackdropId, lightPath: Project['lightPath'] = []) {
    currentLightPath = lightPath;
    const v = viewer!;
    stopTour();
    report?.hide();
    checked = new Set();
    currentAnnotations = annotations;
    lightOverlay!.set(currentLightPath);
    lightOverlay!.setActive(false);
    panel!.setLight(lightOverlay!.length > 0, false);
    panel!.resetForModel(backdropId);
    setBackdrop(backdropId);
    overlay!.set(annotations);
    overlay!.setVisible(panel!.state.callouts);
    renderStats(v.stats);
    const warnings = v.stats ? budgetWarnings(v.stats) : [];
    v.setShadows(warnings.length === 0);
    if (warnings.length) showStatus(`模型较大，已关闭阴影 · Heavy model (${warnings.join(', ')}): shadows off`);
    else status.hidden = true;
    setState('ready');
  }

  function fail(error: unknown) {
    console.error(error);
    showStatus(`载入失败 · Could not load model: ${error instanceof Error ? error.message : String(error)}`, true);
    setState('error');
  }

  function showEmptyLocal() {
    overlay?.clear();
    renderInfo('LOCAL · 本地预览', '载入本地模型', 'LOAD YOUR OWN .GLB', 'Export from Blender as glTF Binary (.glb), then drop it here.');
    renderStats(null);
    emptyLocal.hidden = false;
    status.hidden = true;
    setState('empty');
  }

  const acceptFile = (file: File) => {
    localFile = file;
    if (currentId === LOCAL_ID) showLocal(file);
    else window.location.hash = routeHref({ room: 'inspect', id: LOCAL_ID });
  };

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (isModelFile(file.name)) acceptFile(file);
    else showStatus(`${file.name} 不是 .glb / .gltf 文件`, true);
    fileInput.value = '';
  });

  return {
    element,
    loadFile: acceptFile,
    reject: (name: string) => showStatus(`${name} 不是 .glb / .gltf 文件 · not a .glb or .gltf file`, true),
    enter(route: Route) {
      if (route.room !== 'inspect') return;
      active = true;
      const id = route.id ?? projects[0]?.id ?? LOCAL_ID;
      ensureViewer().resume();
      if (id === currentId && element.dataset.state === 'ready') return;
      currentId = id;
      markActive(id);
      if (id === LOCAL_ID) {
        if (localFile) showLocal(localFile);
        else showEmptyLocal();
        return;
      }
      const project = findProject(projects, id);
      if (project) show(project);
      else showEmptyLocal();
    },
    leave() {
      active = false;
      if (lightOverlay?.active) setLightMode(false);
      stopTour();
      viewer?.pause();
    },
  };
}
