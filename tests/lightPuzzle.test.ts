import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PROJECTS } from '../src/projects';
import { PRESETS } from '../src/scenes';
import { LightPuzzle } from '../src/ui/lightPuzzle';
import { Beam } from '../src/viewer/beam';

describe('light puzzle', () => {
  it('lights points in order and solves on the last one', () => {
    const puzzle = new LightPuzzle(3);
    expect(puzzle.press(0)).toBe('step');
    expect(puzzle.press(1)).toBe('step');
    expect(puzzle.solved).toBe(false);
    expect(puzzle.press(2)).toBe('solved');
    expect(puzzle.solved).toBe(true);
    expect([...puzzle.chain]).toEqual([0, 1, 2]);
  });

  it('breaks the chain on a wrong point and starts over', () => {
    const puzzle = new LightPuzzle(3);
    puzzle.press(0);
    expect(puzzle.press(2)).toBe('miss');
    expect(puzzle.chain).toEqual([]);
    expect(puzzle.press(0)).toBe('step');
  });

  it('ignores repeats, out-of-range points and presses after solving', () => {
    const puzzle = new LightPuzzle(2);
    puzzle.press(0);
    expect(puzzle.press(0)).toBe('ignored');
    expect(puzzle.press(5)).toBe('ignored');
    expect(puzzle.press(-1)).toBe('ignored');
    puzzle.press(1);
    expect(puzzle.press(0)).toBe('ignored');
    expect(puzzle.chain).toHaveLength(2);
  });

  it('never solves an empty path', () => {
    expect(new LightPuzzle(0).solved).toBe(false);
  });

  it('can be reset', () => {
    const puzzle = new LightPuzzle(2);
    puzzle.press(0);
    puzzle.press(1);
    puzzle.reset();
    expect(puzzle.solved).toBe(false);
    expect(puzzle.press(0)).toBe('step');
  });
});

describe('light paths in the catalogue', () => {
  it('every path names parts that exist in its preset', () => {
    for (const project of PROJECTS) {
      if (!project.lightPath) continue;
      const model = PRESETS[project.preset ?? project.category]();
      for (const entry of project.lightPath) {
        expect(model.getObjectByName(entry.part), `${project.id}: ${entry.part}`).toBeTruthy();
      }
      expect(project.lightPath.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('beam', () => {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 0), new THREE.Vector3(2, 0, 1)];

  it('starts invisible and grows along the path', () => {
    const beam = new Beam(points, 4);
    beam.update(0);
    const tube = beam.group.children[0] as THREE.Mesh;
    expect((tube.material as THREE.MeshBasicMaterial).opacity).toBe(0);
    const total = tube.geometry.index!.count;

    beam.update(0.9);
    const half = tube.geometry.drawRange.count;
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(total);

    beam.update(2);
    expect(tube.geometry.drawRange.count).toBe(Math.floor(total / 6) * 6);
    expect((tube.material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(0.5);
  });

  it('has one glow per point and frees its resources', () => {
    const beam = new Beam(points, 4);
    expect(beam.group.children.filter((c) => c.userData.glow)).toHaveLength(3);
    beam.dispose();
    expect(beam.group.children).toHaveLength(0);
  });
});
