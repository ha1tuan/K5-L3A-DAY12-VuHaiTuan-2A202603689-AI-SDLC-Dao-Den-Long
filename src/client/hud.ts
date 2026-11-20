import { CONTRACT_TUNING, secondsToTicks, type SimState } from '../sim';
import { ACTIONS, keyLabel, type KeyBindings } from './input/keybindings';

const T = CONTRACT_TUNING;
const COOLDOWN_TICKS = secondsToTicks(T.pulse_cooldown_s);
const $ = <E extends HTMLElement>(sel: string) => document.querySelector(sel) as E;

const fmtTime = (s: number) => {
  const total = Math.ceil(Math.max(0, s));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** DOM overlay. Reads the sim state; never writes to it. */
export class Hud {
  private lanterns = $('#lantern-string');
  private moon = $('#moon');
  private clock = $('#clock');
  private score = $('#score');
  private flames = $('#flames');
  private jar = $('#jar');
  private jarCount = $('#jar-count');
  private keys = $('#keys');
  private last = '';

  constructor(private readonly bindings: KeyBindings) {
    this.renderKeys();
  }

  renderKeys(): void {
    const shown = ACTIONS.filter((a) => a.action !== 'restart');
    this.keys.innerHTML = shown
      .map(
        (a) =>
          `<li data-action="${a.action}"><kbd>${keyLabel(this.bindings.all[a.action])}</kbd><span>${a.label}</span></li>`,
      )
      .join('');
  }

  update(s: Readonly<SimState>, nightS: number): void {
    // Lantern string: rebuild only when lantern progress changes.
    const sig = s.lanterns.map((l) => `${l.lit ? 1 : 0}${l.deposited}`).join('|');
    if (sig !== this.last) {
      this.last = sig;
      this.lanterns.innerHTML = s.lanterns
        .map((l) => {
          const fill = l.lit ? 100 : Math.round((l.deposited / T.lantern_cost) * 100);
          const note = l.lit ? 'đã sáng' : `${l.deposited}/${T.lantern_cost}`;
          return `<li class="${l.lit ? 'lit' : ''}" aria-label="Đèn ${l.id}: ${note}">
            <span class="cord"></span>
            <span class="lantern"><span class="fill" style="height:${fill}%"></span></span>
            <span class="note">${l.lit ? '' : note}</span>
          </li>`;
        })
        .join('');
    }

    const progress = 1 - Math.max(0, s.timeLeftS) / nightS;
    this.moon.style.setProperty('--progress', progress.toFixed(4));
    this.clock.textContent = fmtTime(s.timeLeftS);
    this.clock.classList.toggle('late', s.timeLeftS <= 30);
    this.score.textContent = s.score.toLocaleString('vi-VN');

    this.flames.innerHTML = Array.from(
      { length: T.flames },
      (_, i) => `<li class="${i < s.player.flames ? 'on' : 'out'}"></li>`,
    ).join('');
    this.flames.setAttribute('aria-label', `Lửa: ${s.player.flames}`);

    this.jar.innerHTML = Array.from(
      { length: T.carry_capacity },
      (_, i) => `<li class="${i < s.player.carried ? 'on' : ''}"></li>`,
    ).join('');
    this.jarCount.textContent = `${s.player.carried}/${T.carry_capacity}`;

    const pulseKey = this.keys.querySelector<HTMLElement>('[data-action="pulse"]');
    if (pulseKey) {
      const cd = s.player.pulseCooldownTicks / COOLDOWN_TICKS;
      pulseKey.style.setProperty('--cd', cd.toFixed(3));
      pulseKey.classList.toggle('unavailable', s.player.carried < T.pulse_cost);
    }
  }
}
