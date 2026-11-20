import { CONTRACT_TUNING } from './tuning';
import { buildInitialState } from './scenario';
import { createRng } from './rng';
import { stepState, type StepMemory } from './step';
import type { ControlState, Sim, SimConfig, SimEvent } from './types';

export type * from './types';

export function createSim(cfg: SimConfig): Sim {
  const tuning = cfg.tuning ?? CONTRACT_TUNING;
  const rng = createRng(cfg.seed);
  const { state, ids } = buildInitialState(tuning, rng, cfg.scenario);
  const memory: StepMemory = {
    prev: null,
    ids,
    startTimeLeftS: state.timeLeftS,
    randomMotes: cfg.scenario?.random_motes !== false,
    randomShades: cfg.scenario?.random_shades !== false,
  };
  return {
    get state() {
      return state;
    },
    step(ctrl: ControlState): SimEvent[] {
      if (state.status !== 'playing') return [];
      return stepState(state, ctrl, { tuning, rng, memory });
    },
  };
}
