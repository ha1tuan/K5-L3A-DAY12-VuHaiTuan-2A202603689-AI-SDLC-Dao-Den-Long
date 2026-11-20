import contract from '../../game.contract.json';
import type { Tuning } from './types';

/** The single source of tuning numbers: game.contract.json. */
export const CONTRACT_TUNING: Tuning = contract.tuning as Tuning;

export const TICKS_PER_SECOND = 60;
export const DT = 1 / TICKS_PER_SECOND;

/** Converts a duration in seconds to a whole number of ticks. */
export const secondsToTicks = (s: number): number => Math.round(s * TICKS_PER_SECOND);
