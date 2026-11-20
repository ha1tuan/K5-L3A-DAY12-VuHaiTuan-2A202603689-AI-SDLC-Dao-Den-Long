import type { NightId } from '../sim';

/** Chuỗi 3 Đêm (F-04). Lives only in the client: the sim plays one night at a time. */
export interface Campaign {
  night: NightId;
  /** Tổng điểm game: sum of the nights already won. */
  total: number;
  /** True once Night 3 is won: show Màn Bình Minh. */
  finished: boolean;
}

export const startCampaign = (): Campaign => ({ night: 1, total: 0, finished: false });

/** A won night adds its score and moves on; a lost night is replayed and adds nothing (AC-04.3). */
export function advanceCampaign(c: Campaign, result: { won: boolean; score: number }): Campaign {
  if (!result.won || c.finished) return c;
  const total = c.total + result.score;
  if (c.night === 3) return { night: 3, total, finished: true };
  return { night: (c.night + 1) as NightId, total, finished: false };
}
