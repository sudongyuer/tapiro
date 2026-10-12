# Supabase (local)

Requires Docker and the `supabase` CLI.

- `bun run db:start` starts the local stack and applies `migrations/`.
- `bun run db:reset` rebuilds the local database from the migrations.
- `bun run db:test` runs the pgTAP tests in `tests/`.

Studio runs at http://127.0.0.1:54323 and the API at http://127.0.0.1:54321.
