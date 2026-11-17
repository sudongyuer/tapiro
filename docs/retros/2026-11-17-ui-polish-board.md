---
branch: fix/ui-polish-board
date: 2026-11-17
pr: UI polish audit, bounty board, map and detail (BB-1–4, 6–11)
title: ten audit findings fixed; the map switch case lost its start state to the stage folding on the first scroll
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: UI polish, bounty board, map and detail (2026-11-17)

Fix the audit's board, map and detail findings that need no owner answer. Finished by a second agent after the first
ran out of quota with the code committed and three case edits uncommitted.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                       |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                               |
| Quality   | Vacuous checks          | 0; the new map chip, hint and symbol assertions read frames and OCR that the audit's shots fail |
| Quality   | Skipped verifications   | en for `bounty_board_map_states` only (one new copy key); BB-12 not built; device not run       |
| Speed     | Wall-clock              | Finishing about 2 h 30 min, most of it waiting for the shared Simulator lock; 3 min of runs     |
| Autonomy  | Avoidable interventions | 0                                                                                               |
| Loop      | Minutes on this retro   | 5                                                                                               |

## What happened

| #   | What happened                                                                                                                                                                       | Root cause class | Change and layer                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `bounty_board_view_switch` failed four times: its 120 pt drag to show the axis also folds the stage into the strip, so the title was already under the strip before 地图 was tapped | check design     | The case drags back until the title clears the strip, then tests the scroll home; passed first time. Tag `stage-fold-on-scroll` |
| 2   | ms `bounty_board_map_worst` read the applied tail by splitting on 「·」, which the ms copy places differently                                                                       | check design     | The tail is the copy's last word in every locale                                                                                |
| 3   | The no-origin hint was asserted before the board settled, against the place row's moving frame                                                                                      | check design     | Read both frames in one tree after the view is at rest                                                                          |
| 4   | About 2 h waiting for the Simulator lock held by other finishing agents                                                                                                             | outside          | None                                                                                                                            |

## Next

- BB-5 (dark 列表/地图 stickers) waits on the owner; BB-12 needs a Swift text view for the clock inside the wrapping line.
