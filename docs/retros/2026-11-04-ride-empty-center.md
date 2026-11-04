---
branch: fix/ride-empty-center
date: 2026-11-04
pr: ride empty centre
title: the carpool empty moment sat about 107 pt below the visible centre
escaped: 1
rework: 0
interventions: 1
overturned: 0
---

# Retro: ride empty centre

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                      |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 1: the owner saw the off-centre empty screen on the two-phone dev setup; screenshots had shown it since step 1 |
| Quality   | Vacuous checks          | 0: the new centre assertion gives 107 pt on the old frames against a 16 pt limit                               |
| Quality   | Skipped verifications   | Dark and en not run: layout only, no colour or copy change                                                     |
| Speed     | Wall-clock              | About 40 min, most of it the worktree's first verify build                                                     |
| Autonomy  | Avoidable interventions | 1: the owner had to spot it; the case asserted copy and colour but not placement                               |
| Loop      | Minutes on this retro   | 3                                                                                                              |

## Problems and root causes

| #   | What happened                                                                                                                                                                         | Root cause class | Change and layer                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `flexGrow: 1` + `justifyContent: 'center'` in a ScrollView with `contentInsetAdjustmentBehavior="automatic"` centres in the full frame, then UIKit shifts it by the large title inset | layout footgun   | Code: a nested `SafeAreaProvider` reads the screen's own insets (title bar and tab bar) and sizes the container to the visible area; no other screen uses the pattern (searched) |
| 2   | `ride_list_empty` passed with the moment 107 pt low: it checked copy, the ＋ and the ground colour, never placement                                                                   | missing check    | Check: the case asserts the group sits within 16 pt of the centre between the title bar and the tab bar                                                                          |
