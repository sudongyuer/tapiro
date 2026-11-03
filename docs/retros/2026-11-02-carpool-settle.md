---
branch: feat/carpool-settle
date: 2026-11-02
pr: https://github.com/sudongyuer/tapiro/pull/53
title: carpool step 6 (到了 and 结清)
escaped: pending
rework: 0
interventions: 0
overturned: pending
---

# Retro: carpool step 6 (到了, the split, 结清, stickers and history)

## Running log

| #   | Tag                | What happened                                                                                                                                                         | Cost   | Change and layer                                                                                       |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| 1   | tooling            | `node_modules` missing in the fresh worktree again (step 5 retro #same); `bun install --frozen-lockfile` first                                                        | ~1 min | none; the step 5 retro already records it                                                              |
| 2   | worktree-guard     | A heredoc into `bun test` was refused by the worktree guard as too complex; wrote files with the Write tool instead                                                   | ~1 min | none; known since step 4                                                                               |
| 3   | sql-precedence     | `jsonb -> 'settle' - 'riders'` parsed as `'settle' - 'riders'` (`operator is not unique: unknown - unknown`); the first pgTAP run aborted at the new file              | ~3 min | Parenthesised; no rule (one-off)                                                                       |
| 4   | test-expectation   | Three expectations in the new pgTAP file were wrong before the first run (error code of a non-party confirm, a sticker count, a settled-card count); fixed by reading | ~3 min | none                                                                                                   |
| 5   | ui-case-placeholder | `bounty.erase` treats only bounty placeholders as empty, so clearing a 「0.00」 field never read empty; the case got a placeholder-aware clear | ~3 min | Case-local helper; promote to `ride.py` if a second ride case clears a money field |
| 6   | ui-remount-focus  | A share field keyed by its shown value remounted when its row became edited and dropped focus mid-typing; caught by the split case | ~10 min | Keys pinned in state at the first edit (`SplitSheet.tsx`); a ref version failed `react-hooks/refs` lint first |
| 7   | negative-remainder | The organiser row showed 「-RM 10.70」 while the others exceeded the total; the screenshot showed it, no assertion did | ~3 min | `splitView` returns no organiser share below zero; unit test and the case now assert 「–」 |
| 8   | off-screen-assert | An assertion on the sheet footer failed once the keyboard covered it | ~3 min | Dropped; the edited footer is unit-tested |
| 9   | billing-stop      | The run stopped on an API billing error and resumed | n/a | outside cause |

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                     |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review                                       | pending (no review yet)                                                                       |
| Quality   | Checks that could not fail (vacuous)                          | 1 noted: 「a share marked paid no longer changes」 passes before the fix (single session)     |
| Quality   | Skipped verifications / open device checks / new known limits | 6 new ride cases written, not run (Pace); `test:stack` not run                                |
| Speed     | Rework rounds                                                 | 0                                                                                             |
| Autonomy  | Avoidable interventions                                       | 0                                                                                             |
| Loop      | Minutes spent on this retro                                   | ~5                                                                                            |
