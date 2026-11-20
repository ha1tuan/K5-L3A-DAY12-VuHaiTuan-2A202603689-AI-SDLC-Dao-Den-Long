import { dirXZ, within } from '../geometry';
import { secondsToTicks } from '../tuning';
import type { SimState } from '../types';
import type { StepCtx } from './context';

/** On a pulse edge, if affordable and off cooldown: stun and push back every shade in pulse_radius. */
export function pulse(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  const t = ctx.tuning;
  if (!ctx.edges.pulse || p.pulseCooldownTicks > 0 || p.carried < t.pulse_cost) return;

  p.carried -= t.pulse_cost;
  p.pulseCooldownTicks = secondsToTicks(t.pulse_cooldown_s);
  const stunned: string[] = [];
  for (const sh of s.shades) {
    if (!within(p.pos, sh.pos, t.pulse_radius)) continue;
    const [dx, dz] = dirXZ(p.pos, sh.pos);
    sh.pos[0] += dx * t.pulse_push_m;
    sh.pos[2] += dz * t.pulse_push_m;
    sh.state = 'stunned';
    sh.stunTicks = secondsToTicks(t.pulse_stun_s);
    stunned.push(sh.id);
  }
  s.score += t.score.per_stun * stunned.length;
  ctx.emit({ name: 'pulse', data: { stunned_ids: stunned } });
}
