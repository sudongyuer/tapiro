---
branch: fix/sim-lock-own-ticket
date: 2026-11-19
pr: sim-lock release frees only the caller's own lock and no longer deletes queued tickets that share its name
title: a second same-named sim-lock run waited forever
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: sim-lock same name

## Core (mandatory)

| Dimension | Measure               | This step                                                      |
| --------- | --------------------- | -------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                              |
| Quality   | Skipped verifications | None; no Simulator needed, the script's tests cover the change |
| Speed     | Wasted time           | ~0                                                             |
| Autonomy  | Interventions         | 0                                                              |

## Findings

- Cause: `release <name>` removed every queued ticket carrying that name. A waiter's ticket is already gone once it
  holds the lock, so the loop only ever removed other waiters' tickets; a second `run` with the same name lost its
  ticket and never reached the head of the queue. `run`'s release also freed the lock by name alone, so a run that
  had been taken over past its max age freed the new same-named holder's lock. Tag `sim-lock-same-name` (second
  time; first in 2026-11-19-video-missing, worked around with unique names).

## Changes

- `release` no longer touches the queue; dead waiters are still dropped by pid. `run` releases with its own pid, so
  it frees only a lock it still holds.
- A waiter whose ticket disappears (an older copy of the script in another worktree still deletes by name) joins the
  queue again and logs it, instead of waiting forever.
- `sim-lock.test.ts` adds two same-name tests that fail on the old script (the second run gave up at its timeout; the
  taken-over lock was freed) and one for rejoining.
- The guarantee sits in the script and its tests; no rule needed. The unique-name workaround is no longer required.
