export type Action = 'jump' | 'interact' | 'pulse' | 'dash' | 'pause' | 'restart' | 'camera';

export const ACTIONS: { action: Action; label: string }[] = [
  { action: 'jump', label: 'Nhảy' },
  { action: 'interact', label: 'Nạp đèn' },
  { action: 'pulse', label: 'Tỏa sáng' },
  { action: 'dash', label: 'Lướt' },
  { action: 'pause', label: 'Tạm dừng' },
  { action: 'restart', label: 'Chơi lại' },
  { action: 'camera', label: 'Camera về Mây' },
];

export type Bindings = Record<Action, string>;
export const DEFAULT_BINDINGS: Bindings = { jump: 'KeyQ', interact: 'KeyW', pulse: 'KeyE', dash: 'KeyD', pause: 'KeyP', restart: 'KeyR', camera: 'Space' };

const STORAGE_KEY = 'dao-den-long.keys.v2';
const RESERVED = new Set(['Escape']);

/** Key bindings persisted in a Storage (localStorage in the browser); any failure falls back to defaults. */
export class KeyBindings {
  private current: Bindings;

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
    this.current = { ...DEFAULT_BINDINGS };
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Bindings>;
        const merged = { ...DEFAULT_BINDINGS, ...saved };
        if (new Set(Object.values(merged)).size === Object.keys(merged).length) this.current = merged;
      }
    } catch {
      this.current = { ...DEFAULT_BINDINGS };
    }
  }

  get all(): Readonly<Bindings> {
    return this.current;
  }

  actionFor(code: string): Action | null {
    for (const [a, c] of Object.entries(this.current)) if (c === code) return a as Action;
    return null;
  }

  /** Returns an error message when the key cannot be used, otherwise saves it. */
  set(action: Action, code: string): string | null {
    if (RESERVED.has(code)) return 'Esc luôn dùng để tạm dừng.';
    const owner = this.actionFor(code);
    if (owner && owner !== action) {
      const label = ACTIONS.find((a) => a.action === owner)!.label;
      return `${keyLabel(code)} đang dùng cho “${label}”. Đổi phím đó trước.`;
    }
    this.current = { ...this.current, [action]: code };
    this.save();
    return null;
  }

  reset(): void {
    this.current = { ...DEFAULT_BINDINGS };
    this.save();
  }

  private save(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.current));
    } catch {
      /* storage unavailable: keep bindings for this session only */
    }
  }
}

const ARROWS: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return ARROWS[code] ?? code.replace(/(Left|Right)$/, '');
}
