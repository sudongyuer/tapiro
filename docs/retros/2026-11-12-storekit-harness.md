---
branch: fix/storekit-harness
date: 2026-11-12
pr: StoreKit harness passes against the real buy-coins UI
title: A sample of the hung runner named the deadlock in one look
escaped: 0
rework: 3
interventions: 0
overturned: 0
---

# Retro: StoreKit harness

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                       |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                         |
| Quality   | Vacuous checks          | 2 found in review: the kept-purchase case checked the scene's own label; the cancel case cannot see its spinner |
| Quality   | Skipped verifications   | A refund reaching the app (cannot be driven locally; device row); the cancelled tap reaching StoreKit (see #5)  |
| Speed     | Wall-clock              | About 1 h 40 min, of which about 25 min building the Debug app in a fresh worktree                              |
| Autonomy  | Avoidable interventions | 0                                                                                                               |
| Loop      | Minutes on this retro   | 10                                                                                                              |

## Problems and root causes

| #   | What happened                                                                                                                                                                       | Root cause class   | Change and layer                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | The seeded account landed in onboarding on a fresh Simulator                                                                                                                        | hidden state       | Onboarding state is device-local, so the `store-e2e` scene marks the account onboarded with `accountActions.finishOnboarding` (code)                                                                                                             |
| 2   | Tear-down hung for hours after any failed case (`unbounded-wait`, third time with spike B and buy-coins)                                                                            | platform behaviour | `sample` of the runner: a failure in `async setUp` runs tear-down inline and waits for an `async @MainActor tearDown` that cannot run. Set-up and tear-down synchronous, comment states why; `run.sh` per-case allowance and cleanup trap (code) |
| 3   | The first run in the worktree failed with 「no supabase client」                                                                                                                    | environment        | A worktree has no `.env.local`; Metro started with the local stack's URL and anon key from `supabase status`. The case now prints the scene's line on a failed sign-in (code)                                                                    |
| 4   | The first case after a fresh install read an empty catalog; I first blamed Ask to Buy (it was always the first case) and added a reopen retry and an app change, then reverted both | wrong hypothesis   | A controlled run (fresh install, catalog case first) showed the order, not Ask to Buy; one app launch in the class set-up fixes it (code). Lesson: vary one thing before changing app code                                                       |
| 5   | Review: the cancel case passes even if the tap never reached StoreKit; tight polling cannot see the spinner of a simulated cancel                                                   | measurement        | The case asserts no transaction, no credit, then the same button buys exactly once; the remaining gap is written in the case's comment                                                                                                           |
| 6   | The cancel case's follow-up purchase was cancelled too in 1 of 4 runs: clearing `SKTestSession`'s simulated error lags                                                              | platform behaviour | Re-tap (at most 3) only while StoreKit has recorded no transaction, then assert exactly one (code)                                                                                                                                               |

## Follow-ups

- Closed from the buy-coins retro: `tsc` failed on `TermsLine.tsx` once Metro wrote `.expo/types` (third time); the
  link is destructured so the narrowing survives the closure, and `tsc` passes with the typed routes present.

- On sign-out the purchase store is cleared only if `(tabs)` renders once more with no user before `Stack.Protected` removes
  it (`useLiveCoins` cleanup does not clear). Not observed to fail here (the kept purchase stayed unfinished while signed
  out), but signing back in as the same user would skip the sweep if the store kept the old user. Worth a unit-level
  check of the sign-out order.
- The harness needs Metro with the local stack's env; `run.sh` cannot see Metro's env, so a missing client only shows as
  the first case's failure message.
