import { movePlayer } from './systems/player';
import { pickUp } from './systems/pickup';
import { interactWithLantern, updateSafeZones } from './systems/lanterns';
import { pulse } from './systems/pulse';
import { moveCreatures } from './systems/shades';
import { resolveContacts } from './systems/contacts';
import { tickTimers } from './systems/timers';
import { spawnArrivals } from './systems/spawn';
import { checkEnd } from './systems/end';
import type { StepCtx, StepMemory } from './systems/context';
import type { NightDef } from './nights';
import type { ControlState, SimEvent, SimState, Tuning } from './types';

export type { StepMemory };

export interface StepDeps {
  tuning: Tuning;
  def: NightDef;
  rng: () => number;
  memory: StepMemory;
}

const rising = (now: boolean | undefined, before: boolean | undefined) => !!now && !before;

/** Advances the state by one tick in the fixed order of ADR-0002. */
export function stepState(s: SimState, ctrl: ControlState, deps: StepDeps): SimEvent[] {
  const events: SimEvent[] = [];
  const { memory } = deps;
  const prev = memory.prev;
  memory.prev = ctrl;
  s.tick += 1;
  const tick = s.tick;
  const ctx: StepCtx = {
    ...deps,
    ctrl,
    edges: {
      jump: rising(ctrl.jump, prev?.jump),
      interact: rising(ctrl.interact, prev?.interact),
      pulse: rising(ctrl.pulse, prev?.pulse),
      dash: rising(ctrl.dash, prev?.dash),
      pause: rising(ctrl.pause, prev?.pause),
    },
    emit: (e) => events.push({ ...e, tick } as SimEvent),
  };

  if (!memory.started) {
    memory.started = true;
    events.push({ tick: 0, name: 'night_start', data: { night: s.night } });
  }

  // 1. input; pause is handled first and stops the step while paused
  if (ctx.edges.pause) {
    s.paused = !s.paused;
    ctx.emit({ name: s.paused ? 'paused' : 'resumed', data: {} });
  }
  if (s.paused) return events;

  tickTimers(s, ctx); // 2
  movePlayer(s, ctx); // 3 (+ fall check)
  pickUp(s, ctx); // 4
  interactWithLantern(s, ctx); // 5
  updateSafeZones(s, ctx); // 6
  pulse(s, ctx); // 7
  moveCreatures(s, ctx); // 8
  resolveContacts(s, ctx); // 9
  spawnArrivals(s, ctx); // 10
  checkEnd(s, ctx); // 11
  return events; // 12. snapshots are written by the caller
}
