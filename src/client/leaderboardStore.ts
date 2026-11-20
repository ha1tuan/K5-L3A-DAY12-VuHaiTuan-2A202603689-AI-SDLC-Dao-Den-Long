// PRD v4 §3: the leaderboard lives on disk through the local server (dist/serve.js → data/leaderboard.json).
// If the page is served some other way (e.g. a static host), it falls back to this browser's storage.
import { addEntry, normalize, type Entry } from '../leaderboard';

const LOCAL_KEY = 'dao-den-long.leaderboard.v1';
type Store = Pick<Storage, 'getItem' | 'setItem'> | null;

export class LeaderboardStore {
  constructor(private readonly storage: Store) {}

  private local(): Entry[] {
    try {
      return normalize(JSON.parse(this.storage?.getItem(LOCAL_KEY) ?? 'null'));
    } catch {
      return [];
    }
  }

  async list(): Promise<{ entries: Entry[]; onDisk: boolean }> {
    try {
      const r = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (r.ok) return { entries: normalize(await r.json()), onDisk: true };
    } catch {
      /* no server */
    }
    return { entries: this.local(), onDisk: false };
  }

  /** Saves and returns the new top 10; throws with a message the player can read when the entry is invalid. */
  async add(entry: Entry): Promise<{ entries: Entry[]; onDisk: boolean }> {
    let res: Response | null = null;
    try {
      res = await fetch('/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) });
    } catch {
      res = null;
    }
    if (res && res.status === 400) throw new Error(((await res.json()) as { error: string }).error);
    if (res?.ok) return { entries: normalize(await res.json()), onDisk: true };
    const entries = addEntry(this.local(), entry);
    try {
      this.storage?.setItem(LOCAL_KEY, JSON.stringify({ entries }));
    } catch {
      /* storage unavailable */
    }
    return { entries, onDisk: false };
  }
}

/** ISO 8601 with the player's own time zone offset, e.g. 2026-11-20T21:30:05+07:00. */
export function isoWithZone(d: Date): string {
  const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(off / 60)}:${pad(off % 60)}`
  );
}
