import type { SimState } from '../types';

/** Counts down every per-entity timer by one tick. */
export function tickTimers(s: SimState): void {
  const p = s.player;
  if (p.invulnTicks > 0) p.invulnTicks -= 1;
  if (p.pulseCooldownTicks > 0) p.pulseCooldownTicks -= 1;
  for (const sh of s.shades) {
    if (sh.state === 'stunned' && --sh.stunTicks <= 0) {
      sh.stunTicks = 0;
      sh.state = 'chase';
    }
  }
}
