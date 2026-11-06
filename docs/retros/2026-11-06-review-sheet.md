---
branch: feat/review-sheet
date: 2026-11-06
pr: review sheet (plan Task 3)
title: The review sheet with faces, chips by role, draft and discard, 改一下, and the 257 a1 seal
escaped: pending
rework: 3
interventions: 0
overturned: pending
---

# Retro: review sheet (Task 3)

## Selection

| Cases                                | Runs                                     | Reason                                                    |
| ------------------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| `review_sheet*` (ten)                | zh-Hans light, en; zh-Hans dark for five | New sheet, new copy keys; dark asked for the review sheet |
| `review_sheet`, `review_sheet_worst` | ms                                       | Longest chips and the 45-character name                   |
| `review_sheet`                       | one appearance with video                | Motion 257 a1, read frame by frame                        |
| smoke                                | zh-Hans light                            | `PillButton` and the root stack changed for every screen  |

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                       |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending                                                                                                         |
| Quality   | Vacuous checks          | `review_sheet_failed` retried only by reopening (review C1); two weak assertions (M5)                           |
| Quality   | Skipped verifications   | `landedLater` (no case); device: the light haptic, seal feel on a Release build, VoiceOver order, keyboard feel |
| Speed     | Wall-clock              | About 2 h                                                                                                       |
| Autonomy  | Avoidable interventions | 0                                                                                                               |
| Loop      | Minutes on this retro   | 4                                                                                                               |

## Problems and root causes

| #   | What happened                                                                                                                                                                                              | Root cause class | Change and layer                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 留着草稿 and 放弃 reopened the alert: `navigation.dispatch(data.action)` is prevented again; the Expo Router copy of `usePreventRemove` hands the callback `repeat()` instead (tag: prevent-remove-repeat) | own gap (memory) | Read the installed hook; `repeat()`. `review_sheet_discard` caught it                                                                                                                      |
| 2   | `flexGrow` content plus automatic insets let the pinned 提交 sit below the visible area until the view scrolled; only the screenshot showed the faces under the bar                                        | own gap          | 提交 follows the sentence, as the 239 drawing has it                                                                                                                                       |
| 3   | The first `review_sheet_discard` pull started at y 20, above the sheet, so nothing happened                                                                                                                | case bug         | The pull starts on the grabber                                                                                                                                                             |
| 4   | `review_sheet_sending` read 「the sheet closed while sending」: the 9 s fixture delay had passed by the pull, so the seal had started and the pull closed the sheet correctly (tag: record-lag)            | case bug         | 20 s delay; the read stands for the real rule                                                                                                                                              |
| 5   | `review_sheet_failed` once missed `review-chip-late` right after a face tap on `Tapiro Verify 3`; three reruns passed and the log shows a 5.6 s read, cause not proven (tag: missed-tap)                   | unknown          | Recorded; rerun passed                                                                                                                                                                     |
| 6   | `Tapiro Verify 2` lost `review_sheet_failed` to an automation-session timeout at the first read; the rerun passed (tag: automation-session-timeout)                                                        | environment      | Rerun once as briefed; no code change. The final matrix lost two more runs the same way at load average 158 (`mds` at 133 % CPU, Spotlight on the new DerivedData); both passed on a rerun |

## Review findings

Round 1: 1 Critical (提交 stayed off after any failure, so the promised retry in place could not happen; the case closed and reopened first, the one route that worked, and missed it), 4 Important (no close and an English route title while loading; the form live again between the acknowledgement and the seal, where a tap could send twice; nothing checked the sending state; a public review opened over an old draft and stayed editable), 7 Minor (old failure announced on reopening; a lost answer read as a failure; sealed copy stale after a live reveal; the invisible 好的 closed instead of skipping; two weak assertions; no pixel appearance check; story-map links and `DEPS`). All fixed, three cases added (`review_sheet_retry`, `review_sheet_lost`, `review_sheet_sending`). Round 2: 0 Critical, 4 Important (a lost answer read as failed for one round trip, and a retry after it could end in a false refusal: the store now stays sending through the reload and counts a stored review as sent; read-only worked only at mount; `base` frozen at mount could turn a stored review back into a draft: both now derive from the pair), 5 Minor (a lost-answer assertion that could not fail, a retry case that edited first, a read right after a drag, three behaviours with no assertion). All fixed; `review_sheet_locked` added, four store tests added. Round 3, narrow: 1 Important (a lost answer whose reload failed and which a later reload proves stored stayed 没提交成功): fixed in the sheet with `landedLater`; no case drives it, since the fixture cannot fail only the read after a submit and trigger a later one.
