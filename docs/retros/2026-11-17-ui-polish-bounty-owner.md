---
branch: fix/ui-polish-bounty-owner
date: 2026-11-17
pr: UI polish audit, delegated bounty rows (BS-1, BS-15, BP-12, BB-5)
title: four formerly owner-gated bounty rows decided from the boards and built; the cancelled and disputed timelines now say what happened
escaped: 0
rework: 1
interventions: 0
overturned: 1
---

# Retro: UI polish, delegated bounty rows (2026-11-17)

Decide and build the audit's bounty rows that waited on the owner (delegated in PR #162): the cancelled timeline
(BS-1), the disputed timeline (BS-15), the already-sent notice tone (BP-12) and the dark view-switch stickers (BB-5).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                                                                                                |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                                                                                                                                        |
| Quality   | Vacuous checks          | 0: each new assertion fails on the old screen (pending steps after a cancel, no time on 点完成, warning fill, paper unselected sticker in dark)                                                                                          |
| Quality   | Skipped verifications   | Status cases not in dark (no new colours there; the end row uses the existing secondary label)                                                                                                                                           |
| Speed     | Wall-clock              | About 1.5 h of work and 30 min of runs; about 17 h waiting for the shared Simulator lock (the overnight verify:full, then other agents; this agent polled every 10 min and lost two releases to 2-min pollers before switching to 1 min) |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                                                                                                        |
| Loop      | Minutes on this retro   | 5                                                                                                                                                                                                                                        |

## What happened

| #   | What happened                                                                                                                                                                                                     | Root cause class | Change and layer                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | BS-15 had been parked as P10 although the answered 7A board already drew the disputed state (点完成 done with its time, 等阿杰处理 on the next step)                                                              | process          | None new: the brief already says to read the answered board before asking; the plan ruling now cites the board frame                                   |
| 2   | `timeline.ts` computed `ended` and nothing rendered it, so the cancelled page kept pending steps                                                                                                                  | code structure   | The end is now a timeline row from `timeline()` itself, so any renderer of the steps gets it                                                           |
| 3   | BB-5's first dark check counted paper-coloured pixels around the unselected sticker and failed on the fixed screen: the white label ink and the neighbouring sticker's white rim match paper within the tolerance | check design     | The check now measures the light share of the unselected sticker's own frame: 54% on the audit's shot, 8% after the fix. Tag `token-match-catches-ink` |
| 4   | The verify build ran outside the Simulator lock (the README says the lock does not cover `verify:build`), so the hold covers only the runs                                                                        | process          | None; noted for the other agents queuing on the lock                                                                                                   |

## Next

- The ★ rulings are listed in the three bounty plans for veto.
