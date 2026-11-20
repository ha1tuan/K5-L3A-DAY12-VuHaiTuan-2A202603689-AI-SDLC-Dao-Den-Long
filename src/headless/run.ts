import { createSim, type Scenario } from '../sim';
import { endLine, eventLine, snapshotLine } from './format';
import type { InputTimeline } from './timeline';

export interface HeadlessConfig {
  seed: number;
  night: 1;
  scenario?: Scenario;
  timeline: InputTimeline;
  ticks: number;
  snapshotEvery: number;
}

/** Runs the night headlessly and returns the JSONL lines (Test Contract v1.0 §B, §E). */
export function runHeadless(cfg: HeadlessConfig): string[] {
  const sim = createSim({ seed: cfg.seed, night: cfg.night, scenario: cfg.scenario });
  const lines = [snapshotLine(sim.state)];
  for (let k = 0; k < cfg.ticks && sim.state.status === 'playing'; k++) {
    for (const e of sim.step(cfg.timeline.at(k))) lines.push(eventLine(e));
    const onCadence = sim.state.tick % cfg.snapshotEvery === 0;
    if (onCadence || sim.state.status !== 'playing') lines.push(snapshotLine(sim.state));
  }
  lines.push(endLine(sim.state));
  return lines;
}
