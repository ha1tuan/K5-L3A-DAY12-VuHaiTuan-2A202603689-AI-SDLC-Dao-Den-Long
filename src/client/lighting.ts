// F-10 standard palette (PRD v2 §5) and the ambient-light rule. Pure: no Three.js here.

export const PALETTE = {
  sky: 0x0e1430,
  fog: 0x1b2350,
  grass: 0x3d7a5c,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  cloudSea: 0x12384a,
  lanternLit: 0xffb347,
  lanternCore: 0xffe9b0,
  lanternOff: 0x5b5f6e,
  moteCore: 0xfff6c2,
  moteHalo: 0xffe58a,
  shadeBody: 0x120a1a,
  shadeRim: 0x7a3cff,
  shadeStunned: 0x3a3450,
  mayCoat: 0xe8e2d0,
  red: 0xc8102e,
  gold: 0xf2c14e,
  drifter: 0x8fa3b8,
  danger: 0xff5a5f,
  uiText: 0xf5f1e6,
} as const;

/** Ambient light = 0.15 + 0.55 × (lit / total) (AC-10.2). */
export function ambientIntensity(lit: number, total: number): number {
  return 0.15 + 0.55 * (total > 0 ? lit / total : 0);
}
