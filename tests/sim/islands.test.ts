import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim';
import { named, once, quietSim, run } from './helpers';

const r = (p: number[], cx = 0, cz = 0) => Math.hypot(p[0] - cx, p[2] - cz);

describe('F-04 Đêm 2 và Đêm 3 (AC-04.1, AC-04.2)', () => {
  it('Night 2 – Đảo Cau: 6 lanterns, 270 s (v1.2), full flames, 20 motes over both islands, night_start {night: 2}', () => {
    const sim = createSim({ seed: 2, night: 2 });
    const s = sim.state;
    expect(s.lanterns.map((l) => l.pos)).toEqual([
      [0, 0, 20],
      [17, 0, -10],
      [-17, 0, -10],
      [70, 0, 20],
      [87, 0, -10],
      [53, 0, -10],
    ]);
    expect([s.timeLeftS, s.player.flames, s.motes.length]).toEqual([270, 3, 20]);
    expect(s.charms.map((c) => [c.id, ...c.pos])).toEqual([['C1', 35, 0, 0]]);
    expect(sim.step({ move: [0, 0], camYawDeg: 0, jump: false, interact: false, pulse: false })[0].data).toEqual({ night: 2 });
  });

  it('Night 3 – Đảo Chuông: 7 lanterns on three tiers, 300 s (v1.2), motes on tiers at Y 0 / 3 / 6, two charms', () => {
    const s = createSim({ seed: 2, night: 3 }).state;
    expect(s.lanterns.map((l) => l.pos)).toEqual([
      [0, 6, 6],
      [18, 3, 10],
      [-18, 3, 10],
      [35, 0, -10],
      [-35, 0, -10],
      [20, 0, -35],
      [-20, 0, -35],
    ]);
    expect([s.timeLeftS, s.player.flames, s.motes.length]).toEqual([300, 3, 20]);
    expect(new Set(s.motes.map((m) => m.pos[1])).size).toBeGreaterThan(1);
    expect(s.motes.every((m) => [0, 3, 6].includes(m.pos[1]))).toBe(true);
    expect(s.charms.map((c) => c.id)).toEqual(['C1', 'C2']);
  });
});

describe('Đêm 2: cầu tre và bục nhảy (§4.2)', () => {
  it('stepping off the bamboo bridge (|z| > 2) falls into the clouds', () => {
    // off the bridge on tick 20 (z = 2.05), below Y −10 sixty ticks later
    const sim = quietSim({ player: { pos: [35, 0, 0.05] } }, 2);
    const hits = named(run(sim, 90, { move: [0, 1] }), 'player_hit');
    expect(hits).toEqual([{ tick: 80, name: 'player_hit', data: { by: 'fall', flames: 2, dropped: 0, lost: 0 } }]);
  });

  it('the pad at (20,0,18) throws Mây onto island B; the one at (50,0,−18) back onto island A', () => {
    for (const [from, island] of [
      [[20, 0, 18], 70],
      [[50, 0, -18], 0],
    ] as const) {
      const sim = quietSim({ player: { pos: [...from] } }, 2);
      const events = run(sim, 120, { move: [1, 0] });
      expect(named(events, 'player_hit')).toEqual([]);
      expect(sim.state.player.grounded).toBe(true);
      expect(r(sim.state.player.pos, island)).toBeLessThan(28);
    }
  });

  it('movement keys do not override the launch velocity', () => {
    const sim = quietSim({ player: { pos: [20, 0, 18] } }, 2);
    run(sim, 1);
    const v = [...sim.state.player.vel];
    run(sim, 20, { move: [-1, 0] });
    expect([sim.state.player.vel[0], sim.state.player.vel[2]]).toEqual([v[0], v[2]]);
  });
});

