import * as THREE from 'three';
import { mesh, palette, part } from './materials';

/** Placeholder weapon on a display stand: an extruded blade, a crossguard, a wrapped grip and a pommel. */
export function createWeapon(): THREE.Group {
  const m = palette();
  const root = new THREE.Group();
  root.name = 'Blade (placeholder)';
  const axisY = 0.62; // height of the sword's centre line above the floor

  root.add(
    part(
      'Stand',
      mesh(new THREE.BoxGeometry(1.9, 0.08, 0.5), m.ink, 0, 0.04, 0),
      mesh(new THREE.BoxGeometry(0.06, 0.52, 0.06), m.ink, -0.45, 0.34, 0),
      mesh(new THREE.BoxGeometry(0.06, 0.52, 0.06), m.ink, 0.45, 0.34, 0),
      mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 24, Math.PI), m.gilt, -0.45, axisY - 0.03, 0),
      mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 24, Math.PI), m.gilt, 0.45, axisY - 0.03, 0),
    ),
  );

  // Blade outline in the XY plane, extruded thinly with a bevel for edges.
  const outline = new THREE.Shape();
  outline.moveTo(0, -0.035);
  outline.lineTo(1.05, -0.03);
  outline.lineTo(1.22, 0);
  outline.lineTo(1.05, 0.03);
  outline.lineTo(0, 0.035);
  outline.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(outline, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
  bladeGeometry.translate(0, 0, -0.003);
  const blade = mesh(bladeGeometry, m.steel, -0.38, axisY, 0);
  const fuller = mesh(new THREE.BoxGeometry(0.8, 0.012, 0.022), m.cobalt, 0.08, axisY, 0);
  root.add(part('Blade', blade, fuller));

  const guardBar = mesh(new THREE.BoxGeometry(0.05, 0.34, 0.06), m.gilt, -0.4, axisY, 0);
  const guardRing = mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 32), m.cobalt, -0.4, axisY, 0);
  guardRing.rotation.y = Math.PI / 2;
  root.add(part('Guard', guardBar, guardRing));

  const grip = mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.26, 16), m.ink, -0.56, axisY, 0);
  grip.rotation.z = Math.PI / 2;
  const wraps = Array.from({ length: 5 }, (_, i) => {
    const wrap = mesh(new THREE.TorusGeometry(0.025, 0.005, 6, 20), m.gilt, -0.46 - i * 0.05, axisY, 0);
    wrap.rotation.y = Math.PI / 2;
    return wrap;
  });
  root.add(part('Grip', grip, ...wraps));
  root.add(part('Pommel', mesh(new THREE.OctahedronGeometry(0.05), m.gilt, -0.72, axisY, 0)));
  return root;
}
