---
branch: feat/bounty-tiers
date: 2026-10-27
pr:
status: complete before merge
---

# Retro: reputation tiers and the bounty read model

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                                                      |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | review: 2 Important (derived `settled` shown to non-parties; deleted counterparts dropped a tier), 7 Minor; all fixed or ruled |
| Quality   | Checks that could not fail (vacuous)                          | 2 found by review (row count guaranteed by the key; "second device" with the same session); repaired or dropped                |
| Quality   | Skipped verifications / open device checks / new known limits | `bounties.helper_id` still readable through the table (column grants as a follow-up); no UI in this branch                     |
| Speed     | Rework rounds                                                 | 1                                                                                                                              |
| Autonomy  | Avoidable interventions                                       | 1: the tier question was asked only in chat and scrolled away; the user had to ask where the options were (twice)              |
| Autonomy  | Rulings made / overturned                                     | on-time share stored, not a tier input; migrations renumbered after the merged ones; settled visible to parties only           |

## Candidates

1. A choice asked mid-turn between tool calls was not seen. Tag `question-lost`. Rule candidate: a question for the
   user goes in the final message of a turn with its full options, never only in interim text or a "see above".
2. Mutation testing (each assertion run against deliberately broken SQL) caught every boundary the review then asked
   for except the threshold edges. Tag `vacuous-test`. Candidate: briefs name the exact threshold edges to test.
3. Derived state widened visibility (a status computed from a two-party table returned to everyone). Tag
   `rule-interaction`. Review checklist candidate: any value derived from an RLS-restricted table is checked per role.

## Kept (worked well)

- Running the tiers branch in a second worktree let it proceed while the posting UI was built on the main checkout.