describe('Đêm 3: tầng, vách, dốc, tháp (§4.3)', () => {
  it('a cliff cannot be walked up', () => {
    const sim = quietSim({ player: { pos: [0, 0, 10] } }, 3);
    run(sim, 60, { move: [0, 1] });
    expect(sim.state.player.pos[2]).toBeLessThanOrEqual(12);
    expect(sim.state.player.pos[1]).toBe(0);
  });

  it('the ramp at 30° leads from tier 0 up to tier 1 (Y 3)', () => {
    const u = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)];
    const sim = quietSim({ player: { pos: [31 * u[0], 0, 31 * u[1]] } }, 3);
    run(sim, 100, { move: [-u[0], -u[1]] });
    expect(r(sim.state.player.pos)).toBeCloseTo(21, 6);
    expect(sim.state.player.pos[1]).toBe(3);
    expect(sim.state.player.grounded).toBe(true);
  });

  it('stepping off a tier drops to the tier below without losing a flame', () => {
    const sim = quietSim({ player: { pos: [5, 3, 12.5] } }, 3); // away from the pad at (0,3,13)
    const events = run(sim, 60, { move: [0, -1] });
    expect(named(events, 'player_hit')).toEqual([]);
    expect(sim.state.player.pos[1]).toBe(0);
  });

  it('the bell tower blocks the way on tier 2', () => {
    const sim = quietSim({ player: { pos: [0, 6, 4] } }, 3);
    run(sim, 60, { move: [0, -1] });
    expect(sim.state.player.pos[2]).toBeGreaterThanOrEqual(2);
    expect(sim.state.player.pos[1]).toBe(6);
  });

  it('the pad at (0,3,13) lands Mây on tier 2', () => {
    const sim = quietSim({ player: { pos: [0, 3, 13] } }, 3);
    run(sim, 90);
    expect(sim.state.player.pos[1]).toBe(6);
    expect(r(sim.state.player.pos)).toBeLessThanOrEqual(8);
    expect(r(sim.state.player.pos)).toBeGreaterThan(2);
  });

  it('a shade over a higher tier cannot touch Mây below (height difference > 1.5 m)', () => {
    const sim = quietSim({ player: { pos: [0, 0, 11.5] }, shades: [{ pos: [0, 4, 12.3] }] }, 3);
    expect(run(sim, 1)).toEqual([]);
  });

  it('Night 3 shades fly 4.5 m/s', () => {
    const sim = quietSim({ shades: [{ pos: [10, 1, -30] }] }, 3);
    run(sim, 1);
    expect(sim.state.shades[0].pos[0]).toBeCloseTo(10 - 4.5 / 60, 9);
  });
});

