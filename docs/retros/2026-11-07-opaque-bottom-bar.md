---
branch: fix/opaque-bottom-bar
date: 2026-11-07
pr: whole pinned bottom bar opaque (Queue item 3, ★A)
title: The pinned bottom bar is opaque down to the screen edge, in the native bar
escaped: pending
rework: 1
interventions: 0
overturned: pending
---

# Retro: opaque bottom bar

## Selection

| Cases                                                                                                                                                                                                   | Runs                | Reason                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------- |
| `bounty_bar_opaque` (new), `bounty_withdraw`, `bounty_detail_outcome`, `chat_entry_status`, `bounty_select_failed`, `bounty_post_publish`, `ride_create_confirm`, `pay_payee_confirm`, `pay_sheet_cash` | zh-Hans light, dark | One case or more per `SheetFrame` screen; a surface over other content |
| smoke                                                                                                                                                                                                   | zh-Hans light       | Asked for every PR                                                     |

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                                     |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending                                                                                                                                                                       |
| Quality   | Vacuous checks          | 1 caught in review: the dark bar colour check accepted the card colour; the case now asserts the exact canvas                                                                 |
| Quality   | Skipped verifications   | The real `pay/[id]` sheet in dark was read by path, not by pixels (the case runs a scene on the pushed canvas); `en` and `ms` (no copy changed); device look of the hard edge |
| Speed     | Wall-clock              | About 1 h, shared with the dark branch                                                                                                                                        |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                                             |
| Loop      | Minutes on this retro   | 3                                                                                                                                                                             |

## Problems and root causes

| #   | What happened                                                                                                                     | Root cause class | Change and layer                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Text rows in the bar had no fill, and with a long description the words ran straight through 这次没选上                           | design gap (#83) | Code structure: `PinnedBarView` draws the opaque background, so no screen can miss it. Check: `bounty_bar_opaque` |
| 2   | `bounty_bar_opaque` first failed on its own bugs: wrong fixture id, no content under the row, `bottom()` given a frame            | own gap          | Fixed; on the unfixed build it fails with 2376 of 11088 stray pixels                                              |
| 3   | Two runs chained in the same checkout: the second exited at once on the checkout lock and left no run                             | own gap          | Reran in order. Tag `runner-checkout-lock`                                                                        |
| 4   | Automation-session timeouts on the first cases after boot, with load 140–215 (Spotlight indexing the two new DerivedData folders) | outside          | Reran once, per the known list. Tag `automation-session-timeout`                                                  |

## Notes

- Review: round 1 found 0 Critical, 2 Important (the colour check above; no story-map criterion) and 5 Minor, all fixed.
- The design canvas has no board for this choice; the owner answered from the PR #83 question.
