---
title: Live Activities by push, and the extension in release builds
status: proposed
created: 2026-11-26
approved:
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Builds on: docs/plans/2026-11-11-live-activity-spike.md (Tasks 6–8, L6, W1–W11, 274–278 A) and
docs/specs/2026-11-20-apns-direct-design.md (its 「Don't do」: Live Activity pushes). Story: home.live-activity.release. -->

## Problem

The Live Activity (bounty on the way, ride 集合) was built and tried locally, but 278 A kept it out of release builds
until push could update it: without push a locked phone keeps 「约 6 分钟到」 until the stale date and never sees the
helper arrive. `plugins/withLiveActivity.js` generated the extension only with `TAPIRO_LIVE_ACTIVITY=1`, which
`scripts/release-env.sh` cleared, so no TestFlight build had it. Push now delivers on hosted (`APNS_*` set, deliveries in
`push_queue`), so the remaining work is the Live Activity half of push (plan Tasks 6–8) and shipping the extension.

## Goals and scope

**Do**

- With Tapiro closed, a running activity follows the item: the minutes count down, an ETA change or 我到了 shows within
  seconds, 完成 / 出发 show the final step for 15 minutes, a cancel removes it at once.
- With Tapiro closed, the activity starts by push when the item enters `en_route` (poster) or 集合 (accepted crew).
- The widget extension is in every build, and the release scripts fail if it is missing.

**Don't do**

- Broadcast channels (`input-push-channel`): they need the Broadcast capability enabled on developer.apple.com, an
  account change, and a channel per item.
- `NSSupportsLiveActivitiesFrequentUpdates`: one update a minute at priority 5 does not count against the budget.
- Rendering the minutes in the widget with `Text(timerInterval:)`: it changes the drawn 「6 分」 (plan, Open).
- Any in-app screen change.

## Decisions

★ = decided by the agent under the owner's delegation (2026-11-17), listed for veto.

| Decision                    | Choice                                                                                                                                                                                                                                                                                                                                                                                       | Why                                                                                                                                                                                        | Alternatives considered                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| LP1 Token storage ★         | New tables: `live_activity_devices` (one row per install: device-key hash, push-to-start token, environment, language, time zone, clock) and `live_activity_tokens` (one row per activity: update token, link, last content sent)                                                                                                                                                            | Activity tokens live per activity and arrive without a session; push-to-start tokens are per install; neither fits `push_tokens`' one-token-per-device row                                 | A `kind` column on `push_tokens`: mixes three lifecycles in one table                          |
| LP2 Native attach ★         | The kit observes `Activity.activityUpdates` and each activity's `pushTokenUpdates` from an app-delegate subscriber and posts the token to `attach_live_activity_token(device_key, token, link)` with the anon key; the device key is 32 random bytes in the Keychain (after first unlock, this device only), the server stores its SHA-256                                                   | iOS wakes the app for a push-started activity without connecting a scene, so React Native never starts and JavaScript cannot register the token; the key, not a session, names the account | JS-only registration: a push-started activity could not be updated until Tapiro is opened      |
| LP3 Content on the server ★ | `notify` composes the same `ContentState` as the app, in each device's language, time zone and 12/24-hour clock; the copy is mirrored in `notify/liveActivityCopy.ts` and a Bun test compares both copy and output with the app's                                                                                                                                                            | The widget shows ready-made strings in the in-app language (V9); an Edge Function cannot import `src/`                                                                                     | Raw timestamps formatted by the widget: changes V9 and the drawn look                          |
| LP4 Countdown ★             | `live-activity-tick` (pg_cron, every minute) queues every account with a running activity; `notify` sends an update at priority 5 when the content changed. Events (`bounty.*`, `ride.*`) queue the recipient at once and send at priority 10                                                                                                                                                | Keeps the drawn 「6 分」 counting down with the phone locked; priority 5 does not count against the ActivityKit budget                                                                     | `Text(timerInterval:)`: the owner's open question, not needed now                              |
| LP5 Push-to-start ★         | Plan Task 8 is built: with Tapiro closed, the activity starts by push for the same triggers as 275 A (poster at `en_route`, accepted crew at 集合), `input-push-token: 1`, with the alert Apple requires: the Lock Screen title and second line, no sound                                                                                                                                    | The poster is rarely in Tapiro when the helper sets off, so 275 A alone would almost never show the activity; the ordinary 「出发了」 push already sounds                                  | No push-to-start (275 A to the letter): the activity appears only if Tapiro happens to be open |
| LP6 One at a time, once ★   | Per device: a running activity blocks a start, and so does an item push-started in the last 10 minutes whose token has not arrived; the start goes to the item due soonest (ties to the bounty, W5). `live_activity_started` records every push-started or attached item, with the content it started with, so an activity the user swiped away is never started again (W6); rows live a day | Mirrors W5 and W6 on the server                                                                                                                                                            | —                                                                                              |
| LP7 Ending ★                | The final step (完成, 出发) is an `end` with its content and `dismissal-date` 15 minutes after it happened (277 A, W1); an item that is gone (cancel, block, left behind) is an `end` dismissed at once, carrying the last content sent                                                                                                                                                      | Same outcomes as the app's plan                                                                                                                                                            | —                                                                                              |
| LP8 Only delivered counts ★ | `finish_live_activity_work` records only what APNs accepted (content, ends, starts); a failure is tried again by the next tick; `410` / `Unregistered` drops the activity token or clears the start token; work whose version moved during a run is claimed again in the same run                                                                                                            | Never show an undelivered update as sent (Data integrity)                                                                                                                                  | Record on send: hides failures                                                                 |
| LP9 Extension always on ★   | `withLiveActivity` no longer reads `TAPIRO_LIVE_ACTIVITY` (L6 said the flag goes with push); `check_bundle` fails a release build without `PlugIns/TapiroLiveActivity.appex` or `NSSupportsLiveActivities`                                                                                                                                                                                   | 278 A's condition (push) is met                                                                                                                                                            | Keep the flag and set it in `release-env.sh`: two switches for one thing                       |
| LP10 Device hygiene ★       | A device signed in as another account drops the previous account's activity tokens; sign out ends every Tapiro activity on the phone (also one started by push and never read) and deletes the device row by its key, which works with an expired session; at most 10 devices per account and 20 tokens per device; tokens older than 12 hours (the system maximum) are purged by the tick   | A shared phone must not keep showing, or keep receiving, the previous account's items                                                                                                      | Unregister with the session: fails when it has expired                                         |
| LP11 Local start ★          | The app starts with `pushType: .token`; if that request fails, it starts without push                                                                                                                                                                                                                                                                                                        | A build without the push entitlement still shows the activity                                                                                                                              | —                                                                                              |
| LP12 Kit retries ★          | A token the server could not attach (device not registered yet, offline) is kept in memory and sent again after every registration sync; an activity the user dismisses, or that ends, detaches its token (`detach_live_activity_token`)                                                                                                                                                     | Keeps a first-sign-in activity updatable and stops pushes to an activity nobody sees                                                                                                       | —                                                                                              |

## Data flow and ownership

App (signed in, foreground): `LiveActivity.pushSetUp(url, anonKey)` returns the device key and the push-to-start token
→ `register_live_activity_device` (also on language change, return to foreground and a new start token). Kit (any
launch, including a background wake): each activity's update token → `attach_live_activity_token` (anon).

Database: an `events` row for a recipient with a registered device queues `live_activity_due` (urgent) and pokes
`notify`; `run_live_activity_tick` queues accounts with running activities and accounts with an unstarted item. `notify`
claims work (`claim_live_activity_work`: the account's subjects from `private.live_activity_subjects_for`, its devices and
tokens, its started items), plans per device (`liveActivityPlan.ts`), posts to APNs with topic
`app.tapiro.push-type.liveactivity` and push type `liveactivity`, and records the outcome
(`finish_live_activity_work`).

## Errors and degradation

| Failure                                     | User sees                                   | System does                                                                   |
| ------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| APNs down, 429, 5xx                         | The last content, then the stale look (L4)  | Nothing recorded; the next minute's tick sends again                          |
| Activity token gone (`410`, `Unregistered`) | Nothing (the activity has ended)            | Token dropped                                                                 |
| Start token gone                            | No push-started activity on that device     | Start token cleared until the app registers a new one                         |
| The kit's attach fails (offline at wake)    | A push-started activity that stops updating | Three tries; the stale date takes over; the app's plan updates it when opened |
| A subjects row cannot be read               | The activity stays as it is                 | No end, no start for that device (W8)                                         |
| Secrets missing on hosted                   | No remote updates                           | Every Live Activity push fails as `apns_not_configured`                       |

## UI/UX and motion

None in the app. The Lock Screen and Dynamic Island views are unchanged (Task 4 boards). New for the user: an activity
can start while Tapiro is closed, announced by a silent alert with the Lock Screen's two lines (LP5).

## Known limits

- A start by push and a start by the open app at the same moment make two activities; the app's plan ends the second
  when Tapiro next runs (`kept` in `plan.ts`), and only the newer token is updated meanwhile.
- A dismissal detaches its token only if iOS gives the app time to run; otherwise updates go to the dismissed activity
  (ignored by iOS) and block a new push-start on that device until the item ends or 12 hours pass.
- An item that is gone before any update was accepted is ended without `content-state` (nothing was recorded to send).
- Priority 5 updates are delivered when the system chooses; the minutes can lag by a minute or two.
- Unverified on a device: push-to-start, the background attach, the consent prompt and the stale look (spike C).

## Implementation order

1. Migration `20261126000100_live_activity_push.sql` and pgTAP `live_activity_push.test.sql`.
2. `notify`: `apns.ts` transport for both push types, `liveActivityCopy.ts`, `liveActivityContent.ts`,
   `liveActivityPlan.ts`, `liveActivityRound.ts`; unit tests; stack test `notify-live-activity.integration.ts`.
3. Kit: `LiveActivityPush.swift`, `TapiroKitAppDelegate.swift`, `pushType: .token`, `liveActivity.ts` facade.
4. App: `src/lib/live-activity/push.ts` and `pushInstance.ts`, wired into `useLiveActivities` and sign out.
5. `withLiveActivity` without the gate; `check_bundle` checks the extension; a Release archive.

## Verification

- `bun test`, `bun run test:deno`, pgTAP on a fresh stack, the stack test `notify-live-activity.integration.ts`.
- A Release archive with the extension embedded and signed for team `4RML7RLKML` (not uploaded here).
- Device (TestFlight): sign in as A, lock the phone; B starts A's bounty → the activity appears on A's Lock Screen with a
  silent banner; B changes the ETA → it updates; the minutes count down with the phone locked; B taps 完成 → 「B 到了」
  stays 15 minutes; a second bounty cancelled while running → the activity leaves at once. Repeat for a ride at 集合.

## Implementation Record (2026-11-26)

PR: not opened yet · Commits: see the PR (branch `feat/live-activity-push`)

### What was built

- Tables, device registration, the session-free attach / detach / unregister, the event trigger, the minute tick and the
  claim / finish protocol. Evidence: `supabase/migrations/20261126000100_live_activity_push.sql`.
- `notify` plans and sends Live Activity pushes after the ordinary ones, with content composed per device. Evidence:
  `supabase/functions/notify/liveActivityPlan.ts`, `liveActivityContent.ts`, `liveActivityCopy.ts`,
  `liveActivityRound.ts`, `apns.ts` (`apnsSenders`, topic `app.tapiro.push-type.liveactivity`), `handler.ts`, `index.ts`.
- The kit requests activities with `pushType: .token`, watches activity and push-to-start tokens from an app-delegate
  subscriber and attaches them natively. Evidence: `modules/tapiro-kit/ios/LiveActivity/LiveActivityPush.swift`,
  `TapiroKitAppDelegate.swift`, `LiveActivities.swift`, `expo-module.config.json`, `modules/tapiro-kit/liveActivity.ts`.
- The app registers the device and removes it at sign out; sign out ends every activity. Evidence:
  `src/lib/live-activity/push.ts`, `pushInstance.ts`, `instance.ts`, `controller.ts`, `src/features/account/services.ts`.
- The extension is in every build; release checks require it with matching versions. Evidence:
  `plugins/withLiveActivity.js`, `scripts/release-env.sh` (`check_bundle`).

### Deviations from the design

| Design said                                                | Shipped                                             | Why                                                                                    | Confirmed by                                 |
| ---------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| Plan 275 A: starts automatically when Tapiro is open       | Also starts by push while Tapiro is closed (LP5)    | Plan Task 8 offered push-to-start; without it the activity rarely appears              | Owner delegation 2026-11-17; listed for veto |
| Plan W7: in the background the minutes hold until push     | A minute tick sends the minutes at priority 5 (LP4) | Keeps the drawn look without `Text(timerInterval:)`                                    | Owner delegation 2026-11-17; listed for veto |
| Plan W11: sign out ends only activities the wiring started | Sign out ends every Tapiro activity                 | A push-started activity not yet adopted would stay on a signed-out phone's Lock Screen | Review finding, 2026-11-26; listed for veto  |

### Bugs fixed during implementation

- **Symptom:** the migration applied but every device registration failed with 「invalid repetition count(s)」.
  **Root cause:** Postgres caps a regex bound at 255 (`{64,400}`). **Fix:** `{64,}` plus a `char_length` limit.
- **Symptom:** `attach_live_activity_token` failed with 「column reference "token" is ambiguous」. **Root cause:** the
  parameter shares the column's name. **Fix:** `on conflict on constraint live_activity_tokens_pkey`.
- **Symptom:** the first Release archive embedded the extension at version 1.0 beside the app's 1.0.0. **Root cause:**
  the plugin copied the app target's `MARKETING_VERSION`, which Expo leaves at 1.0. **Fix:** `config.version`, and
  `check_bundle` compares both version keys.
- **Symptom (review round):** a push-started activity survived sign out; an expired session left the device
  registered; a token attached before registration was lost; a second push-start could precede the first token; minute
  updates stayed at priority 10 after an event; a timed-out finish could clear a newer claim. **Fix:** LP6, LP10, LP12,
  the claim clearing `urgent`, `claimed_version`.

### Verification

- `bun test` → all pass after the fixes (a lifetime entry added for `liveActivityPush` in `sessionLifetimes.test.ts`).
- `bun run test:deno` notify subset (`apns`, `config`, `liveActivityPlan`, `liveActivityRound`) → pass.
- Fresh isolated stack: `supabase test db` → 74 files, 2371 tests, PASS before the review fixes;
  `live_activity_push.test.sql` (37 tests), `live_activity_subjects`, `edge_function_grants` → PASS after them.
- Stack tests through `supabase functions serve` with the mock APNs: `notify-live-activity.integration.ts` (push-start,
  attach without a session, update, end on 完成) and `notify-apns.integration.ts` → pass.
- Release archive (`generic/platform=iOS`, ASC key, not uploaded): `PlugIns/TapiroLiveActivity.appex`,
  `app.tapiro.LiveActivity`, TeamIdentifier `4RML7RLKML`, versions equal to the app's, `check_bundle` passes; automatic
  signing created the App ID and profile.
- `bun run verify:smoke` → 4 / 4 pass (zh-Hans light) on a verify build that carries the extension.

### Known limits

- Unverified: delivery to a real device (push-to-start, background attach, the consent prompt, priority-5 timing);
  plan Task 9 on a TestFlight build.
- Spec stays `proposed`: only the owner moves a spec to `approved` (AGENTS.md).
