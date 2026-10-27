# Bounty prerequisites (P1–P4) Implementation Plan

> **For agentic workers:** execute task by task. If a plan-execution skill is
> available (for example superpowers `subagent-driven-development` or
> `executing-plans`), use it. Track steps with checkboxes (`- [ ]`). When all
> tasks are done, run `spec-lifecycle` before opening the PR.

**Goal:** The server has everything bounty step 1 consumes: a block list, a no-show record with the 60-day waiver and a
daily reputation tier, a coin ledger with the shared monthly free allowance, post spend and refund, the three grants
that need no UI, and a settle that gives both sides a category sticker. No new screen; the only client change is that
a sticker with a bounty category is drawn as its `CategorySticker`.

**Architecture:** Seven new Supabase migrations (tables, RLS, `security definer` functions, one pg_cron job) and one
rewrite of `confirm_payment_received` that wires stickers, reputation events and the help-settled grant into the
settle transaction. Client: `src/lib/stickers` (category art), `src/ui/EarnedSticker.tsx`, and the payment feature's
row mapping, fixtures and celebration data.

**Tech stack:** Postgres 15 on Supabase (`supabase/config.toml` `major_version`) (`ap-southeast-1`), pgTAP through the Supabase CLI, pg_cron; Expo SDK 57,
TypeScript 6, `bun test`.

**Spec:** `docs/specs/2026-10-11-bounty-design.md` (Prerequisites, Decisions, Decisions (2026-10-26), UI/UX,
Implementation order step 0) and `docs/specs/2026-10-11-foundation-design.md` (Decisions rows Reputation, No-show
slack, Coins: spend, Coins: free grants; sections "Reputation, reviews, stickers, mascot" and 貘币; data ownership).
Follow-up answer 5A: grants are new user 5, onboarding 3 × 1 (payee method added, first post or ride, first help
settled) and each help settled (1, at most 10 per Malaysia calendar month). Weekly feed, invites and IAP stay in
foundation step 5.

## Global constraints

- Zero comments in SQL and TypeScript unless they explain unexpected behaviour or a hidden invariant (AGENTS.md
  Conventions). The existing migrations show the bar: one line on a lock that serialises settles, one on the
  reference alphabet.
- Every function is `security definer` only when it must bypass RLS, always with `set search_path = ''` and
  schema-qualified names (`public.`, `private.`, `pg_catalog` built-ins need no prefix).
- Every new function is followed by `revoke all on function … from public, anon, authenticated`. Service-role
  functions then `grant execute … to service_role` (pattern: `open_payment`). Client RPCs grant `authenticated` and
  read the actor from `(select auth.uid())`, never from an argument (pattern: `publish_blocked()`). Internal helpers
  and trigger functions get no grant.
- Tables: `enable row level security`, `revoke all … from anon, authenticated`, then the narrowest `grant` and
  policy. No client `insert`, `update` or `delete` on ledger, reputation, block or sticker tables; every write goes
  through a function.
- Data integrity (AGENTS.md): no write is replayed automatically; a replayed call is idempotent and returns the first
  outcome; a failed spend writes nothing; nothing failed or partial is reported as empty or complete.
- Migrations must apply on a database that already has payments and stickers: guard every new constraint with a
  pre-check that raises a clear error and counts the offending rows instead of rewriting user data.
- `supabase db reset` / `bun run db:reset` only against the local stack (`bun run db:start`). Never run a reset or a
  migration against the hosted project from a task.
- Files under 500 lines; React components under 300. One migration per task.
- Typed errors: SQLSTATE plus an exact message slug, tested with `throws_ok(sql, code, slug, description)`. Slugs are
  listed per task and are the contract bounty step 1 maps to its typed reasons.
- Malaysia time is `Asia/Kuala_Lumpur` (UTC+8, no DST); every month boundary uses `public.malaysia_month(at)`.
- No new dependencies.
- Checks at the end of every task: `bun run db:reset` then `bun run db:test` (local stack, pgTAP in
  `supabase/tests/`, see `supabase/README.md`; CI does not run pgTAP, so the task runs it), `bun test`,
  `bunx tsc --noEmit`, `bun run lint -- <changed .ts/.tsx files>`, `bun run format:check`,
  `node scripts/check-specs.mjs --dir docs/specs`, `node scripts/check-story-map.mjs`. Judge each by its exit
  status.
- pgTAP style: one file per area, `begin; select plan(n); … select * from finish(); rollback;`, fixture users inserted
  into `auth.users` with the `…a1` / `…b2` / `…c3` ids, `pg_temp.act_as(uid)` plus `set local role authenticated`
  for client calls, `reset role` for service calls. Each assertion must be able to fail.
- Story-map rows: criterion ids start with their story id; coverage names the real file
  (`db:supabase/tests/<file>.test.sql`, `unit:<path>#<exact test name>`); stories this plan touches move to
  `状态：building` (or stay `done` with real coverage).

## File structure

