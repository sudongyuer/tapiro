---
branch: fix/verify-followups-1116
date: 2026-11-16
pr: the night's remaining failures rerun and judged; two broken cases fixed, the rest recorded in status 0f
title: Two case flaws fixed (an OCR edge, glass over a light button); six passed on rerun; lost taps recorded
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: verify:full follow-ups (2026-11-16)

Follow-up to `2026-11-16-verify-full-1116` and status 0f, item 3 of the afternoon queue.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                           |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                   |
| Quality   | Vacuous checks          | 0; the OCR row check still fails a meta line that wraps below the row; the head form check stays on the button      |
| Quality   | Skipped verifications   | `pay_sheet_duitnow` not rerun (pasteboard, status 0d); each passing case was rerun once, profile report three times |
| Speed     | Wall-clock              | About 1 h, all of it runs                                                                                           |
| Autonomy  | Avoidable interventions | 0                                                                                                                   |
| Loop      | Minutes on this retro   | 5                                                                                                                   |

## What happened

| #   | Finding                                                                                                    | Cause       | Action                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 1   | `bounty_applicants_worst` en dark: OCR reads 「Helped 128 times」 at x 90.0, the row starts at 92, slack 1 | case flaw   | The row is widened by 4 pt for that read. Tag `ocr-box-edge`                                 |
| 2   | `shell_minimise` en dark: the minimised 小貘 button over a light Apply button read 135                     | case flaw   | No glass luma on that button; the opaque head's form is still asserted. Tag `glass-backdrop` |
| 3   | `profile_report_review_all`: a tap on 全部评价 changed nothing; the night's 举报 menu stayed open          | environment | Recorded with the lost-tap class (status 0e/0f); no repro of the open menu in 3 runs         |

## Carry forward

- Lost taps now show in four cases in one afternoon (`ask_sheet_worst` retry, `ask_sheet_answer`, `ask_sheet_draft_fill`,
  `profile_report_review_all`), each a tap with no reaction on screen. A driver-level check that a tap changed the tree,
  with one retap, would cover them all; it changes every case's timing, so it is a question for the owner, not done here.
