import * as THREE from 'three';

/**
 * Distance a perspective camera must sit from a bounding sphere so the whole sphere fits
 * in view, whichever of the vertical or horizontal field of view is tighter.
 */
export function fitDistance(radius: number, fovDegrees: number, aspect: number, padding = 1.15): number {
  if (radius <= 0) return 1;
  const vFov = THREE.MathUtils.degToRad(fovDegrees);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const tightest = Math.min(vFov, hFov);
  return (radius * padding) / Math.sin(tightest / 2);
}

export interface Framing {
  target: THREE.Vector3;
  position: THREE.Vector3;
  near: number;
  far: number;
}

/**
 * Where to put the camera to frame an object: looking at its centre from a three-quarter view
 * (front-right, slightly above), like Blender's default user perspective.
 */
export function frameObject(object: THREE.Object3D, fovDegrees: number, aspect: number): Framing {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return { target: new THREE.Vector3(), position: new THREE.Vector3(3, 2, 3), near: 0.01, far: 100 };
  }
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const distance = fitDistance(sphere.radius, fovDegrees, aspect);
  const direction = new THREE.Vector3(1, 0.6, 1.2).normalize();
  return {
    target: sphere.center.clone(),
    position: sphere.center.clone().addScaledVector(direction, distance),
    near: Math.max(distance / 1000, 0.001),
    far: distance * 100,
  };
}
