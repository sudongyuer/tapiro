---
branch: fix/ui-polish-me-owner
date: 2026-11-17
pr: UI polish, the former owner rows of 我的, 貘币, reviews and account (ACC-5, ACC-13, ME-4, ME-10, ME-12, ME-13, G2-9, REV-3, REV-10, REV-12)
title: ten owner rows decided under the delegation; eight built, one recorded with a measurement, one left unconverged
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: UI polish, former owner rows (2026-11-17)

The audit had parked ten rows for the owner. Under the delegation each was decided from its board, HIG and the data
integrity rules, recorded as ★ in `docs/plans/2026-11-06-reviews-profile-coins.md`, built with its case, and run once
under the shared Simulator lock.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                              |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 0                                                                                                                                                      |
| Quality   | Vacuous checks          | 0 known; each new assertion fails on the audit's before-frames (36 pt pill edge, no halo pixels, empty envelope box, 回复 below the row, warning card) |
| Quality   | Skipped verifications   | See the PR's Checks section                                                                                                                            |
| Speed     | Wall-clock              | Code and fast checks about 2 h; the Simulator lock was held by the overnight verify:full for most of the evening                                       |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                      |
| Loop      | Minutes on this retro   | 5                                                                                                                                                      |

## What happened

| #   | Finding                                                                                                                                         | Cause                         | Action                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | ME-10's brief said to match the cards, while 273 A ① draws the pill inset further than the list; the earlier 我的 retro had skipped it for that | finding against a board       | Built as instructed and recorded as a deviation from the drawing in C13, listed for veto                       |
| 2   | REV-12 asked to converge two stale notices, but each page uses its own host's primitive for every notice it shows                               | consistency inside vs across  | Not converged (E12); app-wide convergence of `NoticeCard` and `InlineState` listed as a design-system question |
| 3   | ME-12's seam measured from the audit's AX frames: the first review row ends 1/3 pt before the second starts, one pixel at 3x                    | SwiftUI list layout, unpinned | Recorded as C15 with the numbers, so the device session starts from them                                       |
| 4   | The moment-title outline already existed as `InkText` (celebration title), so ACC-13 was a build, not a doc change                              | reuse found before deciding   | Three titles use `InkText`; the design-language row now says 「in light」                                      |

## Carry forward

- When a brief's per-row hint contradicts the answered board, build what the session asked and write the deviation into
  the ★ row in the same words the board uses, so the veto list shows both.
- A full-width gap between grouped rows can be found from AX frames alone: compare each row's bottom with the next
  row's top.
