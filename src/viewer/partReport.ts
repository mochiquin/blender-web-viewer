import * as THREE from 'three';

/** Structural check of one part (a top-level object of the model), measured on the assembled model. */
export interface PartReport {
  /** Meshes under the part. */
  parts: number;
  triangles: number;
  size: [number, number, number];
  materials: string[];
  /** No empty meshes and every vertex coordinate is finite. */
  valid: boolean;
  /** The part is centred on the model's left-right centre line. */
  symmetric: boolean;
  /** Distance from that centre line along X, in metres. */
  offset: number;
  /** The part touches the floor of the model. */
  grounded: boolean;
  /** Furthest any mesh of the part travels in a full explosion, in world units. */
  travel: number;
}

const round = (v: number, digits = 1) => +v.toFixed(digits);

/**
 * Measure a part against the whole model: `model` supplies the centre line and the floor.
 * Call it with the model assembled (explode at 0).
 */
export function reportPart(part: THREE.Object3D, model: THREE.Object3D, travelOf: (mesh: THREE.Object3D) => number = () => 0): PartReport {
  part.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const names = new Set<string>();
  let parts = 0;
  let triangles = 0;
  let travel = 0;
  let valid = true;

  part.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    parts++;
    box.expandByObject(mesh);
    const geometry = mesh.geometry;
    const position = geometry.getAttribute('position');
    if (!position || !position.count) {
      valid = false;
    } else {
      triangles += (geometry.index ? geometry.index.count : position.count) / 3;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const b = geometry.boundingBox!;
      if (![b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite)) valid = false;
    }
    travel = Math.max(travel, travelOf(mesh));
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      names.add(material.name || material.type.replace('Mesh', '').replace('Material', '') || 'material');
    }
  });

  const modelBox = new THREE.Box3().setFromObject(model);
  const size = box.isEmpty() ? new THREE.Vector3() : box.getSize(new THREE.Vector3());
  const centre = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
  const modelSize = modelBox.isEmpty() ? new THREE.Vector3() : modelBox.getSize(new THREE.Vector3());
  const offset = centre.x - (modelBox.isEmpty() ? 0 : modelBox.getCenter(new THREE.Vector3()).x);
  const floorTolerance = Math.max(modelSize.y * 0.03, 1e-4);

  return {
    parts,
    triangles: Math.round(triangles),
    size: [round(size.x, 2), round(size.y, 2), round(size.z, 2)],
    materials: [...names],
    valid,
    symmetric: Math.abs(offset) < Math.max(modelSize.x * 0.02, 0.005),
    offset: round(offset, 2),
    grounded: !box.isEmpty() && box.min.y - modelBox.min.y <= floorTolerance,
    travel: round(travel, 1),
  };
}

/** Over this many triangles one part is flagged as heavy in the report. */
export const PART_TRIANGLE_BUDGET = 60_000;

const hasMesh = (object: THREE.Object3D) => {
  let found = false;
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) found = true;
  });
  return found;
};

/**
 * The object whose children are the model's parts. Exports often wrap everything in one or two
 * empties (a scene root, a "Sketchfab_model"); those are skipped so the parts are the real objects.
 */
export function partRootOf(model: THREE.Object3D): THREE.Object3D {
  let root = model;
  while (root.children.length === 1 && !(root.children[0] as THREE.Mesh).isMesh && root.children[0].children.length) root = root.children[0];
  return root;
}

/** The inspectable parts of a model: the children of its part root that contain geometry. */
export function listParts(model: THREE.Object3D): THREE.Object3D[] {
  const root = partRootOf(model);
  const parts = root.children.filter(hasMesh);
  return parts.length ? parts : hasMesh(model) ? [root] : [];
}
