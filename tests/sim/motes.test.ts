import { describe, expect, it } from 'vitest';
import { quietSim, run } from './helpers';

describe('picking up motes', () => {
  it('picks a mote automatically within pickup_radius, scoring per_mote', () => {
    const sim = quietSim({ motes: [[0, 0, 1]] }); // exactly at 1.0 m counts as within
    const events = run(sim, 1);
    expect(events).toEqual([{ tick: 1, name: 'mote_picked', data: { carried: 1 } }]);
    expect(sim.state.player.carried).toBe(1);
    expect(sim.state.motes).toHaveLength(0);
    expect(sim.state.score).toBe(10);
  });

  it('ignores motes just outside pickup_radius', () => {
    const sim = quietSim({ motes: [[0, 0, 1.01]] });
    expect(run(sim, 1)).toEqual([]);
    expect(sim.state.motes).toHaveLength(1);
  });

  it('picks after moving within the same tick (move happens first)', () => {
    const sim = quietSim({ motes: [[0, 0, 1.05]] });
    const events = run(sim, 1, { move: [0, 1] }); // walks 0.1 m to z = 0.1
    expect(events.map((e) => e.name)).toEqual(['mote_picked']);
  });

  it('measures distance on the XZ plane only (mid-jump still picks)', () => {
    const sim = quietSim({ player: { pos: [0, 0, 0] }, motes: [[0.5, 0, 0]] });
    sim.step({ move: [0, 0], camYawDeg: 0, jump: true, interact: false, pulse: false });
    expect(sim.state.player.carried).toBe(1);
  });

  it('leaves motes on the ground once carrying carry_capacity (5)', () => {
    const sim = quietSim({ player: { carried: 5 }, motes: [[0, 0, 0.5]] });
    expect(run(sim, 1)).toEqual([]);
    expect(sim.state.player.carried).toBe(5);
    expect(sim.state.motes).toHaveLength(1);
  });

  it('picks several motes in one tick up to capacity, one event each', () => {
    const sim = quietSim({ player: { carried: 3 }, motes: [[0, 0, 0.2], [0.2, 0, 0], [0, 0, -0.2]] });
    const events = run(sim, 1);
    expect(events.map((e) => e.data)).toEqual([{ carried: 4 }, { carried: 5 }]);
    expect(sim.state.motes).toHaveLength(1);
  });
});
