import * as THREE from 'three';
import { mesh, palette, part } from './materials';

/** Placeholder statue: a stepped plinth, a robed figure turned on a lathe, and a halo. */
export function createSculpture(): THREE.Group {
  const m = palette();
  const root = new THREE.Group();
  root.name = 'Figure (placeholder)';

  root.add(
    part(
      'Plinth',
      mesh(new THREE.BoxGeometry(1.6, 0.25, 1.6), m.darkStone, 0, 0.125, 0),
      mesh(new THREE.BoxGeometry(1.25, 0.9, 1.25), m.stone, 0, 0.7, 0),
      mesh(new THREE.BoxGeometry(1.45, 0.14, 1.45), m.darkStone, 0, 1.22, 0),
    ),
  );

  // Robe silhouette as a profile (radius, height), spun around the vertical axis.
  const profile = [
    [0.0, 0],
    [0.46, 0],
    [0.4, 0.5],
    [0.3, 1.1],
    [0.26, 1.45],
    [0.3, 1.62],
    [0.12, 1.72],
    [0.0, 1.74],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  const robe = mesh(new THREE.LatheGeometry(profile, 48), m.stone, 0, 1.29, 0);
  const head = mesh(new THREE.SphereGeometry(0.16, 32, 20), m.stone, 0, 1.29 + 1.9, 0);
  const veil = mesh(new THREE.ConeGeometry(0.24, 0.5, 32, 1, true), m.stone, 0, 1.29 + 1.88, -0.02);
  (veil.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  const arms = [-1, 1].map((side) => {
    const arm = mesh(new THREE.CapsuleGeometry(0.06, 0.55, 6, 12), m.stone, side * 0.22, 1.29 + 1.35, 0.16);
    arm.rotation.set(-0.9, 0, side * 0.35);
    return arm;
  });
  root.add(part('Figure', robe, head, veil, ...arms));

  const halo = mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 96), m.gilt, 0, 1.29 + 2.05, -0.18);
  const outer = mesh(new THREE.TorusGeometry(0.58, 0.01, 6, 96), m.cobalt, 0, 1.29 + 2.05, -0.2);
  const rays = Array.from({ length: 16 }, (_, i) => {
    const ray = mesh(new THREE.BoxGeometry(0.012, 0.14, 0.012), m.gilt, 0, 1.29 + 2.05, -0.19);
    const a = (i / 16) * Math.PI * 2;
    ray.position.x += Math.cos(a) * 0.5;
    ray.position.y += Math.sin(a) * 0.5;
    ray.rotation.z = a - Math.PI / 2;
    return ray;
  });
  root.add(part('Halo', halo, outer, ...rays));
  return root;
}
