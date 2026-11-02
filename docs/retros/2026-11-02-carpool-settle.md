---
branch: feat/carpool-settle
date: 2026-11-02
pr: pending
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
