---
branch: chore/sim-lock-queue
date: 2026-11-18
pr: Shared FIFO Simulator lock for parallel agents
title: scripts/sim-lock.sh replaces the ad-hoc mkdir lock with a FIFO queue, stale takeover and a run wrapper
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: Simulator lock queue

## Core (mandatory)

| Dimension | Measure               | This step                                                               |
| --------- | --------------------- | ----------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                       |
| Quality   | Skipped verifications | None; no Simulator needed (the script is tested with stand-in commands) |
| Speed     | Wasted time           | ~0                                                                      |
| Autonomy  | Interventions         | 0                                                                       |

## Findings

- Root cause of the 15–17 h waits: the lock had no queue, so whoever polled fastest won every release, and a dead
  holder's lock never expired. The fix lands at the tool layer (FIFO tickets, PID and max-age takeover, `run` that always
  releases) with one AGENTS.md line pointing at it, not a rule about polling intervals.
- The FIFO test gives the waiters 1 s, 0.3 s and 0.05 s poll intervals in arrival order, reproducing the starvation: with
  the queue-head check removed the fastest poller wins and the test fails. Each of the seven behaviours was mutated in
  turn and its test failed.
- `acquire` records the caller's shell PID; an agent's one-off tool shell exits at once, so a bare `acquire` would look
  dead to the next waiter. Documented in `verification/ui/README.md`; agents use `run`.
