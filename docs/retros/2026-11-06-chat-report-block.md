---
branch: feat/chat-report-block
date: 2026-11-06
pr: chat report and block (plan Task 6)
title: Report sheet, thread ⋯ menu, blocked footer, refused sends and folded group messages
escaped: 0
rework: 4
interventions: 0
overturned: 0
---

# Retro: chat report and block

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                                 |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                                                                   |
| Quality   | Vacuous checks          | 0 found; the picker rows' VoiceOver labels were wrong and the worst case caught it                                                                                        |
| Quality   | Skipped verifications   | Device checks (sheet keyboard, menu VoiceOver order); the local pgTAP `rides_schema` test 39 fails on rows left in the local DB (3 old `ride_events`), not on this change |
| Speed     | Wall-clock              | About 3.5 h; about 45 min went to Simulator reruns (automation-session timeouts on one Simulator) and the sheet crash                                                     |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                                         |
| Loop      | Minutes on this retro   | 5                                                                                                                                                                         |

## Problems and root causes

| #   | What happened                                                                                                                                             | Root cause class  | Change and layer                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `accessibilityLabel` on the SwiftUI `Picker` was applied to every inline row, so all four reasons read as the section header                              | library behaviour | Label removed; the section header names the picker (code); the worst case reads each reason by its label (check)                    |
| 2   | The app aborted in `UICollectionView _resignOrRebaseFirstResponder` when the Form rebuilt after 提交 with the note field focused                          | library behaviour | 提交 dismisses the keyboard first (code, with a comment); `chat_report_message` pastes a note and submits in light and dark (check) |
| 3   | Peer bubbles are keyed by message id, own ones by client id; the group case first looked for the fold under the client id                                 | own slip          | Case fixed; the key rule is in `threadModel.ts`                                                                                     |
| 4   | A fold row with `flexWrap` drew its text at the top of a 76 pt pill                                                                                       | own design        | No wrap; the text shrinks inside the row (code); checked in ms, the longest copy                                                    |
| 5   | `Tapiro Verify` timed out creating the automation session in four of seven runs (load average 25–48); a later two-worker run also saw two stale call logs | environment       | Reran on the other Simulators and on one worker; all passed. Tags `automation-session-timeout`, `chat-calls-stale`                  |
| 6   | Header-menu items stay in the AX tree after the menu closes, so "menu closed" waits on labels never pass                                                  | library behaviour | Cases wait for rest instead (check)                                                                                                 |

## Notes

- The canvas boards decided the details the Answers list does not carry: the 「你屏蔽了小林 · 解除」 footer, 「消息发不出去」 on
  the blocked side, and 看详情 / 举报 / 屏蔽 in that order.
- `chat-calls-stale` is a first sighting: if it recurs, look at whether `uiVerifyChatCalls` is reset before the first
  read on a reused Simulator.
