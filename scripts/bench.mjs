#!/usr/bin/env node
// PRD v4 §1 benchmark: node scripts/bench.mjs --seed 42 --duration 30 --out bench.json [--headless]
// Serves dist/web, opens a 1280×720 Chrome window (vsync and the frame cap off) on the bench scene,
// waits 3 s warm-up + `duration` s of measurement, samples the RSS of the whole Chrome process tree,
// writes bench.json and exits 0. Needs `npm run build` first and Google Chrome / Chromium installed
// (or CHROME_PATH pointing at one).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, type as osType, release, cpus, totalmem, platform } from 'node:os';
import { join } from 'node:path';

const t0Epoch = performance.timeOrigin; // process start: load_ms counts from here (§1.4)

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d;
};
const seed = Number(arg('--seed', 42));
const duration = Number(arg('--duration', 30));
const out = arg('--out', 'bench.json');
const headless = argv.includes('--headless');
if (!Number.isInteger(seed) || !(duration > 0)) {
  process.stderr.write('usage: bench --seed <int> --duration <s> --out <file.json> [--headless]\n');
  process.exit(1);
}

const fail = (msg) => {
  process.stderr.write(`bench: ${msg}\n`);
  process.exit(1);
};

if (!existsSync(new URL('../dist/serve.js', import.meta.url))) fail('no build found: run "npm run build" first');
const { startServer } = await import('../dist/serve.js');
const { chromium } = await import('playwright-core').catch(() => fail('playwright-core missing: run "npm ci"'));

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = {
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'],
    win32: [
      `${process.env['PROGRAMFILES'] ?? 'C:\\Program Files'}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)'}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['LOCALAPPDATA'] ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
    ],
  }[platform()] ?? [];
  return candidates.find((p) => existsSync(p));
}

/** Sum of RSS (MB) of `rootPid` and all its descendants, via ps. Null where ps is not available. */
function treeRssMb(rootPid) {
  if (!rootPid || platform() === 'win32') return null;
  try {
    const rows = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,rss='], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .map((l) => l.trim().split(/\s+/).map(Number));
    const kids = new Map();
    for (const [pid, ppid] of rows) kids.set(ppid, [...(kids.get(ppid) ?? []), pid]);
    const rss = new Map(rows.map(([pid, , kb]) => [pid, kb]));
    let total = 0;
    const stack = [rootPid];
    while (stack.length) {
      const p = stack.pop();
      total += rss.get(p) ?? 0;
      stack.push(...(kids.get(p) ?? []));
    }
    return total / 1024;
  } catch {
    return null;
  }
}

/** The Chrome browser process: the one whose command line carries our private profile directory. */
function browserPid(profileDir) {
  if (platform() === 'win32') return null;
  try {
    const rows = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,args='], { encoding: 'utf8' }).trim().split('\n');
    const mine = rows
      .map((l) => l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/))
      .filter((m) => m && m[3].includes(profileDir) && !m[3].includes('--type='));
    return mine.length ? Number(mine[0][1]) : null;
  } catch {
    return null;
  }
}

const executablePath = findChrome();
if (!executablePath) fail('Google Chrome / Chromium not found; set CHROME_PATH to its executable');

const { server, url } = await startServer({ port: 0 });
const profile = mkdtempSync(join(tmpdir(), 'ddl-bench-'));
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath,
    headless,
    viewport: { width: 1280, height: 720 },
    args: [
      '--window-size=1280,720',
      // Wayland ignores --disable-gpu-vsync and caps rAF at the display rate; XWayland honours it.
      ...(platform() === 'linux' ? ['--ozone-platform=x11'] : []),
      '--disable-gpu-vsync', // vsync off (§1.2.1)
      '--disable-frame-rate-limit',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
    ],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  const pid = browserPid(profile);
  await page.goto(`${url}?bench=1&seed=${seed}&duration=${duration}`);

  let peak = null;
  let first = null;
  const deadline = Date.now() + (duration + 3 + 60) * 1000;
  for (;;) {
    const st = await page.evaluate(() => window.__bench ?? null);
    if (st && first === null) first = st.first_frame_epoch_ms;
    if (st && st.state === 'running' && first !== null && Date.now() - first > 3000) {
      const m = treeRssMb(pid); // peak during the measured part only (§1.4)
      if (m !== null) peak = Math.max(peak ?? 0, m);
    }
    if (st?.state === 'done') {
      const info = await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        return {
          gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl?.getParameter(gl.RENDERER) ?? 'unknown'),
          three: window.__THREE_REVISION ?? null,
          ua: navigator.userAgent,
        };
      });
      const chromeVersion = context.browser()?.version() ?? info.ua.match(/Chrome\/([\d.]+)/)?.[1] ?? 'unknown';
      const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
      const report = {
        contract_version: '1.3',
        avg_fps: round(st.avg_fps),
        p1_low_fps: round(st.p1_low_fps),
        frame_ms_p95: round(st.frame_ms_p95, 2),
        frames: st.frames,
        load_ms: Math.round(first - t0Epoch),
        peak_mem_mb: peak === null ? null : Math.round(peak),
        vsync_off: true,
        renderer: `Three.js r${info.three ?? '?'} WebGLRenderer (WebGL 2) in Chrome ${chromeVersion}${headless ? ' headless' : ''}; GPU: ${info.gpu}`,
        os: `${osType()} ${release()} (${platform()}), ${cpus()[0]?.model ?? 'cpu?'} ×${cpus().length}, ${Math.round(totalmem() / 2 ** 30)} GB RAM`,
      };
      writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
      process.stdout.write(JSON.stringify(report) + '\n');
      break;
    }
    if (Date.now() > deadline) throw new Error('bench did not finish in time');
    await new Promise((r) => setTimeout(r, 250));
  }
} catch (e) {
  process.stderr.write(`bench: ${e.message}\n`);
  process.exitCode = 1;
} finally {
  await context?.close().catch(() => {});
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
