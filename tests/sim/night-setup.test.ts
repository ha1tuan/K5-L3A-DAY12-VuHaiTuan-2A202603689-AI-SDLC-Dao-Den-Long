import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim';
import { IDLE } from './helpers';

const angleDist = (r: number, step: number, from = 0) =>
  Array.from({ length: Math.round(360 / step) }, (_, i) => {
    const t = ((from + i * step) * Math.PI) / 180;
    return [r * Math.cos(t), r * Math.sin(t)];
  });

describe('Đêm 1 – Đảo Bến (bản đồ chuẩn §4.1)', () => {
  it('starts with 5 unlit lanterns at the standard positions, Mây at the origin facing +Z, full flames, no shades yet', () => {
    const sim = createSim({ seed: 3, night: 1 });
    const s = sim.state;
    expect(s.night).toBe(1);
    expect(s.lanterns.map((l) => [l.id, ...l.pos])).toEqual([
      ['L1', 0, 0, 25],
      ['L2', 23.8, 0, 7.7],
      ['L3', 14.7, 0, -20.2],
      ['L4', -14.7, 0, -20.2],
      ['L5', -23.8, 0, 7.7],
    ]);
    expect(s.player.pos).toEqual([0, 0, 0]);
    expect(s.player.flames).toBe(3);
    expect(s.shades).toEqual([]);
    expect(s.timeLeftS).toBe(300);
  });

  it('places 20 motes on 20 different points among the 24 standard spawn points', () => {
    const s = createSim({ seed: 3, night: 1 }).state;
    const points = [...angleDist(12, 45), ...angleDist(33, 22.5)];
    expect(s.motes).toHaveLength(20);
    const used = s.motes.map((m) => points.findIndex(([x, z]) => Math.hypot(m.pos[0] - x, m.pos[2] - z) < 1e-9));
    expect(used.every((i) => i >= 0)).toBe(true);
    expect(new Set(used).size).toBe(20);
    expect(s.motes.every((m) => m.kind === 'random' && m.pos[1] === 0)).toBe(true);
  });

  it('announces night_start {night} at tick 0 on the first step', () => {
    const sim = createSim({ seed: 3, night: 1 });
    expect(sim.step(IDLE)[0]).toEqual({ tick: 0, name: 'night_start', data: { night: 1 } });
  });
});
