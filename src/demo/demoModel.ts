import * as THREE from 'three';

/**
 * A small placeholder model (a desk lamp) so the viewer has something to show before any
 * Blender export is added. Every part is a named mesh, the way a Blender export arrives.
 */
export function createDemoModel(): THREE.Group {
  const lamp = new THREE.Group();
  lamp.name = 'Desk lamp (demo)';

  const metal = new THREE.MeshStandardMaterial({ name: 'Brushed steel', color: 0x9aa3ad, metalness: 0.9, roughness: 0.35 });
  const paint = new THREE.MeshStandardMaterial({ name: 'Cobalt paint', color: 0x2a4bd7, metalness: 0.1, roughness: 0.45 });
  const rubber = new THREE.MeshStandardMaterial({ name: 'Rubber', color: 0x1d1f22, roughness: 0.9 });
  const glow = new THREE.MeshStandardMaterial({ name: 'Bulb', color: 0xfff4d6, emissive: 0xffd88a, emissiveIntensity: 2 });

  const add = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, setup: (m: THREE.Mesh) => void) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    setup(mesh);
    lamp.add(mesh);
    return mesh;
  };

  add('Base', new THREE.CylinderGeometry(0.42, 0.48, 0.08, 48), paint, (m) => m.position.set(0, 0.04, 0));
  add('Base foot', new THREE.CylinderGeometry(0.5, 0.5, 0.02, 48), rubber, (m) => m.position.set(0, 0.01, 0));
  add('Joint low', new THREE.SphereGeometry(0.06, 24, 16), metal, (m) => m.position.set(0, 0.12, 0));
  add('Arm lower', new THREE.CylinderGeometry(0.025, 0.025, 0.9, 16), metal, (m) => {
    m.position.set(0.2, 0.52, 0);
    m.rotation.z = -0.47;
  });
  add('Joint mid', new THREE.SphereGeometry(0.05, 24, 16), metal, (m) => m.position.set(0.41, 0.92, 0));
  add('Arm upper', new THREE.CylinderGeometry(0.022, 0.022, 0.75, 16), metal, (m) => {
    m.position.set(0.12, 1.12, 0);
    m.rotation.z = 1.0;
  });
  add('Shade', new THREE.ConeGeometry(0.24, 0.32, 48, 1, true), paint, (m) => {
    m.position.set(-0.24, 1.2, 0);
    m.rotation.z = -0.75;
    (m.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  });
  add('Bulb', new THREE.SphereGeometry(0.075, 24, 16), glow, (m) => m.position.set(-0.3, 1.13, 0));

  return lamp;
}
