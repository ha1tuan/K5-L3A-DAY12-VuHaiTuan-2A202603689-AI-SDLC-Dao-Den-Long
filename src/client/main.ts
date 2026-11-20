import * as THREE from 'three';
import { CONTRACT_TUNING, createSim, nightDef, type NightId, type Scenario, type Sim, type SimEvent } from '../sim';
import { GameAudio } from './audio';
import { advanceCampaign, startCampaign, type Campaign } from './campaign';
import { BENCH, frameStats, orbitCamera } from './benchMath';
import { MobaCamera } from './camera';
import { CueView } from './cues';
import { isoWithZone, LeaderboardStore } from './leaderboardStore';
import type { Entry } from '../leaderboard';
import { Hud } from './hud';
import { Controls } from './input/controls';
import { KeyBindings, keyLabel } from './input/keybindings';
import { winTarget } from './lanternLook';
import { paletteFor } from './lighting';
import { WorldView } from './scene';
import { NIGHT_INTROS } from './story';
import { SettingsPanel } from './settings';
import { loadSettings } from './settingsStore';
import './style.css';

const T = CONTRACT_TUNING;
const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 15;
const NIGHT_NAMES: Record<NightId, string> = { 1: NIGHT_INTROS[1].island, 2: NIGHT_INTROS[2].island, 3: NIGHT_INTROS[3].island };
const DURATION: Record<NightId, number> = { 1: T.night1_duration_s, 2: T.night2_duration_s, 3: T.night3_duration_s };

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = safeStorage();
const canvas = document.querySelector('#game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera3d = new THREE.PerspectiveCamera(45, 1, 0.1, 600);
const cam = new MobaCamera(camera3d, canvas);
const bindings = new KeyBindings(storage);
const controls = new Controls(bindings);
const hud = new Hud(bindings);
const settings = new SettingsPanel(bindings, storage);
const cues = new CueView();
const board = new LeaderboardStore(storage);
cam.sensitivity = loadSettings(storage).sensitivity;
const audio = new GameAudio(loadSettings(storage).volume);
const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

const titleEl = document.querySelector('#title') as HTMLElement;
const endEl = document.querySelector('#ending') as HTMLElement;
const nightLabel = document.querySelector('#night-name') as HTMLElement;
const introEl = document.querySelector('#intro') as HTMLElement;

type Phase = 'title' | 'intro' | 'playing' | 'ended';
let phase: Phase = 'title';
let campaign: Campaign = startCampaign();
let sim: Sim = createSim({ seed: 1, night: 1 });
/** Seed of the night being played, saved with a leaderboard entry. */
let nightSeed = 1;
let world = new WorldView(nightDef(1, T));
const emptyTally = () => ({ motes: 0, lanterns: 0, relights: 0, stuns: 0, drainStuns: 0 });
let tally = emptyTally();
/** One pause press waiting to reach the sim (Esc/P or the menu's Tiếp tục). */
let pauseEdge = false;

function loadNight(night: NightId, scenario?: Scenario): void {
  world.dispose();
  world = new WorldView(nightDef(night, T));
  cam.bounds = world.bounds;
  applyPalette();
  nightSeed = Math.floor(Math.random() * 2 ** 31);
  sim = createSim({ seed: nightSeed, night, scenario });
  tally = emptyTally();
  cues.reset();
  controls.reset();
  pauseEdge = false;
  audio.reset();
  cam.centerOn(sim.state.player.pos);
  nightLabel.textContent = `Đêm ${night} · ${NIGHT_NAMES[night]}`;
}

/** Ông Đăng introduces the night over its island, then the night starts on Vào đêm / Enter. */
function play(night: NightId, scenario?: Scenario): void {
  loadNight(night, scenario);
  phase = 'intro';
  titleEl.hidden = true;
  endEl.hidden = true;
  settings.close();
  const intro = NIGHT_INTROS[night];
  (introEl.querySelector('.night-tag') as HTMLElement).textContent = `Đêm ${night} / 3`;
  (introEl.querySelector('h2') as HTMLElement).textContent = intro.island;
  (introEl.querySelector('blockquote') as HTMLElement).innerHTML = intro.lines.map((l) => `<p>${l}</p>`).join('');
  (introEl.querySelector('p.hint') as HTMLElement).textContent = intro.hint;
  (introEl.querySelector('#begin') as HTMLElement).textContent = `Vào Đêm ${night}`;
  introEl.hidden = false;
  (introEl.querySelector('#begin') as HTMLButtonElement).focus();
}

function beginNight(): void {
  if (phase !== 'intro') return;
  phase = 'playing';
  introEl.hidden = true;
  acc = 0;
  canvas.focus();
}

function newCampaign(): void {
  campaign = startCampaign();
  play(1);
}

function renderHints(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-key]')) {
    el.textContent = keyLabel(bindings.all[el.dataset.key as keyof typeof bindings.all]);
  }
}
/** PRD v3 §5.6: "Bảng màu dễ phân biệt" recolours the shades and turns UI warnings white with ⚠. */
function applyPalette(): void {
  const colorblind = settings.values.colorblind;
  document.body.classList.toggle('colorblind', colorblind);
  world.setColorScheme(paletteFor(colorblind));
  // PRD v4 §4: reduced motion (no flashes or blinking) and large UI text ×1.25.
  document.body.classList.toggle('reduce-motion', settings.values.reduceMotion);
  document.documentElement.classList.toggle('large-text', settings.values.largeText);
  world.reduceMotion = settings.values.reduceMotion;
}
settings.onChange = () => {
  applyPalette();
  hud.renderKeys();
  renderHints();
  cam.sensitivity = settings.values.sensitivity;
  audio.setVolume(settings.values.volume);
};

