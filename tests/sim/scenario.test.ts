import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim';
import { quietSim, run } from './helpers';

describe('default Night 1 island', () => {
  it('scatters 30 motes and 2 shades in chase from the fog edge (38 m), with ids M1.., S1..', () => {
    const s = createSim({ seed: 3, night: 1 }).state;
    expect(s.motes).toHaveLength(30);
    expect(s.motes[0].id).toBe('M1');
    for (const m of s.motes) {
      expect(Math.hypot(m.pos[0], m.pos[2])).toBeLessThanOrEqual(40);
      expect(m.pos[1]).toBe(0);
    }
    expect(s.shades.map((x) => x.id)).toEqual(['S1', 'S2']);
    for (const sh of s.shades) {
      expect(Math.hypot(sh.pos[0], sh.pos[2])).toBeCloseTo(38, 6);
      expect(sh.pos[1]).toBe(1);
      expect(sh.state).toBe('chase');
    }
  });

  it('is identical for the same seed and different for another seed', () => {
    const a = createSim({ seed: 3, night: 1 }).state;
    const b = createSim({ seed: 3, night: 1 }).state;
    const c = createSim({ seed: 4, night: 1 }).state;
    expect(b).toEqual(a);
    expect(c.motes).not.toEqual(a.motes);
  });
});

describe('scenario setup', () => {
  it('places Mây, motes and shades exactly as listed; random_* false means nothing else', () => {
    const s = quietSim({
      player: { pos: [1, 0, 2], carried: 4, flames: 2 },
      motes: [[0, 0, 5], [3, 0, 3]],
      shades: [{ pos: [10, 0, 0] }, { id: 'boss', pos: [-10, 0, 0] }],
    }).state;
    expect(s.player.pos).toEqual([1, 0, 2]);
    expect(s.player.carried).toBe(4);
    expect(s.player.flames).toBe(2);
    expect(s.motes.map((m) => m.pos)).toEqual([[0, 0, 5], [3, 0, 3]]);
    expect(s.shades.map((x) => x.id)).toEqual(['S1', 'boss']);
    expect(s.shades[0].pos).toEqual([10, 0, 0]);
    expect(s.shades[0].state).toBe('chase');
  });

  it('empty lists mean no motes and no shades', () => {
    const s = createSim({ seed: 1, night: 1, scenario: { motes: [], shades: [] } }).state;
    expect(s.motes).toHaveLength(0);
    expect(s.shades).toHaveLength(0);
  });

  it('updates lanterns by id and leaves the others untouched', () => {
    const s = quietSim({ lanterns: [{ id: 'L1', pos: [0, 0, 10], deposited: 3 }, { id: 'L3', lit: true }] }).state;
    expect(s.lanterns[0]).toEqual({ id: 'L1', pos: [0, 0, 10], lit: false, deposited: 3 });
    expect(s.lanterns[2].lit).toBe(true);
    expect(s.lanterns[1].pos[0]).toBeCloseTo(23.776, 3);
    expect(s.lanterns).toHaveLength(5);
  });

  it('awards no score and emits no events for pre-lit lanterns', () => {
    const sim = quietSim({ lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }] });
    expect(sim.state.score).toBe(0);
    expect(run(sim, 1)).toEqual([]);
    expect(sim.state.score).toBe(0);
  });

  it('starts the night clock at time_left_s and counts down from there', () => {
    const sim = quietSim({ time_left_s: 10 });
    expect(sim.state.timeLeftS).toBe(10);
    run(sim, 30);
    expect(sim.state.timeLeftS).toBe(9.5);
  });
});
