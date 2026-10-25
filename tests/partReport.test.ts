import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { reportRows } from '../src/ui/report';
import { applyExplode, buildExplode } from '../src/viewer/explode';
import { listParts, partRootOf, reportPart } from '../src/viewer/partReport';
import { MaterialSwitcher } from '../src/viewer/viewModes';

function box(x: number, y: number, z: number, size = 1) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ name: 'stone' }));
  mesh.position.set(x, y, z);
  return mesh;
}

function named(name: string, ...meshes: THREE.Mesh[]) {
  const group = new THREE.Group();
  group.name = name;
  group.add(...meshes);
  return group;
}

describe('part report', () => {
  it('measures size, triangles and materials of one part against the model', () => {
    const model = new THREE.Group();
    const left = named('Left', box(-2, 0.5, 0));
    const right = named('Right', box(2, 0.5, 0));
    model.add(left, right);

    const report = reportPart(left, model);

    expect(report.parts).toBe(1);
    expect(report.triangles).toBe(12);
    expect(report.size).toEqual([1, 1, 1]);
    expect(report.materials).toEqual(['stone']);
    expect(report.valid).toBe(true);
    expect(report.grounded).toBe(true);
    expect(report.symmetric).toBe(false);
    expect(report.offset).toBe(-2);
  });

  it('is symmetric when centred on the model, and flags a floating part', () => {
    const model = new THREE.Group();
    const floor = named('Floor', box(0, 0.5, 0, 1), box(-3, 0.5, 0), box(3, 0.5, 0));
    const halo = named('Halo', box(0, 4, 0));
    model.add(floor, halo);

    const report = reportPart(halo, model);

    expect(report.symmetric).toBe(true);
    expect(report.grounded).toBe(false);
  });

  it('flags a mesh with no vertices or non-finite coordinates', () => {
    const model = new THREE.Group();
    const empty = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    const bad = box(0, 0, 0);
    bad.geometry.getAttribute('position').setX(0, Number.NaN);
    model.add(named('Empty', empty), named('Bad', bad), named('Fine', box(1, 0, 0)));

    expect(reportPart(model.children[0], model).valid).toBe(false);
    expect(reportPart(model.children[1], model).valid).toBe(false);
    expect(reportPart(model.children[2], model).valid).toBe(true);
  });

  it('reports the furthest explode travel it is given', () => {
    const model = new THREE.Group();
    const part = named('P', box(0, 0, 0), box(1, 0, 0));
    model.add(part);
    const report = reportPart(part, model, (mesh) => (mesh === part.children[1] ? 3.26 : 1));
    expect(report.travel).toBe(3.3);
  });
});

describe('part list', () => {
  it('skips single-child wrappers so parts are the real objects', () => {
    const model = new THREE.Group();
    const wrapper = new THREE.Group();
    wrapper.add(named('A', box(0, 0, 0)), named('B', box(1, 0, 0)));
    const outer = new THREE.Group();
    outer.add(wrapper);
    model.add(outer);

    expect(partRootOf(model)).toBe(wrapper);
    expect(listParts(model).map((p) => p.name)).toEqual(['A', 'B']);
  });

  it('treats a single mesh as one part and an empty model as none', () => {
    const single = new THREE.Group();
    single.add(box(0, 0, 0));
    expect(listParts(single)).toHaveLength(1);
    expect(listParts(new THREE.Group())).toEqual([]);
  });

  it('ignores children that hold no geometry', () => {
    const model = new THREE.Group();
    model.add(named('A', box(0, 0, 0)), new THREE.Group(), named('B', box(1, 0, 0)));
    expect(listParts(model).map((p) => p.name)).toEqual(['A', 'B']);
  });
});

describe('report rows', () => {
  it('passes a healthy part and warns on a heavy or invalid one', () => {
    const base = { parts: 3, triangles: 900, size: [1, 2, 3] as [number, number, number], materials: ['stone'], valid: true, symmetric: true, offset: 0, grounded: true, travel: 2 };
    expect(reportRows(base).filter((r) => r.ok === false)).toEqual([]);

    const bad = reportRows({ ...base, triangles: 200_000, valid: false, symmetric: false, offset: 1.5 });
    expect(bad.filter((r) => r.ok === false).map((r) => r.label)).toEqual(['三角面 Tris', '几何有效 Valid', '左右对称 Sym.']);
  });
});

describe('layered explode', () => {
  it('sends inner parts out before outer ones, and ends at the same place', () => {
    const root = new THREE.Group();
    const inner = box(0.5, 0, 0);
    const outer = box(5, 0, 0);
    root.add(inner, outer, box(-5, 0, 0));
    const parts = buildExplode(root);

    applyExplode(parts, 0.3, 1);
    const innerMoved = Math.abs(inner.position.x - 0.5);
    const outerMoved = Math.abs(outer.position.x - 5);
    expect(innerMoved).toBeGreaterThan(outerMoved);

    applyExplode(parts, 1, 1);
    const stagger1 = outer.position.x;
    applyExplode(parts, 1, 0);
    expect(outer.position.x).toBeCloseTo(stagger1);

    applyExplode(parts, 0, 1);
    expect(outer.position.toArray()).toEqual([5, 0, 0]);
  });
});

describe('focus ghosting', () => {
  it('swaps every mesh outside the focus for the ghost material and restores them', () => {
    const root = new THREE.Group();
    const a = box(0, 0, 0);
    const b = box(2, 0, 0);
    root.add(a, b);
    const original = a.material;
    const switcher = new MaterialSwitcher(root);

    switcher.setFocus([a]);
    expect(a.material).toBe(original);
    expect(b.material).not.toBe(original);

    // Debug shading applies to the focused part; the rest stays ghosted.
    switcher.setMode('wireframe');
    expect(a.material).not.toBe(original);
    expect(b.material).not.toBe(a.material);

    switcher.setFocus(null);
    switcher.setMode('shaded');
    expect(a.material).toBe(original);
    expect((b.material as THREE.Material).name).toBe('stone');
  });
});
