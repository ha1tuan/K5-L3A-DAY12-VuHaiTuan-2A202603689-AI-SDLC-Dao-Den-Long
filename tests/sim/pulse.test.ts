import { describe, expect, it } from 'vitest';
import { IDLE, names, press, quietSim, run } from './helpers';

const twoShades = { shades: [{ pos: [3, 1, 0] as [number, number, number] }, { pos: [0, 1, 10] as [number, number, number] }] };

describe('Tỏa sáng (pulse)', () => {
  it('burns pulse_cost (2) carried motes, stuns shades within pulse_radius and pushes them pulse_push_m (4 m) away', () => {
    const sim = quietSim({ ...twoShades, player: { carried: 3 } });
    const events = sim.step({ ...IDLE, pulse: true });
    expect(events).toEqual([{ tick: 1, name: 'pulse', data: { stunned_ids: ['S1'] } }]);
    expect(sim.state.player.carried).toBe(1);
    const [s1, s2] = sim.state.shades;
    expect(s1.state).toBe('stunned');
    expect(s1.pos[0]).toBeCloseTo(7, 6);
    expect(s2.state).toBe('chase');
    expect(sim.state.score).toBe(25);
  });

  it('a stunned shade stays still and harmless for pulse_stun_s (3 s), then chases again', () => {
    const sim = quietSim({ shades: [{ pos: [3, 1, 0] }], player: { carried: 2 } });
    sim.step({ ...IDLE, pulse: true });
    run(sim, 178); // through tick 179
    expect(sim.state.shades[0].state).toBe('stunned');
    expect(sim.state.shades[0].pos[0]).toBeCloseTo(7, 6);
    run(sim, 1); // tick 180
    expect(sim.state.shades[0].state).toBe('chase');
  });

  it('a stunned shade cannot hit even when on top of Mây', () => {
    const sim = quietSim({ shades: [{ pos: [0.2, 1, 0] }], player: { carried: 2 } });
    // the pulse resolves before hits in the same tick (ADR-0001)
    const events = sim.step({ ...IDLE, pulse: true, move: [0, 0] });
    expect(names(events)).toEqual(['pulse']);
    expect(sim.state.player.flames).toBe(3);
  });

  it('does nothing without enough carried motes', () => {
    const sim = quietSim({ ...twoShades, player: { carried: 1 } });
    expect(press(sim, 'pulse')).toEqual([]);
    expect(sim.state.player.carried).toBe(1);
  });

  it('still fires (and costs) with nobody in range, reporting empty stunned_ids', () => {
    const sim = quietSim({ player: { carried: 2 } });
    expect(press(sim, 'pulse')).toEqual([{ tick: 1, name: 'pulse', data: { stunned_ids: [] } }]);
    expect(sim.state.player.carried).toBe(0);
  });

  it('respects pulse_cooldown_s (1.5 s = 90 ticks)', () => {
    const sim = quietSim({ player: { carried: 5 } });
    const ticks: number[] = [];
    for (let t = 0; t < 120; t++) {
      const pressNow = t === 0 || t === 88 || t === 90; // ticks 1, 89, 91
      for (const e of sim.step({ ...IDLE, pulse: pressNow })) ticks.push(e.tick);
    }
    expect(ticks).toEqual([1, 91]);
    expect(sim.state.player.carried).toBe(1);
  });
});
