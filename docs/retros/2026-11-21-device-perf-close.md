---
branch: docs/device-perf-close
date: 2026-11-21
pr: the owner closes the device perf sign-off
title: A device sign-off that waited on phone storage for hours
escaped: 0
rework: 0
interventions: 1
overturned: 0
---

# Retro: closing the device perf sign-off

## Core (mandatory)

| Dimension | Measure               | This step                                                        |
| --------- | --------------------- | ---------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                |
| Quality   | Skipped verifications | Build B chat, pop and second board run; waived by the owner      |
| Speed     | Wasted time           | Hours of status-only turns while the goal hook waited on a phone |
| Autonomy  | Interventions         | 1: the owner closed the item                                     |

## Findings

- A goal whose last item needs a borrowed phone cannot finish on its own; the stop hook kept the session looping on
  status replies. Next time, state at the first block what the owner must do (free storage, lend a phone) or that they
  can close the item, once, and keep the measurement plan in the research doc.
- The owner's third storage clean-up still left too little for one Release install. Install headroom on that phone is
  the recurring blocker; the AGENTS.md rule from #220 (each install is the check) held and nothing was deleted.
