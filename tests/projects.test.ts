import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findProject, modelUrl, PROJECTS, type Project } from '../src/projects';
import { isModelFile } from '../src/ui/dropzone';

describe('project catalogue', () => {
  it('has unique ids', () => {
    const ids = PROJECTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only references model files that exist in public/models', () => {
    for (const project of PROJECTS.filter((p) => p.file)) {
      expect(existsSync(fileURLToPath(new URL(`../public/models/${project.file}`, import.meta.url))), project.file).toBe(true);
    }
  });

  it('falls back to the first project for an unknown id', () => {
    expect(findProject(PROJECTS, 'does-not-exist')).toBe(PROJECTS[0]);
    expect(findProject(PROJECTS, null)).toBe(PROJECTS[0]);
  });

  it('builds model URLs that work under a sub-path', () => {
    const project: Project = { id: 'x', title: 'X', description: '', file: 'my model.glb' };
    expect(modelUrl(project, './')).toBe('./models/my%20model.glb');
    expect(modelUrl(project, '/repo')).toBe('/repo/models/my%20model.glb');
    expect(modelUrl({ ...project, file: undefined }, './')).toBeNull();
  });
});

describe('isModelFile', () => {
  it.each([
    ['chair.glb', true],
    ['Scene.GLTF', true],
    ['texture.png', false],
    ['model.blend', false],
  ])('%s -> %s', (name, expected) => {
    expect(isModelFile(name)).toBe(expected);
  });
});
