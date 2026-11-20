import { fuelUnits, TICKS_PER_SECOND } from './tuning';
import { CHARM_RESPAWN_TICKS, DRIFTER_FLEE_TICKS, INITIAL_MOTES } from './world';
import { defaultStateTicks, emptyMotePoints, makeDrifter, makeMote, makeShade, nextId } from './systems/spawn';
import type { IdCounters } from './systems/context';
import type { NightDef } from './nights';
import type { Charm, Drifter, Lantern, Mote, Scenario, Shade, SimState, Tuning } from './types';

export interface InitialWorld {
  state: SimState;
  ids: IdCounters;
}

/** Builds the tick-0 state from the night's standard map plus an optional scenario. Emits no events, awards no score. */
export function buildInitialState(def: NightDef, tuning: Tuning, rng: () => number, sc: Scenario = {}): InitialWorld {
  const ids: IdCounters = { mote: 0, shade: 0, drifter: 0 };

  const lanterns: Lantern[] = def.lanterns.map((pos, i) => ({
    id: `L${i + 1}`,
    pos: [...pos],
    lit: false,
    deposited: 0,
    fuelTicks: 0,
    everLit: false,
    relitCount: 0,
  }));
  const maxUnits = fuelUnits(tuning.fuel_max);
  for (const u of sc.lanterns ?? []) {
    const l = lanterns.find((x) => x.id === u.id);
    if (!l) continue;
    if (u.pos) l.pos = [...u.pos];
    if (u.deposited !== undefined) l.deposited = u.deposited;
    if (u.lit !== undefined) l.lit = u.lit;
    // A34: a lit lantern without fuel starts full; real fuel rounds up to whole units, kept in [1, max].
    if (l.lit) l.fuelTicks = u.fuel === undefined ? maxUnits : Math.min(maxUnits, Math.max(1, Math.ceil(u.fuel * TICKS_PER_SECOND - 1e-9)));
    l.everLit = u.ever_lit ?? l.lit;
  }

  const motes: Mote[] = [];
  if (sc.motes) for (const pos of sc.motes) motes.push(makeMote(ids, motes, pos));
  else if (sc.random_motes !== false) {
    for (let i = 0; i < INITIAL_MOTES; i++) {
      const free = emptyMotePoints(def, motes);
      if (free.length === 0) break;
      motes.push(makeMote(ids, motes, free[Math.floor(rng() * free.length)]));
    }
  }

  // Explicit ids first so auto ids never collide with them.
  const shades: Shade[] = [];
  const takenShades = (sc.shades ?? []).filter((x) => x.id).map((x) => ({ id: x.id! }));
  for (const x of sc.shades ?? []) {
    const state = x.state ?? 'chase';
    const id = x.id ?? nextId('S', ids, [...takenShades, ...shades]);
    shades.push(makeShade(id, x.pos, state, x.state_ticks_left ?? defaultStateTicks(state, tuning)));
  }

  const drifters: Drifter[] = [];
  const takenDrifters = (sc.drifters ?? []).filter((x) => x.id).map((x) => ({ id: x.id! }));
  for (const x of sc.drifters ?? []) {
    const d = makeDrifter(x.id ?? nextId('D', ids, [...takenDrifters, ...drifters]), x.pos);
    d.state = x.state ?? 'idle';
    d.stolen = x.stolen ?? 0;
    if (d.state === 'flee') d.stateTicks = DRIFTER_FLEE_TICKS;
    drifters.push(d);
  }

  const charms: Charm[] = sc.charms
    ? sc.charms.map((c) => {
        const std = def.charms.find((x) => x.id === c.id);
        const available = c.available ?? true;
        return {
          id: c.id,
          pos: [...(c.pos ?? std?.pos ?? [0, 0, 0])],
          available,
          respawnTicks: available ? 0 : (c.respawn_ticks ?? CHARM_RESPAWN_TICKS),
        };
      })
    : def.charms.map((c) => ({ id: c.id, pos: [...c.pos], available: true, respawnTicks: 0 }));

  const pos = sc.player?.pos ? [...sc.player.pos] : [...def.start];
  const ground = def.terrain.groundUnder(pos[0], pos[2], pos[1]);
  const state: SimState = {
    tick: 0,
    simTick: 0,
    paused: false,
    night: def.id,
    status: 'playing',
    endReason: null,
    timeLeftS: sc.time_left_s ?? def.durationS,
    score: 0,
    player: {
      pos: [pos[0], pos[1], pos[2]],
      vel: [0, 0, 0],
      grounded: Number.isFinite(ground) && Math.abs(pos[1] - ground) < 1e-6,
      facing: [...def.startFacing],
      flames: sc.player?.flames ?? tuning.flames,
      carried: sc.player?.carried ?? 0,
      invulnTicks: sc.player?.invuln_ticks ?? 0,
      pulseCooldownTicks: sc.player?.pulse_cd_ticks ?? 0,
      dashCooldownTicks: sc.player?.dash_cd_ticks ?? 0,
      dashTicks: 0,
      dashDir: [0, 1],
      dashHoldsY: false,
      charmTicks: sc.player?.charm_ticks ?? 0,
      launched: false,
      respawnTicks: 0,
    },
    lanterns,
    shades,
    motes,
    drifters,
    charms,
    wind: { active: false, dirDeg: 0 },
  };
  return { state, ids };
}
