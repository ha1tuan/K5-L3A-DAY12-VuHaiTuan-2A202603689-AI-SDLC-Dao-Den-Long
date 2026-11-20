import { distXZ, dirXZ } from '../geometry';
import { SAFE_PUSH_PER_TICK } from '../world';
import { capacityFor, fuelUnits, isFullFuel, TICKS_PER_SECOND } from '../tuning';
import type { Lantern, SimState, Vec3 } from '../types';
import type { StepCtx } from './context';

/** A lantern can take motes when dark, or lit and not full (A48). */
const receivable = (l: Lantern, fuelMax: number) => !l.lit || !isFullFuel(l.fuelTicks, fuelMax);

/**
 * Step 5 (A40): on an interact edge, act on the nearest receivable lantern within interact_radius (ties → lower id).
 * A dark lantern takes deposits and lights at lantern_cost (relight_cost once ever lit); a lit one is refuelled.
 */
export function interactWithLantern(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  if (!ctx.edges.interact || p.carried <= 0 || p.respawnTicks > 0) return;
  const t = ctx.tuning;

  let target: Lantern | null = null;
  let best = Infinity;
  for (const l of s.lanterns) {
    const d = distXZ(p.pos, l.pos);
    if (receivable(l, t.fuel_max) && d <= t.interact_radius && d < best) {
      best = d;
      target = l;
    }
  }
  if (!target) return;
  if (target.lit) refuel(s, ctx, target);
  else deposit(s, ctx, target);
}

function refuel(s: SimState, ctx: StepCtx, l: Lantern): void {
  const p = s.player;
  const t = ctx.tuning;
  const max = fuelUnits(t.fuel_max);
  const perMote = fuelUnits(t.fuel_per_mote);
  const used = Math.min(p.carried, Math.ceil((max - l.fuelTicks) / perMote));
  if (used <= 0) return;
  p.carried -= used;
  l.fuelTicks = Math.min(max, l.fuelTicks + used * perMote);
  s.score += t.score.per_mote * used;
  ctx.emit({ name: 'refuel', data: { lantern_id: l.id, amount: used, fuel: l.fuelTicks / TICKS_PER_SECOND } });
}

function deposit(s: SimState, ctx: StepCtx, l: Lantern): void {
  const p = s.player;
  const t = ctx.tuning;
  const relight = l.everLit;
  const cost = relight ? t.relight_cost : t.lantern_cost;
  const amount = Math.min(p.carried, cost - l.deposited);
  if (amount <= 0) return;
  p.carried -= amount;
  l.deposited += amount;
  s.score += t.score.per_mote * amount;
  ctx.emit({ name: 'deposit', data: { lantern_id: l.id, amount, deposited: l.deposited } });
  if (l.deposited < cost) return;

  l.lit = true;
  l.everLit = true;
  l.fuelTicks = fuelUnits(t.fuel_max);
  if (relight) l.relitCount += 1;
  s.score += relight ? t.score.per_relight : t.score.per_lantern;
  p.successfulLights += 1;
  p.capacity = capacityFor(t, p.successfulLights);
  ctx.emit({ name: 'lantern_lit', data: { lantern_id: l.id, relight } });
}

/** The lit lantern whose safe zone strictly contains p, if any. */
export function safeZoneAt(s: SimState, p: Vec3, r: number): Lantern | null {
  for (const l of s.lanterns) if (l.lit && distXZ(p, l.pos) < r - 1e-9) return l;
  return null;
}

/** Step 6 (A23): shades caught inside a lit lantern's zone drift out to its rim, 0.2 m per tick. */
export function updateSafeZones(s: SimState, ctx: StepCtx): void {
  const r = ctx.tuning.safe_radius;
  for (const sh of s.shades) {
    const l = safeZoneAt(s, sh.pos, r);
    if (!l) continue;
    const [dx, dz] = dirXZ(l.pos, sh.pos);
    const step = Math.min(SAFE_PUSH_PER_TICK, r - distXZ(sh.pos, l.pos));
    sh.pos[0] += dx * step;
    sh.pos[2] += dz * step;
  }
}
