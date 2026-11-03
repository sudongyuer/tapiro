---
branch: feat/live-push-server
date: 2026-11-03
pr: live updates and push, step 1 (server)
title: Broadcast signals, bounty kinds, push tokens and notify with the recording sender
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: live updates and push, step 1

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                    |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                                      |
| Quality   | Vacuous checks          | 0: the own-topic case must see rows, so a missing policy fails it; the copy test reads the migrations, so a new push kind without copy fails |
| Quality   | Skipped verifications   | UI cases and smoke: no screen changed. `notify` not run on the stack (see Notes); `deno check` passes after review                           |
| Speed     | Wall-clock              | About 2 h                                                                                                                                    |
| Autonomy  | Avoidable interventions | 0                                                                                                                                            |
| Loop      | Minutes on this retro   | 4                                                                                                                                            |

## Problems and root causes

| #   | What happened                                                                                                                                           | Root cause class | Change and layer                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | The first pgTAP run stopped on fixtures: applicants need a payee method, and 我已付款 needs a transfer method, not cash                                 | fixture recall   | None: the RPC errors named the rule at once; copied the ride test's `duitnow_id` fixture                                             |
| 2   | `handler.ts` imported `copy.ts` with the Deno `.ts` extension; `tsc` rejects that outside the excluded `index.ts`                                       | known pattern    | Copy is injected from `index.ts`, the one file that may import with extensions, as `payment-proof-cleanup` does                      |
| 3   | Claim tests would fail between 23:00 and 08:00 Malaysia time, when every new push is held                                                               | check design     | The test sets `send_at` before claiming, so it passes at any hour                                                                    |
| 4   | Review: one failing `dropToken` or `finish` aborted the rest of the batch, and a run that died after its second attempt left the push claimable forever | error isolation  | Each row settles on its own as soon as its batch is answered; a second stale claim fails as `stalled`; unit and pgTAP cases for both |
| 5   | Review: a recipient without devices was recorded as sent, `no_copy` was retried, and a success kept the earlier error                                   | outcome model    | `no_device` and `no_copy` are final in `finish_push`; success clears `push_error`                                                    |
| 6   | Review: an unknown kind prefix would have been queued as a payment                                                                                      | defensive SQL    | Explicit `payment.%` branch; other prefixes are skipped with a warning and never raise inside the transition                         |
| 7   | Review: the copy used 「bounti」 and a hard-coded Chinese space, unlike the app's strings                                                               | reuse            | 「ganjaran」 and a port of `latinSpacing` that a unit test compares against the app's post-processor                                 |
| 8   | Review: closing a bounty told applicants blocked from the poster; several denials and the quiet-hours and account-deletion paths had no case            | test coverage    | Block filter in the fan-out; pgTAP denial, insert, 01:00, deletion and stale-claim cases (81 in the file)                            |

## Notes

- The carpool outbox already existed, so step 1 reused it: `push_recordings` became `push_queue`, and the ride test now
  reads that name.
- The `notify` function was not run against the local stack: the shared stack's edge runtime serves the main checkout's
  functions. The handler, copy and `RecordingSender` are unit-tested, and pgTAP covers every RPC they call.
- Before the review round the shared stack held another branch's migrations (PR #63); pgTAP ran after `bun run db:reset`
  from this worktree.
- pgTAP needs today's `realtime.messages` partition, which the local Realtime service creates. CI does not run pgTAP.
