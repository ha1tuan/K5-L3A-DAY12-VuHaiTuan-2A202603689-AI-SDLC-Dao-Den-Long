import { TICKS_PER_SECOND } from './tuning';
import { movePlayer } from './systems/player';
import { pickUpMotes } from './systems/motes';
import { interactWithLantern } from './systems/lanterns';
import { checkEnd } from './systems/end';
import { moveShades } from './systems/shades';
import { resolveHits } from './systems/hits';
import { tickTimers } from './systems/timers';
import { pulse } from './systems/pulse';
import { spawnArrivals } from './systems/spawn';
import type { StepCtx } from './systems/context';
import type { ControlState, SimEvent, SimState, Tuning } from './types';

export interface StepMemory {
  prev: ControlState | null;
  ids: { mote: number; shade: number };
  /** Night clock at tick 0 (scenario may override time_left_s). */
  startTimeLeftS: number;
  randomMotes: boolean;
  randomShades: boolean;
}

export interface StepDeps {
  tuning: Tuning;
  rng: () => number;
  memory: StepMemory;
}

const rising = (now: boolean, before: boolean | undefined) => now && !before;

/** Advances the state by one tick in the fixed order of ADR-0001. */
export function stepState(s: SimState, ctrl: ControlState, deps: StepDeps): SimEvent[] {
  const events: SimEvent[] = [];
  const tick = s.tick + 1;
  const prev = deps.memory.prev;
  const ctx: StepCtx = {
    ...deps,
    ctrl,
    edges: {
      jump: rising(ctrl.jump, prev?.jump),
      interact: rising(ctrl.interact, prev?.interact),
      pulse: rising(ctrl.pulse, prev?.pulse),
    },
    emit: (e) => events.push({ ...e, tick } as SimEvent),
  };

  // 1. input applied via ctx; 2. move
  movePlayer(s, ctx);
  // 3. pickup
  pickUpMotes(s, ctx);
  // 4. interact: deposit / light
  interactWithLantern(s, ctx);
  // 5. pulse
  pulse(s, ctx);
  // 6. shades move, then are pushed out of safe zones
  moveShades(s, ctx);
  // 7. hits
  resolveHits(s, ctx);

  // 8. timers
  tickTimers(s);
  s.tick = tick;
  s.timeLeftS = Math.max(0, deps.memory.startTimeLeftS - tick / TICKS_PER_SECOND);
  spawnArrivals(s, ctx, tick);
  deps.memory.prev = ctrl;
  // 9. end check
  checkEnd(s, ctx);
  return events;
}
