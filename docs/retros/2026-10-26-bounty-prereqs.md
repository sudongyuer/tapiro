---
branch: feat/bounty-prereqs
date: 2026-10-26
pr:
status: complete before merge
---

# Retro: bounty prerequisites P1–P4 (without Task 3)

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                                           |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | review: 1 Important (ride settled events keyed per item), 9 Minor; all fixed or ruled; re-review approved           |
| Quality   | Checks that could not fail (vacuous)                          | 1 found by review: no assertion that category art is drawn; now a pixel-count check that failed with a wrong colour |
| Quality   | Skipped verifications / open device checks / new known limits | concurrency of the ledger and waiver is a story-map gap (needs two sessions); Task 3 waits on the tier thresholds   |
| Speed     | Rework rounds                                                 | 1 fix round                                                                                                         |
| Autonomy  | Avoidable interventions                                       | 0                                                                                                                   |
| Autonomy  | Rulings made / overturned                                     | 8 rulings in the plan's "Deviations and rulings"; none overturned                                                   |

## Candidates

1. My own one-line fix (index scoped to bounties for per-rider ride payments) changed an invariant other tables
   relied on (reputation events per item); the review caught it. Tag `invariant-ripple`. Candidate for my own fixes:
   when a fix changes a uniqueness assumption, grep for every other key on the same columns before committing.
2. Local Supabase port 54321 is held by CleanMyMac, so `db:reset` exits 1 and `test:stack` needs a shim. Tag
   `port-collision`. Candidate: move the local stack's API port in `supabase/config.toml` (the stack already runs
   Kong on 55321) so the scripts stop depending on a free 54321.

## Kept (worked well)

- Batching tasks per implementer and one whole-branch review kept the step to three implementer runs and one fix.
- The rehearsal on seeded pre-migration data confirmed grants and sticker roles before any hosted push.
