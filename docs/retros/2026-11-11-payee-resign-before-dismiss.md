---
branch: fix/payee-resign-before-dismiss
date: 2026-11-11
pr: resign the first responder before a sheet with a SwiftUI text field closes or drops rows (266 A)
title: The crash reproduced once the reproducer copied the load of the full run
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: resign before dismiss (266 A)

Follow-up to `2026-11-10-post-hint-keypad-crash` (queue 0b).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                         |
| --------- | ----------------------- | --------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 new; the 0b crash is the one this step fixes                                    |
| Quality   | Vacuous checks          | 1 found in product code: `Keyboard.dismiss()` in three report and reply sheets    |
| Quality   | Skipped verifications   | Swipe-down of a page sheet measured only without load (11 of 11, no crash)        |
| Speed     | Wall-clock              | About 3.5 h; about 2 h of it the four reproducer batches                                                                       |
| Autonomy  | Avoidable interventions | 0                                                                                 |
| Loop      | Minutes on this retro   | 10                                                                                |

## Problems and root causes

| #   | What happened | Root cause class | Change and layer |
| --- | ------------- | ---------------- | ---------------- |
| 1   | Yesterday's 27 single-Simulator saves never crashed; the same six payee cases in ms, light and dark, on three Simulators with six busy CPU loops, crashed 5 of 72 runs (all dark, all at a save) | environment | Reproducer kept out of the repo (a loop over `run.py --app` counting `.ips` files with the assertion); with the fix 0 of 72. Lesson: copy the load of the run that crashed before calling a crash unreproducible. Tag `load-repro` |
| 2   | `ReportSheet`, `ProfileReportSheet` and `ReplySheet` called React Native's `Keyboard.dismiss()` with a comment naming this very crash; it blurs only React Native inputs, so for their SwiftUI fields it did nothing | wrong diagnosis | Replaced by the kit's `resignFocus`, awaited through `afterResign`; every file that renders `SyncedTextField` routes its close, save and row-removing actions through it |

## Follow-ups

- `payee_list` fails 「cash did not turn off」 in 6 of 12 ms runs before and after the fix and once in zh-Hans: the
  switch tap does not flip it; open, not this crash.
- The 0b tally rows: a crash during a verify run shows only as 「row did not appear」; the runner could report a new
  `.ips` for the app next to the failure (not built here).
