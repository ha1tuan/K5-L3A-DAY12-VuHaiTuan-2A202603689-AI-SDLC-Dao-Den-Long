// PRD v4 §4 subtitles and visual cues: a shade appears (with an arrow at the screen edge), a gust is
// coming, the last 10 s, a lantern drops under fuel 30. cuesFor is pure; CueView draws them.
import { isLowFuel, WIND_EVERY_TICKS, WIND_WARN_TICKS, CONTRACT_TUNING, type SimEvent, type SimState, type Vec3 } from '../sim';
import type { Project } from './hud';

const T = CONTRACT_TUNING;
const LAST_SECONDS = 10;

export interface CueMemory {
  /** Ids of lit lanterns already announced as low on fuel. */
  weak: Set<string>;
  /** Last whole second announced in the final countdown. */
  lastSecond: number;
  /** Gust number already warned about. */
  windWarned: number;
}

export const newCueMemory = (): CueMemory => ({ weak: new Set(), lastSecond: Infinity, windWarned: -1 });

export function cuesFor(s: Readonly<SimState>, events: readonly SimEvent[], m: CueMemory): { texts: string[]; newShades: string[] } {
  const texts: string[] = [];
  const newShades = events.filter((e) => e.name === 'shade_spawned').map((e) => (e.data as { id: string }).id);
  if (newShades.length) texts.push(newShades.length > 1 ? `${newShades.length} Bóng Mực xuất hiện` : 'Bóng Mực xuất hiện');

  for (const l of s.lanterns) {
    const weak = l.lit && isLowFuel(l.fuelTicks, T);
    if (weak && !m.weak.has(l.id)) {
      m.weak.add(l.id);
      texts.push(`Đèn ${l.id} sắp cạn dầu`);
    } else if (!weak) m.weak.delete(l.id);
  }

  if (s.night === 3 && s.simTick > 0 && !s.wind.active) {
    const gust = Math.floor(s.simTick / WIND_EVERY_TICKS);
    const phase = s.simTick % WIND_EVERY_TICKS;
    if (phase >= WIND_EVERY_TICKS - WIND_WARN_TICKS && m.windWarned !== gust) {
      m.windWarned = gust;
      texts.push('Gió mạnh sắp thổi');
    }
  }

  if (s.timeLeftS < LAST_SECONDS && s.timeLeftS > 0) {
    const sec = Math.ceil(s.timeLeftS);
    if (sec < m.lastSecond) {
      texts.push(m.lastSecond === Infinity ? `${sec} giây cuối tới bình minh` : `${sec} giây`);
      m.lastSecond = sec;
    }
  }
  return { texts, newShades };
}

const SUBTITLE_MS = 3000;
const NEW_SHADE_ARROW_MS = 5000;
const MAX_ARROWS = 4;

/** Subtitles (bottom-centre, aria-live) and red arrows at the screen edge towards off-screen shades. */
export class CueView {
  private list = document.querySelector('#cues') as HTMLElement;
  private arrows = document.querySelector('#shade-arrows') as HTMLElement;
  private memory = newCueMemory();
  private recent = new Map<string, number>(); // shade id → time it appeared

  reset(): void {
    this.memory = newCueMemory();
    this.recent.clear();
    this.list.innerHTML = '';
    this.arrows.innerHTML = '';
  }

  onStep(s: Readonly<SimState>, events: readonly SimEvent[]): void {
    const { texts, newShades } = cuesFor(s, events, this.memory);
    const now = performance.now();
    for (const id of newShades) this.recent.set(id, now);
    for (const t of texts) this.say(t);
  }

  private say(text: string): void {
    const li = document.createElement('li');
    li.textContent = text;
    this.list.append(li);
    while (this.list.children.length > 3) this.list.firstElementChild?.remove();
    setTimeout(() => li.remove(), SUBTITLE_MS);
  }

  /** Arrows towards shades that just appeared or are chasing Mây, when they are off screen. */
  draw(s: Readonly<SimState>, project: Project, hidden: boolean): void {
    const now = performance.now();
    for (const [id, t] of this.recent) if (now - t > NEW_SHADE_ARROW_MS || !s.shades.some((x) => x.id === id)) this.recent.delete(id);
    const p = s.player.pos;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const mx = 40;
    const my = 110;
    const targets = hidden
      ? []
      : s.shades
          .filter((x) => this.recent.has(x.id) || x.state === 'chase')
          .map((x) => ({ x, d: Math.hypot(x.pos[0] - p[0], x.pos[2] - p[2]) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, MAX_ARROWS);
    const html: string[] = [];
    for (const { x, d } of targets) {
      const sp = project(x.pos as Vec3);
      if (sp.inFront && sp.x > mx && sp.x < w - mx && sp.y > my && sp.y < h - my) continue;
      let dx = sp.x - w / 2;
      let dy = sp.y - h / 2;
      if (!sp.inFront) [dx, dy] = [-dx, -dy];
      const k = Math.min((w / 2 - mx) / Math.abs(dx || 1e-6), (h / 2 - my) / Math.abs(dy || 1e-6));
      html.push(
        `<span class="shade-arrow" role="img" aria-label="Bóng Mực cách ${Math.round(d)} m" style="transform:translate(${w / 2 + dx * k}px,${h / 2 + dy * k}px) rotate(${Math.atan2(dy, dx)}rad)"></span>`,
      );
    }
    const next = html.join('');
    if (this.arrows.innerHTML !== next) this.arrows.innerHTML = next;
  }
}
