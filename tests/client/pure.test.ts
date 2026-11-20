import { describe, expect, it } from 'vitest';
import { ambientIntensity, paletteFor } from '../../src/client/lighting';
import { blinkOn, depositCost, fuelFraction, isWeakLantern, winTarget } from '../../src/client/lanternLook';
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
    saveSettings(st, { volume: 0.3, sensitivity: 1.6, colorblind: false });
    expect(loadSettings(st)).toEqual({ volume: 0.3, sensitivity: 1.6, colorblind: false });
  });

  it('falls back to defaults for missing, broken or out-of-range values', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    const st = memoryStorage();
    st.setItem('dao-den-long.settings.v2', '{not json');
    expect(loadSettings(st)).toEqual(DEFAULT_SETTINGS);
    st.setItem('dao-den-long.settings.v2', JSON.stringify({ volume: 7, sensitivity: 'fast', colorblind: 'yes' }));
    expect(loadSettings(st)).toEqual({ volume: 1, sensitivity: DEFAULT_SETTINGS.sensitivity, colorblind: false });
  });

  it('adds D for Lướt and P for Tạm dừng to the QWER defaults; Esc stays reserved for pausing', () => {
    expect(DEFAULT_BINDINGS).toMatchObject({ jump: 'KeyQ', interact: 'KeyW', pulse: 'KeyE', restart: 'KeyR', dash: 'KeyD', pause: 'KeyP', camera: 'Space' });
    const kb = new KeyBindings(memoryStorage());
    expect(kb.set('dash', 'Escape')).toMatch(/Esc/);
    expect(kb.set('dash', 'KeyF')).toBeNull();
    expect(kb.actionFor('KeyF')).toBe('dash');
  });
});

describe('Phase 3: Bảng màu dễ phân biệt (PRD v3 §5.6)', () => {
  it('AC-18: the setting survives a reload and turns the shade rim and eyes #00B3FF', () => {
    const st = memoryStorage();
    expect(loadSettings(st).colorblind).toBe(false);
    saveSettings(st, { ...loadSettings(st), colorblind: true });
    const reloaded = loadSettings(st);
    expect(reloaded.colorblind).toBe(true);
    expect(paletteFor(reloaded.colorblind)).toMatchObject({ shadeRim: 0x00b3ff, shadeEye: 0x00b3ff });
  });

  it('standard palette keeps #7A3CFF shades and #FF5A5F warnings; the accessible one warns in white with ⚠', () => {
    expect(paletteFor(false)).toEqual({ shadeRim: 0x7a3cff, shadeEye: 0x7a3cff, warning: '#ff5a5f', warnIcon: '' });
    expect(paletteFor(true)).toEqual({ shadeRim: 0x00b3ff, shadeEye: 0x00b3ff, warning: '#ffffff', warnIcon: '⚠' });
  });
});

describe('Phase 3: đèn dầu trên client', () => {
  const lantern = (o: object) => ({ id: 'L1', pos: [0, 0, 0] as [number, number, number], lit: false, deposited: 0, fuelTicks: 0, everLit: false, relitCount: 0, ...o });

  it('a low-fuel lantern blinks slowly at 1 Hz: half a second on, half off', () => {
    expect([0, 0.25, 0.49, 0.5, 0.99, 1, 1.5].map(blinkOn)).toEqual([true, true, true, false, false, true, false]);
  });

  it('reads weak and full from the same one-decimal fuel as the sim (A48, A49)', () => {
    expect(isWeakLantern(lantern({ lit: true, fuelTicks: 1797 }))).toBe(false);
    expect(isWeakLantern(lantern({ lit: true, fuelTicks: 1796 }))).toBe(true);
    expect(isWeakLantern(lantern({ lit: false, fuelTicks: 0 }))).toBe(false);
    expect(fuelFraction(lantern({ lit: true, fuelTicks: 3000 }))).toBe(0.5);
  });

  it('a dark lantern needs 10, or 5 once it has been lit; dawn needs ceil(0.6 × n) lanterns', () => {
    expect(depositCost(lantern({}))).toBe(10);
    expect(depositCost(lantern({ everLit: true }))).toBe(5);
    expect([winTarget(5), winTarget(6), winTarget(7)]).toEqual([3, 4, 5]);
  });
});
