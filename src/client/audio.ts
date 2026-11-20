import { WIND_EVERY_TICKS, WIND_WARN_TICKS, type SimEvent, type SimState } from '../sim';

// F-07: every sound is synthesised with WebAudio (no audio files). Client only: headless never imports this.

type Wave = OscillatorType;
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const ROOTS = [220, 196, 174.61, 196]; // A3 G3 F3 G3: a slow lullaby loop
const midi = (base: number, semis: number) => base * 2 ** (semis / 12);

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private padNodes: OscillatorNode[] = [];
  private bar = 0;
  private volume: number;
  private prevGrounded = true;
  private lastCountdown = -1;
  private lastWarnTick = -1;
  private prevWind = false;

  constructor(volume: number) {
    this.volume = volume;
  }

  /** Browsers only allow audio after a user gesture: call from a click or key handler. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.gain.value = 0.32;
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.8;
    this.sfx.connect(this.master);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.startMusic();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Music fades while paused; effects stop with the sim anyway. */
  private paused = false;
  setPaused(p: boolean): void {
    if (p === this.paused) return;
    this.paused = p;
    if (this.music && this.ctx) this.music.gain.setTargetAtTime(p ? 0.06 : 0.32, this.ctx.currentTime, 0.3);
  }

  /** A new night starts: reset the per-night trackers. */
  reset(): void {
    this.prevGrounded = true;
    this.lastCountdown = -1;
    this.lastWarnTick = -1;
    this.prevWind = false;
  }

  // ------------------------------------------------------------------ building blocks
  private tone(freq: number, dur: number, opts: { type?: Wave; gain?: number; to?: number; delay?: number; attack?: number; out?: GainNode | null } = {}): void {
    const ctx = this.ctx;
    const out = opts.out ?? this.sfx;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    const peak = opts.gain ?? 0.3;
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, opts: { gain?: number; from?: number; to?: number; q?: number; delay?: number; type?: BiquadFilterType } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || !this.noiseBuf) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.Q.value = opts.q ?? 1.2;
    f.frequency.setValueAtTime(opts.from ?? 800, t0);
    f.frequency.exponentialRampToValueAtTime(opts.to ?? opts.from ?? 800, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t0 + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // ------------------------------------------------------------------ music
  private startMusic(): void {
    const ctx = this.ctx!;
    // Soft pad: two detuned triangles through a low-pass, retuned every bar.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.18;
    lp.connect(padGain).connect(this.music!);
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.detune.value = detune;
      o.frequency.value = ROOTS[0] / 2;
      o.connect(lp);
      o.start();
      this.padNodes.push(o);
    }
    const beat = () => {
      const root = ROOTS[this.bar % ROOTS.length];
      for (const o of this.padNodes) o.frequency.setTargetAtTime(root / 2, ctx.currentTime, 0.8);
      // A few gentle plucks of the pentatonic scale over each bar.
      for (let i = 0; i < 4; i++) {
        if (Math.random() < 0.3) continue;
        const n = PENTA[Math.floor(Math.random() * PENTA.length)];
        this.tone(midi(root * 2, n), 1.6, { type: 'sine', gain: 0.12, delay: i * 0.9 + Math.random() * 0.15, attack: 0.02, out: this.music });
      }
      this.bar++;
    };
    beat();
    this.musicTimer = window.setInterval(beat, 3600);
  }

  // ------------------------------------------------------------------ effects
  private sound(name: string): void {
    switch (name) {
      case 'pickup':
        this.tone(1320, 0.12, { type: 'sine', gain: 0.18, to: 1760 });
        break;
      case 'deposit':
        this.tone(660, 0.18, { type: 'triangle', gain: 0.2 });
        this.tone(990, 0.22, { type: 'triangle', gain: 0.14, delay: 0.06 });
        break;
      case 'lit':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.9, { type: 'triangle', gain: 0.22, delay: i * 0.09, attack: 0.01 }));
        this.tone(130.81, 1.4, { type: 'sine', gain: 0.25 });
        break;
      case 'pulse':
        this.tone(220, 0.55, { type: 'sine', gain: 0.35, to: 880 });
        this.noise(0.5, { gain: 0.2, from: 400, to: 3000, q: 0.8 });
        break;
      case 'hit':
        this.tone(180, 0.35, { type: 'sawtooth', gain: 0.25, to: 70 });
        this.noise(0.25, { gain: 0.3, from: 1200, to: 300, type: 'lowpass' });
        break;
      case 'fall':
        this.tone(700, 0.9, { type: 'sine', gain: 0.25, to: 90 });
        break;
      case 'jump':
        this.tone(330, 0.16, { type: 'square', gain: 0.08, to: 660 });
        break;
      case 'pad':
        this.tone(160, 0.5, { type: 'sine', gain: 0.3, to: 640 });
        this.tone(320, 0.4, { type: 'triangle', gain: 0.12, to: 1280, delay: 0.04 });
        break;
      case 'dash':
        this.noise(0.22, { gain: 0.3, from: 2500, to: 600, q: 0.7 });
        break;
      case 'shade':
        this.tone(110, 0.9, { type: 'sawtooth', gain: 0.12, to: 82, attack: 0.15 });
        this.tone(116, 0.9, { type: 'sawtooth', gain: 0.1, to: 87, attack: 0.15 });
        break;
      case 'charm':
        [880, 1108.7, 1318.5].forEach((f, i) => this.tone(f, 0.4, { type: 'sine', gain: 0.18, delay: i * 0.05 }));
        break;
      case 'steal':
        this.tone(900, 0.3, { type: 'triangle', gain: 0.18, to: 300 });
        break;
      case 'tick':
        this.tone(1046.5, 0.08, { type: 'square', gain: 0.07 });
        break;
      case 'wind-warn':
        this.noise(1.8, { gain: 0.18, from: 300, to: 1100, q: 2 });
        break;
      case 'wind':
        this.noise(5, { gain: 0.32, from: 500, to: 250, q: 0.6 });
        break;
      case 'refuel':
        this.tone(523.25, 0.25, { type: 'triangle', gain: 0.16, to: 784 });
        break;
      case 'out':
        this.tone(392, 0.8, { type: 'sine', gain: 0.22, to: 98 });
        this.noise(0.6, { gain: 0.15, from: 1500, to: 200, type: 'lowpass' });
        break;
      case 'won':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 1.2, { type: 'triangle', gain: 0.22, delay: i * 0.14 }));
        break;
      case 'lost':
        [392, 349.23, 311.13, 261.63].forEach((f, i) => this.tone(f, 0.9, { type: 'sine', gain: 0.22, delay: i * 0.28 }));
        break;
    }
  }

  /** Called once per sim step with that step's events and the state after it. */
  onStep(events: SimEvent[], s: Readonly<SimState>): void {
    if (!this.ctx) return;
    for (const e of events) {
      if (e.name === 'mote_picked') this.sound('pickup');
      else if (e.name === 'deposit') this.sound('deposit');
      else if (e.name === 'lantern_lit') this.sound('lit');
      else if (e.name === 'refuel') this.sound('refuel');
      else if (e.name === 'lantern_out') this.sound('out');
      else if (e.name === 'pulse') this.sound('pulse');
      else if (e.name === 'player_hit') this.sound(e.data.by === 'fall' ? 'fall' : 'hit');
      else if (e.name === 'shade_spawned') this.sound('shade');
      else if (e.name === 'dash') this.sound('dash');
      else if (e.name === 'charm_picked') this.sound('charm');
      else if (e.name === 'drifter_steal') this.sound('steal');
      else if (e.name === 'game_over') this.sound(e.data.result === 'won' ? 'won' : 'lost');
    }
    if (s.paused) return;

    // Jump vs bounce pad: leaving the ground upwards (JUMP 7 m/s; pads throw 12–14 m/s).
    const p = s.player;
    if (this.prevGrounded && !p.grounded && p.vel[1] > 5) this.sound(p.vel[1] > 10 ? 'pad' : 'jump');
    this.prevGrounded = p.grounded;

    // Last 10 seconds: one tick per second.
    const secs = Math.ceil(s.timeLeftS);
    if (secs <= 10 && secs > 0 && secs !== this.lastCountdown) {
      this.lastCountdown = secs;
      this.sound('tick');
    }

    // Night 3 wind: warning 2 s before the gust, then the gust itself.
    if (s.night === 3) {
      const phase = s.simTick % WIND_EVERY_TICKS;
      if (!s.wind.active && phase === WIND_EVERY_TICKS - WIND_WARN_TICKS && s.simTick !== this.lastWarnTick) {
        this.lastWarnTick = s.simTick;
        this.sound('wind-warn');
      }
      if (s.wind.active && !this.prevWind) this.sound('wind');
      this.prevWind = s.wind.active;
    }
  }
}
