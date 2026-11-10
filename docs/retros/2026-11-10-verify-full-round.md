---
branch: fix/verify-full-round
date: 2026-11-10
pr: verify:full on main, triage and the fix round
title: The first full matrix since the reviews milestone; most failures were the harness, three were the app
escaped: 3
rework: 2
interventions: 0
overturned: 0
---

# Retro: verify:full round

`bun run verify:full` on 271ba41 (app) with runner commit 9010df0: 1174 runs, 1052 passed on the first run, 122 failed,
from 02:07 to 09:53 (7 h 46 min). Two earlier attempts (00:31 and 01:28) were stopped by hand after AXe lost its
automation session on every Simulator.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                     |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 3: unpaid hint lost with a draft; payee save crash; (possible) long thread opens at the top   |
| Quality   | Vacuous checks          | 0 kept; the replay guards could fail on a late plist, not pass falsely                        |
| Quality   | Skipped verifications   | The payee crash is not reproduced on a device; the hint bug is not diagnosed                  |
| Speed     | Wall-clock              | About 11 h: 1.5 h lost to two stopped attempts, 7.8 h the matrix, the rest triage and reruns  |
| Autonomy  | Avoidable interventions | 0                                                                                             |
| Loop      | Minutes on this retro   | 10                                                                                            |

## Problems and root causes

| #   | What happened                                                                                                                                                                                          | Root cause class | Change and layer                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | AXe 「Timed out creating the simulator remote automation session」 hit 37 of 115 runs in attempt 1 and returned 15–30 min after every fresh boot; a shutdown cleared it                                    | environment      | Runner: the error is a stall (reboot, retry once elsewhere); 38 stalls healed in the matrix. Tag `axe-session-timeout` |
| 2   | The 「dropped typed keys」 of `bounty_post_form`, `bounty_post_optional` and `ride_create_form`: HID keys never reach the number, decimal and phone pads on iOS 27.2 (6 of 6 after waits; on-screen taps 2 of 2) | wrong diagnosis  | `keys.py` taps the pad keys and its delete key. Tag `axe-keys-ios27`                                                 |
| 3   | `bounty_select` dark 「the gold never showed」: the recording is tagged wider than its sRGB values; frames read #D99A2B as (226, 149, 0)                                                                  | check bug        | `frames.swift` reads frames as sRGB (215, 152, 42)                                                                  |
| 4   | Spinner windows of 2.5 s shorter than one tap plus one read (`bounty_apply`, `bounty_withdraw`, `bounty_block`)                                                                                         | check bug        | Verify-only `-uiVerifyBoardDelayMs`; the cases hold 6 s, as `bounty_applicant_block` already did                       |
| 5   | Stale cases: swipe-based pull (`bounty_board_map_states`), the tile screen (`bounty_board_states`), the split applicant row and zh-first OCR (`bounty_applicants_worst`)                                  | stale            | Cases updated                                                                                                       |
| 6   | Replay guards read the call log once before NSUserDefaults flushed (`chat_image_failed`, three profile cases)                                                                                          | check bug        | Wait for the first call, then the quiet window                                                                      |
| 7   | The unpaid hint never shows when a saved draft opens the form; a focus-order fix was written, failed 3 of 3 and was reverted                                                                             | own gap          | Queue item; diagnosis next (an Alert presented during the sheet transition is the next suspect)                     |
| 8   | Saving a payee sheet crashed the app 3 times (SIGABRT in `UICollectionView _resignOrRebaseFirstResponderViewWithIndexPathMapping`, called from react-native-keyboard-controller's resignFirstResponder swizzle) | product bug      | Queue item; needs a device repro and a library-level decision                                                       |

## Notes

- An unpaced space from `axe type` repeated six times in the matrix (「see you.      at the lobby」). Sending words and spaces
  apart made every key drop in the fix round, so it was reverted; the cases stay intermittent. Tag `axe-space-repeat`.
- Rerun passes are reported as reruns, never as first-run passes.