| Action | Path                                                                                                              | Responsibility                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Create | `supabase/migrations/20261026000100_blocks.sql`                                                                   | `blocks`, `block_user`, `unblock_user`, `private.is_blocked_between`                                                   |
| Create | `supabase/migrations/20261026000200_reputation_events.sql`                                                        | `reputation_events`, `record_no_show`, `private.record_settled`                                                        |
| Create | `supabase/migrations/20261026000300_reputation_snapshots.sql`                                                     | `reputation_snapshots`, `reputation_tier`, `recompute_reputation`, cron job                                            |
| Create | `supabase/migrations/20261026000400_coin_ledger.sql`                                                              | `coin_ledger`, `post_charges`, `malaysia_month`, `spend_post`, `refund_post`, `coin_balance`                           |
| Create | `supabase/migrations/20261026000500_coin_grants.sql`                                                              | new-user and payee-method grants, backfill, `private.grant_help_settled`                                               |
| Create | `supabase/migrations/20261026000600_payment_category_and_stickers.sql`                                            | `bounty_category` domain, `payments.category`, one forward payment per item, `stickers.role`, new unique key, backfill |
| Create | `supabase/migrations/20261026000700_settle_both_sides.sql`                                                        | `confirm_payment_received` writes two stickers, reputation events, the help grant                                      |
| Create | `supabase/tests/blocks.test.sql`, `reputation.test.sql`, `coins.test.sql`                                         | pgTAP per area                                                                                                         |
| Modify | `supabase/tests/stickers.test.sql`, `supabase/tests/payments.test.sql`                                            | two stickers per settle, category, one forward payment                                                                 |
| Modify | `supabase/README.md`                                                                                              | contracts of the new functions (existing doc, one section each)                                                        |
| Modify | `src/lib/stickers/model.ts`, `fixture.ts`, `service.ts`, `stickers.test.ts`                                       | category slugs, `stickerArt` category mapping                                                                          |
| Modify | `src/ui/CategorySticker.tsx`, `src/ui/EarnedSticker.tsx`                                                          | category type from `src/lib`, category art                                                                             |
| Modify | `src/features/payment/types.ts`, `paymentService.ts`, `fixturePaymentService.ts`, `PaySheet.tsx`, `model.test.ts` | `Payment.category` into the celebration                                                                                |
| Modify | `docs/story-map.md`                                                                                               | criteria per task                                                                                                      |

## Task 1: P3 block list

**Files:** create `supabase/migrations/20261026000100_blocks.sql`, `supabase/tests/blocks.test.sql`; modify
`docs/story-map.md`, `supabase/README.md`.

**Interfaces**

- Produces: `private.is_blocked_between(a, b)` used by bounty step 1 RLS and RPCs; `block_user` / `unblock_user`
  called by the block UI in bounty steps 4–5.

```
table public.blocks (
  blocker_id uuid not null references auth.users on delete cascade,
  blocked_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
)
index blocks_blocked on (blocked_id, blocker_id)
RLS: select to authenticated using (blocker_id = (select auth.uid())); grant select only

public.block_user(target uuid) returns void            authenticated; idempotent (on conflict do nothing)
public.unblock_user(target uuid) returns void          authenticated; idempotent (deleting nothing is fine)
private.is_blocked_between(a uuid, b uuid) returns boolean   stable, security definer; false when either is null
```

- Errors: `block_user(auth.uid())` → `22023 cannot_block_self`; unknown target → `P0002 user_not_found` (checked
  against `public.profiles`).
- `private` schema: `create schema if not exists private`, `grant usage on schema private to authenticated,
service_role`, `grant execute on function private.is_blocked_between to authenticated, service_role`. Reason: RLS
  policies run with the caller's privileges and need execute, while a `security definer` function in an exposed
  schema would be a public RPC that lets anyone probe who blocked them (Supabase RLS guide: security-definer
  functions do not belong in an exposed schema; `supabase/config.toml` exposes only `public` and `graphql_public`).

**Steps**

- [ ] Write `supabase/tests/blocks.test.sql` with these behaviours:
  - B blocks A: B reads one row, A reads none (the blocked user cannot see the block).
  - `is_blocked_between(a, b)` and `(b, a)` are both true after B blocks A; false for an unrelated pair and for nulls.
  - Blocking twice leaves one row; unblocking removes it and `is_blocked_between` turns false; unblocking again is
    not an error.
  - Blocking yourself raises `22023 cannot_block_self`; an unknown id raises `P0002 user_not_found`.
  - A client `insert`, `update` and `delete` on `blocks` each raise `42501`.
  - `anon` cannot execute `block_user` (`has_function_privilege` is false).
  - Deleting B from `auth.users` removes the block in both directions.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`; expected: all files pass.
- [ ] Story map, activity 消息: new story `### chat.block 拉黑` (状态 building, 规格 bounty spec) with
      `chat.block.private` (名单只有拉黑的人自己读得到，被拉黑的人读不到，客户端不能直接写),
      `chat.block.either-side` (任何一方拉黑都算双方互相屏蔽；取消后恢复), `chat.block.account-delete`
      (删除账号时一起删掉), each `db:supabase/tests/blocks.test.sql`; plus `chat.block.entry` (悬赏详情、资料页和申请人
      长按菜单里的「屏蔽某某」) with planned `ui`.
- [ ] `supabase/README.md`: a "Blocks" section with the three functions.
- [ ] Commit: `feat(safety): block list with is_blocked_between`

## Task 2: P2 reputation events and no-show

**Files:** create `supabase/migrations/20261026000200_reputation_events.sql`, `supabase/tests/reputation.test.sql`;
modify `docs/story-map.md`, `supabase/README.md`.

