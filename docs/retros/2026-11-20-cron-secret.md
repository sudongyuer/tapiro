---
branch: fix/cron-secret
date: 2026-11-20
pr: pg_cron calls Edge Functions with a dedicated cron secret; a missing Vault secret fails the job instead of posting nothing
title: Scheduled Edge Functions never ran on the hosted project
escaped: 1
rework: 1
interventions: 0
overturned: 0
---

# Retro: cron secret

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                       |
| --------- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 1: on the hosted project `fx-rate`, `payment-proof-cleanup` and `notify` were never called; cron showed success |
| Quality   | Skipped verifications | None; pgTAP and the stack test ran on an isolated stack, the hosted path was triggered once after the rollout   |
| Speed     | Wasted time           | ~5 min: the first pgTAP run failed in `live_push` (the drain now raises without Vault secrets)                  |
| Autonomy  | Interventions         | 0                                                                                                               |

## Findings

- Cause: `call_edge_function` returned quietly when `project_url` or `service_role_key` was missing from Vault, so
  every scheduled run reported `succeeded` while posting nothing, and the setup step waited on the owner copying the
  service role key into Vault. Tag `silent-config-noop`.
- Guarantee at the lowest layer: the helper now raises (`Vault secret <name> is not set`), so the job shows as failed
  in `cron.job_run_details`; pgTAP `cron_secret.test.sql` asserts both messages and that the request carries only
  `x-cron-secret`. The `push_queue` insert trigger catches the error and logs it, so a user's write never rolls back
  for a server setting; the five-minute drain still raises it.
- The credential is a dedicated random value (Vault `cron_secret` = function secret `CRON_SECRET`) compared in
  constant time; the three functions run with `verify_jwt = false` because pg_cron sends no Supabase JWT, and they
  have no user path. The service role key no longer leaves the Edge runtime; a stack test proves it is rejected.
- Pattern to check next time: any helper that skips work when configuration is missing should raise or log where the
  operator looks, never return success.
- Review (one round, all fixed together): raising in `drain_due_pushes` rolled back its stalled-push marking, so
  `push-stalled` now runs `mark_stalled_pushes()` as its own job; the checker was built per request, now once per
  isolate; the trigger catches only the new `TP001`, not every error; the configured secret is trimmed. Declined:
  restoring `verify_jwt` (pg_cron has no JWT to send), and the remaining async gap (a mismatched secret shows only in
  `net._http_response`), which the README now says to check after setting or rotating.
