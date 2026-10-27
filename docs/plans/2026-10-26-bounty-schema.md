# Bounty step 1: schema, RLS, transitions and scheduled jobs Implementation Plan

> **For agentic workers:** execute task by task. If a plan-execution skill is
> available (for example superpowers `subagent-driven-development` or
> `executing-plans`), use it. Track steps with checkboxes (`- [ ]`). When all
> tasks are done, run `spec-lifecycle` before opening the PR.

**Goal:** The server runs the whole v1 bounty lifecycle with no UI: a poster publishes (coin or free slot, blocked
while unpaid), others apply with a note, the poster selects one helper, the helper starts, completes and fixes
「有问题」, the poster confirms (or 48 h confirms for them), a payment opens, and settlement shows through. Expiry,
cancellation with the no-show record, account deletion and the read model the later UI steps consume are all in place
and covered by pgTAP.

**Architecture:** Eight Supabase migrations: `postgis`, five tables with RLS, `security definer` transition RPCs that
call the prerequisite contracts (`publish_blocked`, `spend_post`, `refund_post`, `record_no_show`, `open_payment`),
one pg_cron job in SQL, read RPCs returning JSON, and an `auth.users` delete trigger. The `account-delete` Edge
Function gains the active-bounty check. `src/` is untouched.

**Tech stack:** Postgres 15 on Supabase (`supabase/config.toml` `major_version = 15`, `ap-southeast-1`), PostGIS in
the `extensions` schema, pg_cron, pgTAP through the Supabase CLI (`bun run db:test`); Deno Edge Function with its
handler unit-tested by `bun test`.

**Spec:** `docs/specs/2026-10-11-bounty-design.md` (approved): Implementation order step 1; Decisions; Decisions
(2026-10-26) incl. follow-up answers; Data flow and ownership; Errors and degradation; Prerequisites notes; UI/UX
9A, 13A, 15A and the one-time cards' seen flag (server pieces only). Built contracts:
`docs/plans/2026-10-26-bounty-prerequisites.md` ("Deviations and rulings") and `supabase/README.md`.

## Global constraints

- Zero comments in SQL and TypeScript unless they explain unexpected behaviour or a hidden invariant (AGENTS.md
  Conventions). The bar is the existing migrations: one line on a lock, one on an alphabet.
- Every function that bypasses RLS is `security definer` with `set search_path = ''` and schema-qualified names;
  PostGIS calls are `extensions.st_*` and types `extensions.geography`.
- After every new function: `revoke all on function … from public, anon, authenticated`. Client RPCs then grant
  `authenticated` and read the actor from `(select auth.uid())`, never from an argument. Service-role functions grant
  `service_role`. Internal helpers live in `private` with no grant (pattern: `private.record_settled`), except
  helpers that RLS policies call, which grant `authenticated` (pattern: `private.is_blocked_between`).
