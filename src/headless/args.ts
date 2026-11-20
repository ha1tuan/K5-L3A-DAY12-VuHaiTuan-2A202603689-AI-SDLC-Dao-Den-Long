import type { NightId } from '../sim';
export interface HeadlessArgs {
  seed: number;
  night: NightId;
  ticks: number;
  out: string;
  snapshotEvery: number;
  scenario?: string;
  inputs?: string;
}

/** Bad command line (not a bad file): the CLI exits with code 1. */
export class ArgError extends Error {}

const USAGE =
  'usage: headless --seed <int> --night 1|2|3 [--scenario <file.json>] [--inputs <file.json>] --ticks <int> --out <file.jsonl> [--snapshot-every <int>]';

export function parseArgs(argv: string[]): HeadlessArgs {
  const raw = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) throw new ArgError(`unexpected argument "${k}"\n${USAGE}`);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new ArgError(`missing value for ${k}\n${USAGE}`);
    raw.set(k.slice(2), v);
    i++;
  }
  const int = (name: string, required: boolean, min: number): number | undefined => {
    const v = raw.get(name);
    if (v === undefined) {
      if (required) throw new ArgError(`--${name} is required\n${USAGE}`);
      return undefined;
    }
    const n = Number(v);
    if (!Number.isInteger(n) || n < min) throw new ArgError(`--${name} must be an integer >= ${min}`);
    return n;
  };
  const night = int('night', true, 1)!;
  if (night > 3) throw new ArgError('--night must be 1, 2 or 3');
  const out = raw.get('out');
  if (!out) throw new ArgError(`--out is required\n${USAGE}`);
  return {
    seed: int('seed', true, -(2 ** 31))!,
    night: night as NightId,
    ticks: int('ticks', true, 0)!,
    out,
    snapshotEvery: int('snapshot-every', false, 1) ?? 10,
    scenario: raw.get('scenario'),
    inputs: raw.get('inputs'),
  };
}
