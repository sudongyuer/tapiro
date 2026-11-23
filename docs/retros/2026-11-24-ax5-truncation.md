---
branch: fix/ax5-truncation
date: 2026-11-24
pr: AX5 truncation on the post form's live card and type row, the ride ticket and the language step
title: AX5 truncation fixes
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: AX5 truncation fixes

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                      |
| --------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                                              |
| Quality   | Skipped verifications | Dark (no colour or surface change); en only for the language step (O2 regression), no new copy keys; no device |
| Speed     | Wasted time           | ~40 min: two extra build-and-run rounds for the type row (see below), under load 850–930                       |
| Autonomy  | Interventions         | 0                                                                                                              |

## Findings

- The three findings came from the milestone follow-up's AX5 audit (foundation spec, 「After the upload」), whose
  screenshots were still in another agent's worktree (`.verify/ui-ax5/`); reading them first named the exact faults:
  the live card's two-line time cap, the type row's two texts beside the menu, the flight line's single line, and the
  language heading outside the Form.
- AX5 stays an audit (story map `a11y.core.large-text`, gap): the fixes are judged from screenshots, and the cases
  keep their Large-layout assertions.
- The type row took three tries. A nested `Text` as one label lost its identifier in the 问小貘 fill path
  (`ask_sheet_draft_fill` could not find it twice), and inside `LabeledContent`'s label slot the same nested `Text`
  drew 「类型类型」: `@expo/ui` lays out the span views again in a slot. Two plain texts in the label fixed both, and
  the cases went back to main's identifiers. Tag `expo-ui-nested-text`, first occurrence: use a nested `Text` only as
  a direct child of a plain SwiftUI container, never in a slot.
- Each AX5 run still fails the Large-layout assertions it reaches (OCR of a wrapped time, the place row and the title
  counter below the fold), as the README says. The screenshots show the fixes: the time and category wrap whole, 「类型」
  sits on one line with the menu under it, the flight and luggage wrap, and the language step scrolls as one.
  `onboarding_language_moment` now has an AX5 branch that fails when the heading does not scroll with the rows or the
  last language never reaches the screen above 开始 (zh-Hans and ms pass).
- en `onboarding_language_moment` failed its first attempt on a lost AXe session (load ~900) and passed on the retry.
  The drawn-whole check on the en question passed, so the O2 glyph clip did not come back with the heading in the Form.
