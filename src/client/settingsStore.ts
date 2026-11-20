// F-06: volume and mouse sensitivity, persisted in a Storage passed in (localStorage in the browser).

export interface Settings {
  /** 0..1 master volume. */
  volume: number;
  /** 0.5..2: scales edge-pan speed and the wheel zoom step (A18). */
  sensitivity: number;
}

export const DEFAULT_SETTINGS: Settings = { volume: 0.7, sensitivity: 1 };
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
