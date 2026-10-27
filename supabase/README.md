# Supabase (local)

Requires Docker and the `supabase` CLI.

- `bun run db:start` starts the local stack and applies `migrations/`.
- `bun run db:reset` rebuilds the local database from the migrations and wipes all local data.
- `bun run db:test` runs the pgTAP tests in `tests/`; the local stack must already be running.

Studio runs at http://127.0.0.1:54323 and the API at http://127.0.0.1:54321.

## App connection

The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Copy `.env.example` to
`.env.local` (gitignored); its values are the local stack's URL and the CLI's public demo anon key
(`supabase status` prints both). Without them the app runs signed out and sign-in reports that it is
not configured. Verify builds never create a client. Sessions are stored in the Keychain, split
across items of at most 1800 bytes because larger Keychain values can be rejected.

`deleteAccount()` calls the Edge Function `account-delete` with the user's JWT (`POST`, no body). The
function answers 200 on success (the auth user is deleted with the service role and the profile
cascades), 401 without a user token, and 409 when deletion is blocked:

```json
{
  "error": "unsettled_payments",
  "payments": [
    {
      "id": "…",
      "title": "Ride to KLIA",
      "counterpartName": "Aisyah",
      "amountSen": 2500,
      "direction": "owe"
    }
  ],
  "bounties": [
    {
      "id": "…",
      "title": "帮取快递",
      "counterpartName": "阿杰",
      "amountSen": 500,
      "role": "poster"
    }
  ]
}
```

`amountSen` is the amount in sen (RM × 100, integer); `direction` is `owe` when the deleting user
pays the counterpart and `owed` when the counterpart pays them. The app drops items that do not
match this shape and still treats the response as blocked. `findUnsettledPayments` in `functions/account-delete/index.ts` reads every payment the user is
payer or payee of that is not settled; `findActiveBounties` lists, through `active_bounties_of(uid)`
(service role), the bounties the user posts or helps on that are `assigned`, `en_route`, `done` or
`disputed`, with `amountSen` the reward and `role` `poster` or `helper`. Either list blocks the
deletion; the error stays `unsettled_payments` so the shipped app treats a bounty-only answer as
blocked (it does not list `bounties` yet). A failed check answers 500 and deletes nothing.

## Payments

`payments` rows are opened only by server code (`open_payment`, `open_reverse_payment`, service role).
A bounty holds one forward payment: a second `open_payment` for the same bounty raises
`23505 payment_exists`, while its reverse payment still opens. A ride opens one forward payment per
rider on the same ride id. `open_payment(…, item_category)` stores
the bounty category (`bounty_category`: pickup, buy, queue, handle, move, accompany, study, other);
rides and reverse payments carry none. Each sticker has a `role` (`payee` or `payer`), one per
(payment, owner), and `award_missing_stickers()` gives every side of a settled forward payment that
still has an account its missing sticker. Clients read their own rows and change state through `mark_payment_paid`, `undo_marked_paid`,
`confirm_payment_received` and `report_not_received`; every change logs a
`payment_events` row, and `settled` is the event steps 5–6 build on. A payer reads the payee's
`payee_methods` while a payment between them is unsettled. Proofs live in the private
`payment-proofs` bucket under `<payment id>/`.

`confirm_payment_received(payment)` (authenticated, payee only) settles and, for a forward payment,
in the same transaction writes a sticker for the payee (`payee`) and for the payer (`payer`, when the
account still exists) with the payment's title, kind and category, records both sides'
`settled` reputation events (`private.record_settled`) and the payee's help grant
(`private.grant_help_settled`). It returns `{ state: 'settled', firstSettled, stickerCount }` for the
payee: `firstSettled` is true on the payee's first sticker as payee, `stickerCount` counts their
whole book, payer stickers included. A reverse payment writes no sticker, event or grant and is
never first; a replayed settle raises `55000` and writes nothing.

## Blocks

`blocks` holds one row per (blocker, blocked); a client reads only the rows it created, so a blocked
user never learns who blocked them, and writes go through RPCs only.

- `block_user(target)` (authenticated): idempotent; `22023 cannot_block_self` for the caller's own
  id, `P0002 user_not_found` when `target` has no profile.
- `unblock_user(target)` (authenticated): idempotent; removing a block that does not exist is fine.
- `private.is_blocked_between(a, b)`: true when either user blocked the other, false when either is
  null. It lives in the unexposed `private` schema so it is callable from RLS policies and server
  functions but is not an RPC that would let a client probe who blocked them.

Deleting an account removes its blocks in both directions.

