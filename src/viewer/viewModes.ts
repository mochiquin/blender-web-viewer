import * as THREE from 'three';

export const VIEW_MODES = ['shaded', 'clay', 'wireframe', 'normals', 'uv'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  shaded: 'Shaded (materials)',
  clay: 'Clay',
  wireframe: 'Wireframe',
  normals: 'Normals',
  uv: 'UV checker',
};

/**
 * Swaps every mesh's material for a debug material and back again, like Blender's viewport
 * shading modes. Original materials are remembered per mesh, so switching is lossless.
 */
export class MaterialSwitcher {
  private originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private overrides: Record<Exclude<ViewMode, 'shaded'>, THREE.Material>;
  /** Faint cobalt stand-in for every mesh outside the focused part. */
  private ghost = new THREE.MeshBasicMaterial({ color: 0x2a3fe0, transparent: true, opacity: 0.08, depthWrite: false });
  private focus: Set<THREE.Mesh> | null = null;
  mode: ViewMode = 'shaded';

  constructor(root: THREE.Object3D) {
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) this.originals.set(mesh, mesh.material);
    });
    this.overrides = {
      clay: new THREE.MeshStandardMaterial({ color: 0xcfcac2, roughness: 0.85, metalness: 0 }),
      wireframe: new THREE.MeshBasicMaterial({ color: 0x2b3a55, wireframe: true }),
      normals: new THREE.MeshNormalMaterial(),
      uv: new THREE.MeshBasicMaterial({ map: createCheckerTexture() }),
    };
  }

  get meshCount(): number {
    return this.originals.size;
  }

  setMode(mode: ViewMode): void {
    this.mode = mode;
    this.apply();
  }

  /** Ghost every mesh that is not in `meshes`; pass null to show everything again. */
  setFocus(meshes: Iterable<THREE.Mesh> | null): void {
    this.focus = meshes ? new Set(meshes) : null;
    this.apply();
  }

  private apply(): void {
    for (const [mesh, original] of this.originals) {
      mesh.material = this.focus && !this.focus.has(mesh) ? this.ghost : this.mode === 'shaded' ? original : this.overrides[this.mode];
    }
  }

  /** Materials currently on screen for a mesh, before any override. */
  originalOf(mesh: THREE.Mesh): THREE.Material | THREE.Material[] | undefined {
    return this.originals.get(mesh);
  }

  dispose(): void {
    this.focus = null;
    this.setMode('shaded');
    this.ghost.dispose();
    for (const material of Object.values(this.overrides)) {
      const map = (material as THREE.MeshBasicMaterial).map;
      map?.dispose();
      material.dispose();
    }
  }
}

/**
 * An 8x8 checker with a coloured corner, for spotting stretched or flipped UVs.
 * Built from raw pixels so it works without a canvas (and in tests).
 */
export function createCheckerTexture(cells = 8, cellSize = 16): THREE.DataTexture {
  const size = cells * cellSize;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      const light = (cx + cy) % 2 === 0;
      const i = (y * size + x) * 4;
      const marker = cx === 0 && cy === 0; // shows which way is (0, 0)
      data[i] = marker ? 230 : light ? 235 : 60;
      data[i + 1] = marker ? 80 : light ? 235 : 60;
      data[i + 2] = marker ? 60 : light ? 235 : 70;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
