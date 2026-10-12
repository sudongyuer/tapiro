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
cascades), 401 without a user token, and 409 with `{ error: 'unsettled_payments', payments }` when
deletion is blocked. `findUnsettledPayments` in `functions/account-delete/index.ts` is the only place
that reads payments; it returns nothing until the payments table exists (foundation step 4).

## Edge Functions

- `bun run fn:serve` serves `functions/` on the local stack (this CLI version does not serve them on
  `supabase start`).
- `bun run test:stack` runs the `*.integration.ts` tests against the running stack and served
  functions: `account-delete` (user A deletes itself, user B is untouched, calls without a user
  token are rejected) and the app's profile service under RLS.
- Request handling lives in `handler.ts` (no Deno APIs), unit-tested by `bun test`; `index.ts` wires
  Deno and the service-role client and is excluded from `tsc`.
