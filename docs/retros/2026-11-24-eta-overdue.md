---
branch: feat/eta-overdue
date: 2026-11-24
pr: An overdue arrival time says how late on the status page and home card
title: Overdue arrival time and the profile block entry
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: overdue arrival time and the profile block entry

## Core (mandatory)

| Dimension | Measure               | This step                                                                         |
| --------- | --------------------- | --------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                 |
| Quality   | Skipped verifications | Live Activity on a device (unchanged behaviour; the shared constant is unit-tested) |
| Speed     | Wasted time           | A fresh worktree had no `node_modules`; `tsc` resolved the main checkout's stale copy and failed on a missing package until `bun install` |
| Autonomy  | Interventions         | 0                                                                                 |

## Findings

- `chat.block.entry` said the profile entry was missing although #88 built it a month earlier. The story map had no
  pointer from the profile's criterion (`rep.profile.safety`) back to the block story, so nobody revisited the gap.
  Fixed here by naming the entry and its case in both stories.
- `fixtureStatusService.ts` sat at exactly 500 lines, so one new scenario needed room first. Four fixtures carried the
  same `pause` helper; it now lives once in `src/lib/pause.ts`.
- The status timeline read `new Date()` only when something else re-rendered it, so the departure-late count
  (「已过 N 分钟」) froze while the page stayed open. `useNowUntil` fixes both lines with a timer to the next change.
- `react-hooks/purity` rejects `Date.now()` during render; the hook keeps `now` in state and fires at once when the
  next change is already due, which also corrects a `now` left behind while nothing was timed.

## Actions

- None beyond this PR: the stale story-map gap is a one-off, and `bun install` in a new worktree is already how the
  other agents start.
