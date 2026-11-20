// Standard maps (PRD v2 §4). Angles are measured from +X towards +Z: (r·cosθ, r·sinθ).
import { Terrain, type Column } from './terrain';
import type { NightId, Tuning, Vec3 } from './types';

export interface BouncePad {
  pos: Vec3;
  r: number;
  vy: number;
  speed: number;
  /** Fixed launch direction (unit XZ), or a point to aim at. */
  dir?: [number, number];
  aimAt?: [number, number];
}

export interface NightDef {
  id: NightId;
  durationS: number;
  start: Vec3;
  startFacing: [number, number];
  terrain: Terrain;
  lanterns: Vec3[];
  motePoints: Vec3[];
  shadePoints: Vec3[];
  shadeEveryTicks: number;
  shadeMax: number;
  shadeSpeed: number;
  pads: BouncePad[];
  charms: { id: string; pos: Vec3 }[];
  drifters: boolean;
  wind: boolean;
}

const ring = (cx: number, cz: number, r: number, count: number, fromDeg: number, stepDeg: number): [number, number][] =>
  Array.from({ length: count }, (_, i) => {
    const t = ((fromDeg + i * stepDeg) * Math.PI) / 180;
    return [cx + r * Math.cos(t), cz + r * Math.sin(t)];
  });

/** Puts XZ points on the ground of the given terrain. */
const onGround = (terrain: Terrain, pts: [number, number][], lift = 0): Vec3[] =>
  pts.map(([x, z]) => [x, terrain.highest(x, z) + lift, z]);

function night1(t: Tuning): NightDef {
  const terrain = new Terrain([{ kind: 'disk', cx: 0, cz: 0, r: 40, top: 0 }]);
  return {
    id: 1,
    durationS: t.night1_duration_s,
    start: [0, 0, 0],
    startFacing: [0, 1],
    terrain,
    lanterns: [
      [0, 0, 25],
      [23.8, 0, 7.7],
      [14.7, 0, -20.2],
      [-14.7, 0, -20.2],
      [-23.8, 0, 7.7],
    ],
    motePoints: onGround(terrain, [...ring(0, 0, 12, 8, 0, 45), ...ring(0, 0, 33, 16, 0, 22.5)]),
    shadePoints: onGround(terrain, ring(0, 0, 37, 12, 15, 30)),
    shadeEveryTicks: 480,
    shadeMax: 6,
    shadeSpeed: t.shade_speed,
    pads: [],
    charms: [],
    drifters: false,
    wind: false,
  };
}

function night2(t: Tuning): NightDef {
  const terrain = new Terrain([
    { kind: 'disk', cx: 0, cz: 0, r: 28, top: 0 },
    { kind: 'disk', cx: 70, cz: 0, r: 28, top: 0 },
    { kind: 'rect', x0: 26, x1: 44, z0: -2, z1: 2, top: 0 },
  ]);
  const islandMotes = (cx: number) => [...ring(cx, 0, 10, 4, 0, 90), ...ring(cx, 0, 22, 8, 0, 45)];
  return {
    id: 2,
    durationS: t.night2_duration_s,
    start: [0, 0, 0],
    startFacing: [0, 1],
    terrain,
    lanterns: [
      [0, 0, 20],
      [17, 0, -10],
      [-17, 0, -10],
      [70, 0, 20],
      [87, 0, -10],
      [53, 0, -10],
    ],
    motePoints: onGround(terrain, [...islandMotes(0), ...islandMotes(70)]),
    shadePoints: onGround(terrain, [...ring(0, 0, 26, 8, 22.5, 45), ...ring(70, 0, 26, 8, 22.5, 45)]),
    shadeEveryTicks: 420,
    shadeMax: 8,
    shadeSpeed: t.shade_speed,
    pads: [
      { pos: [20, 0, 18], r: 1, vy: 14, speed: 24, aimAt: [70, 0] },
      { pos: [50, 0, -18], r: 1, vy: 14, speed: 24, aimAt: [0, 0] },
    ],
    charms: [{ id: 'C1', pos: [35, 0, 0] }],
    drifters: true,
    wind: false,
  };
}

/** A24 / PRD §10 Q1: Night 3 shades are faster than the shared tuning value. */
const NIGHT3_SHADE_SPEED = 4.5;

function night3(t: Tuning): NightDef {
  const columns: Column[] = [
    { kind: 'disk', cx: 0, cz: 0, r: 45, top: 0 },
    { kind: 'half-ring', r0: 12, r1: 24, top: 3 },
    { kind: 'ramp', angleDeg: 30, sFoot: 30, sTop: 24, halfWidth: 1.5, rise: 3 },
    { kind: 'ramp', angleDeg: 150, sFoot: 30, sTop: 24, halfWidth: 1.5, rise: 3 },
    { kind: 'disk', cx: 0, cz: 0, r: 8, top: 6 },
    { kind: 'disk', cx: 0, cz: 0, r: 2, top: 14, obstacle: true },
  ];
  const terrain = new Terrain(columns);
  return {
    id: 3,
    durationS: t.night3_duration_s,
    // A29: (0,0,0) is inside the bell tower, so Night 3 starts on tier 0 south of it.
    start: [0, 0, -30],
    startFacing: [0, 1],
    terrain,
    lanterns: [
      [0, 6, 6],
      [18, 3, 10],
      [-18, 3, 10],
      [35, 0, -10],
      [-35, 0, -10],
      [20, 0, -35],
      [-20, 0, -35],
    ],
    motePoints: onGround(terrain, [...ring(0, 0, 34, 18, 0, 20), ...ring(0, 0, 18, 8, 20, 20), ...ring(0, 0, 5, 4, 45, 90)]),
    shadePoints: onGround(terrain, ring(0, 0, 43, 16, 0, 22.5)),
    shadeEveryTicks: 360,
    shadeMax: 10,
    shadeSpeed: NIGHT3_SHADE_SPEED,
    pads: [{ pos: [0, 3, 13], r: 1, vy: 12, speed: 8, dir: [0, -1] }],
    charms: [
      { id: 'C1', pos: [30, 0, 25] },
      { id: 'C2', pos: [-30, 0, 25] },
    ],
    drifters: true,
    wind: true,
  };
}

export function nightDef(id: NightId, t: Tuning): NightDef {
  return id === 1 ? night1(t) : id === 2 ? night2(t) : night3(t);
}
