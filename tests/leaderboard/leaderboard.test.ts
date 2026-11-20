import { describe, expect, it } from 'vitest';
import { addEntry, isValidName, normalize, type Entry } from '../../src/leaderboard';

const e = (name: string, score: number, at: string, extra: Partial<Entry> = {}): Entry => ({
  name,
  score,
  nights_won: 1,
  achieved_at: at,
  seed: 1,
  ...extra,
});

describe('Bảng xếp hạng (PRD v4 §3)', () => {
  it('accepts 3–12 characters of letters, digits and _, Vietnamese letters included', () => {
    for (const ok of ['Moc', 'may_123', 'ABCDEFGHIJKL', 'Mây', 'Đăng_Tuấn']) expect(isValidName(ok), ok).toBe(true);
    for (const bad of ['ab', 'ABCDEFGHIJKLM', 'a b c', 'tên-x', '', 'abc!', '   ']) expect(isValidName(bad), bad).toBe(false);
  });

  it('sorts by score descending; on a tie the earlier achieved_at stays above', () => {
    let list: Entry[] = [];
    list = addEntry(list, e('late', 500, '2026-11-20T10:00:00+07:00'));
    list = addEntry(list, e('early', 500, '2026-11-20T02:30:00Z')); // 09:30 +07:00, earlier
    list = addEntry(list, e('top', 900, '2026-11-21T00:00:00Z'));
    expect(list.map((x) => x.name)).toEqual(['top', 'early', 'late']);
  });

  it('a tie at the same instant keeps whoever was saved first above', () => {
    let list: Entry[] = [];
    list = addEntry(list, e('first', 100, '2026-11-20T10:00:00Z'));
    list = addEntry(list, e('second', 100, '2026-11-20T10:00:00Z'));
    expect(list.map((x) => x.name)).toEqual(['first', 'second']);
  });

  it('keeps only the top 10', () => {
    let list: Entry[] = [];
    for (let i = 0; i < 12; i++) list = addEntry(list, e(`p${i}xx`, i * 10, `2026-11-20T10:00:${String(i).padStart(2, '0')}Z`));
    expect(list).toHaveLength(10);
    expect(list[0].score).toBe(110);
    expect(list.at(-1)!.score).toBe(20);
  });

  it('rejects bad entries and drops malformed rows when loading a file', () => {
    expect(() => addEntry([], e('x', 1, '2026-11-20T10:00:00Z'))).toThrow(/tên/i);
    expect(() => addEntry([], e('okay', 1, '2026-11-20T10:00:00Z', { nights_won: 4 }))).toThrow();
    expect(() => addEntry([], e('okay', 1, '20-11-2026'))).toThrow();
    const loaded = normalize({ entries: [e('good', 5, '2026-11-20T10:00:00Z'), { name: 'b' }, 'junk', e('best', 9, '2026-11-20T11:00:00+07:00')] });
    expect(loaded.map((x) => x.name)).toEqual(['best', 'good']);
    expect(normalize(null)).toEqual([]);
  });
});

describe('achieved_at', () => {
  it('is written as ISO 8601 with the local zone offset and accepted by the board', async () => {
    const { isoWithZone } = await import('../../src/client/leaderboardStore');
    const s = isoWithZone(new Date(Date.UTC(2026, 10, 20, 14, 30, 5)));
    expect(s).toMatch(/^2026-11-2\dT\d{2}:30:05[+-]\d{2}:\d{2}$/);
    expect(Date.parse(s)).toBe(Date.UTC(2026, 10, 20, 14, 30, 5));
    expect(addEntry([], e('abc', 1, s))).toHaveLength(1);
  });
});
