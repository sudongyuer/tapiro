---
branch: docs/night-2026-11-03
date: 2026-11-04
pr: new machine and overnight run
title: resuming on a new machine, and the overnight orchestration
escaped: 0
rework: 1
interventions: 1
overturned: 0
---

# Retro: new machine and the overnight run

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                            |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                              |
| Quality   | Vacuous checks          | 0 merged; review caught three UI cases that could not fail (#66 I3, I4, N2) before merge             |
| Quality   | Skipped verifications   | `verify:full` (owner: not worth it); dark, en for most changes; `live_applicants` known intermittent |
| Speed     | Wall-clock              | About 10 h, PRs #60–#67 merged, #65 open for the owner                                               |
| Autonomy  | Avoidable interventions | 1: the owner had to stop a full-matrix run I proposed                                                |
| Loop      | Minutes on this retro   | 10                                                                                                   |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                             | Root cause class | Change and layer                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | I proposed an overnight `verify:full` on the new iOS 27.2 Simulator "to find every iOS 27 change" without weighing cost; only the tab bar was known to differ and the ride cases were accepted. Owner: 「感觉很浪费时间」 | check selection  | Rule exists (AGENTS.md Pace: choose from what changed); the SDK 58 run later used a reviewer-picked list of 20 cases instead |
| 2   | Supabase CLI 3.0 rejected `[inbucket]`; the storage image blocked direct deletes in pgTAP; the runner picked a device-specific runtime; new Simulators typed Pinyin                                                       | environment      | #60, #61, #67; `docs/status.md` names CLI 2.x                                                                                |
| 3   | A wait loop `until ! pgrep -f verification/ui/run.py` matched its own shell and two agents deadlocked                                                                                                                     | tooling          | Call `run.py` directly; it already serialises on `/tmp/ios-ui-verify.lock`                                                   |
| 4   | Raw `axe tap -x -y` did not fire `onPress`; first blamed on SDK 58, an A/B on the SDK 57 build showed it is this machine's AXe 1.8.0 / iOS 27                                                                             | misattribution   | Driver adds `--post-delay` (in #65); A/B against the previous build before attributing a failure to an upgrade               |
| 5   | `gh pr create` from a worktree outside the project was blocked by the retro hook, which reads the session's cwd branch                                                                                                    | tooling          | Keep worktrees under `.claude/worktrees/` so the shell can `cd` into them                                                    |
| 6   | Two agents reset the shared local Supabase stack at the same time                                                                                                                                                         | coordination     | A second agent runs its own stack (separate `project_id`, shifted ports)                                                     |
