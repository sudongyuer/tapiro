---
branch: fix/quiet-hours-device-zone
date: 2026-11-03
pr: local quiet hours (235)
title: local reminders keep quiet hours in the device time zone
escaped: 0
rework: 0
interventions: 0
overturned: 1
---

# Retro: local quiet hours (235)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                 |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                   |
| Quality   | Vacuous checks          | 0: the London case expects a time that differs from the Malaysian one                     |
| Quality   | Skipped verifications   | UI cases and smoke: logic only, no screen changed                                         |
| Speed     | Wall-clock              | About 15 min                                                                              |
| Autonomy  | Avoidable interventions | 1: PR 57 recommended keeping Malaysia time; the owner needed a second message to choose B |
| Loop      | Minutes on this retro   | 3                                                                                         |

## Problems and root causes

| #   | What happened                                                                                                                 | Root cause class | Change and layer                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | A pay-reminder case passed only because the machine zone was not UTC; `bun test` runs in UTC, so the new quiet hours broke it | check design     | `setTimeZone` pins the whole reminders test file to `Asia/Kuala_Lumpur`; the suite passes in four zones |
| 2   | The first report kept quiet hours in Malaysia time for consistency with the server, against the owner's device-zone decision  | judgment         | When an owner decision sets a rule app-wide, a carve-out is recommended only for server-computed rules  |

## Notes

- Overturned: PR 57's Malaysia-time local quiet hours (decision 235, owner).
- The push outbox's quiet hours stay in Malaysia time until devices report their zone (account half).
