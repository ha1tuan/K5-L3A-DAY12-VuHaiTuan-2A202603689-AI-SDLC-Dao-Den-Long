#!/usr/bin/env node
// End-to-end verification against the REAL headless binary (Test Contract v1.0).
// Writes evidence to docs/evidence/<phase>/ and exits non-zero if anything fails.
//
//   node scripts/verify.mjs [--phase phase-1] [--only <case-name>]
//
// Requires `npm run build` first (npm run verify does both).

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cases } from '../scenarios/cases.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const PHASE = arg('--phase', 'phase-1');
const ONLY = arg('--only', null);
const EVIDENCE = join(ROOT, 'docs', 'evidence', PHASE);
const OUT = join(EVIDENCE, 'out');
const contract = JSON.parse(readFileSync(join(ROOT, 'game.contract.json'), 'utf8'));
const HEADLESS = contract.headless_cmd.split(' ');

const EVENT_NAMES = new Set(['mote_picked', 'deposit', 'lantern_lit', 'pulse', 'player_hit', 'shade_spawned', 'game_over']);
const KEEP_FULL_OUTPUT_LINES = 400; // larger outputs are kept as head/tail + sha256

// ---------------------------------------------------------------- helpers
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

/** Deep partial match: every key in `want` must equal the value in `got` (arrays match by index). */
function partialMismatch(got, want, path = '') {
  if (want === null || typeof want !== 'object') return Object.is(got, want) || got === want ? null : `${path || '.'}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`;
  if (got === null || typeof got !== 'object') return `${path}: expected object/array, got ${JSON.stringify(got)}`;
  for (const k of Object.keys(want)) {
    const m = partialMismatch(got[k], want[k], `${path}${Array.isArray(want) ? `[${k}]` : `.${k}`}`);
    if (m) return m;
  }
  return null;
}

function run(c, outFile) {
  const args = [...HEADLESS.slice(1), '--seed', String(c.seed ?? 1), '--night', '1', '--ticks', String(c.ticks), '--out', outFile];
  if (c.scenario) args.push('--scenario', join(ROOT, 'scenarios', `${c.scenario}.json`));
  if (c.inputs) args.push('--inputs', join(ROOT, 'inputs', `${c.inputs}.json`));
  if (c.snapshotEvery) args.push('--snapshot-every', String(c.snapshotEvery));
  const t0 = process.hrtime.bigint();
  const r = spawnSync(HEADLESS[0], args, { cwd: ROOT, encoding: 'utf8' });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { code: r.status, stderr: r.stderr.trim(), ms, cmd: `${contract.headless_cmd} ${args.slice(HEADLESS.length - 1).map((a) => (a.startsWith(ROOT) ? relative(ROOT, a) : a)).join(' ')}` };
}

/** Generic Test Contract §B/§E checks that hold for every successful run. */
function contractChecks(lines, c) {
  const errs = [];
  const every = c.snapshotEvery ?? 10;
  if (lines[0]?.type !== 'snapshot' || lines[0].tick !== 0) errs.push('first line is not the tick-0 snapshot');
  const end = lines.at(-1);
  if (end?.type !== 'end') errs.push('last line is not the end line');
  if (lines.filter((l) => l.type === 'end').length !== 1) errs.push('exactly one end line expected');
  let lastTick = 0;
  for (const l of lines.slice(0, -1)) {
    if (!['snapshot', 'event'].includes(l.type)) errs.push(`unknown line type ${l.type}`);
    if (l.tick < lastTick) errs.push(`tick went backwards at ${l.tick}`);
    lastTick = l.tick;
    if (l.type === 'event' && !EVENT_NAMES.has(l.name)) errs.push(`unknown event ${l.name}`);
    if (l.type === 'snapshot') {
      if (l.sim_tick !== l.tick) errs.push(`sim_tick ≠ tick at ${l.tick}`);
      if (!['playing', 'won', 'lost'].includes(l.state)) errs.push(`bad state ${l.state}`);
      const onCadence = l.tick % every === 0;
      const isFinal = l.state !== 'playing';
      if (!onCadence && !isFinal) errs.push(`off-cadence snapshot at tick ${l.tick}`);
      const coords = [l.player.pos, ...l.lanterns.map((x) => x.pos), ...l.shades.map((x) => x.pos), ...(l.motes ?? []).map((x) => x.pos)];
      for (const p of coords) for (const v of p) if (Math.round(v * 1000) / 1000 !== v) errs.push(`coordinate ${v} not rounded to 3 decimals`);
      if (Math.abs(l.time_left_s - (contract.tuning.night1_duration_s - l.tick / 60)) > 0.001 && c.scenario !== 'lose-dawn')
        errs.push(`time_left_s ${l.time_left_s} ≠ duration − tick/60 at ${l.tick}`);
      for (const sh of l.shades) if (!['chase', 'stunned'].includes(sh.state)) errs.push(`shade state ${sh.state}`);
    }
  }
  const snapTicks = lines.filter((l) => l.type === 'snapshot').map((l) => l.tick);
  if (end && end.state === 'playing' && end.ticks !== c.ticks) errs.push(`ran ${end.ticks} steps, expected exactly --ticks ${c.ticks}`);
  if (end && end.state !== 'playing' && lines.findLast((l) => l.type === 'event')?.name !== 'game_over') errs.push('game ended without game_over as the last event');
  if (c.snapshotTicks && JSON.stringify(snapTicks) !== JSON.stringify(c.snapshotTicks)) errs.push(`snapshot ticks ${snapTicks} ≠ ${c.snapshotTicks}`);
  return errs;
}

