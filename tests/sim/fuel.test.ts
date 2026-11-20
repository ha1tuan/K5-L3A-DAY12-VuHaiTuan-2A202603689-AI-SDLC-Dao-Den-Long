import { describe, expect, it } from 'vitest';
import { CONTRACT_TUNING, type SimState } from '../../src/sim';
import { named, press, quietSim, run } from './helpers';

const L = (id: string) => (s: Readonly<SimState>) => s.lanterns.find((l) => l.id === id)!;

describe('Contract v1.2 (PRD v3 §6)', () => {
  it('adds the fuel tuning keys and the new night durations', () => {
    expect(CONTRACT_TUNING).toMatchObject({
      fuel_max: 100,
      fuel_decay_per_s: 1.0,
      fuel_per_mote: 10,
      relight_cost: 5,
      win_ratio: 0.6,
      drain_per_s: 5,
      low_fuel_threshold: 30,
      capacity_max: 20,
      night1_duration_s: 240,
      night2_duration_s: 270,
      night3_duration_s: 300,
    });
  });
});

describe('Dầu đèn (PRD v3 §5.1)', () => {
  it('AC-01: a freshly lit lantern has full fuel and lantern_lit.relight = false', () => {
    const sim = quietSim({ player: { pos: [0, 0, 23], carried: 10 } });
    const lit = named(press(sim, 'interact'), 'lantern_lit');
    expect(lit).toEqual([{ tick: 1, name: 'lantern_lit', data: { lantern_id: 'L1', relight: false } }]);
    // Lit at tick 1; tick 2 burns one unit.
    expect(L('L1')(sim.state)).toMatchObject({ lit: true, fuelTicks: 6000 - 1, everLit: true, relitCount: 0 });
  });

  it('AC-02: a lit lantern with no shades burns 1.0 fuel per 60 ticks', () => {
    const sim = quietSim({ lanterns: [{ id: 'L1', lit: true, fuel: 100 }] });
    run(sim, 60);
    expect(L('L1')(sim.state).fuelTicks).toBe(5940);
  });

  it('AC-06: fuel 0.01 goes out at step 2 of the next tick with lantern_out, deposited 0, ever_lit true', () => {
    const sim = quietSim({ lanterns: [{ id: 'L1', lit: true, fuel: 0.01, deposited: 10 }] });
    expect(run(sim, 1)).toEqual([{ tick: 1, name: 'lantern_out', data: { lantern_id: 'L1' } }]);
    expect(L('L1')(sim.state)).toMatchObject({ lit: false, fuelTicks: 0, deposited: 0, everLit: true });
    expect(run(sim, 5)).toEqual([]);
  });

  it('AC-17: a scenario lantern lit without fuel starts full and is ever_lit', () => {
    const sim = quietSim({ lanterns: [{ id: 'L2', lit: true }] });
    expect(L('L2')(sim.state)).toMatchObject({ lit: true, fuelTicks: 6000, everLit: true, relitCount: 0 });
    expect(L('L1')(sim.state)).toMatchObject({ lit: false, fuelTicks: 0, everLit: false });
  });

  it('scenario fuel is stored in whole 1/60 units, rounded up and kept in [1, 6000]', () => {
    const sim = quietSim({
      lanterns: [
        { id: 'L1', lit: true, fuel: 37.5 },
        { id: 'L2', lit: true, fuel: 0 },
        { id: 'L3', lit: true, fuel: 250 },
        { id: 'L4', lit: false, ever_lit: true },
      ],
    });
    expect(sim.state.lanterns.map((l) => [l.fuelTicks, l.everLit])).toEqual([
      [2250, true],
      [1, true],
      [6000, true],
      [0, true],
      [0, false],
    ]);
  });

  it('a paused night burns no fuel', () => {
    const sim = quietSim({ lanterns: [{ id: 'L1', lit: true }] });
    press(sim, 'pause');
    run(sim, 30);
    expect(L('L1')(sim.state).fuelTicks).toBe(6000);
  });
});
