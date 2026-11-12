---
branch: feat/ask-energy
date: 2026-11-12
pr: 问小貘 Task 5, the belly bar, hungry card with feeding and coin swap, and the pantry jar (135–140, 149)
title: Built from the boards; review found ordering and stale-belly holes, the Simulator found a fixture default that emptied every belly
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: 问小貘 energy and pantry (Task 5)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                         |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                           |
| Quality   | Vacuous checks          | 0 found; the belly assertion moved from an AX value RN reports as a percentage to the exact label |
| Quality   | Skipped verifications   | pgTAP run locally in a rolled-back transaction; the new stack test runs only in CI's fresh stack  |
| Speed     | Wall-clock              | About 2 h; about 5 min waiting for the Simulator lock, about 35 min in Simulator runs and reruns  |
| Autonomy  | Avoidable interventions | 0                                                                                                 |
| Loop      | Minutes on this retro   | 10                                                                                                |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                     | Root cause class | Change and layer                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Review: the hungry card stayed after a reread showed energy; an older read could land after a failed write's reread; a consent write could put back the belly a feed had just replaced; a stale belly showed live | missed case      | The card follows the belly; `reread()` bumps the epoch; a consent write keeps a belly patched meanwhile; the sheet hides a stale belly. Unit tests in `consentStore.test.ts`. Tag `late-write` |
| 2   | Review: a swap-and-feed refused as already full said 「嫩叶留在罐里」, but no leaf was swapped; with a leaf already in the jar it would spend a coin anyway                                                       | design gap       | `has_leaf` refusal in `swap_and_feed_leaf()` (pgTAP) and 「貘币没有扣」 copy. Tag `coin-copy`                                                                                                  |
| 3   | First Simulator run: `ask_sheet_worst` and three other ask cases saw a hungry belly: `''.split(',')` gave `Number('') = 0`, so a launch without `-uiVerifyAiBelly` started empty                                  | test harness     | Empty parts are missing, with a unit test. Lesson: a fixture parser's default is tested with no argument. Tag `fixture-default`                                                                |
| 4   | The leaf's card content changed mid-flight (the fifth feed turned the button into 「吃撑了」)                                                                                                                     | missed case      | The card holds the belly it showed until the motion ends (`held`). Tag `motion-state`                                                                                                          |
| 5   | At the half detent the hungry card's button sat under the fold behind the suggestions                                                                                                                             | layout           | Suggestions hide while the card shows (E5). Tag `half-detent`                                                                                                                                  |
| 6   | `ask_sheet_worst` hit an `axe type` timeout and `ask_sheet_draft_fill` a swipe that did not close the form at load average 35–65; both passed on one Simulator                                                    | environment      | None; logged with the load average. Tag `axe-stall`                                                                                                                                            |

## Follow-ups

- Task 8 adds the dizzy face (144) and 133's line; Task 9 measures the real budget, which decides whether 「大约够 3 次起草」 holds.
- Feeding motion, haptic and Reduce Motion are on the device checklist (`ask.energy.feed`).
