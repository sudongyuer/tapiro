---
branch: docs/carpool-meetup-answers
date: 2026-11-02
pr: carpool meetup answers
title: record the owner's answers to questions 193–199 (carpool 集合)
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: recording the carpool 集合 answers

## Core (mandatory)

| Dimension | Measure                 | This step       |
| --------- | ----------------------- | --------------- |
| Quality   | Escaped defects         | 0               |
| Quality   | Vacuous checks          | None            |
| Quality   | Skipped verifications   | None; docs only |
| Speed     | Wall-clock              | About 5 min     |
| Autonomy  | Avoidable interventions | 0               |
| Loop      | Minutes on this retro   | 1               |

## Problems and root causes

| #   | What happened                                                                    | Root cause class | Change and layer                                                                   |
| --- | -------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| 1   | 晚到, the 车牌 field and undoing 我到了 are not in the carpool spec's data model | design drift     | Recorded in the research doc; they go into the superseding carpool spec with 182 B |
| 2   | The ③ board title said 集合 starts 15 min before departure; the spec says 30     | wrong fact       | Title fixed on the canvas; board copy is checked against the spec's time nodes     |
