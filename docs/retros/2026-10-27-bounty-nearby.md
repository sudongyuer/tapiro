---
branch: feat/bounty-nearby
date: 2026-10-27
pr:
status: complete before merge
---

# Retro: bounty step 2 `nearby_bounties`

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                              |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | review: 1 Important (cursor not bound to point and filter), 7 Minor; fixed or listed as known limits   |
| Quality   | Checks that could not fail (vacuous)                          | 2 found by review (anon test, no-address test); both now fail on broken code                           |
| Quality   | Skipped verifications / open device checks / new known limits | deep paging and filtered-scan cost listed in the README; rides not in 塞得进空档 until the ride schema |
| Speed     | Rework rounds                                                 | 1                                                                                                      |
| Autonomy  | Avoidable interventions                                       | 0                                                                                                      |
| Autonomy  | Rulings made / overturned                                     | 塞得进空档 overlap rule (slot = start to end, or 1 h; deadline-only always fits)                       |

## Candidates

1. A README claim ("the cursor is bound to the same point and filter") had no code or test behind it. Tag
   `doc-claim-untested`. Candidate for the review checklist: every guarantee a README states names its test.
2. Vacuous tests again (third step in a row: `affordance-by-id`, art not asserted, anon/address). Tag
   `vacuous-test`. Candidate for the brief template: implementers show each new test failing on a deliberately broken
   version, not only before the migration exists — the "missing function" red proves nothing about the assertion.

## Kept (worked well)

- The reviewer's independent oracle (600 rows × 30 combinations against a separate sort) gave strong evidence for the
  cursor at low cost.
