import * as THREE from 'three';

/** One movable part of an exploded view. */
export interface ExplodePart {
  object: THREE.Object3D;
  /** Position in the parent's local space when assembled. */
  home: THREE.Vector3;
  /** Local-space offset applied at full explosion. */
  offset: THREE.Vector3;
  /** 0..1: how late this part leaves during a staggered opening (the outermost parts go last). */
  delay: number;
}

/**
 * Prepare an exploded view. Each mesh moves away from the model's centre along the line from
 * the centre to the mesh's own centre, so parts spread out radially like a product breakdown.
 * The push is proportional to how far the part already sits from the centre (`spread` = 1 doubles
 * that distance), which keeps nearby parts close and stops outer parts flying off screen.
 */
export function buildExplode(root: THREE.Object3D, spread = 0.8): ExplodePart[] {
  root.updateWorldMatrix(true, true);
  const modelBox = new THREE.Box3().setFromObject(root);
  if (modelBox.isEmpty()) return [];
  const center = modelBox.getCenter(new THREE.Vector3());
  const size = modelBox.getSize(new THREE.Vector3()).length();

  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
  });

  const reach = size / 2 || 1;
  return meshes.map((mesh) => {
    const partCenter = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
    const delay = THREE.MathUtils.clamp(partCenter.distanceTo(center) / reach, 0, 1);
    const worldDirection = partCenter.sub(center).multiplyScalar(spread);
    // A part at (or very near) the centre would barely move, so lift it instead.
    const minimum = size * 0.15 * spread;
    if (worldDirection.length() < minimum) {
      if (worldDirection.lengthSq() < 1e-12) worldDirection.set(0, 1, 0);
      worldDirection.setLength(minimum);
    }

    // Convert the world-space push into the parent's local space, so scaled or rotated
    // parents (common in Blender exports) still move the part the right distance.
    const parent = mesh.parent ?? root;
    const parentInverse = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    const localOrigin = new THREE.Vector3().applyMatrix4(parentInverse);
    const localOffset = worldDirection.applyMatrix4(parentInverse).sub(localOrigin);

    return { object: mesh, home: mesh.position.clone(), offset: localOffset, delay };
  });
}

const smooth = (x: number) => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Move parts to `amount` of the way between assembled (0) and fully exploded (1).
 * With `stagger` above 0, each part leaves after the ones nearer the centre, so the model opens
 * layer by layer; every part still reaches 0 at amount 0 and 1 at amount 1.
 */
export function applyExplode(parts: ExplodePart[], amount: number, stagger = 0): void {
  const t = THREE.MathUtils.clamp(amount, 0, 1);
  for (const part of parts) {
    // Ease so parts start moving gently and settle at the end.
    const k = smooth(t * (1 + part.delay * stagger) - part.delay * stagger);
    part.object.position.copy(part.home).addScaledVector(part.offset, k);
  }
}
