import { CONTRACT_TUNING, isFullFuel, secondsToTicks, WIND_EVERY_TICKS, WIND_WARN_TICKS, type Lantern, type SimState, type Vec3 } from '../sim';
import { depositCost, fuelFraction, isWeakLantern, winTarget } from './lanternLook';
import { ACTIONS, keyLabel, type KeyBindings } from './input/keybindings';

const T = CONTRACT_TUNING;
const PULSE_CD_TICKS = secondsToTicks(T.pulse_cooldown_s);
const DASH_CD_TICKS = secondsToTicks(T.dash_cooldown_s);
const $ = <E extends HTMLElement>(sel: string) => document.querySelector(sel) as E;

const fmtTime = (s: number) => {
  const total = Math.ceil(Math.max(0, s));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Screen position of a world point: px from the top-left, and whether it is in front of the camera. */
export type Project = (p: Vec3) => { x: number; y: number; inFront: boolean };

/**
 * DOM overlay (F-08). Reads the sim state; never writes to it.
 * Top: Ngọn Lửa (left), clock and lantern string (centre), lanterns k/n and score (right).
 * Bottom: jar sized to the current capacity (centre) with the lantern prompt above it, keys with cooldowns (right).
 * Phase 3: each lit lantern shows a fuel bar that blinks at 1 Hz when low; dark ones sag and show what they need.
 */
export class Hud {
  private lanterns = $('#lantern-string');
  private litCount = $('#lit-count');
  private moon = $('#moon');
  private clock = $('#clock');
  private score = $('#score');
  private flames = $('#flames');
  private jar = $('#jar');
  private jarCount = $('#jar-count');
  private keys = $('#keys');
  private prompt = $('#prompt');
  private arrow = $('#arrow');
  private banner = $('#banner');
  private last = '';
  private lastFlames = -1;
  private lastCarried = -1;
  private lastCapacity = -1;

  constructor(private readonly bindings: KeyBindings) {
    this.renderKeys();
  }

  renderKeys(): void {
    const shown = ACTIONS.filter((a) => a.action !== 'restart');
    this.keys.innerHTML = shown
      .map((a) => `<li data-action="${a.action}"><kbd>${keyLabel(this.bindings.all[a.action])}</kbd><span>${a.label}</span></li>`)
      .join('');
    this.last = '';
  }

  update(s: Readonly<SimState>, nightS: number, project: Project): void {
    // Lantern string: rebuild only when lantern progress changes; the string sags towards the middle.
    // Fuel moves every tick, so the signature uses whole percent steps.
    const sig = s.lanterns.map((l) => `${l.lit ? 1 : 0}${l.deposited}${l.everLit ? 1 : 0}${Math.round(fuelFraction(l) * 100)}${isWeakLantern(l) ? 1 : 0}`).join('|');
    if (sig !== this.last) {
      this.last = sig;
      const n = s.lanterns.length;
      this.lanterns.innerHTML = s.lanterns.map((l, i) => this.lanternItem(l, i, n)).join('');
      const lit = s.lanterns.filter((l) => l.lit).length;
      const need = winTarget(n);
      this.litCount.innerHTML = `${lit}/${n} <span class="need ${lit < need ? 'warn' : ''}">cần ${need}</span>`;
    }

    const progress = 1 - Math.max(0, s.timeLeftS) / nightS;
    this.moon.style.setProperty('--progress', progress.toFixed(4));
    this.clock.textContent = fmtTime(s.timeLeftS);
    this.clock.classList.toggle('late', s.timeLeftS <= 30); // AC-08.2: red and blinking from 0:30
    this.score.textContent = s.score.toLocaleString('vi-VN');

    if (s.player.flames !== this.lastFlames) {
      const lost = s.player.flames < this.lastFlames;
      this.lastFlames = s.player.flames;
      this.flames.innerHTML = Array.from({ length: T.flames }, (_, i) => `<li class="${i < s.player.flames ? 'on' : 'out'}"></li>`).join('');
      this.flames.setAttribute('aria-label', `Ngọn Lửa: ${s.player.flames}`);
      if (lost) this.flash(this.flames);
    }
    if (s.player.carried !== this.lastCarried || s.player.capacity !== this.lastCapacity) {
      this.lastCarried = s.player.carried;
      this.lastCapacity = s.player.capacity;
      const slots = Math.max(s.player.capacity, s.player.carried);
      this.jar.innerHTML = Array.from({ length: slots }, (_, i) => `<li class="${i < s.player.carried ? 'on' : ''}"></li>`).join('');
      this.jarCount.textContent = `${s.player.carried}/${s.player.capacity}`; // PRD v3 §5.4: đang_mang / sức_chứa
    }

    // Cooldown sweeps on Tỏa Sáng and Lướt; Bùa Gió makes Lướt free.
    const pulseKey = this.keys.querySelector<HTMLElement>('[data-action="pulse"]');
    if (pulseKey) {
      pulseKey.style.setProperty('--cd', (s.player.pulseCooldownTicks / PULSE_CD_TICKS).toFixed(3));
      pulseKey.classList.toggle('unavailable', s.player.carried < T.pulse_cost);
    }
    const dashKey = this.keys.querySelector<HTMLElement>('[data-action="dash"]');
    if (dashKey) {
      const charmed = s.player.charmTicks > 0;
      dashKey.style.setProperty('--cd', charmed ? '0' : (s.player.dashCooldownTicks / DASH_CD_TICKS).toFixed(3));
      dashKey.classList.toggle('charmed', charmed);
      const label = dashKey.querySelector('span')!;
      label.textContent = charmed ? `Lướt · Bùa Gió ${Math.ceil(s.player.charmTicks / 60)}s` : 'Lướt';
    }

    this.updatePrompt(s);
    this.updateArrow(s, project);
    this.updateBanner(s);
  }

  private lanternItem(l: Readonly<Lantern>, i: number, n: number): string {
    const sag = Math.round(Math.sin((Math.PI * (i + 0.5)) / n) * 13);
    const cost = depositCost(l);
    const fuel = fuelFraction(l);
    const weak = isWeakLantern(l);
    const fill = l.lit ? Math.round(fuel * 100) : Math.round((l.deposited / cost) * 100);
    const note = l.lit ? `dầu ${Math.round(fuel * 100)}%${weak ? ', sắp cạn' : ''}` : `${l.deposited}/${cost}${l.everLit ? ', thắp lại' : ''}`;
    const cls = [l.lit ? 'lit' : 'dark', weak ? 'weak' : ''].join(' ');
    return `<li class="${cls}" style="margin-top:${sag}px" aria-label="Đèn ${l.id}: ${note}">
      <span class="cord"></span>
      <span class="lantern"><span class="fill" style="height:${fill}%"></span></span>
      ${l.lit ? `<span class="fuel" style="--fuel:${fuel.toFixed(2)}"><span></span></span>` : `<span class="note">${l.deposited}/${cost}</span>`}
    </li>`;
  }

  /** Prompt next to the lantern an interact would reach (A40): deposit, relight or refuel. */
  private updatePrompt(s: Readonly<SimState>): void {
    const p = s.player.pos;
    let near: Readonly<Lantern> | null = null;
    let best = Infinity;
    for (const l of s.lanterns) {
      const d = Math.hypot(l.pos[0] - p[0], l.pos[2] - p[2]);
      if (d <= T.interact_radius && d < best && !(l.lit && isFullFuel(l.fuelTicks, T))) [near, best] = [l, d];
    }
    this.prompt.hidden = !near || s.paused;
    if (!near) return;
    const key = keyLabel(this.bindings.all.interact);
    const has = s.player.carried > 0;
    if (near.lit) {
      const pct = Math.round(fuelFraction(near) * 100);
      const warn = isWeakLantern(near) ? ' <span class="warn">sắp cạn</span>' : '';
      this.prompt.innerHTML = has ? `<kbd>${key}</kbd> Châm dầu (${pct}%)${warn}` : `Dầu ${pct}%${warn}: cần đom đóm để châm`;
      return;
    }
    const cost = depositCost(near);
    const verb = near.everLit ? 'Thắp lại' : 'Nạp ánh sáng';
    this.prompt.innerHTML = has ? `<kbd>${key}</kbd> ${verb} (${near.deposited}/${cost})` : `Đèn ${near.deposited}/${cost}: cần đom đóm để nạp`;
  }

  /** Arrow at the screen edge pointing to the nearest lantern that needs Mây (dark or low on fuel) when it is off screen. */
  private updateArrow(s: Readonly<SimState>, project: Project): void {
    const p = s.player.pos;
    let best: Vec3 | null = null;
    let bestD = Infinity;
    for (const l of s.lanterns) {
      if (l.lit && !isWeakLantern(l)) continue;
      const d = Math.hypot(l.pos[0] - p[0], l.pos[2] - p[2]);
      if (d < bestD) [best, bestD] = [l.pos, d];
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const mx = 56;
    const my = 130; // keep clear of the top and bottom HUD rows
    if (!best || s.paused) return void (this.arrow.hidden = true);
    const sp = project([best[0], best[1] + 3, best[2]]);
    const onScreen = sp.inFront && sp.x > mx && sp.x < w - mx && sp.y > my && sp.y < h - my;
    this.arrow.hidden = onScreen;
    if (onScreen) return;
    let dx = sp.x - w / 2;
    let dy = sp.y - h / 2;
    if (!sp.inFront) [dx, dy] = [-dx, -dy];
    const k = Math.min((w / 2 - mx) / Math.abs(dx || 1e-6), (h / 2 - my) / Math.abs(dy || 1e-6));
    this.arrow.style.transform = `translate(${w / 2 + dx * k}px, ${h / 2 + dy * k}px) rotate(${Math.atan2(dy, dx)}rad)`;
    this.arrow.setAttribute('aria-label', `Đèn cần thắp hoặc châm dầu gần nhất cách ${Math.round(bestD)} m`);
  }

  /** Night 3 wind warning and gust; Gió Lạc theft. */
  private updateBanner(s: Readonly<SimState>): void {
    let text = '';
    if (s.night === 3) {
      const phase = s.simTick % WIND_EVERY_TICKS;
      if (s.wind.active) text = 'Gió mạnh! Mây bị đẩy đi';
      else if (s.simTick > 0 && phase >= WIND_EVERY_TICKS - WIND_WARN_TICKS) text = 'Gió mạnh sắp thổi…';
    }
    this.banner.hidden = text === '' || s.paused;
    if (text && this.banner.textContent !== text) this.banner.textContent = text;
  }

  private flash(el: HTMLElement): void {
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
}
