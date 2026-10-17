import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyExplode, buildExplode } from '../src/viewer/explode';

function cube(name: string, x: number, y: number, z: number, size = 1) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size));
  mesh.name = name;
  mesh.position.set(x, y, z);
  return mesh;
}

describe('exploded view', () => {
  it('moves parts away from the model centre and back again', () => {
    const root = new THREE.Group();
    const left = cube('left', -2, 0, 0);
    const right = cube('right', 2, 0, 0);
    root.add(left, right);

    const parts = buildExplode(root);
    applyExplode(parts, 1);
    expect(left.position.x).toBeLessThan(-2);
    expect(right.position.x).toBeGreaterThan(2);
    expect(left.position.y).toBeCloseTo(0);

    applyExplode(parts, 0);
    expect(left.position.toArray()).toEqual([-2, 0, 0]);
    expect(right.position.toArray()).toEqual([2, 0, 0]);
  });

  it('pushes a part sitting at the centre upwards', () => {
    const root = new THREE.Group();
    const centre = cube('centre', 0, 0, 0);
    root.add(centre, cube('a', -1, 0, 0), cube('b', 1, 0, 0));

    applyExplode(buildExplode(root), 1);

    expect(centre.position.y).toBeGreaterThan(0);
  });

  it('travels the same world distance under a scaled parent', () => {
    const plain = new THREE.Group();
    const plainPart = cube('p', 2, 0, 0);
    plain.add(plainPart, cube('q', -2, 0, 0));

    // Blender exports often wrap meshes in scaled empties; the push must account for it.
    const scaled = new THREE.Group();
    const empty = new THREE.Group();
    empty.scale.setScalar(0.01);
    // Same model in centimetres: 100-unit cubes 200 units apart, scaled down by 0.01.
    const scaledPart = cube('p', 200, 0, 0, 100);
    empty.add(scaledPart, cube('q', -200, 0, 0, 100));
    scaled.add(empty);

    applyExplode(buildExplode(plain), 1);
    applyExplode(buildExplode(scaled), 1);
    scaled.updateMatrixWorld(true);

    const worldX = scaledPart.getWorldPosition(new THREE.Vector3()).x;
    expect(worldX).toBeCloseTo(plainPart.position.x, 4);
  });

  it('clamps the amount to 0..1', () => {
    const root = new THREE.Group();
    const part = cube('a', 1, 0, 0);
    root.add(part, cube('b', -1, 0, 0));
    const parts = buildExplode(root);

    applyExplode(parts, 1);
    const full = part.position.x;
    applyExplode(parts, 5);
    expect(part.position.x).toBeCloseTo(full);
    applyExplode(parts, -3);
    expect(part.position.x).toBeCloseTo(1);
  });

  it('returns nothing for an empty model', () => {
    expect(buildExplode(new THREE.Group())).toEqual([]);
  });
});
