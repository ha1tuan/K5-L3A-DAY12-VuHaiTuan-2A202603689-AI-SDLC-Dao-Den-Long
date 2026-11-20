// The ONLY place that knows the Test Contract v1.0 JSONL shapes (§E).
import type { SimEvent, SimState, Vec3 } from '../sim';

const r3 = (n: number): number => {
  const v = Math.round(n * 1000) / 1000;
  return Object.is(v, -0) ? 0 : v;
};
const v3 = (p: Vec3): Vec3 => [r3(p[0]), r3(p[1]), r3(p[2])];

export function snapshotLine(s: Readonly<SimState>): string {
  return JSON.stringify({
    type: 'snapshot',
    tick: s.tick,
    sim_tick: s.tick,
    state: s.status,
    time_left_s: r3(s.timeLeftS),
    score: s.score,
    player: { pos: v3(s.player.pos), flames: s.player.flames, carried: s.player.carried },
    lanterns: s.lanterns.map((l) => ({ id: l.id, pos: v3(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: s.shades.map((x) => ({ id: x.id, pos: v3(x.pos), state: x.state })),
    motes_active: s.motes.length,
    motes: s.motes.map((m) => ({ id: m.id, pos: v3(m.pos) })),
  });
}

export function eventLine(e: SimEvent): string {
  return JSON.stringify({ type: 'event', tick: e.tick, name: e.name, data: e.data });
}

export function endLine(s: Readonly<SimState>): string {
  return JSON.stringify({ type: 'end', ticks: s.tick, state: s.status, score: s.score });
}
