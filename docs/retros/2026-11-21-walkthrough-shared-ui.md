---
branch: fix/walkthrough-shared-ui
date: 2026-11-21
pr: the walkthrough's shared-ui findings (disabled pills, card buttons, row fill, capsules, 问小貘 sheet edge, belly pips)
title: Disabled pills unreadable; sheet content under its header
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: walkthrough shared-ui fixes

## Core (mandatory)

| Dimension | Measure               | This step                                                                                          |
| --------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                                  |
| Quality   | Skipped verifications | `en` not run (no copy change); the row fill has no pixel assertion (shown only during transitions) |
| Speed     | Wasted time           | ~2 h queued on the Simulator lock behind four batches of the parallel session                      |
| Autonomy  | Interventions         | 0                                                                                                  |

## Findings

- H4 had one cause in two places: the RN pill dimmed the whole control to 0.4, and the pantry's SwiftUI button forced a
  white label. Both now use `tertiaryLabel` on the secondary fill; pixel contrast checks in `bounty_post_no_balance`
  and `ask_energy_pantry` fail on the old style.
- S2: an extra wrapping `View` around the header and scroll view broke react-native-screens' form-sheet sizing and
  pushed content over the header (rework 1, caught by the new top-edge assertion in `ask_sheet_answer`). Tag
  `form-sheet-children`: a form sheet keeps the header and the scroll view as its two direct children.
- K2: `tertiaryLabel` outlines passed in light and faded on dark glass (rework 2, caught by the pixel check). Tag
  `dark-glass-contrast`.
- The Simulator queue was the longest wait of the day: four parallel batches held the lock. Scheduling, not a defect.
