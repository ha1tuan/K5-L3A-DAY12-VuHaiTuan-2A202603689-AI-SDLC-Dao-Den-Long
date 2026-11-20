import contract from '../../game.contract.json';
import type { Tuning } from './types';
import { CAPACITY_PER_LIGHT } from './world';

/** The single source of tuning numbers: game.contract.json. */
export const CONTRACT_TUNING: Tuning = contract.tuning as Tuning;

export const TICKS_PER_SECOND = 60;
export const DT = 1 / TICKS_PER_SECOND;

/** Converts a duration in seconds to a whole number of ticks. */
export const secondsToTicks = (s: number): number => Math.round(s * TICKS_PER_SECOND);

/** Lantern fuel is stored in whole 1/60 units (ADR-0003): converts a fuel amount (or a rate per second, applied per tick) to units. */
export const fuelUnits = (fuel: number): number => Math.round(fuel * TICKS_PER_SECOND);
/** A fuel rate per second as whole units per tick: (perS / 60 fuel per tick) × 60 units per fuel. */
/** Fuel as exported, in tenths (one decimal, half up). Threshold checks use it too (A48, A49). */
export const fuelTenths = (units: number): number => Math.round((units * 10) / TICKS_PER_SECOND);

/** A48: full when the exported fuel reads fuel_max. */
export const isFullFuel = (units: number, t: Tuning): boolean => fuelTenths(units) >= t.fuel_max * 10;

/** A49: weak (no safe zone, shade target) when the exported fuel reads below low_fuel_threshold. */
export const isLowFuel = (units: number, t: Tuning): boolean => fuelTenths(units) < t.low_fuel_threshold * 10;

/** PRD v3 §5.4 */
export const capacityFor = (t: Tuning, successfulLights: number): number =>
  Math.min(t.capacity_max, t.carry_capacity + CAPACITY_PER_LIGHT * successfulLights);

export const fuelUnitsPerTick = (perS: number): number => Math.round(perS);
