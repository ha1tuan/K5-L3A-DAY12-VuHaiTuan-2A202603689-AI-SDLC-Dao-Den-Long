// Node adapter: serves the built game (dist/web) and keeps the local leaderboard on disk (PRD v4 §3).
//   node dist/serve.js [--port 4173] [--open]           start the game at http://localhost:4173
//   node dist/serve.js --export-leaderboard out.json    write {"entries": [...]} in rank order and exit
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize as normPath, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { addEntry, entryError, normalize, type Entry } from '../leaderboard';

const HERE = dirname(fileURLToPath(import.meta.url)); // dist/
export const DEFAULT_WEB_ROOT = join(HERE, 'web');
export const DEFAULT_DATA_FILE = process.env.LEADERBOARD_FILE ?? join(HERE, '..', 'data', 'leaderboard.json');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

export function readBoard(file: string): Entry[] {
  try {
    return normalize(JSON.parse(readFileSync(file, 'utf8')));
  } catch {
    return [];
  }
}

function writeBoard(file: string, entries: Entry[]): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify({ entries }, null, 2) + '\n');
  renameSync(tmp, file); // atomic: a crash never leaves half a file
}

export function startServer(opts: { port?: number; root?: string; dataFile?: string } = {}): Promise<{ server: Server; url: string }> {
  const root = resolve(opts.root ?? DEFAULT_WEB_ROOT);
  const dataFile = opts.dataFile ?? DEFAULT_DATA_FILE;
  if (!existsSync(join(root, 'index.html'))) throw new Error(`no build at ${root}: run "npm run build" first`);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const send = (code: number, body: string, type = 'application/json; charset=utf-8') => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    };
    if (url.pathname === '/api/leaderboard') {
      if (req.method === 'GET') return send(200, JSON.stringify({ entries: readBoard(dataFile) }));
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (c) => {
          body += c;
          if (body.length > 10_000) req.destroy();
        });
        req.on('end', () => {
          let entry: unknown;
          try {
            entry = JSON.parse(body);
          } catch {
            return send(400, JSON.stringify({ error: 'JSON không hợp lệ' }));
          }
          const err = entryError(entry);
          if (err) return send(400, JSON.stringify({ error: err }));
          const entries = addEntry(readBoard(dataFile), entry as Entry);
          writeBoard(dataFile, entries);
          send(200, JSON.stringify({ entries }));
        });
        return;
      }
      return send(405, JSON.stringify({ error: 'method not allowed' }));
    }
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = normPath(join(root, rel));
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return send(404, 'not found', 'text/plain');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(opts.port ?? 4173, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : opts.port;
      ok({ server, url: `http://localhost:${port}/` });
    });
  });
}

function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch {
    /* no browser launcher: the URL is printed anyway */
  }
}

async function main(argv: string[]): Promise<number> {
  const get = (k: string) => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const exportTo = get('--export-leaderboard');
  if (argv.includes('--export-leaderboard')) {
    if (!exportTo) {
      process.stderr.write('usage: --export-leaderboard <out.json>\n');
      return 1;
    }
    writeFileSync(exportTo, JSON.stringify({ entries: readBoard(DEFAULT_DATA_FILE) }, null, 2) + '\n');
    process.stdout.write(`wrote ${exportTo}\n`);
    return 0;
  }
  const { url } = await startServer({ port: Number(get('--port') ?? 4173) });
  process.stdout.write(`Đảo Đèn Lồng: ${url}  (Ctrl+C để dừng)\n`);
  if (argv.includes('--open')) openBrowser(url);
  return -1; // keep serving
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (code) => {
      if (code >= 0) process.exitCode = code;
    },
    (e) => {
      process.stderr.write(`serve: ${(e as Error).message}\n`);
      process.exitCode = 1;
    },
  );
}
