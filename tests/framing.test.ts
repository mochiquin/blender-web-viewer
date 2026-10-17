import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { fitDistance, frameObject } from '../src/viewer/framing';

describe('fitDistance', () => {
  it('fits a sphere exactly inside a square view (no padding)', () => {
    // With a 90° FOV the sphere touches the frame at distance r / sin(45°).
    expect(fitDistance(1, 90, 1, 1)).toBeCloseTo(Math.SQRT2, 5);
  });

  it('backs off further on a tall, narrow screen', () => {
    const wide = fitDistance(1, 40, 16 / 9);
    const tall = fitDistance(1, 40, 9 / 16);
    expect(tall).toBeGreaterThan(wide);
  });

  it('scales linearly with the radius', () => {
    expect(fitDistance(4, 40, 1.5)).toBeCloseTo(fitDistance(1, 40, 1.5) * 4, 5);
  });

  it('returns a safe default for an empty model', () => {
    expect(fitDistance(0, 40, 1)).toBe(1);
  });
});

describe('frameObject', () => {
  it('looks at the centre of the model from above and in front', () => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    box.position.set(5, 1, 0);
    box.updateMatrixWorld();

    const framing = frameObject(box, 40, 1);

    expect(framing.target.toArray()).toEqual([5, 1, 0]);
    expect(framing.position.y).toBeGreaterThan(framing.target.y);
    expect(framing.position.z).toBeGreaterThan(framing.target.z);
    expect(framing.near).toBeLessThan(framing.far);
  });

  it('keeps the whole model inside the camera frustum', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.5));
    const framing = frameObject(mesh, 40, 16 / 9);
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, framing.near, framing.far);
    camera.position.copy(framing.position);
    camera.lookAt(framing.target);
    camera.updateMatrixWorld();

    const frustum = new THREE.Frustum().setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    const corners = new THREE.Box3().setFromObject(mesh);
    for (const x of [corners.min.x, corners.max.x])
      for (const y of [corners.min.y, corners.max.y])
        for (const z of [corners.min.z, corners.max.z]) expect(frustum.containsPoint(new THREE.Vector3(x, y, z))).toBe(true);
  });

  it('handles an empty group', () => {
    const framing = frameObject(new THREE.Group(), 40, 1);
    expect(framing.position.length()).toBeGreaterThan(0);
  });
});
