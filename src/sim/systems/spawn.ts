import { distXZ } from '../geometry';
import { secondsToTicks } from '../tuning';
import {
  DRIFTER_EVERY_TICKS,
  DRIFTER_MAX_ALIVE,
  DROP_RING_MAX,
  DROP_RING_MIN,
  DROPPED_MOTE_TTL_TICKS,
  MOTE_CAP,
  MOTE_SPAWN_EVERY_TICKS,
  SHADE_FIRST_SPAWN_COUNT,
  SHADE_FIRST_SPAWN_TICK,
  SHADE_HOVER_Y,
  SHADE_SPAWN_MIN_DIST,
  SHADE_SPAWNING_TICKS,
} from '../world';
import type { NightDef } from '../nights';
import type { Drifter, Mote, Shade, ShadeMode, SimState, Tuning, Vec3 } from '../types';
import type { IdCounters, StepCtx } from './context';

const KEY = { M: 'mote', S: 'shade', D: 'drifter' } as const;

/** Next free id with the given prefix, skipping ids already taken (e.g. by a scenario). */
export function nextId(prefix: 'M' | 'S' | 'D', counters: IdCounters, taken: { id: string }[]): string {
  let id: string;
  do {
    counters[KEY[prefix]] += 1;
    id = `${prefix}${counters[KEY[prefix]]}`;
  } while (taken.some((t) => t.id === id));
  return id;
}

const pick = <T>(rng: () => number, xs: T[]): T => xs[Math.floor(rng() * xs.length)];

/** Spawn points with no random mote on them. */
export function emptyMotePoints(def: NightDef, motes: Mote[]): Vec3[] {
  return def.motePoints.filter((p) => !motes.some((m) => m.kind === 'random' && distXZ(m.pos, p) < 1e-6));
}

export function makeMote(counters: IdCounters, motes: Mote[], pos: Vec3): Mote {
  return { id: nextId('M', counters, motes), pos: [...pos], kind: 'random', ttlTicks: null, pickableFrom: 0 };
}

/** Dropped motes land on a random point of the 1.5–2.5 m ring around `at`. */
export function dropMotes(s: SimState, ctx: StepCtx, at: Vec3, count: number, onRing: boolean): void {
  for (let i = 0; i < count; i++) {
    let x = at[0];
    let z = at[2];
    if (onRing) {
      const a = ctx.rng() * Math.PI * 2;
      const r = DROP_RING_MIN + ctx.rng() * (DROP_RING_MAX - DROP_RING_MIN);
      x += r * Math.cos(a);
      z += r * Math.sin(a);
    }
    const ground = ctx.def.terrain.highest(x, z);
    s.motes.push({
      id: nextId('M', ctx.memory.ids, s.motes),
      pos: [x, Number.isFinite(ground) ? ground : at[1], z],
      kind: 'dropped',
      ttlTicks: DROPPED_MOTE_TTL_TICKS,
      pickableFrom: s.simTick + 1,
    });
  }
}

export function defaultStateTicks(state: ShadeMode, t: Tuning): number {
  if (state === 'spawning') return SHADE_SPAWNING_TICKS;
  if (state === 'stunned') return secondsToTicks(t.pulse_stun_s);
  return 0;
}

export function makeShade(id: string, pos: Vec3, state: ShadeMode, stateTicks: number): Shade {
  return { id, pos: [...pos], state, stateTicks, pushTicks: 0, pushDir: [1, 0], wanderTarget: null, wanderTicks: 0 };
}

export function makeDrifter(id: string, pos: Vec3): Drifter {
  return { id, pos: [...pos], state: 'idle', stolen: 0, stateTicks: 0, wanderTarget: null, wanderTicks: 0 };
}

function spawnShade(s: SimState, ctx: StepCtx): void {
  if (s.shades.length >= ctx.def.shadeMax) return;
  const valid = ctx.def.shadePoints.filter((p) => distXZ(p, s.player.pos) >= SHADE_SPAWN_MIN_DIST);
  if (valid.length === 0) return;
  const p = pick(ctx.rng, valid);
  const sh = makeShade(nextId('S', ctx.memory.ids, s.shades), [p[0], p[1] + SHADE_HOVER_Y, p[2]], 'spawning', SHADE_SPAWNING_TICKS);
  s.shades.push(sh);
  ctx.emit({ name: 'shade_spawned', data: { id: sh.id } });
}

/** Step 10: timed arrivals. New entities only interact from the next tick. */
export function spawnArrivals(s: SimState, ctx: StepCtx): void {
  const { memory, def, rng } = ctx;
  const t = s.simTick;

  if (memory.randomMotes && t % MOTE_SPAWN_EVERY_TICKS === 0 && s.motes.length < MOTE_CAP) {
    const free = emptyMotePoints(def, s.motes);
    if (free.length > 0) s.motes.push(makeMote(memory.ids, s.motes, pick(rng, free)));
  }

  if (memory.randomShades) {
    if (t === SHADE_FIRST_SPAWN_TICK) for (let i = 0; i < SHADE_FIRST_SPAWN_COUNT; i++) spawnShade(s, ctx);
    else if (t > SHADE_FIRST_SPAWN_TICK && (t - SHADE_FIRST_SPAWN_TICK) % def.shadeEveryTicks === 0) spawnShade(s, ctx);
  }

  if (def.drifters && memory.randomDrifters && t % DRIFTER_EVERY_TICKS === 0) {
    const alive = s.drifters.filter((d) => d.state !== 'removed').length;
    if (alive < DRIFTER_MAX_ALIVE) {
      const p = pick(rng, def.shadePoints);
      s.drifters.push(makeDrifter(nextId('D', memory.ids, s.drifters), [p[0], p[1] + SHADE_HOVER_Y, p[2]]));
    }
  }
}
