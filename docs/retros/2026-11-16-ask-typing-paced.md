---
branch: fix/ask-typing-paced
date: 2026-11-16
pr: the 问小貘 cases type lower-case text through paced keys and tap the prompt until the keyboard shows
title: ask_sheet_worst 9 of 10 with no accent menu; the one failure was a tap after a reboot that brought no keyboard
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: paced typing in the 问小貘 cases (2026-11-16)

Follow-up to `2026-11-16-verify-full-1116` and status 0f (the accent menu that swallowed the press on 发送).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                             |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                     |
| Quality   | Vacuous checks          | 0; the prompt must still read exactly `parcel`, and three taps with no keyboard fail                                  |
| Quality   | Skipped verifications   | Dark, en and ms not run: the change is in the driver path, not a screen. The other five cases that type were run once |
| Speed     | Wall-clock              | About 1 h 10 min, almost all of it the ten runs (5 min each, one runner at a time)                                    |
| Autonomy  | Avoidable interventions | 0                                                                                                                     |
| Loop      | Minutes on this retro   | 5                                                                                                                     |

## What happened

| #   | Finding                                                                                                                        | Cause               | Action                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Three loops on three Simulators with `--udid` died at once: the runner allows one run at a time                                | runner lock         | Ran the ten in sequence (rework 1). Tag `one-runner-at-a-time`                                            |
| 2   | Run 6: a lost AXe session, then on the retry the first tap on the prompt left the screen unchanged, no keyboard                | environment         | `focus_prompt` taps until the keyboard's Return key is in the tree, up to three times, and logs each miss |
| 3   | `ask_sheet_answer` and `ask_sheet_draft_fill` flaky once each (`Missing ask-tapir-checking`; 填进表单 tap left the card shown) | environment, likely | Not changed: neither is on the typing path; both passed on the retry                                      |

## Carry forward

- `bounty.py` still types `Parcel` with `axe type` for the post form title; no failure is on record there, so it is
  left as is.
