import { describe, expect, it } from 'vitest';
import { ACTIONS, DEFAULT_BINDINGS, KeyBindings } from '../../src/client/input/keybindings';
import { keyMove } from '../../src/client/input/keyMove';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../src/client/settingsStore';
import { cuesFor, type CueMemory } from '../../src/client/cues';
import { CONTRACT_TUNING, createSim, fuelUnits, type SimEvent, type SimState } from '../../src/sim';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('Đổi phím (PRD v4 §4)', () => {
  it('covers every action: 4 move directions, jump, dash, interact, pulse, pause', () => {
    const all = ACTIONS.map((a) => a.action);
    for (const a of ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'jump', 'dash', 'interact', 'pulse', 'pause']) expect(all).toContain(a);
    expect(DEFAULT_BINDINGS).toMatchObject({ moveUp: 'ArrowUp', moveDown: 'ArrowDown', moveLeft: 'ArrowLeft', moveRight: 'ArrowRight' });
    expect(new Set(Object.values(DEFAULT_BINDINGS)).size).toBe(Object.keys(DEFAULT_BINDINGS).length);
  });

  it('reports a clash, saves, and resets to the defaults', () => {
    const store = mem();
    const kb = new KeyBindings(store);
    expect(kb.set('moveUp', 'KeyQ')).toMatch(/Nhảy/);
    expect(kb.set('moveUp', 'KeyI')).toBeNull();
    expect(new KeyBindings(store).all.moveUp).toBe('KeyI');
    kb.reset();
    expect(new KeyBindings(store).all.moveUp).toBe('ArrowUp');
  });

  it('an old save without the move keys still loads, with the new defaults filled in', () => {
    const store = mem();
    store.setItem('dao-den-long.keys.v2', JSON.stringify({ jump: 'KeyJ' }));
    expect(new KeyBindings(store).all).toMatchObject({ jump: 'KeyJ', moveUp: 'ArrowUp' });
  });
});

describe('Di chuyển bằng phím theo hướng camera', () => {
  it('up goes where the camera looks, right is to its right, diagonals are normalised', () => {
    const fwd: [number, number] = [0, -1]; // camera looking towards −Z
    expect(keyMove({ up: true }, fwd)).toEqual([0, -1]);
    expect(keyMove({ right: true }, fwd)).toEqual([1, 0]);
    const d = keyMove({ up: true, right: true }, fwd)!;
    expect(Math.hypot(...d)).toBeCloseTo(1, 9);
    expect(keyMove({}, fwd)).toBeNull();
    expect(keyMove({ up: true, down: true }, fwd)).toBeNull();
  });
});

describe('Cài đặt dễ tiếp cận (PRD v4 §4)', () => {
  it('reduced motion and large text default off and are saved', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ reduceMotion: false, largeText: false });
    const store = mem();
    saveSettings(store, { ...DEFAULT_SETTINGS, reduceMotion: true, largeText: true });
    expect(loadSettings(store)).toMatchObject({ reduceMotion: true, largeText: true });
  });
});

describe('Chỉ báo hình ảnh (PRD v4 §4)', () => {
  const fresh = (): CueMemory => ({ weak: new Set(), lastSecond: Infinity, windWarned: -1 });
  const state = (patch: Partial<SimState> = {}) => ({ ...createSim({ seed: 1, night: 1 }).state, ...patch }) as SimState;

  it('says a shade appeared and remembers it for an edge arrow', () => {
    const ev: SimEvent[] = [{ tick: 300, name: 'shade_spawned', data: { id: 'S1' } }];
    const out = cuesFor(state(), ev, fresh());
    expect(out.texts).toEqual(['Bóng Mực xuất hiện']);
    expect(out.newShades).toEqual(['S1']);
  });

  it('warns once when a lit lantern drops under fuel 30', () => {
    const m = fresh();
    const s = state();
    s.lanterns[1] = { ...s.lanterns[1], lit: true, fuelTicks: fuelUnits(CONTRACT_TUNING.low_fuel_threshold) - 4 };
    expect(cuesFor(s, [], m).texts).toEqual(['Đèn L2 sắp cạn dầu']);
    expect(cuesFor(s, [], m).texts).toEqual([]);
  });

  it('counts down the last 10 s, once per second', () => {
    const m = fresh();
    expect(cuesFor(state({ timeLeftS: 10.5 }), [], m).texts).toEqual([]);
    expect(cuesFor(state({ timeLeftS: 9.99 }), [], m).texts).toEqual(['10 giây cuối tới bình minh']);
    expect(cuesFor(state({ timeLeftS: 9.5 }), [], m).texts).toEqual([]);
    expect(cuesFor(state({ timeLeftS: 8.9 }), [], m).texts).toEqual(['9 giây']);
  });

  it('warns before a Night 3 gust', () => {
    const s3 = createSim({ seed: 1, night: 3 }).state as SimState;
    const m = fresh();
    const before = { ...s3, simTick: 1800 - 120 } as SimState;
    expect(cuesFor(before, [], m).texts).toEqual(['Gió mạnh sắp thổi']);
    expect(cuesFor({ ...before, simTick: 1800 - 119 } as SimState, [], m).texts).toEqual([]);
  });
});
