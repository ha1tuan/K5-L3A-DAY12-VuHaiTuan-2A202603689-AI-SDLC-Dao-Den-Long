import { distXZ } from '../geometry';
import { secondsToTicks, TICKS_PER_SECOND } from '../tuning';
import { SHADE_DETECT, WIND_EVERY_TICKS, WIND_GUST_TICKS } from '../world';
import type { Shade, SimState } from '../types';
import type { StepCtx } from './context';

const down = (n: number) => (n > 0 ? n - 1 : 0);

function wakeShade(s: SimState, sh: Shade): void {
  sh.state = s.player.respawnTicks === 0 && distXZ(sh.pos, s.player.pos) <= SHADE_DETECT ? 'chase' : 'wander';
  sh.wanderTarget = null;
  sh.wanderTicks = 0;
}

/** Step 2: the night clock and every counter move down by one tick. */
export function tickTimers(s: SimState, ctx: StepCtx): void {
  const { memory, def, tuning } = ctx;
  s.simTick += 1;
  s.timeLeftS = Math.max(0, memory.startTimeLeftS - s.simTick / TICKS_PER_SECOND);

  const p = s.player;
  p.invulnTicks = down(p.invulnTicks);
  p.pulseCooldownTicks = down(p.pulseCooldownTicks);
  p.dashCooldownTicks = down(p.dashCooldownTicks);
  p.charmTicks = down(p.charmTicks);
  if (p.dashTicks > 0 && --p.dashTicks === 0) {
    p.dashHoldsY = false;
    // Leaving a dash: never keep more than running speed.
    const sp = Math.hypot(p.vel[0], p.vel[2]);
    if (sp > tuning.player_speed) {
      p.vel[0] *= tuning.player_speed / sp;
      p.vel[2] *= tuning.player_speed / sp;
    }
  }
  if (p.respawnTicks > 0 && --p.respawnTicks === 0) {
    p.pos = [...def.start];
    p.vel = [0, 0, 0];
    p.grounded = true;
    p.launched = false;
    p.invulnTicks = secondsToTicks(tuning.invuln_s);
  }

  for (const sh of s.shades) {
    if (sh.state === 'spawning' || sh.state === 'stunned' || sh.state === 'recoil') {
      sh.stateTicks = down(sh.stateTicks);
      if (sh.stateTicks === 0) wakeShade(s, sh);
    }
  }

  s.motes = s.motes.filter((m) => m.ttlTicks === null || --m.ttlTicks > 0);

  for (const c of s.charms) if (!c.available && (c.respawnTicks = down(c.respawnTicks)) === 0) c.available = true;

  for (const d of s.drifters) if (d.state === 'flee' && (d.stateTicks = down(d.stateTicks)) === 0) d.state = 'removed';

  if (memory.windEnabled) {
    const gust = Math.floor(s.simTick / WIND_EVERY_TICKS);
    const phase = s.simTick % WIND_EVERY_TICKS;
    while (memory.windDirs.length < gust) memory.windDirs.push(memory.windRng() * 360);
    s.wind.active = gust >= 1 && phase < WIND_GUST_TICKS;
    if (gust >= 1) s.wind.dirDeg = memory.windDirs[gust - 1];
  }
}
