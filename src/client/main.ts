import * as THREE from 'three';
import { CONTRACT_TUNING, ISLAND_RADIUS, createSim, type Sim, type SimEvent } from '../sim';
import { MobaCamera } from './camera';
import { Hud } from './hud';
import { Controls } from './input/controls';
import { KeyBindings, keyLabel } from './input/keybindings';
import { IslandScene } from './scene';
import { SettingsPanel } from './settings';
import './style.css';

const T = CONTRACT_TUNING;
const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 15; // keeps real time down to ~4 fps; the sim is cheap

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const canvas = document.querySelector('#game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
const camera3d = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
const world = new IslandScene();
const cam = new MobaCamera(camera3d, canvas);
const bindings = new KeyBindings(safeStorage());
const controls = new Controls(bindings);
const hud = new Hud(bindings);
const settings = new SettingsPanel(bindings);
settings.onChange = () => {
  hud.renderKeys();
  renderHints();
};

const titleEl = document.querySelector('#title') as HTMLElement;
const endEl = document.querySelector('#ending') as HTMLElement;

type Phase = 'title' | 'playing' | 'ended';
let phase: Phase = 'title';
let sim: Sim = createSim({ seed: 1, night: 1 });
let tally = { motes: 0, lanterns: 0, stuns: 0 };

function newNight(): void {
  sim = createSim({ seed: Math.floor(Math.random() * 2 ** 31), night: 1 });
  tally = { motes: 0, lanterns: 0, stuns: 0 };
  controls.reset();
  cam.centerOn(sim.state.player.pos);
  phase = 'playing';
  titleEl.hidden = true;
  endEl.hidden = true;
  canvas.focus();
}

function renderHints(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-key]')) {
    el.textContent = keyLabel(bindings.all[el.dataset.key as keyof typeof bindings.all]);
  }
}

function showEnding(): void {
  const s = sim.state;
  const won = s.status === 'won';
  const earned =
    tally.motes * T.score.per_mote + tally.lanterns * T.score.per_lantern + tally.stuns * T.score.per_stun;
  (endEl.querySelector('h2') as HTMLElement).textContent = won ? 'Đảo Bến sáng trở lại' : 'Đêm đã qua';
  (endEl.querySelector('.reason') as HTMLElement).textContent = won
    ? 'Cả năm Đèn Lồng Lớn đã cháy. Sương đen lùi ra biển mây.'
    : s.endReason === 'dawn'
      ? `Bình minh đến khi mới thắp ${s.lanterns.filter((l) => l.lit).length} trên 5 đèn.`
      : 'Mây đã hết lửa. Bóng Mực phủ kín bến.';
  const rows: [string, string][] = [
    [`Đom đóm nhặt được`, `${tally.motes} × ${T.score.per_mote}`],
    [`Đèn đã thắp`, `${tally.lanterns} × ${T.score.per_lantern}`],
    [`Bóng Mực bị xua`, `${tally.stuns} × ${T.score.per_stun}`],
  ];
  if (won) rows.push([`Thưởng thời gian và lửa còn lại`, `${s.score - earned}`]);
  (endEl.querySelector('dl') as HTMLElement).innerHTML =
    rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') +
    `<dt class="total">Tổng điểm</dt><dd class="total">${s.score.toLocaleString('vi-VN')}</dd>`;
  endEl.hidden = false;
  (endEl.querySelector('button') as HTMLButtonElement).focus();
}

function handleEvents(events: SimEvent[]): void {
  for (const e of events) {
    if (e.name === 'mote_picked') tally.motes++;
    if (e.name === 'lantern_lit') tally.lanterns++;
    if (e.name === 'pulse') tally.stuns += e.data.stunned_ids.length;
  }
  world.onEvents(events, sim.state);
}

// --- input wiring -----------------------------------------------------------
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || phase !== 'playing') return;
  const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera3d);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, hit)) return;
  const r = Math.hypot(hit.x, hit.z);
  if (r > ISLAND_RADIUS) hit.multiplyScalar(ISLAND_RADIUS / r);
  controls.target = [hit.x, hit.z];
  world.showMarker(hit.x, hit.z);
});

controls.onAction = (action, down) => {
  if (!down) return;
  if (action === 'camera') cam.centerOn(sim.state.player.pos);
  if (action === 'restart' && phase === 'ended') newNight();
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && !settings.isOpen) {
    e.preventDefault();
    settings.open();
  }
  if (e.code === 'Enter' && phase === 'title') newNight();
});
document.querySelector('#start')!.addEventListener('click', newNight);
document.querySelector('#again')!.addEventListener('click', newNight);

// --- loop -------------------------------------------------------------------
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
  const paused = settings.isOpen;
  controls.enabled = !paused;

  if (phase === 'playing' && !paused) {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS_PER_FRAME) {
      handleEvents(sim.step(controls.sample(sim.state.player.pos)));
      acc -= STEP;
      steps++;
      if (sim.state.status !== 'playing') {
        phase = 'ended';
        showEnding();
        break;
      }
    }
    if (steps === MAX_STEPS_PER_FRAME) acc = 0;
  }

  cam.update(dt, phase === 'playing' && controls.isHeld('camera') ? sim.state.player.pos : null);
  world.sync(sim.state, paused ? 0 : dt);
  hud.update(sim.state, T.night1_duration_s);
  renderer.render(world.scene, camera3d);
  requestAnimationFrame(frame);
}
cam.centerOn([0, 0, 0]);
requestAnimationFrame(frame);
