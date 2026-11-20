import { distXZ } from '../geometry';
import { CHARM_RESPAWN_TICKS, CHARM_TICKS, PICKUP_HEIGHT } from '../world';
import type { SimState, Vec3 } from '../types';
import type { StepCtx } from './context';

/** Pickup rule shared by motes and charms: XZ ≤ pickup_radius and feet within 1.5 m of the ground point. */
const reachable = (feet: Vec3, at: Vec3, r: number) => distXZ(feet, at) <= r && Math.abs(feet[1] - at[1]) <= PICKUP_HEIGHT;

/** Step 4: automatic pickup of motes (list order, up to carry_capacity) and charms. */
export function pickUp(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  if (p.respawnTicks > 0) return;
  const { pickup_radius, carry_capacity } = ctx.tuning;

  s.motes = s.motes.filter((m) => {
    if (p.carried >= carry_capacity || m.pickableFrom > s.simTick || !reachable(p.pos, m.pos, pickup_radius)) return true;
    p.carried += 1;
    ctx.emit({ name: 'mote_picked', data: { carried: p.carried } });
    return false;
  });

  for (const c of s.charms) {
    if (!c.available || !reachable(p.pos, c.pos, pickup_radius)) continue;
    c.available = false;
    c.respawnTicks = CHARM_RESPAWN_TICKS;
    p.charmTicks = CHARM_TICKS;
    ctx.emit({ name: 'charm_picked', data: { charm_id: c.id, charm_ticks: CHARM_TICKS } });
  }
}
