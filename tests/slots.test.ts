import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { heroPoster, projectPlate } from '../src/graphics/plates';
import { PROJECTS } from '../src/projects';
import { backdrops, covers, depthFor, posterLayers } from '../src/assets/slots';

const asset = (path: string) => fileURLToPath(new URL(`../src/assets/${path}`, import.meta.url));

describe('poster layers', () => {
  it('skips placeholders and non-images, and orders by number prefix', () => {
    const layers = posterLayers({
      './poster/00-layout.placeholder.svg': '/a',
      './poster/76-birds.png': '/birds',
      './poster/08-back.webp': '/back',
      './poster/notes.txt': '/x',
      './poster/spire.webp': '/spire',
    });
    expect(layers.map((l) => l.key)).toEqual(['08-back', 'spire', '76-birds']);
  });

  it('maps numbers to depth, with blur at the far and near ends', () => {
    expect(depthFor(0)).toEqual({ depth: 0, blur: 2.5 });
    expect(depthFor(50).blur).toBeUndefined();
    expect(depthFor(99)).toEqual({ depth: 1.5, blur: 1.2 });
    expect(depthFor(40).depth).toBeLessThan(depthFor(60).depth);
  });

  it('puts art sheets into the hero poster', () => {
    const svg = heroPoster({ layers: posterLayers({ './poster/40-disc.webp': '/disc.webp' }) });
    expect(svg).toContain('href="/disc.webp"');
    expect(svg).toContain('data-layer="40-disc"');
  });
});

describe('covers', () => {
  it('keys real images by entry id', () => {
    expect(covers({ './covers/sanctum.placeholder.svg': '/p', './covers/sanctum.webp': '/s', './covers/blade.jpg': '/b' })).toEqual({
      sanctum: '/s',
      blade: '/b',
    });
  });

  it('replaces the drawn art on a plate', () => {
    const plate = projectPlate(PROJECTS[0], {}, '/cover.webp');
    expect(plate).toContain('href="/cover.webp"');
    expect(plate).toContain('plate-cover');
  });
});

describe('backdrops', () => {
  it('accepts images and videos, sorted by id', () => {
    expect(
      backdrops({ './backdrops/example.placeholder.svg': '/p', './backdrops/loop-dark.webm': '/v', './backdrops/cloister.webp': '/c' }),
    ).toEqual([
      { id: 'cloister', url: '/c', kind: 'image' },
      { id: 'loop-dark', url: '/v', kind: 'video' },
    ]);
  });
});

describe('templates', () => {
  it('ships a template for each slot and one cover per entry', () => {
    for (const path of ['README.md', 'poster/00-layout.placeholder.svg', 'backdrops/example.placeholder.svg']) {
      expect(existsSync(asset(path)), path).toBe(true);
    }
    for (const p of PROJECTS) expect(existsSync(asset(`covers/${p.id}.placeholder.svg`)), p.id).toBe(true);
    expect(readFileSync(asset('covers/sanctum.placeholder.svg'), 'utf8')).toContain('1040');
  });
});
