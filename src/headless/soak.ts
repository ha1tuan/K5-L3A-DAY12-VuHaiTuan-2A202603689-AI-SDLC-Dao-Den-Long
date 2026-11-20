// PRD v4 §2: many nights in one process with seeded random input. Pure apart from the injected RSS reader.
import { createSim, createRng, type ControlState, type NightId } from '../sim';
import { SOAK_INPUT } from './soakInput';

export interface SoakReport {
  nights: number;
  crashes: number;
  results: ('won' | 'lost' | 'crash')[];
  mem_start_mb: number;
  mem_end_mb: number;
  duration_s: number;
}

export interface SoakConfig {
  seed: number;
  nights: number;
  /** Current resident set size in MB (process.memoryUsage().rss in the CLI). */
  rssMb: () => number;
  /** Wall clock in ms; only used for duration_s. */
  now?: () => number;
  onNight?: (n: { night: NightId; seed: number; ticks: number; result: string }) => void;
}

/** Random held controls (§2.2): a new direction every 30 ticks, then per-tick button chances. */
export function randomInputs(seed: number): () => ControlState {
  const rng = createRng((seed ^ 0x9e3779b9) >>> 0); // its own stream, apart from the sim's
  let move: [number, number] = [0, 0];
  let tick = 0;
  return () => {
    if (tick % SOAK_INPUT.repick_ticks === 0) {
      const a = rng() * Math.PI * 2;
      move = [Math.cos(a), Math.sin(a)];
    }
    tick++;
    return {
      move,
      camYawDeg: 0,
      jump: rng() < SOAK_INPUT.jump,
      dash: rng() < SOAK_INPUT.dash,
      pulse: rng() < SOAK_INPUT.pulse,
      interact: rng() < SOAK_INPUT.interact,
      pause: false,
    };
  };
}

export function runSoak(cfg: SoakConfig): SoakReport {
  const now = cfg.now ?? (() => 0);
  const t0 = now();
  const results: SoakReport['results'] = [];
  let crashes = 0;
  let memStart = 0;
  for (let i = 0; i < cfg.nights; i++) {
    const night = ((i % 3) + 1) as NightId;
    const seed = cfg.seed + i;
    let ticks = 0;
    try {
      const sim = createSim({ seed, night });
      if (i === 0) memStart = cfg.rssMb();
      const limit = sim.state.timeLeftS * 60 + 1;
      const input = randomInputs(seed);
      while (sim.state.status === 'playing' && ticks < limit) {
        sim.step(input());
        ticks++;
      }
      results.push(sim.state.status === 'won' ? 'won' : 'lost');
    } catch {
      crashes++;
      results.push('crash');
    }
    cfg.onNight?.({ night, seed, ticks, result: results[i] });
  }
  const memEnd = cfg.rssMb(); // after the last night has been dropped (reset)
  return {
    nights: cfg.nights,
    crashes,
    results,
    mem_start_mb: memStart,
    mem_end_mb: memEnd,
    duration_s: Math.round((now() - t0) / 100) / 10,
  };
}