describe('F-02 Gió Lạc', () => {
  it('AC-02.1: never on Night 1; on Night 2 arrives at ticks 1200 and 2400, never more than 2 alive', () => {
    expect(createSim({ seed: 1, night: 1, scenario: { random_shades: false } }).state.drifters).toEqual([]);
    const n1 = createSim({ seed: 1, night: 1, scenario: { random_shades: false, player: { flames: 999 } } });
    run(n1, 1200);
    expect(n1.state.drifters).toEqual([]);
    const sim = quietSim({ random_drifters: true }, 2);
    run(sim, 1199);
    expect(sim.state.drifters).toHaveLength(0);
    run(sim, 1);
    expect(sim.state.drifters.map((d) => [d.id, d.state])).toEqual([['D1', 'idle']]);
    run(sim, 2400);
    expect(sim.state.drifters.map((d) => d.id)).toEqual(['D1', 'D2']);
  });

  it('AC-02.2: carrying 4 at 10 m it stays idle; carrying 5 it chases on the same tick at 7 m/s', () => {
    const four = quietSim({ player: { carried: 4 }, drifters: [{ pos: [10, 1, 0] }] }, 2);
    run(four, 1);
    expect(four.state.drifters[0].state).toBe('idle');
    const five = quietSim({ player: { carried: 5 }, drifters: [{ pos: [10, 1, 0] }] }, 2);
    run(five, 1);
    expect(five.state.drifters[0].state).toBe('chase');
    expect(five.state.drifters[0].pos[0]).toBeCloseTo(10 - 7 / 60, 9);
  });

  it('AC-02.3: touching Mây carrying 7 steals 3, then it flees and vanishes after 240 ticks', () => {
    const sim = quietSim({ player: { carried: 7 }, drifters: [{ pos: [0.5, 1, 0], state: 'chase' }] }, 2);
    expect(run(sim, 1)).toEqual([{ tick: 1, name: 'drifter_steal', data: { drifter_id: 'D1', amount: 3, carried: 4 } }]);
    expect(sim.state.drifters[0]).toMatchObject({ state: 'flee', stolen: 3 });
    run(sim, 239);
    expect(sim.state.drifters[0].state).toBe('flee');
    run(sim, 1);
    expect(sim.state.drifters[0].state).toBe('removed');
  });

  it('AC-02.4: invulnerability and a lit safe zone do not stop it; flames are untouched', () => {
    const sim = quietSim(
      { player: { pos: [0, 0, 22], carried: 6, invuln_ticks: 90 }, lanterns: [{ id: 'L1', lit: true }], drifters: [{ pos: [0, 1, 22.5], state: 'chase' }] },
      2,
    );
    sim.state.lanterns; // L1 of Night 2 sits at (0,0,20)
    expect(named(run(sim, 1), 'drifter_steal')).toHaveLength(1);
    expect(sim.state.player.flames).toBe(3);
  });

  it('AC-02.5: a pulse on a fleeing drifter with loot drops it all as dropped motes and it vanishes 120 ticks later', () => {
    const sim = quietSim({ player: { carried: 3 }, drifters: [{ pos: [2, 1, -30], state: 'flee', stolen: 3 }] }, 3);
    expect(named(once(sim, { pulse: true }), 'drifter_drop')).toEqual([
      { tick: 1, name: 'drifter_drop', data: { drifter_id: 'D1', amount: 3 } },
    ]);
    expect(sim.state.motes.map((m) => [m.kind, ...m.pos])).toEqual(Array(3).fill(['dropped', 2, 0, -30]));
    run(sim, 119);
    expect(sim.state.drifters[0].state).toBe('flee');
    run(sim, 1);
    expect(sim.state.drifters[0].state).toBe('removed');
  });

  it('a pulse on a chasing drifter makes it flee without stealing (no score)', () => {
    const sim = quietSim({ player: { carried: 8 }, drifters: [{ pos: [3, 1, 0], state: 'chase' }] }, 2);
    once(sim, { pulse: true });
    expect(sim.state.drifters[0]).toMatchObject({ state: 'flee', stolen: 0 });
    expect(sim.state.score).toBe(0);
  });

  it('AC-02.6: stealing resolves before a shade hit, which then drops half of what is left', () => {
    const sim = quietSim({ player: { carried: 7 }, drifters: [{ pos: [0.3, 1, 0], state: 'chase' }], shades: [{ pos: [0, 1, 0.5] }] }, 2);
    expect(run(sim, 1)).toEqual([
      { tick: 1, name: 'drifter_steal', data: { drifter_id: 'D1', amount: 3, carried: 4 } },
      { tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 2 } },
    ]);
  });
});

describe('F-09 Gió mạnh', () => {
  it('AC-09.1: a 5 s gust every 30 s pushes Mây 2 m/s along dir_deg', () => {
    const sim = quietSim({ wind_enabled: true, player: { flames: 999 } }, 3);
    run(sim, 1799);
    expect(sim.state.wind.active).toBe(false);
    const before = [...sim.state.player.pos];
    run(sim, 1);
    expect(sim.state.wind.active).toBe(true);
    const a = (sim.state.wind.dirDeg * Math.PI) / 180;
    expect(sim.state.player.pos[0] - before[0]).toBeCloseTo((2 * Math.cos(a)) / 60, 9);
    expect(sim.state.player.pos[2] - before[2]).toBeCloseTo((2 * Math.sin(a)) / 60, 9);
    run(sim, 299);
    expect(sim.state.wind.active).toBe(true);
    run(sim, 1);
    expect(sim.state.wind.active).toBe(false);
  });

  it('AC-09.2: wind_enabled false keeps wind.active false', () => {
    const sim = quietSim({ wind_enabled: false }, 3);
    for (let i = 0; i < 2000; i++) {
      run(sim, 1);
      expect(sim.state.wind.active).toBe(false);
    }
  });

  it('AC-09.3: the same seed gives the same dir_deg sequence, whatever else happens', () => {
    const dirs = (seed: number, randomMotes: boolean) => {
      const sim = createSim({ seed, night: 3, scenario: { random_motes: randomMotes, player: { flames: 999 } } });
      const out: number[] = [];
      for (let g = 1; g <= 3; g++) {
        run(sim, 1800 * g - sim.state.simTick);
        out.push(sim.state.wind.dirDeg);
      }
      return out;
    };
    expect(dirs(4, true)).toEqual(dirs(4, false));
    expect(dirs(4, true)).not.toEqual(dirs(5, true));
  });
});
