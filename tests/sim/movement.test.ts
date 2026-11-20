import { describe, expect, it } from 'vitest';
import { IDLE, press, quietSim, run } from './helpers';

describe('Mây movement', () => {
  it('walks player_speed (6 m/s) along +Z when move is [0, 1] at yaw 0', () => {
    const sim = quietSim();
    run(sim, 60, { move: [0, 1] });
    expect(sim.state.player.pos[0]).toBeCloseTo(0, 6);
    expect(sim.state.player.pos[2]).toBeCloseTo(6, 6);
  });

  it('rotates move by cam_yaw_deg: [0, 1] at 90° walks along +X', () => {
    const sim = quietSim();
    run(sim, 60, { move: [0, 1], camYawDeg: 90 });
    expect(sim.state.player.pos[0]).toBeCloseTo(6, 6);
    expect(sim.state.player.pos[2]).toBeCloseTo(0, 6);
  });

  it('normalizes a diagonal move so speed never exceeds player_speed', () => {
    const sim = quietSim();
    run(sim, 60, { move: [1, 1] });
    expect(sim.state.player.pos[0]).toBeCloseTo(6 / Math.SQRT2, 6);
    expect(sim.state.player.pos[2]).toBeCloseTo(6 / Math.SQRT2, 6);
  });

  it('keeps a slow move slow: [0, 0.5] walks 3 m in one second', () => {
    const sim = quietSim();
    run(sim, 60, { move: [0, 0.5] });
    expect(sim.state.player.pos[2]).toBeCloseTo(3, 6);
  });

  it('cannot leave the island: stops at the 40 m edge', () => {
    const sim = quietSim();
    run(sim, 60 * 10, { move: [1, 0] });
    expect(sim.state.player.pos[0]).toBeCloseTo(40, 6);
  });

  it('jumps on a rising edge only, then lands back on Y = 0', () => {
    const sim = quietSim();
    sim.step({ ...IDLE, jump: true });
    run(sim, 5, { jump: true }); // still held: no second jump
    expect(sim.state.player.pos[1]).toBeGreaterThan(0);
    run(sim, 120, { jump: true });
    expect(sim.state.player.pos[1]).toBe(0);
    run(sim, 1); // release
    press(sim, 'jump');
    expect(sim.state.player.pos[1]).toBeGreaterThan(0);
  });
});
