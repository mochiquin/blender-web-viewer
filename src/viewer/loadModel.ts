import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

let loader: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (loader) return loader;
  const draco = new DRACOLoader();
  // Copied into public/draco by scripts/copy-draco.mjs, so Blender's Draco option just works.
  draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

export interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

/** Load a .glb/.gltf from a URL (a file in public/models/ or a dropped file's object URL). */
export async function loadModel(url: string, onProgress?: (fraction: number) => void): Promise<LoadedModel> {
  const gltf = await getLoader().loadAsync(url, (event) => {
    if (onProgress && event.total) onProgress(event.loaded / event.total);
  });
  gltf.scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return { scene: gltf.scene, animations: gltf.animations };
}