function showEnding(): void {
  const s = sim.state;
  const won = s.status === 'won';
  const litAtEnd = s.lanterns.filter((l) => l.lit).length;
  const night = campaign.night;
  campaign = advanceCampaign(campaign, { won, score: s.score });
  const h2 = endEl.querySelector('h2') as HTMLElement;
  const reason = endEl.querySelector('.reason') as HTMLElement;
  const button = endEl.querySelector('#again') as HTMLButtonElement;
  if (campaign.finished) {
    h2.textContent = 'Bình minh trên ba hòn đảo';
    reason.textContent = 'Chuông tháp ngân, sương đen tan vào biển mây. Đảo Đèn Lồng sáng trở lại.';
    button.textContent = 'Chơi lại từ Đêm 1';
  } else if (won) {
    h2.textContent = `${NIGHT_NAMES[night]} đón bình minh`;
    reason.textContent = `Mây giữ ${litAtEnd} trên ${s.lanterns.length} Đèn Lồng Lớn còn sáng tới sáng. Gió đưa Mây sang ${NIGHT_NAMES[campaign.night]}.`;
    button.textContent = `Sang Đêm ${campaign.night}`;
  } else {
    h2.textContent = 'Đêm đã qua';
    reason.textContent =
      s.endReason === 'dawn'
        ? `Bình minh đến khi chỉ còn ${litAtEnd} trên ${s.lanterns.length} đèn sáng, cần ít nhất ${winTarget(s.lanterns.length)}.`
        : 'Mây đã hết Ngọn Lửa. Bóng Mực phủ kín đảo.';
    button.textContent = `Chơi lại Đêm ${night}`;
  }
  const sc = T.score;
  const earned =
    tally.motes * sc.per_mote + tally.lanterns * sc.per_lantern + tally.relights * sc.per_relight + tally.stuns * sc.per_stun + tally.drainStuns * sc.per_stun_drain;
  const rows: [string, string][] = [
    ['Đom đóm đã nạp và châm', `${tally.motes} × ${sc.per_mote}`],
    ['Đèn thắp lần đầu', `${tally.lanterns} × ${sc.per_lantern}`],
    ['Đèn thắp lại', `${tally.relights} × ${sc.per_relight}`],
    ['Bóng Mực bị xua', `${tally.stuns} × ${sc.per_stun}`],
    ['Bóng Mực đang hút dầu bị xua', `${tally.drainStuns} × ${sc.per_stun_drain}`],
  ];
  // PRD v3 §5.5: at dawn, 50 + floor(fuel) per lit lantern and 50 per flame left.
  if (won) rows.push(['Thưởng bình minh: đèn còn sáng và lửa còn lại', `${s.score - earned}`]);
  rows.push(['Điểm Đêm này', s.score.toLocaleString('vi-VN')]);
  (endEl.querySelector('dl') as HTMLElement).innerHTML =
    rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') +
    `<dt class="total">Tổng điểm</dt><dd class="total">${campaign.total.toLocaleString('vi-VN')}</dd>`;
  // PRD v4 §3: after Màn Bình Minh or any lost night, offer to save the chain's score.
  const offer = campaign.finished || !won;
  saveForm.hidden = !offer;
  if (offer) {
    pendingEntry = { score: campaign.total, nights_won: campaign.finished ? 3 : campaign.night - 1, seed: nightSeed };
    saveInput.disabled = false;
    saveButton.disabled = false;
    saveMsg.textContent = `Tổng điểm ${campaign.total.toLocaleString('vi-VN')}, ${pendingEntry.nights_won}/3 Đêm thắng. Tên: 3–12 ký tự, chữ (có dấu cũng được), số hoặc _.`;
  }
  endEl.hidden = false;
  if (offer) saveInput.focus();
  else button.focus();
}

