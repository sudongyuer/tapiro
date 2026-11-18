---
branch: fix/ui-polish-home-ask-owner
date: 2026-11-17
pr: UI polish audit, home and 问小貘 owner rows (HOME-3, -5, -6, -7; ASK-1, -12, -18)
title: seven owner rows built; the first sheet header cost the half detent 60 pt, caught by the existing 自己填 check
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: UI polish, home and 问小貘 owner rows (2026-11-17)

The audit's home and 问小貘 rows that waited on the owner, decided by the agent under #162's delegation and built.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                             |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                     |
| Quality   | Vacuous checks          | 0 known; each new assertion fails on the audit's build (strip label, stage line, ride-card button, title, ink fill)   |
| Quality   | Skipped verifications   | No device run; `ask_sheet_draft_fill`, `chat_translate_worst` (open the sheet) not run                                |
| Speed     | Wall-clock              | Code and fast checks about 1 h; the verify build ran at load average ~800; the Simulator lock was held by verify:full |
| Autonomy  | Avoidable interventions | 0                                                                                                                     |
| Loop      | Minutes on this retro   | 5                                                                                                                     |

## What happened

| #   | What happened                                                                                                                                                                                                                                                        | Root cause class | Change and layer                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | HOME-3's decided copy says 「下拉再试一次」, but home's pull only refreshed the board, review and coin feed, not payments; the copy would have lied                                                                                                                  | design gap       | Code: `liveItems.retryIssues()` on pull, unit-tested. Checking that an instruction in copy is really wired is part of the row                                                                                                                  |
| 2   | Removing the RN close button changed four helpers (`header_drop`, `assert_grabber_clear`, `close_sheet`) used by other ask cases; the earlier ask round lost seven cases this way                                                                                    | process          | Grepped every user of the removed test id and helpers before the run (tag `deleted-helper`); none left                                                                                                                                         |
| 3   | The first HOME-7 build put the sheet's header under a system bar at the leading end: 60 pt lost at the half detent pushed 自己填 and the field off the sheet (`ask_sheet_answer`, `ask_energy_sheet` en/ms) and the 44 pt check failed on the system's 36 pt glass X | design           | Close moved to the bar's trailing end with the header in the bar's row; the case no longer sizes a system control (tag `sheet-header-room`). Lesson: a header added to a detent sheet costs its height; check the detent's tightest case first |
| 4   | The compound-loop hook reported "a check failed" after passing `bun test` runs                                                                                                                                                                                       | tooling          | None; the exit codes were 0. Tag `hook-false-failure`                                                                                                                                                                                          |

## Next

- The ride card's 我到了 returns when carpool feeds home (wired to `mark_ride_arrived`, G6).
- 小貘's stage line while payments are still loading still reads 「有事在进行」 (unchanged; noted in the report).
