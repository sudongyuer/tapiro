---
branch: chore/case-import-check
date: 2026-11-17
pr: UI case import check
title: a removed helper now fails CI instead of the Simulator run
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: UI case import check (2026-11-17)

PR #152 removed three helpers under `verification/ui`, and seven cases failed with `ImportError` only when they ran on
the Simulator. `test_imports.py` now reads every case and helper with `ast` and fails when one imports a module, a name
(`from ask import turn`) or a `module.attr` (`import driver` then `driver.x`) that no longer exists locally. Stdlib and
third-party modules are only checked to resolve.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                   |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0; current main has no broken local import                                                                  |
| Quality   | Vacuous checks          | 0; renaming `ask.assert_calls` and moving `celebration.py` away failed the check with 18 lines, then passed |
| Quality   | Skipped verifications   | No Simulator run: the change touches no case or helper                                                      |
| Speed     | Wall-clock              | About 30 min                                                                                                |
| Autonomy  | Avoidable interventions | 0                                                                                                           |
| Loop      | Minutes on this retro   | 3                                                                                                           |

## What happened

| #   | What happened                                                                                                   | Root cause class | Change and layer                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| 1   | A helper removed in one PR broke seven cases, found only on the Simulator                                       | missing check    | `test_imports.py` (CI, every PR)                                                                    |
| 2   | CI listed the runner's test modules by name, and the README's copy of that list had already lost `test_records` | drift            | CI and README run `python3 -m unittest discover -p 'test_*.py'`; a new test file runs without edits |
| 3   | `bun run format:check` exited 127 in the fresh worktree before `bun install`                                    | environment      | None; install first in a new worktree                                                               |

## Carry forward

- A check that only fires on the Simulator is a candidate for a static check in the runner's unit tests.
