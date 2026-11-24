---
branch: test/select-publish-races
date: 2026-11-24
pr: Two-session races for selecting a helper and for the last free post or coin; gates and 先付 move to later
title: Selection and publish races
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: selection and publish races

## Core (mandatory)

| Dimension | Measure               | This step                                                                                 |
| --------- | --------------------- | ----------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                         |
| Quality   | Skipped verifications | None; no UI changed, so no UI case beyond `verify:smoke`                                  |
| Speed     | Wasted time           | ~2 min: a raw `client.rpc(...)` was never sent while the test waited for it in `pg_locks` |
| Autonomy  | Interventions         | 0                                                                                         |

## Findings

- A supabase-js query builder is lazy: it sends nothing until awaited, so `waiters()` timed out on the withdrawal.
  The service methods are `async` and send at once; a raw `rpc` must be wrapped (`must(...)`) before the wait. The
  timeout already makes the mistake loud, so no further guard.
- The story map listed 先付 and gate criteria as v1 although the spec put them under Later in October. A criterion id
  must start with its story id, so moving a row to a later story means a new id; the old ids remain only in the
  October board plan.

## Actions

- None beyond this PR.
