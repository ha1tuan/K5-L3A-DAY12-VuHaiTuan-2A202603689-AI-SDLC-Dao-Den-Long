// Pure helpers for showing lantern fuel (PRD v3 §5.1). Read-only: the sim decides, the client only shows.
import { CONTRACT_TUNING, fuelUnits, isLowFuel, type Lantern } from '../sim';

const T = CONTRACT_TUNING;

/** How full a lit lantern is, 0..1. */
export const fuelFraction = (l: Readonly<Lantern>): number => l.fuelTicks / fuelUnits(T.fuel_max);

/** Same test as the sim (A49): lit and the exported fuel reads below 30.0. */
export const isWeakLantern = (l: Readonly<Lantern>): boolean => l.lit && isLowFuel(l.fuelTicks, T);

/** Motes a dark lantern needs: 10, or 5 once it has ever been lit. */
export const depositCost = (l: Readonly<Lantern>): number => (l.everLit ? T.relight_cost : T.lantern_cost);

/** Lanterns that must still be lit at dawn: ceil(win_ratio × n). */
export const winTarget = (n: number): number => Math.ceil(T.win_ratio * n - 1e-9);

/** Slow 1 Hz blink for low fuel: on for the first half of each second. */
export const blinkOn = (seconds: number): boolean => seconds % 1 < 0.5;

/** A dark lantern sags by 20% so it reads as dark without colour (PRD v3 §5.6). */
export const DARK_SQUASH = 0.8;
