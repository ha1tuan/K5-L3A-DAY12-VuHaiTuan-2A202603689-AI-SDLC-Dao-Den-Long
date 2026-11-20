import { within } from '../geometry';
import type { SimState } from '../types';
import type { StepCtx } from './context';

/** Automatic pickup within pickup_radius, in list order, until carry_capacity. */
export function pickUpMotes(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  const { pickup_radius, carry_capacity, score } = ctx.tuning;
  s.motes = s.motes.filter((m) => {
    if (p.carried >= carry_capacity || !within(p.pos, m.pos, pickup_radius)) return true;
    p.carried += 1;
    s.score += score.per_mote;
    ctx.emit({ name: 'mote_picked', data: { carried: p.carried } });
    return false;
  });
}
