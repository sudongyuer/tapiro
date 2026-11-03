---
branch: feat/live-push-app
date: 2026-11-03
pr: live updates and push, step 2 (app)
title: One live channel, screen handlers, the offline line, push tokens and tap routing
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: live updates and push, step 2

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                                                                              |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                                                                                                                |
| Quality   | Vacuous checks          | 0 by design: the routing test reads every kind from the migrations, so a new kind without a route fails; the UI cases assert the state before the emitter's signal and fail when the first read comes too late to tell |
| Quality   | Skipped verifications   | The four `live_*` UI cases are written, not run (Pace: they run with the feature's milestone); smoke ran once                                                                                                          |
| Speed     | Wall-clock              | About 3 h                                                                                                                                                                                                              |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                                                                                      |
| Loop      | Minutes on this retro   | 4                                                                                                                                                                                                                      |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                              | Root cause class                | Change and layer                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A sync still in flight at sign-out could re-register the token after the unregister: the epoch was read inside the queued task, after sign-out                                                                                             | async ordering                  | The epoch is captured when `sync` is called; a unit test signs out while a sync is pending                                                |
| 2   | `prettier --write docs` reformatted 27 unrelated docs                                                                                                                                                                                      | tool scope                      | Restored them; format only the files changed (already the global rule; the slip was a directory argument)                                 |
| 3   | Main moved mid-task (chat server #63), adding `chat.message`; the routing test, which reads every migration kind, would have failed on rebase                                                                                              | moving base                     | Rebased before docs; `chat.*` routes to the 消息 tab (★) and the test now expects it                                                      |
| 4   | `xcrun simctl push` cannot tap a banner, so the planned "tap from a recorded notification" case could not drive a real tap                                                                                                                 | platform limit                  | `-uiVerifyNoticeTap` replaces `getLastNotificationResponseAsync` at the boundary; README documents it                                     |
| 5   | The meet-up polling (175 B) the plan listed as Task 9 was already built in carpool step 5                                                                                                                                                  | plan drift                      | Ticked with a pointer to `shouldPoll`; nothing added                                                                                      |
| 6   | [smoke-shell-tabs] Smoke `shell_tabs` failed: the 问小貘 tab is 104 × 54 pt in the bar, not the 62 pt search button. Main (048e680), built and run on the same Simulator, fails the same way; the SDK 58 upgrade branch passes on iOS 27.2 | environment (iOS 27.2 + SDK 57) | None here; the SDK 58 upgrade fixes it. One rerun started while another agent's run was active, against the pgrep rule; later runs waited |

## Notes

- The Realtime client already calls `realtime.setAuth` on `TOKEN_REFRESHED`; the transport sets it explicitly before
  joining (Realtime Authorization docs) and again on refresh, which is harmless.
- A closed channel is not rejoined by the client, so the layer reopens it with backoff; errored and timed-out channels
  are left to the client's own rejoin timer.
- Push registration is a no-op until the EAS `projectId` exists (step 3); the verify build records the RPC calls.
