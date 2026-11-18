---
branch: fix/verify-ride-settled
date: 2026-11-18
pr: ride_create_worst measures the place name's ink; home_settled_collect's leave limit and board-follow settle point
title: Two open dark failures from the 2026-11-18 full run were case measurements
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: ride_create_worst and home_settled_collect, zh-Hans dark

Both failed on both attempts in the 2026-11-18 full run. Each was rerun three times on main's app (d06ce59) and its
log, screenshot and per-frame numbers read before any change.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                    |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 0                                                                                                            |
| Quality   | Vacuous checks          | 0; a one-frame swap still measures 0.00–0.04 s against the 0.12 s limits; a 3 pt indent fails the 2 pt drift |
| Quality   | Skipped verifications   | Recordings of the night's one-frame board read (not kept by the full run)                                    |
| Speed     | Wall-clock              | About 3 h, half of it waiting for the shared Simulator lock                                                  |
| Autonomy  | Avoidable interventions | 0                                                                                                            |
| Loop      | Minutes on this retro   | 5                                                                                                            |

## What happened

| #   | What happened                                                                                                                                                                                                                                                                         | Root cause class         | Change and layer                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ride_create_worst` dark: the screenshot shows both place lines at x 62, but Vision's box for the first started at 60.9 (outside `inside`'s 1 pt slack) and the second took in the start dot (53.3), so the two lines compared were the 票上叫 line and 改. Reproduced 1 of 3 on main | check design             | The case finds the row's lines by their vertical centre and measures each line's first ink column right of the dot: 63.0 and 63.0 in every run. Tag `ocr-box` |
| 2   | The first fix failed ms dark both attempts: the Latin second read returned the dot as a line of its own (`•`)                                                                                                                                                                         | check design (rework)    | Lines must reach 40 pt into the row, and a second read of the same line is kept once                                                                          |
| 3   | `home_settled_collect` dark: the leave measured 0.20–0.23 s in all eight runs (10 % to 90 % of the change, 320 ms with the standard curve) against a limit of exactly 0.20                                                                                                            | check design             | `LEAVE_MIN_S` 0.12, the limit the board follow already uses; the swap it guards against measured 0.00 s                                                       |
| 4   | The night's first attempt read the board at its final place in one frame (2.83 s, error 1) between 45 pt and 24 pt, so the follow measured 0.00 s. Not seen in eight reruns (follow 0.15–0.19 s)                                                                                      | check design, cause open | The follow is measured to the first frame of the final settled run, so one stray frame cannot end it. Recorded in status 0f as open                           |

## Runs (app d06ce59)

Each run below is one runner invocation. Flaky means it passed on the runner's one retry.

- Main, unchanged case:
  - `ride_create_worst` zh-Hans dark: 2 pass, 1 flaky (the dot read).
  - `home_settled_collect` zh-Hans dark: 3 pass. The leave measured 0.20, 0.22 and 0.20 s; a value at or under 0.20
    can fail the old limit.
- First fix (dot not yet filtered):
  - `ride_create_worst`: zh-Hans dark 3 pass, zh-Hans light pass, ms light pass, ms dark failed on both attempts.
  - `home_settled_collect`: zh-Hans dark 3 pass, light pass.
- Final fix, on the main app after #165 and #170:
  - `ride_create_worst`: zh-Hans dark pass, zh-Hans light pass, ms dark pass.
  - `home_settled_collect` zh-Hans dark: pass.
- Smoke 4/4 twice.
