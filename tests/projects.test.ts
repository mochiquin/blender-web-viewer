import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BACKDROPS, CATEGORIES, findProject, modelUrl, PROJECTS } from '../src/projects';
import { isModelFile } from '../src/ui/dropzone';

describe('project catalogue', () => {
  it('has unique ids and record numbers', () => {
    expect(new Set(PROJECTS.map((p) => p.id)).size).toBe(PROJECTS.length);
    expect(new Set(PROJECTS.map((p) => p.number)).size).toBe(PROJECTS.length);
  });

  it('does not use the reserved "local" id', () => {
    expect(PROJECTS.some((p) => p.id === 'local')).toBe(false);
  });

  it('gives every entry a known category, backdrop and something to show', () => {
    for (const p of PROJECTS) {
      expect(Object.keys(CATEGORIES)).toContain(p.category);
      if (p.backdrop) expect(BACKDROPS).toContain(p.backdrop);
      expect(Boolean(p.file || p.preset), p.id).toBe(true);
    }
  });

  it('only references model files that exist in public/models', () => {
    for (const project of PROJECTS.filter((p) => p.file)) {
      expect(existsSync(fileURLToPath(new URL(`../public/models/${project.file}`, import.meta.url))), project.file).toBe(true);
    }
  });

  it('finds projects by id', () => {
    expect(findProject(PROJECTS, PROJECTS[0].id)).toBe(PROJECTS[0]);
    expect(findProject(PROJECTS, 'does-not-exist')).toBeUndefined();
    expect(findProject(PROJECTS, null)).toBeUndefined();
  });

  it('builds model URLs that work under a sub-path', () => {
    expect(modelUrl({ file: 'my model.glb' }, './')).toBe('./models/my%20model.glb');
    expect(modelUrl({ file: 'my model.glb' }, '/repo')).toBe('/repo/models/my%20model.glb');
    expect(modelUrl({}, './')).toBeNull();
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
