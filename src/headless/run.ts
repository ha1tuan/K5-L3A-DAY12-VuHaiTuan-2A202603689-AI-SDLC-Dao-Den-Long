import { CONTRACT_TUNING, createSim, nightDef, type NightId, type Scenario } from '../sim';
import { ContractFormatError } from './parse';
import { endLine, eventLine, snapshotLine } from './format';
import type { InputTimeline } from './timeline';

export interface HeadlessConfig {
  seed: number;
  night: NightId;
  scenario?: Scenario;
  timeline: InputTimeline;
  ticks: number;
  snapshotEvery: number;
}

/** A42: a shade's target_lantern_id must name a lantern of this night. */
function checkTargets(night: NightId, sc: Scenario | undefined): void {
  const count = nightDef(night, CONTRACT_TUNING).lanterns.length;
  for (const [i, sh] of (sc?.shades ?? []).entries()) {
    const id = sh.target_lantern_id;
    if (id !== undefined && !Array.from({ length: count }, (_, k) => `L${k + 1}`).includes(id))
      throw new ContractFormatError(`shades[${i}].target_lantern_id ${id} is not a lantern of night ${night}`);
  }
}

/** Runs the night headlessly and returns the JSONL lines (Test Contract v1.2). */
export function runHeadless(cfg: HeadlessConfig): string[] {
  checkTargets(cfg.night, cfg.scenario);
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
