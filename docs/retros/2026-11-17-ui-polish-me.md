---
branch: fix/ui-polish-me
date: 2026-11-17
pr: UI polish of 我的, 貘币, 邀请 and 主页 from the 2026-11-16 audit (ME-1–3, 5–9, 11, 14)
title: ten findings fixed in two stages; three new assertions needed one calibration round against real frames
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: UI polish of 我的, 貘币, 邀请 and 主页 (2026-11-17)

Stage 1 wrote the fixes and the case assertions without a Simulator; stage 2 ran them once under the shared
Simulator lock, then reran the three cases whose assertions were wrong.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                       |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                               |
| Quality   | Vacuous checks          | 0 found; each new assertion is a number the audit's before-frames miss (23 pt row, 9 pt column, 13.5 pt glyph, 1.7 pt label)    |
| Quality   | Skipped verifications   | en not run (no new copy keys); dark only for the two urgent cards; the negative cost rows on the confirm pages have a unit test |
| Speed     | Wall-clock              | Stage 2: build 313 s, first locked run 12 min, one rerun of three cases                                                         |
| Autonomy  | Avoidable interventions | 0                                                                                                                               |
| Loop      | Minutes on this retro   | 5                                                                                                                               |

## What happened

| #   | Finding                                                                                                                                           | Cause                   | Action                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | `profile_new` compared the heights of the three number columns; the 完成率 column reads 38.7 pt against 44 pt although the labels sit on one line | assertion written blind | The AX frame of a column leaves out a `hidden()` child that sizes it; the case compares bottoms     |
| 2   | `coins_buy` (ms, first attempt) saw the 35 pack 83.5 pt lower: the 「已付款，正在确认」 section had come in above the packs between the two reads | assertion written blind | The case measures the span from the 5 row to the 35 row, which the section above does not change    |
| 3   | `coins_page` allowed 1 pt between the right ink edges of the amounts; 「+1」 ends 2.7 pt before 「+5」 in the same box                            | assertion written blind | 3.5 pt, against the 9 pt the column used to shift                                                   |
| 4   | The audit asked for a 买貘币 pill as wide as the cards (ME-10); board 273 A ① draws it narrower                                                   | finding against a board | Skipped and raised as a question; the brief's rule to read the drawing before the summary caught it |
| 5   | The same ASCII hyphen for a negative balance sat in the bounty and ride confirm pages, which cannot import the coins feature                      | same pattern, two more  | `coinCount` moved to `src/lib/coinCount.ts`; both cost rows use it                                  |

## Carry forward

- An assertion on a frame written without the Simulator is a guess: three of nine needed a second run. When a stage
  cannot run cases, mark each new threshold as unmeasured in the case so the first run is read as calibration.
- A SwiftUI container's accessibility frame is the union of its visible children; a `hidden()` child still sizes the
  layout. Compare edges that the visible content shares, not the container's height.
- ME-12 (a faint full-width line between the first two review rows) stays open: it looks like a seam between row
  backgrounds, not a separator, and needs the view debugger on a device.
