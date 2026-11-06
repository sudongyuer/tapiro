---
branch: fix/pay-copy-feedback
date: 2026-11-06
pr: pay copy feedback
title: pay_sheet_duitnow raced a 2 s feedback window on iOS 27.2
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: pay copy feedback

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                            |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                                              |
| Quality   | Vacuous checks          | 0: with `setCopied(false)` in the build the case fails at `pay-number copy gave no feedback`; the pasteboard is reset to a sentinel before each copy |
| Quality   | Skipped verifications   | dark and en (no copy, colour or token change)                                                                                                        |
| Speed     | Wall-clock              | About 1 h; one diagnostic case answered it                                                                                                           |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                    |
| Loop      | Minutes on this retro   | 5                                                                                                                                                    |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                                                                                    | Root cause class | Change and layer                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `pay_sheet_duitnow` failed with `number copy gave no feedback`. A diagnostic case showed the copy works: the pasteboard held `0123456789` and an `axe touch` read 已复制 0.9 s later. After `axe tap --id` (2.1–2.4 s, its own tree lookup plus `--post-delay 0.5`) the first describe-ui landed after the 2 s window had closed | check bug        | Verify-only `-uiVerifyCopiedMs` (like `-uiVerifyHintMs`); the case holds 已复制 8 s, asserts the pasteboard against a sentinel and asserts the label returns to 复制. Tag `transient-window` |

## Notes

- A transient state shorter than about 3 s cannot be polled reliably on iOS 27.2: `axe tap --id` takes about 2 s and
  each describe-ui about 1 s. Lengthen it through a verify argument, or measure it from the recording.
- No other case asserts a transient label: chat's 复制 is only checked as a menu item, never tapped (its copy has no
  feedback to assert).
