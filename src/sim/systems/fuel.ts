import { fuelUnitsPerTick, TICKS_PER_SECOND } from '../tuning';
import { FUEL_DRAIN_EVERY_TICKS } from '../world';
import type { Shade, SimState } from '../types';
import type { StepCtx } from './context';

/** A shade stops draining and wanders off. */
export function stopDraining(sh: Shade): void {
  sh.state = 'wander';
  sh.targetLanternId = null;
  sh.drainTicks = 0;
  sh.wanderTarget = null;
  sh.wanderTicks = 0;
}

/**
 * Step 2b (ADR-0003): every lit lantern burns its fuel and loses drain_per_s per tick to each shade
 * draining it (states as of the end of the previous tick). A lantern that runs dry goes out at once.
 */
export function burnFuel(s: SimState, ctx: StepCtx): void {
  const burn = fuelUnitsPerTick(ctx.tuning.fuel_decay_per_s);
  const drain = fuelUnitsPerTick(ctx.tuning.drain_per_s);
  for (const l of s.lanterns) {
    if (!l.lit) continue;
    const drainers = s.shades.filter((sh) => sh.state === 'drain' && sh.targetLanternId === l.id);
    l.fuelTicks = Math.max(0, l.fuelTicks - burn - drain * drainers.length);
    for (const sh of drainers) {
      sh.drainTicks += 1;
      if (sh.drainTicks % FUEL_DRAIN_EVERY_TICKS === 0)
        ctx.emit({ name: 'fuel_drain', data: { lantern_id: l.id, shade_id: sh.id, fuel: l.fuelTicks / TICKS_PER_SECOND } });
    }
    if (l.fuelTicks > 0) continue;
    l.lit = false;
    l.deposited = 0;
    l.everLit = true;
    ctx.emit({ name: 'lantern_out', data: { lantern_id: l.id } });
    for (const sh of drainers) stopDraining(sh);
  }
}
