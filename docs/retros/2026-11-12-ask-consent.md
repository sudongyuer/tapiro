---
branch: feat/ask-consent
date: 2026-11-12
pr: 问小貘 Task 3, consent before the first cloud call, 我的 → 小貘 switch, and the 149 daily feed cap
title: Consent built from the drawn boards; one test modelled the server as static
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: 问小貘 consent (Task 3) and the 149 feed cap

## Core (mandatory)

| Dimension | Measure                 | This step                                                                 |
| --------- | ----------------------- | ------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                   |
| Quality   | Vacuous checks          | 1 caught before commit (below, #1)                                        |
| Quality   | Skipped verifications   | pgTAP run locally inside a rolled-back transaction, not `supabase test db` |
| Speed     | Wall-clock              | PENDING                                                                   |
| Autonomy  | Avoidable interventions | 0                                                                         |
| Loop      | Minutes on this retro   | 10                                                                        |

## Problems and root causes

| #   | What happened | Root cause class | Change and layer |
| --- | ------------- | ---------------- | ---------------- |
| 1   | The gate test for 「withdrawn on another device」 failed: its fake server answered 「given」 forever, so the reread after a 403 put consent back on. The code was right; the fake could not change its mind | test fake | The fake now holds the server's truth in a mutable field the test flips. Lesson: a fake for a server read must be able to change between reads when the test is about another device. Tag `static-fake` |
| 2   | The shared local database could not be reset (another agent uses it), so the new migration and pgTAP files were run as one psql script that begins, creates `pgtap`, applies the migration, runs the test body and rolls back | environment | Kept as a procedure, not a script: CI's `supabase` job is still the gate. Tag `shared-local-db` |

## Follow-ups

- Task 4 wires `cloudCall` into the sheet; until then 发送 only runs the consent gate.
