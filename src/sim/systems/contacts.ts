import { byId, distXZ } from '../geometry';
import { secondsToTicks } from '../tuning';
import { DRIFTER_FLEE_TICKS, DRIFTER_HIT_RADIUS, DRIFTER_STEAL_MAX, HIT_HEIGHT, SHADE_RECOIL_TICKS } from '../world';
import { safeZoneAt } from './lanterns';
import { dropMotes } from './spawn';
import type { SimState } from '../types';
import type { StepCtx } from './context';

/** Step 9: drifters steal first (invuln and safe zones do not stop them), then at most one shade hit. */
export function resolveContacts(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  if (p.respawnTicks > 0 || p.flames <= 0) return;

  for (const d of [...s.drifters].sort(byId)) {
    if (d.state !== 'chase' || distXZ(d.pos, p.pos) > DRIFTER_HIT_RADIUS) continue;
    const amount = Math.min(DRIFTER_STEAL_MAX, p.carried);
    p.carried -= amount;
    d.stolen = amount;
    d.state = 'flee';
    d.stateTicks = DRIFTER_FLEE_TICKS;
    ctx.emit({ name: 'drifter_steal', data: { drifter_id: d.id, amount, carried: p.carried } });
  }

  if (p.invulnTicks > 0) return;
  const t = ctx.tuning;
  const shade = [...s.shades]
    .sort(byId)
    .find(
      (sh) =>
        (sh.state === 'wander' || sh.state === 'chase') &&
        !safeZoneAt(s, sh.pos, t.safe_radius) &&
        distXZ(sh.pos, p.pos) <= t.shade_hit_radius &&
        Math.abs(sh.pos[1] - p.pos[1]) <= HIT_HEIGHT,
    );
  if (!shade) return;

  const dropped = Math.floor(p.carried * t.hit_drop_ratio);
  p.carried -= dropped;
  dropMotes(s, ctx, p.pos, dropped, true);
  p.flames -= 1;
  p.invulnTicks = secondsToTicks(t.invuln_s);
  shade.state = 'recoil';
  shade.stateTicks = SHADE_RECOIL_TICKS + 1; // recoils on the next 60 ticks
  ctx.emit({ name: 'player_hit', data: { by: 'shade', flames: p.flames, dropped } });
}
