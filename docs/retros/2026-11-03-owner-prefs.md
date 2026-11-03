---
branch: docs/owner-prefs
date: 2026-11-03
pr: owner preferences in AGENTS
title: copy the owner's working preferences from agent memory into AGENTS.md
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: owner preferences in AGENTS

## Core (mandatory)

| Dimension | Measure                 | This step                        |
| --------- | ----------------------- | -------------------------------- |
| Quality   | Escaped defects         | 0 known                          |
| Quality   | Vacuous checks          | 0                                |
| Quality   | Skipped verifications   | Code checks and smoke: docs only |
| Speed     | Wall-clock              | About 10 min                     |
| Autonomy  | Avoidable interventions | 0                                |
| Loop      | Minutes on this retro   | 2                                |

## Problems and root causes

| #   | What happened                                                                                                    | Root cause class | Change and layer                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | The owner's working preferences (language, ★ defaults, merge authority) lived only in one machine's agent memory | knowledge place  | `AGENTS.md` "Working with the owner"; a preference that holds for the project goes there, not only into memory |

## Notes

- Moving machines also surfaced an uncommitted spike change; it was committed to `spike/photo-sticker` and pushed.
