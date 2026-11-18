---
branch: fix/ride-ticket-status-wrap
date: 2026-11-18
pr: The compact ride ticket's time wraps under its status instead of running under the stub
title: A17 — status row wraps, the wrapped time drops its dot; ride_list checks the time left of the stub at Large and AX5
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: ride ticket status wrap

## Core (mandatory)

| Dimension | Measure               | This step                                                            |
| --------- | --------------------- | -------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                    |
| Quality   | Skipped verifications | None; ride_list ran at Large and AX5 in zh-Hans and ms, plus smoke   |
| Speed     | Wasted time           | ~10 min: one extra build to show the AX5 check fails without the fix |
| Autonomy  | Interventions         | 0                                                                    |

## Findings

- The first attempt in #179 gave the time `flexShrink` and changed nothing: the row did not constrain the text, so it
  kept overflowing. Wrapping the row is the layout that actually holds at every size.
- The new ride_list assertion (departure time read whole inside the ticket's main column) failed on the build without
  the fix at AX5 (「•今天17:4：」), and passes with it, so it can fail.
