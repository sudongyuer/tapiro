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
  ]
}
```

`amountSen` is the amount in sen (RM × 100, integer); `direction` is `owe` when the deleting user
pays the counterpart and `owed` when the counterpart pays them. The app drops items that do not
match this shape and still treats the response as blocked. `findUnsettledPayments` in `functions/account-delete/index.ts` reads every payment the user is
payer or payee of that is not settled; a failed check answers 500 and deletes nothing.

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

## Scheduled functions

`fx-rate` stores Bank Negara Malaysia's 17:00 CNY middle rate in `fx_rates` (17:30 Malaysia time);
`payment-proof-cleanup` removes proofs 30 days after settlement. Both are called by pg_cron through
`call_edge_function`, which needs the Vault secrets `project_url` and `service_role_key` in each
environment; without them the jobs post nothing.

`bounty-jobs` runs `run_bounty_jobs()` in SQL every 5 minutes (no Edge Function, no Vault secret): it
closes open bounties past `expires_at` and refunds their post, confirms bounties `done` for 48 hours
and opens their payment, and adds one `start_reminder` event to assigned bounties whose start passed.
Each row is locked with `skip locked` and runs in its own exception block, so a failing or busy row
waits for the next run.

## Edge Functions

- `bun run fn:serve` serves `functions/` on the local stack (this CLI version does not serve them on
  `supabase start`).
- `bun run test:stack` runs the `*.integration.ts` tests against the running stack and served
  functions: `account-delete` (user A deletes itself, user B is untouched, calls without a user
  token are rejected) and the app's profile service under RLS.
- Request handling lives in `handler.ts` (no Deno APIs), unit-tested by `bun test`; `index.ts` wires
  Deno and the service-role client and is excluded from `tsc`.
