---
branch: fix/dark-selected-and-paging
date: 2026-11-07
pr: selected chips and the home status bar in dark; review and coin paging around a reload
title: Unreadable selected chips, a no-op status bar and a paging stall, each shown failing before the fix
escaped: 3
rework: 2
interventions: 0
overturned: 0
---

# Retro: dark selected chips and paging

## Selection

| Cases                                                  | Runs                | Reason                                                  |
| ------------------------------------------------------ | ------------------- | ------------------------------------------------------- |
| `bounty_post_selected_chips` (new), `ride_create_form` | zh-Hans light, dark | The selected chips; colour on an accent fill            |
| `home_status_bar` (new), `bounty_board_list`           | zh-Hans light, dark | Home status bar, read from pixels; the home screen file |
| smoke                                                  | zh-Hans light       | Asked for every PR                                      |

No case for paging: logic only, unit tests.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                    |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 3: chips at 1.15:1 in dark, the status bar white over the stage since #2, paging that could stop for good    |
| Quality   | Vacuous checks          | 1 caught: the first contrast check passed on the unreadable chip, since the capsule's corners counted as ink |
| Quality   | Skipped verifications   | SwiftUI `onAppear` not firing again is reasoned from its contract; no Simulator run forces the race          |
| Speed     | Wall-clock              | About 1 h                                                                                                    |
| Autonomy  | Avoidable interventions | 0                                                                                                            |
| Loop      | Minutes on this retro   | 4                                                                                                            |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                    | Root cause class | Change and layer                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | `borderedProminent` with the Form's tint draws a white label on the cream accent in dark                                                                                                                                                         | own gap          | Each selected chip sets the on-accent label. Check: `readable.assert_label_reads`, which also requires the accent fill        |
| 2   | `<StatusBar style="dark">` did nothing with view-controller-based appearance, and my first fix (`statusBarStyle` on the tab's screen) did nothing either: nothing under NativeTabs reaches UIKit. Review predicted it, the dark run confirmed it | library footgun  | `statusBarStyle` set on the root screen while home is focused. Check: `home_status_bar`. Rule: `AGENTS.md`, Platform pitfalls |
| 3   | A next page refused during a head read, or dropped after one, was never asked for again; the last row's `onAppear` had fired already                                                                                                             | own gap          | Stores remember it (`moreWanted`) and ask again; four tests failed first. Tag `paging-stall`                                  |
| 4   | The first contrast check passed on 1.15:1 (`ride_create_form` passed on the broken build); only opening the screenshot showed it                                                                                                                 | check design     | Corners inset out of the measured area; rerun on the broken build failed at 1.15:1. Tag `vacuous-pixel-check`                 |
| 5   | `bounty_post_form` and `bounty_post_optional` fail on iOS 27.2 before they reach the chips: typed keys drop and the keyboard covers 时间                                                                                                         | known            | New keyboard-free case instead of adding to them. Tag `axe-keys-ios27`                                                        |
| 6   | A scripted edit landed `useTheme` in the wrong component and `tsc` failed after the commit                                                                                                                                                       | own gap          | Amended before pushing. Read the target function before a scripted edit                                                       |
| 7   | `driver.py` went over 500 lines with the new helper                                                                                                                                                                                              | own gap          | Moved to `verification/ui/readable.py`                                                                                        |

## Notes

- The same refusal stays in the 消息 list (`loadMoreThreads`), softer since `onEndReached` fires again after scrolling away;
  listed in `docs/status.md` Queue. The board re-checks on every scroll and is not affected.
- Other accent fills were read: `FilterChips`, `ReviewPickers`, `PendingReviewCards`, `BoardCardRows`, `DistanceAxis`,
  `QrForms` and `PillButton` already use `--color-on-accent`; toolbar prominent buttons pick their own label.
- Review: round 1 found 1 Critical (the no-op status bar fix), 1 Important (a sign-out test that could not fail) and 5
  Minor, all fixed; a failed page outliving a reload no longer leaves a dead 重试.
- Re-review: 0 Critical, 0 Important, 4 Minor. Fixed: coin tests, case `DEPS`. Accepted: over a half-height sheet on home
  the clock follows the appearance again (the stage is dimmed there), and the `getParent` depth stays (the dark case
  fails if a layout level moves). Listed: Queue item 4.
- `ride_create_form` light failed twice at typing 76: the field stayed 0 with the keyboard up, the known key drop, after
  the chip step had passed at 15.51:1. Not retried further. Tag `axe-keys-ios27`.
- `expo-status-bar` stays in `package.json` and `app.json`: the component is unused now, but removing a config plugin
  changes prebuild output and is its own small task.
- A second runner in the same checkout exits at once, and a run chained behind one silently produced nothing: read the
  log, not the exit of the chain. Tag `runner-checkout-lock`.
