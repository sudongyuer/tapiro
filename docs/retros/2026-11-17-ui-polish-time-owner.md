---
branch: fix/ui-polish-time-format
date: 2026-11-17
pr: UI polish audit, time format (BP-13, RIDE-19)
title: one clock rule for the app (device 12/24-hour setting, app language); the verify runner sets the hour cycle where Settings writes it
escaped: 0
rework: 3
interventions: 0
overturned: 0
---

# Retro: UI polish, time format (2026-11-17)

Decide one time-format rule for the whole app from the audit's two picker-versus-text findings, build it, and prove the
picker and the text agree.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                       |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                               |
| Quality   | Vacuous checks          | 0; the window-date assertion fails on the 11-13 and 11-16 evidence                                              |
| Quality   | Skipped verifications   | dark (no colour change); en (no copy keys changed); the other ~20 time-showing cases run at 24 h, unchanged text |
| Speed     | Wall-clock              | About 15 h, nearly all waiting for the Simulator lock (verify-full held it overnight); about 45 min of runs      |
| Autonomy  | Avoidable interventions | 0                                                                                                               |
| Loop      | Minutes on this retro   | 10                                                                                                              |

## What happened

| #   | What happened                                                                                                                                                                                 | Root cause class | Change and layer                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A new module-level store failed `sessionLifetimes.test.ts` (every store declares a lifetime)                                                                                                  | none (check held) | Declared `kept`; the check worked as designed                                                                                                            |
| 2   | `-AppleICUForce24HourTime YES` as a launch argument made the wheel 24 h but expo-localization still read 12 h (`Locale.current.hourCycle`), so app text said 「上午10:45」 beside a 24 h wheel | wrong assumption | The runner writes the global defaults through `simctl spawn` before each case, as Settings does; runner unit test `test_hour_cycle.py`. Tag `launch-arg-locale` |
| 3   | Case regexes: `\b` does not match between 晚上 and 9 in Python (CJK is `\w`), and the quick-time label carries 「出发」 after the clock                                                         | check design     | Plain `(21\|9)[:.]00`; `ride.time_text` extracts the clock with its day period                                                                           |
| 4   | Running the 24 h pin left shared Simulators with global hour prefs that the old runner on main does not reset                                                                                 | process          | Deleted both keys on all three `Tapiro Verify` Simulators after the hold; after merge every case sets them                                               |

## Next

- After an in-app language switch away from the system language, the picker's day-period words stay in the system
  language (same root as HOME-4).
- BP-13's short start date did not recur on this build; the case now fails if it returns.