**Interfaces**

- Consumes: `payments` (for `private.record_settled`).
- Produces: `record_no_show` (bounty step 1 cancel transitions, carpool later); `private.record_settled(payment)`
  wired into the settle in Task 7; `reputation_events` read by Task 3.

```
type public.reputation_event_kind as enum ('settled', 'no_show')
table public.reputation_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind public.reputation_event_kind not null,
  item_kind public.payment_item_kind not null,
  item_id uuid not null,
  counterpart_id uuid references auth.users on delete set null,
  payment_id uuid references public.payments on delete set null,
  waived boolean not null default false,
  on_time boolean,
  created_at timestamptz not null default now(),
  unique (user_id, kind, item_kind, item_id),
  check (kind = 'no_show' or not waived)
)
index reputation_events_user on (user_id, kind, created_at)
RLS enabled, no grants to anon or authenticated

public.record_no_show(offender uuid, kind public.payment_item_kind, item uuid) returns text   service_role
  'waived'  when the offender has no waived no-show with created_at > now() - interval '60 days'
  'counted' otherwise
  a replay for the same (offender, kind, item) returns the stored outcome and writes nothing
private.record_settled(payment uuid) returns void     internal, no grant
  forward payments only (reverses is null): one 'settled' event for the payee and one for the payer
  (each with the other as counterpart_id); a side whose user id is null is skipped;
  payer's on_time = coalesce(marked_paid_at, settled_at) - created_at <= interval '72 hours'; payee's on_time null;
  on conflict do nothing
```

- Errors: `record_no_show` with a null argument → `22023 invalid_no_show`; unknown offender → `P0002 user_not_found`.
- Serialise per offender with `pg_advisory_xact_lock(hashtextextended('no_show:' || offender::text, 0))` so two
  concurrent cancels cannot both take the waiver.

**Steps**

- [ ] Write the reputation events part of `supabase/tests/reputation.test.sql`:
  - The first no-show returns `waived` and stores `waived = true`; a second inside 60 days returns `counted`.
  - With a waived no-show backdated 61 days (inserted directly as the test owner), a new one is `waived` again.
  - A counted no-show does not consume the waiver: with a waived one at day −30 and a counted one at day −10, a new
    one now is `counted`; with the waived one moved to day −61, a new one is `waived`.
  - Replaying the same item returns the first outcome and the row count stays the same.
  - `authenticated` cannot execute `record_no_show` or read `reputation_events` (`42501` / zero rows with
    `has_table_privilege` false).
  - `private.record_settled` on a settled forward payment writes two events with crossed counterparts and the
    payer's `on_time`; on a reverse payment it writes none; on a payment whose payer was deleted it writes only the
    payee's event; a second call adds nothing.
  - A late payer (`marked_paid_at` 4 days after `created_at`) gets `on_time = false`.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`.
- [ ] Story map, activity 信誉、贴纸与貘币: new story `### rep.no-show 放鸽子记录` (building, bounty spec) with
      `rep.no-show.waiver` (60 天内第一次放鸽子豁免，之后算数；豁免过了 60 天恢复), `rep.no-show.once` (同一件事只记一次，
      重复调用返回同样结果), `rep.no-show.server-only` (只有服务器能记，客户端读不到也写不了), each
      `db:supabase/tests/reputation.test.sql`.
- [ ] Commit: `feat(reputation): reputation events and no-show with the 60-day waiver`

## Task 3: P2 reputation snapshots and the daily recompute

**Files:** create `supabase/migrations/20261026000300_reputation_snapshots.sql`; extend
`supabase/tests/reputation.test.sql`; modify `docs/story-map.md`, `supabase/README.md`.

**Interfaces**

- Consumes: `reputation_events` (Task 2), `profiles.created_at` (account age).
- Produces: `reputation_tier(uid)` for the gates "Later" and the tier shown on detail and applicant rows (bounty steps
  4–5); `reputation_snapshots.tier` readable by every signed-in user.

```
type public.reputation_tier as enum ('new_friend', 'reliable', 'very_reliable', 'tapir_friend')
table public.reputation_snapshots (
  user_id uuid primary key references auth.users on delete cascade,
  tier public.reputation_tier not null,
  settled_count integer not null,
  counterpart_count integer not null,
  counted_no_shows integer not null,
  completion_rate numeric(5,4),
  on_time_share numeric(5,4),
  computed_at timestamptz not null
)
RLS: select to authenticated using (true); grant select (user_id, tier) only

public.reputation_tier(uid uuid) returns public.reputation_tier   stable, security definer, authenticated;
  the snapshot's tier, 'new_friend' when there is none
public.recompute_reputation(as_of timestamptz default now()) returns integer   service_role; upserts one row per
  profile from events with created_at > as_of - interval '180 days'; returns rows written
cron: select cron.schedule('reputation-recompute-daily', '30 19 * * *', $$select public.recompute_reputation()$$)
  (03:30 Malaysia time; SQL directly, no Edge Function)
```

- Inputs in the window: `settled_count` = settled events; `counterpart_count` = distinct counterparts among them;
  `counted_no_shows` = no-shows with `waived = false`; `completion_rate` = settled / (settled + counted no-shows),
  null when both are 0; `on_time_share` = on-time share of the user's payer events, null when none. Reviews join in
  foundation step 6.
