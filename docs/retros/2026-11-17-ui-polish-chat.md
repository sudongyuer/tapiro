---
branch: fix/ui-polish-chat
date: 2026-11-17
pr: UI polish audit, 消息 and chat (CHAT-1 to CHAT-6)
title: six audit findings fixed; the round stopped on two cases that measured the read time, not the bubble
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: UI polish, 消息 and chat (2026-11-17)

Fixes from the UI audit of 2026-11-16 for the chat thread. The first session ran out of quota after the runs; a second
agent finished the branch.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                   |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                           |
| Quality   | Vacuous checks          | 0; the bubble-position checks failed on the first build and, once measured from the bubble above, still fail on a 3 pt jump |
| Quality   | Skipped verifications   | CHAT-4 (8 pt cut under the item card) has no assertion; checked on the screenshot. No device run                            |
| Speed     | Wall-clock              | Second session about 30 min; about 25 min of it waiting for the shared Simulator lock                                       |
| Autonomy  | Avoidable interventions | 0                                                                                                                           |
| Loop      | Minutes on this retro   | 5                                                                                                                           |

## What happened

| #   | What happened                                                                                                                                                                                               | Root cause class | Change and layer                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| 1   | `chat_thread_sending` and `chat_thread_failed` failed on every run: the bubble "moved" 20 pt once stored. The 已读 time under the earlier message goes when the new one is stored and shifts the transcript | check design     | The cases measure the bubble from the peer bubble above it; both pass in light and dark |
| 2   | `chat_block_peer` lost the AXe automation session once and passed on the runner's retry                                                                                                                     | outside          | None; tag `axe-session-lost`                                                            |

## Carry forward

- A "did not move" assertion in a list measures against a neighbour, not the screen: anything above it may change
  height for reasons outside the change.
