---
branch: feat/carpool-list-create
date: 2026-11-02
pr: https://github.com/sudongyuer/tapiro/pull/50
title: carpool step 4 (list and create)
escaped: pending
rework: 0
interventions: 0
overturned: pending
---

# Retro: carpool step 4 (拼车 list, 去哪儿？, form, confirm)

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                                                   |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review                                       | pending (no review yet)                                                                                                     |
| Quality   | Checks that could not fail (vacuous)                          | 0 known; each ride case waits on copy or ids that only the new screens produce                                              |
| Quality   | Skipped verifications / open device checks / new known limits | 10 of 11 ride cases written but not run (Pace: they run after step 7); device: none new                                     |
| Quality   | Acceptance criteria with no covering test and no device mark  | ride.create.places (map pin), ride.board.history (24 h stamp, step 6), ride.create.split-mode (detail change, step 5): gaps |
| Speed     | Wall-clock from first commit to PR                            | see PR; most time went into reading the boards and the bounty post pattern                                                  |
| Speed     | Wasted time by class                                          | ~20 min: ~10 min tooling (worktree sandbox refused compound shell commands; no `node_modules` in the worktree)              |
| Speed     | Rework rounds                                                 | 0                                                                                                                           |
| Autonomy  | Avoidable interventions                                       | 0                                                                                                                           |
| Autonomy  | Rulings made / overturned                                     | 15 (spec Implementation Record, step 4 deviations) / pending                                                                |
| Loop      | Minutes spent on this retro                                   | ~5                                                                                                                          |

## Problems and root causes

| #   | What happened                                                                                                                                                                                    | Cost    | Root cause class | Change and layer                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `worktree-sandbox`: the isolated-worktree guard refused pipes, `$VAR` paths and `timeout`; rendering the boards with headless Chrome and running checks needed small scripts in the scratchpad   | ~10 min | missing tooling  | Candidate: a checked-in `scripts/run-check.sh <name> <cmd>` that writes the log and prints the exit status. First occurrence → note |
| 2   | `lint-react-compiler`: the first lint failed on `Date.now()` in render, a ref passed into a `useState` initializer and a synchronous `setState` in an effect (React Compiler rules)              | ~5 min  | implementation   | none; the rules caught it. A shared `useNow` hook now gives screens a ticking clock                                                 |
| 3   | `money-mirror`: `POST_LIMITS` gained the ride rows and the mirror test read only the money migration                                                                                             | ~2 min  | test scope       | The test now reads every `post_limits` insert it mirrors                                                                            |
| 4   | `ax-tree-view`: screen ids were first put on plain `View`s, which do not reach the accessibility tree unless `accessible`; moved to the SwiftUI `Host` and the `ScrollView`s before any case ran | ~3 min  | known rule       | AGENTS already says it (verification README step 3); caught by reading the README before writing cases                              |

| 5 | `sandbox-git-subprocess`: after the verify build, the 4 `scripts/check-file-size.test.ts` cases started failing with empty output whenever `bun test` ran with the worktree as its working directory; a copy of the same test run from the scratchpad passes, the first full run of this session passed, and `scripts/` is unchanged. Evidence points at the agent's worktree isolation intercepting the `git init` / `git ls-files` subprocesses the test spawns in a temp dir | ~15 min | environment | Recorded; rerun on CI. If it recurs outside agent worktrees, make the test set `GIT_CEILING_DIRECTORIES` and pass `--git-dir` |

## Candidates (first occurrence, not yet generalised)

- A check-runner script for sandboxed worktrees (item 1).

## Rules and skills

- Helped: the bounty post redo as a pattern (pick → form → confirm, SheetFrame, pinned actions, draft store); AGENTS Data
  integrity (draft kept, no automatic replay, failed loads never empty).
- Unused: `animate-expo` (step 4 adds no motion).
- Violated: none.

## Kept (worked well)

- Rendering the canvas boards to PNG and cropping each question row before writing a screen.
