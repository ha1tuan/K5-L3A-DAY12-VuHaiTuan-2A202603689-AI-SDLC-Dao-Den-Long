// F-06 + PRD v3 §5.6: volume, mouse sensitivity and the accessible palette, persisted in a Storage passed in (localStorage in the browser).

export interface Settings {
  /** 0..1 master volume. */
  volume: number;
  /** 0.5..2: scales edge-pan speed and the wheel zoom step (A18). */
  sensitivity: number;
  /** "Bảng màu dễ phân biệt" (PRD v3 §5.6, A44). */
  colorblind: boolean;
  /** PRD v4 §4: no camera shake, no screen flashes or blinking. */
  reduceMotion: boolean;
  /** PRD v4 §4: UI text ×1.25. */
  largeText: boolean;
}

export const DEFAULT_SETTINGS: Settings = { volume: 0.7, sensitivity: 1, colorblind: false, reduceMotion: false, largeText: false };
const KEY = 'dao-den-long.settings.v2';
type Store = Pick<Storage, 'getItem' | 'setItem'> | null;

const clampOr = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

export function loadSettings(storage: Store): Settings {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const s = JSON.parse(raw) as Partial<Record<keyof Settings, unknown>>;
    return {
      volume: clampOr(s.volume, 0, 1, DEFAULT_SETTINGS.volume),
      sensitivity: clampOr(s.sensitivity, 0.5, 2, DEFAULT_SETTINGS.sensitivity),
      colorblind: s.colorblind === true,
      reduceMotion: s.reduceMotion === true,
      largeText: s.largeText === true,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(storage: Store, s: Settings): void {
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: settings last for this session only */
  }
}
