import {
  MAX_SHADES,
  MOTE_REFILL_BELOW,
  MOTE_REFILL_EVERY_TICKS,
  MOTE_SPAWN_MAX_RADIUS,
  MOTE_SPAWN_MIN_RADIUS,
  SHADE_HOVER_Y,
  SHADE_SPAWN_EVERY_TICKS,
  SHADE_SPAWN_RADIUS,
} from '../world';
import type { Mote, Shade, SimState, Vec3 } from '../types';
import type { StepCtx } from './context';

export interface IdCounters {
  mote: number;
  shade: number;
}

/** Next free id with the given prefix, skipping ids already taken (e.g. by a scenario). */
export function nextId(prefix: 'M' | 'S', counters: IdCounters, taken: { id: string }[]): string {
  const key = prefix === 'M' ? 'mote' : 'shade';
  let id: string;
  do {
    counters[key] += 1;
    id = `${prefix}${counters[key]}`;
  } while (taken.some((t) => t.id === id));
  return id;
}

/** Uniform over the annulus between the min and max spawn radius, on the ground. */
export function randomMotePos(rng: () => number): Vec3 {
  const a = rng() * Math.PI * 2;
  const rMin2 = MOTE_SPAWN_MIN_RADIUS ** 2;
  const r = Math.sqrt(rMin2 + rng() * (MOTE_SPAWN_MAX_RADIUS ** 2 - rMin2));
  return [r * Math.sin(a), 0, r * Math.cos(a)];
}

export function randomShadePos(rng: () => number): Vec3 {
  const a = rng() * Math.PI * 2;
  return [SHADE_SPAWN_RADIUS * Math.sin(a), SHADE_HOVER_Y, SHADE_SPAWN_RADIUS * Math.cos(a)];
}

export function makeMote(rng: () => number, counters: IdCounters, motes: Mote[], pos?: Vec3): Mote {
  return { id: nextId('M', counters, motes), pos: pos ? [...pos] : randomMotePos(rng) };
}

export function makeShade(rng: () => number, counters: IdCounters, shades: { id: string }[], pos?: Vec3, id?: string): Shade {
  return {
    id: id ?? nextId('S', counters, shades),
    pos: pos ? [...pos] : randomShadePos(rng),
    state: 'chase',
    stunTicks: 0,
  };
}

/** Timed arrivals: a shade every 60 s (max 5), a mote every 2 s while fewer than 15 remain. */
export function spawnArrivals(s: SimState, ctx: StepCtx, tick: number): void {
  const { memory, rng } = ctx;
  if (memory.randomShades && tick % SHADE_SPAWN_EVERY_TICKS === 0 && s.shades.length < MAX_SHADES) {
    const sh = makeShade(rng, memory.ids, s.shades);
    s.shades.push(sh);
    ctx.emit({ name: 'shade_spawned', data: { id: sh.id } });
  }
  if (memory.randomMotes && tick % MOTE_REFILL_EVERY_TICKS === 0 && s.motes.length < MOTE_REFILL_BELOW) {
    s.motes.push(makeMote(rng, memory.ids, s.motes));
  }
}
