import GUI from 'lil-gui';
import type { Project } from '../projects';
import type { Viewer } from '../viewer/Viewer';
import { VIEW_MODE_LABELS, VIEW_MODES, type ViewMode } from '../viewer/viewModes';

export interface PanelState {
  project: string;
  viewMode: ViewMode;
  explode: number;
  exposure: number;
  environment: number;
  keyLight: number;
  autoRotate: boolean;
  grid: boolean;
}

/** The control panel (top right), like a small Blender N-panel for the viewport. */
export function createPanel(viewer: Viewer, projects: Project[], initialProject: string, onProject: (id: string) => void) {
  const state: PanelState = {
    project: initialProject,
    viewMode: 'shaded',
    explode: 0,
    exposure: viewer.renderer.toneMappingExposure,
    environment: viewer.scene.environmentIntensity,
    keyLight: viewer.keyLight.intensity,
    autoRotate: false,
    grid: true,
  };

  const gui = new GUI({ title: 'Viewer' });
  // Start collapsed on phones so the model is not hidden behind the panel.
  if (window.matchMedia('(max-width: 640px)').matches) gui.close();

  if (projects.length > 1) {
    const options = Object.fromEntries(projects.map((p) => [p.title, p.id]));
    gui.add(state, 'project', options).name('Model').onChange(onProject);
  }

  const modeOptions = Object.fromEntries(VIEW_MODES.map((m) => [VIEW_MODE_LABELS[m], m]));
  gui.add(state, 'viewMode', modeOptions).name('Shading').onChange((m: ViewMode) => viewer.setViewMode(m));
  gui.add(state, 'explode', 0, 1, 0.01).name('Explode').onChange((v: number) => viewer.setExplode(v));

  const lighting = gui.addFolder('Lighting');
  lighting.add(state, 'exposure', 0.2, 3, 0.01).name('Exposure').onChange((v: number) => {
    viewer.renderer.toneMappingExposure = v;
  });
  lighting.add(state, 'environment', 0, 3, 0.01).name('Environment').onChange((v: number) => {
    viewer.scene.environmentIntensity = v;
  });
  lighting.add(state, 'keyLight', 0, 6, 0.01).name('Key light').onChange((v: number) => {
    viewer.keyLight.intensity = v;
  });

  const view = gui.addFolder('View');
  view.add(state, 'autoRotate').name('Auto-rotate').onChange((v: boolean) => {
    viewer.controls.autoRotate = v;
  });
  view.add(state, 'grid').name('Grid').onChange((v: boolean) => viewer.setGridVisible(v));
  view.add({ reset: () => viewer.frameModel() }, 'reset').name('Reset camera');

  /** Re-apply per-model settings after a new model loads. */
  function resetForNewModel() {
    state.viewMode = 'shaded';
    state.explode = 0;
    viewer.setViewMode('shaded');
    viewer.setExplode(0);
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  return { gui, state, resetForNewModel };
}
