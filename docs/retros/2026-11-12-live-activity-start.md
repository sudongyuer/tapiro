---
branch: feat/live-activity-start
date: 2026-11-12
pr: Live Activity starts, updates and ends from bounty en_route and ride 集合 (275 A)
title: A planner over list() made restarts and dismissals cheap; review found the hidden failure paths
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: Live Activity app wiring

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                         |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0; review found 2 Important (minute redraws from an old read; sign-out cleared the dismissal record too early) and 6 Minor, all fixed |
| Quality   | Vacuous checks          | 0; each new rule test was mutated once and failed (7 of 50)                                                                       |
| Quality   | Skipped verifications   | The island and the stale look (device only); ride 集合 on the Simulator (unit and pgTAP only)                                    |
| Speed     | Wall-clock              | About 3 h, of which about 20 min waiting for the shared Simulator lock                                                            |
| Autonomy  | Avoidable interventions | 0                                                                                                                                 |
| Loop      | Minutes on this retro   | 10                                                                                                                                |

## Problems and root causes

| #   | What happened                                                                                                                                                   | Root cause class | Change and layer                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | The first migration version (`20261112000300`) was already taken by the unmerged `feat/ask-energy` worktree                                                     | process gap      | Checked every worktree's `supabase/migrations` before picking; renamed to `000400`. Recorded here, tag `migration-race` |
| 2   | The minute tick kept redrawing from the last read after the network failed; the failure test never ticked                                                     | own slip         | A tick on a read older than 2.5 min reads again; the test ticks after a failure (code + unit test)                     |
| 3   | `beforeSignOut` cleared the started record before sign-out finished, so a failed sign-out would restart dismissed activities                                   | own slip         | Sign-out ends and pauses; the record stays (code + unit test)                                                           |
| 4   | `axe button lock` did nothing on iOS 27.2 and `side-button` toggled the screen only some of the time; `home` and swipes did not unlock                          | tool limit       | `side-button --duration 0.3` locked reliably; `simctl launch` of the running app brought it to the front. Tag `axe-lock` |
| 5   | `prettier --write` on `docs/status.md` reflowed an unrelated table                                                                                               | own slip         | Reverted and re-applied the edit by hand; check `prettier --check` on a doc before writing it                           |
| 6   | Testing the RPC on the shared local stack would have recorded a migration version another worktree might reuse                                                  | process gap      | Ran pgTAP inside one rolled-back transaction; applied the function only for the Simulator run and dropped it afterwards |

## Follow-ups

- Spike C on the owner's iPhone: island while Tapiro is in front, the stale look, background updates.
- `Text(timerInterval:)` for the minutes before push ships (owner's call; plan Open).
