import * as THREE from 'three';
import { mesh, palette, part } from './materials';

const BAYS = 5;
const BAY = 2.2; // metres between piers along the nave
const HALF = 2.4; // half the nave width
const PIER_HEIGHT = 4;

/**
 * Points along a pointed (gothic) arch springing from (-span/2, 0) and (span/2, 0) up to an
 * apex at (0, rise). Each half is a circular arc centred on the springing line, so the two
 * halves meet at a point. Needs rise > span/2 to be pointed.
 */
export function pointedArchPoints(span: number, rise: number, steps = 16): THREE.Vector3[] {
  const half = span / 2;
  const centre = (rise * rise - half * half) / (2 * half); // left arc centre sits at (+centre, 0)
  const radius = half + centre;
  const startAngle = Math.PI;
  const endAngle = Math.atan2(rise, -centre);
  const left: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + ((endAngle - startAngle) * i) / steps;
    left.push(new THREE.Vector3(centre + Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  const right = left
    .slice(0, -1)
    .reverse()
    .map((p) => new THREE.Vector3(-p.x, p.y, 0));
  return [...left, ...right];
}

function archTube(span: number, rise: number, thickness: number): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pointedArchPoints(span, rise)), 48, thickness, 8);
}

/** Placeholder sanctum: steps, a floor, two rows of piers, pointed arcades, rib vaults and a rose window. */
export function createCathedral(): THREE.Group {
  const m = palette();
  const root = new THREE.Group();
  root.name = 'Sanctum (placeholder)';
  const length = BAYS * BAY;
  const z0 = length / 2;

  root.add(
    part(
      'Steps',
      ...[0, 1, 2].map((i) => mesh(new THREE.BoxGeometry(HALF * 2 + 1.6 - i * 0.4, 0.18, 0.6), m.stone, 0, 0.09 + i * 0.18, z0 + 1.6 - i * 0.5)),
    ),
    part('Floor', mesh(new THREE.BoxGeometry(HALF * 2 + 1.2, 0.5, length + 1), m.stone, 0, 0.25, 0)),
  );

  const piers: THREE.Mesh[] = [];
  const arcade: THREE.Mesh[] = [];
  const vault: THREE.Mesh[] = [];
  const archGeometry = archTube(BAY, 1.6, 0.09);
  const ribGeometry = archTube(HALF * 2, 2.6, 0.07);

  for (let i = 0; i <= BAYS; i++) {
    const z = z0 - i * BAY;
    for (const x of [-HALF, HALF]) {
      const shaft = mesh(new THREE.CylinderGeometry(0.2, 0.24, PIER_HEIGHT, 12), m.stone, x, 0.5 + PIER_HEIGHT / 2, z);
      const capital = mesh(new THREE.BoxGeometry(0.62, 0.22, 0.62), m.darkStone, x, 0.5 + PIER_HEIGHT + 0.11, z);
      piers.push(shaft, capital);
      if (i < BAYS) {
        const arch = mesh(archGeometry, m.stone, x, 0.5 + PIER_HEIGHT + 0.2, z - BAY / 2);
        arch.rotation.y = Math.PI / 2;
        arcade.push(arch);
      }
    }
    const rib = mesh(ribGeometry, m.cobalt, 0, 0.5 + PIER_HEIGHT + 0.2, z);
    vault.push(rib);
  }

  root.add(part('Piers', ...piers), part('Arcade', ...arcade), part('Vault ribs', ...vault));

  // Rose window: a rim, spokes and glass, set into the end wall.
  const wallZ = z0 - length - 0.3;
  const roseY = 0.5 + PIER_HEIGHT + 1.2;
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const spoke = mesh(new THREE.BoxGeometry(0.06, 1.7, 0.08), m.ink, 0, roseY, wallZ + 0.12);
    spoke.rotation.z = (i / 12) * Math.PI;
    return spoke;
  });
  root.add(
    part('End wall', mesh(new THREE.BoxGeometry(HALF * 2 + 0.8, PIER_HEIGHT + 3.4, 0.3), m.stone, 0, 0.5 + (PIER_HEIGHT + 3.4) / 2, wallZ - 0.1)),
    part(
      'Rose window',
      mesh(new THREE.TorusGeometry(0.9, 0.08, 10, 64), m.cobalt, 0, roseY, wallZ + 0.12),
      mesh(new THREE.CircleGeometry(0.88, 48), m.glass, 0, roseY, wallZ + 0.07),
      ...spokes,
    ),
  );
  return root;
}