- Tier thresholds: see Open question 1; the plan's default is the research Design B ladder with school
  verification replaced by account age — 靠谱 ≥ 3 settled, ≥ 2 counterparts, completion ≥ 0.8; 很靠谱 ≥ 8, ≥ 5,
  ≥ 0.9, account ≥ 60 days; 貘友 ≥ 20, ≥ 12, ≥ 0.95, account ≥ 180 days. Thresholds live in one SQL function
  `private.tier_for(settled, counterparts, rate, account_age)` so tuning is one migration.

**Steps**

- [ ] Extend `reputation.test.sql`:
  - A user with no events gets `new_friend`, and `reputation_tier` of a user with no snapshot is `new_friend`.
  - 3 settled with 2 counterparts and no no-show → `reliable`; the same with 3 settled but one counterpart stays
    `new_friend` (distinct counterparts count).
  - Two counted no-shows against 3 settled (rate 0.6) drop `reliable` to `new_friend`; a waived no-show does not.
  - Events older than 180 days (backdated) do not count; `recompute_reputation(as_of)` with a later `as_of` drops them.
  - The `very_reliable` boundary: 8 settled / 5 counterparts / rate 0.9 with a 59-day-old account stays `reliable`
    and with a 60-day-old one becomes `very_reliable`.
  - A signed-in client reads `tier` of another user; selecting `settled_count` raises `42501`; a client cannot
    insert or update a snapshot; `authenticated` cannot execute `recompute_reputation`.
  - A rerun replaces the snapshot rather than adding a row; `cron.job` has `reputation-recompute-daily`.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`.
- [ ] Story map `rep.tier`: status building; `rep.tier.inputs` text becomes 「按 180 天内结清数、不同对象、完成率和按时
      付款算；评价在第 6 步加入」 with `db:supabase/tests/reputation.test.sql, unit`; add `rep.tier.recompute`
      (每天马来西亚时间 03:30 重算) and `rep.tier.visible` (所有登录用户只读得到档位，读不到明细), both
      `db:supabase/tests/reputation.test.sql`.
- [ ] Commit: `feat(reputation): tier snapshots and the daily recompute`

## Task 4: P1 coin ledger, free allowance, spend and refund

**Files:** create `supabase/migrations/20261026000400_coin_ledger.sql`, `supabase/tests/coins.test.sql`; modify
`docs/story-map.md`, `supabase/README.md`.

**Interfaces**

- Produces: `spend_post`, `refund_post` (bounty step 1 publish and close; carpool later), `coin_balance()` (the confirm
  screen in bounty step 3), `private.grant_coins` and `public.malaysia_month` used by Tasks 5 and 7.

```
type public.coin_reason as enum (
  'new_user', 'onboarding_payee_method', 'onboarding_first_post', 'onboarding_first_help',
  'help_settled', 'post_spend', 'post_refund'
)
table public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete set null,
  reason public.coin_reason not null,
  delta integer not null check (delta <> 0 and delta between -100 and 100),
  item_kind public.payment_item_kind,
  item_id uuid,
  created_at timestamptz not null default now(),
  check ((item_id is null) = (item_kind is null))
)
unique index coin_ledger_once on (user_id, reason)
  where reason in ('new_user', 'onboarding_payee_method', 'onboarding_first_post', 'onboarding_first_help')
unique index coin_ledger_per_item on (user_id, reason, item_kind, item_id) where item_id is not null
index coin_ledger_user on (user_id, reason, created_at)
trigger coin_ledger_append_only: before update or delete; raises 55000 'ledger_is_append_only' except an update
  whose only change is user_id → null (the on delete set null of account deletion fires it)
RLS: select to authenticated using (user_id = (select auth.uid())); grant select only

type public.post_charge as enum ('free', 'coin')
table public.post_charges (
  item_kind public.payment_item_kind not null,
  item_id uuid not null,
  user_id uuid references auth.users on delete set null,
  charge public.post_charge not null,
  free_month date not null,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (item_kind, item_id)
)
index post_charges_user_month on (user_id, free_month) where charge = 'free' and refunded_at is null
RLS enabled, no client grants

public.malaysia_month(at timestamptz) returns date    stable; date_trunc('month', at at time zone 'Asia/Kuala_Lumpur')::date
private.grant_coins(uid uuid, why public.coin_reason, amount integer, kind payment_item_kind default null,
  item uuid default null) returns boolean     internal; on conflict do nothing; true when a row was written
public.spend_post(poster uuid, kind public.payment_item_kind, item uuid) returns text   service_role
  'free' when fewer than 3 unrefunded free charges exist in malaysia_month(now()) for the poster
  'coin' otherwise, writing a -1 'post_spend' ledger row, when the balance is at least 1
  also grants 'onboarding_first_post' (+1) on the poster's first charge ever
  a replay for the same (kind, item) and poster returns the stored charge and writes nothing
public.refund_post(kind public.payment_item_kind, item uuid) returns text   service_role
  sets refunded_at; 'coin' charges get a +1 'post_refund' row; 'free' charges free their slot in their month
  a second call returns the same charge and writes nothing
public.coin_balance() returns jsonb    authenticated, for (select auth.uid())
  { "coins": <sum of delta>, "freePostsLeft": 0..3, "freePostsPerMonth": 3,
    "nextFreeAt": <first day of the next Malaysia month 00:00 +08 as timestamptz> }
