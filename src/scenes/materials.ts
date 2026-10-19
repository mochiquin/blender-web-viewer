import * as THREE from 'three';

/** Shared palette for the placeholder scenes, matching the site's paper-and-cobalt look. */
export function palette() {
  return {
    stone: new THREE.MeshStandardMaterial({ name: 'Stone', color: 0xe4e2da, roughness: 0.92 }),
    darkStone: new THREE.MeshStandardMaterial({ name: 'Dark stone', color: 0x8d989b, roughness: 0.85 }),
    cobalt: new THREE.MeshStandardMaterial({ name: 'Cobalt', color: 0x2a3fd0, roughness: 0.5, metalness: 0.1 }),
    ink: new THREE.MeshStandardMaterial({ name: 'Ink', color: 0x22313a, roughness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ name: 'Steel', color: 0xc7ced4, roughness: 0.28, metalness: 0.95 }),
    gilt: new THREE.MeshStandardMaterial({ name: 'Gilt', color: 0xd9c690, roughness: 0.35, metalness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({
      name: 'Stained glass',
      color: 0xb9c3ff,
      emissive: 0x5d6dff,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }),
  };
}

/** Make a named group (a "part", the way a Blender object arrives in a glTF export). */
export function part(name: string, ...meshes: THREE.Mesh[]): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  meshes.forEach((mesh, i) => {
    if (!mesh.name) mesh.name = `${name} ${String(i + 1).padStart(2, '0')}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}
