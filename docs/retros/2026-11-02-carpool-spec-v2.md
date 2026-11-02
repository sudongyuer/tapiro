---
branch: docs/carpool-spec-v2
date: 2026-11-02
pr: carpool spec v2
title: superseding carpool spec (ticket redesign) and the answers to 200–219
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: superseding carpool spec

## Core (mandatory)

| Dimension | Measure                 | This step                                                   |
| --------- | ----------------------- | ----------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                     |
| Quality   | Vacuous checks          | None                                                        |
| Quality   | Skipped verifications   | None; docs only (format, check-specs, check-story-map pass) |
| Speed     | Wall-clock              | About 40 min                                                |
| Autonomy  | Avoidable interventions | 0; one money gap (220) left for the owner                   |
| Loop      | Minutes on this retro   | 2                                                           |

## Problems and root causes

| #   | What happened                                                                                               | Root cause class | Change and layer                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| 1   | The boards draw cells and rows whose source is never drawn (预计到, the organiser's remainder when editing) | design drift     | Recorded as ★ defaults (226) and one owner question (220); board briefs name each field's input |
| 2   | RideCreate1's 6-person frame shows RM 16 on the ticket and RM 13 in the form for the same RM 76             | wrong fact       | Spec states the form value is the rule (221); the canvas frame is left for the board's author   |
| 3   | Answers for 176–206 lived in five PRs before the spec could be written                                      | process          | None; recording per screen kept each PR small and the spec could cite one research doc          |
