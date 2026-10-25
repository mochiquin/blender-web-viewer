import GUI from 'lil-gui';
import { CUSTOM_BACKDROPS } from '../assets';
import { BACKDROPS, type BackdropId, type BuiltInBackdrop } from '../projects';
import type { Viewer } from '../viewer/Viewer';
import { VIEW_MODE_LABELS, VIEW_MODES, type ViewMode } from '../viewer/viewModes';

export const BACKDROP_LABELS: Record<BuiltInBackdrop, string> = {
  paper: '纸面 Paper',
  blueprint: '图纸 Blueprint',
  halftone: '网点 Halftone',
  dusk: '暮色 Dusk',
};

export interface PanelHandlers {
  onBackdrop: (id: BackdropId) => void;
  onCallouts: (visible: boolean) => void;
  /** Start or stop the automatic part-by-part inspection. */
  onTour: () => void;
  /** Leave the inspection of a single part. */
  onExit: () => void;
  /** Start or stop the light-path game. */
  onLight: () => void;
}

/** The control panel in the inspect room, like a small Blender N-panel for the viewport. */
export function createPanel(container: HTMLElement, viewer: Viewer, handlers: PanelHandlers) {
  const state = {
    viewMode: 'shaded' as ViewMode,
    explode: 0,
    backdrop: 'paper' as BackdropId,
    callouts: true,
    exposure: viewer.renderer.toneMappingExposure,
    environment: viewer.scene.environmentIntensity,
    keyLight: viewer.keyLight.intensity,
    autoRotate: false,
    grid: false,
    section: 0,
  };
  let explodeTimer = 0;
  const stopExplodePlayback = () => {
    cancelAnimationFrame(explodeTimer);
    explodeTimer = 0;
  };

  const gui = new GUI({ title: '检视 · INSPECT', container });
  // Start collapsed on phones so the model is not hidden behind the panel.
  if (window.matchMedia('(max-width: 640px)').matches) gui.close();

  const modeOptions = Object.fromEntries(VIEW_MODES.map((m) => [VIEW_MODE_LABELS[m], m]));
  gui.add(state, 'viewMode', modeOptions).name('Shading').onChange((m: ViewMode) => viewer.setViewMode(m));
  const explodeController = gui.add(state, 'explode', 0, 1, 0.01).name('Explode').onChange((v: number) => {
    stopExplodePlayback();
    viewer.setExplode(v);
  });
  gui.add(state, 'callouts').name('Callouts').onChange(handlers.onCallouts);
  const backdropOptions = Object.fromEntries([
    ...BACKDROPS.map((b) => [BACKDROP_LABELS[b], b]),
    ...CUSTOM_BACKDROPS.map((b) => [`自定义 ${b.id}`, b.id]),
  ]);
  gui.add(state, 'backdrop', backdropOptions).name('Backdrop').onChange(handlers.onBackdrop);

  const inspect = gui.addFolder('Inspect 检查');
  inspect.add(state, 'section', 0, 1, 0.01).name('Section 剖切').onChange((v: number) => viewer.setSection(v));
  /** Open the model layer by layer, innermost parts first. */
  const playExplode = () => {
    stopExplodePlayback();
    state.explode = 0;
    viewer.setExplode(0, 1);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / 3200, 1);
      state.explode = t;
      viewer.setExplode(t, 1);
      explodeController.updateDisplay();
      explodeTimer = t < 1 ? requestAnimationFrame(step) : 0;
    };
    explodeTimer = requestAnimationFrame(step);
  };
  inspect.add({ play: playExplode }, 'play').name('逐层展开 ▶');
  const tour = inspect.add({ tour: handlers.onTour }, 'tour').name('逐项检查 ▶');
  inspect.add({ exit: handlers.onExit }, 'exit').name('结束检查 ✕');
  const light = inspect.add({ light: handlers.onLight }, 'light').name('✦ 光路');
  light.disable();

  const lighting = gui.addFolder('Lighting').close();
  lighting.add(state, 'exposure', 0.2, 3, 0.01).name('Exposure').onChange((v: number) => {
    viewer.renderer.toneMappingExposure = v;
  });
  lighting.add(state, 'environment', 0, 3, 0.01).name('Environment').onChange((v: number) => {
    viewer.scene.environmentIntensity = v;
  });
  lighting.add(state, 'keyLight', 0, 6, 0.01).name('Key light').onChange((v: number) => {
    viewer.keyLight.intensity = v;
  });

  const view = gui.addFolder('View').close();
  view.add(state, 'autoRotate').name('Auto-rotate').onChange((v: boolean) => {
    viewer.controls.autoRotate = v;
  });
  view.add(state, 'grid').name('Grid').onChange((v: boolean) => viewer.setGridVisible(v));
  view.add({ reset: () => viewer.frameModel() }, 'reset').name('Reset camera');

  /** Reset per-model settings after a new model loads. */
  function resetForModel(backdrop: BackdropId) {
    state.viewMode = 'shaded';
    state.explode = 0;
    state.section = 0;
    state.backdrop = backdrop;
    stopExplodePlayback();
    viewer.setViewMode('shaded');
    viewer.setExplode(0);
    viewer.setSection(0);
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  /** Reflect whether the automatic inspection is running on its button. */
  function setTouring(running: boolean) {
    tour.name(running ? '停止检查 ■' : '逐项检查 ▶');
  }

  /** The light-path button works only for models that define a path; it shows whether the game is on. */
  function setLight(available: boolean, on: boolean) {
    light.name(on ? '✦ 光路 · 进行中' : '✦ 光路');
    light.enable(available);
  }

  return { gui, state, resetForModel, setTouring, setLight };
}
