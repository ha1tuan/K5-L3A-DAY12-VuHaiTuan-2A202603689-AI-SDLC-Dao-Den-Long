// Thin Node adapter: argv → files → runHeadless → file + exit code.
import { readFileSync, writeFileSync } from 'node:fs';
import { ArgError, parseArgs } from './args';
import { ContractFormatError, parseInputs, parseScenario } from './parse';
import { runHeadless } from './run';
import { InputTimeline } from './timeline';

function readJson(path: string, kind: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    throw new Error(`cannot read ${kind} file ${path}: ${(e as Error).message}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new ContractFormatError(`${kind} file ${path} is not valid JSON: ${(e as Error).message}`);
  }
}

function main(argv: string[]): number {
  try {
    const args = parseArgs(argv);
    const scenario = args.scenario ? parseScenario(readJson(args.scenario, 'scenario')) : undefined;
    const frames = args.inputs ? parseInputs(readJson(args.inputs, 'inputs')) : [];
    const lines = runHeadless({
      seed: args.seed,
      night: args.night,
      scenario,
      timeline: new InputTimeline(frames),
      ticks: args.ticks,
      snapshotEvery: args.snapshotEvery,
    });
    writeFileSync(args.out, lines.join('\n') + '\n');
    return 0;
  } catch (e) {
    process.stderr.write(`headless: ${(e as Error).message}\n`);
    if (e instanceof ContractFormatError) return 2;
    if (e instanceof ArgError) return 1;
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
