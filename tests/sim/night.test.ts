import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim';
import { IDLE } from './helpers';

describe('a new Night 1', () => {
  it('starts with Mây at the origin, full flames, 300 s left and five unlit lanterns on the 25 m ring', () => {
    const sim = createSim({ seed: 7, night: 1 });
    const s = sim.state;
    expect(s.tick).toBe(0);
    expect(s.status).toBe('playing');
    expect(s.timeLeftS).toBe(300);
    expect(s.score).toBe(0);
    expect(s.player.pos).toEqual([0, 0, 0]);
    expect(s.player.flames).toBe(3);
    expect(s.player.carried).toBe(0);
    expect(s.lanterns.map((l) => l.id)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
    expect(s.lanterns.every((l) => !l.lit && l.deposited === 0)).toBe(true);
    expect(s.lanterns[0].pos).toEqual([0, 0, 25]);
    expect(s.lanterns[1].pos[0]).toBeCloseTo(23.776, 3);
    expect(s.lanterns[1].pos[2]).toBeCloseTo(7.725, 3);
    expect(s.lanterns[3].pos[0]).toBeCloseTo(-14.695, 3);
    expect(s.lanterns[3].pos[2]).toBeCloseTo(-20.225, 3);
  });

  it('counts down the night clock from the number of steps run', () => {
    const sim = createSim({ seed: 7, night: 1 });
    for (let i = 0; i < 120; i++) sim.step(IDLE);
    expect(sim.state.tick).toBe(120);
    expect(sim.state.timeLeftS).toBe(298);
  });
});
