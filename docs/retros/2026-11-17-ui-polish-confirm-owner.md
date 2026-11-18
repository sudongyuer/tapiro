---
branch: fix/ui-polish-confirm-dialogs
date: 2026-11-17
pr: UI polish audit, confirmations (BS-2, BS-3)
title: every confirmation is the system action sheet as a popover from the control that asked, keep visible under confirm
escaped: 0
rework: 3
interventions: 0
overturned: 0
---

# Retro: UI polish, confirmations (2026-11-17)

The audit's two `owner` rows on confirmations: 确认完成, 不帮了, 关掉这单 and 屏蔽 showed a centred alert with the buttons
side by side (BS-2), and the withdraw dialog showed only 撤回申请 (BS-3). Both have one cause in iOS 26+, found with a
scratch UIKit and SwiftUI app on a stock Simulator before any product code changed.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                              |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 0                                                                                                                                                      |
| Quality   | Vacuous checks          | 0; `assert_dialog` fails on the old presentation (side by side, or no keep button, or away from the source)                                            |
| Quality   | Skipped verifications   | VoiceOver activate of the hold button (选这个人 confirm) is a device check; no dark or en run (no colour or copy change)                               |
| Speed     | Wall-clock              | About 3 h of work across two days, plus about 17 h queued behind the shared Simulator lock (a verify:full and other agents); two holds of 21 and 8 min |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                      |
| Loop      | Minutes on this retro   | 5                                                                                                                                                      |

## What happened

| #   | What happened                                                                                                                                                                                                                     | Root cause class | Change and layer                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | The cause was settled in about 15 minutes with a 90-line scratch app (`swiftc` + `simctl`) presenting each variant on a stock Simulator, instead of reasoning from forum posts that disagreed                                     | method           | Carry forward: a platform-presentation question gets a scratch app, not a product build                                      |
| 2   | `UIBarButtonItem.frame(in:)` is `CGRect?` in Swift although the header returns a plain `CGRect`; the first verify build failed on it                                                                                              | platform         | Fixed; one extra build (about 4 min)                                                                                         |
| 3   | Review found the native promise could hang when UIKit does not present the alert or the screen under it closes in code, which would hold the close flow's in-flight guard                                                         | design           | `Outcome` settles as keep on `deinit`; the cases now also tap outside the popover (the delegate path). Layer: code structure |
| 4   | Quick `axe tap`s on a freshly booted stock Simulator were dropped about half the time; a 0.1 s held touch registered every time                                                                                                   | outside          | None; the runner's `tap_checked` already retries                                                                             |
| 5   | First hold: `assert_dialog` passed a tuple to `ui.settled` (which reads `.get('frame')`), so the first cases errored; fixed and rerun in the same hold                                                                            | process          | `assert_dialog` settles on the keep button, then reads the tree. Tag `case-typo`                                             |
| 6   | The popover can open beside its source (ride 撤回申请 at the bottom right, the report sheet's 提交), which the case's above/below check rejected; the bounty_block outside tap landed on the popover itself (the title behind it) | method           | The check accepts any side within 64 pt; the outside tap goes below the popover. Rerun of 5 cases in a second hold: all pass |

## Carry forward

- A question about how iOS presents a control is answered with a scratch app on a stock Simulator (no lock, no product
  build), and its screenshots go into the evidence folder.
- New confirmations use `askConfirm` (RN control) or `ConfirmDialog` (SwiftUI control); never `ActionSheetIOS`, which
  anchors only on iPad.
