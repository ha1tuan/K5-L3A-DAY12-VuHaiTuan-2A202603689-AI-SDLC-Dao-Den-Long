export type Vec3 = [number, number, number];

/** Buttons are HELD levels for this tick; the sim detects rising edges itself. */
export interface ControlState {
  move: [number, number];
  camYawDeg: number;
  jump: boolean;
  interact: boolean;
  pulse: boolean;
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
  score: {
    per_mote: number;
    per_lantern: number;
    per_stun: number;
    per_second_left: number;
    per_flame_left: number;
  };
}

/** Validated scenario (Test Contract v1.0 §D). Absent fields keep game defaults. */
export interface Scenario {
  player?: { pos?: Vec3; carried?: number; flames?: number };
  random_motes?: boolean;
  random_shades?: boolean;
  motes?: Vec3[];
  shades?: { id?: string; pos: Vec3 }[];
  lanterns?: { id: string; pos?: Vec3; deposited?: number; lit?: boolean }[];
  time_left_s?: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';
export type EndReason = 'all_lit' | 'dawn' | 'no_flames';
export type ShadeMode = 'chase' | 'stunned';

export interface Player {
  pos: Vec3;
  vy: number;
  flames: number;
  carried: number;
  invulnTicks: number;
  pulseCooldownTicks: number;
}

export interface Lantern {
  id: string;
  pos: Vec3;
  lit: boolean;
  deposited: number;
}

export interface Shade {
  id: string;
  pos: Vec3;
  state: ShadeMode;
  stunTicks: number;
}

export interface Mote {
  id: string;
  pos: Vec3;
}

export interface SimState {
  tick: number;
  status: GameStatus;
  endReason: EndReason | null;
  timeLeftS: number;
  score: number;
  player: Player;
  lanterns: Lantern[];
  shades: Shade[];
  motes: Mote[];
}

type Ev<N extends string, D> = { tick: number; name: N; data: D };
export type SimEvent =
  | Ev<'mote_picked', { carried: number }>
  | Ev<'deposit', { lantern_id: string; amount: number; deposited: number }>
  | Ev<'lantern_lit', { lantern_id: string }>
  | Ev<'pulse', { stunned_ids: string[] }>
  | Ev<'player_hit', { by: 'shade' | 'fall'; flames: number; dropped: number }>
  | Ev<'shade_spawned', { id: string }>
  | Ev<'game_over', { result: 'won' | 'lost'; reason: EndReason }>;

export interface SimConfig {
  seed: number;
  night: 1;
  scenario?: Scenario;
  tuning?: Tuning;
}

export interface Sim {
  /** Runs exactly one 1/60 s step. No-op returning [] once the night has ended. */
  step(ctrl: ControlState): SimEvent[];
  readonly state: Readonly<SimState>;
}
