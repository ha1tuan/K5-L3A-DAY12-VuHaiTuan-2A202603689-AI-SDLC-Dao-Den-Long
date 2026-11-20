// Standard constants from PRD v2 §3 that are NOT part of the contract tuning (see Architect.md §6).
// Map data per night lives in nights.ts.

export const GRAVITY = 20;
export const JUMP_VELOCITY = 7;
/** A19: horizontal acceleration while airborne, m/s per tick (12 m/s²). */
export const AIR_ACCEL_PER_TICK = 0.2;
/** A20: highest step Mây can walk up; anything taller is a cliff. */
export const STEP_UP = 0.3;
/** How far below the feet the ground may drop while still walking (ramps), m. */
export const STEP_DOWN = 0.5;
export const FALL_Y = -10;
export const RESPAWN_WAIT_TICKS = 60;

export const PICKUP_HEIGHT = 1.5;
export const HIT_HEIGHT = 1.5;
export const PULSE_CENTER_Y = 0.8;
export const PULSE_PUSH_TICKS = 15;

export const MOTE_CAP = 30;
export const INITIAL_MOTES = 20;
export const MOTE_SPAWN_EVERY_TICKS = 240;
export const DROPPED_MOTE_TTL_TICKS = 480;
export const DROP_RING_MIN = 1.5;
export const DROP_RING_MAX = 2.5;

export const SHADE_FIRST_SPAWN_TICK = 300;
export const SHADE_FIRST_SPAWN_COUNT = 2;
export const SHADE_SPAWN_MIN_DIST = 15;
export const SHADE_HOVER_Y = 1.0;
export const SHADE_DETECT = 12;
export const SHADE_GIVE_UP = 18;
export const SHADE_RECOIL_M = 2;
export const SHADE_RECOIL_TICKS = 60;
/** A22 */
export const SHADE_SPAWNING_TICKS = 60;
export const WANDER_RADIUS = 8;
export const WANDER_SPEED_RATIO = 0.5;
export const WANDER_REPICK_TICKS = 180;
/** A23: push-out speed for shades caught inside a newly lit safe zone, m per tick. */
export const SAFE_PUSH_PER_TICK = 0.2;

export const CHARM_TICKS = 600;
export const CHARM_SPEED = 7.2;
export const CHARM_RESPAWN_TICKS = 2700;

export const DRIFTER_EVERY_TICKS = 1200;
export const DRIFTER_MAX_ALIVE = 2;
export const DRIFTER_IDLE_SPEED = 2;
export const DRIFTER_FAST_SPEED = 7;
export const DRIFTER_CHASE_CARRIED = 5;
export const DRIFTER_DETECT = 15;
export const DRIFTER_HIT_RADIUS = 1.2;
export const DRIFTER_STEAL_MAX = 3;
export const DRIFTER_FLEE_TICKS = 240;
export const DRIFTER_DROP_VANISH_TICKS = 120;

/** A24 / PRD §10 Q4: gusts at t = 30, 60, … s, warned 2 s before (client only). */
export const WIND_EVERY_TICKS = 1800;
export const WIND_GUST_TICKS = 300;
export const WIND_WARN_TICKS = 120;
export const WIND_SPEED = 2;
