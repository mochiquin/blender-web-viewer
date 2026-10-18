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
  };

  const gui = new GUI({ title: '检视 · INSPECT', container });
  // Start collapsed on phones so the model is not hidden behind the panel.
  if (window.matchMedia('(max-width: 640px)').matches) gui.close();

  const modeOptions = Object.fromEntries(VIEW_MODES.map((m) => [VIEW_MODE_LABELS[m], m]));
  gui.add(state, 'viewMode', modeOptions).name('Shading').onChange((m: ViewMode) => viewer.setViewMode(m));
  gui.add(state, 'explode', 0, 1, 0.01).name('Explode').onChange((v: number) => viewer.setExplode(v));
  gui.add(state, 'callouts').name('Callouts').onChange(handlers.onCallouts);
  const backdropOptions = Object.fromEntries([
    ...BACKDROPS.map((b) => [BACKDROP_LABELS[b], b]),
    ...CUSTOM_BACKDROPS.map((b) => [`自定义 ${b.id}`, b.id]),
  ]);
  gui.add(state, 'backdrop', backdropOptions).name('Backdrop').onChange(handlers.onBackdrop);

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
    state.backdrop = backdrop;
    viewer.setViewMode('shaded');
    viewer.setExplode(0);
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  return { gui, state, resetForModel };
}
