import { describe, expect, it } from 'vitest';
import { runHeadless } from '../../src/headless/run';
import { InputTimeline } from '../../src/headless/timeline';

const quiet = { random_motes: false, random_shades: false } as const;
const parse = (lines: string[]) => lines.map((l) => JSON.parse(l));

describe('runHeadless JSONL output', () => {
  it('writes a snapshot at tick 0 and every snapshotEvery ticks, then the end line', () => {
    const out = parse(runHeadless({ seed: 1, night: 1, scenario: quiet, timeline: new InputTimeline([]), ticks: 20, snapshotEvery: 10 }));
    expect(out.map((o) => [o.type, o.tick ?? o.ticks])).toEqual([
      ['snapshot', 0],
      ['snapshot', 10],
      ['snapshot', 20],
      ['end', 20],
    ]);
    expect(out[3]).toEqual({ type: 'end', ticks: 20, state: 'playing', score: 0 });
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
      time_left_s: 300,
      score: 0,
      player: { pos: [0, 0, 0], flames: 3, carried: 0 },
      lanterns: [
        { id: 'L1', pos: [0, 0, 25], lit: false, deposited: 0 },
        { id: 'L2', pos: [23.776, 0, 7.725], lit: false, deposited: 0 },
        { id: 'L3', pos: [14.695, 0, -20.225], lit: false, deposited: 0 },
        { id: 'L4', pos: [-14.695, 0, -20.225], lit: false, deposited: 0 },
        { id: 'L5', pos: [-23.776, 0, 7.725], lit: false, deposited: 0 },
      ],
      shades: [{ id: 'S1', pos: [10, 1, 0], state: 'chase' }],
      motes_active: 1,
      motes: [{ id: 'M1', pos: [1.235, 0, 2] }],
    });
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
      'event:mote_picked:1',
      'snapshot::10',
      'event:game_over:15',
      'snapshot::15',
      'end::15',
    ]);
    expect(out[3].data).toEqual({ result: 'lost', reason: 'dawn' });
    expect(out.at(-1)).toEqual({ type: 'end', ticks: 15, state: 'lost', score: 10 });
  });

  it('is deterministic: same seed and inputs give identical lines', () => {
    const cfg = () => ({ seed: 42, night: 1 as const, timeline: new InputTimeline([{ tick: 0, move: [0.3, 1] as [number, number] }]), ticks: 3000, snapshotEvery: 10 });
    expect(runHeadless(cfg())).toEqual(runHeadless(cfg()));
  });
});
