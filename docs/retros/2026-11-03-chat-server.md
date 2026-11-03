---
branch: feat/chat-server
date: 2026-11-03
pr: chat server half (foundation step 7, Task 1)
title: chat tables, RPCs, thread creation and pgTAP
escaped: 0
rework: 1
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

## What review caught (round 1)

| #   | Finding                                                                                                                         | Root cause class | Change and layer                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| 4   | Important: the left-member boundary had no test that could fail through RLS or the list; one test (repeated select) was vacuous | check design     | Direct `messages` count and `lastMessage` as the rider who left; `ensure_thread` re-entered twice |
| 5   | Newline-only messages passed `btrim`                                                                                            | code             | Whitespace regex in the check and the function; newline test                                      |
| 6   | Riders who left saw members who joined later                                                                                    | code             | `joined_at <= left_at` in the policy and `thread_json`; tested                                    |
| 7   | Unbounded `list_threads`, missing report indexes, no lock on the membership row, unused `uid` parameter                         | code             | Paging, indexes, `for share`, `auth.uid()` inside the helper                                      |
| 8   | Report snapshot retention left unstated                                                                                         | judgment         | Owner decision pending with ★ 1 year                                                              |

Round 2 (after #62 merged): the chat branch in `queue_push` and `push_subject`, `notify` copy, and the ride
quiet-hours exemption. A new `push_kinds.test.sql` inserts one event per push kind and fails when any has no thread
rule, since `queue_push` only warns. The first threshold in that test (more than 20 kinds) was off by one against
the 20 kinds that exist; caught on the first run. Adding the push rules took the chat migration to 512 lines;
`check:size` caught it, and the push rules moved to their own migration.

Follow-ups after the re-review: `list_threads` paged by a thread id whose sort key was read again on the next call,
so a thread that moved up repeated the threads above it; the cursor now carries the sort key. The trim did not strip
no-break or zero-width spaces. Thread creation now uses `clock_timestamp()` like messages, which the cursor case
needed to order threads created in one transaction.

Lesson: for every boundary a policy enforces, assert it through the role that RLS applies to, not only through the
`security definer` RPC.

## Notes

- Defaults chosen without the owner are listed in the plan's Rulings (★ Server defaults) for veto.