// --- leaderboard (PRD v4 §3) -------------------------------------------------
const saveForm = document.querySelector('#save-score') as HTMLFormElement;
const saveInput = document.querySelector('#player-name') as HTMLInputElement;
const saveButton = saveForm.querySelector('button') as HTMLButtonElement;
const saveMsg = saveForm.querySelector('.save-msg') as HTMLElement;
const boardEl = document.querySelector('#board') as HTMLElement;
let pendingEntry: Omit<Entry, 'name' | 'achieved_at'> | null = null;
const escapeHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

saveForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pendingEntry) return;
  const entry: Entry = { name: saveInput.value.trim(), achieved_at: isoWithZone(new Date()), ...pendingEntry };
  try {
    const { entries, onDisk } = await board.add(entry);
    const rank = entries.findIndex((x) => x.name === entry.name.normalize('NFC') && x.achieved_at === entry.achieved_at) + 1;
    saveMsg.textContent = rank ? `Đã lưu: hạng ${rank} trên Bảng xếp hạng${onDisk ? '' : ' (trong trình duyệt này)'}.` : 'Đã lưu, nhưng điểm chưa vào top 10.';
    pendingEntry = null;
    saveInput.disabled = true;
    saveButton.disabled = true;
    (endEl.querySelector('#again') as HTMLButtonElement).focus();
  } catch (err) {
    saveMsg.textContent = (err as Error).message;
    saveInput.focus();
  }
});

async function showBoard(): Promise<void> {
  phase = 'title';
  titleEl.hidden = true;
  boardEl.hidden = false;
  const list = boardEl.querySelector('.board-list') as HTMLElement;
  const { entries } = await board.list();
  (boardEl.querySelector('.board-empty') as HTMLElement).hidden = entries.length > 0;
  list.innerHTML = entries
    .map(
      (x) =>
        `<li><span class="who">${escapeHtml(x.name)}</span><span class="pts">${x.score.toLocaleString('vi-VN')}</span>` +
        `<span class="meta">${x.nights_won}/3 Đêm · ${new Date(x.achieved_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span></li>`,
    )
    .join('');
  (boardEl.querySelector('#close-board') as HTMLButtonElement).focus();
}
document.querySelector('#open-board')!.addEventListener('click', () => void showBoard());
document.querySelector('#close-board')!.addEventListener('click', () => {
  boardEl.hidden = true;
  titleEl.hidden = false;
});

function continueAfterEnding(): void {
  if (campaign.finished) newCampaign();
  else play(campaign.night);
}

