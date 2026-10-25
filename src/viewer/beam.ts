import * as THREE from 'three';

const smooth = (x: number) => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/** How long the beam takes to grow from the first point to the last, in seconds. */
const GROW = 1.8;

/**
 * A beam of light threaded through a list of points: three nested additive tubes (core, halo,
 * glow) that grow along the path, plus a soft sphere at each point. Sizes scale with `scale`
 * (the model's diagonal), so it looks the same on a sword and on a cathedral.
 */
export class Beam {
  readonly group = new THREE.Group();
  private time = 0;
  private clock = 0;

  constructor(points: THREE.Vector3[], scale: number) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
    const radii: [number, number, string][] = [
      [0.004, 0.95, '#e8eeff'],
      [0.014, 0.3, '#7f9cff'],
      [0.035, 0.1, '#5b7ff0'],
    ];
    for (const [radius, peak, color] of radii) {
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 160, radius * scale, 10, false),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      tube.userData.peak = peak;
      this.group.add(tube);
    }
    for (const point of points) {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.014 * scale, 16, 12),
        new THREE.MeshBasicMaterial({ color: '#dfe7ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      glow.position.copy(point);
      glow.userData.peak = 0.8;
      glow.userData.glow = true;
      this.group.add(glow);
    }
  }

  /** Advance the animation by `dt` seconds. */
  update(dt: number): void {
    this.time += dt;
    this.clock += dt;
    const grow = smooth(this.time / GROW);
    const pulse = 0.8 + 0.2 * Math.sin(this.clock * 3.2);
    for (const child of this.group.children as THREE.Mesh[]) {
      const material = child.material as THREE.MeshBasicMaterial;
      if (child.userData.glow) {
        material.opacity = child.userData.peak * pulse * smooth(this.time / GROW - 0.2);
        child.scale.setScalar(1 + 0.25 * Math.sin(this.clock * 4 + child.position.y));
      } else {
        material.opacity = child.userData.peak * pulse * grow;
        // Reveal the tube from its start: 6 indices per quad, so cut on a quad boundary.
        const count = child.geometry.index?.count ?? 0;
        child.geometry.setDrawRange(0, Math.floor((count * grow) / 6) * 6);
      }
    }
  }

  dispose(): void {
    for (const child of this.group.children as THREE.Mesh[]) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
    this.group.clear();
  }
}
