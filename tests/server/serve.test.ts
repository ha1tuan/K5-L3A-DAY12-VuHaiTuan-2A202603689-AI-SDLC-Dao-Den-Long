import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readBoard, startServer } from '../../src/server/serve';

const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-serve-'));
  const root = join(dir, 'web');
  mkdirSync(root);
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>t</title>');
  return { root, dataFile: join(dir, 'data', 'leaderboard.json') };
};

describe('Bảng xếp hạng trên đĩa (PRD v4 §3)', () => {
  it('saves through the API, survives a restart, and rejects a bad name', async () => {
    const opts = tmp();
    const post = (url: string, body: object) => fetch(`${url}api/leaderboard`, { method: 'POST', body: JSON.stringify(body) });
    const a = await startServer({ ...opts, port: 0 });
    expect((await post(a.url, { name: 'Mây_1', score: 300, nights_won: 1, achieved_at: '2026-11-20T21:00:00+07:00', seed: 9 })).status).toBe(200);
    const bad = await post(a.url, { name: 'x!', score: 1, nights_won: 0, achieved_at: '2026-11-20T21:00:00+07:00', seed: 9 });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: string }).error).toMatch(/3–12/);
    a.server.close();

    const b = await startServer({ ...opts, port: 0 }); // "turn the game off and on again"
    const got = (await (await fetch(`${b.url}api/leaderboard`)).json()) as { entries: { name: string }[] };
    expect(got.entries.map((x) => x.name)).toEqual(['Mây_1']);
    expect((await fetch(b.url)).status).toBe(200);
    expect((await fetch(`${b.url}../../etc/passwd`)).status).toBe(404);
    b.server.close();
    expect(JSON.parse(readFileSync(opts.dataFile, 'utf8')).entries).toHaveLength(1);
    expect(readBoard(opts.dataFile)).toHaveLength(1);
  });
});
