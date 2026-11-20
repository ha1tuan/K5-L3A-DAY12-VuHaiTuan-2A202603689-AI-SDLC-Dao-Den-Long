import { describe, expect, it } from 'vitest';
import { IDLE, names, press, quietSim, run } from './helpers';

const L1_NEAR = { lanterns: [{ id: 'L1', pos: [0, 0, 2] as [number, number, number] }] };

describe('depositing into lanterns', () => {
  it('deposits all carried motes into a lantern within interact_radius on an interact edge', () => {
    const sim = quietSim({ ...L1_NEAR, player: { carried: 5 } });
    const events = press(sim, 'interact');
    expect(events).toEqual([{ tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: 5, deposited: 5 } }]);
    expect(sim.state.player.carried).toBe(0);
    expect(sim.state.lanterns[0].deposited).toBe(5);
    expect(sim.state.lanterns[0].lit).toBe(false);
  });

  it('lights the lantern when deposits reach lantern_cost (8), keeping the surplus', () => {
    const sim = quietSim({ lanterns: [{ id: 'L1', pos: [0, 0, 2], deposited: 5 }], player: { carried: 5 } });
    const events = press(sim, 'interact');
    expect(events).toEqual([
      { tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: 3, deposited: 8 } },
      { tick: 1, name: 'lantern_lit', data: { lantern_id: 'L1' } },
    ]);
    expect(sim.state.player.carried).toBe(2);
    expect(sim.state.lanterns[0].lit).toBe(true);
    expect(sim.state.score).toBe(100);
  });

  it('only acts on the rising edge: holding interact deposits once', () => {
    const sim = quietSim({ ...L1_NEAR, player: { carried: 2 } });
    sim.step({ ...IDLE, interact: true });
    sim.step({ ...IDLE, interact: true, move: [0, 0] });
    expect(sim.state.lanterns[0].deposited).toBe(2);
  });

  it('chooses the nearest unlit lantern and ignores lit ones', () => {
    const sim = quietSim({
      lanterns: [
        { id: 'L1', pos: [0, 0, 1], lit: true },
        { id: 'L2', pos: [0, 0, 2.4] },
        { id: 'L3', pos: [0, 0, -2] },
      ],
      player: { carried: 1 },
    });
    const events = press(sim, 'interact');
    expect(events[0].data).toEqual({ lantern_id: 'L3', amount: 1, deposited: 1 });
  });

  it('does nothing out of range (> 2.5 m) or with nothing carried', () => {
    const far = quietSim({ lanterns: [{ id: 'L1', pos: [0, 0, 2.6] }], player: { carried: 3 } });
    expect(press(far, 'interact')).toEqual([]);
    const empty = quietSim({ ...L1_NEAR, player: { carried: 0 } });
    expect(press(empty, 'interact')).toEqual([]);
  });
});

describe('winning', () => {
  it('wins with all_lit when the last lantern lights; bonuses for time and flames are added', () => {
    const sim = quietSim({
      lanterns: [
        { id: 'L1', lit: true },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', pos: [0, 0, 1], deposited: 7 },
      ],
      player: { carried: 1 },
    });
    const events = run(sim, 1, { interact: true });
    expect(names(events)).toEqual(['deposit', 'lantern_lit', 'game_over']);
    expect(events[2].data).toEqual({ result: 'won', reason: 'all_lit' });
    expect(sim.state.status).toBe('won');
    expect(sim.state.endReason).toBe('all_lit');
    // 100 lantern + floor(299.983) * 2 + 3 flames * 50
    expect(sim.state.score).toBe(848);
  });

  it('freezes after the night ends: further steps do nothing', () => {
    const sim = quietSim({
      lanterns: ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true })).concat([{ id: 'L5', pos: [0, 0, 1], deposited: 7 } as never]),
      player: { carried: 1 },
    });
    run(sim, 1, { interact: true });
    expect(run(sim, 10, { move: [1, 0] })).toEqual([]);
    expect(sim.state.tick).toBe(1);
    expect(sim.state.player.pos).toEqual([0, 0, 0]);
  });
});
