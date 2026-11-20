import { TICKS_PER_SECOND } from '../tuning';
import type { EndReason, SimState } from '../types';
import type { StepCtx } from './context';

/**
 * Step 11 (ADR-0003), after every other update of the tick: losing the last flame always loses
 * (no_flames), even on the dawn tick. At dawn the night is won (dawn_survived) when at least
 * ceil(win_ratio × lanterns) are lit, otherwise lost (dawn). Lighting every lantern ends nothing.
 */
export function checkEnd(s: SimState, ctx: StepCtx): void {
  let reason: EndReason | null = null;
  const t = ctx.tuning;
  if (s.player.flames <= 0) reason = 'no_flames';
  else if (s.timeLeftS <= 1e-9) {
    const needed = Math.ceil(t.win_ratio * s.lanterns.length - 1e-9);
    reason = s.lanterns.filter((l) => l.lit).length >= needed ? 'dawn_survived' : 'dawn';
  }
  if (!reason) return;

  const won = reason === 'dawn_survived';
  if (won) {
    // A46: floor of the exact fuel, not of the exported one-decimal value.
    for (const l of s.lanterns)
      if (l.lit) s.score += t.score.per_lantern_at_dawn + Math.floor(l.fuelTicks / TICKS_PER_SECOND);
    s.score += t.score.per_flame_left * s.player.flames;
  }
  s.status = won ? 'won' : 'lost';
  s.endReason = reason;
  ctx.emit({ name: 'game_over', data: { result: won ? 'won' : 'lost', reason } });
}
