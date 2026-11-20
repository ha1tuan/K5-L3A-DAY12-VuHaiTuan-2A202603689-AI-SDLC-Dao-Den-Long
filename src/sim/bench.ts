import { buildInitialState, type InitialWorld } from './scenario';
import { makeMote, makeShade, nextId } from './systems/spawn';
import { BENCH_LIT_LANTERNS, BENCH_MOTES, BENCH_SCATTER_RADIUS, BENCH_SHADES, SHADE_HOVER_Y } from './world';
import type { NightDef } from './nights';
import type { Tuning, Vec3 } from './types';

/** A uniform random point on the island's ground inside the scatter disc. */
function scatter(def: NightDef, rng: () => number, lift: number): Vec3 {
  for (;;) {
    const a = rng() * Math.PI * 2;
    const r = BENCH_SCATTER_RADIUS * Math.sqrt(rng());
    const x = r * Math.cos(a);
    const z = r * Math.sin(a);
    const g = def.terrain.highest(x, z);
    if (Number.isFinite(g)) return [x, g + lift, z];
  }
}

/** PRD v4 §1.2: 200 wandering shades, 100 motes, L1–L3 lit and full. No events, no score. */
export function buildBenchState(def: NightDef, tuning: Tuning, rng: () => number): InitialWorld {
  const world = buildInitialState(def, tuning, rng, {
    random_motes: false,
    random_shades: false,
    random_drifters: false,
    wind_enabled: false,
    charms: [],
    lanterns: def.lanterns.slice(0, BENCH_LIT_LANTERNS).map((_, i) => ({ id: `L${i + 1}`, lit: true })),
  });
  const { state, ids } = world;
  for (let i = 0; i < BENCH_SHADES; i++) state.shades.push(makeShade(nextId('S', ids, state.shades), scatter(def, rng, SHADE_HOVER_Y), 'wander', 0));
  for (let i = 0; i < BENCH_MOTES; i++) state.motes.push(makeMote(ids, state.motes, scatter(def, rng, 0)));
  return world;
}
