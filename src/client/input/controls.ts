import type { ControlState, Vec3 } from '../../sim';
import { moveToward } from './clickToMove';
import { keyMove } from './keyMove';
import type { Action, KeyBindings } from './keybindings';

/**
 * Turns mouse clicks and bound keys into a held ControlState per tick.
 * Keys are latched so a tap shorter than one tick still reaches the sim.
 */
export class Controls {
  target: [number, number] | null = null;
  private held = new Set<Action>();
  private latched = new Set<Action>();
  onAction: (a: Action, down: boolean) => void = () => {};
  enabled = true;

  constructor(private readonly bindings: KeyBindings) {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled || e.target instanceof HTMLInputElement) return; // typing a name is not playing
      const a = this.bindings.actionFor(e.code);
      if (!a) return;
      e.preventDefault();
      if (e.repeat) return;
      this.held.add(a);
      this.latched.add(a);
      this.onAction(a, true);
    });
    window.addEventListener('keyup', (e) => {
      const a = this.bindings.actionFor(e.code);
      if (!a) return;
      this.held.delete(a);
      this.onAction(a, false);
    });
    window.addEventListener('blur', () => this.held.clear());
  }

  isHeld(a: Action): boolean {
    return this.held.has(a);
  }

  /** forward: the camera's view direction on the ground, for the movement keys. */
  sample(playerPos: Vec3, forward: [number, number] = [0, -1]): ControlState {
    const keyed = keyMove(
      { up: this.held.has('moveUp'), down: this.held.has('moveDown'), left: this.held.has('moveLeft'), right: this.held.has('moveRight') },
      forward,
    );
    if (keyed) this.target = null; // the keys take over from a click target
    const { move: clicked, arrived } = moveToward(playerPos, this.target);
    if (arrived) this.target = null;
    const move = keyed ?? clicked;
    const on = (a: Action) => this.held.has(a) || this.latched.has(a);
    const ctrl: ControlState = { move, camYawDeg: 0, jump: on('jump'), interact: on('interact'), pulse: on('pulse'), dash: on('dash'), pause: false };
    this.latched.clear();
    return ctrl;
  }

  reset(): void {
    this.target = null;
    this.held.clear();
    this.latched.clear();
  }
}