```

- Errors: `spend_post` without a free slot and with balance < 1 → `55000 no_balance` and nothing is written; null
  arguments → `22023 invalid_charge`; the item already charged to another poster → `22023 item_charged_elsewhere`;
  `refund_post` of an item never charged → `P0002 charge_not_found`.
- `spend_post` and `refund_post` take `pg_advisory_xact_lock(hashtextextended('coins:' || user::text, 0))` before
  counting, so two concurrent publishes cannot both take the third free slot or spend the last coin.
- `onboarding_first_post` is kept after a refund (the task was done once); it is never granted twice.

**Steps**

- [ ] Write `supabase/tests/coins.test.sql`:
  - Three spends in one Malaysia month return `free`; the fourth with balance 0 raises `55000 no_balance`, and the
    ledger and `post_charges` counts are unchanged afterwards.
  - With a +1 grant the fourth returns `coin` and the balance drops by 1; a fifth with balance 0 is rejected.
  - Bounty and ride spends share the allowance (two bounties + one ride use all three).
  - `malaysia_month('2026-10-31 16:30+00')` is `2026-11-01`; `('2026-10-31 15:59+00')` is `2026-10-01`; a free charge
    with `free_month` of the previous month (inserted directly) does not reduce this month's allowance.
  - Refunding a free post restores `freePostsLeft`; refunding a coin post restores the balance; a second refund
    returns the same charge and adds no ledger row; refunding an unknown item raises `P0002 charge_not_found`.
  - Replaying `spend_post` for the same item returns the first charge and writes nothing; the same item for another
    poster raises `22023 item_charged_elsewhere`.
  - The first spend writes one `onboarding_first_post` +1; spend, refund and spend again does not write a second.
  - `coin_balance()` as a client returns the four keys with the expected values and `nextFreeAt` equal to
    `2026-10-31 16:00+00` for a call in October (test computes it from `malaysia_month(now())`).
  - A client reads only its own ledger rows; client `insert`, `update`, `delete` on `coin_ledger` raise `42501`;
    as the owner role an `update` of `delta` raises `55000 ledger_is_append_only` and a `delete` does too;
    `authenticated` cannot execute `spend_post` or `refund_post`.
  - Deleting a user keeps their ledger rows with `user_id` null and the balance of other users unchanged.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`.
- [ ] Story map, activity 信誉、贴纸与貘币: new story `### coins.ledger 发布扣费、退回和余额` (building, bounty spec) with
      `coins.ledger.spend` (先用本月免费名额，再扣 1 颗；都没有时拒绝，什么都不写), `coins.ledger.refund` (退回恢复貘币
      或免费名额，同一件事只退一次), `coins.ledger.balance` (余额由账本算出，只读得到自己的，并给出下次免费名额的时间),
      `coins.ledger.anonymised` (删除账号后账本行保留但不再关联到人), each `db:supabase/tests/coins.test.sql`;
      `coins.grants.ledger` and `coins.grants.free-posts` get `db:supabase/tests/coins.test.sql` (free-posts text adds
      「按马来西亚时间的自然月」).
- [ ] Commit: `feat(coins): append-only ledger, shared free allowance, spend and refund`

## Task 5: P1 grants on sign-up and payee method, help-settled helper

**Files:** create `supabase/migrations/20261026000500_coin_grants.sql`; extend `supabase/tests/coins.test.sql`;
modify `supabase/tests/profiles.test.sql` only if its plan count changes (it should not); `docs/story-map.md`.

**Interfaces**

- Consumes: `private.grant_coins`, `public.malaysia_month` (Task 4); `public.handle_new_user` (profiles migration);
  `public.payee_methods` inserts (clients insert directly under RLS).
- Produces: `private.grant_help_settled(payment uuid)` wired into the settle in Task 7.

```
create or replace public.handle_new_user(): unchanged profile insert, then grant_coins(new.id, 'new_user', 5)
trigger payee_methods_onboarding_grant: after insert on public.payee_methods for each row,
  security definer function → grant_coins(new.user_id, 'onboarding_payee_method', 1)
private.grant_help_settled(payment uuid) returns void   internal
  only payments with item_kind = 'bounty', reverses is null, state = 'settled' and a non-null payee:
  grant_coins(payee, 'onboarding_first_help', 1);
  grant_coins(payee, 'help_settled', 1, 'bounty', item_id) when the payee has fewer than 10 'help_settled' rows with
  malaysia_month(created_at) = malaysia_month(now())
backfill (once, in the migration, idempotent through coin_ledger_once):
  'new_user' +5 for every auth.users row without one; 'onboarding_payee_method' +1 for every user with a payee method
```

- Rides earn no help grant: carpool spec "Don't do" excludes coins for completing a ride, and the bounty spec says
  bounty triggers "each help settled".
- No retroactive help grants: no bounty payment has existed outside tests (bounty step 1 is the first opener).

**Steps**

