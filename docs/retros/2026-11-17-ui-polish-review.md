---
branch: fix/ui-polish-review
date: 2026-11-17
pr: UI polish audit, reviews (REV-1, 2, 4–9, 11)
title: nine audit findings fixed; push-out line breaking did not stop a one-character last line, and typed keys left the Simulator keyboard minimised
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: UI polish, reviews (2026-11-17)

Fixes from the UI audit of 2026-11-16 for the review sheet and its entry rows. The first session ran out of quota with
the last fixes uncommitted; a second agent reviewed them against the audit, committed and finished the branch.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                           |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                   |
| Quality   | Vacuous checks          | 0; line breaks are read by OCR from the drawn screen, since the accessibility tree reports a whole label either way |
| Quality   | Skipped verifications   | REV-6 (the dark rim over the pocket) is checked on the screenshot only. No device run                               |
| Speed     | Wall-clock              | First session about 3 h with runs; second session about 20 min plus the shared Simulator lock                       |
| Autonomy  | Avoidable interventions | 0                                                                                                                   |
| Loop      | Minutes on this retro   | 5                                                                                                                   |

## What happened

| #   | What happened                                                                                                                                                              | Root cause class | Change and layer                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `lineBreakStrategyIOS="push-out"` still left 「开」 alone on the sealed layer's last line                                                                                  | platform         | Word joiners hold the last four characters together (`unbrokenTail`, unit-tested); VoiceOver gets the plain text                                      |
| 2   | Non-breaking spaces in the locale strings for 「还剩 N 天」 spread into every reader of the key                                                                            | design           | The strings are plain again; `entryView` joins them where they are drawn and strips the joiners for VoiceOver                                         |
| 3   | `review_sheet` found no software keyboard three times on two Simulators: AXe's typed HID keys count as a hardware keyboard, and the next focus kept the keyboard minimised | outside (runner) | The runner writes `AutomaticMinimizationEnabled` and `HardwareKeyboardLastSeen` false at preparation and before each case (`test_keyboard` covers it) |
| 4   | `shell_tabs` in smoke lost the AXe automation session once and passed on the retry                                                                                         | outside          | None; tag `axe-session-lost`                                                                                                                          |

## Carry forward

- Before reaching for `lineBreakStrategyIOS`, check the result on a screenshot: it did not prevent a single-character
  last line in CJK text here.
