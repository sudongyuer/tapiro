---
branch: fix/verify-tools-1119
date: 2026-11-19
pr: Simulator lock honours the holder's max age; runner option for a 12-hour round
title: a 12 h full run would be taken over at 4 h; no way to run cases in 12-hour time
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: verify tooling before the 2026-11-19 full run

## Core (mandatory)

| Dimension | Measure               | This step                                                                    |
| --------- | --------------------- | ---------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                            |
| Quality   | Skipped verifications | None; the lock is tested with stand-in commands, the hour cycle by unit test |
| Speed     | Wasted time           | ~0; found while reading the scripts before the run                           |
| Autonomy  | Interventions         | 0                                                                            |

## Findings

- `sim-lock.sh` judged a holder's age by the waiter's `MAX_AGE` (4 h), so any agent queueing behind an 11–12 h
  `verify:full` would take the Simulators over mid-run. The holder now records the max age it declared and waiters
  use that; both changed tests fail on the old script. Tag `lock-max-age`.
- The runner forces 24-hour time for every case not naming `-AppleICUForce12HourTime`, so 12-hour layouts were never
  checked outside two cases. `--hour-cycle 12` adds it to every job. Tag `hour-cycle`.
- CI's size check failed: `run.py` reached 502 of 500 lines. `bun run check:size` was not in the local pre-commit list
  I ran (AGENTS.md lists it under Checks). Tag `skipped-local-check`.
