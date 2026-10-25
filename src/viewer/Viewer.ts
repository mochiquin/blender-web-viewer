import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Beam } from './beam';
import { applyExplode, buildExplode, type ExplodePart } from './explode';
import { frameObject } from './framing';
import { collectStats, type ModelStats } from './modelStats';
import { listParts, partRootOf, reportPart, type PartReport } from './partReport';
import { MaterialSwitcher, type ViewMode } from './viewModes';

export interface ViewerEvents {
  onHover?: (name: string | null) => void;
  onSelect?: (name: string | null) => void;
  /** Called after every rendered frame, e.g. to move 2D overlays with the camera. */
  onFrame?: () => void;
}

/**
 * Owns the renderer, scene, camera and controls, and shows one model at a time.
 * Think of it as the viewport: lighting and camera live here; the model is swapped in and out.
 */
export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
  readonly controls: OrbitControls;
  readonly keyLight = new THREE.DirectionalLight(0xffffff, 2.2);

  model: THREE.Object3D | null = null;
  stats: ModelStats | null = null;
  private switcher: MaterialSwitcher | null = null;
  private explodeParts: ExplodePart[] = [];
  private explodeAmount = 0;
  private explodeStagger = 0;
  private partRoot: THREE.Object3D | null = null;
  private focused: THREE.Object3D | null = null;
  private fly: { position: THREE.Vector3; target: THREE.Vector3; time: number } | null = null;
  private clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  private modelBox = new THREE.Box3();
  private beam: Beam | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clock = new THREE.Clock();
  private ground: THREE.Mesh;
  private grid: THREE.GridHelper;
  private selectionBox: THREE.BoxHelper | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private hovered: THREE.Object3D | null = null;
  private resizeObserver: ResizeObserver;

  constructor(private container: HTMLElement, public events: ViewerEvents = {}) {
    // Transparent canvas: the page's backdrop (paper, blueprint, ...) shows through behind the model.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    // Cap the pixel ratio: rendering at 3x on a phone costs a lot for little visible gain.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // close to Blender's Filmic/AgX look
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', '3D model viewport');
    container.append(this.renderer.domElement);

    // Image-based lighting so PBR materials from Blender get reflections out of the box.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.keyLight.position.set(3, 5, 2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight, this.keyLight.target);

    // Ground that only shows shadows, plus a grid for scale.
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.18 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.grid = new THREE.GridHelper(1, 10, 0x8d989b, 0xc4cbcc);
    this.grid.visible = false;
    this.scene.add(this.grid);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', (e) => this.updatePointer(e));
    canvas.addEventListener('pointerleave', () => this.setHovered(null));
    // A drag that ends over a part is an orbit, not a pick.
    let down: { x: number; y: number } | null = null;
    canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('click', (e) => {
      const moved = down ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : 0;
      down = null;
      if (moved <= 5) this.select(this.hovered);
    });

    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** Replace the current model, frame it, and rebuild view modes, explode data and stats. */
  setModel(object: THREE.Object3D, animations: THREE.AnimationClip[] = []): void {
    this.clearModel();
    this.model = object;
    this.scene.add(object);

    this.switcher = new MaterialSwitcher(object);
    this.explodeParts = buildExplode(object);
    applyExplode(this.explodeParts, this.explodeAmount, this.explodeStagger);
    this.stats = collectStats(object);
    this.partRoot = partRootOf(object);
    this.modelBox.setFromObject(object);
    this.setSection(0);

    if (animations.length) {
      this.mixer = new THREE.AnimationMixer(object);
      this.mixer.clipAction(animations[0]).play();
    }

    this.fitStage(object);
    this.frameModel();
  }

  setViewMode(mode: ViewMode): void {
    this.switcher?.setMode(mode);
  }

  /** `stagger` > 0 opens the model layer by layer instead of all parts at once. */
  setExplode(amount: number, stagger = 0): void {
    this.explodeAmount = amount;
    this.explodeStagger = stagger;
    applyExplode(this.explodeParts, amount, stagger);
    this.selectionBox?.update();
  }

  /** The parts that can be inspected one by one, in model order. */
  parts(): THREE.Object3D[] {
    return this.model ? listParts(this.model) : [];
  }

  /** Structural check of one part, measured with the model assembled. */
  reportFor(part: THREE.Object3D): PartReport | null {
    if (!this.model) return null;
    applyExplode(this.explodeParts, 0);
    const travel = new Map(this.explodeParts.map((p) => [p.object, p.offset.length() * (p.object.parent?.matrixWorld.getMaxScaleOnAxis() ?? 1)]));
    const report = reportPart(part, this.model, (mesh) => travel.get(mesh as THREE.Mesh) ?? 0);
    applyExplode(this.explodeParts, this.explodeAmount, this.explodeStagger);
    return report;
  }

  /** The part being inspected, if any. */
  get focus(): THREE.Object3D | null {
    return this.focused;
  }

  /**
   * Inspect one part: ghost the rest and fly the camera to it. Pass null to leave inspection
   * and show the whole model again.
   */
  focusPart(part: THREE.Object3D | null): void {
    this.focused = part;
    this.clearSelectionBox();
    if (!part) {
      this.switcher?.setFocus(null);
      this.fly = null;
      return;
    }
    const meshes: THREE.Mesh[] = [];
    part.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });
    this.switcher?.setFocus(meshes);

    const box = new THREE.Box3().setFromObject(part);
    if (box.isEmpty()) return;
    const centre = box.getCenter(new THREE.Vector3());
    // Stand far enough back that the part's bounding sphere fits the view, from the usual three-quarter side.
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const halfFov = THREE.MathUtils.degToRad(Math.min(this.camera.fov, this.camera.fov * this.camera.aspect) / 2);
    const distance = (radius / Math.sin(halfFov)) * 1.15;
    const direction = new THREE.Vector3(0.85, 0.5, 1).normalize();
    this.fly = { position: centre.clone().addScaledVector(direction, distance), target: centre, time: 0 };
  }

  /** Show a beam of light through these world-space points (growing from the first), or remove it with null. */
  setBeam(points: THREE.Vector3[] | null): void {
    if (this.beam) {
      this.scene.remove(this.beam.group);
      this.beam.dispose();
      this.beam = null;
    }
    if (!points || points.length < 2 || this.modelBox.isEmpty()) return;
    this.beam = new Beam(points, this.modelBox.getSize(new THREE.Vector3()).length());
    this.scene.add(this.beam.group);
  }

  /** Cut the model open along X: 0 shows all of it, 1 cuts through to the far side. */
  setSection(amount: number): void {
    const t = THREE.MathUtils.clamp(amount, 0, 1);
    if (t <= 0 || this.modelBox.isEmpty()) {
      this.renderer.clippingPlanes = [];
      return;
    }
    // The plane keeps everything with x <= constant; start past the model and sweep to its far edge.
    const pad = this.modelBox.getSize(new THREE.Vector3()).length() * 0.05;
    this.clip.constant = THREE.MathUtils.lerp(this.modelBox.max.x + pad, this.modelBox.min.x, t);
    this.renderer.clippingPlanes = [this.clip];
  }

  /**
   * The named part an object belongs to: the child of the model's part root it sits under.
   * In a Blender export that is the Blender object, so hovering any of its meshes names it.
   */
  partOf(object: THREE.Object3D | null): THREE.Object3D | null {
    const root = this.partRoot;
    if (!object || !this.model || !root) return null;
    let current: THREE.Object3D = object;
    while (current.parent && current.parent !== root) current = current.parent;
    return current.parent === root ? current : object;
  }

  /** Find a part by name anywhere in the model (exact match). */
  findPart(name: string): THREE.Object3D | null {
    return this.model?.getObjectByName(name) ?? null;
  }

  /** Project a world-space point to CSS pixels inside the viewport (null when behind the camera). */
  toScreen(point: THREE.Vector3): { x: number; y: number } | null {
    const p = point.clone().project(this.camera);
    if (p.z > 1) return null;
    const { clientWidth: w, clientHeight: h } = this.container;
    return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
  }

  /** Turn shadows off for heavy models (they re-render the scene from the light's view). */
  setShadows(enabled: boolean): void {
    this.keyLight.castShadow = enabled;
    this.ground.visible = enabled;
  }

  setGridVisible(visible: boolean): void {
    this.grid.visible = visible;
  }

  /** Point the camera at the model from a three-quarter view. */
  frameModel(): void {
    if (!this.model) return;
    const framing = frameObject(this.model, this.camera.fov, this.camera.aspect);
    this.camera.position.copy(framing.position);
    this.camera.near = framing.near;
    this.camera.far = framing.far;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(framing.target);
    this.controls.update();
  }

  /** Stop rendering (e.g. while another room is on screen) and start again. */
  pause(): void {
    this.renderer.setAnimationLoop(null);
  }

  resume(): void {
    this.clock.getDelta(); // drop the time spent paused
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.clearModel();
    this.controls.dispose();
    this.renderer.dispose();
  }

  /** Size the ground, grid and shadow camera to the model so shadows stay sharp. */
  private fitStage(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const extent = Math.max(size.x, size.z, size.y) * 2.5;

    this.ground.scale.setScalar(extent * 2);
    this.ground.position.set(center.x, box.min.y, center.z);
    this.grid.scale.setScalar(extent);
    this.grid.position.set(center.x, box.min.y + extent * 0.0005, center.z);

    const shadowCam = this.keyLight.shadow.camera;
    shadowCam.left = shadowCam.bottom = -extent / 2;
    shadowCam.right = shadowCam.top = extent / 2;
    shadowCam.near = 0.01;
    shadowCam.far = extent * 4;
    shadowCam.updateProjectionMatrix();
    this.keyLight.target.position.copy(center);
    this.keyLight.position.copy(center).add(new THREE.Vector3(1, 1.6, 0.7).multiplyScalar(extent));
  }

  private clearModel(): void {
    if (!this.model) return;
    this.select(null);
    this.setHovered(null);
    this.setBeam(null);
    this.focused = null;
    this.fly = null;
    this.partRoot = null;
    this.switcher?.dispose();
    this.mixer?.stopAllAction();
    this.scene.remove(this.model);
    disposeObject(this.model);
    this.model = null;
    this.switcher = null;
    this.mixer = null;
    this.explodeParts = [];
    this.stats = null;
  }

  private resize(): void {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    if (!this.model) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.model, true)[0];
    this.setHovered(hit ? this.partOf(hit.object) : null);
  }

  private setHovered(object: THREE.Object3D | null): void {
    if (object === this.hovered) return;
    this.hovered = object;
    this.renderer.domElement.style.cursor = object ? 'pointer' : '';
    this.events.onHover?.(object ? object.name || '(unnamed mesh)' : null);
  }

  private clearSelectionBox(): void {
    if (!this.selectionBox) return;
    this.scene.remove(this.selectionBox);
    this.selectionBox.dispose();
    this.selectionBox = null;
  }

  private select(object: THREE.Object3D | null): void {
    this.clearSelectionBox();
    if (object && !this.focused) {
      this.selectionBox = new THREE.BoxHelper(object, 0xff7a1a); // Blender's selection orange
      this.scene.add(this.selectionBox);
    }
    this.events.onSelect?.(object ? object.name || '(unnamed mesh)' : null);
  }

  private frame(): void {
    const delta = this.clock.getDelta();
    // Skip work while the tab is hidden.
    if (document.hidden) return;
    this.mixer?.update(delta);
    this.beam?.update(delta);
    if (this.fly) {
      const k = 1 - Math.exp(-delta * 3.2);
      this.camera.position.lerp(this.fly.position, k);
      this.controls.target.lerp(this.fly.target, k);
      this.fly.time += delta;
      if (this.fly.time > 1.6) this.fly = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.events.onFrame?.();
  }
}

/** Free GPU memory held by a model's geometries, materials and textures. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}
