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
function answers 2xx on success and 409 when deletion is blocked by an unsettled payment.