/** draining: ids of the shades that were draining just before this step (a pulse on them is worth more). */
function handleEvents(events: SimEvent[], draining: Set<string>): void {
  for (const e of events) {
    if (e.name === 'deposit' || e.name === 'refuel') tally.motes += e.data.amount;
    if (e.name === 'lantern_lit') e.data.relight ? tally.relights++ : tally.lanterns++;
    if (e.name === 'pulse')
      for (const id of e.data.stunned_ids) draining.has(id) ? tally.drainStuns++ : tally.stuns++;
  }
  world.onEvents(events, sim.state);
  audio.onStep(events, sim.state);
  cues.onStep(sim.state, events);
}

// --- input wiring -----------------------------------------------------------
const raycaster = new THREE.Raycaster();
const seaLevel = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || phase !== 'playing' || sim.state.paused) return;
  const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera3d);
  const hit = raycaster.intersectObjects(world.pickables, false)[0]?.point ?? raycaster.ray.intersectPlane(seaLevel, new THREE.Vector3());
  if (!hit) return;
  // No invisible wall: a click past the edge sends Mây over it (§3.7 fall).
  controls.target = [hit.x, hit.z];
  world.showMarker(hit.x, hit.y, hit.z);
});

const togglePause = () => {
  if (phase !== 'playing') return;
  pauseEdge = true;
};
controls.onAction = (action, down) => {
  if (!down) return;
  if (action === 'camera') cam.centerOn(sim.state.player.pos);
  if (action === 'pause') togglePause();
  if (action === 'restart' && phase === 'ended') continueAfterEnding();
};
settings.onResume = togglePause;
settings.onRestart = () => play(campaign.night);
settings.onMenu = () => {
  phase = 'title';
  settings.close();
  endEl.hidden = true;
  introEl.hidden = true;
  titleEl.hidden = false;
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && phase === 'playing' && !settings.isCapturing) {
    e.preventDefault();
    togglePause();
  }
  if (e.code === 'Enter' && phase === 'title' && boardEl.hidden) newCampaign();
  else if (e.code === 'Enter' && phase === 'intro') {
    e.preventDefault();
    beginNight();
  }
});
document.querySelector('#start')!.addEventListener('click', newCampaign);
document.querySelector('#begin')!.addEventListener('click', beginNight);
document.querySelector('#again')!.addEventListener('click', continueAfterEnding);

