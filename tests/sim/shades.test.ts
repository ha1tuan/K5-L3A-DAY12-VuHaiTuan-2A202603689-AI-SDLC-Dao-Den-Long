import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim';
import { named, quietSim, run } from './helpers';

describe('Bóng Mực (§3.6)', () => {
  it('first arrives at tick 300 (two of them), then one every 480 ticks, at most 6, ≥ 15 m from Mây', () => {
    const sim = createSim({ seed: 7, night: 1, scenario: { random_motes: false, player: { flames: 999 } } });
    const spawned = named(run(sim, 3000), 'shade_spawned').map((e) => [e.tick, (e.data as { id: string }).id]);
    expect(spawned).toEqual([
      [300, 'S1'],
      [300, 'S2'],
      [780, 'S3'],
      [1260, 'S4'],
      [1740, 'S5'],
      [2220, 'S6'],
    ]);
  });

  it('spawns in state spawning for 60 ticks, harmless and still, on a standard point at r = 37 m', () => {
    const sim = createSim({ seed: 7, night: 1, scenario: { random_motes: false } });
    run(sim, 300);
    const s1 = sim.state.shades[0];
    expect(s1.state).toBe('spawning');
    expect(Math.hypot(s1.pos[0], s1.pos[2])).toBeCloseTo(37, 9);
    expect(s1.pos[1]).toBe(1);
    run(sim, 59);
    expect(sim.state.shades[0].state).toBe('spawning');
    run(sim, 1);
    expect(sim.state.shades[0].state).toBe('wander');
  });

  it('a wandering shade starts chasing within 12 m, moving 4 m/s at Mây the same tick', () => {
    const sim = quietSim({ shades: [{ pos: [11, 1, 0], state: 'wander' }, { pos: [0, 1, 13], state: 'wander' }] });
    run(sim, 1);
    expect(sim.state.shades.map((s) => s.state)).toEqual(['chase', 'wander']);
    expect(sim.state.shades[0].pos[0]).toBeCloseTo(11 - 4 / 60, 9);
  });

  it('gives up the chase beyond 18 m', () => {
    const sim = quietSim({ shades: [{ pos: [18.5, 1, 0] }, { pos: [0, 1, 17] }] });
    run(sim, 1);
    expect(sim.state.shades.map((s) => s.state)).toEqual(['wander', 'chase']);
  });
});

describe('Bị chạm (§3.7)', () => {
  it('a shade within 1 m costs a flame, drops floor(carried/2) motes on a 1.5–2.5 m ring and gives 90 ticks of invulnerability', () => {
    const sim = quietSim({ player: { carried: 5 }, shades: [{ pos: [0.5, 1, 0] }] });
    expect(run(sim, 1)).toEqual([{ tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 2 } }]);
    const p = sim.state.player;
    expect(p.carried).toBe(3);
    expect(p.invulnTicks).toBe(90);
    const drops = sim.state.motes;
    expect(drops.map((m) => [m.kind, m.ttlTicks])).toEqual([
      ['dropped', 480],
      ['dropped', 480],
    ]);
    for (const m of drops) {
      const d = Math.hypot(m.pos[0], m.pos[2]);
      expect(d).toBeGreaterThanOrEqual(1.5);
      expect(d).toBeLessThanOrEqual(2.5);
    }
  });

  it('dropped motes vanish after 480 ticks', () => {
    const sim = quietSim({ player: { carried: 2, flames: 999 }, shades: [{ pos: [0.5, 1, 0] }] });
    run(sim, 480);
    expect(sim.state.motes).toHaveLength(1);
    run(sim, 1);
    expect(sim.state.motes).toHaveLength(0);
  });

  it('the hitting shade recoils 2 m over 60 ticks, then chases again', () => {
    const sim = quietSim({ shades: [{ pos: [0.5, 1, 0] }] });
    run(sim, 1);
    expect(sim.state.shades[0].state).toBe('recoil');
    run(sim, 60);
    // it chased 4/60 m (step 8) before touching Mây (step 9) on tick 1
    expect(sim.state.shades[0].pos[0]).toBeCloseTo(0.5 - 4 / 60 + 2, 9);
    run(sim, 1);
    expect(sim.state.shades[0].state).toBe('chase');
  });

  it('at most one hit per tick, by the lowest id', () => {
    const sim = quietSim({ shades: [{ id: 'S2', pos: [0.3, 1, 0] }, { id: 'S10', pos: [0, 1, 0.3] }, { id: 'S1', pos: [0.6, 1, 0] }] });
    expect(named(run(sim, 1), 'player_hit')).toHaveLength(1);
    expect(sim.state.shades.map((s) => [s.id, s.state])).toEqual([
      ['S2', 'chase'],
      ['S10', 'chase'],
      ['S1', 'recoil'],
    ]);
  });

  it('no further hit while invulnerable', () => {
    const sim = quietSim({ shades: [{ pos: [0.5, 1, 0] }, { pos: [0, 1, 0.5] }] });
    expect(named(run(sim, 89), 'player_hit')).toHaveLength(1);
  });
});

describe('Vùng an toàn (§3.4)', () => {
  it('a shade inside a lit lantern zone drifts to the rim within 30 ticks and is harmless meanwhile', () => {
    const sim = quietSim({ player: { pos: [0, 0, 22] }, lanterns: [{ id: 'L1', lit: true }], shades: [{ pos: [0, 1, 22] }] });
    expect(run(sim, 15)).toEqual([]);
    expect(sim.state.shades[0].pos[2]).toBeCloseTo(19, 9);
  });

  it('a shade outside is stopped at the rim', () => {
    const sim = quietSim({ player: { pos: [0, 0, 22] }, lanterns: [{ id: 'L1', lit: true }], shades: [{ pos: [0, 1, 14] }] });
    expect(run(sim, 300)).toEqual([]);
    expect(sim.state.shades[0].pos[2]).toBeCloseTo(19, 9);
  });
});

describe('Đom đóm sinh thêm (§3.3)', () => {
  it('adds one mote on a free standard point at ticks 240, 480, … while fewer than 30', () => {
    const sim = createSim({ seed: 5, night: 1, scenario: { random_shades: false } });
    run(sim, 239);
    expect(sim.state.motes).toHaveLength(20);
    run(sim, 1);
    expect(sim.state.motes).toHaveLength(21);
    run(sim, 240 * 3);
    expect(sim.state.motes).toHaveLength(24);
    run(sim, 240 * 3);
    expect(sim.state.motes).toHaveLength(24); // every point taken: the turn is skipped
  });
});