## Reputation events

`reputation_events` is server-only (RLS on, no client grants); it is the input to the reputation
tier. A `no_show` is one row per (user, item kind, item); a `settled` event is one row per (user,
payment), so a driver gets one per rider on the same ride.

- `record_no_show(offender, kind, item)` (service role): returns `waived` when the offender has no
  waived no-show in the last 60 days, `counted` otherwise; a replay for the same item returns the
  stored outcome and writes nothing. Calls are serialised per offender. `22023 invalid_no_show` for a
  null argument, `P0002 user_not_found` when the offender has no profile.
- `private.record_settled(payment)` (internal, no grant): for a settled forward payment, one
  `settled` event for each side that still has an account, the other side as `counterpart_id`; the
  payer's `on_time` is whether they marked it paid within 72 hours of opening; it is null when the
  payer never marked it paid (cash confirmed by the payee), since only the payee sets `settled_at`.
  Reverse payments and repeat calls write nothing.

## Reputation tiers

`reputation_snapshots` holds one row per user: the tier (`new_friend` 新朋友, `reliable` 靠谱,
`very_reliable` 很靠谱, `tapir_friend` 貘友) and the inputs behind it. A signed-in client reads only
`user_id` and `tier` (column grant); every write is the recompute.

- `recompute_reputation(as_of default now())` (service role): upserts one snapshot per profile from
  the events with `as_of - 180 days < created_at <= as_of` and returns the rows written. Inputs:
  `settled_count` (settled events, one per payment), `counterpart_count` (distinct counterparts
  among them; counterparts whose account was deleted count together as one, so a deletion never lowers a tier), `counted_no_shows` (no-shows not waived), `completion_rate` = settled / (settled +
  counted no-shows), null when both are 0, and `on_time_share` over the user's payer events with a
  known `on_time`, null when none. Account age is `as_of - profiles.created_at`.
- `private.tier_for(settled, counterparts, rate, account_age)` holds every threshold, so tuning is
  one migration: 靠谱 ≥ 2 settled, ≥ 2 counterparts, rate ≥ 0.8; 很靠谱 ≥ 5, ≥ 4, ≥ 0.9, account
  ≥ 60 days; 貘友 ≥ 12, ≥ 8, ≥ 0.95, account ≥ 180 days. `on_time_share` is stored but not yet a
  threshold; reviews join in foundation step 6.
- `reputation_tier(uid)` (authenticated): the snapshot's tier, `new_friend` when there is none.

## Coins

`coin_ledger` is append-only: a client reads its own rows and never writes; even the owner role
cannot update or delete a row or truncate the table (`55000 ledger_is_append_only`), except the `user_id → null` that
account deletion makes, so a deleted user's rows stay without a user. The balance is the sum of
`delta`. `post_charges` (server-only) records how each bounty or ride post was paid. Months are
Malaysia calendar months, `malaysia_month(at)` (`Asia/Kuala_Lumpur`).

- `spend_post(poster, kind, item)` (service role): `free` while the poster has fewer than 3
  unrefunded free charges this month (bounties and rides share them), else `coin` with a `-1`
  `post_spend` row; `55000 no_balance` with no free slot and no coin, and nothing is written. The
  poster's first charge ever grants `onboarding_first_post` (+1), once. A replay for the same item
  returns the stored charge and writes nothing; `22023 item_charged_elsewhere` when another poster
  holds the item, including when two posters charge it at the same moment; `P0002 user_not_found`
  when the poster has no profile; `22023 invalid_charge` for a null argument. A refunded charge is
  final for its item id: a replay still returns the original charge, although nothing is held, so a
  re-published post needs a new item id.
- `refund_post(kind, item)` (service role): stamps `refunded_at`; a `coin` charge gets a `+1`
  `post_refund` row, a `free` charge frees its slot in its own month. A second call returns the
  same charge and writes nothing; `P0002 charge_not_found` for an item never charged.
- `coin_balance()` (authenticated, the caller): `{ coins, freePostsLeft, freePostsPerMonth: 3,
nextFreeAt }`, `nextFreeAt` being 00:00 on the 1st of next month in Malaysia.
- `private.grant_coins(uid, why, amount, kind, item)` (internal): writes one row unless the
  once-per-user or once-per-item index already holds it; returns whether it wrote.

