---
branch: fix/service-role-grants
date: 2026-11-21
pr: explicit service-role grants for the Edge Functions; local and CI stacks start with the hosted default privileges
title: Edge Functions could not touch tables on the hosted project
escaped: 1
rework: 1
interventions: 0
overturned: 0
---

# Retro: service-role grants

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                     |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 1: on hosted `fx-rate` answered 500 `store_failed`; `account-delete` could not read payments (found by query) |
| Quality   | Skipped verifications | None; pgTAP and every stack test ran on an isolated stack with the hosted defaults, before and after the fix  |
| Speed     | Wasted time           | ~10 min: 21 stack tests failed at first because their fixtures read and wrote tables as the service role      |
| Autonomy  | Interventions         | 0                                                                                                             |

## Findings

- Cause: Supabase stopped granting `anon`, `authenticated` and `service_role` anything on new `public` objects (new
  projects from 2026-05-30, all projects from 2026-10-30; changelog 45329). The hosted project was created 2026-11-19,
  so its `pg_default_acl` for `postgres` in `public` holds only `Dxtm` on tables and nothing on sequences or functions,
  while CLI 2.122.1 stacks keep the old defaults. Migrations granted `authenticated` and RPCs explicitly, but the Edge
  Functions' direct table access (`fx_rates` upsert; `payments` and `profiles` reads) relied on the default.
  Tag `local-hosted-drift`.
- Guarantee at the lowest layer: `config.toml` sets `api.auto_expose_new_tables = false`, which makes the CLI revoke
  the same defaults before migrations; the privilege matrix of an isolated stack then equalled the hosted one row for
  row. With it, the existing `account-delete` stack tests and the new `fx-rate` stack test (mock BNM, store path)
  fail without the migration, and pgTAP `edge_function_grants.test.sql` asserts each function's grants plus that the
  defaults stay closed, so removing the config line fails CI too.
- Rework: the stack tests' own fixtures used the service-role client on `ai_energy`, `ai_metering`, `ai_consents`,
  `profiles`, `payments`, `bounties` and `fx_rates`. Granting those would hide the next missing grant, so fixtures now
  write as `postgres` through `scripts/local-db.ts` (Bun SQL), and the service role holds only what functions use.
- Hosted had a migration not on main (`20261121000100_apns_tokens`, pushed from `feat/apns-direct`); the push ran from
  a scratch workdir holding that file so the CLI saw no remote-only version. Pattern to check: push hosted migrations
  only from merged main, or say so in the branch's PR.
- Open: local runs PostgreSQL 15 while hosted runs 17; another drift of the same kind, not changed here.
