import { fuelUnitsPerTick } from '../tuning';
import type { SimState } from '../types';
import type { StepCtx } from './context';

/** Step 2b (ADR-0003): every lit lantern burns its fuel; one that runs dry goes out at once. */
export function burnFuel(s: SimState, ctx: StepCtx): void {
  const burn = fuelUnitsPerTick(ctx.tuning.fuel_decay_per_s);
  for (const l of s.lanterns) {
    if (!l.lit) continue;
    l.fuelTicks -= burn;
    if (l.fuelTicks > 0) continue;
    l.lit = false;
    l.fuelTicks = 0;
    l.deposited = 0;
    l.everLit = true;
    ctx.emit({ name: 'lantern_out', data: { lantern_id: l.id } });
  }
}
