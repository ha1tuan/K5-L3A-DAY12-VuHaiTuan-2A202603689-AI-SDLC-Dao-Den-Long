import { describe, expect, it } from 'vitest';
import { distXZ } from '../../src/sim/geometry';
import { quietSim, run } from './helpers';

describe('Bóng Mực chasing', () => {
  it('chases Mây at shade_speed (4 m/s) on the XZ plane, keeping its hover height', () => {
    const sim = quietSim({ shades: [{ pos: [20, 1, 0] }] });
    run(sim, 60);
    const sh = sim.state.shades[0];
    expect(sh.state).toBe('chase');
    expect(sh.pos[0]).toBeCloseTo(16, 6);
    expect(sh.pos[2]).toBeCloseTo(0, 6);
    expect(sh.pos[1]).toBe(1);
  });

  it('cannot enter safe_radius (6 m) around a lit lantern: it stops on the edge', () => {
    const sim = quietSim({
      player: { pos: [0, 0, 0], flames: 99 },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }],
      shades: [{ pos: [20, 1, 0] }],
    });
    run(sim, 600);
    expect(distXZ(sim.state.shades[0].pos, [0, 0, 0])).toBeCloseTo(6, 6);
  });

  it('is not held back by an unlit lantern', () => {
    const sim = quietSim({
      player: { pos: [0, 0, 0], flames: 99 },
      lanterns: [{ id: 'L1', pos: [0, 0, 0] }],
      shades: [{ pos: [20, 1, 0] }],
    });
    run(sim, 600);
    expect(distXZ(sim.state.shades[0].pos, [0, 0, 0])).toBeLessThan(1);
  });
});
