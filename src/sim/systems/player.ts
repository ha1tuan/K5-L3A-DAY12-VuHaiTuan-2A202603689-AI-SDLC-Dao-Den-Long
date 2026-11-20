import { clampLength1, clampToDisk, rotateYaw } from '../geometry';
import { DT } from '../tuning';
import { GRAVITY, ISLAND_RADIUS, JUMP_VELOCITY } from '../world';
import type { SimState } from '../types';
import type { StepCtx } from './context';

/** Walk, jump (Y only, no gameplay effect) and stay on the island. */
export function movePlayer(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  const [x, z] = rotateYaw(clampLength1(ctx.ctrl.move), ctx.ctrl.camYawDeg);
  const step = ctx.tuning.player_speed * DT;
  p.pos[0] += x * step;
  p.pos[2] += z * step;
  clampToDisk(p.pos, ISLAND_RADIUS);

  if (ctx.edges.jump && p.pos[1] === 0) p.vy = JUMP_VELOCITY;
  if (p.pos[1] > 0 || p.vy > 0) {
    p.vy -= GRAVITY * DT;
    p.pos[1] += p.vy * DT;
    if (p.pos[1] <= 0) {
      p.pos[1] = 0;
      p.vy = 0;
    }
  }
}
