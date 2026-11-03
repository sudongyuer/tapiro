---
branch: feat/carpool-reminders
date: 2026-11-03
pr: pending
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
