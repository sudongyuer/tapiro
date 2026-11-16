---
branch: feat/drawing-task
date: 2026-11-16
pr: the 貘币, the four accessories and the leaf drawn from the canvas and placed where the answered boards put them (13 C)
title: deferred art landed ten days late because the plan parked it as 「a separate drawing task」 nobody scheduled
escaped: 1
rework: 0
interventions: 1
overturned: 0
---

# Retro: the drawing task (2026-11-16)

The owner noticed the app does not use the designed 貘币. Plan `2026-11-06-reviews-profile-coins` rows C2, W3, M5 and W9
deferred the coin, the four accessories and the leaf to 「a separate drawing task」; no plan, queue entry or question
ever scheduled it. The owner answered question 13 C (all of it now, no new motion).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                          |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 1: the missing coin art reached the owner (the reason for this step)                               |
| Quality   | Vacuous checks          | 0; every new pixel check counts colours that only the new art draws (gold rim, crayon fills, leaf) |
| Quality   | Skipped verifications   | en not run (two new copy keys, short); ms runs for the cases that declare it                       |
| Speed     | Wall-clock              | See the PR                                                                                         |
| Autonomy  | Avoidable interventions | 1: the owner had to find the missing art himself                                                   |
| Loop      | Minutes on this retro   | 10                                                                                                 |

## What happened

| #   | Finding                                                                                                                                                                                                          | Cause                             | Action                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Four ★ rows (C2, W3, M5, W9) and gap 5 said 「the art is a separate drawing task」; `docs/status.md` only said 「Accessory art is stand-in」 inside a long Notes cell, never in Queue or Owner decisions pending | a scope cut parked, not asked     | This step; proposed guard below. Tag `parked-scope`                                  |
| 2   | The canvas draws the weekly-feed thanks twice (253 A 「谢谢！+1 ◎」, 257 c1 「谢谢！◎ +1 貘币」) and the 嫩叶 in two styles (teardrop, crayon)                                                                   | boards answered on different days | ★ G3 and G8 for veto                                                                 |
| 3   | No crayon accessory exists on the canvas, although the brief pointed there; 250 A itself says 「先用占位图，画风按 93A 再出图」                                                                                  | expected                          | Drawn in the 93 A pipeline (`drawings.mjs`), shapes from `RepBC` and `Motion257Grow` |
| 4   | `CoinMark` was a SwiftUI shape, so the coin had to move into the RN tree; `RNHostView matchContents` already carries RN art into Form rows (`TierMark`, `TaskCard`)                                              | existing pattern                  | One `TapirCoin` in `src/ui`, hosted the same way                                     |

## Root cause

A scope cut that left a known gap (stand-in art in product UI) was written into a plan's ★ table as 「a separate
drawing task」 instead of being asked as a numbered option or queued in `docs/status.md`. The global rule already says
「Scope cuts count as choices … never park one in the doc」; it held for questions asked before a step, not for a ★
default written during implementation.

## Proposed guard (lowest layer that holds, for the owner to pick)

1. **★ A check in CI**: `scripts/check-stand-ins.mjs` scans `src/`, `modules/`, `docs/plans/` and
   `docs/design-language.md` for `stand-in`, `placeholder art`, `占位图` and 「separate … task」, and fails unless each
   hit names a queue id that exists in `docs/status.md` 「Queue」 or 「Owner decisions pending」 (for example
   `stand-in (status Q12)`). A unit test feeds it a plan row without an id (fails) and with one (passes). Cost: one
   script and a CI step; it catches the parked cut on the PR that writes it.
2. A written rule in `AGENTS.md` (Docs and specs): a deferred item gets a status Queue entry in the same PR. Weaker: it
   is the rule that already existed in spirit.
3. Nothing beyond this retro.

## Carry forward

- Art in the app that we drew rather than the model or a designer is listed under status 「Owner decisions pending」
  (hand-art set, pantry, accessories; 小貘 itself); none of it is a stand-in in product UI any more.
