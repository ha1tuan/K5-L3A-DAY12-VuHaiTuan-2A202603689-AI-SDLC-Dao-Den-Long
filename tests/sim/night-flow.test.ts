import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim';
import { quietSim, run } from './helpers';

describe('dawn', () => {
  it('loses with reason dawn exactly when the night clock reaches 0', () => {
    const sim = quietSim({ time_left_s: 1 });
    expect(run(sim, 59)).toEqual([]);
    expect(run(sim, 1)).toEqual([{ tick: 60, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }]);
    expect(sim.state.status).toBe('lost');
    expect(sim.state.timeLeftS).toBe(0);
  });

  it('prefers no_flames over dawn when both happen on the same tick', () => {
    const sim = quietSim({ time_left_s: 1 / 60, player: { flames: 1 }, shades: [{ pos: [0.5, 1, 0] }] });
    const over = run(sim, 1).filter((e) => e.name === 'game_over');
    expect(over[0].data).toEqual({ result: 'lost', reason: 'no_flames' });
  });
});

describe('shades arriving from the fog', () => {
  it('spawns a new shade every 60 s up to 5 in total (S3, S4, S5 at ticks 3600, 7200, 10800)', () => {
    const sim = createSim({ seed: 11, night: 1, scenario: { player: { flames: 999 } } });
    const spawned = run(sim, 14400).filter((e) => e.name === 'shade_spawned');
    expect(spawned).toEqual([
      { tick: 3600, name: 'shade_spawned', data: { id: 'S3' } },
      { tick: 7200, name: 'shade_spawned', data: { id: 'S4' } },
      { tick: 10800, name: 'shade_spawned', data: { id: 'S5' } },
    ]);
    expect(sim.state.shades).toHaveLength(5);
  });

  it('never spawns shades when random_shades is false', () => {
    const sim = quietSim({ player: { flames: 999 } });
    expect(run(sim, 3600).filter((e) => e.name === 'shade_spawned')).toEqual([]);
  });
});

describe('motes drifting back', () => {
  it('adds one mote every 2 s while fewer than 15 remain (random_motes on)', () => {
    const sim = createSim({ seed: 2, night: 1, scenario: { motes: [], shades: [] } });
    run(sim, 119);
    expect(sim.state.motes).toHaveLength(0);
    run(sim, 1);
    expect(sim.state.motes).toHaveLength(1);
    run(sim, 120 * 20);
    expect(sim.state.motes).toHaveLength(15);
  });

  it('never adds motes when random_motes is false', () => {
    const sim = quietSim();
    run(sim, 600);
    expect(sim.state.motes).toHaveLength(0);
  });
});
