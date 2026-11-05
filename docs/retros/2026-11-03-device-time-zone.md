---
branch: fix/device-time-zone
date: 2026-11-03
pr: device time zone (234)
title: show and pick times in the device time zone across the app
escaped: 0
rework: 0
interventions: 0
overturned: 1
---

# Retro: device time zone (234)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                   |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                     |
| Quality   | Vacuous checks          | 0: every zone test asserts a value that differs between its zones, so it fails if the zone pin does nothing |
| Quality   | Skipped verifications   | dark, en and ms (no colour or copy change); `test:stack` (no SQL change)                                    |
| Speed     | Wall-clock              | About 1.5 h: one verify build (5 min), one 12-case run (5 min), smoke (1 min)                               |
| Autonomy  | Avoidable interventions | 0                                                                                                           |
| Loop      | Minutes on this retro   | 5                                                                                                           |

## Problems and root causes

| #   | What happened                                                                                                                                            | Root cause class | Change and layer                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Unit tests read the machine zone: on this Mac (Los Angeles) the ride draft tests and the waiver-date copy test failed once the code used the device zone | test bug         | `src/lib/inTimeZone.ts` pins `TZ` per test; the zone tests assert two or more zones. The suite passes under five zones                                                                                  |
| 2   | `delete process.env.TZ` makes Bun stop following later `TZ` changes, so the first pinning helper silently ran every later zone in the first one          | tool footgun     | `inTimeZone` restores the previous zone by name and never deletes; the reason is a comment in the helper                                                                                                |
| 3   | UI cases took the Simulator's zone from the Mac; `ride_settle_owing` hard-coded UTC+8 and `bounty_status_helper` used the Mac's local zone               | check design     | `run.py` launches the app with `SIMCTL_CHILD_TZ` and runs each case with the same `TZ` (default `Asia/Kuala_Lumpur`, `TIME_ZONE` per case, validated in `affected.parse_declarations`, `test_affected`) |
| 4   | The ride list grouped by the server's `day`, a Malaysia-time field the first search (`malaysia`) did not find because it is just named `day`             | search gap       | The client groups by `departAt` in the device zone and no longer reads `day`; searching for the data a helper produced, not only its name, found it                                                     |

## Notes

- Overturned: PR 55's Malaysia-time pickers and ride clock (decision 234, owner).
- The local reminders' quiet hours stay in Malaysia time to match the server outbox; whether a traveller's quiet hours
  should follow the device is a question for the owner if it comes up.
