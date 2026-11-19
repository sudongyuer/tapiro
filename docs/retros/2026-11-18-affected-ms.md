---
branch: fix/verify-affected-ms
date: 2026-11-18
pr: --affected adds ms (en without ms) to the cases of a changed screen component
title: Layout changes now select their cases in the longest copy
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: layout changes select ms

Follow-up to the 2026-11-18 full run: two #152 polish faults (我的 → 小貘 rows jumping, the 问小貘 sheet hiding its
composer) showed only in en and ms, because the polish PRs ran their cases in zh-Hans only.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                     |
| --------- | ----------------------- | ----------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                             |
| Quality   | Vacuous checks          | 0; the three new selector tests fail without `layout_cases` and the new flag |
| Quality   | Skipped verifications   | none                                                                          |
| Speed     | Wall-clock              | About 30 min                                                                  |
| Autonomy  | Avoidable interventions | 0                                                                             |
| Loop      | Minutes on this retro   | 5                                                                             |

## What happened

| #   | What happened                                                                                     | Root cause class | Change and layer                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Polish PRs chose their cases by hand in zh-Hans; the Pace line only said "add ms when copy is long" | missed check     | Runner: `--affected` adds `ms` (`en` for a case without `ms`) to a case whose own `DEPS` meet a changed `src/**.tsx`; `test_affected`. AGENTS Pace line points at it |

## Decisions (★, for veto)

- A shared `.tsx` (`src/ui/`) does not add a locale: shared code already picks every case, and adding `ms` there would
  double the whole matrix for any design-system edit.
- A case that declares no `ms` gets `en` instead of an undeclared `ms`: its `ms` run has never been made to pass, and
  `en` is the second language.
