---
branch: fix/ms-type-row
date: 2026-11-13
pr: The type row keeps its value on one line beside 按标题自动
title: One modifier fixed the wrap; the case around it kept failing on keyboard steps under machine load
escaped: 1
rework: 0
interventions: 0
overturned: 0
---

# Retro: ms type row

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                      |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 1: 「Ambil」 wrapped mid-word in ms (seen in #118's screenshots, shipped)                      |
| Quality   | Vacuous checks          | 0; the new assertion failed on the unfixed app in both cases (40 pt value beside a 20 pt line) |
| Quality   | Skipped verifications   | `bounty_post_form` did not pass end to end in any run, before or after the fix (below, #2)     |
| Speed     | Wall-clock              | About 2 h, mostly Simulator runs; builds took 30 s to 3 min                                    |
| Autonomy  | Avoidable interventions | 0                                                                                              |
| Loop      | Minutes on this retro   | 5                                                                                              |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                                      | Root cause class | Change and layer                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The menu `Picker` was the only flexible view in the row's `HStack`, so it took a narrowed width and wrapped its label; #118's ms screenshot showed it, but no case measured it                                                                                                     | missed case      | `fixedSize({ horizontal: true })` on the picker (code); `assert_category_one_line` in `bounty.py` compares the value's height with the row label's (check). Tag `menu-picker-width` |
| 2   | `bounty_post_form` failed at a different keyboard step each run (erase of the reward, `axe type` timing out, `501` not read, 240 s budget), on `main` and on the fix, zh-Hans and ms; load averages were 30–57 during those runs. My assertion passed in every run that reached it | environment      | None in this PR; logged. The case's keyboard steps are the slowest and most load-sensitive part; worth a look at the next bounty milestone. Tag `axe-stall`                         |

## Follow-ups

- `bounty_post_form` end to end on an idle machine (overnight `verify:full`) to separate load from a case defect.
