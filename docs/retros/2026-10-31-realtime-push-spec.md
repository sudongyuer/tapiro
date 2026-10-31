---
branch: docs/realtime-push-spec
date: 2026-10-31
pr: realtime push spec
title: live updates and push notifications spec (proposed)
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: live updates and push spec

## Core (mandatory)

| Dimension | Measure                 | This step                                                        |
| --------- | ----------------------- | ---------------------------------------------------------------- |
| Quality   | Escaped defects         | Pending review                                                   |
| Quality   | Vacuous checks          | None added; the spec is proposed                                 |
| Quality   | Skipped verifications   | None; no code                                                    |
| Speed     | Wall-clock              | About 30 min, mostly reading the Supabase Realtime and Expo docs |
| Autonomy  | Avoidable interventions | 0                                                                |
| Loop      | Minutes on this retro   | 3                                                                |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                          | Root cause class | Change and layer                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | I ran `git checkout -b` in the main checkout while another session (the post redo) had about 55 uncommitted files there; its next commit would have landed on my branch. Caught at once, I switched back to `main` and used a worktree | shared checkout  | Candidate rule: with parallel sessions, a session that is not the checkout's owner works in its own worktree and never switches branches in the main checkout (tag `shared-checkout`) |
