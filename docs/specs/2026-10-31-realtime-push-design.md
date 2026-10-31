---
title: Live updates and push notifications (bounty first, then chat and carpool)
status: approved
created: 2026-10-31
approved: 2026-10-31
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Builds on: foundation (push row, push_tokens, notify) and bounty (freshness rule). Read by: chat plan Task 3,
carpool redesign. Canvas: questions 170–175 (151–162 belong to other sessions). Questions 171–175 come from tapiro-86's proposal in canvas thread df5f92ca. -->

## Problem

Nothing in Tapiro updates while it is on screen, and nothing reaches a user whose app is closed. Bounty v1 loads on app
open, on returning to the foreground, on tab focus and on pull-to-refresh (bounty spec, Decisions "Freshness"). There is
no Realtime subscription in `src/` and no push code. So a poster learns of a new applicant, an applicant learns they
were chosen, and a poster learns that 小林 tapped 完成 only by pulling down or reopening.

The user's ruling (canvas thread on question 114, 2026-10-31): 「需要系统通知和应用内都有实时更新」. Both are needed. Carpool
needs this most: during 集合 and 上车, other riders' 「我到了」 must arrive within seconds. Chat needs it for every
message.

## Goals and scope

**Do**

- One shared layer for live updates in the app, used by bounty now and by chat and carpool when they are built.
- Push notifications for the events that need the user's attention, sent from the server through one `notify` path.
- Split by what is possible today:
  - **Build now:** live updates, the token table, the permission flow, and `notify` behind a fake sender.
  - **Needs the paid Apple Developer account:** the APNs key, real delivery, and device acceptance.
- Keep the freshness rule as the fallback, so a missed live event never leaves a screen wrong for longer than v1 does today.

**Don't do**

- Live Activity (foundation step 9 keeps it; it needs the same account).
- Live pins on the board map for other people's new bounties. The board stays on the freshness rule. Reason: everyone
  nearby would subscribe to everything, which is the scaling case Supabase warns about.
- Rejected alternatives:
  - Postgres Changes on the tables. It checks RLS once per subscriber for every change, on one thread. It also cannot
    apply RLS to deletes. And it would duplicate the status logic that the read RPCs own (`private.bounty_status_for`).
  - Row payloads over Broadcast (`realtime.broadcast_changes`). They would bypass the read RPCs' shaping and leak
    columns the reader may not see, such as the exact address before selection.
  - Polling while a screen is open. It costs battery and server load, and is still seconds behind.
  - Direct APNs. Expo Push already handles tokens and receipts (foundation decision).

## Decisions

