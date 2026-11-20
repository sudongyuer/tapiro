---
branch: fix/date-row-pickers
date: 2026-11-19
pr: the other compact pickers on the kit date row; ESLint guard for a compact DatePicker
title: BP-13 follow-up, date row for every compact picker
escaped: 0
rework: 3
interventions: 0
overturned: 0
---

# Retro: date row for every compact picker

## Core (mandatory)

| Dimension | Measure               | This step                                                                                       |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                               |
| Quality   | Skipped verifications | no failing-on-old proof: none of the four pickers showed the short style on the old build      |
| Speed     | Wasted time           | ~70 min: three kit rebuilds and a stopped matrix for the sheet layout; one probe lost to a no-op day |
| Autonomy  | Interventions         | 0                                                                                               |

## Findings

- The brief said the four pickers shared BP-13. Probes on the old build first (as the BP-13 retro asked) showed none
  did: 出发 resized for every widening path, the narrow sheet stacked 新的出发时间's title above the picker, the
  time-only pickers have a fixed-width time button, and `EtaSheet` is a wheel. Measuring before changing kept the PR
  from claiming a fix it could not prove. Tag `premise-check` (first time).
- The move then caused the bug it was meant to prevent: the kit row always put the title beside the picker, so the
  sheet's picker got too little room and read 「10/12/26」. The new case caught it on its first run. A kit view that
  replaces a system control has to keep the control's layout choices (stack when narrow), not only its drawing. Tag
  `replaced-layout` (first time).
- An automatic stack (`ViewThatFits` on the picker's ideal width plus slack) stacked the bounty post form's 截止,
  which fits beside its title: 32 pt in 12-hour zh-Hans, 12 pt still in ms. The ideal width comes from the same
  unreliable fitting size the bug is about; a fixed `titleAbove` per screen replaced it after two rebuilds and one
  stopped matrix. Running the earlier screen's case (`bounty_post_optional`) with every kit change is what found it.
  Tag `kit-shared-change`; lesson: do not build a layout decision on a measurement already known to be wrong.
- One probe tapped the calendar day that was already selected, so the tap changed nothing and the step was lost. Pick
  a day that differs from the selection. Tag `no-op-tap`.
- Guard at the lowest layer: an ESLint selector (with fixtures and a test) now flags a compact `DatePicker` under
  `src/`, so a new screen cannot reintroduce the pattern; the wheel and graphical styles pass.
- `ride_create_worst` failed only in the `--hour-cycle 12` run: it turned the picker's text into a 24-hour clock and
  looked for that in a ticket written in 12 hours. Compare what the picker shows with what the ticket shows, never a
  normalised clock. Tag `hour-cycle-assumption` (the 12-hour round on 11-19 fixed the same pattern in other cases).
