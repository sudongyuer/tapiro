---
branch: fix/local-refund-trace
date: 2026-11-16
pr: Trace a local refund hop by hop; test the app hop
title: The local refund stops inside Xcode's StoreKit test environment; every Tapiro hop is tested
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: local refund trace

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                       |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                               |
| Quality   | Vacuous checks          | 0: the new unit test fails when the listener drops revoked transactions                                         |
| Quality   | Skipped verifications   | SKTestSession not rerun: the Simulator lock was held by verify:full; the stack tests run in CI's `supabase` job |
| Speed     | Wall-clock              | About 40 min                                                                                                    |
| Autonomy  | Avoidable interventions | 0                                                                                                               |
| Loop      | Minutes on this retro   | 3                                                                                                               |

## Problems and root causes

| #   | What happened                                                                                                                                    | Root cause class | Change and layer                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------- |
| 1   | No test covered a revoked transaction arriving through `Transaction.updates` while the app is open; only the history sweep and a buy were tested | missing check    | Unit test in `purchaseStore.test.ts`; story map `coins.purchase.refund` names it (test) |
| 2   | The refund gap was recorded as 「never reaches the app」 without saying which hop; the next agent had to trace it again                          | missing record   | Plan 「Refund trace」 lists each hop, its test, and what needs the account (doc)        |