function expectationChecks(lines, c) {
  const errs = [];
  const events = lines.filter((l) => l.type === 'event');
  let from = 0;
  for (const want of c.events ?? []) {
    const i = events.findIndex((e, idx) => idx >= from && !partialMismatch(e, want));
    if (i < 0) errs.push(`missing event (in order): ${JSON.stringify(want)}`);
    else from = i + 1;
  }
  for (const n of c.noEvents ?? []) if (events.some((e) => e.name === n)) errs.push(`unexpected event ${n}`);
  for (const [n, k] of Object.entries(c.eventCount ?? {})) {
    const got = events.filter((e) => e.name === n).length;
    if (got !== k) errs.push(`expected ${k} × ${n}, got ${got}`);
  }
  for (const [tick, want] of Object.entries(c.snapshotAt ?? {})) {
    const snap = lines.find((l) => l.type === 'snapshot' && l.tick === Number(tick));
    if (!snap) errs.push(`no snapshot at tick ${tick}`);
    else {
      const m = partialMismatch(snap, want);
      if (m) errs.push(`snapshot ${tick} ${m}`);
    }
  }
  if (c.end) {
    const m = partialMismatch(lines.at(-1), c.end);
    if (m) errs.push(`end ${m}`);
  }
  return errs;
}

// Static guard (Architect.md §7): the sim must stay pure and deterministic.
function staticSimScan() {
  const FORBIDDEN = [/from ['"]three['"]/, /from ['"]node:/, /\bdocument\./, /\bwindow\./, /Math\.random\s*\(/, /Date\.now\s*\(/, /performance\.now\s*\(/];
  const errs = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ts')) {
        const src = readFileSync(p, 'utf8');
        for (const re of FORBIDDEN) if (re.test(src)) errs.push(`${relative(ROOT, p)} matches ${re}`);
      }
    }
  };
  walk(join(ROOT, 'src', 'sim'));
  return errs;
}

function tuningChecks() {
  const t = contract.tuning;
  const errs = [];
  const want = ['player_speed', 'carry_capacity', 'lantern_cost', 'lantern_count_night1', 'pickup_radius', 'interact_radius', 'pulse_cost', 'pulse_radius', 'night1_duration_s', 'flames', 'invuln_s', 'hit_drop_ratio', 'pulse_stun_s', 'pulse_push_m', 'pulse_cooldown_s', 'safe_radius', 'shade_speed', 'shade_hit_radius', 'fall_enabled'];
  for (const k of want) if (!(k in t)) errs.push(`tuning.${k} missing`);
  for (const k of ['per_mote', 'per_lantern', 'per_stun', 'per_second_left', 'per_flame_left']) if (typeof t.score?.[k] !== 'number') errs.push(`tuning.score.${k} missing`);
  if (contract.contract_version !== '1.0') errs.push('contract_version must be "1.0"');
  if (t.lantern_count_night1 !== 5) errs.push('lantern_count_night1 must be 5');
  return errs;
}

