---
branch: fix/dark-selected-and-paging
date: 2026-11-07
pr: selected chips and the home status bar in dark; review and coin paging around a reload
title: Unreadable selected chips, a no-op status bar and a paging stall, each shown failing before the fix
escaped: 3
rework: RETRO_REWORK
interventions: 0
overturned: 0
---

# Retro: dark selected chips and paging

## Selection

| Cases                                                         | Runs                | Reason                                                  |
| ------------------------------------------------------------- | ------------------- | ------------------------------------------------------- |
| `bounty_post_selected_chips` (new), `ride_create_form`        | zh-Hans light, dark | The selected chips; colour on an accent fill            |
| `bounty_board_list`                                           | zh-Hans light, dark | Home status bar, read from pixels                       |
| smoke                                                         | zh-Hans light       | Asked for every PR                                      |

No case for paging: logic only, unit tests.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                         |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 3: chips at 1.15:1 in dark, the status bar white over the stage since #2, paging that could stop for good                          |
| Quality   | Vacuous checks          | 1 caught: the first contrast check passed on the unreadable chip, since the capsule's corners counted as ink                       |
| Quality   | Skipped verifications   | SwiftUI `onAppear` not firing again is reasoned from its contract; no Simulator run forces the race                                |
| Speed     | Wall-clock              | RETRO_TIME                                                                                                                        |
| Autonomy  | Avoidable interventions | 0                                                                                                                                 |
| Loop      | Minutes on this retro   | 4                                                                                                                                 |

## Problems and root causes

| #   | What happened                                                                                                                                  | Root cause class | Change and layer                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `borderedProminent` with the Form's tint draws a white label on the cream accent in dark                                                       | own gap          | Each selected chip sets the on-accent label. Check: `readable.assert_label_reads`, which also requires the accent fill             |
| 2   | `<StatusBar style="dark">` did nothing: the app runs with view-controller-based status bar appearance, and only the screen option reaches it   | library footgun  | `statusBarStyle` on the home screen. Check: pixel luma of the clock in `bounty_board_list`                                         |
| 3   | A next page refused during a head read, or dropped after one, was never asked for again; the last row's `onAppear` had fired already           | own gap          | Stores remember it (`moreWanted`) and ask again; four tests failed first. Tag `paging-stall`                                       |
| 4   | The first contrast check passed on 1.15:1 (`ride_create_form` passed on the broken build); only opening the screenshot showed it                | check design     | Corners inset out of the measured area; rerun on the broken build failed at 1.15:1. Tag `vacuous-pixel-check`                      |
| 5   | `bounty_post_form` and `bounty_post_optional` fail on iOS 27.2 before they reach the chips: typed keys drop and the keyboard covers 时间         | known            | New keyboard-free case instead of adding to them. Tag `axe-keys-ios27`                                                             |
| 6   | A scripted edit landed `useTheme` in the wrong component and `tsc` failed after the commit                                                     | own gap          | Amended before pushing. Read the target function before a scripted edit                                                           |
| 7   | `driver.py` went over 500 lines with the new helper                                                                                            | own gap          | Moved to `verification/ui/readable.py`                                                                                            |

## Notes

- The same refusal stays in the 消息 list (`loadMoreThreads`), softer since `onEndReached` fires again after scrolling away;
  listed in `docs/status.md` Queue. The board re-checks on every scroll and is not affected.
- Other accent fills were read: `FilterChips`, `ReviewPickers`, `PendingReviewCards`, `BoardCardRows`, `DistanceAxis`,
  `QrForms` and `PillButton` already use `--color-on-accent`; toolbar prominent buttons pick their own label.
RETRO_EXTRA
