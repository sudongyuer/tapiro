# Live updates and push, steps 1–2 Implementation Plan

> **For agentic workers:** execute task by task. Track steps with checkboxes (`- [ ]`). The spec stays `approved` after
> step 1; the Implementation Record and `status: implemented` come after step 2 (step 3 needs the paid account).

**Goal:** Step 1 (server): every bounty, ride and payment transition that changes what another person sees reaches that
person as a signal on their private Realtime topic `user:<uid>`, and the events that need them reach their devices as a
push through `notify`, recorded by a `RecordingSender` until the Apple account exists. Step 2 (app): one channel per
signed-in session refetches the screens the signal names; tokens, permission and tap routing.

**Architecture:** The carpool outbox (`public.events`, `private.event_kinds`, `private.emit_event`, the `ride_events`
and payment triggers, `push_recordings`, `delete_old_events`) is reused. Step 1 adds a Broadcast trigger on `events`,
the `realtime.messages` select policy, a `bounty_events` fan-out trigger, `push_tokens` with client RPCs, the push queue
(renamed `push_recordings`) with service RPCs, and the `notify` Edge Function (handler, copy, `RecordingSender`).

**Tech stack:** Postgres on the local Supabase stack, pgTAP via `supabase test db`, pg_net through
`public.call_edge_function`, pg_cron; Deno Edge Function tested with `bun test`.

**Spec:** `docs/specs/2026-10-31-realtime-push-design.md` (approved): Decisions, Events, questions 170–175, Data flow,
Errors, Known limits, Implementation order 1–2, Verification. Defaults chosen here are rows marked ★ in its Decisions.

## Global constraints

- Local database only (`bun run db:reset`, `bun run db:test`); never link, push to or query the hosted project.
- Every RLS-bypassing function is `security definer`, `set search_path = ''`, schema-qualified, `revoke all … from
public, anon, authenticated`, then granted to `authenticated` (actor from `auth.uid()`) or `service_role`.
- Signals carry `{kind, id, at}` only; push `data` carries `{kind, id}` only. Clients never read `events`, the queue,
  recorded pushes or tokens.
- A failed broadcast never rolls back a transition (`realtime.send` swallows its errors). A failed push is retried
  once, then keeps `events.push_error`; nothing is replayed after that.
- No comments unless they explain unexpected behaviour or a hidden constraint. Files under 500 lines.

## Step 1: server

### Task 1: Broadcast and the topic policy

Files: `supabase/migrations/20261103000000_live_broadcast.sql`.

- [x] `user_topic_receive` on `realtime.messages` for `authenticated`: `extension = 'broadcast'`, the row topic equals
      `realtime.topic()` and equals `'user:' || auth.uid()`.
- [x] `events.actor_id`; `emit_event` stores the actor.
- [x] `events_broadcast` after insert: `realtime.send({kind, id, at}, kind, 'user:<recipient>', private => true)`.

### Task 2: Bounty kinds and payments

Same migration.

- [x] Kinds: applied (push), withdrawn, selected (push), not_selected, started (push), eta_changed (push), completed
      (push), issue (push), cancelled (push), expired, confirmed.
- [x] `bounty_events_fanout`: applied, withdrawn → poster; selected → helper, and `not_selected` → the other
      applicants; started, eta_changed, completed → poster; problem_reported → helper; cancelled → poster and helper;
      closed → pending applicants (`bounty.cancelled`); expired → poster; confirmed / auto_confirmed → both. The actor
      is never told.
- [x] Replace `ride_payment_fanout` with `payment_fanout` for every payment.

### Task 3: Tokens, queue and service RPCs

Files: `supabase/migrations/20261103000100_push_tokens.sql`.

- [x] `push_tokens (token pk, user_id, language, …)`; `register_push_token(token, language)`,
      `set_push_language(language)`, `unregister_push_token(token)` for `authenticated`.
- [x] Rename `push_recordings` → `push_queue` (+ `claimed_at`, `attempts`, `sent_at`, `failed_at`); `queue_push`
      groups bounty kinds as `bounty:<id>` and payments by their item.
