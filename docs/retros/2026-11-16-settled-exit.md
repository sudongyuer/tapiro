---
branch: fix/settled-exit
date: 2026-11-16
pr: the 已结清 card's leave plays over the calm card instead of under it, and the case measures it frame by frame
title: The exit animation ran all along; the card mounted in its place drew over it
escaped: 1
rework: 0
interventions: 0
overturned: 0
---

# Retro: 已结清 exit (2026-11-16)

Follow-up to `2026-11-16-verify-full-1116` (#3, `exiting-not-run`) and status 0f.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                      |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 1: the one-frame exit shipped with Task 7 (2026-10-30) and passed its case, which only timed the leave's start |
| Quality   | Vacuous checks          | 0; the new span assertion fails on the old build (0.00 s) and passes on the fix (0.27–0.30 s)                  |
| Quality   | Skipped verifications   | en and ms not run: no copy changed. Device sign-off for frame drops stays on `pay.settle.payer-collect-feel`   |
| Speed     | Wall-clock              | About 1 h 30 min, of which one probe build and run settled the cause                                           |
| Autonomy  | Avoidable interventions | 0                                                                                                              |
| Loop      | Minutes on this retro   | 10                                                                                                             |

## What happened

| #   | Finding                                                                                                         | Cause                     | Action                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Last night's two A/B builds (container hidden while measuring; zIndex) did not move the exit                    | wrong question asked      | One probe build with five launch-argument variants: a 1.5 s `FadeOut`, a wrapper view, no animated style, and a 1.5 s `FadeIn` on the calm card. Only the `FadeIn` frame showed the leave, underneath. Tag `probe-variants-one-build` |
| 2   | Reanimated keeps an exiting view at its host index and inserts the siblings mounted in the same commit after it | library behaviour         | `toHostIndexForInsert` / `scanToHostIndex` in `LayoutAnimationsUtils.h`; zIndex cannot reach a removed view. The stack keeps the leaving card as a live child on top (`leavingCard.ts`)                                               |
| 3   | `home_settled_collect` passed with a one-frame exit                                                             | check measured start only | It now measures the change across the card by mean colour distance and asserts it spans ≥ 0.2 s; checked failing on the old build                                                                                                     |

## Carry forward

- An `exiting` animation on a view that is replaced in the same commit is drawn under its replacement; any future
  replace-in-place motion keeps the old view live or delays the new one. The only other `exiting` in `src/` is the
  bounty board's keyed list/map cross-fade, where the new view fading in over the old one is the intended look.
- The home board under the stack still moves to the calm card's height in one frame (plan decision log, ★ for veto).