- [ ] Extend `coins.test.sql`:
  - A new `auth.users` row has a balance of 5 from one `new_user` row.
  - Adding a first payee method (cash counts) grants 1; a second method, or deleting and re-adding, grants nothing.
  - `grant_help_settled` on a settled bounty payment grants the payee `onboarding_first_help` and `help_settled`
    (balance +2) and the payer nothing; a second settled bounty grants only `help_settled`.
  - With 10 `help_settled` rows this Malaysia month (backdated inside the month), the 11th grants nothing; one dated
    in the previous month does not count toward the cap.
  - A settled ride payment and a settled reverse payment grant nothing; a replay for the same payment grants nothing.
  - The backfill function (run again in the test) writes nothing for users who already have the grants.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`; also run `profiles.test.sql` and
      `payee_methods.test.sql` unchanged (they must still pass with the new trigger).
- [ ] Story map `coins.grants`: status building; add `coins.grants.new-user` (新人 5 颗，注册时由服务器发),
      `coins.grants.onboarding` (新手任务各 1 颗：加收款方式、第一次发布或拼车、第一次帮成；每项只发一次),
      `coins.grants.help-settled` (每帮成一单悬赏 1 颗，马来西亚时间每月最多 10 颗；拼车和反向付款不发), each
      `db:supabase/tests/coins.test.sql`; `coins.grants.sources` text shrinks to 「每周点首页小貘 1 颗；邀请双方各 3 颗」
      with planned `unit, db` (foundation step 5).
- [ ] Commit: `feat(coins): new-user, onboarding and help-settled grants`

## Task 6: P4 payment category, one forward payment per item, sticker schema

**Files:** create `supabase/migrations/20261026000600_payment_category_and_stickers.sql`; modify
`supabase/tests/payments.test.sql`, `supabase/tests/stickers.test.sql`, `docs/story-map.md`, `supabase/README.md`.

**Interfaces**

- Consumes: `payments`, `stickers`, `open_payment`, `open_reverse_payment`, `award_missing_stickers`.
- Produces: `public.bounty_category` (bounty step 1 reuses it for `bounties.category`); `open_payment(…,
item_category)` called by bounty step 1 on confirm; `stickers.role` read by bounty step 7 labels.

```
domain public.bounty_category as text
  check (value in ('pickup', 'buy', 'queue', 'handle', 'move', 'accompany', 'study', 'other'))
alter table public.payments add column category public.bounty_category
  (null for rides and reverse payments)
unique index payments_one_forward_per_item on public.payments (item_kind, item_id) where reverses is null
drop function public.open_payment(public.payment_item_kind, uuid, text, uuid, uuid, integer, uuid);
public.open_payment(kind, item, item_title, payer, payee, amount, reversing uuid default null,
  item_category public.bounty_category default null) returns uuid   service_role; keeps the reference retry loop;
  a payments_one_forward_per_item violation raises 23505 'payment_exists'
create or replace public.open_reverse_payment(original uuid): unchanged, category null
type public.sticker_role as enum ('payee', 'payer')
alter table public.stickers add column role public.sticker_role not null default 'payee'; then drop default
alter table public.stickers drop constraint stickers_payment_id_key;
alter table public.stickers add constraint stickers_payment_owner unique (payment_id, owner_id);
alter table public.stickers drop constraint stickers_category_check;
alter table public.stickers alter column category type public.bounty_category
create or replace public.award_missing_stickers(): awards each missing side of a settled forward payment
  (payee 'payee', payer 'payer', category from the payment), on conflict (payment_id, owner_id) do nothing
```

- Pre-checks in the migration, each a `do` block that raises `23505` / `23514` with the count when violated: no two
  forward payments share `(item_kind, item_id)`; no `stickers.category` is outside the eight slugs. Existing rows are
  never rewritten except `role = 'payee'` through the column default (every existing sticker was written for the
  payee). Constraint names `stickers_payment_id_key` and `stickers_category_check` are Postgres' generated names for
  the inline constraints in `20261026000000_stickers.sql`; the task confirms them with `\d public.stickers` on the
  local stack before writing the `drop`.
- Integration callers (`paymentService.integration.ts`, `account-delete.integration.ts`) call `open_payment` with
  named arguments and keep working because `item_category` has a default.

**Steps**

- [ ] `payments.test.sql`: opening a second forward payment for the same `(item_kind, item_id)` raises
      `23505 payment_exists`; a reverse payment for it still opens; the same item id under the other kind opens;
      `open_payment(…, item_category => 'pickup')` stores the category; `'parcel'` raises `23514`; `authenticated` still
      cannot execute the new `open_payment`. Update the plan count.
- [ ] `stickers.test.sql`: inserting a sticker with category `'parcel'` raises `23514`; two stickers for one payment
      with different owners are allowed, the same owner twice raises `23505`; `award_missing_stickers` now awards both
      sides with their roles and the payment's category, and a payment whose payer was deleted gets only the payee's.
      Rewrite the existing assertions that this schema changes ("one payment holds at most one sticker" becomes per
      owner; the backfill count becomes 2) and update the plan count.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`; then `bun run fn:serve` and
      `bun run test:stack` (integration callers of `open_payment` still pass).
- [ ] Story map `pay.confirm`: add `pay.confirm.one-per-item` (每件事只有一笔正向付款，反向退款不算) and
      `pay.confirm.category` (悬赏付款带上类别，只能是八种之一), both `db:supabase/tests/payments.test.sql`.
- [ ] Commit: `feat(payment): bounty category on payments, one forward payment per item`

## Task 7: P4 settle gives both sides a sticker, records reputation and the help grant

