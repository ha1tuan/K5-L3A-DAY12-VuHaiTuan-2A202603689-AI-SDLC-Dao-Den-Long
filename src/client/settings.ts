import { ACTIONS, keyLabel, type Action, type KeyBindings } from './input/keybindings';
import { loadSettings, saveSettings, type Settings } from './settingsStore';

type Store = Pick<Storage, 'getItem' | 'setItem'> | null;

/**
 * Pause menu (F-05) with the settings page inside it (F-06): Tiếp tục / Chơi lại Đêm / Về menu,
 * volume, mouse sensitivity, the accessible palette (PRD v3 §5.6) and key rebinding. Opens and closes with the sim's paused flag.
 */
export class SettingsPanel {
  private root = document.querySelector('#settings') as HTMLDialogElement;
  private list = this.root.querySelector('ul')!;
  private message = this.root.querySelector('.message') as HTMLElement;
  private volume = this.root.querySelector('#volume') as HTMLInputElement;
  private sensitivity = this.root.querySelector('#sensitivity') as HTMLInputElement;
  private colorblind = this.root.querySelector('#colorblind') as HTMLInputElement;
  private reduceMotion = this.root.querySelector('#reduce-motion') as HTMLInputElement;
  private largeText = this.root.querySelector('#large-text') as HTMLInputElement;
  private capturing: Action | null = null;
  values: Settings;
  onChange: () => void = () => {};
  onResume: () => void = () => {};
  onRestart: () => void = () => {};
  onMenu: () => void = () => {};

  constructor(
    private readonly bindings: KeyBindings,
    private readonly storage: Store,
  ) {
    this.values = loadSettings(storage);
    this.volume.value = String(this.values.volume);
    this.sensitivity.value = String(this.values.sensitivity);
    this.colorblind.checked = this.values.colorblind;
    this.reduceMotion.checked = this.values.reduceMotion;
    this.largeText.checked = this.values.largeText;
    const saveSliders = () => {
      this.values = {
        volume: Number(this.volume.value),
        sensitivity: Number(this.sensitivity.value),
        colorblind: this.colorblind.checked,
        reduceMotion: this.reduceMotion.checked,
        largeText: this.largeText.checked,
      };
      saveSettings(this.storage, this.values);
      this.onChange();
    };
    this.volume.addEventListener('input', saveSliders);
    this.sensitivity.addEventListener('input', saveSliders);
    this.colorblind.addEventListener('change', saveSliders);
    this.reduceMotion.addEventListener('change', saveSliders);
    this.largeText.addEventListener('change', saveSliders);

    this.root.querySelector('[data-reset]')!.addEventListener('click', () => {
      this.bindings.reset();
      this.say('Đã khôi phục phím mặc định.');
      this.render();
      this.onChange();
    });
    this.root.querySelector('[data-close]')!.addEventListener('click', () => this.onResume());
    this.root.querySelector('[data-restart]')!.addEventListener('click', () => this.onRestart());
    this.root.querySelector('[data-menu]')!.addEventListener('click', () => this.onMenu());
    this.root.addEventListener('cancel', (e) => {
      // Esc inside the dialog: cancel a key capture, otherwise resume (handled by the game's Esc).
      e.preventDefault();
      if (this.capturing) this.stopCapture('Đã huỷ đổi phím.');
    });
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.capturing || e.code === 'Escape') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const err = this.bindings.set(this.capturing, e.code);
        if (err) return this.say(err);
        const label = ACTIONS.find((a) => a.action === this.capturing)!.label;
        this.stopCapture(`“${label}” giờ dùng phím ${keyLabel(e.code)}.`);
        this.onChange();
      },
      true,
    );
    this.render();
  }

  get isOpen(): boolean {
    return this.root.open;
  }

  get isCapturing(): boolean {
    return this.capturing !== null;
  }

  open(): void {
    if (this.root.open) return;
    this.render();
    this.say('Đêm đang dừng. Đổi phím: chọn một hành động rồi nhấn phím mới.');
    this.root.showModal();
  }

  close(): void {
    this.capturing = null;
    if (this.root.open) this.root.close();
  }

  private say(text: string): void {
    this.message.textContent = text;
  }

  private stopCapture(text: string): void {
    this.capturing = null;
    this.say(text);
    this.render();
  }

  private render(): void {
    this.list.innerHTML = ACTIONS.map(
      (a) => `<li><span>${a.label}</span>
        <button type="button" data-action="${a.action}" aria-pressed="${this.capturing === a.action}">
          ${this.capturing === a.action ? 'Nhấn phím…' : `<kbd>${keyLabel(this.bindings.all[a.action])}</kbd>`}
        </button></li>`,
    ).join('');
    for (const b of this.list.querySelectorAll<HTMLButtonElement>('button')) {
      b.addEventListener('click', () => {
        this.capturing = b.dataset.action as Action;
        this.say('Nhấn phím mới, hoặc Esc để huỷ.');
        this.render();
      });
    }
  }
}