// ---------------------------------------------------------------- main
if (!existsSync(join(ROOT, HEADLESS[1] ?? ''))) {
  console.error(`headless binary not found (${contract.headless_cmd}); run npm run build first`);
  process.exit(1);
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const results = [];
const record = (name, req, ok, detail, extra = {}) => {
  results.push({ name, req, ok, detail, ...extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      ${detail.replaceAll('\n', '\n      ')}`}`);
};

const staticErrs = staticSimScan();
record('static-sim-purity', 'Architect §7: src/sim has no three/DOM/Node/Math.random/clock', staticErrs.length === 0, staticErrs.join('\n') || 'clean');
const tuningErrs = tuningChecks();
record('contract-file', 'A: game.contract.json has version 1.0 and every tuning key', tuningErrs.length === 0, tuningErrs.join('\n') || 'complete');

for (const c of cases.filter((x) => !ONLY || x.name === ONLY)) {
  const fileA = join(OUT, `${c.name}.jsonl`);
  const fileB = join(OUT, `${c.name}.rerun.jsonl`);
  const a = run(c, fileA);
  const expectExit = c.exit ?? 0;
  if (a.code !== expectExit) {
    record(c.name, c.req, false, `exit ${a.code}, expected ${expectExit}. stderr: ${a.stderr}`, { cmd: a.cmd });
    continue;
  }
  if (expectExit !== 0) {
    const okStderr = a.stderr.length > 0;
    record(c.name, c.req, okStderr, okStderr ? `exit ${a.code}; stderr: ${a.stderr}` : 'no message on stderr', { cmd: a.cmd });
    continue;
  }
  const text = readFileSync(fileA, 'utf8');
  const b = run(c, fileB);
  const rerun = b.code === 0 ? readFileSync(fileB, 'utf8') : '';
  rmSync(fileB, { force: true });
  const lines = text.trim().split('\n').map((l) => JSON.parse(l));
  const errs = [...contractChecks(lines, c), ...expectationChecks(lines, c)];
  if (text !== rerun) errs.push('NOT deterministic: second run differs');
  if (lines.length > KEEP_FULL_OUTPUT_LINES) {
    const raw = text.trim().split('\n');
    writeFileSync(fileA, [...raw.slice(0, 20), `... ${raw.length - 40} lines omitted; full output sha256/16 = ${sha(text)} ...`, ...raw.slice(-20)].join('\n') + '\n');
  }
  const end = lines.at(-1);
  record(c.name, c.req, errs.length === 0, errs.join('\n') || `end ${JSON.stringify(end)}; deterministic (sha ${sha(text)}); ${a.ms.toFixed(0)} ms`, { cmd: a.cmd });
}

// ---------------------------------------------------------------- report
const passed = results.filter((r) => r.ok).length;
const sys = `${process.platform} ${process.arch}, Node ${process.version}`;
const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const dirty = spawnSync('git', ['status', '--porcelain', '--', 'src', 'game.contract.json', 'scenarios', 'inputs'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const esc = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', '<br>');
const md = [
  `# Verify report: ${PHASE}`,
  '',
  `Generated by \`npm run verify\` against the real headless binary (\`${contract.headless_cmd}\`).`,
  `Commit \`${commit}\`${dirty ? ' **with uncommitted changes in src/scenarios**' : ''}; ${sys}.`,
  '',
  `**${passed}/${results.length} checks passed.** Every successful case is also run twice and compared byte-for-byte.`,
  'Outputs are in `out/`; outputs over 400 lines are trimmed to head and tail plus a sha256 prefix.',
  '',
  '| Case | Proves | Result | Detail |',
  '|---|---|---|---|',
  ...results.map((r) => `| \`${r.name}\` | ${esc(r.req)} | ${r.ok ? 'pass' : '**FAIL**'} | ${esc(r.detail)} |`),
  '',
  '## Commands',
  '',
  ...results.filter((r) => r.cmd).map((r) => `- \`${r.name}\`: \`${r.cmd}\``),
  '',
].join('\n');
writeFileSync(join(EVIDENCE, 'verify-report.md'), md);
console.log(`\n${passed}/${results.length} passed → ${relative(ROOT, join(EVIDENCE, 'verify-report.md'))}`);
process.exit(passed === results.length ? 0 : 1);
