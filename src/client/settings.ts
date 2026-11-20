import { ACTIONS, keyLabel, type Action, type KeyBindings } from './input/keybindings';

/** Key-rebinding panel opened with Esc. Saves through KeyBindings (localStorage). */
export class SettingsPanel {
  private root = document.querySelector('#settings') as HTMLDialogElement;
  private list = this.root.querySelector('ul')!;
  private message = this.root.querySelector('.message') as HTMLElement;
  private capturing: Action | null = null;
  onChange: () => void = () => {};

  constructor(private readonly bindings: KeyBindings) {
    this.root.querySelector('[data-reset]')!.addEventListener('click', () => {
      this.bindings.reset();
      this.say('Đã khôi phục phím mặc định.');
      this.render();
      this.onChange();
    });
    this.root.querySelector('[data-close]')!.addEventListener('click', () => this.close());
    this.root.addEventListener('cancel', (e) => {
      e.preventDefault();
      if (this.capturing) this.stopCapture('Đã huỷ đổi phím.');
      else this.close();
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

  open(): void {
    this.render();
    this.say('Chọn một hành động rồi nhấn phím mới.');
    this.root.showModal();
  }

  close(): void {
    this.capturing = null;
    this.root.close();
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
