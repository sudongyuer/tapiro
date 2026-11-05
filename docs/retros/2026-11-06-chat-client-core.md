---
branch: feat/chat-client-core
date: 2026-11-06
pr: chat client core (plan Tasks 2–3)
title: chat service, fixtures, store, outbox, live handler, read state and the 消息 badge
escaped: pending
rework: 1
interventions: 0
overturned: pending
---

# Retro: chat client core (Tasks 2–3)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                           |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending (no screens yet; Tasks 4–5 are the first users)                                                                                             |
| Quality   | Vacuous checks          | Key store and outbox tests mutation-checked (each fails when its guard is removed); one pgTAP write guard that could not fail was dropped in review |
| Quality   | Skipped verifications   | No UI case or Simulator run: no screen changed and another agent owned the Simulators                                                               |
| Speed     | Wall-clock              | About 3 h, a third of it reading the live layer, liveItems and the chat migration                                                                   |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                   |
| Loop      | Minutes on this retro   | 5                                                                                                                                                   |

## Problems and root causes

| #   | What happened                                                                                                    | Root cause class                                   | Change and layer                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Task 2 was already done by carpool #48; the brief and the plan still listed it                                   | plan not updated when another feature did the work | Plan: Task 2 marked done with the evidence; status updated                                                             |
| 2   | A thread read in flight when your own send landed could erase the sent message (the sender gets no event)        | race between a stale read and a local insert       | Code: a send reloads the thread, superseding the older answer; unit test                                               |
| 3   | A message arriving during an in-flight mark was never marked read                                                | early return without re-check                      | Code: re-check after a successful mark while the thread is open; unit test                                             |
| 4   | Sign-out and back in left a message stuck as sending, and a late answer could rewrite a deleted account's outbox | in-memory cache outliving the generation           | Code: start turns cached sending entries into failed; late answers update only entries still in the outbox; unit tests |
| 5   | A failed thread could be marked stale (shown as old data that is really empty)                                   | status transition not restricted                   | Code: only ready goes stale; unit test                                                                                 |
| 6   | `peerReadAt` showed a blocked peer's read time                                                                   | read-receipt rule missed blocks                    | Migration filters blocked pairs; pgTAP                                                                                 |
| 7   | A test awaited the store call before resolving its deferred and timed out                                        | test authoring slip                                | None: caught at once by the 5 s timeout                                                                                |
| 8   | `rides_schema.test.sql` test 39 fails on the local database                                                      | known (2026-11-05 retro #4)                        | Unchanged; CI is clean                                                                                                 |

## Review findings

One round: 0 Critical, 4 Important (#2–#5 above), 9 Minor. All fixed in the same round except: a send whose answer
fails to parse shows as failed (retry is idempotent, cosmetic) and the list keeping only page one on reload (left to
Task 4, noted in the plan). Re-review after the Important findings: see the PR.

Lesson: a store that both inserts locally and reloads from the server needs a test for "local write lands while a read
is in flight" for every local write; the review found two of these (send, mark).
