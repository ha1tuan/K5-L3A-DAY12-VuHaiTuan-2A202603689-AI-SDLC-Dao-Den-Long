import type { Vec3 } from './types';

/** Horizontal (XZ-plane) distance; Y is ignored per the contract. */
export const distXZ = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[2] - b[2]);

export const within = (a: Vec3, b: Vec3, r: number): boolean => distXZ(a, b) <= r;

/** Scales [x, z] down to length 1 when longer than 1. */
export function clampLength1(v: [number, number]): [number, number] {
  const len = Math.hypot(v[0], v[1]);
  return len > 1 ? [v[0] / len, v[1] / len] : [v[0], v[1]];
}

/** Contract §C: x' = x·cosθ + z·sinθ, z' = −x·sinθ + z·cosθ. */
export function rotateYaw(v: [number, number], yawDeg: number): [number, number] {
  const t = (yawDeg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [v[0] * c + v[1] * s, -v[0] * s + v[1] * c];
}


/** Unit XZ direction from a to b; +X when the points coincide. */
export function dirXZ(a: Vec3, b: Vec3): [number, number] {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const d = Math.hypot(dx, dz);
  return d === 0 ? [1, 0] : [dx / d, dz / d];
}

export const dist3 = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Unit vector of [x, z], or null for a zero vector. */
export function unit2(v: [number, number]): [number, number] | null {
  const len = Math.hypot(v[0], v[1]);
  return len < 1e-9 ? null : [v[0] / len, v[1] / len];
}

/** Places p on the rim of the circle (centre c, radius r) if it is strictly inside. */
export function pushOutOf(p: Vec3, c: Vec3, r: number): void {
  if (distXZ(p, c) >= r) return;
  const [dx, dz] = dirXZ(c, p);
  p[0] = c[0] + dx * r;
  p[2] = c[2] + dz * r;
}

/** Orders ids like S2 < S10 (numeric part), falling back to plain string order. */
export const byId = (a: { id: string }, b: { id: string }): number =>
  a.id.localeCompare(b.id, 'en', { numeric: true });
