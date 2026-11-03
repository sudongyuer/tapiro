---
branch: feat/carpool-reminders
date: 2026-11-03
pr: https://github.com/sudongyuer/tapiro/pull/54
title: carpool step 7 (reminders and the carpool event kinds)
escaped: pending
rework: 0
interventions: 0
overturned: pending
---

# Retro: carpool step 7 (local reminders, the event outbox and the recording sender)

## Running log

| #   | Tag            | What happened                                                                                                                                                  | Cost   | Change and layer                                                                                         |
| --- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| 1   | tooling        | `node_modules` missing in the fresh worktree again (steps 5 and 6 retros); `bun install` first                                                                 | ~1 min | none; already recorded                                                                                   |
| 2   | worktree-guard | Shell variables in `sed` and heredocs into `python3` were refused by the worktree guard; wrote scripts to the scratchpad or used the Write tool                 | ~3 min | none; known since step 4                                                                                 |
| 3   | test-fixture   | The first pgTAP run aborted: the quiet-hours case set a settling ride back to `departed`, which `rides_total` forbids; used a fresh ride in `gathering` instead | ~3 min | none (one-off)                                                                                           |
| 4   | rn-import      | `bun test` failed to parse `react-native` because the pure plan imported the `@/lib/notifications` facade; pure modules import its subpaths                   | ~2 min | Subpath imports in `plan.ts` and `rideReminders.ts`; the facade stays for app code                       |
| 5   | entitlement    | The `expo-notifications` config plugin is auto-applied and always adds `aps-environment`, which a free team cannot sign (same as Sign in with Apple)           | ~5 min | `plugins/withoutPushEntitlement.js`, which fails the prebuild if a push entitlement is requested later |
| 6   | fixture-clock  | `ride_settle_owing` failed once: the fixture places the split relative to each load, so a reload moved the 72 h reminder by a minute between the plist read and the label read | ~5 min | The case reads the plist and the label in one predicate; the failure message now carries the last label |
| 7   | cjk-spacing    | The first screenshot read 「会在11月5日」: `latinSpacing` spaces Latin letters, not digits, so an interpolated time needs spaces in the template | ~2 min | Template fixed; no rule (the zh copy already spaces digits by hand) |
| 8   | sync-race      | Reasoning about the verify fixtures showed a `my_rides` sync could cancel reminders a fresher `ride_detail` load had just scheduled | ~10 min | Code: each ride remembers its last read; an older `my_rides` read leaves it alone; unit test |

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                  |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Quality   | Defects escaping review                                       | pending (no review yet)                                                                    |
| Quality   | Checks that could not fail (vacuous)                          | 0 known; the owing case fails on the old copy (it asserts `owe.next`, which did not exist) |
| Quality   | Skipped verifications / open device checks / new known limits | 7 `ride.remind.*` device checks; `test:stack` not run; 3 known limits in the step 7 record |
| Speed     | Rework rounds                                                 | 0                                                                                          |
| Autonomy  | Avoidable interventions                                       | 0                                                                                          |
| Loop      | Minutes spent on this retro                                   | ~5                                                                                         |
