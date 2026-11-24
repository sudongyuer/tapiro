---
title: Unpaid bounty payments are reminded by push at 24 h and 72 h
status: proposed
created: 2026-11-24
approved:
implemented:
supersedes:
superseded-by:
pr:
---

Builds on: [foundation](2026-10-11-foundation-design.md) §Unpaid handling ("Reminders to the payer at 24 h and 72 h;
publishing blocked after 7 days unpaid or with 2 open unpaid items, lifted on settlement or a resolved report") and its
step-4 follow-up "Push reminders at 24/72 h (step 9) … are not wired". [Bounty](2026-10-11-bounty-design.md) 13A, 17A,
23A and the carpool redesign 216 A already decide the publish block and its UI; [realtime push](2026-10-31-realtime-push-design.md)
decides the push path and quiet hours. Story map: `pay.unpaid`.

## Problem

A poster who never pays the helper gets no reminder from Tapiro: the 24 h and 72 h reminders were deferred to the push
account, which is now live (APNs direct, 2026-11-20). The publish block already exists (`publish_blocked()`, the bounty
post hint and confirm screen, the ride confirm screen); nothing about it is missing except a test that a resolved
payment lifts it.

## Goals and scope

**Do**

- Push the payer of a due bounty payment once 24 h after it opened and once 72 h after it opened, through the event
  outbox (`payment.reminder`) and `notify`.
- Keep the publish block as built and cover the lift in pgTAP.

**Don't do**

- No change to ride payments: their payer is reminded by local notifications at 24 h and 72 h after the split
  (`ride.remind.pay`, 173 A, 235 B).
- No payment report entry or founder resolution tool (foundation step 7 placeholder).

## Decisions

Made under the owner's delegation (2026-11-17); ★ for veto.

| #     | Decision                                                                                                                                                                   | Reason                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| UR1 ★ | Server push for bounty payments only; ride payments keep their local reminders                                                                                             | A push as well would remind a rider twice; 173 A chose local reminders when there was no push account, and rides were built that way |
| UR2 ★ | Only a `due` payment is reminded; 我已付款 (with or without 还没收到) is not                                                                                               | `reminderDue` already says so; 还没收到 pushes `payment.not_received` itself                                                         |
| UR3 ★ | One kind `payment.reminder`, the same copy both times: 「还没付给{name}，记得去付款」 / "You haven't paid {name} yet" / "Anda belum membayar {name}", titled by the bounty | A neutral nudge; the consequence (publishing paused) is explained where it applies, at 「+」 (17A)                                   |
| UR4 ★ | A run that finds a payment past 72 h with no reminder sends only the 72 h one; at most two per payment                                                                     | Two pushes in a row say the same thing                                                                                               |
| UR5 ★ | The reminder is not urgent: during 23:00–08:00 it waits for 08:00 like other non-urgent pushes                                                                             | Nothing breaks if a payment reminder waits for the morning                                                                           |
| UR6 ★ | Payments already past a mark when the migration runs count as reminded at that mark                                                                                        | Hosted payments opened weeks ago would otherwise all push at once on deploy                                                          |
| UR7 ★ | "A resolved report" means the payment leaves `due` / 还没收到 (settled, or `disputed` set by the founder's report queue); `publish_blocked()` already excludes both        | No payment report flow exists yet; the block rule needs no change                                                                    |

## Data flow and ownership

pg_cron `payment-reminders` (every 10 minutes) → `public.run_payment_reminders()` → `private.run_payment_reminders(now())`
records the stage in `private.payment_reminders` (one row per payment, `hours` 24 or 72) and calls `private.emit_event`
for the payer with the payee as actor → `queue_push` (thread `bounty:<id>`, quiet hours) → `notify` with copy from
`supabase/functions/notify/copy.ts`. A tap opens `/pay/[id]` (the existing `payment.*` route).

## Errors and degradation

A row that fails is skipped with a warning and retried on the next run; the rest of the run continues. Without a device
token the queue marks the push `no_device`, as for every push.

## UI/UX and motion

No screen changes. The push opens the pay sheet.

## Known limits

- Push delivery is verified on a phone only (story-map device item).
- A payment report and its resolution are not built; the founder resolves by changing the payment's state by hand.

## Verification

pgTAP `supabase/tests/payment_reminders.test.sql`; unit `src/lib/unpaid.test.ts`, `supabase/functions/notify/copy.test.ts`,
`src/lib/notifications/noticeTaps.test.ts` (route of every kind).

## Implementation Record (2026-11-24)

Status stays `proposed`: the owner has not approved the design; decisions UR1–UR7 (★ for veto) were made under the
owner's delegation (2026-11-17). Branch `feat/pay-unpaid-reminders`.

- Built as designed: `supabase/migrations/20261124000300_payment_reminders.sql` (kind `payment.reminder`,
  `private.payment_reminders`, `private.run_payment_reminders(as_of)`, service-role wrapper, backfill, cron
  `payment-reminders` every 10 minutes); copy in `supabase/functions/notify/copy.ts`. The tap route needed no change
  (`payment.*` → `/pay/[id]`).
- Changed: `reminderDue` in `src/lib/unpaid.ts` returned the 24 h reminder again after a folded 72 h one; it now returns
  a stage only when no reminder at or above it was sent, matching the SQL.
- Publish block: no code change; pgTAP adds that a payment leaving `due` (here `disputed`) lifts it.
- Checks: pgTAP `payment_reminders.test.sql` (24) on the local stack inside a rolled-back transaction, full suite in CI;
  `bun test`; `tsc`, `lint:changed`, `format:check`, `check-specs`, `check-story-map`; `verify:smoke`. No UI case: no
  screen changed.
- Unverified: push delivery on a phone (story-map device item).
- Hosted: migration `20261124000300_payment_reminders.sql` and a `notify` redeploy are not applied.
