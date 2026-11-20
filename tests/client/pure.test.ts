import { describe, expect, it } from 'vitest';
import { ambientIntensity } from '../../src/client/lighting';
import { advanceCampaign, startCampaign } from '../../src/client/campaign';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../src/client/settingsStore';
import { DEFAULT_BINDINGS, KeyBindings } from '../../src/client/input/keybindings';

const memoryStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('F-10 ánh sáng môi trường', () => {
  it('AC-10.2: 0/5 lit → 0.15, 5/5 lit → 0.70, linear in between', () => {
    expect(ambientIntensity(0, 5)).toBeCloseTo(0.15, 9);
    expect(ambientIntensity(5, 5)).toBeCloseTo(0.7, 9);
    expect(ambientIntensity(2, 5)).toBeCloseTo(0.37, 9);
    expect(ambientIntensity(3, 6)).toBeCloseTo(0.425, 9);
  });
});

describe('F-04 Chuỗi 3 Đêm', () => {
  it('a won night adds its score and moves on; a lost night is replayed and adds nothing (AC-04.3)', () => {
    let c = startCampaign();
    expect(c).toEqual({ night: 1, total: 0, finished: false });
    c = advanceCampaign(c, { won: true, score: 858 });
    expect(c).toEqual({ night: 2, total: 858, finished: false });
    c = advanceCampaign(c, { won: false, score: 420 });
    expect(c).toEqual({ night: 2, total: 858, finished: false });
    c = advanceCampaign(c, { won: true, score: 900 });
    c = advanceCampaign(c, { won: true, score: 1000 });
    expect(c).toEqual({ night: 3, total: 2758, finished: true });
  });
});

describe('F-06 Cài đặt', () => {
  it('AC-06.1: volume and mouse sensitivity survive a reload', () => {
    const st = memoryStorage();
    saveSettings(st, { volume: 0.3, sensitivity: 1.6 });
    expect(loadSettings(st)).toEqual({ volume: 0.3, sensitivity: 1.6 });
  });

  it('falls back to defaults for missing, broken or out-of-range values', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    const st = memoryStorage();
    st.setItem('dao-den-long.settings.v2', '{not json');
    expect(loadSettings(st)).toEqual(DEFAULT_SETTINGS);
    st.setItem('dao-den-long.settings.v2', JSON.stringify({ volume: 7, sensitivity: 'fast' }));
    expect(loadSettings(st)).toEqual({ volume: 1, sensitivity: DEFAULT_SETTINGS.sensitivity });
  });

  it('adds D for Lướt and P for Tạm dừng to the QWER defaults; Esc stays reserved for pausing', () => {
    expect(DEFAULT_BINDINGS).toMatchObject({ jump: 'KeyQ', interact: 'KeyW', pulse: 'KeyE', restart: 'KeyR', dash: 'KeyD', pause: 'KeyP', camera: 'Space' });
    const kb = new KeyBindings(memoryStorage());
    expect(kb.set('dash', 'Escape')).toMatch(/Esc/);
    expect(kb.set('dash', 'KeyF')).toBeNull();
    expect(kb.actionFor('KeyF')).toBe('dash');
  });
});
