import { describe, expect, it } from 'vitest';
import { distXZ } from '../../src/sim/geometry';
import type { Scenario, SimState, Vec3 } from '../../src/sim';
import { named, once, press, quietSim, run } from './helpers';

// Night 1: L1 stands at (0, 0, 25). Mây starts at the origin, 25 m away, unless moved.
const L1: Vec3 = [0, 0, 25];
const lantern = (s: Readonly<SimState>, id = 'L1') => s.lanterns.find((l) => l.id === id)!;
const drainSim = (fuel: number, shades: Scenario['shades'], player: Scenario['player'] = {}) =>
  quietSim({ player, lanterns: [{ id: 'L1', lit: true, fuel }], shades });

describe('Đèn yếu (PRD v3 §5.2, A49)', () => {
  it('AC-08: fuel 30 keeps its safe zone and is not a drain target', () => {
    const sim = drainSim(30, [
      { id: 'S1', pos: [0, 1, 30], state: 'wander' },
      { id: 'S2', pos: [0, 1, 33], state: 'wander' },
    ]);
    run(sim, 1);
    const [s1, s2] = sim.state.shades;
    expect(distXZ(s1.pos, L1)).toBeCloseTo(5.2, 9); // pushed out of the zone
    expect(s2.targetLanternId).toBeNull();
    expect(sim.state.shades.map((x) => x.state)).toEqual(['wander', 'wander']);
  });

  it('a weak lantern has no safe zone: a shade inside it is not pushed', () => {
    const sim = drainSim(20, [{ id: 'S1', pos: [0, 1, 30], state: 'stunned', state_ticks_left: 100 }]);
    run(sim, 5);
    expect(sim.state.shades[0].pos).toEqual([0, 1, 30]);
  });

  it('a wandering shade heads for the nearest weak lantern at wander speed and drains it within 2 m', () => {
    const sim = drainSim(20, [{ id: 'S1', pos: [0, 1, 28], state: 'wander' }]);
    run(sim, 1);
    expect(sim.state.shades[0]).toMatchObject({ state: 'wander', targetLanternId: 'L1' });
    expect(distXZ(sim.state.shades[0].pos, L1)).toBeCloseTo(3 - 2 / 60, 9);
    run(sim, 28); // 2.033 m away after tick 29
    expect(sim.state.shades[0].state).toBe('wander');
    run(sim, 2);
    expect(sim.state.shades[0]).toMatchObject({ state: 'drain', targetLanternId: 'L1' });
    const at = [...sim.state.shades[0].pos];
    run(sim, 10);
    expect(sim.state.shades[0].pos).toEqual(at); // stands still while draining
  });

  it('ties between equally weak-and-near lanterns go to the lower id', () => {
    const sim = quietSim({
      lanterns: [
        { id: 'L1', pos: [10, 0, 0], lit: true, fuel: 10 },
        { id: 'L2', pos: [-10, 0, 0], lit: true, fuel: 10 },
      ],
      player: { pos: [0, 0, 30] },
      shades: [{ id: 'S1', pos: [0, 1, 0], state: 'wander' }],
    });
    run(sim, 1);
    expect(sim.state.shades[0].targetLanternId).toBe('L1');
  });
});

describe('Hút dầu (PRD v3 §5.2)', () => {
  const two = () =>
    drainSim(25, [
      { id: 'S1', pos: [0, 1, 23.5], state: 'drain', target_lantern_id: 'L1' },
      { id: 'S2', pos: [0.5, 1, 24], state: 'drain', target_lantern_id: 'L1' },
    ]);

  it('AC-09: two draining shades plus the burn take 11.0 fuel in 60 ticks', () => {
    const sim = two();
    run(sim, 60);
    expect(lantern(sim.state).fuelTicks).toBe(1500 - 660);
  });

  it('fuel_drain every 60 ticks per shade, counted from entering drain, with fuel after the tick', () => {
    const sim = two();
    const ev = named(run(sim, 120), 'fuel_drain');
    expect(ev).toEqual([
      { tick: 60, name: 'fuel_drain', data: { lantern_id: 'L1', shade_id: 'S1', fuel: 840 / 60 } },
      { tick: 60, name: 'fuel_drain', data: { lantern_id: 'L1', shade_id: 'S2', fuel: 840 / 60 } },
      { tick: 120, name: 'fuel_drain', data: { lantern_id: 'L1', shade_id: 'S1', fuel: 180 / 60 } },
      { tick: 120, name: 'fuel_drain', data: { lantern_id: 'L1', shade_id: 'S2', fuel: 180 / 60 } },
    ]);
  });

  it('drain → wander when the lantern goes out at step 2b', () => {
    const sim = drainSim(0.05, [{ id: 'S1', pos: [0, 1, 23.5], state: 'drain', target_lantern_id: 'L1' }]);
    expect(once(sim)).toEqual([{ tick: 1, name: 'lantern_out', data: { lantern_id: 'L1' } }]);
    expect(sim.state.shades[0]).toMatchObject({ state: 'wander', targetLanternId: null });
  });

  it('drain → chase when Mây comes within 6 m, but not at 7 m', () => {
    const near = drainSim(20, [{ id: 'S1', pos: [0, 1, 23.5], state: 'drain', target_lantern_id: 'L1' }], { pos: [0, 0, 18] });
    run(near, 1);
    expect(near.state.shades[0].state).toBe('chase');
    const far = drainSim(20, [{ id: 'S1', pos: [0, 1, 23.5], state: 'drain', target_lantern_id: 'L1' }], { pos: [0, 0, 16.4] });
    run(far, 1);
    expect(far.state.shades[0].state).toBe('drain');
  });

  it('AC-10: refuelling to ≥ 30 sends a drainer within 6 m to wander, pushes it to the rim within 30 ticks, harmlessly', () => {
    const sim = drainSim(20, [{ id: 'S1', pos: [0, 1, 23.5], state: 'drain', target_lantern_id: 'L1' }], { pos: [0, 0, 23], carried: 2 });
    const ev = once(sim, { interact: true });
    expect(names(ev)).toEqual(['refuel']);
    expect(sim.state.shades[0]).toMatchObject({ state: 'wander', targetLanternId: null });
    const later = run(sim, 29);
    expect(named(later, 'player_hit')).toEqual([]);
    expect(distXZ(sim.state.shades[0].pos, L1)).toBeGreaterThanOrEqual(6 - 1e-9);
  });

  it('AC-11: a pulse on a draining shade stuns it for 15 points in total', () => {
    const sim = drainSim(20, [{ id: 'S1', pos: [0, 1, 23.5], state: 'drain', target_lantern_id: 'L1' }], { pos: [0, 0, 21], carried: 3 });
    expect(named(press(sim, 'pulse'), 'pulse')[0].data).toEqual({ stunned_ids: ['S1'] });
    expect(sim.state.shades[0].state).toBe('stunned');
    expect(sim.state.score).toBe(15);
  });

  it('A42: a scenario drainer without a target drains the nearest lit lantern within 2 m, else wanders', () => {
    expect(drainSim(20, [{ id: 'S1', pos: [0, 1, 23.5], state: 'drain' }]).state.shades[0]).toMatchObject({ state: 'drain', targetLanternId: 'L1' });
    expect(drainSim(20, [{ id: 'S1', pos: [0, 1, 20], state: 'drain' }]).state.shades[0]).toMatchObject({ state: 'wander', targetLanternId: null });
  });
});

const names = (ev: { name: string }[]) => ev.map((e) => e.name);
