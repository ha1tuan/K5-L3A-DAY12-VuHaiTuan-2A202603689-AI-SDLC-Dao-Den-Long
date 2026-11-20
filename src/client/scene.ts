import * as THREE from 'three';
import { CONTRACT_TUNING, WIND_EVERY_TICKS, WIND_WARN_TICKS, type Column, type NightDef, type SimEvent, type SimState, type Vec3 } from '../sim';
import { ambientIntensity, paletteFor, PALETTE as C, type ColorScheme } from './lighting';
import { blinkOn, DARK_SQUASH, fuelFraction, isWeakLantern } from './lanternLook';

const T = CONTRACT_TUNING;
const TAU = Math.PI * 2;
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** Small deterministic PRNG so a night always gets the same trees (decoration only, never gameplay). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const idNum = (id: string) => Number(id.replace(/\D/g, '')) || 0;

interface LanternView {
  group: THREE.Group;
  shell: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  light: THREE.PointLight;
  progress: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  zone: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  /** Paper tear shown while dark (PRD v3 §5.6: dark vs lit without colour). */
  tear: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  fuelBack: THREE.Sprite;
  fuelBar: THREE.Sprite;
  shown: number;
  litAt: number | null;
}
interface ShadeView {
  group: THREE.Group;
  body: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  rim: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  eyes: THREE.MeshBasicMaterial;
  /** Thin beam to the lantern it drains. */
  beam: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  phase: number;
}
interface DrifterView {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  base: Float32Array;
  phase: number;
}
interface Burst {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  age: number;
  life: number;
  radius: number;
}
type TreeKind = 'round' | 'areca' | 'pine';

const MAX_MOTES = 64;
const AMBIENT_FLIES = 300;
const LEAVES = 160;

/**
 * Renders one night from its map data (nightDef) and keeps meshes in sync with a read-only sim state.
 * Decoration (trees, ambient fireflies, sky) exists only here: the sim and headless never see it.
 */
