import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { budgetWarnings, collectStats, formatCount } from '../src/viewer/modelStats';

describe('collectStats', () => {
  it('counts triangles, vertices, shared materials and textures', () => {
    const texture = new THREE.Texture();
    const shared = new THREE.MeshStandardMaterial({ map: texture, normalMap: texture });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 3), shared)); // 12 triangles, 24 vertices
    root.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shared)); // 2 triangles, 4 vertices

    const stats = collectStats(root);

    expect(stats.meshes).toBe(2);
    expect(stats.triangles).toBe(14);
    expect(stats.vertices).toBe(28);
    expect(stats.materials).toBe(1);
    expect(stats.textures).toBe(1);
    expect(stats.size[1]).toBeCloseTo(2);
    expect(stats.size[2]).toBeCloseTo(3);
  });

  it('counts non-indexed geometry', () => {
    const geometry = new THREE.BoxGeometry().toNonIndexed();
    const stats = collectStats(new THREE.Mesh(geometry));
    expect(stats.triangles).toBe(12);
  });

  it('reports zeros for an empty model', () => {
    const stats = collectStats(new THREE.Group());
    expect(stats).toMatchObject({ meshes: 0, triangles: 0, size: [0, 0, 0] });
  });
});

describe('formatCount', () => {
  it.each([
    [950, '950'],
    [1234, '1.2k'],
    [48_000, '48k'],
    [2_500_000, '2.5M'],
  ])('%i -> %s', (n, expected) => {
    expect(formatCount(n)).toBe(expected);
  });
});

describe('texture memory and budget', () => {
  it('estimates texture memory from image size, counting shared textures once', () => {
    const texture = new THREE.Texture();
    texture.image = { width: 2048, height: 2048 };
    const material = new THREE.MeshStandardMaterial({ map: texture, normalMap: texture });
    const stats = collectStats(new THREE.Mesh(new THREE.BoxGeometry(), material));
    // 2048 x 2048 RGBA with mipmaps is about 21 MB
    expect(stats.textureMB).toBeGreaterThanOrEqual(20);
    expect(stats.textureMB).toBeLessThanOrEqual(22);
  });

  it('warns only when a model is over budget', () => {
    const base = collectStats(new THREE.Group());
    expect(budgetWarnings(base)).toEqual([]);
    expect(budgetWarnings({ ...base, triangles: 3_000_000 })[0]).toContain('3.0M triangles');
    expect(budgetWarnings({ ...base, textureMB: 900 })[0]).toContain('900 MB');
  });
});
