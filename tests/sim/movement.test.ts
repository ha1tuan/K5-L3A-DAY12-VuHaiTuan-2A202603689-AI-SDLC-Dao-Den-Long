import { describe, expect, it } from 'vitest';
import { named, once, quietSim, run } from './helpers';

describe('Mây chạy và nhảy (§3.1)', () => {
  it('runs 6 m/s at once on the ground: move [0,1] for 60 ticks reaches z = 6', () => {
    const sim = quietSim();
    run(sim, 60, { move: [0, 1] });
    expect(sim.state.player.pos[2]).toBeCloseTo(6, 9);
  });

  it('rotates move by cam_yaw_deg: yaw 90° turns [0,1] into +X', () => {
    const sim = quietSim();
    run(sim, 60, { move: [0, 1], camYawDeg: 90 });
    expect(sim.state.player.pos[0]).toBeCloseTo(6, 9);
    expect(sim.state.player.pos[2]).toBeCloseTo(0, 9);
  });

  it('jumps at 7 m/s under −20 m/s² and lands on tick 41 (only from the ground)', () => {
    const sim = quietSim();
    once(sim, { jump: true });
    run(sim, 39, { jump: true });
    expect(sim.state.player.pos[1]).toBeGreaterThan(0);
    expect(sim.state.player.grounded).toBe(false);
    run(sim, 1);
    expect(sim.state.player.pos[1]).toBe(0);
    expect(sim.state.player.grounded).toBe(true);
  });

  it('has limited air control: 0.2 m/s gained per tick (A19)', () => {
    const sim = quietSim();
    once(sim, { jump: true });
    run(sim, 10, { move: [1, 0] });
    expect(sim.state.player.vel[0]).toBeCloseTo(2, 9);
    expect(sim.state.player.pos[0]).toBeCloseTo(11 / 60, 9);
  });
});

describe('Rơi khỏi đảo (§3.7)', () => {
  it('walking off the edge falls; below Y −10 costs a flame and every carried mote, even while invulnerable', () => {
    const sim = quietSim({ player: { pos: [39.9, 0, 0], carried: 4, invuln_ticks: 500 } });
    const events = run(sim, 62, { move: [1, 0] });
    expect(named(events, 'player_hit')).toEqual([
      { tick: 62, name: 'player_hit', data: { by: 'fall', flames: 2, dropped: 0, lost: 4 } },
    ]);
    expect(sim.state.player.carried).toBe(0);
  });

  it('waits 60 ticks, then respawns at the start with zero velocity and 90 ticks of invulnerability', () => {
    const sim = quietSim({ player: { pos: [39.9, 0, 0] } });
    run(sim, 62, { move: [1, 0] });
    run(sim, 59);
    expect(sim.state.player.pos[1]).toBeLessThan(-10);
    run(sim, 1);
    expect(sim.state.player.pos).toEqual([0, 0, 0]);
    expect(sim.state.player.vel).toEqual([0, 0, 0]);
    expect(sim.state.player.invulnTicks).toBe(90);
  });

  it('falling with the last flame loses at once (no_flames), no respawn', () => {
    const sim = quietSim({ player: { pos: [39.9, 0, 0], flames: 1 } });
    const events = run(sim, 80, { move: [1, 0] });
    expect(named(events, 'game_over')).toEqual([
      { tick: 62, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } },
    ]);
  });
});
