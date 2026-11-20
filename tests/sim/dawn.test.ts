import { describe, expect, it } from 'vitest';
import type { Scenario } from '../../src/sim';
import { named, once, quietSim, run } from './helpers';

const lit = (ids: string[], fuel?: number) => ids.map((id) => ({ id, lit: true, ...(fuel === undefined ? {} : { fuel }) }));
const lastTick = (sc: Scenario, night: 1 | 2 | 3) => quietSim({ time_left_s: 1 / 60, ...sc }, night);

describe('Sống tới bình minh (PRD v3 §5.3, ADR-0003 step 11)', () => {
  it('AC-12: lighting every lantern does not end the night', () => {
    const sim = quietSim({
      time_left_s: 140,
      player: { pos: [-23.8, 0, 7.7], carried: 1 },
      lanterns: [...lit(['L1', 'L2', 'L3', 'L4']), { id: 'L5', deposited: 9 }],
    });
    const ev = run(sim, 2, { interact: true });
    expect(named(ev, 'lantern_lit')).toHaveLength(1);
    expect(named(ev, 'game_over')).toEqual([]);
    expect(sim.state.status).toBe('playing');
  });

  it('AC-13: Night 2 ends at dawn with 4/6 lit and flames left → won dawn_survived, dawn bonus', () => {
    const sim = lastTick({ lanterns: lit(['L1', 'L2', 'L3', 'L4']) }, 2);
    expect(once(sim)).toEqual([{ tick: 1, name: 'game_over', data: { result: 'won', reason: 'dawn_survived' } }]);
    // each lit lantern: 50 + floor(5999 / 60) = 149; each flame 50
    expect(sim.state.score).toBe(4 * 149 + 3 * 50);
    expect(sim.state.status).toBe('won');
  });

  it('AC-14: Night 3 with 4/7 lit at dawn → lost dawn, no dawn bonus', () => {
    const sim = lastTick({ lanterns: lit(['L1', 'L2', 'L3', 'L4']) }, 3);
    expect(once(sim)).toEqual([{ tick: 1, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }]);
    expect(sim.state.score).toBe(0);
  });

  it('the threshold is ceil(0.6 × lanterns): 3/5, 4/6, 5/7', () => {
    const result = (night: 1 | 2 | 3, n: number) =>
      (named(once(lastTick({ lanterns: lit(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'].slice(0, n)) }, night)), 'game_over')[0].data as { reason: string });
    expect([result(1, 2), result(1, 3), result(2, 3), result(2, 4), result(3, 4), result(3, 5)].map((d) => d.reason)).toEqual([
      'dawn',
      'dawn_survived',
      'dawn',
      'dawn_survived',
      'dawn',
      'dawn_survived',
    ]);
  });

  it('A46: the dawn bonus uses floor of the exact fuel', () => {
    // 50.0 → 2999 after the last burn → floor 49
    const sim = lastTick({ lanterns: lit(['L1', 'L2', 'L3'], 50), player: { flames: 1 } }, 1);
    once(sim);
    expect(sim.state.score).toBe(3 * (50 + 49) + 50);
  });

  it('a lantern that goes out on the dawn tick does not count', () => {
    const sim = lastTick({ lanterns: [...lit(['L1', 'L2']), { id: 'L3', lit: true, fuel: 0.01 }] }, 1);
    expect(named(once(sim), 'game_over')[0].data).toEqual({ result: 'lost', reason: 'dawn' });
  });

  it('AC-15: losing the last flame on the dawn tick loses no_flames even with enough lanterns', () => {
    const sim = lastTick({ lanterns: lit(['L1', 'L2', 'L3']), player: { flames: 1 }, shades: [{ pos: [0.5, 1, 0] }] }, 1);
    const ev = once(sim);
    expect(ev.map((e) => e.name)).toEqual(['player_hit', 'game_over']);
    expect(ev.at(-1)?.data).toEqual({ result: 'lost', reason: 'no_flames' });
  });

  it('runs the full 240 s when nothing happens', () => {
    const sim = quietSim();
    run(sim, 14399);
    expect(sim.state.status).toBe('playing');
    expect(named(run(sim, 1), 'game_over')).toEqual([{ tick: 14400, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }]);
  });
});
