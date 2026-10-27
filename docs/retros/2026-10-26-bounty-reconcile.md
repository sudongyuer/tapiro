---
branch: docs/bounty-reconcile
date: 2026-10-26
pr:
status: complete before merge
---

# Retro: bounty spec reconcile and UI handoff

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                           |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | none yet (docs only)                                                                                |
| Quality   | Checks that could not fail (vacuous)                          | none                                                                                                |
| Quality   | Skipped verifications / open device checks / new known limits | known limits added: 「有问题」 loop without exit, no push/chat/Realtime in v1, tier without reviews |
| Speed     | Rework rounds                                                 | 0; three decision rounds (12, 6, 15 questions), each answered in one line                           |
| Autonomy  | Avoidable interventions                                       | 1: the revision surfaced 6 follow-up questions the reconcile could have asked in its first round    |
| Autonomy  | Rulings made / overturned                                     | tier name 新朋友 over CraftPick 「新来的」; one-time card seen flag on the server                   |

## Candidates

1. Follow-up questions came in three rounds because each pass (reconcile, revise, draw) found gaps the previous one
   could not see: drawing the screens exposed six spec gaps (who sees what between `confirmed` and 「我已付款」,
   seen-state storage, the gold token). Candidate for the brief template: a reconcile pass also walks each role
   through every state and names what each sees on home and on the status screen, before asking the user.

## Kept (worked well)

- Rules first, then the canvas: the boards only asked UI questions because the rules were settled.
- Subagent briefs as files with the decisions inline; the main context kept only the reports.
