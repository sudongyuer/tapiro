---
branch: fix/milestone-followup
date: 2026-11-21
pr: The milestone batches that ran after TestFlight 1.0.0 (20261121.1036), and their fixes
title: The keyboard toolbar again, on the bank sheet
escaped: 1
rework: 1
interventions: 1
overturned: 1
---

# Retro: milestone follow-up

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                    |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 1 in TestFlight 20261121.1036: on the bank sheet the name field cannot be tapped while the account pad is up |
| Quality   | Skipped verifications | AX5 is an audit; its Large-layout assertions fail as expected and are listed, not fixed                      |
| Speed     | Wasted time           | ~45 min: a verify build swapped the app under a running AX5 batch, which then stopped and was rerun          |
| Autonomy  | Interventions         | 1: the owner asked to investigate b4 while the other batches ran                                             |

## Findings

- The bank sheet's failure looked like the sheet not closing; the cause was earlier: the floating keyboard toolbar row
  took the tap on the name field, the name went onto the account number, and 保存 refused it. When M2 removed the
  toolbar from the post form, the other `keyboardDone` users were not checked for a field in that row. Tag
  `keyboard-toolbar-overlay`, second occurrence; the remaining users (ride form, ride sheets) have no field there and
  their cases pass.
- `payee_long` and `ride_settle_split` were case gaps (`case-encodes-old-design`, again H3; a footer read under the pad).
- Rebuilding the verify app while a batch runs breaks that batch at its next relaunch. Build only between batches.
  Tag `verify-build-under-run`; first occurrence.
