import { CONTRACT_TUNING } from './tuning';
import { buildInitialState } from './scenario';
import { createRng } from './rng';
import { nightDef } from './nights';
import { stepBench, stepState } from './step';
import { buildBenchState } from './bench';
import type { StepMemory } from './systems/context';
import type { ControlState, Sim, SimConfig, SimEvent } from './types';

export type * from './types';

export function createSim(cfg: SimConfig): Sim {
  const tuning = cfg.tuning ?? CONTRACT_TUNING;
  const def = nightDef(cfg.night, tuning);
  const rng = createRng(cfg.seed);
  const sc = cfg.scenario ?? {};
  const { state, ids } = cfg.bench ? buildBenchState(def, tuning, rng) : buildInitialState(def, tuning, rng, sc);
  const memory: StepMemory = {
    prev: null,
    ids,
    startTimeLeftS: state.timeLeftS,
    randomMotes: sc.random_motes !== false,
    randomShades: sc.random_shades !== false,
    randomDrifters: sc.random_drifters !== false,
    windEnabled: sc.wind_enabled ?? def.wind,
    windDirs: [],
    // A separate stream so the gust directions depend on the seed alone (AC-09.3).
    windRng: createRng((cfg.seed ^ 0x5bd1e995) >>> 0),
    started: false,
  };
  return {
    get state() {
      return state;
    },
    step(ctrl: ControlState): SimEvent[] {
      if (state.status !== 'playing') return [];
      if (cfg.bench) return stepBench(state, { tuning, def, rng, memory });
      return stepState(state, ctrl, { tuning, def, rng, memory });
    },
  };
}

/** Read-only constants and map data the client needs for display (not gameplay inputs). */
/** Seeded PRNG (mulberry32), for adapters that need reproducible input such as the soak test. */
export { createRng } from './rng';
export { CONTRACT_TUNING, fuelUnits, isFullFuel, isLowFuel, secondsToTicks, TICKS_PER_SECOND } from './tuning';
export { nightDef, type NightDef, type BouncePad } from './nights';
export type { Column } from './terrain';
export { WIND_EVERY_TICKS, WIND_GUST_TICKS, WIND_WARN_TICKS } from './world';
/** Night 1 island radius (kept for the Phase 1 client until it renders every night from nightDef). */
export const ISLAND_RADIUS = 40;
