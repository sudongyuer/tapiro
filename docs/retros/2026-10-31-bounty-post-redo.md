---
branch: feat/bounty-post-redo
date: 2026-10-31
pr: bounty post redo
title: posting a bounty, redone (tiles first, form under a live card)
escaped: pending
rework: 3
interventions: 0
overturned: 0
---

# Retro: posting a bounty, redone

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                 |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending (the user's walkthrough)                                                          |
| Quality   | Vacuous checks          | 0: the art pixel check and touch-target asserts each failed on a real defect first        |
| Quality   | Skipped verifications   | Dark/en for cases beyond pick and form; `verify:full` overnight                           |
| Speed     | Wall-clock              | About 5 h incl. 3 UI fix rounds (~35 min of Simulator runs); ~30 min on the optional case |
| Autonomy  | Avoidable interventions | 0 after the design rounds (A rejected, five directions, then 「全 ★」)                    |
| Loop      | Minutes on this retro   | 6                                                                                         |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                | Root cause class | Change and layer                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | To compare test results against main, `git stash -u -- src` was popped over a staged rename; the pop stopped at the first untracked file that already existed and left the other new files only in the stash                 | unsafe command   | Restored every file from `stash^3` and compared each with `cmp` before dropping the stash. Compare against main in a worktree (`git worktree add`), never with stash                                                                                                                         |
| 2   | `postSheet.ts` started importing the draft store, which pulls in React Native, and `bun test` failed between tests on Flow syntax                                                                                            | wrong layering   | The draft check moved to its own module; `postSheet.ts` stays free of app imports so its unit test runs                                                                                                                                                                                      |
| 3   | Two sessions both acted on the same canvas comment threads (Q98, RideRoute): the peer published a redraw while this session's fork started another                                                                           | duplicate work   | Canvas comments notify every watching session. Claim a thread in it (reply or message the peer) before redrawing; the peer handed the boards over (tag: canvas-thread-claim)                                                                                                                 |
| 4   | The live card's art vanished after every change: the 86A arrival keyframe, re-keyed inside an `RNHostView` in a SwiftUI row, never showed the new drawing. `bounty_post_art`'s pixel count caught it; the video confirmed it | platform quirk   | The card swaps art without motion (spec updated). Re-keyed Reanimated entering animations inside `RNHostView` are not used; noted in the spec's Motion section (tag: rnhostview-entering)                                                                                                    |
| 5   | Bordered capsule buttons (amounts, time picks, 移除) measured 34 pt or 20 pt; `controlSize('large')` then truncated 「RM 10」 to 「RM…」                                                                                     | wrong assumption | The label carries the height (`CHIP_LABEL_HEIGHT`, from the measured 7 pt padding) with the regular control size; `assert_touch_target` in the cases caught each one (tag: touch-target)                                                                                                     |
| 6   | `bounty_post_optional` broke three ways on 31 October: only one open day in the calendar, the new 44 pt 移除 counted as a day cell, and after scrolling the title's AX frame was about 150 pt off its drawn position         | test bug         | The case proves a changed deadline with the 「明天」 quick pick and only checks that the calendar disables past days; day cells exclude identified buttons; the title and reward are filled before the time row opens. Time-boxed at 20 minutes per the Pace rule (tag: date-dependent-case) |
| 7   | Another session checked out `main` and another branch in this same checkout while this branch had uncommitted work; the two commits landed on local `main`, and the push sent the old branch                                 | shared checkout  | Moved the commits back to the branch, rebased on `origin/main`, reset local `main` to `origin/main`. Parallel sessions work in their own `git worktree`, never by switching branches in the main checkout; noted for AGENTS.md at the next rules pass (tag: shared-checkout)                 |
