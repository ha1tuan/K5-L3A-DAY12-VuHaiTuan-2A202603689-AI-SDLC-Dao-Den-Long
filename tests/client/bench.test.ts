import { describe, expect, it } from 'vitest';
import { BENCH, frameStats, orbitCamera } from '../../src/client/benchMath';

describe('Bench frame stats (PRD v4 §1.4)', () => {
  it('avg_fps = 1000·N / Σdt, p1_low from the k = max(1, ceil(1%·N)) longest frames, p95 of dt', () => {
    // 200 frames: 198 × 10 ms, 2 × 40 ms
    const dts = [...Array(198).fill(10), 40, 40];
    const s = frameStats(dts);
    expect(s.frames).toBe(200);
    expect(s.avg_fps).toBeCloseTo((1000 * 200) / (198 * 10 + 80), 9);
    expect(s.p1_low_fps).toBeCloseTo(25, 9); // k = 2 → mean(40, 40) = 40 ms
    expect(s.frame_ms_p95).toBe(10);
  });

  it('k is at least 1 and rounds 1 % up', () => {
    expect(frameStats([10, 20, 50]).p1_low_fps).toBeCloseTo(20, 9); // k = 1 → 50 ms
    const dts = [...Array(150).fill(10), 30, 20];
    expect(frameStats(dts).p1_low_fps).toBeCloseTo(40, 9); // k = ceil(1.52) = 2 → mean(30, 20) = 25 ms
  });

  it('p95 is the nearest-rank 95th percentile', () => {
    const dts = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100 ms
    expect(frameStats(dts).frame_ms_p95).toBe(95);
  });
});

describe('Bench camera (PRD v4 §1.2.5)', () => {
  it('starts at (30, 15, 0) and turns counter-clockwise seen from above, one lap in 15 s', () => {
    expect(BENCH).toMatchObject({ orbitRadius: 30, orbitHeight: 15, lapS: 15, warmupS: 3, width: 1280, height: 720 });
    const at = (t: number) => orbitCamera(t).map((v) => Math.round(v * 1e9) / 1e9 + 0);
    expect(at(0)).toEqual([30, 15, 0]);
    // Seen from above (+Y down onto XZ, X right, Z down the screen) counter-clockwise goes from +X towards −Z.
    expect(at(3.75)).toEqual([0, 15, -30]);
    expect(at(7.5)).toEqual([-30, 15, 0]);
    expect(at(15)).toEqual([30, 15, 0]);
  });
});
