import { describe, expect, it } from 'vitest';
import { names, quietSim, run } from './helpers';

describe('Bóng Mực touching Mây', () => {
  it('costs one flame and drops floor(carried × 0.5) motes, which vanish', () => {
    const sim = quietSim({ player: { carried: 5 }, shades: [{ pos: [0.5, 1, 0] }] });
    const events = run(sim, 1);
    expect(events).toEqual([{ tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 2 } }]);
    expect(sim.state.player.carried).toBe(3);
    expect(sim.state.motes).toHaveLength(0);
  });

  it('grants invuln_s (1.5 s = 90 ticks): the next hit lands at tick 91, the third ends the night at 181', () => {
    const sim = quietSim({ shades: [{ pos: [0.5, 1, 0] }] });
    const events = run(sim, 300);
    const hits = events.filter((e) => e.name === 'player_hit');
    expect(hits.map((e) => e.tick)).toEqual([1, 91, 181]);
    expect(hits.map((e) => e.data)).toEqual([
      { by: 'shade', flames: 2, dropped: 0 },
      { by: 'shade', flames: 1, dropped: 0 },
      { by: 'shade', flames: 0, dropped: 0 },
    ]);
    expect(events.at(-1)).toEqual({ tick: 181, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } });
    expect(sim.state.status).toBe('lost');
    expect(sim.state.score).toBe(0); // no win bonus on a loss
  });

  it('takes at most one hit per tick even with several shades in reach', () => {
    const sim = quietSim({ shades: [{ pos: [0.5, 1, 0] }, { pos: [-0.5, 1, 0] }] });
    expect(names(run(sim, 1))).toEqual(['player_hit']);
    expect(sim.state.player.flames).toBe(2);
  });

  it('does not hit from just outside shade_hit_radius', () => {
    const sim = quietSim({ shades: [{ pos: [1.1, 1, 0] }] });
    sim.step({ move: [-1, 0], camYawDeg: 0, jump: false, interact: false, pulse: false }); // Mây walks away 0.1 m
    expect(sim.state.player.flames).toBe(3);
  });
});
