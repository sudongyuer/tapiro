---
branch: chore/merge-guard
date: 2026-11-17
pr: merge only through scripts/merge-when-green.sh
title: two PRs merged before CI finished; merging now goes through a script that refuses unless the rollup is green
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: merge guard (2026-11-17)

Twice this week a PR was squash-merged before CI finished: once through `gh pr checks <n> --watch; gh pr merge`
(`;` ignores the watch's exit status), once because the watch returned before any check had registered.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                         |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                 |
| Quality   | Vacuous checks          | 0: two mutations of the script (skip the wait, skip the rollup check) each fail the refusal tests |
| Quality   | Skipped verifications   | No UI case (no app code changed); `verify:smoke` not run for the same reason                      |
| Speed     | Wall-clock              | About 30 min                                                                                      |
| Autonomy  | Avoidable interventions | 0                                                                                                 |
| Loop      | Minutes on this retro   | 5                                                                                                 |

## What happened

| #   | What happened                                                                    | Root cause class | Change and layer                                                                                                                                          |
| --- | -------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `gh pr checks --watch; gh pr merge` merged while CI ran                          | tooling          | `scripts/merge-when-green.sh` merges only after the watch exits 0 and the rollup is green; AGENTS.md routes every merge through it. Tag `merge-before-ci` |
| 2   | `gh pr checks --watch` returned before any check registered                      | tooling          | The script waits (default 300 s) for at least one check and refuses when none appear. Tag `merge-before-ci`                                               |
| 3   | A push between the last check and the merge could merge an unchecked commit      | tooling          | The script merges with `--match-head-commit` of the commit whose rollup it verified                                                                       |
| 4   | `main` has no branch protection or ruleset, so GitHub itself does not require CI | settings         | Owner's call: requiring the `check` and `supabase` checks on `main` would hold even for a direct `gh pr merge`. Not changed here                          |

## Next

- Owner: decide whether to require the `check` and `supabase` status checks on `main` (branch protection or a ruleset).
- If an agent still calls `gh pr merge` directly, add a PreToolUse hook that blocks it in the Bash tool.
