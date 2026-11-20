import * as THREE from 'three';
import { CONTRACT_TUNING, createSim, nightDef, type NightId, type Sim, type SimEvent } from '../sim';
import { GameAudio } from './audio';
import { advanceCampaign, startCampaign, type Campaign } from './campaign';
import { MobaCamera } from './camera';
import { Hud } from './hud';
import { Controls } from './input/controls';
import { KeyBindings, keyLabel } from './input/keybindings';
import { WorldView } from './scene';
import { SettingsPanel } from './settings';
import { loadSettings } from './settingsStore';
import './style.css';

const T = CONTRACT_TUNING;
const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 15;
const NIGHT_NAMES: Record<NightId, string> = { 1: 'Đảo Bến', 2: 'Đảo Đôi', 3: 'Đảo Tháp Chuông' };
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
cam.sensitivity = loadSettings(storage).sensitivity;
const audio = new GameAudio(loadSettings(storage).volume);
const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

const titleEl = document.querySelector('#title') as HTMLElement;
const endEl = document.querySelector('#ending') as HTMLElement;
const nightLabel = document.querySelector('#night-name') as HTMLElement;

type Phase = 'title' | 'playing' | 'ended';
let phase: Phase = 'title';
let campaign: Campaign = startCampaign();
let sim: Sim = createSim({ seed: 1, night: 1 });
let world = new WorldView(nightDef(1, T));
let tally = { motes: 0, lanterns: 0, stuns: 0 };
/** One pause press waiting to reach the sim (Esc/P or the menu's Tiếp tục). */
let pauseEdge = false;

function loadNight(night: NightId): void {
  world.dispose();
  world = new WorldView(nightDef(night, T));
  cam.bounds = world.bounds;
  sim = createSim({ seed: Math.floor(Math.random() * 2 ** 31), night });
  tally = { motes: 0, lanterns: 0, stuns: 0 };
  controls.reset();
  pauseEdge = false;
  audio.reset();
  cam.centerOn(sim.state.player.pos);
  nightLabel.textContent = `Đêm ${night} · ${NIGHT_NAMES[night]}`;
}

function play(night: NightId): void {
  loadNight(night);
  phase = 'playing';
  titleEl.hidden = true;
  endEl.hidden = true;
  settings.close();
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
settings.onChange = () => {
  hud.renderKeys();
  renderHints();
  cam.sensitivity = settings.values.sensitivity;
  audio.setVolume(settings.values.volume);
};

function showEnding(): void {
  const s = sim.state;
  const won = s.status === 'won';
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
    h2.textContent = `${NIGHT_NAMES[night]} sáng trở lại`;
    reason.textContent = `Cả ${s.lanterns.length} Đèn Lồng Lớn đã cháy. Gió đưa Mây sang ${NIGHT_NAMES[campaign.night]}.`;
    button.textContent = `Sang Đêm ${campaign.night}`;
  } else {
    h2.textContent = 'Đêm đã qua';
    reason.textContent =
      s.endReason === 'dawn'
        ? `Bình minh đến khi mới thắp ${s.lanterns.filter((l) => l.lit).length} trên ${s.lanterns.length} đèn.`
        : 'Mây đã hết Ngọn Lửa. Bóng Mực phủ kín đảo.';
    button.textContent = `Chơi lại Đêm ${night}`;
  }
  const earned = tally.motes * T.score.per_mote + tally.lanterns * T.score.per_lantern + tally.stuns * T.score.per_stun;
  const rows: [string, string][] = [
    ['Đom đóm đã nạp', `${tally.motes} × ${T.score.per_mote}`],
    ['Đèn đã thắp', `${tally.lanterns} × ${T.score.per_lantern}`],
    ['Bóng Mực bị xua', `${tally.stuns} × ${T.score.per_stun}`],
  ];
  if (won) rows.push(['Thưởng thời gian và lửa còn lại', `${s.score - earned}`]);
  rows.push(['Điểm Đêm này', s.score.toLocaleString('vi-VN')]);
  (endEl.querySelector('dl') as HTMLElement).innerHTML =
    rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') +
    `<dt class="total">Tổng điểm</dt><dd class="total">${campaign.total.toLocaleString('vi-VN')}</dd>`;
  endEl.hidden = false;
  button.focus();
}

function continueAfterEnding(): void {
  if (campaign.finished) newCampaign();
  else play(campaign.night);
}

function handleEvents(events: SimEvent[]): void {
  for (const e of events) {
    if (e.name === 'deposit') tally.motes += e.data.amount;
    if (e.name === 'lantern_lit') tally.lanterns++;
    if (e.name === 'pulse') tally.stuns += e.data.stunned_ids.length;
  }
  world.onEvents(events, sim.state);
  audio.onStep(events, sim.state);
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
  titleEl.hidden = false;
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && phase === 'playing' && !settings.isCapturing) {
    e.preventDefault();
    togglePause();
  }
  if (e.code === 'Enter' && phase === 'title') newCampaign();
});
document.querySelector('#start')!.addEventListener('click', newCampaign);
document.querySelector('#again')!.addEventListener('click', continueAfterEnding);

// --- loop -------------------------------------------------------------------
const tmpProj = new THREE.Vector3();
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
      const ctrl = controls.sample(sim.state.player.pos);
      if (sim.state.paused) Object.assign(ctrl, { move: [0, 0], jump: false, interact: false, pulse: false, dash: false });
      ctrl.pause = pauseEdge;
      pauseEdge = false;
      handleEvents(sim.step(ctrl));
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
  renderer.render(world.scene, camera3d);
  requestAnimationFrame(frame);
}
cam.bounds = world.bounds;
cam.centerOn([0, 0, 0]);
// Dev shortcut: ?night=2 or ?night=3 jumps straight into that night (campaign starts there).
const devNight = Number(new URLSearchParams(location.search).get('night'));
if (devNight === 2 || devNight === 3) {
  campaign = { night: devNight, total: 0, finished: false };
  play(devNight);
}
requestAnimationFrame(frame);