- Tables: `enable row level security`, `revoke all … from anon, authenticated`, then the narrowest `grant select`
  and policy. Clients never `insert`, `update` or `delete` a bounty table; every write is an RPC (spec: "Clients never
  update `status` directly").
- Typed rejections: SQLSTATE plus an exact message slug, tested with `throws_ok(sql, code, slug, description)`. The
  slug list in "Rejection reasons" is the contract steps 3–6 map to copy. Prerequisite slugs (`no_balance`,
  `payment_exists`) pass through unchanged.
- Data integrity (AGENTS.md): no write is replayed automatically; a replayed call (same actor, same action, already
  applied) returns the first outcome and writes nothing; a failed publish debits nothing; nothing failed is reported
  as empty or complete.
- Malaysia time is `Asia/Kuala_Lumpur`; month boundaries use `public.malaysia_month(at)` (built).
- iOS only; no Android anything. No new npm or Deno dependencies. No `src/` changes: the client service, types and
  screens belong to steps 3–6.
- `bun run db:reset` only against the local stack. Never reset or migrate the hosted project from a task.
- Files under 500 lines (a migration over 500 lines splits). One migration per task.
- Checks at the end of every task, judged by exit status: `bun run db:reset && bun run db:test` (CI does not run
  pgTAP, so the task runs it), `bun test`, `bunx tsc --noEmit`, `bun run lint -- <changed .ts files>` (Task 8 only),
  `bun run format:check`, `node scripts/check-specs.mjs --dir docs/specs`, `node scripts/check-story-map.mjs`.
  `bun run verify:smoke` runs once in Task 9 (no screen changes, but the PR rule requires it).
- pgTAP style: one file per area, `begin; select plan(n); … select * from finish(); rollback;`, fixture users in
  `auth.users` with the `…a1` / `…b2` / `…c3` ids, `pg_temp.act_as(uid)` plus `set local role authenticated` for
  client calls, `reset role` for service calls, time moved by backdating columns as the owner. Every assertion must be
  able to fail (assert the state before and after, not only "no error").
- Story-map rows: criterion ids start with their story id; coverage names the real file
  (`db:supabase/tests/<file>.test.sql`); UI coverage stays planned (`ui`) for the step that builds the screen.
  Stories this plan touches move to `状态：building`.

## Migration numbering

Prerequisites end at `20261026000700`; `20261026000800` is reserved for the pending prerequisite Task 3
(`reputation_snapshots`). This plan uses `20261026000900` … `20261026001400`, `20261026001600` and, for Task 7
(which ran after Task 8), `20261026001700`, so no migration is ever older than one already written. Task 3 must be
applied to the hosted project before these, or `supabase db push` needs `--include-all` (Open question 1); this
branch is not pushed to the hosted project until `20261026000800` has landed.

## Rejection reasons

| Slug                  | SQLSTATE | When                                                                                         |
| --------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `bounty_not_found`    | `P0002`  | No bounty with that id is visible to the caller                                              |
| `invalid_bounty`      | `22023`  | Publish input breaks a rule not covered by a check constraint (times, place pairing, address) |
| `publish_blocked`     | `55000`  | `publish_blocked()` is true for the poster                                                   |
| `no_balance`          | `55000`  | From `spend_post`: no free slot and no coin                                                  |
| `own_bounty`          | `22023`  | The poster applies to their own bounty                                                       |
| `no_payee_method`     | `55000`  | The applicant has no `payee_methods` row (cash counts)                                       |
| `blocked`             | `42501`  | Either side blocked the other (visibility to the blocked side: Open question 4)              |
| `taken`               | `55000`  | Apply or select after a helper was selected                                                  |
| `closed`              | `55000`  | The bounty is `closed` or `cancelled`, or `open` past `expires_at` before the job ran       |
| `not_pending`         | `55000`  | Select an applicant whose application is not `pending`; withdraw a non-pending application  |
| `not_poster`          | `42501`  | A poster-only action by someone else                                                         |
| `not_helper`          | `42501`  | A helper-only action by someone else                                                         |
| `invalid_transition`  | `55000`  | The action is not allowed from the current status (matrix below)                             |
| `invalid_reason`      | `22023`  | 「有问题」 reason empty or over the limit                                                     |

Text limits and the reward are `char_length` / range checks in the table and raise `23514` (tested per column).

## Transition matrix

`P` = poster, `H` = selected helper, `A` = any other signed-in user. ✓ = allowed (target in brackets). Every blank
cell raises the reason in the last column of its row, and Tasks 2–5 test every cell.

| Action (actor)                 | open            | assigned      | en_route     | done            | disputed       | confirmed | closed | cancelled | Blank cells raise                     |
| ------------------------------ | --------------- | ------------- | ------------ | --------------- | -------------- | --------- | ------ | --------- | ------------------------------------- |
| `apply_to_bounty` (A)          | ✓ (open)        |               |              |                 |                |           |        |           | `taken` (assigned…confirmed), `closed` |
| `withdraw_application` (A)     | ✓ (open)        |               |              |                 |                |           |        |           | `not_pending`                         |
| `close_bounty` (P)             | ✓ (closed)      |               |              |                 |                |           |        |           | `invalid_transition`                  |
| `select_helper` (P)            | ✓ (assigned)    |               |              |                 |                |           |        |           | `taken` (assigned…confirmed), `closed` |
| `start_bounty` (H)             |                 | ✓ (en_route)  |              |                 |                |           |        |           | `invalid_transition`                  |
| `update_eta` (H)               |                 |               | ✓ (en_route) |                 |                |           |        |           | `invalid_transition`                  |
| `complete_bounty` (H)          |                 |               | ✓ (done)     |                 | ✓ (done)       |           |        |           | `invalid_transition`                  |
| `report_bounty_problem` (P)    |                 |               |              | ✓ (disputed)    |                |           |        |           | `invalid_transition`                  |
| `confirm_bounty` (P)           |                 |               |              | ✓ (confirmed)   | ✓ (confirmed)¹ |           |        |           | `invalid_transition`                  |
| `cancel_bounty` (P or H)       |                 | ✓ (cancelled) | ✓ (cancelled) |                |                |           |        |           | `invalid_transition`                  |
| job: expire                    | ✓² (closed)     |               |              |                 |                |           |        |           | not touched                           |
| job: auto-confirm              |                 |               |              | ✓³ (confirmed)  |                |           |        |           | not touched                           |

¹ Open question 3 (default: allowed). ² Only when `expires_at <= as_of`. ³ Only when `done_at + 48 h <= as_of`;
`disputed` is never auto-confirmed. `settled` is not a stored status: it is `confirmed` whose forward payment is
`settled` (Task 7). A replay by the same actor whose action already produced the current status returns the first
outcome (e.g. `start_bounty` on `en_route` started by the caller) instead of `invalid_transition`; `complete_bounty`
replayed on `done` does not restart the 48 h clock.

## File structure

| Action | Path                                                          | Responsibility                                                                          |
| ------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Create | `supabase/migrations/20261026000900_bounties.sql`             | `postgis`, enums, `bounties`, `bounty_addresses`, `bounty_applications`, `bounty_events`, `bounty_seen`, RLS |
| Create | `supabase/migrations/20261026001000_bounty_publish.sql`       | `publish_bounty`, `close_bounty`, `private.close_bounty`                                |
| Create | `supabase/migrations/20261026001100_bounty_apply.sql`         | `apply_to_bounty`, `withdraw_application`                                               |
| Create | `supabase/migrations/20261026001200_bounty_flow.sql`          | `select_helper`, `start_bounty`, `update_eta`, `complete_bounty`, `report_bounty_problem`, `confirm_bounty`, `private.confirm_bounty` |
| Create | `supabase/migrations/20261026001300_bounty_cancel.sql`        | `cancel_bounty`, `bounty_cancel_preview`, `private.no_show_offender`                    |
| Create | `supabase/migrations/20261026001400_bounty_jobs.sql`          | `run_bounty_jobs()`, `private.run_bounty_jobs(as_of)`, cron `bounty-jobs`               |
| Create | `supabase/migrations/20261026001600_bounty_account_delete.sql` | `active_bounties_of(user)`, `auth.users` before-delete trigger                         |
| Create | `supabase/migrations/20261026001700_bounty_read.sql`          | `private.bounty_status`, `bounty_detail`, `my_bounties`, `bounty_applicants`, `bounty_live_items`, `mark_bounty_seen` |
| Create | `supabase/tests/bounties.test.sql`, `bounty_publish.test.sql`, `bounty_apply.test.sql`, `bounty_flow.test.sql`, `bounty_cancel.test.sql`, `bounty_jobs.test.sql`, `bounty_read.test.sql`, `bounty_account_delete.test.sql` | pgTAP per area |
| Modify | `supabase/functions/account-delete/handler.ts`, `handler.test.ts`, `index.ts` | active bounties in the 409                                                              |
| Modify | `supabase/functions/tests/account-delete.integration.ts`      | a user with an active bounty is not deleted                                              |
| Modify | `supabase/README.md`                                          | a "Bounties" section; the 409 body; "Scheduled functions" gains `bounty-jobs`          |
| Modify | `docs/story-map.md`                                           | criteria per task                                                                       |

## Task 1: PostGIS, tables and RLS

**Files:** create `supabase/migrations/20261026000900_bounties.sql`, `supabase/tests/bounties.test.sql`; modify
`docs/story-map.md`.

**Interfaces**

- Consumes: `public.bounty_category` (domain), `public.payment_item_kind`, `private.is_blocked_between`.
- Produces: every table below, used by Tasks 2–8 and by `nearby_bounties` in step 2.

```
create extension if not exists postgis with schema extensions;

type public.bounty_status as enum ('open', 'assigned', 'en_route', 'done', 'disputed', 'confirmed', 'closed', 'cancelled')
type public.bounty_payment_timing as enum ('after', 'before')
type public.bounty_gate as enum ('anyone', 'reliable', 'very_reliable')
type public.bounty_application_status as enum ('pending', 'withdrawn', 'selected', 'not_selected')
type public.bounty_event_kind as enum ('published', 'applied', 'withdrawn', 'selected', 'started', 'eta_changed',
  'start_reminder', 'completed', 'problem_reported', 'confirmed', 'auto_confirmed', 'closed', 'expired', 'cancelled')
type public.bounty_seen_card as enum ('not_selected', 'expired')

table public.bounties (
  id uuid primary key,                                   -- client-generated, the publish idempotency key
  poster_id uuid references auth.users on delete set null,
  helper_id uuid references auth.users on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 60),
  description text check (char_length(description) between 1 and 500),
  category public.bounty_category not null,
  reward_sen integer not null check (reward_sen between 100 and 50000 and reward_sen % 100 = 0),
  place extensions.geography(Point, 4326),
  place_label text check (char_length(btrim(place_label)) between 1 and 80),
  starts_at timestamptz, ends_at timestamptz, deadline_at timestamptz,
  published_at timestamptz not null default now(),
  expires_at timestamptz not null,
  sticker_path text check (char_length(sticker_path) between 1 and 200),
  status public.bounty_status not null default 'open',
  payment_timing public.bounty_payment_timing not null default 'after' check (payment_timing = 'after'),
  gate public.bounty_gate not null default 'anyone' check (gate = 'anyone'),
  eta_at timestamptz, previous_eta_at timestamptz,
  done_at timestamptz,
  status_changed_at timestamptz not null default now(),
  created_at, updated_at (set_updated_at trigger),
  check ((place is null) = (place_label is null)),
  check (ends_at is null or (starts_at is not null and ends_at > starts_at)),
  check ((status in ('open', 'closed')) = (helper_id is null) or status = 'cancelled'),
  check ((status = 'done') = (done_at is not null) or status not in ('done', 'disputed'))
)
index bounties_place gist (place) where status = 'open'
index bounties_open_expiry (expires_at) where status = 'open'
index bounties_done (done_at) where status = 'done'
index bounties_poster (poster_id, status), bounties_helper (helper_id, status)

table public.bounty_addresses (
  bounty_id uuid primary key references public.bounties on delete cascade,
  address text not null check (char_length(btrim(address)) between 1 and 120)
)
table public.bounty_applications (
  bounty_id uuid references public.bounties on delete cascade,
  applicant_id uuid references auth.users on delete cascade,
  note text check (char_length(note) between 1 and 140),
  status public.bounty_application_status not null default 'pending',
  created_at, updated_at,
  primary key (bounty_id, applicant_id)
)
unique index bounty_applications_one_selected (bounty_id) where status = 'selected'
table public.bounty_events (
  id bigint generated always as identity primary key,
  bounty_id uuid not null references public.bounties on delete cascade,
  kind public.bounty_event_kind not null,
  actor_id uuid references auth.users on delete set null,
  from_status public.bounty_status, to_status public.bounty_status,
  eta_at timestamptz, previous_eta_at timestamptz,
  reason text check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
)
unique index bounty_events_one_reminder (bounty_id) where kind = 'start_reminder'
table public.bounty_seen (
  user_id uuid references auth.users on delete cascade,
  bounty_id uuid references public.bounties on delete cascade,
  card public.bounty_seen_card not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, bounty_id, card)
)
```

The inline `--` notes above are plan annotations, not migration comments. The two status checks are written as
clear `case` expressions in the migration; their meaning: a helper exists exactly in `assigned` … `confirmed` and
may remain on `cancelled`; `done_at` is set in `done` and kept in `disputed`.

RLS (all `grant select` only; no client writes):

- `bounties`: poster or helper always; anyone else when `not private.is_blocked_between(auth.uid(), poster_id)` and
  (`status = 'open'` or they hold an application on it).
- `bounty_addresses`: the poster; the helper while the bounty is `assigned` … `confirmed`.
- `bounty_applications`: the applicant; the bounty's poster, except rows where either blocked the other.
- `bounty_events`: the poster and the helper of the bounty.
- `bounty_seen`: own rows.

**Steps**

- [ ] Write `supabase/tests/bounties.test.sql` (rows inserted as the owner, since the RPCs come later):
  - `postgis` is installed in `extensions`; `extensions.st_distance` between two fixture points near Sunway returns
    a positive number of metres.
  - Each check raises `23514`: reward 99, 50001, 150; title of 61 characters, place label 81, description 501, note
    141, address 121; a category `'parcel'`; place without label; `ends_at` before `starts_at`; `payment_timing =
    'before'`; `gate = 'reliable'`. Boundary values (100, 50000, 60/80/500/140/120 characters) insert.
  - A second `selected` application on one bounty raises `23505`.
  - Visibility as clients: an open bounty is read by C; after poster A blocks C, C reads zero bounties and C's
    pending application is no longer in A's application read; B (unrelated) still reads it. An `assigned` bounty is
    read by A and helper B and not by unrelated C; an applicant D whose application was `not_selected` still reads it.
  - `bounty_addresses`: A reads it; B reads it only once the bounty is `assigned`; C never; after `cancelled` B does
    not.
  - `bounty_events`: poster and helper read; an applicant does not.
  - `bounty_seen`: a client reads only own rows.
  - Client `insert`, `update`, `delete` on each of the five tables raise `42501`; `anon` reads nothing.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`.
- [ ] Story map: `bounty.post`, `bounty.apply`, `bounty.flow` to 状态 building. `bounty.post.limits` text becomes
      「报酬 RM 1–500 整数，标题 60、地点 80、描述 500、详细地址 120 个字，服务器同样检查」 with
      `db:supabase/tests/bounties.test.sql, unit`; add `bounty.post.category` (类别只能是八种之一) `db:…bounties.test.sql`;
      `bounty.apply.address` gets `db:supabase/tests/bounties.test.sql`; add `bounty.board.blocked`
      (任何一方拉黑后，看不到对方的悬赏，也看不到对方的申请) `db:supabase/tests/bounties.test.sql`.
- [ ] Commit: `feat(bounty): tables, postgis and row-level security`

## Task 2: Publish, close and refund

**Files:** create `supabase/migrations/20261026001000_bounty_publish.sql`, `supabase/tests/bounty_publish.test.sql`;
modify `docs/story-map.md`.

**Interfaces**

- Consumes: `publish_blocked()`, `spend_post(poster, kind, item)`, `refund_post(kind, item)`.
- Produces: `private.close_bounty(bounty, kind)` used by Task 6 (expiry) and Task 8 (deletion).

```
public.publish_bounty(
  id uuid, title text, category public.bounty_category, reward_sen integer,
  description text default null, place_label text default null,
  latitude double precision default null, longitude double precision default null,
  address text default null, starts_at timestamptz default null, ends_at timestamptz default null,
  deadline_at timestamptz default null
) returns jsonb    authenticated
  → { "id": uuid, "status": "open", "charge": "free" | "coin", "expiresAt": timestamptz }
  order: validate → publish_blocked() → insert bounty (+ address, + 'published' event) → spend_post(auth.uid(), 'bounty', id)
  expires_at = coalesce(deadline_at, now() + interval '7 days')
  replay: the same id by the same poster returns the stored row's answer and writes nothing (charge from post_charges)
public.close_bounty(bounty uuid) returns jsonb   authenticated, poster only, open → closed
  → { "status": "closed", "refund": "free" | "coin" }
private.close_bounty(bounty uuid, why public.bounty_event_kind) returns text   internal ('closed' or 'expired')
  status closed, event, refund_post('bounty', id); pending applications keep their status (Open question 2)
```

- Rejections: `publish_blocked`, `no_balance` (nothing written: the whole transaction rolls back), `invalid_bounty`
  for latitude without longitude, a place without a label or a label without a place, an address without a place,
  `starts_at`, `deadline_at` or `ends_at` in the past, `deadline_at` or `starts_at` more than 30 days out (Open
  question 6; final review M5), `deadline_at` before `starts_at`, an id that exists for another poster. `close_bounty`: `not_poster`, `invalid_transition` from any status but `open`; a
  replay on `closed` by the poster returns the first answer.
- `title`, `place_label`, `description`, `address` are stored `btrim`-ed; empty strings become null for the optional
  ones.

**Steps**

- [ ] Write `supabase/tests/bounty_publish.test.sql`:
  - A publish as A returns `free`, the bounty is `open` with `expires_at` = `published_at + 7 days`, one
    `published` event, a `post_charges` row, and `coin_balance()` shows one fewer free post.
  - With a deadline, `expires_at` equals it; with a place, the row's `place` is the given point and the address row
    exists and is readable by A.
  - With `publish_blocked()` true for A (two `due` payments as payer), publish raises `55000 publish_blocked`; bounty,
    event and charge counts are unchanged.
  - With three free posts used and balance 0 (drain helper as in `coins.test.sql`), publish raises `55000 no_balance`
    and no bounty, address, event or charge row exists for that id.
  - With a coin, the fourth post returns `coin` and the balance drops by 1.
  - Replaying the same id returns the same `charge` and `expiresAt`; counts unchanged. The same id as poster B raises
    `invalid_bounty`.
  - Each `invalid_bounty` case above raises and writes nothing; a 61-character title raises `23514`.
  - `close_bounty` by A on an open bounty: `closed`, `refund` `free`, `freePostsLeft` restored, a `closed` event;
    a coin-paid one restores the coin. A second call returns the same answer and the ledger count is unchanged.
    `close_bounty` by B raises `42501 not_poster`.
  - `anon` cannot execute `publish_bounty` or `close_bounty`; `authenticated` cannot execute `private.close_bounty`.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`.
- [ ] Story map: add `bounty.post.publish-blocked` (有没付清的钱时发布被拒，什么都不写) `db:…bounty_publish.test.sql, ui`;
      `bounty.post.no-balance` (没有免费名额也没有貘币时发布被拒，什么都不写) `db:…bounty_publish.test.sql, ui`;
      `bounty.post.cost` coverage `db:supabase/tests/bounty_publish.test.sql, unit`; add `bounty.post.replay`
      (同一条重发只发布一次、只扣一次) `db:…`; `bounty.flow.refund` text 「没人被选中就关掉、过期或挑人前取消，退回貘币或免费
      名额；挑人后取消不退」, coverage `db:supabase/tests/bounty_publish.test.sql, db:supabase/tests/bounty_jobs.test.sql,
      db:supabase/tests/bounty_cancel.test.sql`.
- [ ] Commit: `feat(bounty): publish with coin spend and close with refund`

## Task 3: Apply and withdraw

**Files:** create `supabase/migrations/20261026001100_bounty_apply.sql`, `supabase/tests/bounty_apply.test.sql`;
modify `docs/story-map.md`.

```
public.apply_to_bounty(bounty uuid, note text default null) returns jsonb   authenticated
  → { "status": "pending", "note": text | null }
  checks in order: visible (else bounty_not_found) → not own (own_bounty) → blocked → status/expiry (taken | closed)
  → payee method → insert or reopen; 'applied' event
  a pending application: returns it unchanged (replay); a withdrawn one: back to pending with the new note (Open question 9)
public.withdraw_application(bounty uuid) returns jsonb   authenticated, applicant
  pending → withdrawn while the bounty is open; 'withdrawn' event; replay on withdrawn returns the same answer
```

- The bounty row is locked `for update` in both, so an apply cannot land after a select commits.
- `open` with `expires_at <= now()` answers `closed` (the job may not have run yet).

**Steps**

- [ ] Write `supabase/tests/bounty_apply.test.sql`:
  - B with a cash method applies with a note: one `pending` row, one `applied` event; A reads it, C does not.
  - B without any payee method: `55000 no_payee_method`, no row; after adding cash, the same call succeeds.
  - A applying to own bounty: `22023 own_bounty`.
  - A blocked B (and separately B blocked A): B's apply raises `42501 blocked` (or the slug ruled in Open question 4)
    and writes nothing; after unblock it succeeds.
  - Apply on `assigned` raises `taken`; on `closed` and `cancelled` raises `closed`; on an `open` row backdated past
    `expires_at` raises `closed`. Apply on `en_route`, `done`, `disputed`, `confirmed` raises `taken`.
  - A 141-character note raises `23514`; an empty note is stored as null.
  - Replaying apply keeps one row and the first note; withdraw makes it `withdrawn`, a second withdraw returns the same
    answer; applying again makes it `pending` with the new note.
  - Withdraw with no application raises `not_pending`; withdraw after `not_selected` raises `not_pending`.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`.
- [ ] Story map: `bounty.apply.apply` coverage `ui, db:supabase/tests/bounty_apply.test.sql`;
      `bounty.apply.no-payee` coverage `db:supabase/tests/bounty_apply.test.sql, ui`; add `bounty.apply.blocked`
      (任何一方拉黑后不能申请) and `bounty.apply.closed` (已选好人、已关闭或已过期的悬赏不能申请，原因分开), both `db:…`.
- [ ] Commit: `feat(bounty): apply and withdraw with payee-method and block checks`

## Task 4: Select, start, ETA, complete, 「有问题」, confirm

**Files:** create `supabase/migrations/20261026001200_bounty_flow.sql`, `supabase/tests/bounty_flow.test.sql`;
modify `docs/story-map.md`.

**Interfaces**

- Consumes: `open_payment(kind, item, item_title, payer, payee, amount, reversing, item_category)` (8 arguments,
  built), `payments_one_forward_per_item`.
- Produces: `private.confirm_bounty(bounty, actor)` used by the auto-confirm job (Task 6).

```
public.select_helper(bounty uuid, applicant uuid) returns jsonb    poster; open → assigned
  → { "status": "assigned", "helperId": uuid }
  the chosen application → selected, every other pending → not_selected, helper_id set, 'selected' event
  replay with the same applicant on assigned returns the same answer; another applicant raises taken
public.start_bounty(bounty uuid, eta timestamptz default null) returns jsonb   helper; assigned → en_route
public.update_eta(bounty uuid, eta timestamptz) returns jsonb       helper; en_route; previous_eta_at := old eta_at,
  'eta_changed' event with both times; an eta in the past or equal to the current one raises invalid_bounty
public.complete_bounty(bounty uuid) returns jsonb                  helper; en_route | disputed → done
  done_at := now() (a fresh 48 h after 「有问题」); → { "status": "done", "autoConfirmAt": done_at + 48 h }
public.report_bounty_problem(bounty uuid, reason text) returns jsonb   poster; done → disputed; reason in the event
public.confirm_bounty(bounty uuid) returns jsonb                   poster; done (| disputed, Open question 3) → confirmed
  → { "status": "confirmed", "paymentId": uuid }
private.confirm_bounty(bounty uuid, actor uuid) returns uuid       internal; status, event ('confirmed' when actor is
  not null, 'auto_confirmed' otherwise), open_payment('bounty', id, title, poster_id, helper_id, reward_sen, null, category)
```

- Select rejects `not_pending` for an applicant who withdrew or who blocked the poster since applying, `blocked`
  when the poster blocked the applicant, `no_payee_method` when the applicant has no payee method left, `closed`
  when expired (final review M1, M7). The bounty row is locked `for update`; the second of two selects sees `assigned`
  and raises `taken` (UI 6A 「已经选好了」).
- `reason`: 1–140 characters after `btrim` (Open question 5), else `invalid_reason`.
- Confirm replayed on `confirmed`, or called after the job auto-confirmed (final review M2), returns the same
  `paymentId`; a `payment_exists` from `open_payment` cannot occur
  through the RPCs and is not caught.

**Steps**

- [ ] Write `supabase/tests/bounty_flow.test.sql` with a `pg_temp.bounty_in(status)` helper that drives a fresh bounty
      to each status through the RPCs (A posts, B and D apply, A selects B):
  - Every ✓ cell of the matrix for this task's actions moves to its target and writes exactly one event with the
    right `from_status`, `to_status` and `actor_id`.
  - Every blank cell for these actions, in all eight statuses, raises its reason (loop over statuses, one
    `throws_ok` each), and the status is unchanged afterwards.
  - Wrong actor: B calls `select_helper`, D calls `start_bounty`, B calls `confirm_bounty` and
    `report_bounty_problem`, A calls `complete_bounty`: each `42501` with `not_poster` / `not_helper`.
  - Select: B becomes `selected`, D `not_selected`, a withdrawn E stays `withdrawn`; selecting D afterwards raises
    `taken`; replaying B returns the same answer.
  - ETA: start with 18:00, change to 18:20: `eta_at` 18:20, `previous_eta_at` 18:00, an `eta_changed` event with both.
  - 「有问题」: `done` → `disputed` with the reason in the event, readable by B; `complete_bounty` again sets a new
    `done_at` later than the first (backdate the first by 47 h, then assert `autoConfirmAt` is about now + 48 h).
  - Confirm: one forward payment with payer A, payee B, `amount_sen` = reward, `title`, `category`, state `due`;
    replay returns the same `paymentId` and the payment count stays 1; B sees it in `payments`.
  - Replay of `start_bounty` and `complete_bounty` by the helper returns the same answer; `complete_bounty` replayed
    does not move `done_at`.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`.
- [ ] Story map: add `bounty.flow.transitions` (每个允许和禁止的状态变化都由服务器检查，原因分类型)
      `db:supabase/tests/bounty_flow.test.sql, db:supabase/tests/bounty_cancel.test.sql`; `bounty.flow.start` coverage
      `db:…bounty_flow.test.sql, ui`; add `bounty.flow.dispute` (「有问题」暂停自动确认，接单人能看到原因；再点完成重新算
      48 小时) `db:…bounty_flow.test.sql, db:…bounty_jobs.test.sql, ui`; add `bounty.flow.payment` (确认完成后开一笔
      付款，带类别，每个悬赏只有一笔) `db:…bounty_flow.test.sql`; `bounty.apply.select` adds
      `db:supabase/tests/bounty_flow.test.sql` and a `gap: concurrency needs two sessions（两台设备同时挑人要两个数据库
      会话；单会话测了第二次挑人得到 taken）`.
- [ ] Commit: `feat(bounty): select, start, complete, problem and confirm with payment`

## Task 5: Cancellation and the no-show record

**Files:** create `supabase/migrations/20261026001300_bounty_cancel.sql`, `supabase/tests/bounty_cancel.test.sql`;
modify `docs/story-map.md`.

```
private.no_show_offender(b public.bounties, canceller uuid) returns uuid   internal
  the helper when the canceller is the poster, the status is 'assigned', starts_at is not null and
  now() > greatest(starts_at, the 'selected' event's created_at) + interval '30 minutes' (B4; final review I1);
  otherwise the canceller
public.bounty_cancel_preview(bounty uuid) returns jsonb   poster or helper, assigned | en_route
  → { "offender": "self" | "other", "waiverAvailable": boolean }   waiverAvailable only when offender = self, else null
public.cancel_bounty(bounty uuid) returns jsonb   poster or helper; assigned | en_route → cancelled
  → { "status": "cancelled", "offender": "self" | "other", "noShow": "waived" | "counted" | null }
  record_no_show(offender, 'bounty', id); 'cancelled' event with the canceller; no refund_post; noShow is null when
  the offender is the other side (the canceller does not learn the other's waiver)
```

- `waiverAvailable` reads `reputation_events` inside the definer function (clients cannot read the table); it feeds
  UI 8A's action sheet. Concurrent cancels are serialised by `record_no_show`'s per-offender lock and the bounty row
  lock.
- The selected application stays `selected`; the address stops being readable by the helper (Task 1 policy).

**Steps**

- [ ] Write `supabase/tests/bounty_cancel.test.sql`:
  - Helper cancels `assigned`: `cancelled`, `offender` self, `noShow` `waived` (first in 60 days), one `no_show` event
    for B with `waived = true`; a second bounty cancelled by B within 60 days answers `counted`.
  - Poster cancels `en_route`: the no-show is A's.
  - Poster cancels `assigned` 31 minutes after `starts_at` (backdated): the no-show is B's, `offender` other, `noShow`
    null; at 29 minutes it is A's; with no `starts_at` it is A's.
  - `bounty_cancel_preview` matches the later `cancel_bounty` outcome in each of the three cases and writes nothing
    (event and reputation counts unchanged).
  - No `post_refund` ledger row and `refunded_at` stays null after a cancel.
  - D (not a party) raises `42501 not_helper`; every blank matrix cell for `cancel_bounty` raises
    `invalid_transition` and leaves the status.
  - Replay by the same canceller returns the first answer and `reputation_events` count is unchanged.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`.
- [ ] Story map: `bounty.flow.cancel` text 「挑人后任何一方取消都记一次放鸽子，60 天豁免一次；约定开始 30 分钟后接单人还没出发，
      发布者取消算接单人的」, coverage `db:supabase/tests/bounty_cancel.test.sql, unit`; add `bounty.flow.cancel-preview`
      (取消前告诉自己会不会算放鸽子、还有没有豁免) `db:…bounty_cancel.test.sql, ui`.
- [ ] Commit: `feat(bounty): cancellation with the no-show record`

## Task 6: Scheduled jobs

**Files:** create `supabase/migrations/20261026001400_bounty_jobs.sql`, `supabase/tests/bounty_jobs.test.sql`;
modify `docs/story-map.md`, `supabase/README.md`.

```
public.run_bounty_jobs() returns jsonb   service_role; private.run_bounty_jobs(now())
private.run_bounty_jobs(as_of timestamptz) returns jsonb   no grant; tests run it as the owner
  → { "expired": n, "autoConfirmed": n, "reminded": n, "skipped": n }   skipped: rows whose change failed
  expire:       open and expires_at <= as_of → private.close_bounty(id, 'expired')
  auto-confirm: done and done_at + interval '48 hours' <= as_of → private.confirm_bounty(id, null)
  remind:       assigned and starts_at <= as_of → one 'start_reminder' event (unique index; on conflict do nothing)
  each row in its own begin … exception block, locked with for update skip locked, so one failure or a concurrent
  user action skips that row until the next run
cron: select cron.schedule('bounty-jobs', '*/5 * * * *', $$select public.run_bounty_jobs()$$)
```

- SQL directly, no Edge Function (pattern: the prerequisite recompute), so no Vault secret is needed.
- A user action racing the job wins or loses on the row lock; the loser's RPC sees the new status and answers by the
  matrix (e.g. a poster confirming a row the job just confirmed gets the replay answer only if they were the actor,
  otherwise `invalid_transition`).

**Steps**

- [ ] Write `supabase/tests/bounty_jobs.test.sql`:
  - An open bounty without a deadline published 7 days + 1 minute ago (backdated) closes with an `expired` event and
    its free slot back; one published 6 days 23 hours ago stays open.
  - An open bounty whose deadline passed closes; one with a future deadline stays open even after 7 days.
  - An expired bounty that had a coin charge gets the coin back; an `assigned` bounty past its deadline is untouched.
  - A `done` bounty with `done_at` 48 h + 1 minute ago becomes `confirmed` with an `auto_confirmed` event (null actor)
    and one `due` payment with the category; at 47 h 59 min it stays `done`; a `disputed` bounty with an old
    `done_at` stays `disputed`.
  - After 「有问题」 and 完成 again (fresh `done_at`), a run at the old `done_at + 48 h` does not confirm.
  - An `assigned` bounty with `starts_at` passed gets one `start_reminder` event; a second run adds none.
  - The returned counts match; a second run immediately after returns zeros.
  - `cron.job` has `bounty-jobs` with schedule `*/5 * * * *`; `authenticated` cannot execute `run_bounty_jobs`.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`.
- [ ] Story map: `bounty.flow.auto-confirm` coverage `db:supabase/tests/bounty_jobs.test.sql, unit`; add
      `bounty.post.expiry` (没有截止时间的悬赏 7 天后关闭、有截止时间的到点关闭，没人被选中就退回) `db:…bounty_jobs.test.sql`;
      add `bounty.flow.reminder` (约定开始时间到了还没出发，双方都看到提醒) `db:…bounty_jobs.test.sql, ui`.
- [ ] `supabase/README.md` "Scheduled functions": `bounty-jobs` every 5 minutes in SQL.
- [ ] Commit: `feat(bounty): expiry, 48-hour auto-confirm and start reminders on a schedule`

## Task 7: Read model, settled derivation and seen flags

**Files:** create `supabase/migrations/20261026001700_bounty_read.sql`, `supabase/tests/bounty_read.test.sql`;
modify `docs/story-map.md`.

A non-selected applicant still reads the bounty row (`private.has_applied`), `helper_id` included; the read model
must not pass the helper's identity to them (final review M9).

**Interfaces**

- Consumes: `public.reputation_tier(uid)` from prerequisite Task 3 (Open question 1), `payments`, `post_charges`.
- Produces: the JSON contracts steps 3–6 read. All are `stable`, `security definer`, `authenticated`, and apply the
  Task 1 visibility rules themselves (blocked pairs see nothing).

```
private.bounty_status(b public.bounties) returns text   'settled' when b.status = 'confirmed' and its forward bounty
  payment is settled, else b.status::text

public.bounty_detail(bounty uuid) returns jsonb
  { id, title, description, category, rewardSen, status (derived), viewerRole: 'poster'|'helper'|'applicant'|'viewer',
    place: { label, latitude, longitude } | null, address (poster, or helper in assigned…confirmed; else null),
    startsAt, endsAt, deadlineAt, expiresAt, publishedAt,
    poster: { id, name, tier }, helper: { id, name, tier } | null (poster and helper only),
    myApplication: { status, note } | null, applicantCount (poster only, pending only),
    etaAt, previousEtaAt, autoConfirmAt (done only), startLate (assigned and now ≥ starts_at),
    issueReason (disputed: the latest problem_reported reason; poster and helper only),
    payment: { id, state } | null (poster and helper only),
    events: [{ kind, at, actor: 'poster'|'helper'|null, from, to, etaAt, previousEtaAt, reason }] (poster and helper only) }
  rejects bounty_not_found when the caller cannot see it
public.my_bounties() returns jsonb
  { posted: [summary], applied: [summary] }   every non-terminal row, plus the 20 most recent terminal rows of each list;
  summary = { id, title, category, rewardSen, status (derived), placeLabel, startsAt, deadlineAt, expiresAt,
              applicantCount (posted), applicationStatus (applied), counterpartName }
public.bounty_applicants(bounty uuid) returns jsonb   poster only (not_poster otherwise)
  [{ applicantId, name, tier, note, status, appliedAt }] pending and selected, oldest first; blocked pairs excluded
public.bounty_live_items() returns jsonb   the caller's items, unranked
  [{ bountyId, title, category, rewardSen, role: 'poster'|'helper'|'applicant',
     kind: 'bountyAction'|'bountyInProgress'|'oneTime',
     action: 'choose'|'start'|'confirm'|'resolveIssue'|null, card: 'not_selected'|'expired'|null,
     status, counterpartName, applicantCount, startsAt, startLate, etaAt, previousEtaAt, autoConfirmAt,
     issueReason, refund: 'free'|'coin'|null }]
public.mark_bounty_seen(bounty uuid, card public.bounty_seen_card) returns void   idempotent (on conflict do nothing);
  rejects bounty_not_found when the caller has no such card on that bounty
```

Live-item rules (UI 9A; one item per bounty per user; `confirmed` and `settled` produce none because the built payment
source already shows the poster's 付给 card and the helper's 「等{name}付款」 card, see Spec contradiction 1):

| Role      | Status                       | Item                                                          |
| --------- | ---------------------------- | ------------------------------------------------------------- |
| poster    | open, ≥ 1 pending applicant  | `bountyAction` / `choose` with `applicantCount`               |
| poster    | open, none                   | `bountyInProgress`                                            |
| helper    | assigned                     | `bountyAction` / `start` (`startLate` when past `starts_at`)  |
| poster    | assigned, en_route, disputed | `bountyInProgress` (`startLate`, ETA, `issueReason`)          |
| helper    | en_route, done               | `bountyInProgress` (ETA, `autoConfirmAt`)                     |
| poster    | done                         | `bountyAction` / `confirm` with `autoConfirmAt`               |
| helper    | disputed                     | `bountyAction` / `resolveIssue` with `issueReason`            |
| applicant | not_selected, not seen       | `oneTime` / `not_selected`                                    |
| poster    | closed by expiry, not seen   | `oneTime` / `expired` with `refund` from `post_charges`       |
| applicant | pending                      | none (Open question 8)                                         |

**Steps**

- [ ] Write `supabase/tests/bounty_read.test.sql`:
  - Settled derivation: a `confirmed` bounty reads `confirmed`; after B settles the payment through
    `confirm_payment_received` it reads `settled` in `bounty_detail` and `my_bounties`, while `bounties.status` is
    still `confirmed`; B and A each own one sticker with the bounty's category.
  - `bounty_detail`: viewer C on an open bounty gets no `address`, `events`, `payment`, `helper` or
    `applicantCount`; A gets all; B as applicant gets `myApplication` and no address until selected, then the
    address; C blocked by A gets `P0002 bounty_not_found`.
  - `poster.tier` equals `reputation_tier(A)` (requires prerequisite Task 3).
  - `my_bounties`: A's posted list holds the bounty with `applicantCount` 2; B's applied list holds it with
    `pending`; after selection D's row shows `not_selected`.
  - `bounty_applicants` as B raises `not_poster`; as A lists B and D with notes; after A blocks D, D is gone.
  - `bounty_live_items`, one assertion per table row above, driving a bounty into each status; `confirmed` yields no
    bounty item for either side.
  - Seen flags: D has the `not_selected` item; after `mark_bounty_seen(id, 'not_selected')` it is gone for D (and a
    second call is fine); the flag is a row in `bounty_seen`, so a second "device" (a new `act_as` for D) also sees it
    gone. An expired bounty gives A an `expired` item with `refund` `free` until marked seen. Marking a card the
    caller does not have raises `bounty_not_found`.
  - `anon` cannot execute any of the five functions.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`.
- [ ] Story map: add `bounty.flow.settled` (悬赏「已结清」跟着付款走，不单独存) `db:…bounty_read.test.sql`; add
      `bounty.flow.live-items` (首页实时卡：选人、出发、确认完成、处理有问题四种待办，其余进行中) `db:…bounty_read.test.sql,
      unit, ui`; add `bounty.apply.seen` (「这次没选上」「过期了 · 免费次数已退回」看过就消失，换设备也一样)
      `db:…bounty_read.test.sql, ui`; `bounty.apply.select` text adds 「其他人收到「这次没选上」」 coverage
      `db:supabase/tests/bounty_read.test.sql` added.
- [ ] Commit: `feat(bounty): read model, settled derivation and seen flags`

## Task 8: Account deletion

**Files:** create `supabase/migrations/20261026001600_bounty_account_delete.sql`,
`supabase/tests/bounty_account_delete.test.sql`; modify `supabase/functions/account-delete/handler.ts`,
`handler.test.ts`, `index.ts`, `supabase/functions/tests/account-delete.integration.ts`, `supabase/README.md`,
`docs/story-map.md`.

```
public.active_bounties_of(uid uuid) returns table (id uuid, title text, reward_sen integer, role text,
  counterpart_id uuid, status public.bounty_status)    service_role
  bounties where uid is poster or helper and status in ('assigned', 'en_route', 'done', 'disputed');
  'confirmed' is covered by its unsettled payment, which the function already lists
trigger bounties_before_user_delete: before delete on auth.users, security definer function
  closes every open bounty of the user through private.close_bounty(id, 'closed') and deletes their address rows;
  pending applications go with the applications' on delete cascade
```

```ts
export type ActiveBounty = {
  id: string;
  title: string;
  counterpartName: string;
  amountSen: number;
  role: 'poster' | 'helper';
};
export type AccountDeleteDeps = {
  userIdFromToken(token: string): Promise<string | null>;
  findUnsettledPayments(userId: string): Promise<UnsettledPayment[]>;
  findActiveBounties(userId: string): Promise<ActiveBounty[]>;
  deleteUser(userId: string): Promise<void>;
};
// 409 body: { error: 'unsettled_payments', payments: UnsettledPayment[], bounties: ActiveBounty[] }
```

- The cleanup runs in the delete trigger so it is atomic with the deletion: a failed `deleteUser` closes nothing.
- The 409 keeps `error: 'unsettled_payments'` so the shipped client still treats it as blocked; listing bounties in the
  app is Open question 7.

**Steps**

- [ ] `bounty_account_delete.test.sql`: `active_bounties_of` lists an `assigned` bounty for both poster and helper
      with the right role and counterpart, and lists nothing for `open`, `confirmed`, `closed`, `cancelled`; deleting
      a poster with one open bounty (as the owner, `delete from auth.users`) leaves it `closed` with a `closed`
      event and `poster_id` null, its address row gone, its charge refunded, and the ledger row kept with `user_id`
      null; deleting an applicant removes their pending application and the poster's `applicantCount` drops;
      `authenticated` cannot execute `active_bounties_of`.
- [ ] `handler.test.ts`: a user with only an active bounty gets 409 with `bounties` and an empty `payments`, and
      `deleteUser` is not called; both lists present when both exist; a throwing `findActiveBounties` answers 500
      `check_failed` and deletes nothing; no payments and no bounties deletes.
- [ ] `index.ts`: `findActiveBounties` calls `rpc('active_bounties_of', { uid })` with the service client and joins
      display names as `findUnsettledPayments` does.
- [ ] `account-delete.integration.ts`: a user with an assigned bounty (set up through the RPCs as two clients) gets
      409 with that bounty and still exists; run `bun run fn:serve` and `bun run test:stack`.
- [ ] Run `bun run db:reset && bun run db:test`, `bun test supabase/functions/account-delete`,
      `bun run lint -- supabase/functions/account-delete/handler.ts supabase/functions/account-delete/handler.test.ts
      supabase/functions/tests/account-delete.integration.ts`, `bunx tsc --noEmit`.
- [ ] `supabase/README.md`: the 409 body gains `bounties`; "Bounties" section notes the delete trigger.
- [ ] Story map: `account.delete` add `account.delete.bounty` (有进行中的悬赏（已选人、还没确认完成）时不能删除，和没结清的
      付款列在一起；开着的悬赏随删除关掉并退回，申请随删除撤回) with
      `db:supabase/tests/bounty_account_delete.test.sql, unit:supabase/functions/account-delete/handler.test.ts#<exact
      test name>, int:supabase/functions/tests/account-delete.integration.ts, ui`. `account.delete` is `done`, so the
      planned `ui` needs Open question 7's answer: with B it becomes `gap: 列表界面在悬赏第 6 步`.
- [ ] Commit: `feat(account): deletion blocked by an active bounty`

## Task 9: Close-out

- [ ] `supabase/README.md` "Bounties" section: tables and who reads them, every RPC with its arguments, answer and
      rejection slugs (copy "Rejection reasons" and the matrix), the read contracts, and the job.
- [ ] From a clean local stack: `bun run db:reset && bun run db:test`, `bun run fn:serve` + `bun run test:stack`,
      `bun test`, `bunx tsc --noEmit`, `bun run lint -- <changed .ts>`, `bun run format:check`,
      `node scripts/check-specs.mjs --dir docs/specs`, `node scripts/check-story-map.mjs`, `bun run verify:smoke`.
- [ ] Apply-on-existing-data rehearsal (local stack only): at `e1bf8ad` run `bun run db:reset`, seed two users, a payee
      method and a settled payment; check out the branch head and run `supabase migration up`; expected: every
      migration applies and `postgis` is in `extensions`.
- [ ] Collect rulings and deviations for the spec's Implementation Record (the spec stays `approved` until the
      bounty feature is built; step 1 does not set `implemented`): client-generated bounty id, `close_bounty` vs
      `cancel_bounty`, `bounty_cancel_preview`, the deletion trigger, `confirmed` excluded from live items, answers to
      the open questions.
- [ ] `compound-loop` retro for the branch, then the PR.

## Not in this plan

| Piece                                                                                                   | Owner                         |
| ------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `nearby_bounties(area or point, filters, cursor)` with distance, 急 and 塞得进空档 filters               | Bounty step 2                 |
| Client service, types, posting form, confirm screen, cost line, 13A reason on 「+」                     | Bounty step 3                 |
| Board list, `expo-location`, apply sheet, 已申请 stamp, block entry in detail ⋯                          | Bounty step 4                 |
| Applicant list, hold-to-commit, 「这次没选上」 / 「已经选好了」 UI                                       | Bounty step 5                 |
| Status screen, live-item source in `src/lib`, `bountyAction` accessory kind, 8A sheets, card-detail move | Bounty step 6                 |
| Listing active bounties on the account-deletion screen (if Open question 7 is B)                        | Bounty step 6                 |
| Payer sticker surfaces, book title, category art in the celebration                                     | Bounty step 7                 |
| `expo-maps` map view                                                                                    | Bounty step 8                 |
| Sticker storage bucket and `sticker_path` writes; photo cut-out; publish flight                          | Bounty step 9                 |
| 问小貘 drafting                                                                                          | Bounty step 10 (foundation 8) |
| Push for in-app events, Live Activity for `en_route`                                                    | Bounty step 11 (foundation 9) |
| 先付, gates, `void` payment, `cancelling` state                                                          | Bounty step 12 (Later)        |
| Reputation snapshots and `reputation_tier`                                                              | Prerequisite Task 3           |

## Open questions

Defaults in the plan follow the recommendation; an answer that differs changes only the named task.

1. Prerequisite Task 3 (`20261026000800`, `reputation_tier`) is not merged. A (recommended): land it before Task 7
   and before any hosted push of this branch, so ordering holds and detail/applicants carry the tier. B: Task 7 ships
   `tier: null` and Task 3 adds it later; Task 3's timestamp is renumbered after `001600`.
2. Pending applications when a bounty closes (poster close or expiry). A (recommended): they stay `pending`; the
   applicant's view shows the bounty's `closed`, no 「这次没选上」. B: they become `not_selected` and the one-time card
   shows.
3. Can the poster confirm from `disputed`? A (recommended): yes, it ends the 「有问题」 loop from the poster's side
   (the spec's loop has no exit, follow-up 2A). B: no, only the helper's 完成 leads back.
4. The `blocked` reason reveals a block to the blocked user. A (recommended): `blocked` only when the caller is the
   blocker; the blocked side gets `closed` (apply) or `bounty_not_found` (read), which the UI shows as "no longer
   open" anyway. B: `blocked` to both, as the spec's list reads.
5. 「有问题」 reason length. A (recommended): 1–140, the application-note limit. B: 1–500, the description limit.
6. Deadline horizon. A (recommended): at most 30 days after publishing. B: no cap (a far deadline keeps a bounty
   open indefinitely).
7. Account deletion with an active bounty: the server adds `bounties` to the 409 now. A: this step also maps
   `bounties` in `src/features/account` and the blocked screen (a small UI change with a UI case). B (recommended):
   the app lists them in bounty step 6; until then a user blocked only by a bounty sees the blocked screen without a
   row, which cannot happen in production before posting ships in step 3.
8. A pending application on the home stack. A (recommended): no live card; it lives in 我的悬赏. B: a
   `bountyInProgress` card per pending application.
9. Re-applying after withdrawing. A (recommended): allowed while the bounty is open, with a new note. B: a withdrawal
   is final for that bounty.