export class WorldView {
  readonly scene = new THREE.Scene();
  /** Walkable tops, for click-to-move raycasts. */
  readonly pickables: THREE.Object3D[] = [];
  readonly bounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };

  private ambient = new THREE.AmbientLight(0xbfc8ff, 0.15);
  private lanterns = new Map<string, LanternView>();
  private colors: ColorScheme = paletteFor(false);
  private shades = new Map<string, ShadeView>();
  private drifters = new Map<string, DrifterView>();
  private charms = new Map<string, THREE.Group>();
  private bursts: Burst[] = [];
  private may: THREE.Group;
  private mayLight: THREE.PointLight;
  private trail: THREE.Mesh[] = [];
  private marker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private moteCores: THREE.InstancedMesh;
  private moteHalo: THREE.Points;
  private flies: THREE.Points;
  private flySeeds: Float32Array;
  private leaves: THREE.Points;
  private leafSeeds: Float32Array;
  private canopies: { mesh: THREE.InstancedMesh; base: THREE.Matrix4[]; phase: number[] }[] = [];
  private pads: THREE.Mesh[] = [];
  private facing = 0;
  private time = 0;

  constructor(private readonly def: NightDef) {
    const s = this.scene;
    s.background = new THREE.Color(C.sky);
    s.fog = new THREE.Fog(C.fog, 70, 190);
    s.add(this.ambient);
    const hemi = new THREE.HemisphereLight(0x9aa6ff, 0x2a3060, 1.7);
    const moon = new THREE.DirectionalLight(0xd6deff, 1.6);
    moon.position.set(-40, 70, 30);
    s.add(hemi, moon);

    this.buildSky();
    this.buildSea();
    for (const c of def.terrain.columns) this.buildColumn(c);
    this.computeBounds();
    this.buildTrees();
    for (const pad of def.pads) this.buildPad(pad.pos);

    this.may = this.buildMay();
    this.mayLight = new THREE.PointLight(C.lanternLit, 6, 9, 1.6);
    this.mayLight.position.set(0, 1.6, 0.6);
    this.may.add(this.mayLight);
    s.add(this.may);
    for (let i = 0; i < 4; i++) {
      const ghost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.42, 1.1, 10),
        new THREE.MeshBasicMaterial({ color: C.moteHalo, transparent: true, opacity: 0, depthWrite: false }),
      );
      this.trail.push(ghost);
      s.add(ghost);
    }

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.5, 32),
      new THREE.MeshBasicMaterial({ color: C.lanternLit, transparent: true, opacity: 0 }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    s.add(this.marker);

    // Gameplay fireflies: one instanced draw for the cores, one point cloud for the glow.
    this.moteCores = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: C.moteCore, toneMapped: false }), MAX_MOTES);
    this.moteCores.count = 0;
    s.add(this.moteCores);
    this.moteHalo = this.glowPoints(MAX_MOTES, 0xffb02e, 3.0);
    s.add(this.moteHalo);

    // Ambient fireflies drifting over the island (decoration).
    this.flies = this.glowPoints(AMBIENT_FLIES, 0xff9a1f, 1.2);
    this.flySeeds = new Float32Array(AMBIENT_FLIES * 4);
    const rnd = lcg(7 + def.id);
    for (let i = 0; i < AMBIENT_FLIES; i++) {
      const [x, z] = this.randomLandPoint(rnd);
      this.flySeeds.set([x, z, rnd() * TAU, 0.6 + rnd() * 2.6], i * 4);
    }
    s.add(this.flies);

    this.leaves = this.glowPoints(LEAVES, 0x9bbf6a, 0.35, false);
    this.leafSeeds = new Float32Array(LEAVES * 3);
    for (let i = 0; i < LEAVES; i++) this.leafSeeds.set([rnd() * 2 - 1, rnd() * 2 - 1, rnd()], i * 3);
    this.leaves.visible = false;
    s.add(this.leaves);
  }

  // ------------------------------------------------------------------ static world
  private buildSky(): void {
    const n = 900;
    const pos = new Float32Array(n * 3);
    const rnd = lcg(99);
    for (let i = 0; i < n; i++) {
      const t = rnd() * TAU;
      const p = Math.acos(rnd() * 0.9);
      pos.set([Math.sin(p) * Math.cos(t) * 260, Math.cos(p) * 260 - 20, Math.sin(p) * Math.sin(t) * 260], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 0.9, sizeAttenuation: true, fog: false })));
  }

  private buildSea(): void {
    const sea = new THREE.Mesh(new THREE.CircleGeometry(320, 64), new THREE.MeshBasicMaterial({ color: C.cloudSea }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -14;
    this.scene.add(sea);
    // Cloud puffs: one instanced mesh.
    const rnd = lcg(5);
    const puffs = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: 0x1f3550, roughness: 1, flatShading: true, transparent: true, opacity: 0.75 }),
      70,
    );
    const cx = this.def.id === 2 ? 35 : 0;
    for (let i = 0; i < 70; i++) {
      const a = rnd() * TAU;
      const r = 40 + rnd() * 90;
      const sc = 4 + rnd() * 7;
      tmpM.compose(tmpV.set(cx + Math.cos(a) * r, -13 + rnd() * 3, Math.sin(a) * r), tmpQ.identity(), tmpS.set(sc * 1.6, sc * 0.6, sc));
      puffs.setMatrixAt(i, tmpM);
    }
    this.scene.add(puffs);
  }

  private material(color: number, rough = 0.95): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });
  }

  private buildColumn(c: Column): void {
    const s = this.scene;
    if (c.kind === 'disk' && c.obstacle) {
      // Bell tower: stone shaft, roof and a golden bell.
      const g = new THREE.Group();
      const shaftH = c.top - 6;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.9, c.r, shaftH, 10), this.material(0x8a8478));
      shaft.position.y = 6 + shaftH / 2;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(c.r * 1.5, 2.6, 10), this.material(C.red, 0.7));
      roof.position.y = c.top + 1.2;
      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 16, 12, 0, TAU, 0, Math.PI * 0.6),
        new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.6, roughness: 0.35, emissive: C.gold, emissiveIntensity: 0.25 }),
      );
      bell.position.y = c.top - 0.6;
      g.add(shaft, roof, bell);
      g.position.set(c.cx, 0, c.cz);
      s.add(g);
      return;
    }
    if (c.kind === 'disk') {
      const depth = c.top === 0 ? 3 : c.top;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r * (c.top === 0 ? 0.97 : 1), depth, 64, 1), [
        this.material(c.top === 0 ? C.sand : 0x8a8478),
        this.material(c.top === 0 ? C.grass : 0x6aa878),
        this.material(0x3a3040),
      ]);
      top.position.set(c.cx, c.top - depth / 2, c.cz);
      s.add(top);
      this.pickables.push(top);
      if (c.top === 0) {
        // Sandy beach around the rim, then the floating rock under the island.
        const beach = new THREE.Mesh(new THREE.RingGeometry(c.r - 2.2, c.r + 0.02, 72), this.material(C.sand));
        beach.rotation.x = -Math.PI / 2;
        beach.position.set(c.cx, 0.02, c.cz);
        s.add(beach);
        const rock = new THREE.Mesh(new THREE.ConeGeometry(c.r * 0.97, c.r * 0.7, 18, 3), this.material(0x2a2438));
        rock.rotation.x = Math.PI;
        rock.position.set(c.cx, -depth - c.r * 0.35, c.cz);
        s.add(rock);
      }
      return;
    }
    if (c.kind === 'half-ring') {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, c.r1, 0, Math.PI, false);
      shape.absarc(0, 0, c.r0, Math.PI, 0, true);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: c.top, bevelEnabled: false, curveSegments: 48 });
      const mesh = new THREE.Mesh(geo, [this.material(0x58946a), this.material(0x8a8478)]);
      mesh.rotation.x = Math.PI / 2; // shape y → world z, extrusion goes down from the top
      mesh.position.y = c.top;
      s.add(mesh);
      this.pickables.push(mesh);
      return;
    }
    if (c.kind === 'rect') {
      // Bamboo bridge: planks across the gap, no railing (§4.2).
      const g = new THREE.Group();
      const len = c.x1 - c.x0;
      const n = Math.round(len / 0.6);
      for (let i = 0; i < n; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, c.z1 - c.z0), this.material(i % 2 ? C.wood : 0x7d5a3a));
        plank.position.set(c.x0 + (i + 0.5) * (len / n), -0.09, (c.z0 + c.z1) / 2);
        g.add(plank);
      }
      for (const z of [c.z0, c.z1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 6), this.material(0x9bbf6a));
        pole.rotation.z = Math.PI / 2;
        pole.position.set((c.x0 + c.x1) / 2, -0.12, z);
        g.add(pole);
      }
      s.add(g);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(len, 0.2, c.z1 - c.z0), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set((c.x0 + c.x1) / 2, -0.1, (c.z0 + c.z1) / 2);
      s.add(hit);
      this.pickables.push(hit);
      return;
    }
    // Ramp: a sloped slab from the foot (Y 0) to the top (Y rise).
    const run = Math.abs(c.sTop - c.sFoot);
    const len = Math.hypot(run, c.rise);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, c.halfWidth * 2), this.material(C.sand));
    const t = (c.angleDeg * Math.PI) / 180;
    const sMid = (c.sTop + c.sFoot) / 2;
    slab.position.set(Math.cos(t) * sMid, c.rise / 2 - 0.15, Math.sin(t) * sMid);
    slab.rotation.y = -t;
    slab.rotateZ(Math.sign(c.sTop - c.sFoot) * Math.atan2(c.rise, run)); // outward (+x) goes down to the foot
    this.scene.add(slab);
    this.pickables.push(slab);
  }

  private computeBounds(): void {
    const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (const c of this.def.terrain.columns) {
      if (c.kind === 'disk') {
        b.minX = Math.min(b.minX, c.cx - c.r);
        b.maxX = Math.max(b.maxX, c.cx + c.r);
        b.minZ = Math.min(b.minZ, c.cz - c.r);
        b.maxZ = Math.max(b.maxZ, c.cz + c.r);
      }
    }
    Object.assign(this.bounds, b);
  }

  private randomLandPoint(rnd: () => number): [number, number] {
    const { minX, maxX, minZ, maxZ } = this.bounds;
    for (let k = 0; k < 50; k++) {
      const x = minX + rnd() * (maxX - minX);
      const z = minZ + rnd() * (maxZ - minZ);
      if (Number.isFinite(this.def.terrain.highest(x, z))) return [x, z];
    }
    return [0, 0];
  }

  /** Trees stay clear of everything the player must reach: lanterns, mote points, pads, charms, the start. */
  private buildTrees(): void {
    const kind: TreeKind = this.def.id === 1 ? 'round' : this.def.id === 2 ? 'areca' : 'pine';
    const keepClear: Vec3[] = [...this.def.lanterns, ...this.def.motePoints, ...this.def.pads.map((p) => p.pos), ...this.def.charms.map((c) => c.pos), this.def.start];
    const rnd = lcg(31 * this.def.id);
    const spots: { x: number; y: number; z: number; s: number }[] = [];
    for (let k = 0; k < 900 && spots.length < 46; k++) {
      const [x, z] = this.randomLandPoint(rnd);
      const y = this.def.terrain.highest(x, z);
      if (y > 6) continue;
      // Only on flat ground, away from cliffs, ramps and the bridge.
      const flat = [0, 1.6].every((d) => [0, 1, 2, 3].every((q) => this.def.terrain.highest(x + d * Math.cos((q * Math.PI) / 2), z + d * Math.sin((q * Math.PI) / 2)) === y));
      if (!flat) continue;
      if (keepClear.some((p) => Math.hypot(p[0] - x, p[2] - z) < 5)) continue;
      if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < 4.5)) continue;
      spots.push({ x, y, z, s: 0.6 + rnd() * 0.45 });
    }
    const n = spots.length;
    const trunkGeo =
      kind === 'areca' ? new THREE.CylinderGeometry(0.12, 0.18, 5.5, 6) : new THREE.CylinderGeometry(0.18, 0.28, kind === 'pine' ? 1.6 : 2.2, 6);
    const trunks = new THREE.InstancedMesh(trunkGeo, this.material(C.wood), n);
    const canopyGeo =
      kind === 'round'
        ? new THREE.IcosahedronGeometry(1.5, 0)
        : kind === 'pine'
          ? new THREE.ConeGeometry(1.4, 3.6, 7)
          : new THREE.ConeGeometry(1.9, 0.9, 7, 1, true);
    const canopy = new THREE.InstancedMesh(canopyGeo, new THREE.MeshStandardMaterial({ color: kind === 'pine' ? 0x24493f : C.grass, roughness: 0.9, flatShading: true, side: THREE.DoubleSide }), n);
    const base: THREE.Matrix4[] = [];
    const phase: number[] = [];
    spots.forEach((p, i) => {
      const trunkH = kind === 'areca' ? 5.5 : kind === 'pine' ? 1.6 : 2.2;
      tmpM.compose(tmpV.set(p.x, p.y + (trunkH * p.s) / 2, p.z), tmpQ.setFromAxisAngle(UP, rnd() * TAU), tmpS.setScalar(p.s));
      trunks.setMatrixAt(i, tmpM);
      const top = p.y + trunkH * p.s + (kind === 'pine' ? 1.4 : kind === 'round' ? 0.9 : 0) * p.s;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, top, p.z), tmpQ.clone(), new THREE.Vector3(p.s, p.s * (kind === 'round' ? 0.85 : 1), p.s));
      base.push(m);
      phase.push(rnd() * TAU);
      canopy.setMatrixAt(i, m);
    });
    this.scene.add(trunks, canopy);
    this.buildGroundCover(rnd, keepClear);
    this.canopies.push({ mesh: canopy, base, phase });
  }

  /** Grass tufts, flowers and pebbles so the ground reads as ground (decoration only). */
  private buildGroundCover(rnd: () => number, keepClear: Vec3[]): void {
    const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.18, 0.6, 4), this.material(0x5f9a5a), 520);
    const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0xffb347, emissiveIntensity: 0.5 }), 140);
    const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.35, 0), this.material(0x6d6a78), 120);
    const place = (mesh: THREE.InstancedMesh, yOff: number, scale: () => number) => {
      for (let i = 0; i < mesh.count; i++) {
        const [x, z] = this.randomLandPoint(rnd);
        const y = this.def.terrain.highest(x, z);
        const ok = Number.isFinite(y) && !keepClear.some((p) => Math.hypot(p[0] - x, p[2] - z) < 1.2);
        tmpM.compose(tmpV.set(x, (ok ? y : -50) + yOff, z), tmpQ.setFromAxisAngle(UP, rnd() * TAU), tmpS.setScalar(scale()));
        mesh.setMatrixAt(i, tmpM);
      }
      this.scene.add(mesh);
    };
    place(tufts, 0.25, () => 0.6 + rnd() * 0.8);
    place(flowers, 0.15, () => 0.7 + rnd() * 0.6);
    place(pebbles, 0.05, () => 0.4 + rnd() * 0.9);
  }

  private buildPad(pos: Vec3): void {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1.1, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: C.gold, emissive: C.lanternLit, emissiveIntensity: 0.6, roughness: 0.4 }),
    );
    pad.position.set(pos[0], pos[1] + 0.12, pos[2]);
    this.scene.add(pad);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 32), new THREE.MeshBasicMaterial({ color: C.lanternCore, transparent: true, opacity: 0.8 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos[0], pos[1] + 0.3, pos[2]);
    this.scene.add(ring);
    this.pads.push(ring);
  }

  private glowTexture(): THREE.Texture {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }

  private glowPoints(n: number, color: number, size: number, additive = true): THREE.Points {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setDrawRange(0, n);
    const m = new THREE.PointsMaterial({
      color,
      size,
      map: this.glowTexture(),
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      fog: false,
      toneMapped: false,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  }

  // ------------------------------------------------------------------ actors
  private buildMay(): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 1.1, 12), this.material(C.mayCoat, 0.8));
    body.position.y = 0.55;
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 6, 16), this.material(C.red, 0.7));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.1;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe8c39e, roughness: 0.7 }));
    head.position.y = 1.35;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 24), this.material(0xe2c27a, 0.9));
    hat.position.y = 1.72;
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), new THREE.MeshBasicMaterial({ color: 0x5a4630 }));
    string.position.set(0, 1.38, 0.62);
    const tiny = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      new THREE.MeshStandardMaterial({ color: C.red, emissive: C.lanternLit, emissiveIntensity: 1.6 }),
    );
    tiny.scale.y = 1.3;
    tiny.position.set(0, 1.15, 0.62);
    g.add(body, scarf, head, hat, string, tiny);
    return g;
  }

  private lanternView(id: string, pos: Vec3): LanternView {
    let v = this.lanterns.get(id);
    if (v) return v;
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4, 8), this.material(C.wood, 0.9));
    pole.position.y = 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), this.material(C.wood, 0.9));
    arm.position.set(0.45, 3.9, 0);
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 18, 14),
      new THREE.MeshStandardMaterial({ color: C.lanternOff, emissive: C.lanternLit, emissiveIntensity: 0, roughness: 0.6 }),
    );
    shell.scale.y = 1.25;
    shell.position.set(0.9, 3.1, 0);
    const light = new THREE.PointLight(C.lanternLit, 0, T.safe_radius * 3.2, 1.4);
    light.position.copy(shell.position);
    light.visible = false;
    const progress = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.05, 40, 1, Math.PI / 2, 0), new THREE.MeshBasicMaterial({ color: C.gold, side: THREE.DoubleSide }));
    progress.rotation.x = -Math.PI / 2;
    progress.position.y = 0.06;
    const zone = new THREE.Mesh(
      new THREE.RingGeometry(T.safe_radius - 0.12, T.safe_radius, 72),
      new THREE.MeshBasicMaterial({ color: C.lanternLit, transparent: true, opacity: 0 }),
    );
    zone.rotation.x = -Math.PI / 2;
    zone.position.y = 0.05;
    const tear = new THREE.Mesh(new THREE.CircleGeometry(0.26, 5), new THREE.MeshBasicMaterial({ color: 0x0b0710, side: THREE.DoubleSide }));
    tear.position.set(0.9, 3.15, 0.6);
    tear.rotation.z = 0.6;
    tear.scale.set(1, 1.6, 1);
    // Fuel bar above the lantern: sprites always face the camera; the bar grows from its left edge.
    const fuelBack = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1c1030, transparent: true, opacity: 0.75, depthWrite: false }));
    fuelBack.center.set(0, 0.5);
    fuelBack.scale.set(1.7, 0.2, 1);
    fuelBack.position.set(0.05, 4.55, 0);
    const fuelBar = new THREE.Sprite(new THREE.SpriteMaterial({ color: C.lanternCore, depthWrite: false }));
    fuelBar.center.set(0, 0.5);
    fuelBar.position.set(0.08, 4.55, 0.01);
    fuelBar.renderOrder = 1;
    group.add(pole, arm, shell, light, progress, zone, tear, fuelBack, fuelBar);
    group.position.set(pos[0], pos[1], pos[2]);
    this.scene.add(group);
    v = { group, shell, light, progress, zone, tear, fuelBack, fuelBar, shown: -1, litAt: null };
    this.lanterns.set(id, v);
    return v;
  }

  /**
   * Geometry and materials shared by every shade (PRD v4 bench: 200 shades). One body material per look
   * (idle, chasing or draining, stunned) instead of one per shade keeps state changes and memory down.
   */
  private shadeKitCache: ReturnType<WorldView['makeShadeKit']> | null = null;
  private makeShadeKit() {
    const body = (color: number, emissiveIntensity: number) =>
      new THREE.MeshStandardMaterial({ color, emissive: this.colors.shadeRim, emissiveIntensity, roughness: 0.4 });
    return {
      bodyGeo: new THREE.SphereGeometry(0.75, 18, 14),
      rimGeo: new THREE.SphereGeometry(0.82, 18, 14),
      eyeGeo: new THREE.SphereGeometry(0.09, 8, 6),
      idle: body(C.shadeBody, 0.3),
      active: body(C.shadeBody, 0.6),
      stunned: body(C.shadeStunned, 0.05),
      rim: new THREE.MeshBasicMaterial({ color: this.colors.shadeRim, side: THREE.BackSide, transparent: true, opacity: 0.55 }),
      eye: new THREE.MeshBasicMaterial({ color: this.colors.shadeEye }),
    };
  }
  private get shadeKit() {
    return (this.shadeKitCache ??= this.makeShadeKit());
  }

  private shadeView(id: string): ShadeView {
    let v = this.shades.get(id);
    if (v) return v;
    const kit = this.shadeKit;
    const group = new THREE.Group();
    const body = new THREE.Mesh(kit.bodyGeo, kit.idle);
    const rim = new THREE.Mesh(kit.rimGeo, kit.rim);
    const eyeMat = kit.eye;
    for (const x of [-0.22, 0.22]) {
      const eye = new THREE.Mesh(kit.eyeGeo, eyeMat);
      eye.position.set(x, 0.15, 0.66);
      body.add(eye);
    }
    group.add(body, rim);
    this.scene.add(group);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.12, 1, 6, 1, true),
      new THREE.MeshBasicMaterial({ color: this.colors.shadeRim, transparent: true, opacity: 0.6, depthWrite: false }),
    );
    beam.visible = false;
    this.scene.add(beam);
    v = { group, body, rim, eyes: eyeMat, beam, phase: idNum(id) * 1.7 };
    this.shades.set(id, v);
    return v;
  }

  private drifterView(id: string): DrifterView {
    let v = this.drifters.get(id);
    if (v) return v;
    const geo = new THREE.PlaneGeometry(3.2, 0.45, 24, 1);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C.drifter, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    this.scene.add(mesh);
    v = { mesh, base: Float32Array.from(geo.attributes.position.array as Float32Array), phase: idNum(id) * 2.3 };
    this.drifters.set(id, v);
    return v;
  }

  private charmView(id: string, pos: Vec3): THREE.Group {
    let g = this.charms.get(id);
    if (g) return g;
    g = new THREE.Group();
    const border = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.02), new THREE.MeshBasicMaterial({ color: C.gold, side: THREE.DoubleSide }));
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshBasicMaterial({ color: C.red, side: THREE.DoubleSide }));
    paper.position.z = 0.01;
    const glow = new THREE.PointLight(C.red, 2, 5, 2);
    g.add(border, paper, glow);
    g.position.set(pos[0], pos[1] + 1.1, pos[2]);
    this.scene.add(g);
    this.charms.set(id, g);
    return g;
  }

  // ------------------------------------------------------------------ events and effects
  showMarker(x: number, y: number, z: number): void {
    this.marker.position.set(x, y + 0.05, z);
    this.marker.material.opacity = 1;
    this.marker.scale.setScalar(1);
  }

  /** PRD v4 §4 "Giảm chuyển động": no flash rings on hits, pulses and lantern changes. */
  reduceMotion = false;

  private burst(at: Vec3, radius: number, color: number, life: number): void {
    if (this.reduceMotion) return;
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(at[0], at[1] + 0.08, at[2]);
    this.scene.add(mesh);
    this.bursts.push({ mesh, age: 0, life, radius });
  }

  onEvents(events: SimEvent[], s: Readonly<SimState>): void {
    for (const e of events) {
      if (e.name === 'pulse') this.burst(s.player.pos, T.pulse_radius, C.moteHalo, 0.45);
      if (e.name === 'player_hit') this.burst(s.player.pos, 2.2, C.danger, 0.35);
      if (e.name === 'drifter_steal') this.burst(s.player.pos, 1.6, C.drifter, 0.35);
      if (e.name === 'refuel') {
        const l = s.lanterns.find((x) => x.id === e.data.lantern_id)!;
        this.burst(l.pos, 2.4, C.lanternCore, 0.5);
      }
      if (e.name === 'lantern_out') {
        const l = s.lanterns.find((x) => x.id === e.data.lantern_id)!;
        this.burst(l.pos, 3.5, C.lanternOff, 0.8);
      }
      if (e.name === 'lantern_lit') {
        const l = s.lanterns.find((x) => x.id === e.data.lantern_id)!;
        this.lanternView(l.id, l.pos).litAt = this.time;
        this.burst(l.pos, T.safe_radius, C.lanternLit, 0.9);
      }
    }
  }

  /** PRD v3 §5.6: switch the shades between the standard and the accessible palette. */
  setColorScheme(colors: ColorScheme): void {
    this.colors = colors;
    const kit = this.shadeKit;
    kit.rim.color.setHex(colors.shadeRim);
    kit.eye.color.setHex(colors.shadeEye);
    for (const m of [kit.idle, kit.active, kit.stunned]) m.emissive.setHex(colors.shadeRim);
    for (const sv of this.shades.values()) {
      sv.beam.material.color.setHex(colors.shadeRim);
    }
  }

  // ------------------------------------------------------------------ per frame
  sync(s: Readonly<SimState>, dt: number): void {
    this.time += dt;
    const t = this.time;
    const lit = s.lanterns.filter((l) => l.lit).length;
    this.ambient.intensity = ambientIntensity(lit, s.lanterns.length);

    // Mây: position, facing, bob, dash trail, invulnerability blink.
    const p = s.player.pos;
    const v = s.player.vel;
    if (Math.hypot(v[0], v[2]) > 0.1) this.facing = Math.atan2(v[0], v[2]);
    this.may.position.set(p[0], p[1], p[2]);
    this.may.rotation.y = this.facing;
    this.may.visible = s.player.respawnTicks === 0 && (s.player.invulnTicks === 0 || Math.floor(t * 12) % 2 === 0);
    this.mayLight.intensity = 4 + s.player.carried * 0.8;
    this.trail.forEach((g, i) => {
      const on = s.player.dashTicks > 0;
      g.material instanceof THREE.MeshBasicMaterial && (g.material.opacity = on ? 0.28 - i * 0.06 : Math.max(0, (g.material.opacity as number) - dt * 2));
      if (on) g.position.set(p[0] - s.player.dashDir[0] * (i + 1) * 0.55, p[1] + 0.55, p[2] - s.player.dashDir[1] * (i + 1) * 0.55);
    });

    // Lanterns.
    for (const l of s.lanterns) {
      const lv = this.lanternView(l.id, l.pos);
      if (lv.shown !== l.deposited) {
        lv.shown = l.deposited;
        lv.progress.geometry.dispose();
        lv.progress.geometry = new THREE.RingGeometry(0.85, 1.05, 40, 1, Math.PI / 2, (TAU * Math.min(l.deposited, T.lantern_cost)) / T.lantern_cost);
      }
      lv.progress.visible = !l.lit && l.deposited > 0;
      const k = l.lit ? Math.min(1, lv.litAt === null ? 1 : (t - lv.litAt) / 0.8) : 0;
      // Low fuel: lantern and bar blink slowly at 1 Hz, in every palette (A44). A weak lantern has no safe zone.
      const weak = isWeakLantern(l);
      const dim = weak && !blinkOn(t) ? 0.3 : 1;
      const fuel = fuelFraction(l);
      lv.light.visible = l.lit;
      lv.light.intensity = k * dim * (6 + 8 * Math.sqrt(fuel) + Math.sin(t * 3 + l.pos[0]) * 1.5);
      lv.shell.material.color.setHex(l.lit ? C.lanternLit : C.lanternOff);
      lv.shell.material.emissiveIntensity = l.lit ? (1.2 + k) * dim : 0.1 + (0.4 * l.deposited) / T.lantern_cost;
      lv.shell.scale.y = 1.25 * (l.lit ? 1 : DARK_SQUASH);
      lv.tear.visible = !l.lit;
      lv.zone.material.opacity = l.lit && !weak ? 0.35 + Math.sin(t * 2) * 0.1 : 0;
      lv.fuelBack.visible = lv.fuelBar.visible = l.lit;
      lv.fuelBar.scale.set(Math.max(0.01, 1.64 * fuel), 0.14, 1);
      lv.fuelBar.material.color.setHex(weak ? (this.colors.warning === '#ffffff' ? 0xffffff : C.danger) : C.lanternCore);
      lv.fuelBar.material.opacity = dim;
      lv.fuelBar.material.transparent = dim < 1;
    }

    // Gameplay fireflies: they circle and bob around their ground point; dropped ones flicker as they fade.
    const motes = s.motes.slice(0, MAX_MOTES);
    const halo = this.moteHalo.geometry.attributes.position as THREE.BufferAttribute;
    motes.forEach((m, i) => {
      const ph = idNum(m.id) * 2.39996;
      const orbit = m.kind === 'dropped' ? 0.15 : 0.35;
      const x = m.pos[0] + Math.cos(t * 1.3 + ph) * orbit;
      const z = m.pos[2] + Math.sin(t * 1.7 + ph) * orbit;
      const y = m.pos[1] + 0.7 + Math.sin(t * 2.4 + ph) * 0.18;
      const blink = m.kind === 'dropped' && (m.ttlTicks ?? 0) < 120 ? (Math.sin(t * 20) > 0 ? 1 : 0.3) : 1;
      tmpM.compose(tmpV.set(x, y, z), tmpQ.identity(), tmpS.setScalar(blink));
      this.moteCores.setMatrixAt(i, tmpM);
      halo.setXYZ(i, x, y, z);
    });
    this.moteCores.count = motes.length;
    this.moteCores.instanceMatrix.needsUpdate = true;
    halo.needsUpdate = true;
    this.moteHalo.geometry.setDrawRange(0, motes.length);

    // Ambient fireflies wander on slow sine flows and are drawn towards lit lanterns.
    const fp = this.flies.geometry.attributes.position as THREE.BufferAttribute;
    const litL = s.lanterns.filter((l) => l.lit);
    for (let i = 0; i < AMBIENT_FLIES; i++) {
      const bx = this.flySeeds[i * 4];
      const bz = this.flySeeds[i * 4 + 1];
      const ph = this.flySeeds[i * 4 + 2];
      const h = this.flySeeds[i * 4 + 3];
      let x = bx + Math.sin(t * 0.21 + ph) * 3 + Math.sin(t * 0.53 + ph * 2) * 1.2;
      let z = bz + Math.cos(t * 0.17 + ph) * 3 + Math.cos(t * 0.61 + ph * 3) * 1.2;
      if (litL.length && i % 3 === 0) {
        const l = litL[i % litL.length];
        x = l.pos[0] + Math.cos(t * 0.6 + ph) * (2 + (i % 5));
        z = l.pos[2] + Math.sin(t * 0.6 + ph) * (2 + (i % 5));
      }
      const g = this.def.terrain.highest(x, z);
      fp.setXYZ(i, x, (Number.isFinite(g) ? g : 0) + h + Math.sin(t * 1.9 + ph) * 0.3, z);
    }
    fp.needsUpdate = true;
    (this.flies.material as THREE.PointsMaterial).opacity = 0.55 + 0.35 * Math.sin(t * 0.9);

    // Trees sway a little.
    for (const c of this.canopies) {
      c.base.forEach((b, i) => {
        tmpM.copy(b).multiply(new THREE.Matrix4().makeRotationZ(Math.sin(t * 0.9 + c.phase[i]) * 0.04));
        c.mesh.setMatrixAt(i, tmpM);
      });
      c.mesh.instanceMatrix.needsUpdate = true;
    }

    // Shades.
    for (const sh of s.shades) {
      const sv = this.shadeView(sh.id);
      const wob = Math.sin(t * 3 + sv.phase) * 0.12;
      sv.group.position.set(sh.pos[0], sh.pos[1] + wob, sh.pos[2]);
      sv.group.lookAt(p[0], sh.pos[1], p[2]);
      const grow = sh.state === 'spawning' ? 1 - sh.stateTicks / 60 : 1;
      sv.group.scale.set(grow * (1 + wob * 0.4), grow * (1.15 - wob * 0.4), grow);
      const kit = this.shadeKit;
      sv.body.material = sh.state === 'stunned' ? kit.stunned : sh.state === 'chase' || sh.state === 'drain' ? kit.active : kit.idle;
      // Draining: a pulsing beam from the shade up to the lantern's paper shell.
      const target = sh.state === 'drain' ? s.lanterns.find((l) => l.id === sh.targetLanternId) : undefined;
      sv.beam.visible = !!target;
      if (target) {
        const from = tmpV.set(sh.pos[0], sh.pos[1] + wob, sh.pos[2]);
        const to = new THREE.Vector3(target.pos[0] + 0.9, target.pos[1] + 3.1, target.pos[2]);
        const dir = to.clone().sub(from);
        sv.beam.position.copy(from).addScaledVector(dir, 0.5);
        sv.beam.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
        sv.beam.scale.set(1, dir.length(), 1);
        sv.beam.material.opacity = 0.35 + 0.3 * Math.abs(Math.sin(t * 6 + sv.phase));
      }
    }

    // Drifters: silk ribbons rippling in the wind.
    for (const d of s.drifters) {
      const dv = this.drifterView(d.id);
      dv.mesh.visible = d.state !== 'removed';
      if (!dv.mesh.visible) continue;
      const pos = dv.mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const bx = dv.base[i * 3];
        pos.setY(i, dv.base[i * 3 + 1] + Math.sin(bx * 2.2 - t * 6 + dv.phase) * 0.25);
        pos.setZ(i, Math.cos(bx * 1.6 - t * 4 + dv.phase) * 0.3);
      }
      pos.needsUpdate = true;
      dv.mesh.position.set(d.pos[0], d.pos[1] + 0.4, d.pos[2]);
      dv.mesh.lookAt(p[0], d.pos[1] + 0.4, p[2]);
      dv.mesh.rotateY(Math.PI / 2);
      dv.mesh.material.opacity = d.state === 'flee' ? 0.45 : 0.85;
    }

    // Charms bob and spin while available.
    for (const c of s.charms) {
      const g = this.charmView(c.id, c.pos);
      g.visible = c.available;
      g.rotation.y = t * 1.5;
      g.position.y = c.pos[1] + 1.1 + Math.sin(t * 2) * 0.15;
    }

    for (const pad of this.pads) {
      const k = (t * 0.8) % 1;
      pad.scale.setScalar(0.8 + k * 0.6);
      pad.material instanceof THREE.MeshBasicMaterial && (pad.material.opacity = 1 - k);
    }

    // Wind: leaves stream across during a gust and start to flutter during the 2 s warning.
    const phase = s.simTick % WIND_EVERY_TICKS;
    const warning = s.night === 3 && s.simTick >= WIND_EVERY_TICKS - WIND_WARN_TICKS && phase >= WIND_EVERY_TICKS - WIND_WARN_TICKS;
    this.leaves.visible = s.wind.active || warning;
    if (this.leaves.visible) {
      const a = (s.wind.active ? s.wind.dirDeg : (t * 40) % 360) * (Math.PI / 180);
      const lp = this.leaves.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < LEAVES; i++) {
        const u = this.leafSeeds[i * 3];
        const w = this.leafSeeds[i * 3 + 1];
        const k = (this.leafSeeds[i * 3 + 2] + t * (s.wind.active ? 0.35 : 0.12)) % 1;
        const along = (k - 0.5) * 40;
        lp.setXYZ(i, p[0] + Math.cos(a) * along - Math.sin(a) * w * 14, p[1] + 1 + u * 3 + Math.sin(t * 5 + i) * 0.3, p[2] + Math.sin(a) * along + Math.cos(a) * w * 14);
      }
      lp.needsUpdate = true;
    }

    // Effects.
    this.marker.material.opacity = Math.max(0, this.marker.material.opacity - dt * 1.8);
    this.marker.scale.setScalar(1 + (1 - this.marker.material.opacity) * 0.6);
    this.bursts = this.bursts.filter((b) => {
      b.age += dt;
      const k = b.age / b.life;
      b.mesh.scale.setScalar(Math.max(0.01, k * b.radius));
      b.mesh.material.opacity = 0.9 * (1 - k);
      if (k < 1) return true;
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
      return false;
    });
  }

  dispose(): void {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
  }
}
