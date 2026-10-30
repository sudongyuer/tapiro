---
branch: fix/bounty-small-leftovers
date: 2026-10-30
pr: bounty small fixes
title: bounty leftovers (spinner, pin labels, midnight clock)
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: three bounty leftovers

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                     |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | Pending review                                                                                |
| Quality   | Vacuous checks          | 0: each new assertion fails on the old build (stray `已申请` / `代取` texts, chips held down) |
| Quality   | Skipped verifications   | The midnight path is checked by regex only; a run at 23:50 would prove it                     |
| Speed     | Wall-clock              | About 40 min including one build and 7 cases                                                  |
| Autonomy  | Avoidable interventions | 0                                                                                             |
| Loop      | Minutes on this retro   | 3                                                                                             |

## Problems and root causes

| #   | What happened                                                                                                                                          | Root cause class  | Change and layer                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | The Debug map scene kept its refresh spinner after an instant failure: `busy` went true and false in one batched render, so `refreshing` never changed | library footgun   | `useTracked` ends `busy` on the next frame (structure); the scene step in `bounty_board_map_states`   |
| 2   | Every pin exposed its category label and its hidden 已申请 stamp as separate texts, so VoiceOver could read 已申请 on a pin nobody applied to          | missing knowledge | The pin's labels are not accessibility elements (structure); `bounty_board_map` asserts no stray text |
| 3   | Status cases matched a bare clock; near midnight the app writes 「明天 00:15」                                                                         | test bug          | Both cases accept the app's day word                                                                  |
