import { clampLength1, distXZ, rotateYaw, unit2 } from '../geometry';
import { DT, secondsToTicks } from '../tuning';
import { AIR_ACCEL_PER_TICK, CHARM_SPEED, FALL_Y, GRAVITY, JUMP_VELOCITY, RESPAWN_WAIT_TICKS, STEP_DOWN, WIND_SPEED } from '../world';
import type { SimState } from '../types';
import type { StepCtx } from './context';

function startDash(s: SimState, ctx: StepCtx, desired: [number, number] | null): void {
  const p = s.player;
  const t = ctx.tuning;
  const charmed = p.charmTicks > 0;
  if (!ctx.edges.dash || p.dashTicks > 0 || (p.dashCooldownTicks > 0 && !charmed)) return;
  p.dashDir = desired ?? [...p.facing];
  p.dashTicks = secondsToTicks(t.dash_duration_s);
  p.dashCooldownTicks = charmed ? 0 : secondsToTicks(t.dash_cooldown_s);
  p.dashHoldsY = !p.grounded;
  if (p.dashHoldsY) p.vel[1] = 0;
  ctx.emit({ name: 'dash', data: {} });
}

function setHorizontalVelocity(s: SimState, ctx: StepCtx, desired: [number, number] | null, mag: number): void {
  const p = s.player;
  if (p.dashTicks > 0) {
    p.vel[0] = p.dashDir[0] * ctx.tuning.dash_speed;
    p.vel[2] = p.dashDir[1] * ctx.tuning.dash_speed;
    return;
  }
  if (p.launched) return;
  const speed = p.charmTicks > 0 ? CHARM_SPEED : ctx.tuning.player_speed;
  const tx = desired ? desired[0] * mag * speed : 0;
  const tz = desired ? desired[1] * mag * speed : 0;
  if (p.grounded) {
    p.vel[0] = tx;
    p.vel[2] = tz;
    return;
  }
  // A19: limited air control.
  const dx = tx - p.vel[0];
  const dz = tz - p.vel[2];
  const d = Math.hypot(dx, dz);
  const k = d > AIR_ACCEL_PER_TICK ? AIR_ACCEL_PER_TICK / d : 1;
  p.vel[0] += dx * k;
  p.vel[2] += dz * k;
}

function moveHorizontally(s: SimState, ctx: StepCtx, dx: number, dz: number): void {
  const p = s.player;
  const terrain = ctx.def.terrain;
  const blocked = (x: number, z: number) =>
    terrain.blocksFeet(x, z, p.pos[1]) || (!ctx.tuning.fall_enabled && !Number.isFinite(terrain.groundUnder(x, z, p.pos[1])));
  const tries: [number, number][] = [
    [dx, dz],
    [dx, 0],
    [0, dz],
  ];
  for (const [mx, mz] of tries) {
    if (mx === 0 && mz === 0) continue;
    if (!blocked(p.pos[0] + mx, p.pos[2] + mz)) {
      p.pos[0] += mx;
      p.pos[2] += mz;
      return;
    }
  }
}

function launchFromPads(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  if (!p.grounded) return;
  for (const pad of ctx.def.pads) {
    if (distXZ(p.pos, pad.pos) > pad.r || Math.abs(p.pos[1] - pad.pos[1]) > 0.3) continue;
    const dir = pad.dir ?? unit2([pad.aimAt![0] - p.pos[0], pad.aimAt![1] - p.pos[2]]) ?? [1, 0];
    p.vel = [dir[0] * pad.speed, pad.vy, dir[1] * pad.speed];
    p.grounded = false;
    p.launched = true;
    return;
  }
}

function fall(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  const lost = p.carried;
  p.carried = 0;
  p.flames -= 1;
  p.vel = [0, 0, 0];
  p.grounded = false;
  p.launched = false;
  p.dashTicks = 0;
  p.dashHoldsY = false;
  if (p.flames > 0) p.respawnTicks = RESPAWN_WAIT_TICKS;
  ctx.emit({ name: 'player_hit', data: { by: 'fall', flames: p.flames, dropped: 0, lost } });
}

/** Step 3: run, jump, dash, bounce pads, wind; then the fall check. */
export function movePlayer(s: SimState, ctx: StepCtx): void {
  const p = s.player;
  if (p.respawnTicks > 0 || p.flames <= 0) return;

  const input = rotateYaw(clampLength1(ctx.ctrl.move), ctx.ctrl.camYawDeg);
  const desired = unit2(input);
  const mag = Math.min(1, Math.hypot(input[0], input[1]));
  if (desired) p.facing = desired;

  startDash(s, ctx, desired);
  setHorizontalVelocity(s, ctx, desired, mag);

  if (ctx.edges.jump && p.grounded && p.dashTicks === 0) {
    p.vel[1] = JUMP_VELOCITY;
    p.grounded = false;
  }
  const holdY = p.dashTicks > 0 && p.dashHoldsY;
  if (!p.grounded && !holdY) p.vel[1] -= GRAVITY * DT;

  let wx = 0;
  let wz = 0;
  if (s.wind.active) {
    const a = (s.wind.dirDeg * Math.PI) / 180;
    wx = Math.cos(a) * WIND_SPEED;
    wz = Math.sin(a) * WIND_SPEED;
  }
  moveHorizontally(s, ctx, (p.vel[0] + wx) * DT, (p.vel[2] + wz) * DT);

  const terrain = ctx.def.terrain;
  const yBefore = p.pos[1];
  if (p.grounded) {
    const g = terrain.groundUnder(p.pos[0], p.pos[2], yBefore);
    if (g >= yBefore - STEP_DOWN) p.pos[1] = g;
    else {
      p.grounded = false;
      p.vel[1] = 0;
    }
  }
  if (!p.grounded && !holdY) {
    p.pos[1] += p.vel[1] * DT;
    const g = terrain.groundUnder(p.pos[0], p.pos[2], yBefore);
    if (p.vel[1] <= 0 && p.pos[1] <= g + 1e-9) {
      p.pos[1] = g;
      p.vel[1] = 0;
      p.grounded = true;
      p.launched = false;
    }
  }

  launchFromPads(s, ctx);
  if (ctx.tuning.fall_enabled && p.pos[1] < FALL_Y) fall(s, ctx);
}
