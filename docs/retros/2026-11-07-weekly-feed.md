---
branch: feat/weekly-feed
date: 2026-11-07
pr: weekly feed (plan Task 9)
title: The weekly feed on the stage: the leaf, the chew, the answers, the invitation and the small leaf
escaped: pending
rework: 3
interventions: 0
overturned: pending
---

# Retro: weekly feed (Task 9)

## Selection

| Cases                                                   | Runs          | Reason                                                     |
| ------------------------------------------------------- | ------------- | ---------------------------------------------------------- |
| `weekly_feed*` (seven)                                  | zh-Hans light | New stage states and motion                                |
| `weekly_feed`, `_already`, `_failed`                    | en            | First screens that show these copy keys                    |
| `weekly_feed`, `_already`                               | ms            | Long answer lines in the bubble                            |
| `weekly_feed`, `_busy_stage`                            | dark          | New colours over the hill; contrast by eye                 |
| `mascot_level_up`, `mascot_level_busy`, `home_three_cards` | zh-Hans light | The stage and its actor changed under them              |
| smoke                                                   | zh-Hans light | Home is on every launch                                    |

Motion: one appearance with video (`feed.mp4`, `fall.mp4`, `reduced.mp4`).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                     |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending                                                                                       |
| Quality   | Vacuous checks          | Seven found in review (shots taken after the hold ended, a band the leaf never crossed), fixed |
| Quality   | Skipped verifications   | Device: the first-bite haptic, VoiceOver action, repeated taps during drop and chew           |
| Speed     | Wall-clock              | About 1 h                                                                                     |
| Autonomy  | Avoidable interventions | 0                                                                                             |
| Loop      | Minutes on this retro   | 4                                                                                             |

## Problems and root causes

| #   | What happened                                                                                                                                 | Root cause class | Change and layer                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| 1   | The tap guard followed the request, so a fast answer let a second tap replace the thanks with 吃饱啦                                          | own gap          | `createFeedGate`: the guard follows the sequence; unit tests                         |
| 2   | Assertions on the thanks ran after its 4 s were over, so they read the calm bubble                                                            | own gap          | The shot is taken right after the label, and OCR reads `+1` from it                  |
| 3   | The hold first used the mascot threshold (stopped after 2 pt), then the strip's (ran while the bubble was at opacity 0)                       | own gap          | Its own reaction on the bubble's fade; `weekly_feed_hold`                            |
| 4   | An empty `say` could flash a pill: a JS closure in `useAnimatedStyle` updates after the commit                                                | own gap          | No bubble for an empty line; the slot style lives in a child keyed per mode          |
| 5   | `weekly_feed_failed` read one call although the screen reached 谢谢, which only a second `service.feed()` can do: the plist lagged at load 168 | outside          | A 25 s wait on that read; it passed on every rerun                                    |
| 6   | Short windows (1.5 s 「…」) and a slow tree read failed at load 200–700 (`load averages: 710 341 242`)                                        | own gap          | Windows of 5–6 s; OCR on the shot instead of the tree                                |
| 7   | Automation-session timeouts on `Tapiro Verify 2` and `3`, always within the first seconds of a run under load; reruns passed                  | outside          | Rerun once as the task notes say; the second and third Simulators fail first         |

## Review findings

Round 1: 0 Critical, 2 Important, 7 Minor. Round 2 (re-review): 0 Critical, 3 Important, 4 Minor. Round 3 (re-review): 0 Critical, 3 Important, 1 Minor. All fixed. The last round's fix (the bubble-based hold and two cases) ran through the selection above but was not reviewed again: three rounds had reached one threshold and test windows.
