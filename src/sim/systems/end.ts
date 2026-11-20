import type { EndReason, SimState } from '../types';
import type { StepCtx } from './context';

/** Checks all_lit → no_flames → dawn (ADR-0001). Win bonuses are added only on a win. */
export function checkEnd(s: SimState, ctx: StepCtx): void {
  let reason: EndReason | null = null;
  if (s.lanterns.every((l) => l.lit)) reason = 'all_lit';
  else if (s.player.flames <= 0) reason = 'no_flames';
  else if (s.timeLeftS <= 1e-9) reason = 'dawn';

  if (!reason) return;
  const won = reason === 'all_lit';
  if (won) {
    const { per_second_left, per_flame_left } = ctx.tuning.score;
    s.score += per_second_left * Math.floor(Math.max(0, s.timeLeftS)) + per_flame_left * s.player.flames;
  }
  s.status = won ? 'won' : 'lost';
  s.endReason = reason;
  ctx.emit({ name: 'game_over', data: { result: won ? 'won' : 'lost', reason } });
}
