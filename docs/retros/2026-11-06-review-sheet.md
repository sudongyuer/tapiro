---
branch: feat/review-sheet
date: 2026-11-06
pr: review sheet (plan Task 3)
title: The review sheet with faces, chips by role, draft and discard, 改一下, and the 257 a1 seal
escaped: pending
rework: 2
interventions: 0
overturned: pending
---

# Retro: review sheet (Task 3)

## Selection

| Cases                                | Runs                                     | Reason                                                    |
| ------------------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| `review_sheet*` (six)                | zh-Hans light, en; zh-Hans dark for five | New sheet, new copy keys; dark asked for the review sheet |
| `review_sheet`, `review_sheet_worst` | ms                                       | Longest chips and the 45-character name                   |
| `review_sheet`                       | one appearance with video                | Motion 257 a1, read frame by frame                        |
| smoke                                | zh-Hans light                            | `PillButton` and the root stack changed for every screen  |

## Core (mandatory)

| Dimension | Measure                 | This step                                                                              |
| --------- | ----------------------- | -------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending                                                                                |
| Quality   | Vacuous checks          | `review_sheet_failed` retried only by reopening (review C1); two weak assertions (M5)  |
| Quality   | Skipped verifications   | Device: the light haptic, seal feel on a Release build, VoiceOver order, keyboard feel |
| Speed     | Wall-clock              | About 2 h                                                                              |
| Autonomy  | Avoidable interventions | 0                                                                                      |
| Loop      | Minutes on this retro   | 4                                                                                      |

## Problems and root causes

| #   | What happened                                                                                                                                                                                              | Root cause class | Change and layer                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| 1   | 留着草稿 and 放弃 reopened the alert: `navigation.dispatch(data.action)` is prevented again; the Expo Router copy of `usePreventRemove` hands the callback `repeat()` instead (tag: prevent-remove-repeat) | own gap (memory) | Read the installed hook; `repeat()`. `review_sheet_discard` caught it |
| 2   | `flexGrow` content plus automatic insets let the pinned 提交 sit below the visible area until the view scrolled; only the screenshot showed the faces under the bar                                        | own gap          | 提交 follows the sentence, as the 239 drawing has it                  |
| 3   | The first `review_sheet_discard` pull started at y 20, above the sheet, so nothing happened                                                                                                                | case bug         | The pull starts on the grabber                                        |
| 4   | `Tapiro Verify 2` lost `review_sheet_failed` to an automation-session timeout at the first read; the rerun passed (tag: automation-session-timeout)                                                        | environment      | Rerun once as briefed; no code change                                 |

## Review findings

Round 1: 1 Critical (提交 stayed off after any failure, so the promised retry in place could not happen; the case closed and reopened first, the one route that worked, and missed it), 4 Important (no close and an English route title while loading; the form live again between the acknowledgement and the seal, where a tap could send twice; nothing checked the sending state; a public review opened over an old draft and stayed editable), 7 Minor (old failure announced on reopening; a lost answer read as a failure; sealed copy stale after a live reveal; the invisible 好的 closed instead of skipping; two weak assertions; no pixel appearance check; story-map links and `DEPS`). All fixed, three cases added (`review_sheet_retry`, `review_sheet_lost`, `review_sheet_sending`). Round 2: see below.
