---
branch: feat/rides-count-settled
date: 2026-11-07
pr: closed rides count toward 靠谱度 (258 A)
title: A closed ride counts as settled with or without a payment
escaped: pending
rework: 1
interventions: 0
overturned: pending
---

# Retro: closed rides count as settled (258 A)

## Selection

| Checks           | Runs          | Reason                                                       |
| ---------------- | ------------- | ------------------------------------------------------------ |
| pgTAP, all files | local stack   | Server only: `close_ride`, the appeal trigger, the recompute |
| No new UI case   | —             | No screen changes; the profile reads the same fields         |
| smoke            | zh-Hans light | Asked for every PR                                           |

## Core (mandatory)

| Dimension | Measure                 | This step                                                      |
| --------- | ----------------------- | -------------------------------------------------------------- |
| Quality   | Escaped defects         | pending                                                        |
| Quality   | Vacuous checks          | 0                                                              |
| Quality   | Skipped verifications   | None                                                           |
| Speed     | Wall-clock              | About 1 h, half of it the first verify build of a new worktree |
| Autonomy  | Avoidable interventions | 0                                                              |
| Loop      | Minutes on this retro   | 3                                                              |

## Problems and root causes

| #   | What happened                                                                                                                     | Root cause class | Change and layer                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| 1   | The plan's gap line said lone rides earn stickers and reviews; the code gives them neither                                        | own gap          | Corrected the plan line; read `close_ride` rather than the summary          |
| 2   | Canvas has no board for 258 or 259: the question's text is the whole drawing                                                      | process          | Stated in the plan's 258 defaults                                           |
| 3   | `verify:smoke` failed with "App not found": a fresh worktree has no `.verify` build, and the smoke run does not build one         | own gap          | Run `verify:build` first in a new worktree                                  |
| 4   | A null counterpart would have read as a deleted account and given a lone organiser a person; the recompute's rule forced a marker | own gap          | Lone rows name the organiser and the recompute skips them; pgTAP asserts it |