Grants: `handle_new_user` writes `new_user` (+5) with the profile; the first `payee_methods` row
(cash counts) writes `onboarding_payee_method` (+1). Both are once per user, so deleting and
re-adding a method grants nothing. `private.grant_help_settled(payment)` (internal, called by the
settle) gives the payee of a settled forward bounty payment `onboarding_first_help` (+1, once) and
`help_settled` (+1 per bounty, at most 10 per Malaysia month); rides, reverse payments and unsettled
payments grant nothing, and a replay writes nothing. `private.backfill_coin_grants()` gives
existing accounts the two sign-up grants and returns how many rows it wrote.

Spends, refunds and help grants take a per-user advisory lock, so concurrent publishes cannot both
take the last free slot or the last coin, and concurrent settles cannot pass the monthly cap.

## Bounties

Reads: `bounty_events` gives the poster and the helper the bounty's events, except that `applied` and
`withdrawn` events are shown to the helper only when they are their own, and to the poster only when no block
stands between the poster and that applicant. An applicant who was not selected still reads the bounty row
(through `private.has_applied`), including `helper_id`, `eta_at`, `done_at` and later statuses; read functions
built on top must not pass the helper's identity on to them.

Cancelling an `assigned` bounty counts against the helper when the poster cancels more than 30 minutes after
`greatest(starts_at, the selection)`, so a helper selected after the start gets the same 30 minutes.

Account deletion: the `bounties_before_user_delete` trigger on `auth.users` runs inside the delete.
It refuses (`55000 active_bounties`) while the user has an active bounty, closes each of their `open`
bounties through `private.close_bounty(id, 'closed')` (event and refund, the ledger rows keep a null
user) and deletes the address rows of every bounty they posted. Their applications go with the
`on delete cascade`; other applications to their closed bounties stay `pending`. Settled bounties
keep their rows for the other side with the deleted party set null, which is why `bounties_helper`
allows a `confirmed` bounty without a helper.

### Read model

Five `security definer` functions (authenticated) return JSON and apply the `bounties_select` rules themselves
through `private.bounty_viewer_role(b, uid)`: `poster`, `helper`, `applicant` (any application, while no block stands
between the applicant and the poster), `viewer` (an `open` bounty, no block), or nothing. `settled` is never stored:
`private.bounty_status(b)` reads `settled` for a `confirmed` bounty whose forward payment is settled, and only the poster
and the helper get that derived status (`private.bounty_status_for`); everyone else reads the stored `confirmed`, as
payment state is the parties' business. A deleted poster or helper (possible on `confirmed`) reads as `null`.

- `bounty_detail(bounty)`: the bounty with derived `status`, `viewerRole`, `place` (label, latitude, longitude),
  `poster` `{ id, name, tier }` and `myApplication`. Only the poster and the helper get `helper`, `etaAt`,
  `previousEtaAt`, `autoConfirmAt`, `startLate`, `issueReason` (latest 「有问题」 reason while `disputed`), `payment` `{ id, state }` and `events`
  (with `applied` / `withdrawn` filtered as in `bounty_events`, `actor` as `poster`, `helper` or null). `address`
  goes to the poster, and to the helper from `assigned` to `confirmed`. `applicantCount` (pending, blocked pairs left
  out) goes to the poster. `P0002 bounty_not_found` when the caller cannot see the bounty. No read function returns
  the helper's id or name to a non-selected applicant.
- `my_bounties()`: `{ posted, applied }`, each every active row plus the 20 most recent finished rows, newest
  status change first. Finished is `settled`, `closed` or `cancelled`; for an applicant who is not the helper,
  `confirmed` too. A `confirmed` bounty not yet settled stays active for the poster and the helper. `applied` leaves out withdrawn applications; its
  `counterpartName` is always the poster. An application stays `pending` when its bounty closes or expires; the
  client reads `applicationStatus` together with the bounty's `status` and shows a closed bounty as closed.
- `bounty_applicants(bounty)`: poster only (`42501 not_poster`; `P0002 bounty_not_found` for an unknown id); pending
  and selected applications, oldest first, blocked pairs left out, each with name, tier and note.
- `bounty_live_items()`: one item per bounty for the caller, unranked (order of the table in the bounty schema plan,
  Task 7). `confirmed` and `settled` bounties produce no item; the payment cards cover them. A pending application
  produces none.
