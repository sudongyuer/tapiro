---
branch: fix/ui-polish-ride
date: 2026-11-17
pr: UI polish audit, carpool (RIDE-1–9, 12, 13, 16, 17)
title: thirteen audit findings fixed; one new layout check measured copy length instead of padding and failed in ms
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: UI polish, carpool (2026-11-17)

Fix the audit's carpool findings that need no owner answer. Finished by a second agent after the first ran out of quota
with the code committed and no runs done.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                   |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                           |
| Quality   | Vacuous checks          | 0; the new 发起-step check fails on the audit's tree (82 pt) and passes after the fix (57 pt)                               |
| Quality   | Skipped verifications   | en (no copy changed); dark only for `ride_settle_rows` (the accent avatar); no device run                                   |
| Speed     | Wall-clock              | Finishing about 7 h: a 5 min build, 15 min of runs, the rest waiting for the Simulator lock behind the other three branches |
| Autonomy  | Avoidable interventions | 1: the batch waiter stalled and the coordinator had to point it out                                                         |
| Loop      | Minutes on this retro   | 5                                                                                                                           |

## What happened

| #   | What happened                                                                                                                                                 | Root cause class | Change and layer                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| 1   | `ride_detail` ms failed 「the organiser link pads the 发起 step: 47 pt to the seats」: the gap included the next step's title, which wraps to two lines in ms | check design     | The case asserts the 发起 step's own height. Tag `measure-the-thing`                            |
| 2   | The ride batch's waiter sat for over 3 h without starting after the lock was free                                                                             | process          | Batches now retry the lock every minute and the coordinator's check caught it; started directly |
| 3   | `ride_detail` and `ride_create_form` zh-Hans light each lost their video once right after boot and passed on the retry                                        | outside          | None. Tag `video-missing-after-boot`                                                            |

## Next

- RIDE-10 and RIDE-15 are owner questions in the carpool plan; RIDE-11, 14, 18 and 19 stay open (see the audit).
