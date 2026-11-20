// Thin Node adapter for the soak test: node dist/soak.js --seed 7 --nights 10 --out soak.json
import { writeFileSync } from 'node:fs';
import { runSoak } from './soak';

const USAGE = 'usage: soak --seed <int> --nights <int> --out <file.json>';

function main(argv: string[]): number {
  const raw = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || argv[i + 1] === undefined) {
      process.stderr.write(`soak: bad arguments\n${USAGE}\n`);
      return 1;
    }
    raw.set(argv[i].slice(2), argv[i + 1]);
  }
  const seed = Number(raw.get('seed') ?? 7);
  const nights = Number(raw.get('nights') ?? 10);
  const out = raw.get('out') ?? 'soak.json';
  if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1) {
    process.stderr.write(`soak: --seed and --nights must be integers, nights ≥ 1\n${USAGE}\n`);
    return 1;
  }
  const gc = (globalThis as { gc?: () => void }).gc; // node --expose-gc: measure live memory, not garbage
  const rssMb = () => {
    gc?.();
    return Math.round((process.memoryUsage().rss / 1048576) * 10) / 10;
  };
  const report = runSoak({
    seed,
    nights,
    rssMb,
    now: () => performance.now(),
    onNight: (n) => process.stderr.write(`night ${n.night} seed ${n.seed}: ${n.result} after ${n.ticks} ticks\n`),
  });
  writeFileSync(out, JSON.stringify(report) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
  return 0;
}

process.exitCode = main(process.argv.slice(2));
