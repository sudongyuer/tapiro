---
branch: feat/pay-unpaid-reminders
date: 2026-11-24
pr: Unpaid bounty payments are pushed to the payer at 24 h and 72 h
title: Unpaid reminders
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: Unpaid reminders

## Core (mandatory)

| Dimension | Measure               | This step                                                                   |
| --------- | --------------------- | --------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                           |
| Quality   | Skipped verifications | Push delivery on a phone; the full pgTAP suite runs in CI, not locally      |
| Speed     | Wasted time           | ~5 min (the shared local stack was behind main; ran the test in a rollback) |
| Autonomy  | Interventions         | 0                                                                           |

## Findings

- Half the story already existed: `publish_blocked()`, the post hint and confirm screens and their UI cases. Reading
  the story map's coverage and grepping `publish_blocked` first kept the change to the reminders.
- The realtime-push spec's 173 A (time-based reminders are local) and the foundation's "push reminders (step 9)"
  pointed different ways; rides already remind locally, so bounty payments push and rides stay local (UR1) to avoid a
  double reminder.
- `reminderDue` had a latent bug (the 24 h reminder came back after a folded 72 h one), found by writing the SQL rule
  first and comparing. The unit test now covers it.
