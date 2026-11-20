import { distXZ } from '../geometry';
import type { SimState } from '../types';
import type { StepCtx } from './context';

/** On an interact edge: deposit into the nearest unlit lantern within interact_radius. */
export function interactWithLantern(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  if (!ctx.edges.interact || p.carried <= 0) return;
  const { interact_radius, lantern_cost, score } = ctx.tuning;

  let target = null;
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
  ctx.emit({ name: 'deposit', data: { lantern_id: target.id, amount, deposited: target.deposited } });
  if (target.deposited >= lantern_cost) {
    target.lit = true;
    s.score += score.per_lantern;
    ctx.emit({ name: 'lantern_lit', data: { lantern_id: target.id } });
  }
}
