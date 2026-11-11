---
branch: feat/live-activity-ui
date: 2026-11-12
pr: Live Activity Lock Screen and Dynamic Island views (274–277 A, 278 A)
title: Simulator input, not the views, took the time
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: Live Activity views

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                    |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 0; review found a stale bounty title still showing its old minutes (fixed with `staleTitle` and a unit test) |
| Quality   | Vacuous checks          | 0                                                                                                            |
| Quality   | Skipped verifications   | No UI case (the extension exists only behind the prebuild flag, 278 A); device checks (light card, spike 3)  |
| Speed     | Wall-clock              | About 3.5 h, of which about 85 min waiting for the shared Simulator lock                                     |
| Autonomy  | Avoidable interventions | 0                                                                                                            |
| Loop      | Minutes on this retro   | 10                                                                                                           |

## Problems and root causes

| #   | What happened                                                                                                                                                                             | Root cause class   | Change and layer                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | The three boards worded the same bounty differently (274 and 277 「小林 · 约 6 分钟到」, 276 「小林在路上」)                                                                              | spec gap           | Picked the two that agree and recorded it as V1 for veto (plan)                                                             |
| 2   | AXe taps on the Debug scene were dropped about half the time: `axe tap` (both styles) missed, `axe touch --down --up --delay 0.15` landed; taps also failed while DeviceHub was zoomed in | tool limit         | Use `axe touch` with a hold for RN pressables on iOS 27.2, keep DeviceHub at fit zoom; recorded here, tag `axe-tap-dropped` |
| 3   | The first scripted captures tapped the wrong row: button frames read right after launch were before the navigation inset, and the status bar's 「◀ Settings」 is also a `Button`          | own slip           | Read frames after the scene settles and filter by width; the capture script checks the scene's own log line before locking  |
| 4   | An `osascript` call to Finder raised a macOS permission prompt for the terminal app, which then sat over the DeviceHub window                                                             | own slip           | Do not script Finder for screen bounds (`system_profiler` gives them); the prompt was left for the owner                    |
| 5   | `tsc` failed on `TermsLine` once Metro generated `.expo/types` in the worktree (known follow-up from the spikes retro); it passes without them                                            | pre-existing       | Not fixed here; still a follow-up                                                                                           |
| 6   | After `end`, the island drops the activity at once; only the Lock Screen keeps the final step                                                                                             | platform behaviour | Measured and written into the plan for Task 5                                                                               |

## Follow-ups

- `.expo/types/router.d.ts` from a running Metro makes `src/features/account/TermsLine.tsx` fail `tsc` (`/legal/undefined`).
- Light-mode Lock Screen card and the consent prompt timing on the owner's iPhone (spike 3).
- Before push ships: minutes from the ETA with `Text(timerInterval:)` instead of a fixed number (plan).