| Decision           | Choice                                                                                                                                                                                                     | Why                                                                                                                                                                                                                    | Alternatives considered                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Transport          | Supabase Realtime **Broadcast from the database**, on private channels                                                                                                                                     | Supabase's recommended method "for scalability and security"; a message is sent once per topic, not authorised per row per subscriber (Realtime docs, "Subscribing to database changes" and "Postgres Changes" limits) | Postgres Changes: simpler, but scales with subscribers and skips RLS on deletes |
| Payload            | A signal, not data: `{kind, id, at}` with IDs only. The client then refetches through the existing read RPCs                                                                                               | One source of truth for what a reader may see; the same rule as push payloads (IDs only, under `body`)                                                                                                                 | Row images: leak risk and duplicated logic                                      |
| Topics             | One per user: `user:<uid>`. Chat adds `thread:<id>` only for the open thread if typing or read state needs it later                                                                                        | One subscription per signed-in app; the policy is one comparison with `realtime.topic()`                                                                                                                               | One topic per bounty or ride: many joins, membership policies per row           |
| Authorisation      | An RLS select policy on `realtime.messages`: `extension = 'broadcast' and realtime.topic() = 'user:' \|\| auth.uid()`; "Allow public access" off                                                           | Realtime Authorization docs; policies are cached per connection, which is safe because a user topic never changes owner                                                                                                | Membership tables per topic: unneeded with user topics                          |
| Fan-out            | Each server transition that changes what another person sees inserts one row per recipient into `public.events` (outbox) in the same transaction. A trigger on `events` calls `realtime.send` for that row | The transition functions already know the recipients, such as poster, applicants and chosen helper. One outbox feeds both live updates and push, so the two never disagree                                             | Triggers on every table: recipients are hard to know there                      |
| Push trigger       | `events` rows with `push = true` are sent by the `notify` Edge Function (database webhook on insert). It reads the recipients' tokens and calls Expo Push                                                  | One path; push is decided per event kind in one table                                                                                                                                                                  | A push call inside each RPC: scattered, and blocks the transaction              |
| Missed events      | No replay. On (re)connect, on foreground and on tab focus the app refetches what is on screen, which is the freshness rule unchanged                                                                       | Broadcast replay keeps only 25 messages for 72 h and is a newer feature; a refetch is always correct                                                                                                                   | Replay with `since`: partial, and still needs the refetch                       |
| Push copy          | Built on the server in the recipient's app language, stored as `push_tokens.language`, which the app updates when the language changes                                                                     | Expo Push needs final text; the app language can differ from the system's                                                                                                                                              | Generic text with no language: worse, and still needs zh/en/ms                  |
| Permission         | As foundation: provisional after onboarding; the explicit prompt right after the first post or the first application                                                                                       | Foundation "Notifications and Live Activities"                                                                                                                                                                         | —                                                                               |
| Tap routing        | `body` carries `{kind, id}`; the app maps each kind to a route. A cold start reads `getLastNotificationResponseAsync()`                                                                                    | AGENTS.md: custom data under `body`; Expo Notifications docs                                                                                                                                                           | Deep-link URLs: the custom scheme prompt (AGENTS.md incident)                   |
| Account-free build | `notify` has a sender interface: `ExpoSender` (needs the account and the EAS project's APNs key) and `RecordingSender`, which writes to a table that pgTAP and UI cases read                               | Everything except delivery can ship and be tested now                                                                                                                                                                  | Wait for the account: blocks bounty, chat and carpool                           |

## Events

Bounty kinds and their recipients. Push follows question 170 A:

| Kind                   | Recipient                    | Live | Push |
| ---------------------- | ---------------------------- | ---- | ---- |
| `bounty.applied`       | poster                       | yes  | yes  |
| `bounty.withdrawn`     | poster                       | yes  | no   |
| `bounty.selected`      | chosen helper                | yes  | yes  |
| `bounty.not_selected`  | other applicants             | yes  | no   |
| `bounty.started` / ETA | poster                       | yes  | yes  |
| `bounty.completed`     | poster                       | yes  | yes  |
| `bounty.issue`         | the other party              | yes  | yes  |
| `bounty.cancelled`     | the other party / applicants | yes  | yes  |
| `bounty.expired`       | poster                       | yes  | no   |
| `payment.marked_paid`  | payee                        | yes  | yes  |
| `payment.not_received` | payer                        | yes  | yes  |
| `payment.settled`      | payer                        | yes  | no   |

Chat adds `chat.message` (members other than the sender; push yes). Carpool adds join request, approve and decline,
organiser cancel, seat count, ride status, 「我到了」 (riders of that ride; push no, live within seconds) and the
n−1 settles.

The recommended push set follows one rule: push when the recipient **must act** (new applicant, chosen, confirm the
payment) or **is waiting** (helper set off, ETA changed, done, issue, cancelled). Everything else is live-only.

## Questions (canvas 170–175)

Answered by the user in canvas thread df5f92ca on 2026-10-31 (「同意」 to the five-point proposal):

- **170 Which events push: A.** Must-act and waiting only. Pushes are grouped per bounty or ride, with quiet hours
  23:00–08:00 (except the ride you are on).
- **171 Where live updates apply: A.** Only where someone is waiting: the status page, the applicant list, the ride
  meet-up, chat, and home cards and badges. The nearby board stays on the freshness rule.
- **173 Time-based reminders: A.** Local notifications scheduled on the device, buildable now without the account.
- **174 Live Activity: A.** For bounty `en_route` and ride 集合, in the account half (foundation step 9).

Answered by the user in the main session on 2026-10-31 (「172B 175B」):

- **172 What a dropped connection shows: B.** A small 「可能不是最新」 line while disconnected. A, nothing until a
  refetch fails, was not chosen.
- **175 Polling fallback during ride 集合: B.** Poll every 15 s while the meet-up screen is open within 15 minutes of
  departure, because a silent drop there leaves people waiting.

Not a question for the canvas: push, Live Activity, in-app purchase and TestFlight all wait on the paid Apple Developer
account. That is the user's call.

## Data flow and ownership

```
RPC transition (publish_bounty, apply, select_helper, …)
  └─ insert public.events (recipient, kind, subject_id, push)  ── same transaction
       ├─ trigger → realtime.send(topic 'user:<recipient>', event kind, payload {kind,id,at}, private)
       └─ webhook (push = true) → Edge Function notify → push_tokens → Sender (Expo | Recording)

App (src/lib/live/)
  one private channel 'user:<uid>' per signed-in session, after supabase.realtime.setAuth()
  └─ dispatch by kind → the owning feature store's reload(id)   (liveStore, applicants, status, payments, chat…)
  on SUBSCRIBED after a drop, on foreground, on focus → reload what is on screen
```

- `src/lib/live/` owns the channel and the reconnect. Features register a handler for their kinds and never open
  channels themselves, so `features/` still do not import each other.
- `events` rows are server-only: no client insert or select. A scheduled job deletes them after 7 days.
- Verify mode replaces the channel with a fixture emitter (`-uiVerifyLive <script>`) at the boundary, like the other
  services.

## Errors and degradation

| Failure                                 | User sees                                                            | System does                                                  |
| --------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Channel not connected or dropped        | Nothing new; screens behave as v1 (pull, foreground, focus)          | Reconnect with the client's backoff; refetch on `SUBSCRIBED` |
| Signal arrives, refetch fails           | The screen keeps the last data with its existing 「几点的数据」 note | No automatic write; the next signal or pull retries the read |
| Push denied or provisional              | Live updates and in-app badges still work                            | Tokens are only stored when authorised or provisional        |
| Expo receipt says `DeviceNotRegistered` | —                                                                    | `notify` deletes that token                                  |
| `notify` fails                          | —                                                                    | The event row keeps `push_error`; no retry storm, one retry  |
| Account not set up (today)              | No system notifications                                              | `RecordingSender` only                                       |

## UI/UX and motion

The visible parts are small, but they are UI choices. Per Pace they go on the canvas before implementation: question
170–175 on page 「05 悬赏」.

### Screens and states

| Screen                                    | Design board | States to cover                                                                    |
| ----------------------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| Notification text (zh, en, ms)            | Q170 board   | each push kind; long names and titles (ms); grouped per bounty (thread id)         |
| Home cards and applicant list on a signal | Q170 board   | a new applicant arrives while the list is open; a card changes state while visible |
| Explicit permission prompt moment         | foundation   | after the first post, after the first application                                  |

### Motion

| Motion                      | Purpose (one word) | Trigger     | Duration token | Haptic / sound | Reduce Motion |
| --------------------------- | ------------------ | ----------- | -------------- | -------------- | ------------- |
| A new applicant row appears | Notice             | live signal | question 170   | none           | fade          |

## Known limits

- Broadcast from the database needs a connected client to have created the day's partition. Without one, the insert
  warns and nothing is sent (Broadcast docs). Push is not affected because it goes through the webhook.
- Realtime policy changes take effect at the next join or token refresh. That is acceptable because user topics never
  change hands.
- Delivery while disconnected is not guaranteed. The refetch on reconnect covers it.

## Implementation order

1. **Build now, server:** the `events` outbox, the `realtime.messages` policy, the send trigger, the `push_tokens`
   table and RPCs, and `notify` with `RecordingSender`. pgTAP covers recipients per kind and checks that no one can
   read another user's topic or events.
2. **Build now, app:** `src/lib/live/` (channel, reconnect, dispatch, verify emitter); bounty handlers (home cards,
   applicants, status, payments); token registration and the permission flow; tap routing for every kind.
3. **Needs the account:** the APNs key in EAS credentials, the EAS `projectId`, `ExpoSender`, and device acceptance.
4. Chat Task 3 and carpool use steps 1–2 as they are; they add only their kinds.

## Verification

- pgTAP: every transition writes the right recipients and kinds; `realtime.messages` select is denied for another
  user's topic; `events` is unreadable by clients.
- Unit: dispatch by kind, reconnect refetch, and tap routing for every kind on a cold start and when running.
- UI cases with the verify emitter:
  - A signal arrives while the applicant list is open.
  - A signal arrives while a home card is on screen.
  - A tap routes from a recorded notification.
- Simulator push for routing only: `xcrun simctl push` with a payload file, in the runner. Never a deep link.
- Device, once the account exists: real delivery in each language, grouping, provisional versus explicit, and
  `DeviceNotRegistered` cleanup.