**Files:** create `supabase/migrations/20261026000700_settle_both_sides.sql`; modify
`supabase/tests/stickers.test.sql`, `supabase/tests/reputation.test.sql`, `supabase/tests/coins.test.sql`,
`docs/story-map.md`, `supabase/README.md`.

**Interfaces**

- Consumes: `private.record_settled` (Task 2), `private.grant_help_settled` (Task 5), `stickers.role`,
  `payments.category` (Task 6).
- Produces: the settle contract the pay sheet and bounty step 7 read.

```
create or replace public.confirm_payment_received(payment uuid) returns jsonb   authenticated, payee only
  unchanged checks, state change, event and per-payee advisory lock;
  forward payments: stickers for the payee (role 'payee') and, when payer_id is not null, the payer (role 'payer'),
    both with p.title, p.item_kind, p.category; on conflict (payment_id, owner_id) do nothing;
    perform private.record_settled(p.id); perform private.grant_help_settled(p.id)
  returns { "state": "settled",
            "firstSettled": p.reverses is null and <payee's stickers with role 'payee'> = 1,
            "stickerCount": <all of the payee's stickers> }
```

- The payer's sticker does not change the payee's `firstSettled` or `stickerCount` (Open question 2 records the
  reading). Reverse payments: no sticker, no event, no grant (as built).

**Steps**

- [ ] `stickers.test.sql`: one settle writes two stickers, payee and payer, both carrying the payment's category; the
      payer now reads one own sticker (replaces "the payer cannot read the payee's stickers" with "the payer reads only
      their own payer sticker"); a user who first paid then helps gets `firstSettled = true` on the first help with
      `stickerCount = 2`; a settle whose payer was deleted writes only the payee's sticker; the reverse settle still
      writes none and its `stickerCount` equals the payer's existing sticker count; a replayed settle still raises
      `55000` and adds nothing. Update expectations that change and the plan count.
- [ ] `reputation.test.sql`: a client settle writes the two `settled` events; `coins.test.sql`: a bounty settle
      through `confirm_payment_received` raises the payee's balance by 2 the first time and 1 the second.
- [ ] Write the migration; run `bun run db:reset && bun run db:test`; `bun run fn:serve` and `bun run test:stack`
      (`paymentService.integration.ts` still expects `{ firstSettled: true, stickerCount: 1 }` for the payee).
- [ ] Story map: `rep.stickers` status building, `rep.stickers.earn` coverage
      `db:supabase/tests/stickers.test.sql, unit:src/lib/stickers/stickers.test.ts, ui` (ui stays planned for the payer
      surfaces); `rep.sticker-book.earn` text becomes 「结清时在同一事务里给收款人和付款人各发一张贴纸（拼车是汽车，有类别
      的悬赏是类别贴纸，没有类别是小貘）；重放结清不多发，反向付款不发」.
- [ ] `supabase/README.md` Payments section: `confirm_payment_received` returns `firstSettled` and `stickerCount` for
      the payee and writes both stickers, the reputation events and the help grant.
- [ ] Commit: `feat(payment): settle writes a sticker for both sides with the category`

## Task 8: P4 client: category art for stickers

**Files:** modify `src/lib/stickers/model.ts`, `src/lib/stickers/index.ts`, `src/lib/stickers/fixture.ts`,
`src/lib/stickers/stickers.test.ts`, `src/ui/CategorySticker.tsx`, `src/ui/EarnedSticker.tsx`,
`src/features/payment/types.ts`, `src/features/payment/paymentService.ts`, `src/features/payment/fixturePaymentService.ts`,
`src/features/payment/PaySheet.tsx`, `src/features/payment/model.test.ts` (or the existing service test that maps
rows), `docs/story-map.md`.

**Interfaces**

- Consumes: `payments.category`, `stickers.category` (Tasks 6–7).
- Produces: `BountyCategory` in `src/lib` (bounty feature reuses it in step 1/3 without importing `src/ui`).

```ts
export const BOUNTY_CATEGORIES = [
  'pickup',
  'buy',
  'queue',
  'handle',
  'move',
  'accompany',
  'study',
  'other',
] as const;
export type BountyCategory = (typeof BOUNTY_CATEGORIES)[number];
export function bountyCategory(value: unknown): BountyCategory | null;

export type StickerArt =
  { kind: 'car' } | { kind: 'mascot' } | { kind: 'category'; category: BountyCategory };
export function stickerArt(sticker: Pick<Sticker, 'itemKind' | 'category'>): StickerArt;
```

- `Payment` in `src/features/payment/types.ts` gains `category: BountyCategory | null`.
- `stickerArt`: ride → car; bounty with a known category → category; bounty with null or an unknown string →
  mascot. `src/ui/CategorySticker.tsx` exports `StickerCategory` as an alias of `BountyCategory` so
  `src/features/home` keeps compiling. `EarnedSticker` renders `CategorySticker` at the cell width for category
  art; the existing car and mascot branches are unchanged.
- `paymentService.ts` selects `category` and maps it through `bountyCategory`; `PaySheet.tsx` passes
  `payment.category` into `CelebrationData` instead of `null`; the fixture payment service gives the owed bounty a
  category (`buy` for 帮带一杯咖啡) and its `earn` call carries it; the sticker `worst` and `seven` fixtures give
  bounty seeds categories (at least one per slug across the two) and keep one bounty without a category.
- Not in this task: payer sticker surfaces, labels saying who helped whom, the book title (bounty step 7).

**Steps**

- [ ] `stickers.test.ts`: replace the art test with "a ride earns a car sticker; a bounty with a category earns its
      category sticker; without one, a 小貘 sticker" and "an unknown category from the server falls back to the 小貘
      sticker"; a payment-row test asserts `category` is mapped and an unknown value becomes null.
- [ ] Implement; run `bun test`, `bunx tsc --noEmit`, `bun run lint -- <changed files>`, `bun run format:check`,
      `node scripts/design-check.mjs`.
- [ ] `bun run verify:build`, then run `sticker_book` and `pay_settle_routine` once (`bun run verify:ui` with those
      cases, zh-Hans light) and open the screenshots: category stickers render in the book and in the celebration's
      flying sticker; the cases' pixel assertions still hold. Then `bun run verify:smoke`.
- [ ] Story map: `rep.sticker-book.earn` adds `unit:src/lib/stickers/stickers.test.ts#<new test name>` in place of
      the old art test name (the checker matches names exactly).
- [ ] Commit: `feat(stickers): bounty category art in the book and the celebration`

## Task 9: Close-out

**Steps**

- [ ] From a clean local stack: `bun run db:reset && bun run db:test`, `bun run fn:serve` + `bun run test:stack`,
      `bun test`, `bunx tsc --noEmit`, `bun run lint -- <all changed .ts/.tsx>`, `bun run format:check`,
      `node scripts/check-specs.mjs --dir docs/specs`, `node scripts/check-story-map.mjs`, `bun run verify:smoke`.
- [ ] Apply-on-existing-data rehearsal on the local stack: check out the commit before Task 1 (`5f74863`),
      `bun run db:reset`, seed two settled payments, two stickers and one payee method through the SQL editor, then
      check out the branch head and run `supabase migration up` to apply Tasks 1–7 on top; expected: every migration applies, the seeded users get
      `new_user` and payee-method grants, old stickers carry `role = 'payee'`.
- [ ] Collect rulings and deviations for the bounty spec's Implementation Record (the spec stays `approved` until the
      bounty feature is built; step 0 does not set `implemented`): the `private` schema for `is_blocked_between`,
      `payments.category`, `stickers.role`, `spend_post(poster, kind, item)`, the SQL recompute instead of the
      foundation's `reputation-recompute` Edge Function, the settle in SQL instead of the foundation's `settle` Edge
      Function, the tier thresholds, the 72-hour on-time rule.
