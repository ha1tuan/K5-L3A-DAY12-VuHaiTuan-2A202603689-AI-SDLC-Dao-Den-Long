// PRD v4 §1: benchmark scene constants and the frame statistics, pure so they can be tested.

export const BENCH = {
  width: 1280,
  height: 720,
  orbitRadius: 30,
  orbitHeight: 15,
  lapS: 15,
  warmupS: 3,
} as const;

export interface FrameStats {
  frames: number;
  avg_fps: number;
  p1_low_fps: number;
  frame_ms_p95: number;
}

/** §1.4, with dt in ms for each measured frame. */
export function frameStats(dts: readonly number[]): FrameStats {
  const n = dts.length;
  const sum = dts.reduce((a, b) => a + b, 0);
  const sorted = [...dts].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.01 * n));
  const worst = sorted.slice(n - k);
  const p95 = sorted[Math.min(n - 1, Math.max(0, Math.ceil(0.95 * n) - 1))];
  return {
    frames: n,
    avg_fps: (1000 * n) / sum,
    p1_low_fps: 1000 / (worst.reduce((a, b) => a + b, 0) / k),
    frame_ms_p95: p95,
  };
}

/**
 * Camera position t seconds into the bench. Seen from above with the usual Three.js view
 * (looking down −Y, X to the right, Z towards the viewer's bottom) counter-clockwise runs +X → −Z.
 */
export function orbitCamera(tS: number): [number, number, number] {
  const a = (2 * Math.PI * tS) / BENCH.lapS;
  return [BENCH.orbitRadius * Math.cos(a), BENCH.orbitHeight, -BENCH.orbitRadius * Math.sin(a)];
}
