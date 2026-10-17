import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createDemoModel } from '../src/demo/demoModel';
import { collectStats, formatCount } from '../src/viewer/modelStats';

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

describe('demo model', () => {
  it('has named parts like a Blender export, standing on the ground', () => {
    const lamp = createDemoModel();
    const names: string[] = [];
    lamp.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) names.push(c.name);
    });
    expect(names.length).toBeGreaterThanOrEqual(6);
    expect(names.every((n) => n.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);

    const box = new THREE.Box3().setFromObject(lamp);
    expect(box.min.y).toBeCloseTo(0, 5);
  });
});
