---
branch: docs/rep-questions
date: 2026-11-06
pr: steps 5–6 questions
title: questions 238–255 for reviews, profile, mascot level, coins in 我的, weekly feed and invites
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: steps 5–6 questions

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                  |
| Quality   | Vacuous checks          | n/a (docs and canvas only)                                                               |
| Quality   | Skipped verifications   | The canvas boards were not rendered or screenshotted (the canvas type forbids verifying) |
| Speed     | Wall-clock              | About 1.5 h: reading the decided boards, research, three boards, docs                    |
| Autonomy  | Avoidable interventions | 0                                                                                        |
| Loop      | Minutes on this retro   | 3                                                                                        |

## Problems and root causes

| #   | What happened                                                                                                                                      | Root cause class | Change and layer                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The brief said 问小貘 used 129–149 and chat 117–128; the true maximum was 237 (carpool 236–237 are ★ defaults in the spec, not on any board title) | missing context  | Took the maximum from the spec decision tables (`grep` of `\| NNN` rows), not from board titles. No new rule: one occurrence            |
| 2   | Several first-draft reference lines on the boards (BlaBlaCar riders, Airtasker profile order, Grab/Shopee invite pages) were memory, not sources   | process          | Each was checked by search before publishing; unverifiable ones were reworded or marked unchecked on the board and in the research note |
