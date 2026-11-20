// End-to-end cases for scripts/verify.mjs (Test Contract v1.1). Every expected number is worked out by
// hand from the standard numbers of PRD v2 §3 / game.contract.json, never copied from program output.
// Phase 1 cases were recomputed for Phase 2: each one says what changed and why.
//
// Fields:
//   req          requirement it proves (PRD / AC / assumption id)
//   night        1 | 2 | 3 (default 1)
//   scenario     scenarios/<name>.json   inputs: inputs/<name>.json
//   events       events that must appear, in this order (other events may sit between)
//   noEvents     event names that must not appear at all
//   eventCount   exact number of events with a given name
//   snapshotAt   { tick: partial snapshot } deep-matched against the snapshot of that tick
//   everySnapshot partial snapshot every snapshot must match
//   check(lines) extra relational checks; returns a list of error strings
//   end          partial match of the final `end` line
//   maxMs        the run must finish within this many milliseconds
//   exit         expected exit code (default 0); non-zero cases skip output checks

const near = (a, b, tol = 0.0011) => Math.abs(a - b) <= tol;
const snap = (lines, tick) => lines.find((l) => l.type === 'snapshot' && l.tick === tick);

export const cases = [
  // ------------------------------------------------------------ Phase 1 regression, standard numbers
  {
    name: 'idle-default-night',
    req: 'Night 1 default (§4.1): 5 lanterns, 20 motes, no shade before tick 300, no drifter; night_start {night:1}; snapshot cadence + end line',
    seed: 1,
    ticks: 60,
    events: [{ tick: 0, name: 'night_start', data: { night: 1 } }],
    snapshotAt: {
      0: { tick: 0, sim_tick: 0, state: 'playing', night: 1, time_left_s: 300, score: 0, player: { pos: [0, 0, 0], flames: 3, carried: 0, grounded: true }, motes_active: 20, shades: [], drifters: [], charms: [] },
      60: { time_left_s: 299 },
    },
    snapshotTicks: [0, 10, 20, 30, 40, 50, 60],
    end: { type: 'end', ticks: 60, state: 'playing' },
  },
  { name: 'move-forward', req: 'C: move [0,1] walks +Z at 6 m/s → z = 6 after 60 ticks', scenario: 'quiet', inputs: 'move-forward', ticks: 60, snapshotAt: { 60: { player: { pos: [0, 0, 6], vel: [0, 0, 6] } } } },
  { name: 'move-yaw', req: "C: θ = 90° turns [0,1] into +X", scenario: 'quiet', inputs: 'move-yaw-90', ticks: 60, snapshotAt: { 60: { player: { pos: [6, 0, 0] } } } },
  { name: 'move-normalize', req: 'C: [1,1] is normalised; 6/√2 = 4.2426 → 4.243', scenario: 'quiet', inputs: 'move-diagonal', ticks: 60, snapshotAt: { 60: { player: { pos: [4.243, 0, 4.243] } } } },
  {
    name: 'pickup',
    req: '§3.3: pickup at XZ ≤ 1.0; mote at z 2.95, Mây at z 2.0 on tick 20. Phase 2: picking up scores 0 (score is per mote deposited)',
    scenario: 'pickup',
    inputs: 'move-forward',
    ticks: 30,
    events: [{ tick: 20, name: 'mote_picked', data: { carried: 1 } }],
    end: { score: 0 },
  },
  { name: 'pickup-full', req: '§3.3: no pickup at capacity 10 (was 5)', scenario: 'pickup-full', ticks: 10, noEvents: ['mote_picked'], snapshotAt: { 10: { motes_active: 1, player: { carried: 10 } } } },
  {
    name: 'deposit-partial',
    req: '§3.4: deposits min(carried 5, 10 − 0) = 5 at distance 2.0 (≤ 2.0); not lit; +10 per mote = 50',
    scenario: 'deposit-partial',
    inputs: 'interact-once',
    ticks: 10,
    events: [{ tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: 5, deposited: 5 } }],
    noEvents: ['lantern_lit'],
    snapshotAt: { 10: { score: 50 } },
  },
  {
    name: 'light-one',
    req: '§3.4/§3.8: 5 + 5 = 10 lights L1 the same tick; 7 − 5 = 2 left; score 50 + 100 = 150',
    scenario: 'light-one',
    inputs: 'interact-once',
    ticks: 10,
    events: [
      { tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: 5, deposited: 10 } },
      { tick: 1, name: 'lantern_lit', data: { lantern_id: 'L1' } },
    ],
    snapshotAt: { 10: { player: { carried: 2 }, score: 150 } },
  },
  {
    name: 'win-all-lit',
    req: '§3.8: 10 + 100 + 2·floor(300 − 1/60 = 299.98) + 50·3 = 10 + 100 + 598 + 150 = 858',
    scenario: 'win-all-lit',
    inputs: 'interact-once',
    ticks: 100,
    events: [
      { tick: 1, name: 'lantern_lit', data: { lantern_id: 'L5' } },
      { tick: 1, name: 'game_over', data: { result: 'won', reason: 'all_lit' } },
    ],
    end: { ticks: 1, state: 'won', score: 858 },
  },
  {
    name: 'score-win',
    req: '§3.8: pick at tick 1 (0), deposit 1 at tick 2 (+10) lights L5 (+100), bonus 2·floor(299.97) + 50·2 = 698 → 808',
    scenario: 'score-win',
    inputs: 'interact-at-1',
    ticks: 100,
    events: [
      { tick: 1, name: 'mote_picked', data: { carried: 1 } },
      { tick: 2, name: 'deposit', data: { lantern_id: 'L5', amount: 1, deposited: 10 } },
      { tick: 2, name: 'game_over', data: { result: 'won', reason: 'all_lit' } },
    ],
    end: { ticks: 2, state: 'won', score: 808 },
  },
  {
    name: 'hit-drop',
    req: '§3.7: −1 flame, floor(5/2) = 2 dropped motes (kind dropped, TTL 8 s) on the ring; the shade recoils. Phase 2: drops stay on the ground',
    scenario: 'hit-drop',
    ticks: 10,
    snapshotEvery: 1,
    events: [{ tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 2 } }],
    eventCount: { player_hit: 1 },
    snapshotAt: {
      1: { player: { carried: 3, invuln: true }, shades: [{ state: 'recoil' }], motes: [{ kind: 'dropped', ttl_s: 8 }, { kind: 'dropped', ttl_s: 8 }] },
      10: { player: { carried: 3, flames: 2 }, motes_active: 2 },
    },
    check: (lines) =>
      snap(lines, 1).motes.filter((m) => { const d = Math.hypot(m.pos[0], m.pos[2]); return d < 1.499 || d > 2.501; }).map((m) => `dropped mote ${m.id} not on the 1.5–2.5 m ring`),
  },
  {
    name: 'invuln-no-double-hit',
    req: '§3.7: invulnerable 90 ticks; the shade recoils 60 ticks then chases back → hits at 1, 91, 181; the third ends the night (no_flames)',
    scenario: 'invuln-no-double-hit',
    ticks: 300,
    events: [
      { tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 0 } },
      { tick: 91, name: 'player_hit', data: { by: 'shade', flames: 1, dropped: 0 } },
      { tick: 181, name: 'player_hit', data: { by: 'shade', flames: 0, dropped: 0 } },
      { tick: 181, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } },
    ],
    eventCount: { player_hit: 3 },
    end: { ticks: 181, state: 'lost', score: 0 },
  },
  { name: 'lose-no-flames', req: '§3.7: lose no_flames on the tick flames reach 0; no win bonus', scenario: 'lose-no-flames', ticks: 100, events: [{ tick: 1, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } }], end: { ticks: 1, state: 'lost', score: 0 } },
  {
    name: 'lose-dawn',
    req: '§3.7: lose dawn when time_left_s 1 reaches 0 after 60 steps',
    scenario: 'lose-dawn',
    ticks: 1000,
    customClock: true,
    events: [{ tick: 60, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }],
    snapshotAt: { 60: { state: 'lost', time_left_s: 0 } },
    end: { ticks: 60, state: 'lost', score: 0 },
  },
  {
    name: 'pulse-stun-push',
    req: '§3.5: costs 3 (3 → 0); S1 at 3 m (3D 3.007 ≤ 5) stunned, pushed 4 m over 15 ticks → x 7; S2 at 10 m chases; +5',
    scenario: 'pulse-stun-push',
    inputs: 'pulse-once',
    ticks: 20,
    events: [{ tick: 1, name: 'pulse', data: { stunned_ids: ['S1'] } }],
    snapshotAt: {
      10: { shades: [{ id: 'S1', pos: [5.667, 1, 0] }] },
      20: { player: { carried: 0, pulse_cd_s: 2.683 }, score: 5, shades: [{ id: 'S1', pos: [7, 1, 0], state: 'stunned' }, { id: 'S2', state: 'chase' }] },
    },
  },
  { name: 'pulse-not-enough', req: '§3.5: carried 2 < 3 → no pulse', scenario: 'pulse-not-enough', inputs: 'pulse-once', ticks: 10, noEvents: ['pulse'], snapshotAt: { 10: { player: { carried: 2 } } } },
  {
    name: 'pulse-cooldown',
    req: '§3.5: cooldown 3 s = 180 ticks → presses at input ticks 0, 178, 180 fire on 1 and 181 only; 10 − 3 − 3 = 4 left',
    scenario: 'pulse-cooldown',
    inputs: 'pulse-cooldown-presses',
    ticks: 200,
    events: [
      { tick: 1, name: 'pulse', data: { stunned_ids: [] } },
      { tick: 181, name: 'pulse', data: { stunned_ids: [] } },
    ],
    eventCount: { pulse: 2 },
    snapshotAt: { 200: { player: { carried: 4 } } },
  },
  {
    name: 'safe-radius-block',
    req: '§3.4: a chasing shade stops on the rim (6 m) of a lit lantern; no hit',
    scenario: 'safe-radius-block',
    ticks: 600,
    noEvents: ['player_hit'],
    snapshotAt: { 600: { shades: [{ pos: [6, 1, 0], state: 'chase' }] } },
  },
  {
    name: 'shade-spawn',
    req: '§3.6/§4.1: 2 shades at tick 300, then one every 480 ticks to 6 (780, 1260, 1740, 2220), never S7; spawning 60 ticks then wander (37 m away)',
    scenario: 'shade-spawn',
    seed: 11,
    ticks: 3600,
    snapshotEvery: 60,
    events: [
      { tick: 300, name: 'shade_spawned', data: { id: 'S1' } },
      { tick: 300, name: 'shade_spawned', data: { id: 'S2' } },
      { tick: 780, name: 'shade_spawned', data: { id: 'S3' } },
      { tick: 1260, name: 'shade_spawned', data: { id: 'S4' } },
      { tick: 1740, name: 'shade_spawned', data: { id: 'S5' } },
      { tick: 2220, name: 'shade_spawned', data: { id: 'S6' } },
    ],
    eventCount: { shade_spawned: 6 },
    snapshotAt: { 300: { shades: [{ id: 'S1', state: 'spawning' }, { id: 'S2', state: 'spawning' }] }, 360: { shades: [{ state: 'wander' }, { state: 'wander' }] } },
    check: (lines) =>
      snap(lines, 300).shades.filter((s) => !near(Math.hypot(s.pos[0], s.pos[2]), 37)).map((s) => `${s.id} not on r = 37`),
  },
  { name: 'determinism-walk', req: 'Determinism: same seed + inputs → identical output (checked for every case; this one exercises randomness)', seed: 42, inputs: 'determinism-walk', ticks: 3000 },
  { name: 'bad-inputs', req: 'B: frame ticks not strictly increasing → exit 2', inputs: 'bad-ticks', ticks: 10, exit: 2 },
  { name: 'bad-inputs-json', req: 'B: inputs file is not valid JSON → exit 2', inputs: 'bad-json', ticks: 10, exit: 2 },
  { name: 'bad-scenario', req: 'B: scenario player.pos is not [x,y,z] → exit 2', scenario: 'bad-scenario', ticks: 10, exit: 2 },

  // ------------------------------------------------------------ Phase 2 (PRD v2 §7)
  {
    name: 'p2_dash_basic',
    req: 'AC-01.1/01.2: dash from rest facing +Z goes 14·12/60 = 2.8 m; a press 50 ticks later is ignored, 90 ticks later works; cooldown 90 − 11 = 79 ticks = 1.317 s at tick 12',
    scenario: 'quiet',
    inputs: 'p2-dash-twice',
    ticks: 100,
    snapshotEvery: 2,
    events: [
      { tick: 1, name: 'dash', data: {} },
      { tick: 91, name: 'dash', data: {} },
    ],
    eventCount: { dash: 2 },
    snapshotAt: { 12: { player: { pos: [0, 0, 2.8], dash_cd_s: 1.317 } }, 20: { player: { pos: [0, 0, 2.8] } } },
  },
  {
    name: 'p2_dash_air',
    req: 'AC-01.3: jump on tick 1, dash on tick 11 at y = (7·10 − 10·11/6)/60 = 0.861; Y holds through the 12 dash ticks (11–22)',
    scenario: 'quiet',
    inputs: 'p2-jump-then-dash',
    ticks: 30,
    snapshotEvery: 2,
    snapshotAt: { 10: { player: { pos: [0, 0.861, 0] } }, 12: { player: { pos: [0, 0.861, 0.467] } }, 22: { player: { pos: [0, 0.861, 2.8] } } },
    check: (lines) => (snap(lines, 24).player.pos[1] < 0.861 ? [] : ['Y should fall again after the dash']),
  },
  {
    name: 'p2_dash_hit',
    req: 'AC-01.4: no invulnerability while dashing: dash to z 0.233, the shade at z 1.2 chases to 1.133 → within 1 m → hit',
    scenario: 'p2-dash-hit',
    inputs: 'p2-dash-once',
    ticks: 5,
    events: [
      { tick: 1, name: 'dash', data: {} },
      { tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 0 } },
    ],
  },
  {
    name: 'p2_safe_push',
    req: '§3.4/A23: a shade inside a lit lantern zone drifts out 0.2 m per tick (3 m in 15 ticks, ≤ 30) and is harmless meanwhile',
    scenario: 'p2-safe-push',
    ticks: 30,
    snapshotEvery: 15,
    noEvents: ['player_hit'],
    snapshotAt: { 15: { shades: [{ pos: [0, 1, 19] }] } },
  },
  ...[1, 2, 3].map((night) => ({
    name: `p2_nights_${night}`,
    req: `AC-04.1/04.2: --night ${night} builds ${[5, 6, 7][night - 1]} lanterns, ${[300, 330, 360][night - 1]} s, 3 flames; night_start {night: ${night}}`,
    night,
    seed: 3,
    ticks: 10,
    events: [{ tick: 0, name: 'night_start', data: { night } }],
    snapshotAt: { 0: { night, time_left_s: [300, 330, 360][night - 1], player: { flames: 3, pos: night === 3 ? [0, 0, -30] : [0, 0, 0] }, motes_active: 20 } },
    check: (lines) => (snap(lines, 0).lanterns.length === [5, 6, 7][night - 1] ? [] : ['wrong lantern count']),
  })),
  {
    name: 'p2_drifter_spawn',
    req: 'AC-02.1: drifters arrive on Night 2 at ticks 1200 and 2400 (D1, D2), never more than 2 alive (no D3 at 3600)',
    night: 2,
    scenario: 'p2-drifter-spawn',
    ticks: 3600,
    snapshotEvery: 100,
    snapshotAt: { 1100: { drifters: [] }, 1200: { drifters: [{ id: 'D1', state: 'idle' }] }, 2400: { drifters: [{ id: 'D1' }, { id: 'D2' }] } },
    check: (lines) => (snap(lines, 3600).drifters.length === 2 ? [] : ['more than 2 drifters']),
  },
  { name: 'p2_drifter_carry_4', req: 'AC-02.2: carrying 4 at 10 m the drifter stays idle', night: 2, scenario: 'p2-drifter-carry-4', ticks: 1, snapshotEvery: 1, snapshotAt: { 1: { drifters: [{ state: 'idle' }] } } },
  {
    name: 'p2_drifter_carry_5',
    req: 'AC-02.2: carrying 5 it chases the same tick at 7 m/s → x = 10 − 7/60 = 9.883',
    night: 2,
    scenario: 'p2-drifter-carry-5',
    ticks: 1,
    snapshotEvery: 1,
    snapshotAt: { 1: { drifters: [{ state: 'chase', pos: [9.883, 1, 0] }] } },
  },
  {
    name: 'p2_drifter_steal',
    req: 'AC-02.3/02.4: steals min(3, 7) = 3 → carried 4, even while invulnerable inside a lit zone; flames stay 3; flees, removed at 1 + 240 = 241',
    night: 2,
    scenario: 'p2-drifter-steal',
    ticks: 241,
    snapshotEvery: 1,
    events: [{ tick: 1, name: 'drifter_steal', data: { drifter_id: 'D1', amount: 3, carried: 4 } }],
    snapshotAt: { 1: { player: { flames: 3, carried: 4 }, drifters: [{ state: 'flee', stolen: 3 }] }, 240: { drifters: [{ state: 'flee' }] }, 241: { drifters: [{ state: 'removed' }] } },
  },
  {
    name: 'p2_drifter_pulse_drop',
    req: 'AC-02.5 (Night 3): a pulse on a fleeing drifter with 3 stolen → drifter_drop {D1, 3}, 3 dropped motes where it was; removed at 1 + 120 = 121',
    night: 3,
    scenario: 'p2-drifter-pulse-drop',
    inputs: 'pulse-once',
    ticks: 121,
    snapshotEvery: 1,
    events: [{ tick: 1, name: 'drifter_drop', data: { drifter_id: 'D1', amount: 3 } }],
    snapshotAt: {
      1: { motes: [{ kind: 'dropped', pos: [2, 0, -30] }, { kind: 'dropped', pos: [2, 0, -30] }, { kind: 'dropped', pos: [2, 0, -30] }], drifters: [{ stolen: 0 }] },
      120: { drifters: [{ state: 'flee' }] },
      121: { drifters: [{ state: 'removed' }] },
    },
  },
  {
    name: 'p2_steal_then_hit',
    req: 'AC-02.6 / step 9: steal 3 first (7 → 4), then the shade hit drops floor(4/2) = 2',
    night: 2,
    scenario: 'p2-steal-then-hit',
    ticks: 1,
    events: [
      { tick: 1, name: 'drifter_steal', data: { drifter_id: 'D1', amount: 3, carried: 4 } },
      { tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 2 } },
    ],
  },
  {
    name: 'p2_charm',
    req: 'AC-03.1–03.4: C1 picked on tick 1 → charm_ticks 600, respawn_s 45; runs 7.2 m/s until tick 600, 6 m/s on 601; dashes at 11 and 23 both fire (press at 17 during a dash ignored); back at 1 + 2700 = 2701',
    night: 2,
    scenario: 'p2-charm',
    inputs: 'p2-charm-run',
    ticks: 2701,
    snapshotEvery: 1,
    events: [
      { tick: 1, name: 'charm_picked', data: { charm_id: 'C1', charm_ticks: 600 } },
      { tick: 11, name: 'dash', data: {} },
      { tick: 23, name: 'dash', data: {} },
    ],
    eventCount: { dash: 2, charm_picked: 1 },
    snapshotAt: {
      1: { player: { charm_s: 10 }, charms: [{ id: 'C1', available: false, respawn_s: 45 }] },
      2: { player: { vel: [-7.2, 0, 0] } },
      600: { player: { vel: [7.2, 0, 0] } },
      601: { player: { vel: [6, 0, 0], charm_s: 0 } },
      2700: { charms: [{ available: false }] },
      2701: { charms: [{ available: true, respawn_s: 0 }] },
    },
  },
  {
    name: 'p2_pause',
    req: 'AC-05.1/05.2: paused on tick 11 after 10 sim ticks (pulse cooldown 180 − 9 = 171 → 2.85 s, clock 299.833); frozen while paused; resumed on 51; tick 60 = sim tick 20 (161 → 2.683 s, 299.667)',
    scenario: 'p2-pause',
    inputs: 'p2-pause-resume',
    ticks: 60,
    customClock: true,
    events: [
      { tick: 11, name: 'paused', data: {} },
      { tick: 51, name: 'resumed', data: {} },
    ],
    snapshotAt: {
      10: { sim_tick: 10, state: 'playing', time_left_s: 299.833, player: { pulse_cd_s: 2.85 } },
      20: { sim_tick: 10, state: 'paused', time_left_s: 299.833, player: { pulse_cd_s: 2.85 } },
      50: { sim_tick: 10, state: 'paused' },
      60: { sim_tick: 20, state: 'playing', time_left_s: 299.667, player: { pulse_cd_s: 2.683 } },
    },
  },
  {
    name: 'p2_wind',
    req: 'AC-09.1/09.3: Night 3 gust from tick 1800 to 2099 (5 s), pushing Mây 2/60 m per tick along dir_deg; same seed → same dir (rerun is byte-identical)',
    night: 3,
    scenario: 'p2-wind',
    ticks: 2100,
    snapshotEvery: 1,
    snapshotAt: { 1799: { wind: { active: false } }, 1800: { wind: { active: true } }, 2099: { wind: { active: true } }, 2100: { wind: { active: false } } },
    check: (lines) => {
      const a = snap(lines, 1799);
      const b = snap(lines, 1800);
      const t = (b.wind.dir_deg * Math.PI) / 180;
      const dx = b.player.pos[0] - a.player.pos[0];
      const dz = b.player.pos[2] - a.player.pos[2];
      return near(dx, (2 * Math.cos(t)) / 60, 0.002) && near(dz, (2 * Math.sin(t)) / 60, 0.002) ? [] : [`gust moved Mây (${dx}, ${dz}), expected 2/60 m along ${b.wind.dir_deg}°`];
    },
  },
  { name: 'p2_wind_off', req: 'AC-09.2: wind_enabled false → wind.active is false in every snapshot', night: 3, scenario: 'p2-wind-off', ticks: 2400, snapshotEvery: 60, everySnapshot: { wind: { active: false } } },
  {
    name: 'p2_bounce_pad_n2',
    req: '§4.2: the pad at (20,0,18) throws Mây (vY 14, 24 m/s at island B) about 24·83/60 = 33 m; it lands inside island B (r < 28 around (70,0)), no fall',
    night: 2,
    scenario: 'p2-pad-n2',
    ticks: 120,
    noEvents: ['player_hit'],
    snapshotAt: { 120: { player: { grounded: true } } },
    check: (lines) => {
      const p = snap(lines, 120).player.pos;
      return Math.hypot(p[0] - 70, p[2]) < 28 && p[1] === 0 ? [] : [`landed at ${p}, not on island B`];
    },
  },
  {
    name: 'p2_bounce_pad_n3',
    req: '§4.3: the pad at (0,3,13) (vY 12, 8 m/s towards −Z) lands Mây on tier 2 (Y 6, r ≤ 8), outside the tower',
    night: 3,
    scenario: 'p2-pad-n3',
    ticks: 90,
    noEvents: ['player_hit'],
    snapshotAt: { 90: { player: { grounded: true } } },
    check: (lines) => {
      const p = snap(lines, 90).player.pos;
      const r = Math.hypot(p[0], p[2]);
      return p[1] === 6 && r <= 8 && r > 2 ? [] : [`landed at ${p}, not on tier 2`];
    },
  },
  {
    name: 'p2_fall',
    req: '§3.7: off the bridge on tick 20 (z 2.05 > 2); below Y −10 after 60 more ticks → player_hit {fall, flames 2, lost 4}; respawn at (0,0,0) on 80 + 60 = 140, invulnerable',
    night: 2,
    scenario: 'p2-fall',
    inputs: 'p2-walk-off-bridge',
    ticks: 140,
    events: [{ tick: 80, name: 'player_hit', data: { by: 'fall', flames: 2, dropped: 0, lost: 4 } }],
    snapshotAt: { 80: { player: { carried: 0 } }, 140: { player: { pos: [0, 0, 0], vel: [0, 0, 0], invuln: true } } },
  },
  {
    name: 'p2_perf_full_night',
    req: 'M2: a full Night 3 (360 s = 21 600 ticks, flames 999 so it reaches dawn) runs headless in ≤ 30 s',
    night: 3,
    scenario: 'p2-full-night',
    ticks: 21600,
    snapshotEvery: 600,
    maxMs: 30000,
    events: [{ tick: 21600, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }],
  },
  { name: 'bad-scenario-state', req: 'v1.1: unknown shade state in a scenario → exit 2', scenario: 'bad-scenario-state', ticks: 10, exit: 2 },
  { name: 'bad-night', req: 'v1.1: --night accepts only 1, 2, 3 → exit ≠ 0 with stderr', night: 4, ticks: 10, exit: 1 },
];
