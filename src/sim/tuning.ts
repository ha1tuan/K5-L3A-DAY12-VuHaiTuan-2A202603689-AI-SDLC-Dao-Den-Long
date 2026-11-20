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
/** A48: a lantern is full when its fuel exported with one decimal reads fuel_max (within half of 0.1 fuel). */
export const isFullFuel = (units: number, fuelMax: number): boolean => units >= fuelUnits(fuelMax) - TICKS_PER_SECOND / 20;

/** PRD v3 §5.4 */
export const capacityFor = (t: Tuning, successfulLights: number): number =>
  Math.min(t.capacity_max, t.carry_capacity + CAPACITY_PER_LIGHT * successfulLights);

export const fuelUnitsPerTick = (perS: number): number => Math.round(perS);
