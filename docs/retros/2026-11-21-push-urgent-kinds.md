---
branch: feat/push-urgent-kinds
date: 2026-11-21
pr: time-critical pushes skip quiet hours (owner Q38 A)
title: Pushes at night looked broken because every one waited for 08:00
escaped: 1
rework: 0
interventions: 0
overturned: 0
---

# Retro: urgent push kinds

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                   |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 1: the owner tested at 02:35 Malaysia time, nothing arrived, and push looked broken (held until 08:00)      |
| Quality   | Skipped verifications | None; pgTAP ran on an isolated stack (`scripts/db-isolated.sh`), all files pass                              |
| Speed     | Wasted time           | None worth noting                                                                                           |
| Autonomy  | Interventions         | 0                                                                                                           |

## Findings

- Cause: decision 170 A gave quiet hours one rule for every push, with exemptions only for the ride or bounty the
  recipient is on right now. A payment to confirm, a chosen helper or a cancelled ride is time-critical before that
  state is reached, so it waited too. The rule was right for most pushes and wrong for a short list of kinds; nothing
  in the spec asked per kind whether 08:00 is too late. Tag `rule-too-coarse`.
- Guarantee at the lowest layer: the urgent list lives in one SQL function (`private.push_is_urgent`), and
  `push_urgent_kinds.test.sql` asserts at 02:35 that each urgent kind goes at once and that ordinary ones still wait,
  so dropping a kind from the list fails pgTAP. A new push kind defaults to ordinary; whether it is urgent is a
  decision in the spec's table, not a check. No rule added: the decision is product judgment, not a repeatable
  mistake.
- Three older assertions encoded the old behaviour (`bounty.cancelled` to the helper before setting off,
  `payment.marked_paid` at 01:00, `ride.cancelled` at 01:00); they were changed to the new rule or to a kind that is
  still ordinary, so each file still checks that quiet hours hold something.
