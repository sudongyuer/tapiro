---
branch: test/push-off-seen
date: 2026-11-24
pr: Notifications off keep the badge and strip; one-time seen marks covered
title: Notifications off and one-time seen marks
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: notifications off and one-time seen marks

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                          |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 0                                                                                                                  |
| Quality   | Skipped verifications | `push_off_live` is written, not run (the task ran smoke only; it runs with the next milestone)                     |
| Speed     | Wasted time           | ~5 min: a fresh worktree had no `node_modules`, so `lint:changed`, `tsc` and `bun test` failed until `bun install` |
| Autonomy  | Interventions         | 0                                                                                                                  |

## Findings

- Both "open" criteria were already built. `bounty.apply.seen` kept a bare `ui` token from #16 although the server
  marker (`mark_bounty_seen`), the detail mark (54A), the home marks and their cases had all landed since; the story map
  never pointed at `home_bounty_cards`. `chat.push.off` needed no code: the tab badge and the strip follow live signals
  and reads, and the broadcast trigger fires per event, never per token.
- The verify case first built `-uiVerifyLive` with an f-string; `test_affected` rejects non-literal `ARGS`, and the
  Python unit tests caught it before CI.
- The shared local stack fails six `live_push` tests (no `realtime.messages` partition, a stale quiet-hours migration);
  they are environment, and CI runs a fresh stack.

## Actions

- A worktree without `node_modules` is now the third retro in a row (TestFlight external, ETA overdue, this one).
  Candidate for `escalate-correction`: install dependencies when a worktree is created (a `WorktreeCreate` hook), so no
  check runs against the main checkout's packages. Left for the main session to decide.
