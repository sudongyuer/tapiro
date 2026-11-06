---
branch: feat/rep-server
date: 2026-11-06
pr: reviews, profile, coins plan and server
title: the task plan for steps 5–6 and the server half (reviews, tier drops, mascot level, profile, weekly feed, invites)
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: reviews, profile and coins, plan and server

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                  |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                    |
| Quality   | Vacuous checks          | 0 known: each new pgTAP file was run red first (wrong plan counts, a JSON null against SQL null, an unqualified parameter) |
| Quality   | Skipped verifications   | `verify:smoke` and UI cases: no client code changed (the plan's Task 2 is the first client change)                         |
| Speed     | Wall-clock              | About 2.5 h: reading the canvas and the schema, five migrations, four test files, the plan                                 |
| Autonomy  | Avoidable interventions | 0                                                                                                                          |
| Loop      | Minutes on this retro   | 5                                                                                                                          |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                                                                    | Root cause class | Change and layer                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `private.tier_for` compared `settled >= t.settled`: in a SQL function an unqualified name resolves to the FROM column before the parameter, so the check was always true. Caught by the first test run                                                                                                           | knowledge        | Qualified every parameter (`tier_for.settled`); the pgTAP thresholds cases fail if it regresses. Already known in plpgsql, new for `language sql` here                                                                    |
| 2   | `bun test` failed after adding live-only `review.*` event kinds: `noticeTaps.test.ts` requires a tap route for every kind declared in a migration, and the route table is app code                                                                                                                               | knowledge        | Kept the server PR free of client code: the signals move to Task 2 with their routes (plan, 「Signals」). The existing unit test is the guard                                                                             |
| 3   | `sed` with `\b` did nothing on macOS while renaming a variable, and the migration failed to apply                                                                                                                                                                                                                | tooling          | Python replacements for multi-line or word-boundary edits                                                                                                                                                                 |
| 4   | Review: the no-show list in the drop detail sorted on equal `created_at` (one insert, one `now()`), so its test passed for me and failed for the reviewer; `goodReviews` used the rounded share and asked for one review too many                                                                                | check bug        | Explicit times in the test and an `id` tie-break in the migration; whole review counts in the arithmetic, with 80 % and 90 % cases. Rule of thumb kept here: a pgTAP ordering assertion needs distinct sort keys          |
| 5   | Review (minor): invite races (mutual codes, a code entered during the first settle), boarded members without a car sticker counted for the reward, `submittedAt` moved by the reveal, the window checked against the transaction start, ride reviewers visible on public profiles, a vacuous code-stability test | design gap       | Pair and per-user advisory locks, stickers as the source of the ride's other people, a `submitted_at` column, `clock_timestamp()` after the lock, the reviewer hidden on ride reviews (question 256), a stored first code |

## Notes

- `supabase db reset --local` ran three times while migrations changed; the main checkout's seeded test accounts need
  `bun run db:test-accounts` again after merge.
- The canvas drawings carried rules the one-line answers did not (the one-sided reveal, no 0/O/1/I in codes, no mutual
  invites, the first item must be with someone besides the inviter, ride member rows, level names); all are in the plan.
