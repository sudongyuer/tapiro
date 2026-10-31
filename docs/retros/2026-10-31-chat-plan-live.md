---
branch: docs/chat-plan-live
date: 2026-10-31
pr:
status: complete before merge
---

# Retro: chat plan follows the shared live-update spec (docs only)

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                     |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | none (docs only)                                              |
| Quality   | Checks that could not fail (vacuous)                          | none                                                          |
| Quality   | Skipped verifications / open device checks / new known limits | none                                                          |
| Speed     | Rework rounds                                                 | 1: the chat plan assumed Postgres Changes before the spec     |
| Autonomy  | Avoidable interventions                                       | 1: the whole first carpool round was rejected (see candidate) |
| Autonomy  | Rulings made / overturned                                     | overturned: carpool questions 98–116 are void                 |

## Candidates

1. The first carpool round (questions 98–116, the ride card, the route component) was drawn overnight without
   reference research or an agreed visual direction, and the user rejected all of it (「重新画，感觉都好丑」). Cost: one
   night's boards and two redraw attempts. Root cause: process. Question boards were drawn before the direction was
   set; bounty only worked because direction D and 93A came first. Fix: memory `research-before-new-area`. A new area
   starts with a joint research board and a written direction, then one screen at a time. Tag: design-process.
2. Three sessions answered the same canvas comments and twice drew the same board. Cost: duplicate redraws and a
   canvas.json conflict. Root cause: comment routing is per session and boards have no owner field. Fix for now: the
   board's author owns its comments, and other sessions forward them. Candidate: an owner tag in each canvas.json title.
   Tag: coordination.
3. Question-number ranges collided again (157 used by post-redo and by the realtime spec). Root cause: ranges are not
   reserved in one place. Candidate: a reserved-range line in canvas.json notes, updated before drawing. Tag:
   coordination.

## Kept (worked well)

- Checking the spec and the code before answering 「悬赏也没有实时推送么」 caught an auto-reply that had guessed.
