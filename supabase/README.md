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
Clients read their own rows and change state through `mark_payment_paid`, `undo_marked_paid`,
`confirm_payment_received` (returns `firstSettled`) and `report_not_received`; every change logs a
`payment_events` row, and `settled` is the event steps 5–6 build on. A payer reads the payee's
`payee_methods` while a payment between them is unsettled. Proofs live in the private
`payment-proofs` bucket under `<payment id>/`.

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
tier. One row per (user, kind, item kind, item).

- `record_no_show(offender, kind, item)` (service role): returns `waived` when the offender has no
  waived no-show in the last 60 days, `counted` otherwise; a replay for the same item returns the
  stored outcome and writes nothing. Calls are serialised per offender. `22023 invalid_no_show` for a
  null argument, `P0002 user_not_found` when the offender has no profile.
- `private.record_settled(payment)` (internal, no grant): for a settled forward payment, one
  `settled` event for each side that still has an account, the other side as `counterpart_id`; the
  payer's `on_time` is whether they marked it paid (or it settled) within 72 hours of opening.
  Reverse payments and repeat calls write nothing.

## Scheduled functions

`fx-rate` stores Bank Negara Malaysia's 17:00 CNY middle rate in `fx_rates` (17:30 Malaysia time);
`payment-proof-cleanup` removes proofs 30 days after settlement. Both are called by pg_cron through
`call_edge_function`, which needs the Vault secrets `project_url` and `service_role_key` in each
environment; without them the jobs post nothing.

## Edge Functions

- `bun run fn:serve` serves `functions/` on the local stack (this CLI version does not serve them on
  `supabase start`).
- `bun run test:stack` runs the `*.integration.ts` tests against the running stack and served
  functions: `account-delete` (user A deletes itself, user B is untouched, calls without a user
  token are rejected) and the app's profile service under RLS.
- Request handling lives in `handler.ts` (no Deno APIs), unit-tested by `bun test`; `index.ts` wires
  Deno and the service-role client and is excluded from `tsc`.
