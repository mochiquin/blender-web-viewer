import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCheckerTexture, MaterialSwitcher, VIEW_MODES } from '../src/viewer/viewModes';

function scene() {
  const root = new THREE.Group();
  const single = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'paint' }));
  const multi = new THREE.Mesh(new THREE.BoxGeometry(), [
    new THREE.MeshStandardMaterial({ name: 'a' }),
    new THREE.MeshStandardMaterial({ name: 'b' }),
  ]);
  root.add(single, multi);
  return { root, single, multi };
}

describe('MaterialSwitcher', () => {
  it('replaces every material and restores the originals exactly', () => {
    const { root, single, multi } = scene();
    const originalSingle = single.material;
    const originalMulti = multi.material;
    const switcher = new MaterialSwitcher(root);

    for (const mode of VIEW_MODES.filter((m) => m !== 'shaded')) {
      switcher.setMode(mode);
      expect(single.material).not.toBe(originalSingle);
      expect(multi.material).not.toBe(originalMulti);
    }

    switcher.setMode('shaded');
    expect(single.material).toBe(originalSingle);
    expect(multi.material).toBe(originalMulti); // the same array, not a copy
  });

  it('uses a wireframe material in wireframe mode', () => {
    const { root, single } = scene();
    const switcher = new MaterialSwitcher(root);
    switcher.setMode('wireframe');
    expect((single.material as unknown as THREE.MeshBasicMaterial).wireframe).toBe(true);
  });

  it('counts meshes and restores materials on dispose', () => {
    const { root, single } = scene();
    const original = single.material;
    const switcher = new MaterialSwitcher(root);
    expect(switcher.meshCount).toBe(2);
    switcher.setMode('clay');
    switcher.dispose();
    expect(single.material).toBe(original);
  });
});

describe('createCheckerTexture', () => {
  it('builds an RGBA checker with a marked origin cell', () => {
    const texture = createCheckerTexture(4, 2);
    const { data, width, height } = texture.image as { data: Uint8Array; width: number; height: number };
    expect([width, height]).toEqual([8, 8]);
    expect(data.length).toBe(8 * 8 * 4);

    const pixel = (x: number, y: number) => Array.from(data.slice((y * 8 + x) * 4, (y * 8 + x) * 4 + 4));
    const origin = pixel(0, 0);
    const light = pixel(4, 0); // cell (2, 0): light
    const dark = pixel(2, 0); // cell (1, 0): dark
    expect(origin).not.toEqual(light);
    expect(light[0]).toBeGreaterThan(dark[0]);
    expect(origin[3]).toBe(255);
  });
});
