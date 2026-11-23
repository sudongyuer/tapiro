---
branch: feat/pay-cant-pay-offline
date: 2026-11-24
pr: 付不了 tells the payee to recheck a method; the pay sheet turns writes off without a network
title: cant-pay and offline pay sheet
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: cant-pay and offline pay sheet

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                   |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0 so far                                                                                                    |
| Quality   | Skipped verifications | Push delivery on two phones (device item in the story map); design canvas not drawn (decisions for veto)    |
| Speed     | Wasted time           | ~10 min: two pgTAP reruns (a client update on a column it cannot write; `now()` frozen inside the test txn) |
| Autonomy  | Interventions         | 0                                                                                                           |

## Findings

- pgTAP writes a "fresh" timestamp with `now()`, which is the transaction start and equals the row's insert time, so
  a trigger comparing old and new saw no change. Use `clock_timestamp()` in tests that need a later time. Tag
  `pgtap-now-frozen`.
- The ms UI run failed four times on 付不了's sent line because the copy changed after `verify:build` started (cases
  read strings from source, the app from the build); a rebuild and rerun passed. Finish copy edits from review before
  building, or rebuild before the run. Tag `copy-after-build`.
- A new module-level store in `src/lib` must be declared in `src/lib/sessionLifetimes.test.ts`; the full `bun test`
  caught it, the scoped run did not. Already guarded by that test; no new rule.
