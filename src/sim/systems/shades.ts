import { dirXZ, distXZ } from '../geometry';
import { DT } from '../tuning';
import type { SimState, Vec3 } from '../types';
import type { StepCtx } from './context';

/** Places p on the rim of the circle (centre c, radius r) if it is strictly inside. */
function pushOutOf(p: Vec3, c: Vec3, r: number): void {
  if (distXZ(p, c) >= r) return;
  const [dx, dz] = dirXZ(c, p);
  p[0] = c[0] + dx * r;
  p[2] = c[2] + dz * r;
}

/** Chasing shades move straight at Mây; no shade may stay inside a lit lantern's safe_radius. */
export function moveShades(s: SimState, ctx: StepCtx): void {
  const { shade_speed, safe_radius } = ctx.tuning;
  const target = s.player.pos;
  for (const sh of s.shades) {
    if (sh.state === 'chase') {
      const d = distXZ(sh.pos, target);
      const stepLen = Math.min(shade_speed * DT, d);
      if (stepLen > 0) {
        const [dx, dz] = dirXZ(sh.pos, target);
        sh.pos[0] += dx * stepLen;
        sh.pos[2] += dz * stepLen;
      }
    }
    for (const l of s.lanterns) if (l.lit) pushOutOf(sh.pos, l.pos, safe_radius);
  }
}
