import { describe, expect, it } from 'vitest';
import { randomInputs, runSoak } from '../../src/headless/soak';

describe('Soak (PRD v4 §2)', () => {
  it('runs every night in one process, cycling 1 → 2 → 3, night i with seed 7 + i, until it ends', () => {
    const seen: { night: number; seed: number; ticks: number }[] = [];
    let mem = 100;
    const r = runSoak({ seed: 7, nights: 4, rssMb: () => (mem += 1), onNight: (n) => seen.push(n) });
    expect(seen.map((n) => [n.night, n.seed])).toEqual([
      [1, 7],
      [2, 8],
      [3, 9],
      [1, 10],
    ]);
    // a night that does not lose its flames lasts its standard duration exactly
    for (const n of seen) expect(n.ticks).toBeLessThanOrEqual({ 1: 240, 2: 270, 3: 300 }[n.night]! * 60);
    expect(r.nights).toBe(4);
    expect(r.crashes).toBe(0);
    expect(r.results).toHaveLength(4);
    expect(r.results.every((x) => x === 'won' || x === 'lost')).toBe(true);
    expect(r.mem_start_mb).toBe(101); // read once after loading the first night
    expect(r.mem_end_mb).toBe(102); // and once after the last night is reset
  });

  it('is deterministic for a seed', () => {
    const a = runSoak({ seed: 7, nights: 3, rssMb: () => 1 }).results;
    expect(runSoak({ seed: 7, nights: 3, rssMb: () => 1 }).results).toEqual(a);
  });

  it('picks a new move direction every 30 ticks and presses buttons at 5/3/2/10 %', () => {
    const next = randomInputs(123);
    const frames = Array.from({ length: 60000 }, () => next());
    for (let i = 1; i < 30; i++) expect(frames[i].move).toEqual(frames[0].move);
    expect(frames[30].move).not.toEqual(frames[0].move);
    expect(Math.hypot(...frames[0].move)).toBeCloseTo(1, 9);
    const rate = (k: 'jump' | 'dash' | 'pulse' | 'interact') => frames.filter((f) => f[k]).length / frames.length;
    expect(rate('jump')).toBeCloseTo(0.05, 2);
    expect(rate('dash')).toBeCloseTo(0.03, 2);
    expect(rate('pulse')).toBeCloseTo(0.02, 2);
    expect(rate('interact')).toBeCloseTo(0.1, 2);
  });
});
