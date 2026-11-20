import * as THREE from 'three';
import { ISLAND_RADIUS, type Vec3 } from '../sim';

const PITCH = THREE.MathUtils.degToRad(55);
const EDGE_PX = 18;
const PAN_SPEED = 26; // m/s
const MIN_DIST = 16;
const MAX_DIST = 64;

/** Fixed-angle MOBA camera: edge panning, Space to recentre / hold to follow, wheel zoom. */
export class MobaCamera {
  readonly focus = new THREE.Vector3();
  private distance = 42;
  private mouse: { x: number; y: number } | null = null;

  constructor(readonly camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    dom.addEventListener('mousemove', (e) => (this.mouse = { x: e.clientX, y: e.clientY }));
    dom.addEventListener('mouseleave', () => (this.mouse = null));
    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.distance = THREE.MathUtils.clamp(this.distance + Math.sign(e.deltaY) * 3, MIN_DIST, MAX_DIST);
      },
      { passive: false },
    );
  }

  centerOn(p: Vec3): void {
    this.focus.set(p[0], 0, p[2]);
  }

  update(dt: number, follow: Vec3 | null): void {
    if (follow) this.centerOn(follow);
    else if (this.mouse) {
      const { innerWidth: w, innerHeight: h } = window;
      const dx = this.mouse.x < EDGE_PX ? -1 : this.mouse.x > w - EDGE_PX ? 1 : 0;
      const dz = this.mouse.y < EDGE_PX ? -1 : this.mouse.y > h - EDGE_PX ? 1 : 0;
      this.focus.x += dx * PAN_SPEED * dt;
      this.focus.z += dz * PAN_SPEED * dt;
      const r = Math.hypot(this.focus.x, this.focus.z);
      if (r > ISLAND_RADIUS) this.focus.multiplyScalar(ISLAND_RADIUS / r);
    }
    this.camera.position.set(
      this.focus.x,
      this.distance * Math.sin(PITCH),
      this.focus.z + this.distance * Math.cos(PITCH),
    );
    this.camera.lookAt(this.focus);
  }
}