- [x] `claim_due_pushes(max_rows)`, `finish_push(queue_id, error)`, `drop_push_token(token)` for `service_role`;
      `recorded_pushes` for the `RecordingSender`.
- [x] Statement trigger `push_queue_poke` and cron `push-drain` (every 5 minutes) call `notify` through
      `call_edge_function`.

### Task 4: `notify`

Files: `supabase/functions/notify/{index,handler,copy,recording-sender}.ts`, tests beside them; `supabase/config.toml`.

- [x] Service key only; claim in batches of 100 (at most 10 rounds); one message per token in its language with
      `threadId` and `data {kind, id}`; `DeviceNotRegistered` drops the token; any delivered device finishes the push;
      otherwise the first error is reported; a kind without copy fails as `no_copy`.
- [x] Copy for every push kind in zh-Hans, en, ms; the unit test reads the migrations and fails when a push kind has
      no copy.

### Task 5: Tests and docs

- [x] `supabase/tests/live_push.test.sql`: recipients per bounty and payment kind, push flags, threads, broadcast
      payloads, topic isolation, no client reads, tokens, claim / finish / retry.
- [x] `ride_event_outbox.test.sql` reads `push_queue`.
- [x] Story map `chat.live`, spec Decisions ★ rows, `docs/status.md`, retro.

Checks: `bun test`, `bunx tsc --noEmit`, `bun run lint:changed origin/main`, `bun run format:check`,
`node scripts/check-specs.mjs --dir docs/specs`, `node scripts/check-story-map.mjs`, `bun run db:test` (after
`bun run db:reset` from this worktree: the shared stack may hold another branch's migrations),
`deno check supabase/functions/notify/index.ts` (`tsc` excludes `index.ts`). No UI case: no screen changes.

Deploy note for the account half: the hosted project needs Realtime "Allow public access" off, the Vault secrets
`project_url` and `service_role_key`, and `notify` deployed; none of this is done here.

## Step 2: app

### Task 6: `src/lib/live/`

- [x] One private channel `user:<uid>` per signed-in session after `supabase.realtime.setAuth()`; removed on sign-out
      and unmount. Handlers register by kind prefix; features never open channels.
- [x] On `SUBSCRIBED` after a drop, on foreground and on tab focus, refetch what is on screen; a 「可能不是最新」 line
      while disconnected (172 B).
- [x] Verify mode: a fixture emitter (`-uiVerifyLive <script>`) replaces the channel at the boundary.
- [x] Unit: dispatch by kind, reconnect refetch, disconnected line.

### Task 7: Bounty handlers

- [x] Home cards, applicant list, status page and payments reload on their kinds; a new applicant row fades in (motion
      options offered first, per `animate-expo`).
- [x] UI cases: a signal while the applicant list is open; a signal while a home card is on screen.

### Task 8: Tokens, permission, tap routing

- [x] Register the Expo push token when authorised or provisional (`register_push_token` with the app language);
      this device registered again on a language change (★). `set_push_language` is now unused; drop it in a later
      migration (none in this step); `unregister_push_token` on
      sign-out (account deletion relies on the
      `on delete cascade`, since no session is left for the RPC). Skipped until the EAS `projectId` exists (step 3).
- [x] The explicit prompt after the first post or application (foundation).
- [x] Tap routing for every kind from `data {kind, id}`, cold start through `getLastNotificationResponse()`.
- [x] Unit: routing for every kind (read from the migrations, `chat.*` to the 消息 tab); UI case: a tap routes from a
      recorded notification. `xcrun simctl push` cannot tap a banner, so `-uiVerifyNoticeTap` replaces the response at
      its boundary.

### Task 9: Ride meet-up polling (175 B)

- [x] Poll every 15 s while the meet-up screen is open within 15 minutes of departure. Already built in carpool step
      5 (`shouldPoll`, `POLL_MS` in `src/features/ride/detail/detailModel.ts`); nothing to add.

UI cases written in step 2, not yet run (Pace): `live_applicants`, `live_home_card`, `live_notice_tap`,
`live_push_token`.

After step 2: the feature's UI cases run once together, `spec-lifecycle` appends the Implementation Record and sets
`implemented`.
