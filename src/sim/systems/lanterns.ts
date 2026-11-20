import { distXZ, dirXZ } from '../geometry';
import { SAFE_PUSH_PER_TICK } from '../world';
import type { Lantern, SimState, Vec3 } from '../types';
import type { StepCtx } from './context';

/** Step 5: on an interact edge, deposit min(carried, missing) into the nearest unlit lantern (ties → lower id). */
export function interactWithLantern(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  if (!ctx.edges.interact || p.carried <= 0 || p.respawnTicks > 0) return;
  const { interact_radius, lantern_cost, score } = ctx.tuning;

  let target: Lantern | null = null;
  let best = Infinity;
  for (const l of s.lanterns) {
    const d = distXZ(p.pos, l.pos);
    if (!l.lit && d <= interact_radius && d < best) {
      best = d;
      target = l;
    }
  }
  if (!target) return;

  const amount = Math.min(p.carried, lantern_cost - target.deposited);
  if (amount <= 0) return;
  p.carried -= amount;
  target.deposited += amount;
  s.score += score.per_mote * amount;
  ctx.emit({ name: 'deposit', data: { lantern_id: target.id, amount, deposited: target.deposited } });
  if (target.deposited >= lantern_cost) {
    target.lit = true;
    s.score += score.per_lantern;
    ctx.emit({ name: 'lantern_lit', data: { lantern_id: target.id } });
  }
}

/** The lit lantern whose safe zone strictly contains p, if any. */
export function safeZoneAt(s: SimState, p: Vec3, r: number): Lantern | null {
  for (const l of s.lanterns) if (l.lit && distXZ(p, l.pos) < r - 1e-9) return l;
  return null;
}

/** Step 6 (A23): shades caught inside a lit lantern's zone drift out to its rim, 0.2 m per tick. */
export function updateSafeZones(s: SimState, ctx: StepCtx): void {
  const r = ctx.tuning.safe_radius;
  for (const sh of s.shades) {
    const l = safeZoneAt(s, sh.pos, r);
    if (!l) continue;
    const [dx, dz] = dirXZ(l.pos, sh.pos);
    const step = Math.min(SAFE_PUSH_PER_TICK, r - distXZ(sh.pos, l.pos));
    sh.pos[0] += dx * step;
    sh.pos[2] += dz * step;
  }
}
