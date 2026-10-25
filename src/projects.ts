/**
 * The archive's entries. Each entry is either a .glb in public/models/ (`file`) or one of the
 * built-in placeholder scenes (`preset`). Replace presets with your own exports as you make them.
 */
export type Category = 'cathedral' | 'sculpture' | 'weapon';

export const CATEGORIES: Record<Category, { name: string; en: string; glyph: string }> = {
  cathedral: { name: '圣堂', en: 'SANCTUM', glyph: '△' },
  sculpture: { name: '雕塑', en: 'SCULPTURE', glyph: '○' },
  weapon: { name: '武装', en: 'ARMAMENT', glyph: '◇' },
};

/** A labelled part, drawn as a leader line from the part to a note beside the model. */
export interface Annotation {
  /** Mesh (or object) name as it appears in the Blender export. */
  part: string;
  label: string;
  note?: string;
}

export interface Project {
  id: string;
  /** Catalogue number shown on the plate, e.g. "01". */
  number: string;
  title: string;
  titleEn: string;
  category: Category;
  description: string;
  tools?: string[];
  /** File name inside public/models/. */
  file?: string;
  /** Built-in placeholder scene, used when there is no file yet. */
  preset?: Category;
  annotations?: Annotation[];
  /** Parts a beam of light passes, in order: the light-path game asks the visitor to join them. */
  lightPath?: Annotation[];
  /** Backdrop shown behind the model in the inspect room. */
  backdrop?: BackdropId;
}

export const BACKDROPS = ['paper', 'blueprint', 'halftone', 'dusk'] as const;
export type BuiltInBackdrop = (typeof BACKDROPS)[number];
/** A built-in backdrop, or the name of a file in src/assets/backdrops/ (without extension). */
export type BackdropId = BuiltInBackdrop | (string & {});

/** Backdrop used by every entry (and by dropped local models) unless it sets its own. */
export const DEFAULT_BACKDROP: BackdropId = 'orbital-blueprint';

export const PROJECTS: Project[] = [
  {
    id: 'sanctum',
    number: '01',
    title: '圣堂 · 占位',
    titleEn: 'SANCTUM (PLACEHOLDER)',
    category: 'cathedral',
    description: 'Placeholder nave with ribbed arches and a rose window. Replace with your Blender scene.',
    tools: ['Three.js'],
    preset: 'cathedral',
    backdrop: DEFAULT_BACKDROP,
    annotations: [
      { part: 'Rose window', label: '玫瑰花窗', note: 'ROSE WINDOW' },
      { part: 'Arcade', label: '尖拱连拱', note: 'POINTED ARCADE' },
      { part: 'Piers', label: '束柱', note: 'CLUSTERED PIERS' },
      { part: 'Steps', label: '入口台阶', note: 'THE GATE' },
    ],
    lightPath: [
      { part: 'Steps', label: '入口台阶', note: 'THE GATE' },
      { part: 'Piers', label: '束柱', note: 'PIERS' },
      { part: 'Vault ribs', label: '肋拱', note: 'VAULT RIBS' },
      { part: 'Rose window', label: '玫瑰花窗', note: 'ROSE WINDOW' },
    ],
  },
  {
    id: 'figure',
    number: '02',
    title: '圣像 · 占位',
    titleEn: 'FIGURE (PLACEHOLDER)',
    category: 'sculpture',
    description: 'Placeholder statue on a plinth with a halo. Replace with a ZBrush sculpt (retopologised for web).',
    tools: ['Three.js'],
    preset: 'sculpture',
    backdrop: DEFAULT_BACKDROP,
    annotations: [
      { part: 'Halo', label: '光环', note: 'HALO' },
      { part: 'Figure', label: '雕像', note: 'FIGURE' },
      { part: 'Plinth', label: '基座', note: 'PLINTH' },
    ],
    lightPath: [
      { part: 'Plinth', label: '基座', note: 'PLINTH' },
      { part: 'Figure', label: '雕像', note: 'FIGURE' },
      { part: 'Halo', label: '光环', note: 'HALO' },
    ],
  },
  {
    id: 'blade',
    number: '03',
    title: '铳剑 · 占位',
    titleEn: 'BLADE (PLACEHOLDER)',
    category: 'weapon',
    description: 'Placeholder sword on a display stand. Replace with a weapon model and its texture breakdown.',
    tools: ['Three.js'],
    preset: 'weapon',
    backdrop: DEFAULT_BACKDROP,
    annotations: [
      { part: 'Blade', label: '刃', note: 'BLADE' },
      { part: 'Guard', label: '护手', note: 'GUARD' },
      { part: 'Grip', label: '握柄', note: 'GRIP' },
      { part: 'Stand', label: '展架', note: 'STAND' },
    ],
    lightPath: [
      { part: 'Stand', label: '展架', note: 'STAND' },
      { part: 'Grip', label: '握柄', note: 'GRIP' },
      { part: 'Guard', label: '护手', note: 'GUARD' },
      { part: 'Blade', label: '刃', note: 'BLADE' },
    ],
  },
];

export function findProject(projects: Project[], id: string | null | undefined): Project | undefined {
  return projects.find((p) => p.id === id);
}

/** Resolve a project's model URL relative to the site, so it works on GitHub Pages sub-paths. */
export function modelUrl(project: Pick<Project, 'file'>, base: string): string | null {
  if (!project.file) return null;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}models/${encodeURIComponent(project.file)}`;
}
