import { describe, expect, it } from 'vitest';
import { runHeadless } from '../../src/headless/run';
import { InputTimeline } from '../../src/headless/timeline';

const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false } as const;
const parse = (lines: string[]) => lines.map((l) => JSON.parse(l));

describe('runHeadless JSONL output', () => {
  it('writes a snapshot at tick 0 and every snapshotEvery ticks, then the end line', () => {
    const out = parse(runHeadless({ seed: 1, night: 1, scenario: quiet, timeline: new InputTimeline([]), ticks: 20, snapshotEvery: 10 }));
    expect(out.map((o) => [o.type, o.tick ?? o.ticks])).toEqual([
      ['snapshot', 0],
      ['event', 0],
      ['snapshot', 10],
      ['snapshot', 20],
      ['end', 20],
    ]);
    expect(out[1]).toEqual({ type: 'event', tick: 0, name: 'night_start', data: { night: 1 } });
    expect(out[4]).toEqual({ type: 'end', ticks: 20, state: 'playing', score: 0 });
  });

  it('uses the contract snapshot shape with coordinates rounded to 3 decimals', () => {
    const [snap] = parse(
      runHeadless({
        seed: 1,
        night: 1,
        scenario: { ...quiet, motes: [[1.23456, 0, 2]], shades: [{ pos: [10.00049, 1, 0] }] },
        timeline: new InputTimeline([]),
        ticks: 0,
        snapshotEvery: 10,
      }),
    );
    expect(snap).toEqual({
      type: 'snapshot',
      tick: 0,
      sim_tick: 0,
      state: 'playing',
      night: 1,
      time_left_s: 240,
      score: 0,
      wind: { active: false, dir_deg: 0 },
      player: {
        pos: [0, 0, 0],
        vel: [0, 0, 0],
        grounded: true,
        flames: 3,
        carried: 0,
        invuln: false,
        dash_cd_s: 0,
        pulse_cd_s: 0,
        charm_s: 0,
      },
      lanterns: [
        { id: 'L1', pos: [0, 0, 25], lit: false, deposited: 0, fuel: 0, ever_lit: false, relit_count: 0 },
        { id: 'L2', pos: [23.8, 0, 7.7], lit: false, deposited: 0, fuel: 0, ever_lit: false, relit_count: 0 },
        { id: 'L3', pos: [14.7, 0, -20.2], lit: false, deposited: 0, fuel: 0, ever_lit: false, relit_count: 0 },
        { id: 'L4', pos: [-14.7, 0, -20.2], lit: false, deposited: 0, fuel: 0, ever_lit: false, relit_count: 0 },
        { id: 'L5', pos: [-23.8, 0, 7.7], lit: false, deposited: 0, fuel: 0, ever_lit: false, relit_count: 0 },
      ],
      shades: [{ id: 'S1', pos: [10, 1, 0], state: 'chase' }],
      motes_active: 1,
      motes: [{ id: 'M1', pos: [1.235, 0, 2], kind: 'random', ttl_s: null }],
      drifters: [],
      charms: [],
    });
  });

  it('A34: writes lantern fuel with one decimal, rounding half up from 1/60 units', () => {
    const fuelAt = (ticks: number) =>
      parse(runHeadless({ seed: 1, night: 1, scenario: { ...quiet, lanterns: [{ id: 'L1', lit: true, fuel: 50 }] }, timeline: new InputTimeline([]), ticks, snapshotEvery: 1 }))
        .filter((o) => o.type === 'snapshot')
        .at(-1).lanterns[0].fuel;
    expect([fuelAt(0), fuelAt(3), fuelAt(4), fuelAt(60)]).toEqual([50, 50, 49.9, 49]);
  });

  it('reports drifters, charms and cooldowns in seconds (Night 2)', () => {
    const out = parse(
      runHeadless({
        seed: 1,
        night: 2,
        scenario: { ...quiet, drifters: [{ pos: [20, 1, 0] }], player: { carried: 3, pulse_cd_ticks: 90 } },
        timeline: new InputTimeline([{ tick: 0, dash: true }]),
        ticks: 10,
        snapshotEvery: 10,
      }),
    );
    const snap = out.find((o) => o.type === 'snapshot' && o.tick === 10);
    expect(snap.night).toBe(2);
    expect(snap.player.dash_cd_s).toBe(1.35);
    expect(snap.player.pulse_cd_s).toBe(1.333);
    expect(snap.drifters).toEqual([{ id: 'D1', pos: snap.drifters[0].pos, state: 'idle', stolen: 0 }]);
    expect(snap.charms).toEqual([{ id: 'C1', pos: [35, 0, 0], available: true, respawn_s: 0 }]);
  });

  it('writes state "paused" while paused: tick advances, sim_tick does not', () => {
    const out = parse(
      runHeadless({
        seed: 1,
        night: 1,
        scenario: quiet,
        timeline: new InputTimeline([
          { tick: 4, pause: true },
          { tick: 5, pause: false },
        ]),
        ticks: 20,
        snapshotEvery: 10,
      }),
    );
    expect(out.filter((o) => o.type === 'snapshot').map((o) => [o.tick, o.sim_tick, o.state])).toEqual([
      [0, 0, 'playing'],
      [10, 4, 'paused'],
      [20, 4, 'paused'],
    ]);
    expect(out.find((o) => o.name === 'paused')).toEqual({ type: 'event', tick: 5, name: 'paused', data: {} });
  });

  it('writes events as they happen, before that tick’s snapshot, and stops early on game over', () => {
    const out = parse(
      runHeadless({
        seed: 1,
        night: 1,
        scenario: { ...quiet, motes: [[0, 0, 0.5]], time_left_s: 0.25 },
        timeline: new InputTimeline([]),
        ticks: 1000,
        snapshotEvery: 10,
      }),
    );
    expect(out.map((o) => `${o.type}:${o.name ?? ''}:${o.tick ?? o.ticks}`)).toEqual([
      'snapshot::0',
      'event:night_start:0',
      'event:mote_picked:1',
      'snapshot::10',
      'event:game_over:15',
      'snapshot::15',
      'end::15',
    ]);
    expect(out[4].data).toEqual({ result: 'lost', reason: 'dawn' });
    expect(out.at(-1)).toEqual({ type: 'end', ticks: 15, state: 'lost', score: 0 });
  });

  it('is deterministic: same seed and inputs give identical lines', () => {
    const cfg = (night: 1 | 2 | 3) => ({ seed: 42, night, timeline: new InputTimeline([{ tick: 0, move: [0.3, 1] as [number, number] }]), ticks: 3000, snapshotEvery: 10 });
    for (const n of [1, 2, 3] as const) expect(runHeadless(cfg(n))).toEqual(runHeadless(cfg(n)));
  });
});
