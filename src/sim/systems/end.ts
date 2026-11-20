import type { EndReason, SimState } from '../types';
import type { StepCtx } from './context';

/** Step 11 (ADR-0002): no_flames always loses, then all_lit wins (even on the last tick), then dawn. */
export function checkEnd(s: SimState, ctx: StepCtx): void {
  let reason: EndReason | null = null;
  if (s.player.flames <= 0) reason = 'no_flames';
  else if (s.lanterns.every((l) => l.lit)) reason = 'all_lit';
  else if (s.timeLeftS <= 1e-9) reason = 'dawn';

  if (!reason) return;
  const won = reason === 'all_lit';
  if (won) {
    s.score += ctx.tuning.score.per_flame_left * s.player.flames;
  }
  s.status = won ? 'won' : 'lost';
  s.endReason = reason;
  ctx.emit({ name: 'game_over', data: { result: won ? 'won' : 'lost', reason } });
}
