#!/usr/bin/env node
// PRD v4 §3–4 UI evidence: drives the built game at 1280×720 in Chrome and records what it sees.
//   node scripts/ui-check.mjs <out-dir>     (needs npm run build; CHROME_PATH or Google Chrome installed)
// Writes screenshots and ui-check.txt: the smallest rendered font per screen, subtitles and shade
// arrows, keyboard movement, large text, the save form, the leaderboard order and the API's checks.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { startServer } from '../dist/serve.js';

const OUT = process.argv[2] ?? 'docs/evidence/phase-4/ui';
mkdirSync(OUT, { recursive: true });
const log = [];
const say = (...a) => {
  const line = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
  log.push(line);
  console.log(line);
};
const dataFile = join(mkdtempSync(join(tmpdir(), 'ddl-ui-')), 'leaderboard.json'); // never touches the real board
const { server, url } = await startServer({ port: 0, dataFile });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const minFont = () =>
  page.evaluate(() => {
    let min = Infinity;
    let where = '';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode()); ) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || el.closest('[hidden]') || getComputedStyle(el).visibility === 'hidden') continue;
      const f = parseFloat(getComputedStyle(el).fontSize);
      if (f < min) [min, where] = [f, `"${n.textContent.trim().slice(0, 24)}"`];
    }
    return `${min}px at ${where}`;
  });

await page.goto(url);
await page.waitForTimeout(800);
say('title: min font', await minFont());
await shot('1-title');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
say('intro: min font', await minFont());
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await shot('2a-before-arrowup');
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(1500);
await page.keyboard.up('ArrowUp');
await shot('2b-after-arrowup');
await page.waitForSelector('#cues li', { timeout: 15000 }); // first shades appear at 5 s
say('playing: min font', await minFont());
say('subtitles:', await page.locator('#cues li').allTextContents(), 'shade arrows on screen edge:', await page.locator('.shade-arrow').count());
await shot('2c-shade-cue');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
say('settings: min font', await minFont());
await page.check('#large-text');
await page.check('#reduce-motion');
await page.waitForTimeout(200);
say('settings with large text: min font', await minFont());
say('reduce-motion class on body:', await page.evaluate(() => document.body.classList.contains('reduce-motion')));
await shot('3-settings-large-text');
await page.uncheck('#large-text');
await page.uncheck('#reduce-motion');
say('rebinding Đi lên to Q:', await page.evaluate(() => {
  document.querySelector('[data-action="moveUp"]').click();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true }));
  return document.querySelector('#settings .message').textContent;
}));
await page.click('[data-reset]');
say('after reset:', await page.locator('#settings .message').textContent());

await page.goto(`${url}?demo=end`);
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(1600);
say('ending: save form visible', await page.locator('#save-score').isVisible(), 'min font', await minFont());
await page.fill('#player-name', 'ab');
await page.click('#save-score button');
await page.waitForTimeout(300);
say('save "ab":', await page.locator('.save-msg').textContent());
await page.fill('#player-name', 'Mây_đêm');
await page.click('#save-score button');
await page.waitForTimeout(300);
say('save "Mây_đêm":', await page.locator('.save-msg').textContent());
await shot('4-ending-saved');

for (const [name, score, at] of [
  ['tuan_2', 820, '2026-11-20T09:00:00+07:00'],
  ['Ông_Đăng', 820, '2026-11-20T10:00:00+07:00'],
  ['top_one', 1500, '2026-11-20T11:00:00+07:00'],
]) {
  const st = await page.evaluate(
    async (b) => (await fetch('/api/leaderboard', { method: 'POST', body: JSON.stringify(b) })).status,
    { name, score, nights_won: 2, achieved_at: at, seed: 5 },
  );
  say('POST', name, score, at, '→', st);
}
await page.goto(url);
await page.waitForTimeout(500);
await page.click('#open-board');
await page.waitForTimeout(400);
say('leaderboard order:', await page.locator('.board-list li .who').allTextContents(), 'min font', await minFont());
await shot('5-leaderboard');

await page.goto(`${url}?bench=1&seed=42&duration=2`);
await page.waitForTimeout(2500);
say('bench scene:', await page.evaluate(() => window.__bench?.state), '(screenshot during warm-up)');
await shot('6-bench-scene');

await browser.close();
server.close();
writeFileSync(join(OUT, 'ui-check.txt'), log.join('\n') + '\n');
