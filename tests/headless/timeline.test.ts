import { describe, expect, it } from 'vitest';
import { InputTimeline } from '../../src/headless/timeline';

describe('InputTimeline', () => {
  it('defaults to standing still with every button released before the first frame', () => {
    const t = new InputTimeline([{ tick: 5, move: [1, 0] }]);
    expect(t.at(0)).toEqual({ move: [0, 0], camYawDeg: 0, jump: false, interact: false, pulse: false });
    expect(t.at(4).move).toEqual([0, 0]);
    expect(t.at(5).move).toEqual([1, 0]);
  });

  it('only changes fields present in a frame; absent fields keep their previous value', () => {
    const t = new InputTimeline([
      { tick: 0, move: [0, 1], cam_yaw_deg: 90 },
      { tick: 120, move: [0, 0], interact: true },
      { tick: 121, interact: false },
    ]);
    expect(t.at(119)).toMatchObject({ move: [0, 1], camYawDeg: 90, interact: false });
    expect(t.at(120)).toMatchObject({ move: [0, 0], camYawDeg: 90, interact: true });
    expect(t.at(121)).toMatchObject({ move: [0, 0], camYawDeg: 90, interact: false });
    expect(t.at(5000)).toMatchObject({ move: [0, 0], interact: false });
  });
});