- `mark_bounty_seen(bounty, card)`: writes the `bounty_seen` row for `not_selected` (the caller's application was
  not selected) or `expired` (the caller's bounty closed by expiry); a repeat writes nothing. `P0002
bounty_not_found` when the caller has no such card on that bounty. The row is per user, so every device stops
  showing the card.

Follow-up: `bounties_select` still gives a non-selected applicant the row's `helper_id` (and `eta_at`,
`previous_eta_at`, `done_at`), and `profiles` names it. Move `bounties` to column grants that leave these out, or
read bounties only through the RPCs.

### Board: `nearby_bounties`

`nearby_bounties(latitude, longitude, board_filter, page_after, page_size)` (authenticated, `security invoker`, so
RLS still applies) returns `{ items, next }`. Each item has `id`, `title`, `category`, `rewardSen`, `placeLabel`,
`stickerPath`, `startsAt`, `endsAt`, `deadlineAt`, `urgent`, `distanceM`, `appliedByMe` and `createdAt`. The response
never carries the exact address (`bounty_addresses`, readable only by the poster and helper) or coordinates. The place
point itself is public by design: `bounties_select` lets any signed-in user read `bounties.place`, and `distanceM`
from several points locates it too. Only `open` bounties before `expires_at` are listed, never the viewer's
own and never one whose poster and viewer are blocked in either direction.

- Order: with a point (`latitude` and `longitude` together), bounties with a place come first by distance (`<->`, the
  GiST KNN on `bounties_place`), ties by `id`; then bounties without a place by `created_at` descending, ties by
  `id` descending. Without a point every bounty is ordered by recency and `distanceM` is null. `distanceM` is the
  spherical distance rounded to whole metres (within about 0.5% of the spheroid distance).
- Paging: `page_size` 1–50 (default 20). Pass the previous answer's `next` as `page_after` until `next` is null.
  The cursor records the point and filter; a call whose `latitude`, `longitude` or `board_filter` differ from the
  cursor's raises `22023 board_cursor_mismatch`, and the client restarts from page 1. A malformed cursor (bad id,
  both or neither of `distance` and `createdAt`, a non-finite value), an unknown filter, a lone coordinate or a
  size outside 1–50 raise `22023 invalid_board_query`.
- `urgent` (filter and flag): `deadline_at` within the next 3 hours.
- `fits_my_time`: a bounty's slot is `[starts_at, ends_at)`, or one hour from `starts_at` when there is no end. It is
  dropped when its slot overlaps the slot of a bounty the viewer posts or helps on that is `assigned`, `en_route`,
  `done` or `disputed`. Slots that only touch do not overlap. A bounty without `starts_at` (deadline only or no
  time) always fits, because its helper picks when to do it.
- `appliedByMe` is true while the viewer's application is `pending`.
- Known limits:
  - Deep paging costs grow: each page rescans every row nearer than the cursor, and a page boundary inside a group of
    bounties at the same point rescans the whole group. Filtered queries with few matches scan every located open
    bounty. Fine at campus scale; a radius cap or a same-point keyset for the boundary group is the fix.
  - The pages-of-1 tie test in `bounty_nearby.test.sql` relies on the scan returning tied rows in insertion order; a
    fixture with a fixed expected order would make it independent of the plan.

## Scheduled functions

`fx-rate` stores Bank Negara Malaysia's 17:00 CNY middle rate in `fx_rates` (17:30 Malaysia time);
`payment-proof-cleanup` removes proofs 30 days after settlement. Both are called by pg_cron through
`call_edge_function`, which needs the Vault secrets `project_url` and `service_role_key` in each
environment; without them the jobs post nothing.

`bounty-jobs` runs `run_bounty_jobs()` in SQL every 5 minutes (no Edge Function, no Vault secret): it
closes open bounties past `expires_at` and refunds their post, confirms bounties `done` for 48 hours
and opens their payment, and adds one `start_reminder` event to assigned bounties whose start passed.
Each row is locked with `skip locked` and runs in its own exception block, so a failing or busy row
waits for the next run. The result counts each kind of change and `skipped`, the rows whose change
failed; a row that keeps failing is retried every run and shows up only there and in the log warning,
so a monitor should alert when `skipped` stays above 0. `run_bounty_jobs()` always runs at `now()`
(service role); the clock-taking body `private.run_bounty_jobs(as_of)` has no grant and is for tests.

`reputation-recompute-daily` runs `recompute_reputation()` in SQL at 19:30 UTC (03:30 Malaysia time).

## Edge Functions

- `bun run fn:serve` serves `functions/` on the local stack (this CLI version does not serve them on
  `supabase start`).
- `bun run test:stack` runs the `*.integration.ts` tests against the running stack and served
  functions: `account-delete` (user A deletes itself, user B is untouched, calls without a user
  token are rejected) and the app's profile service under RLS.
- Request handling lives in `handler.ts` (no Deno APIs), unit-tested by `bun test`; `index.ts` wires
  Deno and the service-role client and is excluded from `tsc`.
