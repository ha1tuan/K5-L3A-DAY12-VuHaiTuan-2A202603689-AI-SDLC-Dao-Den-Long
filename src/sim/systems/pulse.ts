import { dirXZ, dist3 } from '../geometry';
import { secondsToTicks } from '../tuning';
import { DRIFTER_DROP_VANISH_TICKS, DRIFTER_FLEE_TICKS, PULSE_CENTER_Y, PULSE_PUSH_TICKS } from '../world';
import type { SimState, Vec3 } from '../types';
import type { StepCtx } from './context';
import { dropMotes } from './spawn';

/** Step 7: on a pulse edge, if affordable and off cooldown. Targets are chosen this tick by 3D distance from chest height. */
export function pulse(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  const t = ctx.tuning;
  if (!ctx.edges.pulse || p.respawnTicks > 0 || p.pulseCooldownTicks > 0 || p.carried < t.pulse_cost) return;

  p.carried -= t.pulse_cost;
  p.pulseCooldownTicks = secondsToTicks(t.pulse_cooldown_s);
  const center: Vec3 = [p.pos[0], p.pos[1] + PULSE_CENTER_Y, p.pos[2]];

  const stunned: string[] = [];
  for (const sh of s.shades) {
    if (dist3(center, sh.pos) > t.pulse_radius) continue;
    // PRD v3 §5.5: a shade caught draining is worth per_stun_drain in total.
    s.score += sh.state === 'drain' ? t.score.per_stun_drain : t.score.per_stun;
    sh.targetLanternId = null;
    sh.drainTicks = 0;
    sh.state = 'stunned';
    sh.stateTicks = secondsToTicks(t.pulse_stun_s);
    sh.pushTicks = PULSE_PUSH_TICKS;
    sh.pushDir = dirXZ(center, sh.pos);
    stunned.push(sh.id);
  }
  ctx.emit({ name: 'pulse', data: { stunned_ids: stunned } });

  // A25: drifters are scared off but give no score.
  for (const d of s.drifters) {
    if (dist3(center, d.pos) > t.pulse_radius) continue;
    if (d.state === 'chase') {
      d.state = 'flee';
      d.stateTicks = DRIFTER_FLEE_TICKS;
    } else if (d.state === 'flee' && d.stolen > 0) {
      const amount = d.stolen;
      d.stolen = 0;
      d.stateTicks = DRIFTER_DROP_VANISH_TICKS;
      dropMotes(s, ctx, d.pos, amount, false);
      ctx.emit({ name: 'drifter_drop', data: { drifter_id: d.id, amount } });
    }
  }
}
