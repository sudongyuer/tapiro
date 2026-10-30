---
branch: docs/carpool-reconcile
date: 2026-10-30
pr:
status: complete before merge
---

# Retro: carpool spec reconcile and UI questions (overnight, docs only)

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                                                                |
| --------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | none yet (docs only)                                                                                                                     |
| Quality   | Checks that could not fail (vacuous)                          | none                                                                                                                                     |
| Quality   | Skipped verifications / open device checks / new known limits | known limits: no push until the developer account; ordering by area, not route                                                           |
| Speed     | Rework rounds                                                 | 0                                                                                                                                        |
| Autonomy  | Avoidable interventions                                       | 0 so far; 19 questions (98–116) wait for one morning answer                                                                              |
| Autonomy  | Rulings made / overturned                                     | publish needs a payee method; joining is not publish-blocked; account deletion blocked by an active ride; shared place and block modules |

## Candidates

1. The bounty reconcile retro asked for a role-by-state walk before asking the user. Doing it here found two gaps the
   first draft missed (the organiser's n-1 settles: one celebration or many, one card or many; and home with three
   owed cards for one ride), now questions 110–112. Candidate stays for the brief template.
2. Built code assumed one payment per item in places the spec never stated (the celebration on every settle, one
   sticker per payment). A reconcile should grep for `item_kind = 'bounty'` and per-payment side effects first.

## Kept (worked well)

- Reading the migrations for the contracts (`spend_post`, `record_no_show`, the bounty-only unique index) instead of
  the specs: the item-kind enum already had `ride`, so no schema question was needed.
