// PRD v4 §3: the local leaderboard rules, shared by the browser client and the Node server. Pure, no I/O.

export interface Entry {
  name: string;
  /** Total score of the nights won in the 3-night chain. */
  score: number;
  /** 0–3. */
  nights_won: number;
  /** ISO 8601 with a time zone. */
  achieved_at: string;
  seed: number;
}

export const TOP_N = 10;
const NAME = /^[\p{L}\p{N}_]{3,12}$/u;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export const isValidName = (name: string): boolean => NAME.test(name.normalize('NFC'));

/** Why an entry cannot be saved, or null when it can. */
export function entryError(x: unknown): string | null {
  if (typeof x !== 'object' || x === null) return 'mục không hợp lệ';
  const r = x as Record<string, unknown>;
  if (typeof r.name !== 'string' || !isValidName(r.name)) return 'Tên cần 3–12 ký tự: chữ, số hoặc _.';
  if (!Number.isInteger(r.score) || (r.score as number) < 0) return 'score phải là số nguyên ≥ 0';
  if (!Number.isInteger(r.nights_won) || (r.nights_won as number) < 0 || (r.nights_won as number) > 3) return 'nights_won phải từ 0 tới 3';
  if (typeof r.achieved_at !== 'string' || !ISO_WITH_ZONE.test(r.achieved_at) || Number.isNaN(Date.parse(r.achieved_at)))
    return 'achieved_at phải là ISO 8601 có múi giờ';
  if (!Number.isInteger(r.seed)) return 'seed phải là số nguyên';
  return null;
}

/** Score descending; equal scores keep the earlier achievement on top (stable sort keeps save order after that). */
function sorted(list: Entry[]): Entry[] {
  return [...list].sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at)).slice(0, TOP_N);
}

export function addEntry(list: readonly Entry[], entry: Entry): Entry[] {
  const err = entryError(entry);
  if (err) throw new Error(err);
  const clean: Entry = { ...entry, name: entry.name.normalize('NFC') };
  return sorted([...list, clean]);
}

/** Reads a stored `{entries: [...]}` (or a bare array), dropping malformed rows; returns the sorted top 10. */
export function normalize(raw: unknown): Entry[] {
  const rows = Array.isArray(raw) ? raw : (raw as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(rows)) return [];
  const ok = rows.filter((r) => entryError(r) === null) as Entry[];
  return sorted(ok.map((r) => ({ name: r.name.normalize('NFC'), score: r.score, nights_won: r.nights_won, achieved_at: r.achieved_at, seed: r.seed })));
}
