---
branch: feat/ask-consent
date: 2026-11-12
pr: 问小貘 Task 3, consent before the first cloud call, 我的 → 小貘 switch, and the 149 daily feed cap
title: Consent built from the drawn boards; one test modelled the server as static
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: 问小貘 consent (Task 3) and the 149 feed cap

## Core (mandatory)

| Dimension | Measure                 | This step                                                                  |
| --------- | ----------------------- | -------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                    |
| Quality   | Vacuous checks          | 1 caught before commit (below, #1)                                         |
| Quality   | Skipped verifications   | pgTAP run locally inside a rolled-back transaction, not `supabase test db` |
| Speed     | Wall-clock              | About 3.5 h; about 1 h in Simulator runs and two case fixes                |
| Autonomy  | Avoidable interventions | 0                                                                          |
| Loop      | Minutes on this retro   | 10                                                                         |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                 | Root cause class | Change and layer                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The gate test for 「withdrawn on another device」 failed: its fake server answered 「given」 forever, so the reread after a 403 put consent back on. The code was right; the fake could not change its mind                   | test fake        | The fake now holds the server's truth in a mutable field the test flips. Lesson: a fake for a server read must be able to change between reads when the test is about another device. Tag `static-fake` |
| 2   | The shared local database could not be reset (another agent uses it), so the new migration and pgTAP files were run as one psql script that begins, creates `pgtap`, applies the migration, runs the test body and rolls back | environment      | Kept as a procedure, not a script: CI's `supabase` job is still the gate. Tag `shared-local-db`                                                                                                         |

| 3 | The review round found 4 Important issues: a swipe-away during 同意 popped the screen below, a stale-version refusal looped the user back to 同意, the gate read an unknown status as 「consent required」, and two consent rows were untrue for flows version 1 covers (translation sends another person's message; 小貘记得 is synced) | spec gap | All fixed in the same branch with unit tests and case steps (swipe-down, bumped version). Lesson: read consent copy against every flow its version covers, not only the board. Tag `consent-copy` |
| 4 | `relaunch` rebuilds from the case's `ARGS`, not from the previous relaunch, and drops no scene; two worst cases relaunched with the wrong fixture | test harness | Each relaunch now drops the original fault and re-adds the scene. Tag `relaunch-args` |
| 5 | en dark: a typed space became 「. 」, then an instant AXe tap on 发送 with the keyboard up was dropped 3 times (frame checked against the screenshot) | environment | One-word text and a 0.15 s press in `ask.py`; 1 of 30 runs before, 0 after. Tag `instant-tap` |

## Follow-ups

- Task 4 wires `cloudCall` into the sheet; until then 发送 only runs the consent gate.
