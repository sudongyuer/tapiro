---
branch: feat/carpool-appeal-lapse
date: 2026-11-02
pr: https://github.com/sudongyuer/tapiro/pull/49
title: owner answers 220 A and 233 A; unconfirmed appeals lapse after 72 h
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: carpool appeal lapse (233 A)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                   |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 so far (no review yet)                                                                    |
| Quality   | Vacuous checks          | 0; every new case ran against the pre-change migrations first and failed there              |
| Quality   | Skipped verifications   | `verify:smoke` (no screen changed); `test:stack` (no Edge Function changed); the backfill   |
| Speed     | Wall-clock              | About 45 min                                                                                |
| Speed     | Wasted time by class    | ~5 min test bugs (pg_temp helpers read `ride_events` under `authenticated`; fixture events) |
| Autonomy  | Avoidable interventions | 0                                                                                           |
| Loop      | Minutes on this retro   | 3                                                                                           |

## Problems and root causes

| #   | What happened                                                                                                                                     | Root cause class | Change and layer                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Second agent needing an isolated Supabase stack (steps 1–3 retro item 1 said "second occurrence → script")                                        | missing tooling  | `scripts/db-isolated.sh <name> <port-prefix>`: scratch copy, own `project_id` and ports, start, `test db`, stop on exit |
| 2   | The first "before" run aborted on the new column inside an assertion, so it proved nothing about behaviour; rewrote it to count rows instead      | test bug         | none; a fail-before run should fail on assertions, not on missing schema                                                |
| 3   | A "rejected after 72 h" case already passed before the change (the window check existed); its case fails before only through the assertions after | as designed      | recorded in the spec's Implementation Record                                                                            |

## Kept (worked well)

- Keeping the no-show row and flagging it made "as if no appeal had happened" exact (same `created_at`, same waiver)
  instead of recomputing the waiver at lapse time.
