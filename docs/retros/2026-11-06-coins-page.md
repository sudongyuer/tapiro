---
branch: feat/coins-page
date: 2026-11-06
pr: coins in 我的 (plan Task 8)
title: The 我的 「貘币」 row, the 貘币 page with its monthly history, and four cases
escaped: pending
rework: 1
interventions: 0
overturned: pending
---

# Retro: coins in 我的 (Task 8)

## Selection

| Cases              | Runs                                  | Reason                                                                 |
| ------------------ | ------------------------------------- | ---------------------------------------------------------------------- |
| `coins_page*`      | zh-Hans light and dark, en (all four) | New screen and a new 我的 row; new copy keys                           |
| `coins_page_worst` | ms                                    | Longest copy and long titles                                           |
| smoke              | zh-Hans light                         | 我的 changed for every signed-in case; smoke covers the shell and tabs |

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                              |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending                                                                                                                                                                |
| Quality   | Vacuous checks          | The failed case waits past the fixture delay before asserting the row has no number; the stale case asserts the rows stay; a docstring claim with no check was removed |
| Quality   | Skipped verifications   | Device: VoiceOver reading order and Dynamic Type beyond Large; no motion, so no Instruments                                                                            |
| Speed     | Wall-clock              | About 2 h                                                                                                                                                              |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                                      |
| Loop      | Minutes on this retro   | 4                                                                                                                                                                      |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                      | Root cause class     | Change and layer                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `Intl` month formatting in zh gave 「一月」 and 「2025/12」 under bun's ICU, not the board's 「11 月」 (tag: intl-month)                                                                                           | library behaviour    | Month headers and month names are copy keys (`coins.month`, `coins.monthYear`, `coins.monthName.m1`–`m12`); no `Intl` for months  |
| 2   | The unit test's row time 04:00 UTC read as the previous day west of UTC−4 (review)                                                                                                                                 | own gap              | Fixture times at 12:00 UTC; the test passes with `TZ=America/Los_Angeles`                                                         |
| 3   | The 「is this the current year」 check used the device year while months are Malaysia months (review)                                                                                                              | own gap              | `malaysiaYear` with a New Year's Eve unit test                                                                                    |
| 4   | `readFailed` was patched apart from the value, so for one frame an old balance read as current (review)                                                                                                            | own gap              | The flag is written in the same patch as the value                                                                                |
| 5   | A next page asked for while the first page was being read was dropped, and the bottom stalled (review; `全部评价` shares the pattern, left as is)                                                                  | design slip upstream | The store remembers the wish and loads the page once the read lands; unit test                                                    |
| 7   | The first month keys used `{{month}}` in zh and `{{name}}` in en / ms; `resources.test.ts` (placeholders must match) failed in the full `bun test`, after the scoped coins run had passed (tag: i18n-placeholders) | own gap              | Every locale reads `{{name}}` from `coins.monthName`; run the full `bun test` after any copy change, not only the feature's tests |
| 6   | Running prettier on `docs/story-map.md` reformatted 70 unrelated rows (review)                                                                                                                                     | own gap              | Reverted; story-map edits are scripted without prettier                                                                           |

## Review findings

Round 1: 0 Critical, 0 Important, 10 Minor (rows 2–6 above; a hard-coded 「 · 」 join, now `coins.moreFailedRetry`; two
docstring claims without checks, now a month-header check and one claim dropped; the failed case could not tell loading
from failure, now with a 1 s fixture delay; the plan did not list the new fail points; C1 and C9 wording). All fixed;
no re-review, since nothing was Important or Critical.
