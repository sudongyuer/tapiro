---
branch: docs/device-perf-run-2
date: 2026-11-21
pr: second device perf run on the 13 Pro Max
title: Device perf run stopped by phone storage again
escaped: 0
rework: 0
interventions: 2
overturned: 0
---

# Retro: device perf run 2

## Core (mandatory)

| Dimension | Measure               | This step                                                                           |
| --------- | --------------------- | ----------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                   |
| Quality   | Skipped verifications | Build B chat and pop, and B board r2: the phone ran out of storage                  |
| Speed     | Wasted time           | About 10 min of failed B runs; the campaign script hid the install error            |
| Autonomy  | Interventions         | 2: the owner read free storage from Settings, and confirmed the phone was signed in |

## Findings

- The owner reported more than 1 GB free in Settings before the run; after six Release reinstalls the install staging
  directory failed with `No space left on device`. The Settings figure does not predict install headroom. Check by
  attempting one install of each build before the campaign, and stop the campaign on the first install failure instead
  of recording against the wrong build.
- `run.sh` sends install output to `/dev/null` under `set -e`, so each B run failed silently as `FAILED`. The next run
  should print the install error.
- A 3.4 s Potential Hang with no Time Profiler samples from any thread is a recording gap, not app work; check thread
  samples before reporting a hang.
- The owner wants device sign-in driven with agent-device, not asked of them (kept in the agent's memory).
