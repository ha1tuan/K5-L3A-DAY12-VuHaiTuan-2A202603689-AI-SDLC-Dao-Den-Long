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

/** Keeps a point inside the disk of radius r centred at the origin (XZ). */
export function clampToDisk(p: Vec3, r: number): void {
  const d = Math.hypot(p[0], p[2]);
  if (d > r) {
    p[0] = (p[0] / d) * r;
    p[2] = (p[2] / d) * r;
  }
}

/** Unit XZ direction from a to b; +X when the points coincide. */
export function dirXZ(a: Vec3, b: Vec3): [number, number] {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const d = Math.hypot(dx, dz);
  return d === 0 ? [1, 0] : [dx / d, dz / d];
}
