// Internal terrain module (A20): the map is a set of solid columns, each with a top surface.
// Mây stands on the highest top that is not more than STEP_UP above the feet; a taller top is a cliff.
import { STEP_UP } from './world';

export type Column =
  | { kind: 'disk'; cx: number; cz: number; r: number; top: number; obstacle?: boolean }
  /** Annulus r0..r1 around the origin, only where z > 0. */
  | { kind: 'half-ring'; r0: number; r1: number; top: number }
  | { kind: 'rect'; x0: number; x1: number; z0: number; z1: number; top: number }
  /** Straight ramp along the radial direction at angleDeg: s in [sLow..sHigh] rises from 0 to rise. */
  | { kind: 'ramp'; angleDeg: number; sFoot: number; sTop: number; halfWidth: number; rise: number };

/** Top of the column at (x, z), or null when the column does not cover that point. */
function topAt(c: Column, x: number, z: number): number | null {
  switch (c.kind) {
    case 'disk':
      return Math.hypot(x - c.cx, z - c.cz) <= c.r ? c.top : null;
    case 'half-ring': {
      const r = Math.hypot(x, z);
      return z > 0 && r >= c.r0 && r <= c.r1 ? c.top : null;
    }
    case 'rect':
      return x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1 ? c.top : null;
    case 'ramp': {
      const t = (c.angleDeg * Math.PI) / 180;
      const ux = Math.cos(t);
      const uz = Math.sin(t);
      const s = x * ux + z * uz;
      const lateral = -x * uz + z * ux;
      const lo = Math.min(c.sFoot, c.sTop);
      const hi = Math.max(c.sFoot, c.sTop);
      if (s < lo || s > hi || Math.abs(lateral) > c.halfWidth) return null;
      return (c.rise * (s - c.sFoot)) / (c.sTop - c.sFoot);
    }
  }
}

export class Terrain {
  constructor(readonly columns: Column[]) {}

  private tops(x: number, z: number): number[] {
    const out: number[] = [];
    for (const c of this.columns) {
      const t = topAt(c, x, z);
      if (t !== null) out.push(t);
    }
    return out;
  }

  /** Ground under feet at height y: highest top ≤ y + STEP_UP, or -Infinity over the sea of clouds. */
  groundUnder(x: number, z: number, y: number): number {
    let g = -Infinity;
    for (const t of this.tops(x, z)) if (t <= y + STEP_UP + 1e-9 && t > g) g = t;
    return g;
  }

  /** Highest top at (x, z), ignoring the feet; -Infinity over the sea of clouds. */
  highest(x: number, z: number): number {
    let g = -Infinity;
    for (const t of this.tops(x, z)) if (t > g) g = t;
    return g;
  }

  /** A cliff or obstacle taller than a step blocks feet at height y from entering (x, z). */
  blocksFeet(x: number, z: number, y: number): boolean {
    return this.tops(x, z).some((t) => t > y + STEP_UP + 1e-9);
  }

  /** Hovering creatures (A21) stay over land and outside obstacles such as the bell tower. */
  blocksHover(x: number, z: number): boolean {
    let land = false;
    for (const c of this.columns) {
      if (topAt(c, x, z) === null) continue;
      if (c.kind === 'disk' && c.obstacle) return true;
      land = true;
    }
    return !land;
  }
}
