import { describe, expect, it } from 'vitest';
import { createSim, CONTRACT_TUNING } from '../../src/sim';
import { names, once, press, quietSim, run } from './helpers';

describe('Nhặt đom đóm (§3.3)', () => {
  it('picks up automatically within 1.0 m on XZ; picking up scores nothing', () => {
    const sim = quietSim({ motes: [[0, 0, 1.5]] });
    expect(run(sim, 4, { move: [0, 1] })).toEqual([]);
    expect(run(sim, 1, { move: [0, 1] })).toEqual([{ tick: 5, name: 'mote_picked', data: { carried: 1 } }]);
    expect(sim.state.score).toBe(0);
  });

  it('also needs the feet within 1.5 m of the mote height', () => {
    expect(names(run(quietSim({ motes: [[0.5, 1.6, 0]] }), 1))).toEqual([]);
    expect(names(run(quietSim({ motes: [[0.5, 1.5, 0]] }), 1))).toEqual(['mote_picked']);
  });

  it('never carries more than 10', () => {
    const sim = quietSim({ motes: [[0, 0, 0]], player: { carried: 10 } });
    expect(run(sim, 5)).toEqual([]);
    expect(sim.state.motes).toHaveLength(1);
  });
});

describe('Nạp và thắp đèn (§3.4)', () => {
  it('deposits min(carried, missing) into the nearest unlit lantern within 2.0 m, scoring 5 per mote (v1.2)', () => {
    const sim = quietSim({ player: { pos: [0, 0, 23], carried: 7 } });
    expect(press(sim, 'interact')).toEqual([{ tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: 7, deposited: 7 } }]);
    expect(sim.state.score).toBe(35);
  });

  it('lights at 10 deposited (+100) and keeps the rest; a first lighting is relight: false', () => {
    const sim = quietSim({ player: { pos: [0, 0, 23], carried: 5 }, lanterns: [{ id: 'L1', deposited: 7 }] });
    expect(press(sim, 'interact')).toEqual([
      { tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: 3, deposited: 10 } },
      { tick: 1, name: 'lantern_lit', data: { lantern_id: 'L1', relight: false } },
    ]);
    expect(sim.state.player.carried).toBe(2);
    expect(sim.state.score).toBe(115);
  });

  it('picks the lower id when two unlit lanterns are equally close', () => {
    const sim = quietSim({ player: { carried: 1 }, lanterns: [{ id: 'L1', pos: [1, 0, 0] }, { id: 'L2', pos: [-1, 0, 0] }] });
    expect(once(sim, { interact: true })[0].data).toEqual({ lantern_id: 'L1', amount: 1, deposited: 1 });
  });

  it('does nothing beyond 2.0 m', () => {
    expect(press(quietSim({ player: { pos: [0, 0, 22.9], carried: 3 } }), 'interact')).toEqual([]);
  });
});

describe('Kết thúc Đêm (§3.7, ADR-0002)', () => {
  const lastLantern = (extra = {}) =>
    quietSim({
      player: { pos: [-23.8, 0, 7.7], carried: 1 },
      lanterns: [
        { id: 'L1', lit: true },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', deposited: 9 },
      ],
      ...extra,
    });

  // PRD v3 R3: lighting every lantern no longer ends the night (all_lit removed). The two all_lit win
  // tests that stood here were deleted; the dawn win rule is covered in tests/sim/dawn.test.ts.

  it('losing the last flame always loses, even on the tick the last lantern is lit', () => {
    // safe_radius 0 so the shade next to the lantern is not made harmless by the light itself
    const sim = createSim({
      seed: 1,
      night: 1,
      tuning: { ...CONTRACT_TUNING, safe_radius: 0 },
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [-23.8, 0, 7.7], carried: 1, flames: 1 },
        shades: [{ pos: [-23.3, 1, 7.7] }],
        lanterns: ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true })).concat([{ id: 'L5', deposited: 9 } as never]),
      },
    });
    const events = once(sim, { interact: true });
    expect(names(events)).toEqual(['deposit', 'lantern_lit', 'player_hit', 'game_over']);
    expect(events.at(-1)?.data).toEqual({ result: 'lost', reason: 'no_flames' });
  });

  it('loses at dawn when the clock reaches 0', () => {
    const sim = quietSim({ time_left_s: 1 });
    run(sim, 59);
    expect(run(sim, 1)).toEqual([{ tick: 60, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }]);
  });
});
