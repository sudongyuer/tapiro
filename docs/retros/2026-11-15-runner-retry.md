---
branch: fix/runner-retry
date: 2026-11-15
pr: the UI runner reboots a Simulator after any failed run and retries the run once, reporting a pass on retry as flaky
title: Rule B measured before it landed; 9 of 60 failures became 1, for 150 s on a 40 min batch
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: runner retry on failure (2026-11-15)

Follow-up to `2026-11-13-verify-full-cases` (#4, `axe-input-loss`) and status 0e; the owner chose B on 2026-11-15.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                    |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 0                                                                                                            |
| Quality   | Vacuous checks          | 0; the new `test_heal` cases fail (8 of 21) when the reboot is limited to stalls or a retry pass reads `pass` |
| Quality   | Skipped verifications   | Dark, en and ms not run: the change is in the runner, not in any screen                                      |
| Speed     | Wall-clock              | About 2 h 30 min; 1 h 25 min of it the two measured batches                                                  |
| Autonomy  | Avoidable interventions | 0                                                                                                            |
| Loop      | Minutes on this retro   | 10                                                                                                           |

## Measurement

The 15 cases that failed on 11-13, zh-Hans light, four rounds each (60 runs) in one run on three freshly booted
Simulators, so the later rounds land in the 8–40 min window. The baseline used origin/main's runner; load median 11 to 12
in both, with boot spikes at the start.

| Runner              | First runs failed | Final pass | Flaky | Final fail | Wall-clock |
| ------------------- | ----------------- | ---------- | ----- | ---------- | ---------- |
| before (stall only) | 9 (8–36 min after boot, 7 on Verify 3) | 51 | 0 | 9 | 39 min 44 s |
| after (rule B)      | 5                 | 55         | 4     | 1          | 42 min 16 s |

The retries cost 450 s of Simulator time (150 s of wall-clock). Fewer first runs failed after, consistent with reboots
keeping Simulators young, but one batch each cannot separate that from noise.

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                         | Root cause class | Change and layer                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Lost inputs on aging Simulators failed runs that pass on a fresh boot; the runner healed only after a stall                                                                                                                                           | environment      | Any failed run reboots and retries once; `flaky` status, `first-attempt/` evidence, unit tests (code). Tag `axe-input-loss` |
| 2   | `ask_sheet_worst` failed 3 of 8 runs over both batches (twice 「the prompt never read Parcel」, once a missing turn), and failed on both attempts once, the second a lost session                                                                     | unknown          | None here; listed in status 0e to measure before changing the case. Tag `ask-prompt-typing`                          |
| 3   | Smoke on the new runner twice lost the AXe session on Verify 3 within 5 s of its first launch after a fresh boot; the old stall path retried it on another Simulator and it passed (flaky). The base runner's smoke ran green once on the same machine | environment      | None; the stall path is unchanged by this PR. Tag `axe-session-fresh-boot`                                           |

## Follow-ups

- Measure `ask_sheet_worst`'s 「Parcel」 prompt step before changing the case.
- Watch the flaky list in the next `verify:full`; a case that is flaky in most runs is a case problem, not the Simulator.
