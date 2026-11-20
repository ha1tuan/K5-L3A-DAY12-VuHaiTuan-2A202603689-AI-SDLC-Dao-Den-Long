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

  it.each([
    ['not an object', []],
    ['pos not a 3-vector', { player: { pos: [0, 0] } }],
    ['negative carried', { player: { carried: -1 } }],
    ['random_motes not boolean', { random_motes: 'no' }],
    ['shade without pos', { shades: [{ id: 'S9' }] }],
    ['lantern without id', { lanterns: [{ lit: true }] }],
    ['time_left_s negative', { time_left_s: -5 }],
  ])('rejects %s', (_label, json) => {
    expect(() => parseScenario(json)).toThrow(ContractFormatError);
  });
});
