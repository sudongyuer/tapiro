---
branch: fix/session-end-wiring
date: 2026-11-16
pr: Every module-level store declares its lifetime; session stores are checked to clear on session end
title: The missing-registration follow-up from #124 is now a unit test, and it found eleven more stores
escaped: 1
rework: 0
interventions: 0
overturned: 0
---

# Retro: session lifetimes

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                      |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 1: the carpool spec says sign-out cancels every ride reminder; only account deletion did                       |
| Quality   | Vacuous checks          | 0: the test fails with the fixes stashed (11 stores), with `paymentStore`'s line deleted, and with a new store |
| Quality   | Skipped verifications   | `verify:smoke` not run locally (Simulator avoided; no screen changed)                                          |
| Speed     | Wall-clock              | About 1 h                                                                                                      |
| Autonomy  | Avoidable interventions | 0                                                                                                              |
| Loop      | Minutes on this retro   | 5                                                                                                              |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                   | Root cause class | Change and layer                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | #124 left "nothing tests that each `services.ts` registers on `sessionEnds`" as a follow-up; a deleted line still passed `bun test`                                                                                             | missing check    | `src/lib/sessionLifetimes.test.ts` parses `src/` with the TypeScript compiler, lists every module-level store (`let`, `new Map/Set`, `create*()`), and requires a declared lifetime; `session` ones must be reached from `sessionEnds.register` (test). Tag `signout-render` |
| 2   | The test's first run found ride reminders, ride drafts and the ride cache, bounty apply and issue notes, chat images, stickers and the 问小貘 consent read cleared only on account deletion or on a render; dispute notes never | same pattern     | Each now registers on `sessionEnds` (code)                                                                                                                                                                                                                                   |

## Follow-ups

- A store built by a function not named `create*` and kept in a module-level `const` is not listed; every store today
  uses a `create*` factory, `createStore`, a `Map`/`Set` or a `let`.
