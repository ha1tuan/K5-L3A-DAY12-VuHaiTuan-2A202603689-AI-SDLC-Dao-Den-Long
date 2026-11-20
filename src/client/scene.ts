import * as THREE from 'three';
import { CONTRACT_TUNING, ISLAND_RADIUS, type SimEvent, type SimState } from '../sim';

const C = {
  night: 0x161b3d,
  mist: 0x3a2b5e,
  ground: 0x34406e,
  groundLit: 0x6a6450,
  amber: 0xf4a63a,
  silk: 0xc8432f,
  ink: 0x1c1030,
  violet: 0x8a4fd0,
  straw: 0xe2c27a,
  tunic: 0x2f5d7c,
};

const T = CONTRACT_TUNING;

interface LanternView {
  group: THREE.Group;
  body: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  light: THREE.PointLight;
  halo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  litAt: number | null;
}

interface Burst {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  age: number;
  life: number;
  radius: number;
}

/** Builds the island and keeps meshes in sync with a read-only sim state. Never writes to the sim. */
export class IslandScene {
  readonly scene = new THREE.Scene();
  readonly ground: THREE.Mesh;
  private hemi: THREE.HemisphereLight;
  private groundMat: THREE.MeshStandardMaterial;
  private lanterns = new Map<string, LanternView>();
  private motes = new Map<string, THREE.Mesh>();
  private shades = new Map<string, THREE.Group>();
  private bursts: Burst[] = [];
  private may: THREE.Group;
  private mayLight: THREE.PointLight;
  private marker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private facing = 0;
  private time = 0;

