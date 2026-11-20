// The ONLY place that knows the Test Contract v1.1 JSONL shapes (PRD v2 §6).
import { TICKS_PER_SECOND, type SimEvent, type SimState, type Vec3 } from '../sim';

const r3 = (n: number): number => {
  const v = Math.round(n * 1000) / 1000;
  return Object.is(v, -0) ? 0 : v;
};
const v3 = (p: Vec3): Vec3 => [r3(p[0]), r3(p[1]), r3(p[2])];
const secs = (ticks: number) => r3(ticks / TICKS_PER_SECOND);

export function snapshotLine(s: Readonly<SimState>): string {
  const p = s.player;
  return JSON.stringify({
    type: 'snapshot',
    tick: s.tick,
    sim_tick: s.simTick,
    state: s.paused && s.status === 'playing' ? 'paused' : s.status,
    night: s.night,
    time_left_s: r3(s.timeLeftS),
    score: s.score,
    wind: { active: s.wind.active, dir_deg: r3(s.wind.dirDeg) },
    player: {
      pos: v3(p.pos),
      vel: v3(p.vel),
      grounded: p.grounded,
      flames: p.flames,
      carried: p.carried,
      invuln: p.invulnTicks > 0,
      dash_cd_s: secs(p.dashCooldownTicks),
      pulse_cd_s: secs(p.pulseCooldownTicks),
      charm_s: secs(p.charmTicks),
    },
    lanterns: s.lanterns.map((l) => ({ id: l.id, pos: v3(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: s.shades.map((x) => ({ id: x.id, pos: v3(x.pos), state: x.state })),
    motes_active: s.motes.length,
    motes: s.motes.map((m) => ({ id: m.id, pos: v3(m.pos), kind: m.kind, ttl_s: m.ttlTicks === null ? null : secs(m.ttlTicks) })),
    drifters: s.drifters.map((d) => ({ id: d.id, pos: v3(d.pos), state: d.state, stolen: d.stolen })),
    charms: s.charms.map((c) => ({ id: c.id, pos: v3(c.pos), available: c.available, respawn_s: secs(c.respawnTicks) })),
  });
}

export function eventLine(e: SimEvent): string {
  return JSON.stringify({ type: 'event', tick: e.tick, name: e.name, data: e.data });
}

export function endLine(s: Readonly<SimState>): string {
  return JSON.stringify({ type: 'end', ticks: s.tick, state: s.status, score: s.score });
}
