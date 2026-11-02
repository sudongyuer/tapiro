---
branch: docs/status
date: 2026-11-02
pr: status page
title: status page for resuming on another machine
escaped: 0
rework: 0
interventions: 1
overturned: 0
---

# Retro: status page

## Core (mandatory)

| Dimension | Measure                 | This step                                                                     |
| --------- | ----------------------- | ----------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                             |
| Quality   | Vacuous checks          | None                                                                          |
| Quality   | Skipped verifications   | `format:check` (fresh worktree has no node_modules; docs are not in its glob) |
| Speed     | Wall-clock              | About 15 min                                                                  |
| Autonomy  | Avoidable interventions | 1: the user had to ask whether progress was recorded                          |
| Loop      | Minutes on this retro   | 2                                                                             |

## Problems and root causes

| #   | What happened                                                                                                                        | Root cause class | Change and layer                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Decisions and records were in the repo, but nothing said what was built, in progress and next; KICKOFF's 下一步 was weeks stale      | missing doc      | `docs/status.md`, plus an AGENTS.md rule that a PR changing the state updates it                                                                          |
| 2   | `require-retro.sh` read the branch of the session's cwd (`main`), not the worktree the `gh pr create` ran in, and blocked a valid PR | hook scope       | Retro written for `docs/status`; the hook should resolve a leading `cd <dir> &&` in the command. Noted for the next hooks pass (tag: retro-hook-worktree) |
