// Copies the Draco decoder that ships with three.js into public/draco, so Draco-compressed
// .glb files exported from Blender can be decoded locally (no CDN). Runs before dev and build.
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules/three/examples/jsm/libs/draco/gltf');
const target = join(root, 'public/draco');

mkdirSync(target, { recursive: true });
for (const file of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
  cpSync(join(source, file), join(target, file));
}
