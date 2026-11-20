import { describe, expect, it } from 'vitest';
import { once, press, quietSim, run } from './helpers';

describe('Tỏa Sáng (§3.5)', () => {
  it('costs 3, stuns shades within 5 m (3D, from 0.8 m above the feet) and scores 5 each', () => {
    const sim = quietSim({ player: { carried: 4 }, shades: [{ pos: [3, 1, 0] }, { pos: [0, 1, 10] }] });
    expect(once(sim, { pulse: true })).toEqual([{ tick: 1, name: 'pulse', data: { stunned_ids: ['S1'] } }]);
    expect(sim.state.player.carried).toBe(1);
    expect(sim.state.shades.map((s) => s.state)).toEqual(['stunned', 'chase']);
    expect(sim.state.score).toBe(5);
  });

  it('measures the radius in 3D: 4 m away on XZ but 3.2 m higher is out of reach', () => {
    const sim = quietSim({ player: { carried: 3 }, shades: [{ pos: [3, 4.5, 0] }, { pos: [4, 4, 0] }] });
    expect(once(sim, { pulse: true })[0].data).toEqual({ stunned_ids: ['S1'] });
  });

  it('pushes a stunned shade back 4 m in total over the first 15 ticks', () => {
    const sim = quietSim({ player: { carried: 3 }, shades: [{ pos: [3, 1, 0] }] });
    once(sim, { pulse: true });
    expect(sim.state.shades[0].pos[0]).toBeCloseTo(3 + 4 / 15, 9);
    run(sim, 14);
    expect(sim.state.shades[0].pos[0]).toBeCloseTo(7, 9);
    run(sim, 30);
    expect(sim.state.shades[0].pos[0]).toBeCloseTo(7, 9);
  });

  it('pushes along +X when the shade sits exactly on Mây', () => {
    const sim = quietSim({ player: { carried: 3 }, shades: [{ pos: [0, 1, 0] }] });
    once(sim, { pulse: true });
    run(sim, 14);
    expect(sim.state.shades[0].pos[0]).toBeCloseTo(4, 9);
    expect(sim.state.shades[0].pos[2]).toBeCloseTo(0, 9);
  });

  it('stuns for 120 ticks, then the shade wakes and chases again', () => {
    const sim = quietSim({ player: { carried: 3 }, shades: [{ pos: [3, 1, 0] }] });
    once(sim, { pulse: true });
    run(sim, 119); // tick 120
    expect(sim.state.shades[0].state).toBe('stunned');
    run(sim, 1); // tick 121
    expect(sim.state.shades[0].state).toBe('chase');
  });

  it('hitting an already stunned shade refreshes the stun and still scores', () => {
    const sim = quietSim({ player: { carried: 3 }, shades: [{ pos: [2, 1, 0], state: 'stunned', state_ticks_left: 5 }] });
    once(sim, { pulse: true });
    expect(sim.state.shades[0].stateTicks).toBe(120);
    expect(sim.state.score).toBe(5);
  });

  it('does not fire with fewer than 3 carried', () => {
    const sim = quietSim({ player: { carried: 2 }, shades: [{ pos: [3, 1, 0] }] });
    expect(press(sim, 'pulse')).toEqual([]);
    expect(sim.state.player.carried).toBe(2);
  });

  it('has a 3 s (180 tick) cooldown', () => {
    const sim = quietSim({ player: { carried: 10 } });
    const ticks: number[] = [];
    for (let k = 0; k < 200; k++) for (const e of once(sim, { pulse: k === 0 || k === 178 || k === 180 })) ticks.push(e.tick);
    expect(ticks).toEqual([1, 181]);
  });
});
