---
branch: feat/ride-receipt-read
date: 2026-11-25
pr: ride.split.receipt — 小貘 reads the Grab receipt total into the split
title: Ride receipt reading
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: Ride receipt reading

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                         |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                                                 |
| Quality   | Skipped verifications | Real Model Studio path (`AccessDenied.Unpurchased`); `test:stack` left to CI (the shared local stack serves main) |
| Speed     | Wasted time           | ~13 min: a `--locales` run that also ran dark and en for a case that failed on one assertion                      |
| Autonomy  | Interventions         | 0                                                                                                                 |

## Findings

- [check-before-build] The criterion really was unbuilt: no `draft_split`, no receipt task, only plan notes ("147 A …
  when `draft_split` comes"). Grepping the Edge Function's tool list and the story map first took minutes.
- [sheet-detent-offscreen] The new case asserted 小雅's row after the fill, but in the medium detent with the new read
  footer the third row sits below the sheet and leaves the accessibility tree. The organiser's remainder proves the
  split; the sent split checks 小雅. Rows under a medium detent are not assertable after the sheet grows.
- [runner-flags] `--locales` on a named case runs light and dark and adds en; for a first run of a new case,
  `--locale ms` alone is the cheap check. The README says so; read it before the first run.
- `src/lib/sessionLifetimes.test.ts` caught the new module-level `readReceipt` without a declared lifetime: a good
  guard that fired as designed.
- [sheet-detent-offscreen] The existing `ride_settle_split` edited 阿明's row after attaching the receipt; the new read
  row and footer moved that row below the medium detent and the taps missed. Dragging the sheet to large and typing
  there lost focus once, so the case now attaches the receipt after the edits (decision RR13 records the layout).
- Presenting the consent route over a SwiftUI `BottomSheet`: closing the sheet and pushing in `onDismiss` worked on
  the first run; worth reusing for any route opened from a ride sheet.
