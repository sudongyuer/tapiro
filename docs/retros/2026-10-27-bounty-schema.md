---
branch: feat/bounty-schema
date: 2026-10-27
pr:
status: complete before merge
---

# Retro: bounty step 1 schema and transitions (without Task 7)

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                                                                                  |
| --------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | review: 2 Important (late-start no-show gameable after a late selection; applicant identity leaked through events), 9 Minor; all fixed; re-review approved |
| Quality   | Checks that could not fail (vacuous)                          | 3 mutations survived the first test pass in Tasks 4–6; cases added until each failed                                                                       |
| Quality   | Skipped verifications / open device checks / new known limits | concurrency of auto-confirm vs confirm and of cancel is a story-map gap (needs two sessions)                                                               |
| Speed     | Rework rounds                                                 | 1 fix round                                                                                                                                                |
| Autonomy  | Avoidable interventions                                       | 0; the tier-threshold question has waited since the prerequisites plan and now holds Task 7                                                                |
| Autonomy  | Rulings made / overturned                                     | 9 plan questions ruled as recommended; implementer decisions accepted in progress.md                                                                       |

## Candidates

1. Both Important findings were rule interactions the plan stated separately (late-start rule × selecting after the
   start; event visibility × block rules). Tag `rule-interaction`. Candidate for the plan template: for each rule
   that names a time or a visibility, list the other rules that can move that time or hide that row, and a test per
   pair.
2. A user question pending across two plans held one task. Tag `pending-question-blocks`. Kept the rest moving by
   ordering independent tasks first; worth doing by default: when a question is open, reorder so it blocks the
   fewest tasks and say which.

## Kept (worked well)

- Review before the last task: the read model will be built on fixed RLS instead of being reworked.
