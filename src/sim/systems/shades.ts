import { dirXZ, distXZ, pushOutOf } from '../geometry';
import { DT } from '../tuning';
import {
  DRIFTER_CHASE_CARRIED,
  DRIFTER_DETECT,
  DRIFTER_FAST_SPEED,
  DRIFTER_IDLE_SPEED,
  PULSE_PUSH_TICKS,
  SHADE_DETECT,
  SHADE_GIVE_UP,
  SHADE_HOVER_Y,
  SHADE_RECOIL_M,
  SHADE_RECOIL_TICKS,
  WANDER_RADIUS,
  WANDER_REPICK_TICKS,
  WANDER_SPEED_RATIO,
} from '../world';
import { safeZoneAt } from './lanterns';
import type { Drifter, Shade, SimState, Vec3 } from '../types';
import type { StepCtx } from './context';

/** Moves a hovering creature (A21); returns false when land's edge or an obstacle stops it. */
function hover(ctx: StepCtx, pos: Vec3, dx: number, dz: number): boolean {
  if (ctx.def.terrain.blocksHover(pos[0] + dx, pos[2] + dz)) return false;
  pos[0] += dx;
  pos[2] += dz;
  return true;
}

function toward(ctx: StepCtx, pos: Vec3, target: Vec3, maxStep: number): void {
  const d = distXZ(pos, target);
  const step = Math.min(maxStep, d);
  if (step <= 0) return;
  const [ux, uz] = dirXZ(pos, target);
  hover(ctx, pos, ux * step, uz * step);
}

function wander(ctx: StepCtx, w: Shade | Drifter, speed: number): void {
  const reached = w.wanderTarget && distXZ(w.pos, w.wanderTarget) < 1e-6;
  if (!w.wanderTarget || reached || w.wanderTicks >= WANDER_REPICK_TICKS) {
    const a = ctx.rng() * Math.PI * 2;
    const r = ctx.rng() * WANDER_RADIUS;
    w.wanderTarget = [w.pos[0] + r * Math.cos(a), w.pos[1], w.pos[2] + r * Math.sin(a)];
    w.wanderTicks = 0;
  }
  w.wanderTicks += 1;
  const before = distXZ(w.pos, w.wanderTarget);
  toward(ctx, w.pos, w.wanderTarget, speed * DT);
  if (distXZ(w.pos, w.wanderTarget) === before && before > 0) w.wanderTarget = null; // stuck at an edge
}

function settleY(ctx: StepCtx, pos: Vec3): void {
  const g = ctx.def.terrain.highest(pos[0], pos[2]);
  if (Number.isFinite(g)) pos[1] = g + SHADE_HOVER_Y;
}

function moveShade(s: SimState, ctx: StepCtx, sh: Shade): void {
  const p = s.player;
  const r = ctx.tuning.safe_radius;
  if (safeZoneAt(s, sh.pos, r)) return; // being pushed out (step 6)
  const playerHere = p.respawnTicks === 0;
  const d = playerHere ? distXZ(sh.pos, p.pos) : Infinity;
  const speed = ctx.def.shadeSpeed;

  switch (sh.state) {
    case 'spawning':
      return;
    case 'stunned':
      if (sh.pushTicks > 0) {
        const step = ctx.tuning.pulse_push_m / PULSE_PUSH_TICKS;
        sh.pushTicks -= 1;
        if (!hover(ctx, sh.pos, sh.pushDir[0] * step, sh.pushDir[1] * step)) sh.pushTicks = 0;
      }
      break;
    case 'recoil': {
      const [ux, uz] = dirXZ(p.pos, sh.pos);
      const step = SHADE_RECOIL_M / SHADE_RECOIL_TICKS;
      hover(ctx, sh.pos, ux * step, uz * step);
      break;
    }
    case 'wander':
    case 'chase':
      if (sh.state === 'wander' && d <= SHADE_DETECT) sh.state = 'chase';
      else if (sh.state === 'chase' && d > SHADE_GIVE_UP) {
        sh.state = 'wander';
        sh.wanderTarget = null;
      }
      if (sh.state === 'chase') toward(ctx, sh.pos, p.pos, speed * DT);
      else wander(ctx, sh, speed * WANDER_SPEED_RATIO);
      break;
  }
  for (const l of s.lanterns) if (l.lit) pushOutOf(sh.pos, l.pos, r);
}

function moveDrifter(s: SimState, ctx: StepCtx, dr: Drifter): void {
  const p = s.player;
  if (dr.state === 'removed') return;
  const wants = p.respawnTicks === 0 && p.carried >= DRIFTER_CHASE_CARRIED && distXZ(dr.pos, p.pos) <= DRIFTER_DETECT;
  if (dr.state === 'idle' && wants) dr.state = 'chase';
  else if (dr.state === 'chase' && !wants) {
    dr.state = 'idle';
    dr.wanderTarget = null;
  }
  if (dr.state === 'chase') toward(ctx, dr.pos, p.pos, DRIFTER_FAST_SPEED * DT);
  else if (dr.state === 'flee') {
    const [ux, uz] = dirXZ(p.pos, dr.pos);
    hover(ctx, dr.pos, ux * DRIFTER_FAST_SPEED * DT, uz * DRIFTER_FAST_SPEED * DT);
  } else wander(ctx, dr, DRIFTER_IDLE_SPEED);
  settleY(ctx, dr.pos);
}

/** Step 8: shades, then drifters, move. */
export function moveCreatures(s: SimState, ctx: StepCtx): void {
  for (const sh of s.shades) {
    moveShade(s, ctx, sh);
    settleY(ctx, sh.pos);
  }
  for (const dr of s.drifters) moveDrifter(s, ctx, dr);
}
