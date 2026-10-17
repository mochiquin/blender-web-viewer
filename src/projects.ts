/**
 * The portfolio pieces the viewer can show. Add an entry per model: put the exported .glb in
 * public/models/ and reference it by file name. An entry without a file shows the built-in demo.
 */
export interface Project {
  id: string;
  title: string;
  description: string;
  /** File name inside public/models/, e.g. "lady-maria.glb". */
  file?: string;
  /** Tools used, shown under the title. */
  tools?: string[];
}

export const PROJECTS: Project[] = [
  {
    id: 'demo',
    title: 'Demo: desk lamp',
    description: 'Placeholder built in code. Replace it with your own Blender export (see README).',
    tools: ['Three.js'],
  },
];

export function findProject(projects: Project[], id: string | null | undefined): Project {
  return projects.find((p) => p.id === id) ?? projects[0];
}

/** Resolve a project's model URL relative to the site, so it works on GitHub Pages sub-paths. */
export function modelUrl(project: Project, base: string): string | null {
  if (!project.file) return null;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}models/${encodeURIComponent(project.file)}`;
}
