---
branch: fix/ui-polish-pay
date: 2026-11-17
pr: UI polish audit, payment, payee methods and sticker book (PAY-01–05, 08, 09, 11–14)
title: eleven audit findings fixed in one round; 19 case runs passed, one flaky on a lost AXe session
escaped: 1
rework: 0
interventions: 0
overturned: 0
---

# Retro: UI polish, payment, payee methods and sticker book (2026-11-17)

Fixes from the UI audit of 2026-11-16. Two stages: code, cases and fast checks without the Simulator, then one locked
Simulator slot (15 min) for the case set.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                                                                       |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 1: the month calendar laid six days per row under seven weekday headers since it shipped (PAY-01); its case asserted hand art and labels, never a column                                                        |
| Quality   | Vacuous checks          | 0 new; each added assertion was written against the old build's captured frames (`04-filled.json`, `01-pick.json`, `01-calendar.json`) so it fails there                                                        |
| Quality   | Skipped verifications   | PAY-11 (continuous corners) and PAY-13 (rounded digits) have no assertion that can fail, screenshots only; the weekday header is hidden from the accessibility tree, so its order is checked by eye and by code |
| Speed     | Wall-clock              | Stage 1 about 40 min; build 287 s; locked Simulator time 15 min                                                                                                                                                 |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                                                                               |
| Loop      | Minutes on this retro   | 5                                                                                                                                                                                                               |

## What happened

| #   | Finding                                                                                                                                                                       | Cause                | Action                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `width: 100/7 %` with `flexWrap` wrapped after six cells, so every day sat under the wrong weekday                                                                            | layout by percentage | Explicit week rows from `monthWeeks` (pure, unit-tested); the case asserts four dates' columns and one shared row, in zh-Hans, dark and en |
| 2   | A button inside a Form row reports the row's frame (370 × 80), so a width assertion would have passed on the old QR sheet                                                     | read the old AX dump | The case asserts the accent fill at the button's right end and a height under 70 pt as well                                                |
| 3   | The compound-loop hook reported 「a check failed」 after commands that exited 0 (tsc, lint, format, tests)                                                                    | hook false positive  | None here; tag `hook-false-failure`                                                                                                        |
| 4   | `payee_qr_alipay` lost the AXe session on Verify 3 once and passed on the runner's retry                                                                                      | environment          | Tag `axe-input-loss` (same Simulator as the 2026-11-16 retries)                                                                            |
| 5   | Seen while reviewing, not fixed (outside the findings): the en month heading 「October 2026」 looks clipped at its right edge in `en/light/sticker_book_calendar/01-calendar` | not investigated     | Listed in the PR for the next audit pass                                                                                                   |

## Carry forward

- A grid case asserts a column, not only that its cells exist: a known date under its weekday would have caught PAY-01
  on the first run.
- Before asserting a frame for a control inside a SwiftUI Form row, read an existing AX dump: the row, not the control,
  may own the frame.
