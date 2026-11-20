import { within } from '../geometry';
import { secondsToTicks } from '../tuning';
import type { SimState } from '../types';
import type { StepCtx } from './context';

/** At most one hit per tick, from any non-stunned shade within shade_hit_radius. */
export function resolveHits(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  if (p.invulnTicks > 0 || p.flames <= 0) return;
  const { shade_hit_radius, hit_drop_ratio, invuln_s } = ctx.tuning;
  const hit = s.shades.some((sh) => sh.state !== 'stunned' && within(sh.pos, p.pos, shade_hit_radius));
  if (!hit) return;
  const dropped = Math.floor(p.carried * hit_drop_ratio);
  p.carried -= dropped;
  p.flames -= 1;
  p.invulnTicks = secondsToTicks(invuln_s);
  ctx.emit({ name: 'player_hit', data: { by: 'shade', flames: p.flames, dropped } });
}
