---
branch: fix/opaque-bar-buttons
date: 2026-11-06
pr: opaque secondary buttons in pinned bars, owner answers recorded
title: opaque secondary buttons in pinned bottom bars; owner answers of 2026-11-06 recorded
escaped: 1
rework: 2
interventions: 0
overturned: 0
---

# Retro: opaque bar buttons

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                    |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 1: the translucent secondary pill over scrolled content shipped in #80 and was found in its evidence shots   |
| Quality   | Vacuous checks          | 0: the new pixel check failed on the unfixed build (1951 / 1925 stray pixels, light / dark) before it passed |
| Quality   | Skipped verifications   | Device look of `systemGray5` against the scroll edge effect; plain text buttons in pinned bars (not changed) |
| Speed     | Wall-clock              | About 1.5 h: one cold verify build (166 s), one warm (23 s), four Simulator runs                             |
| Autonomy  | Avoidable interventions | 0                                                                                                            |
| Loop      | Minutes on this retro   | 4                                                                                                            |

## Problems and root causes

| #   | What happened                                                                                                                                                         | Root cause class | Change and layer                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | #80's 发消息 / 有问题 let the address card show through and cross their labels; every assertion passed (AX frames only), the screenshots showed it                     | check design     | Code structure: `SheetFrame` provides `PinnedSurface`, so any secondary pill in a pinned bar is opaque. Check: `assert_fill_hides_content` in `verification/ui/bounty.py`, with an overlap precondition |
| 2   | The first label-width estimate (18 pt per CJK character + 16) left no strip beside the narrow 发消息 (90.7 pt) in the done row; the case failed on its own assertion | own gap          | Estimate 17.5 pt + 8 and a 6 pt inset; reran light, dark and ms, all pass. Tag `pixel-strip-estimate`                                                                                                     |
| 3   | Review (Important): pressed and disabled dimming made the opaque fill 60 % transparent again (有问题 while 确认完成 sends); the precondition checked only vertical overlap; plain pills in bars had no floor | own gap | Every pill in a pinned bar sits on an opaque `systemGroupedBackground` base; each strip must cross the content behind it; a new step asserts 有问题 while locked (`05b-done-sending`) |
| 4   | `bounty_detail` (edge swipe back) and `pay_sheet_duitnow` (copy feedback) failed; the latter also failed on a build without this change, twice | known / pre-existing | Not changed here. Edge swipes do not pop on iOS 27.2 (README); the copy feedback failure is new to this run's notes. Tags `edge-swipe-ios27`, `pay-copy-feedback` |

## Notes

- Selection: `chat_entry_status` (the screen whose bar changed; zh-Hans light and dark, ms light), `bounty_status_worst`
  and `bounty_status_states` (the other status-screen bars; light and dark, worst also ms) on the first fix; after the
  base change, one case per `SheetActions` screen in zh-Hans light (`bounty_status_poster`, `bounty_detail`,
  `pay_payee_confirm`, `pay_sheet_duitnow`, `ride_create_confirm`, `bounty_post_publish`) and `chat_entry_status` in
  light, dark and ms; smoke. The ride footer is an opaque bar below its scroll view, so it was not run.
- Ran on `Tapiro Verify 3` (the retros' automation-session timeouts on `Tapiro Verify`); no timeouts or tap drops.
