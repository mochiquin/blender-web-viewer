import * as THREE from 'three';

export interface ModelStats {
  meshes: number;
  triangles: number;
  vertices: number;
  materials: number;
  textures: number;
  /** Bounding box size in scene units (metres for Blender exports). */
  size: [number, number, number];
}

const TEXTURE_SLOTS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
] as const;

/** Budget numbers a technical artist checks before shipping a model to the web. */
export function collectStats(root: THREE.Object3D): ModelStats {
  let meshes = 0;
  let triangles = 0;
  let vertices = 0;
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes++;
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute('position');
    if (positions) {
      vertices += positions.count;
      triangles += (geometry.index ? geometry.index.count : positions.count) / 3;
    }
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      materials.add(material);
      for (const slot of TEXTURE_SLOTS) {
        const texture = (material as unknown as Record<string, unknown>)[slot];
        if (texture instanceof THREE.Texture) textures.add(texture);
      }
    }
  });

  const box = new THREE.Box3().setFromObject(root);
  const size = box.isEmpty() ? new THREE.Vector3() : box.getSize(new THREE.Vector3());
  return {
    meshes,
    triangles: Math.round(triangles),
    vertices,
    materials: materials.size,
    textures: textures.size,
    size: [size.x, size.y, size.z],
  };
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
