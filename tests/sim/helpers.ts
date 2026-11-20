import { createSim, type ControlState, type Scenario, type Sim, type SimEvent, type Vec3 } from '../../src/sim';

export const IDLE: ControlState = { move: [0, 0], camYawDeg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };

/** Empty night: no random motes, shades or drifters unless the scenario lists them. */
export function quietSim(scenario: Scenario = {}, night: 1 | 2 | 3 = 1, seed = 1): Sim {
  return createSim({
    seed,
    night,
    scenario: { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, charms: [], ...scenario },
  });
}

/** night_start (tick 0, first step) is checked in night-setup tests; the other helpers leave it out. */
const play = (events: SimEvent[]) => events.filter((e) => e.name !== 'night_start');

/** Runs n steps with the same held controls; returns every gameplay event emitted. */
export function run(sim: Sim, n: number, ctrl: Partial<ControlState> = {}): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...play(sim.step({ ...IDLE, ...ctrl })));
  return events;
}

/** One step with the given held controls (night_start left out). */
export const once = (sim: Sim, ctrl: Partial<ControlState> = {}): SimEvent[] => play(sim.step({ ...IDLE, ...ctrl }));

type Button = 'jump' | 'interact' | 'pulse' | 'dash' | 'pause';

/** One tick with a button held, then one tick released: a single rising edge. */
export function press(sim: Sim, button: Button, ctrl: Partial<ControlState> = {}): SimEvent[] {
  return [...once(sim, { ...ctrl, [button]: true }), ...once(sim, ctrl)];
}

export const names = (events: SimEvent[]) => events.map((e) => e.name);
export const named = (events: SimEvent[], name: SimEvent['name']) => events.filter((e) => e.name === name);
export const v = (x: number, y: number, z: number): Vec3 => [x, y, z];
