#!/usr/bin/env node
// Builds the GitHub Release archive: release/dao-den-long-v<version>.zip
// Contents: dist/ (web game, headless, soak, server), game.contract.json, LICENSE, CREDITS.md and a
// short PLAY.md. Running it needs only Node.js 18+: `node dist/serve.js --open`. Run `npm run build` first.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const name = `dao-den-long-v${version}`;
for (const f of ['dist/web/index.html', 'dist/serve.js', 'dist/headless.js', 'dist/soak.js'])
  if (!existsSync(f)) throw new Error(`missing ${f}: run "npm run build" first`);

const stage = join('release', name);
rmSync('release', { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
cpSync('dist', join(stage, 'dist'), { recursive: true });
for (const f of ['game.contract.json', 'LICENSE', 'CREDITS.md']) cpSync(f, join(stage, f));
writeFileSync(
  join(stage, 'PLAY.md'),
  `# Đảo Đèn Lồng v${version}

Cần Node.js 18 trở lên. Không cần cài thêm gì.

    node dist/serve.js --open

Game mở ở http://localhost:4173 (không tự mở được thì dán địa chỉ đó vào Chrome, Edge hoặc Firefox).
Bảng xếp hạng lưu ở data/leaderboard.json cạnh thư mục dist/.

- Xuất bảng xếp hạng: node dist/serve.js --export-leaderboard out.json
- Headless: node dist/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl
- Soak: node --expose-gc --single-threaded --max-semi-space-size=1 dist/soak.js --seed 7 --nights 10 --out soak.json
- Bench cần mã nguồn (npm ci && npm run build && npm run bench -- --seed 42 --duration 30 --out bench.json).

Mã nguồn, luật chơi và bằng chứng: https://github.com/ha1tuan/K5-L3A-DAY12-VuHaiTuan-2A202603689-AI-SDLC-Dao-Den-Long
`,
);
execFileSync('zip', ['-qr', `${name}.zip`, name], { cwd: 'release' });
console.log(`release/${name}.zip`);