- [ ] `compound-loop` retro for the branch, then the PR.

## Not in this plan

| Piece                                                                                                                                                                       | Owner                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Block entry points 「屏蔽某某」 (detail ⋯, applicant long-press, profile ⋯) and their action sheet (UI 5A)                                                                  | Bounty steps 4 (detail) and 5 (applicants); profile ⋯ with the profile screen |
| Hiding blocked bounties and rejecting applications (`is_blocked_between` in RLS and apply)                                                                                  | Bounty step 1                                                                 |
| Publish / close / cancel calling `spend_post`, `refund_post`, `record_no_show`; `open_payment` with the category                                                            | Bounty step 1                                                                 |
| Cost line 「本月免费 n/3 · 1 貘币」 and the no-balance state on the confirm screen (UI 2A), the client `coin_balance` reader                                                | Bounty step 3                                                                 |
| Tier badge on detail and applicant rows (UI 3A, 6A)                                                                                                                         | Bounty steps 4–5                                                              |
| Payer sticker surfaces: pay card 已结清 in place and 「收进贴纸本」 (UI 10A), labels who helped whom, book title 「一起办成的事」 and the celebration's book title (UI 11A) | Bounty step 7                                                                 |
| Coin balance in 我的, weekly feed, invites, IAP and the insufficient-balance pack sheet                                                                                     | Foundation step 5                                                             |
| Reviews, the tier drop sheet, mascot level, review inputs to the tier                                                                                                       | Foundation step 6                                                             |
| Report and the report queue                                                                                                                                                 | Foundation step 7                                                             |

## Open questions

1. Tier thresholds (Task 3). The research ladder needs school verification, which the foundation drops (F2).
   A (recommended): research numbers, school email replaced by account age (很靠谱 ≥ 60 days, 貘友 ≥ 180 days),
   靠谱 needs completion ≥ 0.8. B: research numbers with 貘友 unreachable until verification exists. C: start lower
   (靠谱 2/2, 很靠谱 5/4, 貘友 12/8) because volume is thin at launch.
2. `firstSettled` / `stickerCount` once the payer also gets stickers (Task 7). A (recommended): `firstSettled` = the
   payee's first help, `stickerCount` = the payee's whole book (matches the book count the celebration flies into).
   B: both count payee stickers only. C: both count the whole book (a user who paid first never sees 第一次收款).
3. Between this PR and bounty step 7 a payer's sticker shows in their book under the old 「我帮过的忙」 copy. A
   (recommended): accept; no bounty payment can exist before bounty step 1 and step 7 lands before the milestone.
   B: the book lists only `role = 'payee'` stickers until step 7.
4. Backfill for existing accounts (Task 5). A (recommended): existing users get the new-user 5 and the payee-method
   1; no retroactive help grants. B: no backfill; only accounts created after the migration get grants.
