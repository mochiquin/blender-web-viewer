import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PROJECTS } from '../src/projects';
import { PRESETS } from '../src/scenes';
import { pointedArchPoints } from '../src/scenes/cathedral';
import { collectStats } from '../src/viewer/modelStats';

describe.each(Object.entries(PRESETS))('preset scene: %s', (name, create) => {
  const scene = create();

  it('is made of named top-level parts, like a Blender export', () => {
    expect(scene.children.length).toBeGreaterThanOrEqual(3);
    const names = scene.children.map((c) => c.name);
    expect(names.every((n) => n.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('stands on the ground', () => {
    const box = new THREE.Box3().setFromObject(scene);
    expect(box.min.y).toBeGreaterThan(-0.01);
    expect(box.min.y).toBeLessThan(0.05);
  });

  it('stays well inside the web budget', () => {
    const stats = collectStats(scene);
    expect(stats.triangles).toBeLessThan(200_000);
    expect(Number.isFinite(stats.size[0])).toBe(true);
  });

  it('has every part that its catalogue entry annotates', () => {
    for (const project of PROJECTS.filter((p) => p.preset === name)) {
      for (const annotation of project.annotations ?? []) {
        expect(scene.getObjectByName(annotation.part), `${project.id}: ${annotation.part}`).toBeDefined();
      }
    }
  });
});

describe('pointedArchPoints', () => {
  it('springs from both ends and peaks at the apex in the middle', () => {
    const pts = pointedArchPoints(2, 1.6);
    const first = pts[0];
    const last = pts[pts.length - 1];
    expect(first.x).toBeCloseTo(-1);
    expect(first.y).toBeCloseTo(0);
    expect(last.x).toBeCloseTo(1);
    expect(last.y).toBeCloseTo(0);
    const apex = pts.reduce((a, b) => (b.y > a.y ? b : a));
    expect(apex.x).toBeCloseTo(0);
    expect(apex.y).toBeCloseTo(1.6);
  });

  it('is symmetric', () => {
    const pts = pointedArchPoints(3, 2.4);
    for (let i = 0; i < pts.length; i++) {
      const mirror = pts[pts.length - 1 - i];
      expect(pts[i].x).toBeCloseTo(-mirror.x);
      expect(pts[i].y).toBeCloseTo(mirror.y);
    }
  });
});
