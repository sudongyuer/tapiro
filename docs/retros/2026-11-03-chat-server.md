---
branch: feat/chat-server
date: 2026-11-03
pr: chat server half (foundation step 7, Task 1)
title: chat tables, RPCs, thread creation and pgTAP
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: chat server half

## Core (mandatory)

| Dimension | Measure                 | This step                                                                       |
| --------- | ----------------------- | ------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                         |
| Quality   | Vacuous checks          | 0: each RLS denial is paired with a member read that returns rows               |
| Quality   | Skipped verifications   | UI cases and smoke: no screen changed; `int` for account deletion stays planned |
| Speed     | Wall-clock              | About 60 min                                                                    |
| Autonomy  | Avoidable interventions | 0                                                                               |
| Loop      | Minutes on this retro   | 3                                                                               |

## Problems and root causes

| #   | What happened                                                                                                                                       | Root cause class | Change and layer                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | A rider who left could not read the messages sent before leaving in the same transaction: `left_at` used `now()`, messages used `clock_timestamp()` | code             | Membership times use `clock_timestamp()` too; the pgTAP case covers it                                    |
| 2   | `on conflict (sender_id, client_id)` was ambiguous with the PL/pgSQL parameter `client_id`                                                          | code             | `on conflict on constraint`; caught by the first test run                                                 |
| 3   | The local Supabase stack is shared by every worktree, so a concurrent agent's `db:reset` can wipe this one's schema mid-run                         | environment      | None needed this time (no collision); rerun `db:reset` before `db:test` if a run fails on a missing table |

## Notes

- Defaults chosen without the owner are listed in the plan's Rulings (★ Server defaults) for veto.
