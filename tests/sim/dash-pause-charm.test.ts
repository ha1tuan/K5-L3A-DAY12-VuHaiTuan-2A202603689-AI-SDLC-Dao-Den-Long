import { describe, expect, it } from 'vitest';
import { named, once, press, quietSim, run } from './helpers';

describe('F-01 Lướt', () => {
  it('AC-01.1: standing still facing +Z, dash moves 2.8 m along +Z in 12 ticks and emits dash {}', () => {
    const sim = quietSim();
    expect(press(sim, 'dash')).toEqual([{ tick: 1, name: 'dash', data: {} }]);
    run(sim, 10);
    expect(sim.state.player.pos[2]).toBeCloseTo(2.8, 9);
    run(sim, 5);
    expect(sim.state.player.pos[2]).toBeCloseTo(2.8, 9);
  });

  it('dashes along the direction of movement when moving', () => {
    const sim = quietSim();
    once(sim, { dash: true, move: [1, 0] });
    run(sim, 11);
    expect(sim.state.player.pos[0]).toBeCloseTo(2.8, 9);
  });

  it('AC-01.2: pressing again within 90 ticks of the start does nothing; 90 ticks later it works', () => {
    const sim = quietSim();
    const ticks: number[] = [];
    for (let k = 0; k < 120; k++) for (const e of once(sim, { dash: k === 0 || k === 88 || k === 90 })) ticks.push(e.tick);
    expect(ticks).toEqual([1, 91]);
  });

  it('AC-01.3: a dash in the air keeps Y for its 12 ticks', () => {
    const sim = quietSim();
    once(sim, { jump: true });
    run(sim, 9);
    const y = sim.state.player.pos[1];
    once(sim, { dash: true });
    run(sim, 11);
    expect(sim.state.player.pos[1]).toBe(y);
    run(sim, 1);
    expect(sim.state.player.pos[1]).toBeLessThan(y);
  });

  it('AC-01.4: dashing gives no invulnerability', () => {
    const sim = quietSim({ shades: [{ pos: [0, 1, 1.2] }] });
    expect(named(once(sim, { dash: true }), 'player_hit')).toHaveLength(1);
  });
});

describe('F-05 Tạm dừng', () => {
  it('AC-05.1: pause emits paused {}; tick keeps counting but sim tick, clock, cooldowns and spawns freeze', () => {
    const sim = quietSim({ player: { carried: 3 } });
    once(sim, { pulse: true }); // pulse cooldown 180
    expect(press(sim, 'pause')).toEqual([{ tick: 2, name: 'paused', data: {} }]);
    const frozen = { sim: sim.state.simTick, clock: sim.state.timeLeftS, cd: sim.state.player.pulseCooldownTicks };
    run(sim, 100, { move: [1, 0] });
    expect(sim.state.tick).toBe(103);
    expect(sim.state.paused).toBe(true);
    expect({ sim: sim.state.simTick, clock: sim.state.timeLeftS, cd: sim.state.player.pulseCooldownTicks }).toEqual(frozen);
    expect(sim.state.player.pos[0]).toBe(0);
  });

  it('AC-05.2: pressing pause again emits resumed {} and every counter carries on from where it stopped', () => {
    const sim = quietSim();
    press(sim, 'pause');
    run(sim, 50);
    expect(once(sim, { pause: true })).toEqual([{ tick: 53, name: 'resumed', data: {} }]);
    expect(sim.state.simTick).toBe(1);
    expect(sim.state.timeLeftS).toBeCloseTo(240 - 1 / 60, 9);
  });
});

describe('F-03 Bùa Gió', () => {
  const charmSim = () => quietSim({ player: { pos: [34.5, 0, 0] }, charms: [{ id: 'C1' }] }, 2);

  it('AC-03.1: picking it up emits charm_picked {charm_id, charm_ticks: 600} and starts the 45 s respawn', () => {
    const sim = charmSim();
    expect(once(sim)).toEqual([{ tick: 1, name: 'charm_picked', data: { charm_id: 'C1', charm_ticks: 600 } }]);
    expect(sim.state.charms[0]).toMatchObject({ available: false, respawnTicks: 2700 });
  });

  it('AC-03.2: runs 7.2 m/s while active, back to 6 m/s after 600 ticks', () => {
    const sim = charmSim();
    once(sim);
    run(sim, 1, { move: [0, 1] });
    expect(sim.state.player.vel[2]).toBeCloseTo(7.2, 9);
    run(sim, 598, { move: [0, 1] });
    expect(sim.state.player.vel[2]).toBeCloseTo(7.2, 9); // tick 600: still the 600th charmed tick
    run(sim, 1, { move: [0, 1] });
    expect(sim.state.player.vel[2]).toBeCloseTo(6, 9);
  });

  it('AC-03.3: two dashes 12 ticks apart both work; a press during a dash is ignored', () => {
    const sim = quietSim({ player: { charm_ticks: 600 } });
    const ticks: number[] = [];
    for (let k = 0; k < 30; k++) for (const e of once(sim, { dash: k === 0 || k === 6 || k === 12 })) ticks.push(e.tick);
    expect(ticks).toEqual([1, 13]);
  });

  it('AC-03.4: comes back after exactly 2700 ticks', () => {
    const sim = charmSim();
    once(sim);
    run(sim, 60, { move: [-1, 0] }); // step off the charm
    run(sim, 2639);
    expect(sim.state.charms[0].available).toBe(false); // tick 2700
    run(sim, 1); // tick 2701 = picked at 1 + 2700
    expect(sim.state.charms[0].available).toBe(true);
  });
});
