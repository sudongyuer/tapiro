---
branch: chore/force-push-guard-pg17
date: 2026-11-21
pr: a PreToolUse hook blocks force pushes; local and CI stacks run PostgreSQL 17 like the hosted project
title: Force pushes without asking; local Postgres one major behind hosted
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: force-push guard and PostgreSQL 17

## Core (mandatory)

| Dimension | Measure               | This step                                                                                            |
| --------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                                    |
| Quality   | Skipped verifications | None; pgTAP (69 files, 2276 tests), `test:deno` and `test:stack` (70) ran on an isolated PG 17 stack |
| Speed     | Wasted time           | ~5 min: the worktree guard refused shell lines that named `git` inside test text                     |
| Autonomy  | Interventions         | 0                                                                                                    |

## Findings

- Cause of the force pushes: AGENTS.md said to ask before a force-push, but only as a written rule next to the
  permission to push one's own branches; subagents force-pushed their own branches twice in two days without asking.
  Tag `written-rule-ignored`.
- Guarantee at the lowest layer: `.claude/settings.json` runs `scripts/block-force-push.ts` before every Bash call. It
  splits the command line like a shell (quotes, escapes, `&&`/`;`/`|`, subshells, `$(...)`, heredoc bodies), strips
  env assignments and wrappers (`env`, `command`, `xargs`, ...), follows `bash -c` and `eval`, then reads git's global
  options and `push`'s own: `--force`, `--force-with-lease`, `--force-if-includes`, `--mirror` and their unique
  prefixes, `-f` in any short cluster, `+refspec`, and `-c remote.*.push=+...`. Deletes stay allowed. The AGENTS.md
  rule now points at the hook instead of repeating it in three places.
- Rework: review found that an unquoted heredoc body (a commit message through `git commit -F - <<EOF`) was scanned
  as commands, and that `env -u X` and `xargs` hid the git call. Fixed with tests for each.
- PostgreSQL 17: no migration or test needed a change. Local image 17.11, hosted 17.12; CI's `supabase start` reads
  `config.toml`, so it follows. A shared local stack created on 15 has to be recreated (noted in `docs/status.md`).
