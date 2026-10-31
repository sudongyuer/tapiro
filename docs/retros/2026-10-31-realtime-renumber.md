---
branch: docs/realtime-renumber
date: 2026-10-31
pr: realtime renumber
title: renumber the realtime spec's canvas questions to 170–174
escaped: 1
rework: 1
interventions: 0
overturned: 0
---

# Retro: question numbers collided

## Core (mandatory)

| Dimension | Measure                 | This step                                                |
| --------- | ----------------------- | -------------------------------------------------------- |
| Quality   | Escaped defects         | 1: the spec merged in #36 reused numbers 151 and 157–160 |
| Quality   | Vacuous checks          | None                                                     |
| Quality   | Skipped verifications   | None; docs only                                          |
| Speed     | Wall-clock              | About 10 min                                             |
| Autonomy  | Avoidable interventions | 0                                                        |
| Loop      | Minutes on this retro   | 2                                                        |

## Problems and root causes

| #   | What happened                                                                                                                                                | Root cause class  | Change and layer                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Three sessions numbered canvas questions in parallel. I guessed the free numbers from one board's title, but 151 and 157–162 were already taken by tapiro-9c | missing knowledge | Before using a number, read the highest 「第 N 题」 in canvas.json and confirm with the other live sessions. Candidate: a check that lists duplicate question numbers across boards (tag `question-numbers`) |
