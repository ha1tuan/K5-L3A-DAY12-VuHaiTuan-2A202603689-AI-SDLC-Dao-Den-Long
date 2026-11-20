import type { ControlState } from '../sim';

/** One frame of a contract inputs file (§C); absent fields keep their previous value. */
export interface InputFrame {
  tick: number;
  move?: [number, number];
  cam_yaw_deg?: number;
  jump?: boolean;
  interact?: boolean;
  pulse?: boolean;
  dash?: boolean;
}

const DEFAULT: ControlState = { move: [0, 0], camYawDeg: 0, jump: false, interact: false, pulse: false };

/** Held control state at any tick, built from frames with strictly increasing ticks. */
export class InputTimeline {
  private readonly ticks: number[] = [];
  private readonly states: ControlState[] = [];

  constructor(frames: InputFrame[]) {
    let cur = DEFAULT;
    for (const f of frames) {
      cur = {
        move: f.move ? [f.move[0], f.move[1]] : cur.move,
        camYawDeg: f.cam_yaw_deg ?? cur.camYawDeg,
        jump: f.jump ?? cur.jump,
        interact: f.interact ?? cur.interact,
        pulse: f.pulse ?? cur.pulse,
      };
      this.ticks.push(f.tick);
      this.states.push(cur);
    }
  }

  at(tick: number): ControlState {
    let lo = 0;
    let hi = this.ticks.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.ticks[mid] <= tick) {
        found = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return found < 0 ? DEFAULT : this.states[found];
  }
}
