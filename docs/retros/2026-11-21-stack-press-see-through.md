---
branch: fix/stack-press-opaque
date: 2026-11-21
pr: a held home card no longer shows the stacked card and the board through it
title: Held front card turned see-through
escaped: 1
rework: 0
interventions: 1
overturned: 0
---

# Retro: held home card see-through

## Core (mandatory)

| Dimension | Measure               | This step                                                                         |
| --------- | --------------------- | --------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 1: the owner saw it on TestFlight 20261121.1036                                   |
| Quality   | Skipped verifications | The new case was not run against a build without the fix                         |
| Speed     | Wasted time           | None                                                                              |
| Autonomy  | Interventions         | 1: the owner's screenshot                                                         |

## Findings

- Press feedback (`PressDim`) dims a subtree by opacity. That is right over a plain background and wrong for a card
  that overlaps other cards: the front card went grey over the board and showed the peek card behind it. Each stacked
  card now has an opaque backing in its own surface colour, so dimming fades the content into the card. The settled
  card keeps none, since its collect motion fades the card itself.
- No case ever held a card down; every home case taps. Tag `press-state-untested`: `home_stack_press` holds the front
  card and samples its edge mid-press in light and dark. No other `PressDim` sits over overlapping content today.
