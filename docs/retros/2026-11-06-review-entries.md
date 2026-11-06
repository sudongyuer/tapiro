---
branch: feat/review-entries
date: 2026-11-06
pr: review entries (plan Task 4)
title: The review row on 已结清, one row per counterpart on a closed ride, the sealed lines and the home card
escaped: pending
rework: 2
interventions: 0
overturned: pending
---

# Retro: review entries (Task 4)

## Selection

| Cases                                                                 | Runs              | Reason                                                             |
| --------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------ |
| `review_entry_*` (eight)                                              | zh-Hans light, en | New rows and card, new copy keys                                   |
| `review_entry_sealed`, `_ride`, `_home`, `_home_worst`                | ms                | Long sealed lines and names                                        |
| `review_entry_status`, `_ride`, `_home`                               | dark              | New surfaces on three screens; contrast by eye                     |
| `review_sheet_edit`, `_revealed`, `_locked`                           | zh-Hans light     | Their args changed: the fixture now needs `-uiVerifyReviews`       |
| `bounty_status_states`, `ride_settle_rows`, `home_three_cards`, smoke | zh-Hans light     | The three screens gained a slot; one case each shows nothing moved |

## Core (mandatory)

| Dimension | Measure                 | This step                                                                     |
| --------- | ----------------------- | ----------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending                                                                       |
| Quality   | Vacuous checks          | Three found in review, fixed                                                  |
| Quality   | Skipped verifications   | `rep.reviews.live` on screen (unit only); device: VoiceOver order on the rows |
| Speed     | Wall-clock              | About 1.5 h                                                                   |
| Autonomy  | Avoidable interventions | 0                                                                             |
| Loop      | Minutes on this retro   | 3                                                                             |

## Problems and root causes

| #   | What happened                                                                                                                                                 | Root cause class | Change and layer                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
| 1   | `review_entry_status` could not find the row: an identifier on the HStack inside a SwiftUI `Button` is not exposed; the row was on screen in the failure shot | own gap          | The identifier and label sit on the Button when the row opens    |
| 2   | The default fixture would have put two cards on every home case                                                                                               | foreseen         | `reviewsOn`: no pairs or pending rows without `-uiVerifyReviews` |

## Review findings

Round 1: 0 Critical, 3 Important (a newly settled item got no home card until the next foreground return: the list now reads on focus, pull and the two settled signals; a window that passed on the device still opened the sheet: entries and the sheet now check the clock; `readFailed` was untested and the stale path unreachable: `stateAgain`, store tests and two cases), 9 Minor (the mark ignored request order and sign-out; a retry blanked the block; a stale empty list said nothing; stale home cards stayed; pull did not reach the entries; viewers saw a failed block on rides they were not on; a null counterpart offered 改一下; a long title pushed the name off the card; vacuous assertions and missing `DEPS`). All fixed. Round 2, narrow: 1 Important (a pull before settlement cached an empty list, which then hid the row and dead-ended the home card): a pull now reads only an item on screen, `ride.settled` marks a cached ride stale, and 这条评价已经不在了 offers 重试.
