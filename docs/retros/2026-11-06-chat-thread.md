---
branch: feat/chat-thread
date: 2026-11-06
pr: chat thread screen (plan Task 5)
title: Thread screen with item card, safety card, delivery states, native long-press menu and 已读
escaped: 0
rework: 3
interventions: 0
overturned: 0
---

# Retro: chat thread screen

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                               |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                                                 |
| Quality   | Vacuous checks          | 1 caught: `chat_thread_worst` first passed while the long bubble overlapped 已读; it now asserts 已读 sits below the bubble and failed before the fix   |
| Quality   | Skipped verifications   | Images (split to Task 5b); `en` runs for the new keys wait for the chat milestone; device checks (menu preview, VoiceOver, keyboard) listed in the plan |
| Speed     | Wall-clock              | About 4 h; about 40 min went to the SwiftUI bubble measuring short (1) and the glass card (2)                                                           |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                       |
| Loop      | Minutes on this retro   | 5                                                                                                                                                       |

## Problems and root causes

| #   | What happened                                                                                                                                                                                 | Root cause class  | Change and layer                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Bubbles as SwiftUI `Text` inside `@expo/ui` `ContextMenu` in a `matchContents` Host: a 2000-character message drew ~60 pt taller than the Host, over the next row                             | library behaviour | RN bubble inside a kit `ContextMenuView` (`UIContextMenuInteraction`), so Yoga measures the text (code); the worst case asserts the row below the bubble is not covered (check); noted in the plan |
| 2   | A glass item card floating over the transcript let long messages read through it                                                                                                              | own design        | The card is a fixed bar above the list (code); recorded in the defaults                                                                                                                            |
| 3   | The plan's Answers list says 120 A "dims while sending"; the canvas ★ the owner answered draws the WeChat spinner, no dimming                                                                 | spec drift        | Built as drawn; the discrepancy is a veto item in the plan and status (rule: read the canvas board, not only the Answers summary, before building a choice)                                        |
| 4   | The first run on a freshly booted second Simulator failed with "Timed out creating the simulator remote automation session" (twice), load average 36–49                                       | environment       | Reran on one Simulator and it passed; not a case fault. Tag `automation-session-timeout`                                                                                                           |
| 6   | One review round: 3 Important (no UI case for the failure states; mark-read while the app was backgrounded would show 已读 to the peer; the spinner check could not fail), 9 Minor; all fixed | own gaps          | `chat_thread_states` (check); mark-read gated on AppState `active` with a unit test (code); spinner rendered only when shown and its pixels asserted (check)                                       |
| 7   | `axe tap` on the item card was dropped once in a passing case set (the spike's known fault)                                                                                                   | environment       | The case falls back to a touch down/up after 8 s (check). Tag `axe-tap-dropped`                                                                                                                    |
| 5   | `ARGS` built with an f-string was rejected by the runner (must be a literal)                                                                                                                  | own slip          | Literal strings; the runner's check already caught it (check)                                                                                                                                      |

## Notes

- The canvas boards carry more detail than the Answers list (the 119 copy, 已读 with its time, the 127 ⋯ menu for Task
  6); read the board before each task.