// --- loop -------------------------------------------------------------------
const tmpProj = new THREE.Vector3();
const viewDir = new THREE.Vector3();
const project = (p: readonly number[]) => {
  tmpProj.set(p[0], p[1], p[2]).project(camera3d);
  return { x: ((tmpProj.x + 1) / 2) * window.innerWidth, y: ((1 - tmpProj.y) / 2) * window.innerHeight, inFront: tmpProj.z < 1 };
};
function resize(): void {
  const { innerWidth: w, innerHeight: h } = window;
  renderer.setSize(w, h, false);
  camera3d.aspect = w / h;
  camera3d.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
renderHints();

let acc = 0;
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;

  if (phase === 'playing') {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS_PER_FRAME) {
      camera3d.getWorldDirection(viewDir);
      const ctrl = controls.sample(sim.state.player.pos, [viewDir.x, viewDir.z]);
      if (sim.state.paused) Object.assign(ctrl, { move: [0, 0], jump: false, interact: false, pulse: false, dash: false });
      ctrl.pause = pauseEdge;
      pauseEdge = false;
      const draining = new Set(sim.state.shades.filter((x) => x.state === 'drain').map((x) => x.id));
      handleEvents(sim.step(ctrl), draining);
      acc -= STEP;
      steps++;
      if (sim.state.status !== 'playing') {
        phase = 'ended';
        settings.close();
        showEnding();
        break;
      }
    }
    if (steps === MAX_STEPS_PER_FRAME) acc = 0;
    // The menu follows the sim's own paused flag (A17).
    if (phase === 'playing' && sim.state.paused !== settings.isOpen) sim.state.paused ? settings.open() : settings.close();
  }
  const frozen = phase === 'playing' && sim.state.paused;

  cam.update(dt, phase === 'playing' && !frozen && controls.isHeld('camera') ? sim.state.player.pos : null);
  world.sync(sim.state, frozen ? 0 : dt);
  audio.setPaused(frozen || phase !== 'playing');
  hud.update(sim.state, DURATION[sim.state.night], project);
  cues.draw(sim.state, project, phase !== 'playing' || frozen);
  renderer.render(world.scene, camera3d);
  requestAnimationFrame(frame);
}
cam.bounds = world.bounds;
applyPalette();
cam.centerOn([0, 0, 0]);
// Dev shortcut: ?night=2 or ?night=3 jumps straight into that night (campaign starts there).
const params = new URLSearchParams(location.search);
const devNight = Number(params.get('night'));
if (devNight === 2 || devNight === 3) {
  campaign = { night: devNight, total: 0, finished: false };
  play(devNight);
}
// Dev shortcut: ?demo=fuel opens Night 1 mid-way with every Phase 3 lantern look on screen
// (a low-fuel lantern being drained, a full one, a dark one that burned out, a never-lit one).
if (params.get('demo') === 'fuel') {
  play(1, {
    time_left_s: 95,
    player: { pos: [3.5, 0, 21], carried: 7, successful_lights: 3 },
    lanterns: [
      { id: 'L1', lit: true, fuel: 28, deposited: 10 },
      { id: 'L2', lit: true, fuel: 88, deposited: 10 },
      { id: 'L3', lit: false, ever_lit: true, deposited: 2 },
    ],
    shades: [{ id: 'S1', pos: [-1.2, 1, 26.5], state: 'drain', target_lantern_id: 'L1' }],
  });
}

/**
 * PRD v4 §1 benchmark scene (?bench=1&seed=42&duration=30): Night 1 with the full look, the sim's bench
 * mode (200 wandering shades, 100 motes, L1–L3 lit), no input, the camera on its 15 s orbit.
 * After 3 s of warm-up it records every frame's dt for `duration` s and publishes the stats on window.__bench.
 */
function runBench(seed: number, durationS: number): void {
  titleEl.hidden = true;
  world.dispose();
  world = new WorldView(nightDef(1, T));
  applyPalette();
  sim = createSim({ seed, night: 1, bench: true });
  const idle = { move: [0, 0] as [number, number], camYawDeg: 0, jump: false, interact: false, pulse: false };
  const dts: number[] = [];
  let start = -1;
  let prev = 0;
  let simAcc = 0;
  const w = window as unknown as { __bench?: object; __THREE_REVISION?: string };
  w.__THREE_REVISION = THREE.REVISION;
  function benchFrame(now: number): void {
    if (start < 0) {
      start = now;
      prev = now;
      w.__bench = { state: 'running', first_frame_epoch_ms: performance.timeOrigin + now };
    }
    const dtMs = now - prev;
    prev = now;
    const t = (now - start) / 1000;
    if (t > BENCH.warmupS && dtMs > 0) dts.push(dtMs);
    simAcc += Math.min(0.25, dtMs / 1000);
    while (simAcc >= STEP) {
      handleEvents(sim.step(idle), new Set());
      simAcc -= STEP;
    }
    const [x, y, z] = orbitCamera(t);
    camera3d.position.set(x, y, z);
    camera3d.lookAt(0, 0, 0);
    world.sync(sim.state, dtMs / 1000);
    hud.update(sim.state, DURATION[1], project);
    renderer.render(world.scene, camera3d);
    if (t >= BENCH.warmupS + durationS) {
      w.__bench = { ...w.__bench, state: 'done', ...frameStats(dts) };
      return;
    }
    requestAnimationFrame(benchFrame);
  }
  requestAnimationFrame(benchFrame);
}

if (params.get('bench')) runBench(Number(params.get('seed') ?? 42), Number(params.get('duration') ?? 30));
else requestAnimationFrame(frame);
