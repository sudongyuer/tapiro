# Supabase (local)

Requires Docker and the `supabase` CLI.

- `bun run db:start` starts the local stack and applies `migrations/`.
- `bun run db:reset` rebuilds the local database from the migrations and wipes all local data.
- `bun run db:test` runs the pgTAP tests in `tests/`; the local stack must already be running.
- `scripts/db-isolated.sh <name> <port-prefix>` (for example `appeal-lapse 565`) runs them on a throwaway stack with its
  own `project_id` and ports, then stops it; agents in worktrees use this instead of the shared `tapiro` stack.

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
      "amountMinor": 2500,
      "currency": "MYR",
      "direction": "owe"
    }
  ],
  "bounties": [
    {
      "id": "…",
      "title": "帮取快递",
      "counterpartName": "阿杰",
      "amountMinor": 500,
      "currency": "MYR",
      "role": "poster"
    }
  ]
}
```

`amountMinor` is the amount in the minor unit of `currency` (an ISO 4217 code from `currencies`); `direction` is `owe` when the deleting user
pays the counterpart and `owed` when the counterpart pays them. The app drops items that do not
match this shape and still treats the response as blocked. `findUnsettledPayments` in `functions/account-delete/index.ts` reads every payment the user is
payer or payee of that is not settled; `findActiveBounties` lists, through `active_bounties_of(uid)`
(service role), the bounties the user posts or helps on that are `assigned`, `en_route`, `done` or
`disputed`, with `amountMinor` and `currency` the reward and `role` `poster` or `helper`.
`findActiveRides` lists, through `active_rides_of(uid)`, the rides the user organises with an accepted member (or
past 出发 and not closed) or rides on as an accepted or boarded member, as `rides: [{ id, title, role, status }]`
(`role` `organiser` or `rider`). Any list blocks the deletion; the error stays `unsettled_payments` so the shipped
app treats a bounty- or ride-only answer as blocked (it lists neither yet). The `auth.users` delete triggers enforce
the same rules, cancel the user's open rides nobody joined and withdraw their requests. A failed check answers 500
and deletes nothing.

## Test accounts

Apple and Google sign-in need a paid developer account, so a development build connected to the local stack shows
「测试账号」 buttons on the sign-in screen. They appear only when `__DEV__` is true, verify mode is off, and
`EXPO_PUBLIC_SUPABASE_URL` is a loopback host (`testAccountsEnabled` in `src/features/account/testAccounts.ts`).

- `bun run db:test-accounts` applies `dev/test-accounts.sql` to the local database (it refuses a non-local DB URL;
  `SUPABASE_LOCAL_DB_URL` overrides `supabase status`). It is idempotent and not part of `seed.sql`, so `db reset`,
  CI and pgTAP never see it; run it again after a reset.
- Accounts: 小林 `xiaolin@tapiro.test` and 阿明 `aming@tapiro.test`, password `tapiro-dev-only`. Each has an
  onboarded profile, a DuitNow ID and cash payee method, and the usual grants (5 new-user coins plus 1 for the payee
  method, on top of 3 free posts a month), enough to publish and join rides and bounties.
- `bun run dev:two` builds the Debug app into `.dev/DerivedData`, boots two existing iPhone Simulators that are not the
  runner's `Tapiro Verify` devices (`TAPIRO_DEV_SIMS=<udid>,<udid>` picks them), sets both to Sunway, starts Metro
  against the local stack when port 8081 is free, and installs and launches the app on both. `--skip-build` reuses
  the last build. Metro already running on 8081 is reused with whatever environment it was started with.
- Agents driving the phones with AXe pass `--headless`: while DeviceHub shows a Simulator, AXe taps are dropped.
  Quitting DeviceHub shuts down every Simulator it shows, the `Tapiro Verify` ones included.

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

### Money

Every amount is an integer in its currency's minor unit plus a `char(3)` code that references `currencies`
(`code`, `minor_digits`, `symbol`, `enabled`; MYR and CNY). `post_limits (item_kind, currency)` holds `min_minor`,
`max_minor` and `step_minor`; a bounty insert or reward change outside them raises `23514 invalid_reward`, and
`publish_bounty(id, title, category, reward_minor, reward_currency, …)` raises `22023 invalid_reward` for those and
for an unknown or disabled currency. `fx_rates (base, quote, rate_date, source)` holds `quote_per_base`; BNM
writes `(CNY, MYR, date, bnm)`. A rate is fresh when its `rate_date` is at most 7 days before today in Malaysia.
`method_currency(type, item_currency)`: DuitNow and bank are MYR, Alipay and WeChat CNY, cash the item's currency.

`open_payment(kind, item, item_title, payer, payee, amount, currency, reversing, item_category)` locks the newest
fresh rate between `currency` and another enabled currency into `rate_quote_per_base`, `rate_base`, `rate_quote`,
`rate_date` and `rate_source`, or leaves all five null; neither they nor `currency` change afterwards (`22023`).
Conversions round up (`ceil`) to the target's minor unit. `payment_detail(payment)` (parties only) returns
`{ id, amountMinor, currency, rate: { base, quote, quotePerBase, date, source } | null, paidMinor, paidCurrency,
methods: [{ method, type, currency, amountMinor | null }] }`; the payer gets `methods` only while unsettled. An
`amountMinor` is null when the method needs a conversion and no rate is locked, and `mark_payment_paid` then raises
`55000 no_rate`; otherwise it writes `paid_minor` and `paid_currency`. A cash settle from `due` records the original
amount. A reverse payment pays back `paid_minor` in `paid_currency`.

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
payment), so a driver gets one per rider on the same ride. A closed ride counts the same without a payment:
`private.record_ride_settled` writes a row for each organiser–rider pair that has none (`payment_id` null, dated at the
close), including an appeal confirmed after the close. An organiser who rode alone has one row naming themselves as
counterpart, which the recompute does not count as a person; an appeal after that replaces it with the pair. A ride no-show under a 「我上车了」 appeal has
`appeal_pending`: the recompute skips it, but it keeps its `created_at` and its waiver. A confirmed appeal deletes the
row; the `ride-jobs` cron clears the flag when the appeal lapses 72 h after 出发.

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
  `settled_count` (settled events), `counterpart_count` (distinct counterparts
  among them, the user themselves excluded, and rides closed without a Tapiro payment excluded; counterparts whose account was deleted count together as one, so a deletion does not erase them and cannot be used to add more), `counted_no_shows` (no-shows not waived), `completion_rate` = settled / (settled +
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

### In-app purchase

Plan: `docs/plans/2026-11-11-iap-local.md`. No app code calls these yet.

- `iap_products (product_id, coins)` is the only source of how many coins a pack gives: `app.tapiro.coins.5` → 5,
  `.11` → 11, `.35` → 35. `iap_transactions` (server only, rows never deleted) holds one row per App Store
  `transactionId` with its `environment` (`Production`, `Sandbox`, `Xcode`, `LocalTesting`), `credited_at`,
  `revoked_at` and `refund_reversed_at`; account deletion sets `user_id` to null. `iap_notifications` holds one row per
  `notificationUUID` with its `outcome`. Ledger rows `purchase` (+pack), `purchase_refund` (−pack) and
  `purchase_refund_reversed` (+pack) carry `iap_transaction_id`, at most one of each per transaction.
- `iap_credit(buyer, transaction, original_transaction, product, env, purchased_at)` (service role) credits once and
  answers `{ status, transactionId, productId, coins, environment, balance }`, `status` `credited`, `duplicate` (seen
  before, nothing written) or `revoked` (refunded before it was ever credited). `42501 transaction_owned_elsewhere`
  when another user holds it, `22023 unknown_product`, `22023 invalid_transaction`, `P0002 user_not_found`.
- `iap_revoke(buyer | null, …, revoked)` (service role) takes the whole pack back, so the balance may go below 0 (268
  A); free monthly posts still work and coin posts wait until the balance is back above 0. A refund for a transaction
  never seen is stored as revoked and never credited. A second refund, or a refund after a reversal, answers
  `duplicate`.
- `iap_apply_notification(notification, kind, sub, env, signed_at, transaction…, revoked)` (service role) stores the
  notification once (a repeat answers `duplicate`), applies `REFUND` through `iap_revoke` and `REFUND_REVERSED` once
  (`reinstated`), and records other types as `ignored`.
- Credit, revoke and reinstate lock the transaction, then the owner's coins, the same per-user lock as `spend_post`.

`iap-verify` (`POST`, user JWT, body `{ signedTransaction }`, StoreKit's `jwsRepresentation`) verifies the JWS, checks
bundle `app.tapiro`, `type: Consumable`, `quantity: 1` and `appAccountToken` = the caller's user id, then credits, or
revokes when `revocationDate` is set. It answers 200 with the RPC's answer, or `{ error }`: 400 `invalid_transaction`,
401 `unauthorized`, 403 `environment_not_accepted`, `wrong_account` or `transaction_owned_elsewhere`, 422
`unverified`, `not_consumable`, `unsupported_quantity` or `unknown_product`, 503 `verification_unavailable`, 500
`store_failed`. The app finishes the StoreKit transaction only on 200.

`iap-notify` (`POST`, no JWT, body `{ signedPayload }`, App Store Server Notifications V2) verifies the notification
and its `signedTransactionInfo`, then calls `iap_apply_notification`: 200 `{ status }`, 400 `invalid_notification`, 403
`environment_not_accepted`, 422 `unverified`, 500 `store_failed` (Apple delivers it again; the UUID makes that safe).

Environments (`functions/_shared/iap/config.ts`): `Sandbox` always; `Production` once `IAP_APP_APPLE_ID` is set;
`Xcode` and `LocalTesting` only when `IAP_ALLOW_XCODE=1` and `SUPABASE_URL` is a local host. Their transactions carry
no App Store signature and are only decoded, so a hosted project refuses them whatever its secrets say.
`functions/local.env` sets the flag. Signed data is checked against Apple Root CA - G3 by a port of the App Store
Server Library's offline checks (`functions/_shared/iap/apple.ts`): the library itself cannot run in the Edge Runtime,
and `apple.deno-test.ts` holds both to the same verdicts.

## 问小貘

Nothing here is reachable from the app yet: no screen calls these, and `ai-draft` is not deployed. Plan:
`docs/plans/2026-10-30-ask-tapir.md`.

- `ai_consent_versions` (no client access): provider and purpose per version; the newest is the one in force.
  `ai_consents`: a client reads its own rows and writes none. `record_consent(version)` writes a row with the server's
  provider and purpose, is harmless when repeated, and raises `22023 stale_consent_version` for any version but the newest.
  `withdraw_consent()` stamps `withdrawn_at`; the row stays, and consenting again adds another.
- `ai_energy` (no client access): `level` 0–1000, one row per user that has called, `refilled_on` (the day that starts at
  06:00 Malaysia time) and the call lease. No row reads as full. `refill_ai_energy()` runs at 22:00 UTC (06:00 Malaysia
  time, job `ai-energy-refill-daily`, in SQL) and sets stale rows to full; a second run that day does nothing. Reads and
  writes apply a missed refill themselves. The clock-taking body `private.refill_ai_energy(as_of)` has no grant and is for
  tests.
- `ai_pantry`: append-only like `coin_ledger`, with the same `user_id → null` on account deletion; a client reads its own
  rows and never writes. The leaf count is the sum of `delta`; leaves never expire. `swap_coin_for_leaf()` writes a `-1`
  `pantry_swap` row in `coin_ledger` and a `+1` `swap` row pointing at it in one transaction, or `55000 no_balance`.
  `feed_leaf()` takes a leaf and fills the belly, or raises `55000 already_full` or `55000 no_leaf`. Neither has a daily
  ceiling: that is question 149.
- `ai_memory`: 小貘记得, full CRUD for the owner under RLS.
- `ai_metering` (no client access): user, task, model, input and output tokens, energy spent, whether the reply was discarded, time. No prompt or response
  column exists.
- `ai_status()` (authenticated): `{ consent: { currentVersion, given }, energy, energyFull, leaves, coins, nextRefillAt }`,
  null when signed out.
- `ai_begin_call(uid)`, `ai_finish_call(uid, held, task, model, input_tokens, output_tokens, energy_spent)` and
  `ai_abort_call(uid, held)` (service role) are the function's side. Begin answers `{ status }`: `consent_required`,
  `hungry`, `busy`, or `ok` with a 60 s `lease`. Begin also answers `too_many_discards` after 20 discarded replies since the last 06:00. Finish writes the metering row and floors energy at 0; abort deducts nothing; `ai_discard_call(uid, held, task, model, input_tokens, output_tokens)` records a reply the function threw away, with `discarded` true and no charge.

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

- `bounty_detail(bounty, latitude, longitude, reference_currency)`: the bounty with `rewardMinor`, `rewardCurrency`,
  `reference` (the reward at today's fresh rate in `reference_currency` as `{ minor, currency, rateDate }`, null for
  the same or a disabled currency, without a fresh rate, or once the forward payment exists), derived `status`, `viewerRole`, `place` (label, latitude, longitude),
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

`nearby_bounties(latitude, longitude, board_filter, page_after, page_size, reference_currency)` (authenticated, `security invoker`, so
RLS still applies) returns `{ items, next }`. Each item has `id`, `title`, `category`, `rewardMinor`, `rewardCurrency`,
`reference` (as in `bounty_detail`), `placeLabel`, `stickerPath`, `startsAt`, `endsAt`, `deadlineAt`, `urgent`, `distanceM`, `appliedByMe` and `createdAt`. The response
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

`fx-rate` stores Bank Negara Malaysia's 17:00 CNY middle rate in `fx_rates` as `(CNY, MYR, date, bnm)` (17:30 Malaysia time);
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
  token are rejected), `iap-verify` and `iap-notify` with unsigned `Xcode` transactions, and the app's profile service
  under RLS. The tests read the URL and keys from
  `supabase status`; set `SUPABASE_LOCAL_API_URL` (and `SUPABASE_LOCAL_ANON_KEY`, `SUPABASE_LOCAL_SERVICE_ROLE_KEY`)
  when the gateway listens on another port than the one `supabase status` reports (`scripts/local-supabase.ts`).
- `ai-draft` (`POST`, user JWT, body `{ task, input: { text, to? } }`, `task` one of `draft_bounty`, `answer`, `translate`)
  answers `{ task, result, energy, energyFull }`, or `{ error }`: 400 `invalid_request`, 401 `unauthorized`, 403
  `consent_required`, 409 `busy`, 429 `hungry`, 500 `server_error`, 502 `provider_error`. An `error` answer deducts nothing, with one edge: if
  `ai_finish_call` commits and its reply is lost, the answer is a 500 with the energy already spent. `AI_PROVIDER=fake` is the only provider; unset or anything else is a
  `provider_error`. `bun run fn:serve` passes `functions/local.env`. `budget.ts` holds an unmeasured placeholder.
  `bun run test:deno` runs its handler tests in Deno as well (`functions/tests/deno-bun-test.ts` maps `bun:test`),
  plus the Deno-only `*.deno-test.ts` files, which import `npm:` packages that `bun test` cannot load.
- Request handling lives in `handler.ts` (no Deno APIs), unit-tested by `bun test`; `index.ts` wires
  Deno and the service-role client and is excluded from `tsc`, as are `_shared/iap/apple.ts` and `runtime.ts`, which
  import `npm:` packages.
