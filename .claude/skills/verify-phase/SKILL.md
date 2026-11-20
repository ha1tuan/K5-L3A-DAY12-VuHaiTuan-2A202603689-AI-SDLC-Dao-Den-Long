---
name: verify-phase
description: Run the end-to-end Test Contract verification against the real headless binary and record evidence for a phase. Use before tagging a phase, after changing game rules or the contract, when asked to "verify", "prove it works", "save evidence", or to add a new headless scenario.
---

# Verify a phase

Evidence must come from running the real binary. Never hand-edit outputs or reports.

## Run

1. `npm run verify` builds, then runs `scripts/verify.mjs`. The default phase is the `PHASE` default in that script; bump it when a new phase starts (`phase-3` for Test Contract v1.2), or pass `-- --phase phase-N`.
2. Read the summary line (`N/M passed`). The report is written to `docs/evidence/phase-N/verify-report.md` and outputs go to `out/`.
3. Every run also:
   - re-runs each case and compares the bytes (determinism);
   - checks the generic contract rules (tick-0 snapshot, cadence, rounding, end line, event names);
   - scans `src/sim` for forbidden imports.

## When a case fails

- Find out **which side is wrong**: the game or the expectation. Re-derive the expected value by hand from `game.contract.json` and `docs/NOTES.md` (assumptions A1–A45, latest phase wins) and the tick order in the newest ADR (`docs/adr/0003-lantern-fuel-and-dawn-win.md`).
- Never change an expectation just to match the output. If the expectation really was wrong, fix it and write the corrected hand calculation in the case's `req`.
- If a new ticket changes a rule, update the case and say why in `docs/NOTES.md`. Do not delete it silently.

## Add a case

1. Write `scenarios/<name>.json` and/or `inputs/<name>.json` in the contract formats (§C, §D).
2. Add an entry to `scenarios/cases.mjs`:
   - `req` names the requirement and shows the hand calculation;
   - `night` picks the night (default 1); `events`, `noEvents`, `eventCount`, `snapshotAt`, `everySnapshot` and `end` are partial matches;
   - `check(lines)` returns error strings for relational checks (ring distance, wind push); `maxMs` bounds the run time; `customClock` skips the clock check when the scenario sets `time_left_s` or pauses;
   - a snapshot at tick k only exists if k is on the `snapshotEvery` cadence, so set `snapshotEvery: 1` for odd ticks;
   - `exit: 2` is for malformed files.
3. Keep events away from exact radius boundaries, unless the boundary itself is what you are testing. Float sums like 20 × 0.1 can land just either side of it.
4. Check that the case can fail: break the expectation once, see it go red, then restore it.

## Before tagging

- `npm test` and `npm run verify` are both green.
- Commit the evidence in the same commit as the code it proves. The report shows the commit it ran on and flags uncommitted changes in `src`; if it says "with uncommitted changes", commit the code first and run verify again.
- When the contract version changes, update `contract_version` and `STANDARD_TUNING` in `scripts/verify.mjs`, the event and state lists, and recompute every case the new rules change (say what changed in its `req`).
- Write anything not done as "chưa đạt" with the reason in `docs/NOTES.md`.
