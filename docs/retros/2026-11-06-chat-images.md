---
branch: feat/chat-images
date: 2026-11-06
pr: chat images (plan Task 5b)
title: Image messages with the ＋ menu, outbox files, the Quick Look viewer and a private bucket
escaped: 0
rework: 5
interventions: 0
overturned: 0
---

# Retro: chat images

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                                                  |
| Quality   | Vacuous checks          | 1 caught before it ran: the first `drawn()` counted dark pixels only, which the dark-mode placeholder fill would pass; it now needs both black and white |
| Quality   | Skipped verifications   | Camera capture, Quick Look gestures, pasting a copied photo and HEIC library picks are device checks; `chat_image_*` dark ran for zh-Hans only           |
| Speed     | Wall-clock              | About 4.5 h; about 40 min went to Simulator reruns (automation-session timeouts) and two case-timing fixes                                               |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                        |
| Loop      | Minutes on this retro   | 5                                                                                                                                                        |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                       | Root cause class  | Change and layer                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A storage probe script left a `bounty.applied` push and users in the local DB, so `live_push` test 23 failed on the next pgTAP run                                                                                  | own slip          | Probe rows removed; probes now belong inside a pgTAP transaction (rolled back), not against the shared local DB (rule: noted here, first sighting)                                                                                                                                                                        |
| 2   | `expo-file-system` `move()` is async while the outbox's drop is sync, so a delivered image could be deleted before it moved into the cache                                                                          | library behaviour | `moveSync` in both places (code); `chat_image_send` asserts the stored photo still draws, which fails if the file was dropped (check)                                                                                                                                                                                     |
| 3   | `chat_image_failed` light saw two `send` calls: the defaults plist still held the previous launch's call (`chat-calls-stale`, second sighting)                                                                      | environment       | The case filters calls by its own client id (check). Second sighting: the runner should clear `uiVerifyChatCalls` before launch; listed as follow-up                                                                                                                                                                      |
| 4   | Quick Look opened with its bars hidden on the Simulator, so the close button was not in the AX tree                                                                                                                 | library behaviour | The case taps the picture to show the bars first, as a person would (check)                                                                                                                                                                                                                                               |
| 5   | `chat_image_states` missed the loading state with a 4 s download delay (opening the thread took longer)                                                                                                             | own slip          | 12 s delay so one read lands inside it (check), the same fix as Task 6's block spinner                                                                                                                                                                                                                                    |
| 6   | `Tapiro Verify` timed out creating the automation session in six runs of one batch (load average 4–12)                                                                                                              | environment       | Reran on `Tapiro Verify 2`; all passed. Tag `automation-session-timeout`                                                                                                                                                                                                                                                  |
| 7   | An expected value in `imageSize.test.ts` was worked out wrong (100×72 for a 2:1 image grown to the 72 pt minimum)                                                                                                   | own slip          | Fixed to 144×72; the test caught it (check)                                                                                                                                                                                                                                                                               |
| 8   | One review round: 2 Important (a refused upload hid `blocked` / `notMember` and a stored message behind a generic failure; a storage SELECT gap that a real local upload had already disproved), 7 Minor; all fixed | own gaps          | The service asks `send_message` even after a refused upload (code, unit test); a reload that settles a sent photo keeps its file (code, unit test); a failed load is retryable even with a picture shown; the image cache drops answers after sign-out; prepare measures the decoded image; the sweep grace is seven days |

## Notes

- The canvas board (ChatPick2 124) decided the ＋ placement and that the camera is asked only on 拍照.
- `File.preview` in expo-file-system is Quick Look, so the viewer needed no kit code.
