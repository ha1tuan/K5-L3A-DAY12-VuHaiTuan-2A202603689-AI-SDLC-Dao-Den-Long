import type { NightDef } from '../nights';
import type { ControlState, SimEvent, Tuning } from '../types';

export interface Edges {
  jump: boolean;
  interact: boolean;
  pulse: boolean;
  dash: boolean;
  pause: boolean;
}

export interface IdCounters {
  mote: number;
  shade: number;
  drifter: number;
}

export interface StepMemory {
  prev: ControlState | null;
  ids: IdCounters;
  /** Night clock at sim tick 0 (scenario may override time_left_s). */
  startTimeLeftS: number;
  randomMotes: boolean;
  randomShades: boolean;
  randomDrifters: boolean;
  windEnabled: boolean;
  /** Gust directions so far, drawn from a wind-only PRNG so the sequence depends on the seed alone. */
  windDirs: number[];
  windRng: () => number;
  started: boolean;
}

/** Internal seam shared by every system; never exported from the sim interface. */
export interface StepCtx {
  tuning: Tuning;
  def: NightDef;
  rng: () => number;
  memory: StepMemory;
  ctrl: ControlState;
  edges: Edges;
  emit(e: Omit<SimEvent, 'tick'> & { name: SimEvent['name'] }): void;
}
