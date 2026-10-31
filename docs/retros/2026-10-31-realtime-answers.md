---
branch: docs/realtime-answers
date: 2026-10-31
pr: realtime answers
title: record the user's answers to questions 170–174
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: recording the realtime answers

## Core (mandatory)

| Dimension | Measure                 | This step       |
| --------- | ----------------------- | --------------- |
| Quality   | Escaped defects         | 0               |
| Quality   | Vacuous checks          | None            |
| Quality   | Skipped verifications   | None; docs only |
| Speed     | Wall-clock              | About 10 min    |
| Autonomy  | Avoidable interventions | 0               |
| Loop      | Minutes on this retro   | 2               |

## Problems and root causes

| #   | What happened                                                                                                                                                                                        | Root cause class | Change and layer                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The user's answer arrived in another session's thread as 「同意」 to that session's proposal, not to my numbered options. Both sessions had to map the answer onto 170–174, and 172 stayed ambiguous | split ownership  | One session asks a given question; a proposal in another thread is forwarded to the spec owner before the user sees it (tag `question-numbers`) |
