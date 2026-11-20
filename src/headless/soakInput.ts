/** PRD v4 §2.2 random input: re-pick the direction every 30 ticks; per-tick press chances. */
export const SOAK_INPUT = { repick_ticks: 30, jump: 0.05, dash: 0.03, pulse: 0.02, interact: 0.1 } as const;
