import { describe, expect, it } from 'vitest';
import { ContractFormatError, parseInputs, parseScenario } from '../../src/headless/parse';

describe('parseInputs', () => {
  it('accepts the contract example', () => {
    const frames = parseInputs({
      frames: [
        { tick: 0, move: [0, 1], cam_yaw_deg: 0 },
        { tick: 120, move: [0, 0], interact: true },
        { tick: 121, interact: false },
        { tick: 200, pulse: true },
        { tick: 201, pulse: false },
      ],
    });
    expect(frames).toHaveLength(5);
  });

  it.each([
    ['not an object', 42],
    ['frames missing', {}],
    ['ticks not strictly increasing', { frames: [{ tick: 5 }, { tick: 5 }] }],
    ['ticks decreasing', { frames: [{ tick: 5 }, { tick: 3 }] }],
    ['negative tick', { frames: [{ tick: -1 }] }],
    ['fractional tick', { frames: [{ tick: 1.5 }] }],
    ['move out of [-1, 1]', { frames: [{ tick: 0, move: [0, 2] }] }],
    ['move wrong length', { frames: [{ tick: 0, move: [0] }] }],
    ['button not boolean', { frames: [{ tick: 0, pulse: 1 }] }],
    ['yaw not a number', { frames: [{ tick: 0, cam_yaw_deg: 'north' }] }],
    ['dash not boolean', { frames: [{ tick: 0, dash: 'yes' }] }],
    ['pause not boolean', { frames: [{ tick: 0, pause: 1 }] }],
  ])('rejects %s', (_label, json) => {
    expect(() => parseInputs(json)).toThrow(ContractFormatError);
  });
});

describe('parseScenario', () => {
  it('accepts the contract example', () => {
    const sc = parseScenario({
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [[0, 0, 5]],
      shades: [{ pos: [10, 0, 0] }],
      lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 0 }],
      time_left_s: 300,
    });
    expect(sc.motes).toEqual([[0, 0, 5]]);
  });

  it('accepts the v1.2 player and shade fields', () => {
    const sc = parseScenario({ player: { successful_lights: 3 }, shades: [{ id: 'S1', pos: [0, 1, 0], state: 'drain', target_lantern_id: 'L2' }] });
    expect(sc.player?.successful_lights).toBe(3);
    expect(sc.shades?.[0]).toEqual({ id: 'S1', pos: [0, 1, 0], state: 'drain', target_lantern_id: 'L2' });
    expect(() => parseScenario({ shades: [{ pos: [0, 1, 0], target_lantern_id: 2 }] })).toThrow(ContractFormatError);
  });

  it('accepts the v1.2 lantern fields', () => {
    const sc = parseScenario({ lanterns: [{ id: 'L1', lit: true, fuel: 37.5, ever_lit: true }, { id: 'L2', lit: true }] });
    expect(sc.lanterns).toEqual([
      { id: 'L1', pos: undefined, deposited: undefined, lit: true, fuel: 37.5, ever_lit: true },
      { id: 'L2', pos: undefined, deposited: undefined, lit: true, fuel: undefined, ever_lit: undefined },
    ]);
  });

  it.each([
    ['fuel not a number', { lanterns: [{ id: 'L1', fuel: '50' }] }],
    ['negative fuel', { lanterns: [{ id: 'L1', fuel: -1 }] }],
    ['ever_lit not boolean', { lanterns: [{ id: 'L1', ever_lit: 1 }] }],
  ])('rejects %s', (_label, json) => {
    expect(() => parseScenario(json)).toThrow(ContractFormatError);
  });

  it('accepts the v1.1 additions', () => {
    const sc = parseScenario({
      player: { invuln_ticks: 10, dash_cd_ticks: 20, pulse_cd_ticks: 30, charm_ticks: 40 },
      shades: [{ id: 'S1', pos: [5, 1, 0], state: 'stunned', state_ticks_left: 7 }],
      drifters: [{ id: 'D1', pos: [1, 1, 1], state: 'flee', stolen: 3 }],
      charms: [{ id: 'C1', available: false, respawn_ticks: 100 }],
      random_drifters: false,
      wind_enabled: true,
    });
    expect(sc.player).toMatchObject({ invuln_ticks: 10, dash_cd_ticks: 20, pulse_cd_ticks: 30, charm_ticks: 40 });
    expect(sc.shades?.[0]).toEqual({ id: 'S1', pos: [5, 1, 0], state: 'stunned', state_ticks_left: 7 });
    expect(sc.drifters?.[0]).toEqual({ id: 'D1', pos: [1, 1, 1], state: 'flee', stolen: 3 });
    expect(sc.charms?.[0]).toEqual({ id: 'C1', pos: undefined, available: false, respawn_ticks: 100 });
    expect([sc.random_drifters, sc.wind_enabled]).toEqual([false, true]);
  });

  it.each([
    ['not an object', []],
    ['pos not a 3-vector', { player: { pos: [0, 0] } }],
    ['negative carried', { player: { carried: -1 } }],
    ['random_motes not boolean', { random_motes: 'no' }],
    ['shade without pos', { shades: [{ id: 'S9' }] }],
    ['lantern without id', { lanterns: [{ lit: true }] }],
    ['time_left_s negative', { time_left_s: -5 }],
    ['unknown shade state', { shades: [{ pos: [0, 1, 0], state: 'asleep' }] }],
    ['unknown drifter state', { drifters: [{ pos: [0, 1, 0], state: 'removed' }] }],
    ['charm without id', { charms: [{ available: true }] }],
    ['wind_enabled not boolean', { wind_enabled: 1 }],
    ['negative charm_ticks', { player: { charm_ticks: -1 } }],
  ])('rejects %s', (_label, json) => {
    expect(() => parseScenario(json)).toThrow(ContractFormatError);
  });
});
