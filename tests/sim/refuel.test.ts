import { describe, expect, it } from 'vitest';
import type { SimState } from '../../src/sim';
import { named, once, press, quietSim, run } from './helpers';

const L = (s: Readonly<SimState>, id: string) => s.lanterns.find((l) => l.id === id)!;
const atL1 = (extra: object = {}) => ({ pos: [0, 0, 23] as [number, number, number], ...extra });

describe('Châm dầu (PRD v3 §5.1)', () => {
  it('AC-03: fuel 37.5 with 4 carried → refuel {amount 4, fuel 77.5}, carries 0, +20', () => {
    const sim = quietSim({ player: atL1({ carried: 4 }), lanterns: [{ id: 'L1', lit: true, fuel: 37.5 }] });
    const ev = once(sim, { interact: true });
    expect(ev).toEqual([{ tick: 1, name: 'refuel', data: { lantern_id: 'L1', amount: 4, fuel: (2250 - 1 + 2400) / 60 } }]);
    expect(sim.state.player.carried).toBe(0);
    expect(sim.state.score).toBe(20);
  });

  it('AC-04: fuel 95 with 3 carried uses only 1 mote and caps fuel at 100', () => {
    const sim = quietSim({ player: atL1({ carried: 3 }), lanterns: [{ id: 'L1', lit: true, fuel: 95 }] });
    expect(once(sim, { interact: true })).toEqual([{ tick: 1, name: 'refuel', data: { lantern_id: 'L1', amount: 1, fuel: 100 } }]);
    expect(L(sim.state, 'L1').fuelTicks).toBe(6000);
    expect(sim.state.player.carried).toBe(2);
    expect(sim.state.score).toBe(5);
  });

  it('AC-05: a full lantern is skipped and the interaction goes to the farther unlit one', () => {
    const sim = quietSim({
      player: { pos: [0, 0, 0], carried: 3 },
      lanterns: [
        { id: 'L1', pos: [0.5, 0, 0], lit: true, fuel: 100 },
        { id: 'L2', pos: [-1.5, 0, 0] },
      ],
    });
    expect(once(sim, { interact: true })).toEqual([{ tick: 1, name: 'deposit', data: { lantern_id: 'L2', amount: 3, deposited: 3 } }]);
  });

  it('A48: full means the exported fuel reads 100.0 (≥ 5997 units); 99.9 is not full', () => {
    // fuel 99.95 → 5997 at load, 5996 after the tick-1 burn: no longer full.
    const at = (fuel: number) => quietSim({ player: atL1({ carried: 1 }), lanterns: [{ id: 'L1', lit: true, fuel }] });
    expect(named(once(at(99.97), { interact: true }), 'refuel')).toEqual([]);
    expect(named(once(at(99.95), { interact: true }), 'refuel')).toHaveLength(1);
  });

  it('a lit lantern with nothing carried gets nothing', () => {
    expect(press(quietSim({ player: atL1(), lanterns: [{ id: 'L1', lit: true, fuel: 10 }] }), 'interact')).toEqual([]);
  });
});

describe('Thắp lại (PRD v3 §5.1)', () => {
  it('AC-07: an ever-lit dark lantern relights with 5 motes: fuel 100, relight true, relit_count +1, +40 +25', () => {
    const sim = quietSim({ player: atL1({ carried: 7 }), lanterns: [{ id: 'L1', ever_lit: true }] });
    expect(once(sim, { interact: true })).toEqual([
      { tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: 5, deposited: 5 } },
      { tick: 1, name: 'lantern_lit', data: { lantern_id: 'L1', relight: true } },
    ]);
    expect(L(sim.state, 'L1')).toMatchObject({ lit: true, fuelTicks: 6000, relitCount: 1, everLit: true });
    expect(sim.state.player.carried).toBe(2);
    expect(sim.state.score).toBe(65);
  });

  it('a lantern that burns out needs only 5 to relight; a never-lit one still needs 10', () => {
    const sim = quietSim({ player: atL1({ carried: 10 }), lanterns: [{ id: 'L1', lit: true, fuel: 0.01 }] });
    expect(named(once(sim), 'lantern_out')).toHaveLength(1);
    const ev = press(sim, 'interact');
    expect(named(ev, 'deposit')[0].data).toEqual({ lantern_id: 'L1', amount: 5, deposited: 5 });
    expect(named(ev, 'lantern_lit')[0].data).toEqual({ lantern_id: 'L1', relight: true });
  });
});

describe('Sức chứa tăng dần (PRD v3 §5.4)', () => {
  it('AC-16: capacity = min(20, 10 + 2 × successful_lights)', () => {
    expect(quietSim().state.player.capacity).toBe(10);
    expect(quietSim({ player: { successful_lights: 3 } }).state.player.capacity).toBe(16);
    expect(quietSim({ player: { successful_lights: 6 } }).state.player.capacity).toBe(20);
  });

  it('AC-17: scenario-lit lanterns do not count; every lighting or relighting in play does', () => {
    const sim = quietSim({
      player: atL1({ carried: 10 }),
      lanterns: [{ id: 'L1' }, { id: 'L2', lit: true }],
    });
    expect(sim.state.player.capacity).toBe(10);
    press(sim, 'interact');
    expect(sim.state.player.successfulLights).toBe(1);
    expect(sim.state.player.capacity).toBe(12);
  });

  it('picks up motes up to the current capacity', () => {
    const sim = quietSim({ player: { carried: 11, successful_lights: 1 }, motes: [[0, 0, 0], [0.1, 0, 0], [0.2, 0, 0]] });
    expect(named(run(sim, 1), 'mote_picked').map((e) => e.data)).toEqual([{ carried: 12 }]);
  });

  it('A39: a scenario carrying more than capacity keeps it but picks up nothing', () => {
    const sim = quietSim({ player: { carried: 15 }, motes: [[0, 0, 0]] });
    expect(run(sim, 2)).toEqual([]);
    expect(sim.state.player.carried).toBe(15);
  });
});
