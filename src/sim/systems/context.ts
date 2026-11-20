import type { ControlState, SimEvent, Tuning } from '../types';
import type { StepMemory } from '../step';

export interface Edges {
  jump: boolean;
  interact: boolean;
  pulse: boolean;
}

/** Internal seam shared by every system; never exported from the sim interface. */
export interface StepCtx {
  tuning: Tuning;
  rng: () => number;
  memory: StepMemory;
  ctrl: ControlState;
  edges: Edges;
  emit(e: Omit<SimEvent, 'tick'> & { name: SimEvent['name'] }): void;
}
