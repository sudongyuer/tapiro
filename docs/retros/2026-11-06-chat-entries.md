---
branch: feat/chat-entries
date: 2026-11-06
pr: chat entries and wrap-up (plan Tasks 7–8)
title: 发消息 and 群聊 entries, verify record reset, chat milestone run and the step 7 record
escaped: 0
rework: 5
interventions: 0
overturned: 0
---

# Retro: chat entries and wrap-up

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                       |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                         |
| Quality   | Vacuous checks          | 1 caught in review: `chat_entry_home` asserted no status screen after the tab had switched, where a stray push would be hidden |
| Quality   | Skipped verifications   | VoiceOver custom action on the home card, the toolbar hit area and the keyboard feel are device checks                         |
| Speed     | Wall-clock              | About 2 h; the milestone took 103 runs in about 35 min, plus reruns for dropped taps and automation-session timeouts                                                                                                                  |
| Autonomy  | Avoidable interventions | 0                                                                                                                               |
| Loop      | Minutes on this retro   | 5                                                                                                                               |

## Problems and root causes

| #   | What happened                                                                                                                                       | Root cause class  | Change and layer                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `chat-calls-stale`, third sighting: the app resets its record keys at launch but the plist lags, so a case reading early saw the last launch's calls | environment       | The runner and `bounty.relaunch` delete every record key before launch (`records.py`, code); `test_records` fails when the app gains a key the list misses (CI check)                 |
| 2   | `defaults delete app.tapiro <key>` from `simctl spawn` answers "Domain not found": the app's domain is its container plist                          | tool behaviour    | Delete by the container plist path (code, with a comment)                                                                                                                            |
| 3   | First entry cases checked 消息 selected while the thread hides the tab bar, and a 44 pt size on a system toolbar item whose AX frame is 36 pt         | own slip          | Selection checked after Back on the list; the toolbar item is the system's (check)                                                                                                    |
| 4   | Review (1 round): a disabled inner Pressable passes the touch to the card, so a second tap while looking up pushed the status screen; an open-state wait on an element the open state never renders; a lookup that navigated after the user left the tab | own gaps          | The pill stays enabled (code, with a comment); the open step waits on the title and reward; the hook checks focus before navigating or alerting; a worst-row check on home (check) |
| 5   | Seven ms runs timed out creating the automation session, and a dark `chat_block_peer` missed its spinner, while the load average was 30–144 (another project's Android emulator and iPhone Simulators were running) | environment       | Reran on two workers once the load fell to about 6; all passed. Tags `automation-session-timeout`, `axe-tap-drop` |
| 6   | `chat_block_refused` read the call log once after 2 s: with the stale entries gone, a lagging plist answered 0 calls (the old pass leaned on the previous launch's call) | own gap (latent check) | Four read-once checks now wait for the first call before checking that none followed (check); `chat_thread_failed`, `chat_report_failed`, `chat_image_states`, `chat_block_refused` |

## Notes

- The canvas (ChatPick2 126 A) drew 发消息 as a grey pill beside the main action; ride detail was not drawn, so 群聊
  went to the navigation bar and is listed for veto.
- Secondary pills in the status screen's pinned bar are translucent, so text scrolled under the bar shows through
  (already true of 有问题 before this change); left for the owner as an open question.
