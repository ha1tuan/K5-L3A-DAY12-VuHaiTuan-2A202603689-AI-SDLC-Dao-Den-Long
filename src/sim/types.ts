export type Vec3 = [number, number, number];
export type NightId = 1 | 2 | 3;

/** Buttons are HELD levels for this tick; the sim detects rising edges itself. */
export interface ControlState {
  move: [number, number];
  camYawDeg: number;
  jump: boolean;
  interact: boolean;
  pulse: boolean;
  dash?: boolean;
  pause?: boolean;
}

export interface Tuning {
  player_speed: number;
  carry_capacity: number;
  lantern_cost: number;
  lantern_count_night1: number;
  pickup_radius: number;
  interact_radius: number;
  pulse_cost: number;
  pulse_radius: number;
  night1_duration_s: number;
  night2_duration_s: number;
  night3_duration_s: number;
  flames: number;
  invuln_s: number;
  hit_drop_ratio: number;
  pulse_stun_s: number;
  pulse_push_m: number;
  pulse_cooldown_s: number;
  safe_radius: number;
  shade_speed: number;
  shade_hit_radius: number;
  fall_enabled: boolean;
  dash_speed: number;
  dash_duration_s: number;
  dash_cooldown_s: number;
  fuel_max: number;
  fuel_decay_per_s: number;
  fuel_per_mote: number;
  relight_cost: number;
  win_ratio: number;
  drain_per_s: number;
  low_fuel_threshold: number;
  capacity_max: number;
  score: {
    per_mote: number;
    per_lantern: number;
    per_relight: number;
    per_stun: number;
    per_stun_drain: number;
    per_lantern_at_dawn: number;
    per_flame_left: number;
  };
}

export type GameStatus = 'playing' | 'won' | 'lost';
export type EndReason = 'all_lit' | 'dawn' | 'no_flames';
export type ShadeMode = 'spawning' | 'wander' | 'chase' | 'recoil' | 'stunned' | 'drain';
export type DrifterMode = 'idle' | 'chase' | 'flee' | 'removed';
export type MoteKind = 'random' | 'dropped';

/** Validated scenario (Test Contract v1.2). Absent fields keep game defaults. */
export interface Scenario {
  player?: {
    pos?: Vec3;
    carried?: number;
    flames?: number;
    invuln_ticks?: number;
    dash_cd_ticks?: number;
    pulse_cd_ticks?: number;
    charm_ticks?: number;
    successful_lights?: number;
  };
  random_motes?: boolean;
  random_shades?: boolean;
  random_drifters?: boolean;
  wind_enabled?: boolean;
  motes?: Vec3[];
  shades?: { id?: string; pos: Vec3; state?: ShadeMode; state_ticks_left?: number; target_lantern_id?: string }[];
  drifters?: { id?: string; pos: Vec3; state?: Exclude<DrifterMode, 'removed'>; stolen?: number }[];
  charms?: { id: string; pos?: Vec3; available?: boolean; respawn_ticks?: number }[];
  lanterns?: { id: string; pos?: Vec3; deposited?: number; lit?: boolean; fuel?: number; ever_lit?: boolean }[];
  time_left_s?: number;
}

export interface Player {
  pos: Vec3;
  /** Own velocity in m/s (wind is added on top when moving, not stored here). */
  vel: Vec3;
  grounded: boolean;
  /** Unit XZ direction Mây faces; dash goes this way when standing still. */
  facing: [number, number];
  flames: number;
  carried: number;
  /** Lightings and relightings this night (scenario-lit lanterns do not count). */
  successfulLights: number;
  /** Carry limit: min(capacity_max, carry_capacity + 2 × successfulLights). */
  capacity: number;
  invulnTicks: number;
  pulseCooldownTicks: number;
  dashCooldownTicks: number;
  dashTicks: number;
  dashDir: [number, number];
  /** True while a dash started in the air keeps Y fixed. */
  dashHoldsY: boolean;
  charmTicks: number;
  /** Horizontal velocity locked by a bounce pad until landing. */
  launched: boolean;
  /** Ticks left before respawning after a fall (0 = alive on the map). */
  respawnTicks: number;
}

export interface Lantern {
  id: string;
  pos: Vec3;
  lit: boolean;
  deposited: number;
  /** Fuel in whole 1/60 units (max fuel_max × 60); 0 while unlit. */
  fuelTicks: number;
  everLit: boolean;
  relitCount: number;
}

export interface Shade {
  id: string;
  pos: Vec3;
  state: ShadeMode;
  /** Ticks left in spawning / recoil / stunned. */
  stateTicks: number;
  pushTicks: number;
  pushDir: [number, number];
  wanderTarget: Vec3 | null;
  wanderTicks: number;
  /** Weak lantern a wandering shade heads for, or the one it drains. */
  targetLanternId: string | null;
  /** Ticks drained since entering drain (fuel_drain every 60). */
  drainTicks: number;
}

export interface Mote {
  id: string;
  pos: Vec3;
  kind: MoteKind;
  /** Dropped motes only: ticks before vanishing. */
  ttlTicks: number | null;
  /** First sim tick at which it can be picked up. */
  pickableFrom: number;
}

export interface Drifter {
  id: string;
  pos: Vec3;
  state: DrifterMode;
  stolen: number;
  stateTicks: number;
  wanderTarget: Vec3 | null;
  wanderTicks: number;
}

export interface Charm {
  id: string;
  pos: Vec3;
  available: boolean;
  respawnTicks: number;
}

export interface Wind {
  active: boolean;
  dirDeg: number;
}

export interface SimState {
  /** Steps run, including paused ones. */
  tick: number;
  /** Gameplay steps run (frozen while paused). */
  simTick: number;
  paused: boolean;
  night: NightId;
  status: GameStatus;
  endReason: EndReason | null;
  timeLeftS: number;
  score: number;
  player: Player;
  lanterns: Lantern[];
  shades: Shade[];
  motes: Mote[];
  drifters: Drifter[];
  charms: Charm[];
  wind: Wind;
}

type Ev<N extends string, D> = { tick: number; name: N; data: D };
export type SimEvent =
  | Ev<'night_start', { night: NightId }>
  | Ev<'mote_picked', { carried: number }>
  | Ev<'deposit', { lantern_id: string; amount: number; deposited: number }>
  | Ev<'lantern_lit', { lantern_id: string; relight: boolean }>
  | Ev<'lantern_out', { lantern_id: string }>
  | Ev<'refuel', { lantern_id: string; amount: number; fuel: number }>
  | Ev<'fuel_drain', { lantern_id: string; shade_id: string; fuel: number }>
  | Ev<'pulse', { stunned_ids: string[] }>
  | Ev<'player_hit', { by: 'shade'; flames: number; dropped: number } | { by: 'fall'; flames: number; dropped: number; lost: number }>
  | Ev<'shade_spawned', { id: string }>
  | Ev<'dash', Record<string, never>>
  | Ev<'charm_picked', { charm_id: string; charm_ticks: number }>
  | Ev<'drifter_steal', { drifter_id: string; amount: number; carried: number }>
  | Ev<'drifter_drop', { drifter_id: string; amount: number }>
  | Ev<'paused', Record<string, never>>
  | Ev<'resumed', Record<string, never>>
  | Ev<'game_over', { result: 'won' | 'lost'; reason: EndReason }>;

export interface SimConfig {
  seed: number;
  night: NightId;
  scenario?: Scenario;
  tuning?: Tuning;
}

export interface Sim {
  /** Runs exactly one 1/60 s step. No-op returning [] once the night has ended. */
  step(ctrl: ControlState): SimEvent[];
  readonly state: Readonly<SimState>;
}