  private moteGeo = new THREE.SphereGeometry(0.18, 10, 8);
  private moteMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });

  constructor() {
    const s = this.scene;
    s.background = new THREE.Color(C.night);
    s.fog = new THREE.Fog(C.night, 55, 130);

    this.hemi = new THREE.HemisphereLight(0x8a92d8, 0x2a2048, 1.4);
    s.add(this.hemi);
    const moon = new THREE.DirectionalLight(0xc8d2ff, 1.1);
    moon.position.set(-30, 50, 20);
    s.add(moon);

    // Sea of clouds below the island.
    const sea = new THREE.Mesh(
      new THREE.CircleGeometry(220, 64),
      new THREE.MeshBasicMaterial({ color: 0x2a2150 }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -4;
    s.add(sea);

    this.groundMat = new THREE.MeshStandardMaterial({ color: C.ground, roughness: 0.95 });
    this.ground = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS - 3, 4, 72), this.groundMat);
    this.ground.position.y = -2;
    s.add(this.ground);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(ISLAND_RADIUS, 0.12, 6, 96),
      new THREE.MeshBasicMaterial({ color: 0x4b5a8a }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.02;
    s.add(rim);

    this.may = this.buildMay();
    this.mayLight = new THREE.PointLight(C.amber, 6, 9, 1.6);
    this.mayLight.position.set(0, 1.6, 0);
    this.may.add(this.mayLight);
    s.add(this.may);

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.5, 32),
      new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0 }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.03;
    s.add(this.marker);
  }

  private buildMay(): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.45, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: C.tunic, roughness: 0.8 }),
    );
    body.position.y = 0.55;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xe8c39e, roughness: 0.7 }),
    );
    head.position.y = 1.35;
    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 0.45, 24),
      new THREE.MeshStandardMaterial({ color: C.straw, roughness: 0.9 }),
    );
    hat.position.y = 1.72;
    // A small lantern hanging from the front of the brim.
    const string = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4),
      new THREE.MeshBasicMaterial({ color: 0x5a4630 }),
    );
    string.position.set(0, 1.38, 0.62);
    const tiny = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      new THREE.MeshStandardMaterial({ color: C.silk, emissive: C.amber, emissiveIntensity: 1.6 }),
    );
    tiny.scale.y = 1.3;
    tiny.position.set(0, 1.15, 0.62);
    g.add(body, head, hat, string, tiny);
    return g;
  }

  private buildLantern(): LanternView {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b2a22, roughness: 0.9 }),
    );
    pole.position.y = 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), pole.material);
    arm.position.set(0.55, 3.9, 0);
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 20, 14),
      new THREE.MeshStandardMaterial({ color: C.silk, emissive: C.amber, emissiveIntensity: 0, roughness: 0.6 }),
    );
    body.scale.y = 1.25;
    body.position.set(1.1, 3.05, 0);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x2a1d16 });
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.14, 12), capMat);
    capTop.position.set(1.1, 3.82, 0);
    const capBottom = capTop.clone();
    capBottom.position.y = 2.28;
    const light = new THREE.PointLight(C.amber, 0, 22, 1.4);
    light.position.copy(body.position);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(T.safe_radius - 0.12, T.safe_radius, 64),
      new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0 }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.04;
    group.add(pole, arm, body, capTop, capBottom, light, halo);
    this.scene.add(group);
    return { group, body, light, halo, litAt: null };
  }

  private buildShade(): THREE.Group {
    const g = new THREE.Group();
    const blob = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.8, 1),
      new THREE.MeshStandardMaterial({ color: C.ink, emissive: C.violet, emissiveIntensity: 0.25, flatShading: true, transparent: true }),
    );
    blob.scale.set(1, 0.85, 1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd9b8ff });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeMat);
    eyeL.position.set(-0.25, 0.15, 0.68);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.25;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), blob.material);
      t.position.set(Math.sin(a) * 0.45, -0.75, Math.cos(a) * 0.45);
      t.rotation.x = Math.PI;
      g.add(t);
    }
    g.add(blob, eyeL, eyeR);
    g.userData.blob = blob;
    this.scene.add(g);
    return g;
  }

  showMarker(x: number, z: number): void {
    this.marker.position.x = x;
    this.marker.position.z = z;
    this.marker.material.opacity = 0.9;
  }

  private burst(x: number, z: number, radius: number, color: number, life: number): void {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.08, z);
    this.scene.add(mesh);
    this.bursts.push({ mesh, age: 0, life, radius });
  }

  /** React to sim events with one-shot effects. */
  onEvents(events: SimEvent[], s: Readonly<SimState>): void {
    for (const e of events) {
      if (e.name === 'pulse') this.burst(s.player.pos[0], s.player.pos[2], T.pulse_radius, 0xffd27a, 0.45);
      if (e.name === 'lantern_lit') {
        const l = s.lanterns.find((x) => x.id === e.data.lantern_id);
        if (l) this.burst(l.pos[0], l.pos[2], T.safe_radius, C.amber, 0.9);
      }
    }
  }

  sync(s: Readonly<SimState>, dt: number): void {
    this.time += dt;
    const t = this.time;

    // Island brightens as lanterns are lit.
    const litCount = s.lanterns.filter((l) => l.lit).length;
    const glow = litCount / Math.max(1, s.lanterns.length);
    this.hemi.intensity = 1.4 + glow * 1.4;
    this.groundMat.color.setHex(C.ground).lerp(new THREE.Color(C.groundLit), glow);

    // Mây
    const p = s.player.pos;
    const prevX = this.may.position.x;
    const prevZ = this.may.position.z;
    this.may.position.set(p[0], p[1], p[2]);
    const mx = p[0] - prevX;
    const mz = p[2] - prevZ;
    if (mx * mx + mz * mz > 1e-6) this.facing = Math.atan2(mx, mz);
    this.may.rotation.y += (this.facing - this.may.rotation.y) * Math.min(1, dt * 14);
    this.may.visible = s.player.invulnTicks === 0 || Math.floor(t * 12) % 2 === 0;
    this.mayLight.intensity = 4 + s.player.carried * 1.2;

    if (this.marker.material.opacity > 0) this.marker.material.opacity = Math.max(0, this.marker.material.opacity - dt * 1.5);

    // Lanterns
    for (const l of s.lanterns) {
      let v = this.lanterns.get(l.id);
      if (!v) this.lanterns.set(l.id, (v = this.buildLantern()));
      v.group.position.set(l.pos[0], 0, l.pos[2]);
      const fill = l.lit ? 1 : l.deposited / T.lantern_cost;
      const flicker = l.lit ? 0.08 * Math.sin(t * 7 + l.pos[0]) : 0;
      v.body.material.emissiveIntensity = l.lit ? 1.8 + flicker : fill * 0.6;
      // Unlit lanterns get no point light at all: every light costs a pass over each pixel.
      v.light.visible = l.lit;
      v.light.intensity = 40 + flicker * 60;
      v.halo.material.opacity = l.lit ? 0.35 : 0;
    }

    // Motes
    const seen = new Set<string>();
    for (const m of s.motes) {
      seen.add(m.id);
      let mesh = this.motes.get(m.id);
      if (!mesh) {
        mesh = new THREE.Mesh(this.moteGeo, this.moteMat);
        this.scene.add(mesh);
        this.motes.set(m.id, mesh);
      }
      const phase = m.id.length * 1.7 + m.pos[0];
      mesh.position.set(m.pos[0], 0.7 + Math.sin(t * 2.4 + phase) * 0.18, m.pos[2]);
    }
    for (const [id, mesh] of this.motes) {
      if (!seen.has(id)) {
        this.scene.remove(mesh);
        this.motes.delete(id);
      }
    }

    // Shades
    const live = new Set<string>();
    for (const sh of s.shades) {
      live.add(sh.id);
      let g = this.shades.get(sh.id);
      if (!g) this.shades.set(sh.id, (g = this.buildShade()));
      g.position.set(sh.pos[0], 1 + Math.sin(t * 3 + sh.pos[2]) * 0.15, sh.pos[2]);
      g.lookAt(p[0], g.position.y, p[2]);
      const mat = (g.userData.blob as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material;
      const stunned = sh.state === 'stunned';
      mat.opacity = stunned ? 0.45 : 1;
      mat.emissiveIntensity = stunned ? 0.05 : 0.25 + 0.1 * Math.sin(t * 5);
      if (stunned) g.rotation.y += t;
    }
    for (const [id, g] of this.shades) {
      if (!live.has(id)) {
        this.scene.remove(g);
        this.shades.delete(id);
      }
    }

    // One-shot rings
    this.bursts = this.bursts.filter((b) => {
      b.age += dt;
      const k = Math.min(1, b.age / b.life);
      const r = 0.5 + (b.radius - 0.5) * (1 - (1 - k) ** 3);
      b.mesh.scale.setScalar(r);
      b.mesh.material.opacity = 0.85 * (1 - k);
      if (k >= 1) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        return false;
      }
      return true;
    });
  }
}
