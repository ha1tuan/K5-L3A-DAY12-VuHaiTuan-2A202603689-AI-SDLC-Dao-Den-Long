import { createSim, type ControlState, type Scenario, type Sim, type SimEvent } from '../../src/sim';

export const IDLE: ControlState = { move: [0, 0], camYawDeg: 0, jump: false, interact: false, pulse: false };

/** Empty island: no random motes or shades unless the scenario lists them. */
export function quietSim(scenario: Scenario = {}, seed = 1): Sim {
  return createSim({ seed, night: 1, scenario: { random_motes: false, random_shades: false, ...scenario } });
}

/** Runs n steps with the same held controls; returns every event emitted. */
export function run(sim: Sim, n: number, ctrl: Partial<ControlState> = {}): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.step({ ...IDLE, ...ctrl }));
  return events;
}

/** One tick with a button held, then one tick released: a single rising edge. */
export function press(sim: Sim, button: 'jump' | 'interact' | 'pulse', ctrl: Partial<ControlState> = {}): SimEvent[] {
  return [...sim.step({ ...IDLE, ...ctrl, [button]: true }), ...sim.step({ ...IDLE, ...ctrl })];
}

export const names = (events: SimEvent[]) => events.map((e) => e.name);
