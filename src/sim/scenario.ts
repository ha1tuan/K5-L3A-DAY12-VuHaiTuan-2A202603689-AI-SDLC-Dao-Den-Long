import { INITIAL_MOTES, INITIAL_SHADES, LANTERN_ANGLE_STEP_DEG, LANTERN_RING_RADIUS } from './world';
import { makeMote, makeShade, type IdCounters } from './systems/spawn';
import type { Lantern, Mote, Scenario, Shade, SimState, Tuning } from './types';

function defaultLanterns(count: number): Lantern[] {
  return Array.from({ length: count }, (_, i) => {
    const t = (i * LANTERN_ANGLE_STEP_DEG * Math.PI) / 180;
    return {
      id: `L${i + 1}`,
      pos: [LANTERN_RING_RADIUS * Math.sin(t), 0, LANTERN_RING_RADIUS * Math.cos(t)],
      lit: false,
      deposited: 0,
    };
  });
}

export interface InitialWorld {
  state: SimState;
  ids: IdCounters;
}

/** Builds the tick-0 state from defaults plus an optional scenario. Emits no events, awards no score. */
export function buildInitialState(tuning: Tuning, rng: () => number, sc: Scenario = {}): InitialWorld {
  const ids: IdCounters = { mote: 0, shade: 0 };

  const lanterns = defaultLanterns(tuning.lantern_count_night1);
  for (const u of sc.lanterns ?? []) {
    const l = lanterns.find((x) => x.id === u.id);
    if (!l) continue;
    if (u.pos) l.pos = [...u.pos];
    if (u.deposited !== undefined) l.deposited = u.deposited;
    if (u.lit !== undefined) l.lit = u.lit;
  }

  const motes: Mote[] = [];
  if (sc.motes) for (const pos of sc.motes) motes.push(makeMote(rng, ids, motes, pos));
  else if (sc.random_motes !== false) for (let i = 0; i < INITIAL_MOTES; i++) motes.push(makeMote(rng, ids, motes));

  const shades: Shade[] = [];
  if (sc.shades) {
    // Explicit ids first so auto ids never collide with them.
    const explicit = sc.shades.filter((x) => x.id).map((x) => ({ id: x.id! }));
    for (const x of sc.shades) shades.push(makeShade(rng, ids, [...explicit, ...shades], x.pos, x.id));
  } else if (sc.random_shades !== false) {
    for (let i = 0; i < INITIAL_SHADES; i++) shades.push(makeShade(rng, ids, shades));
  }

  const state: SimState = {
    tick: 0,
    status: 'playing',
    endReason: null,
    timeLeftS: sc.time_left_s ?? tuning.night1_duration_s,
    score: 0,
    player: {
      pos: sc.player?.pos ? [...sc.player.pos] : [0, 0, 0],
      vy: 0,
      flames: sc.player?.flames ?? tuning.flames,
      carried: sc.player?.carried ?? 0,
      invulnTicks: 0,
      pulseCooldownTicks: 0,
    },
    lanterns,
    shades,
    motes,
  };
  return { state, ids };
}
