---
branch: feat/live-push-app
date: 2026-11-03
pr: live updates and push, step 2 (app)
title: One live channel, screen handlers, the offline line, push tokens and tap routing
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: live updates and push, step 2

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                                                    |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                                                                                      |
| Quality   | Vacuous checks          | 1 found in review: `live_applicants` passed whether or not the other-bounty signal reloaded; now the emitter records delivered steps and the `stream` fixture changes the header on any load |
| Quality   | Skipped verifications   | None: the four `live_*` cases ran in zh-Hans light after the review round, `live_applicants` and `live_home_card` also in `ms`                                                               |
| Speed     | Wall-clock              | About 3 h, then about 3 h for the review round (most of it on Simulator runs under load 50–100)                                                                                              |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                                                            |
| Loop      | Minutes on this retro   | 4                                                                                                                                                                                            |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                              | Root cause class                | Change and layer                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A sync still in flight at sign-out could re-register the token after the unregister: the epoch was read inside the queued task, after sign-out                                                                                             | async ordering                  | The epoch is captured when `sync` is called; a unit test signs out while a sync is pending                                                |
| 2   | `prettier --write docs` reformatted 27 unrelated docs                                                                                                                                                                                      | tool scope                      | Restored them; format only the files changed (already the global rule; the slip was a directory argument)                                 |
| 3   | Main moved mid-task (chat server #63), adding `chat.message`; the routing test, which reads every migration kind, would have failed on rebase                                                                                              | moving base                     | Rebased before docs; `chat.*` routes to the 消息 tab (★) and the test now expects it                                                      |
| 4   | `xcrun simctl push` cannot tap a banner, so the planned "tap from a recorded notification" case could not drive a real tap                                                                                                                 | platform limit                  | `-uiVerifyNoticeTap` replaces `getLastNotificationResponseAsync` at the boundary; README documents it                                     |
| 5   | The meet-up polling (175 B) the plan listed as Task 9 was already built in carpool step 5                                                                                                                                                  | plan drift                      | Ticked with a pointer to `shouldPoll`; nothing added                                                                                      |
| 6   | [smoke-shell-tabs] Smoke `shell_tabs` failed: the 问小貘 tab is 104 × 54 pt in the bar, not the 62 pt search button. Main (048e680), built and run on the same Simulator, fails the same way; the SDK 58 upgrade branch passes on iOS 27.2 | environment (iOS 27.2 + SDK 57) | None here; the SDK 58 upgrade fixes it. One rerun started while another agent's run was active, against the pgrep rule; later runs waited |
| 7   | Review I1: the home, payment and settled stores applied whichever reload answered last, so a slow older answer could overwrite a newer one                                                                                                 | async ordering                  | A request counter in each store; a unit test per store resolves two reloads in reverse order                                              |
| 8   | Review I2: a failed pay-sheet refetch after a signal kept showing the old data as live                                                                                                                                                     | data integrity                  | `refreshFailed` and `loadedAt` on the sheet state, the 「可能不是最新 · 时间」 line; unit test                                            |
| 9   | Review I3: `live_applicants` could not fail on the ignored signal (vacuous)                                                                                                                                                                | check design                    | Delivered steps and load counts recorded with a per-launch run id; header-based proof with the `stream` set                               |
| 10  | Review I4: the tap case routed to a ride the fixture does not know and waited only for the screen container                                                                                                                                | check design                    | Fixture id `ride-airport`; each step waits for an element that exists only once loaded                                                    |
| 11  | [prefs-lag] The cases read NSUserDefaults through the plist, which lagged by seconds and still held the previous launch: stale steps and load counts failed three runs                                                                     | check design                    | Records carry `-uiVerifyLiveRun <id>`; cases relaunch with a fresh id and poll until the values agree                                     |
| 12  | The launch loads the applicant list twice (mount, then the app turning active), sometimes 10–20 s late under load, which broke a check that assumed one load before the first signal                                                       | check design                    | Signals start at 30 s; the case waits until the header and loads settle; the home fixture changes only for loads 18 s after launch        |
| 13  | A scroll before the offline phase hid the 「可能不是最新」 section from the accessibility tree                                                                                                                                             | check design                    | The row-order check moved to the end of the case                                                                                          |
| 14  | [axe-session-timeout] Two runs failed with "Timed out creating the simulator remote automation session" at load average 93–101                                                                                                             | environment                     | Reran; recorded the load average with each failure                                                                                        |
| 15  | A `pgrep -f verification/ui/run.py` wait loop matched its own shell and never ended                                                                                                                                                        | tool use                        | Call `run.py` directly; it serialises on `/tmp/ios-ui-verify.lock`                                                                        |

## Notes

- The Realtime client already calls `realtime.setAuth` on `TOKEN_REFRESHED` (`_handleTokenChanged`), so the
  transport sets it once before each join and has no refresh listener of its own.
- A closed channel is not rejoined by the client, so the layer reopens it with backoff; errored and timed-out channels
  are left to the client's own rejoin timer.
- Push registration is a no-op until the EAS `projectId` exists (step 3); the verify build records the RPC calls.
