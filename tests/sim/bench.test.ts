import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim';
import { IDLE } from './helpers';

const benchSim = (seed = 42) => createSim({ seed, night: 1, bench: true });
const runFor = (sim: ReturnType<typeof benchSim>, n: number, ctrl = IDLE) => {
  const events = [];
  for (let i = 0; i < n; i++) events.push(...sim.step(ctrl));
  return events;
};

describe('Cảnh benchmark (PRD v4 §1.2)', () => {
  it('starts Night 1 with exactly 200 wandering shades, 100 motes and L1–L3 lit at fuel 100', () => {
    const s = benchSim().state;
    expect(s.night).toBe(1);
    expect(s.shades).toHaveLength(200);
    expect(s.shades.every((sh) => sh.state === 'wander')).toBe(true);
    expect(s.motes).toHaveLength(100);
    expect(s.lanterns.map((l) => [l.id, l.lit, l.fuelTicks])).toEqual([
      ['L1', true, 6000],
      ['L2', true, 6000],
      ['L3', true, 6000],
      ['L4', false, 0],
      ['L5', false, 0],
    ]);
    expect(s.player.pos).toEqual([0, 0, 0]);
    expect(s.drifters).toEqual([]);
  });

  it('spreads the shades over the island and is the same for the same seed', () => {
    const a = benchSim().state;
    expect(a.shades.every((sh) => Math.hypot(sh.pos[0], sh.pos[2]) <= 40)).toBe(true);
    const quadrants = [0, 1, 2, 3].map((q) => a.shades.filter((sh) => (sh.pos[0] >= 0 ? 0 : 1) + (sh.pos[2] >= 0 ? 0 : 2) === q).length);
    expect(Math.min(...quadrants)).toBeGreaterThan(30);
    expect(benchSim().state.shades.map((sh) => sh.pos)).toEqual(a.shades.map((sh) => sh.pos));
    expect(benchSim(7).state.shades.map((sh) => sh.pos)).not.toEqual(a.shades.map((sh) => sh.pos));
  });

  it('turns off spawning, damage, pickup, fuel burn and the end of the night; shades keep wandering', () => {
    const sim = benchSim();
    const before = sim.state.shades.map((sh) => [...sh.pos]);
    const events = runFor(sim, 60 * 300); // longer than Night 1 (240 s)
    expect(events.map((e) => e.name)).toEqual(['night_start']);
    const s = sim.state;
    expect(s.status).toBe('playing');
    expect(s.shades).toHaveLength(200);
    expect(s.shades.every((sh) => sh.state === 'wander')).toBe(true);
    expect(s.motes).toHaveLength(100);
    expect(s.player).toMatchObject({ flames: 3, carried: 0, pos: [0, 0, 0] });
    expect(s.lanterns.slice(0, 3).every((l) => l.lit && l.fuelTicks === 6000)).toBe(true);
    const moved = s.shades.filter((sh, i) => Math.hypot(sh.pos[0] - before[i][0], sh.pos[2] - before[i][2]) > 0.5).length;
    expect(moved).toBeGreaterThan(150);
  });

  it('ignores player input', () => {
    const sim = benchSim();
    runFor(sim, 30, { move: [1, 0], camYawDeg: 0, jump: true, pulse: true, dash: true, interact: true });
    expect(sim.state.player.pos).toEqual([0, 0, 0]);
  });
});
