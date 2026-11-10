---
branch: spike/iap-live-activity
date: 2026-11-11
pr: IAP spikes 1–2 and Live Activity spikes 1–2 on the Simulator
title: The scheme's StoreKit file was the wrong lever; the test runner was the right one
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: IAP and Live Activity spikes

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                           |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0; one server defect found and fixed (`Xcode` ids colliding on the local database)                  |
| Quality   | Vacuous checks          | 0 kept; the harness's first count assertion matched duplicated accessibility nodes and was replaced |
| Quality   | Skipped verifications   | Xcode's Run with the scheme file; Xcode previews; Live Activity spike 3 (device)                    |
| Speed     | Wall-clock              | About 4 h                                                                                           |
| Autonomy  | Avoidable interventions | 0                                                                                                   |
| Loop      | Minutes on this retro   | 10                                                                                                  |

## Problems and root causes

| #   | What happened                                                                                                                                                                  | Root cause class       | Change and layer                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | An in-app `SKTestSession` (Debug-only) crashed the app on start: it reads `XCTestConfiguration` and aborts outside XCTest. About 30 min of plugin and podspec work was removed | assumption not checked | Read the framework's behaviour (a 10-line probe) before wiring build settings around it. Recorded in the IAP plan; tag `probe-first`     |
| 2   | The first harness run answered `duplicate` for new purchases: Xcode restarts transaction ids at 0, the local database keeps old rows                                           | environment model      | Server namespaces `Xcode` ids by purchase date, with a Deno test (code)                                                                  |
| 3   | Two harness cases hung or never saw their event (simulated `productUnavailable`; refund)                                                                                       | platform behaviour     | Probe case measured the refund (45 s, relaunch, `Transaction.all`): not delivered; both dropped from the suite and recorded, not retried |
| 4   | `simctl` screenshots and video never show the Dynamic Island; AXe `home` and `lock` did nothing on iOS 27.2                                                                    | tool limit             | Island evidence from the DeviceHub window (`screencapture -l`); written into the Live Activity plan for Task 4's cases                   |
| 5   | A `git stash` to compare a file ran while `verify:build` was compiling in the background                                                                                       | own slip               | Rebuilt after; compare against `git show origin/main:<file>` instead of stashing a tree another process reads. Tag `stash-under-build`   |
| 6   | `tsc` failed on `TermsLine` once Metro had generated `.expo/types` in the worktree; it passes without them (CI never has them)                                                 | pre-existing           | Not fixed here; follow-up below                                                                                                          |

## Follow-ups

- `.expo/types/router.d.ts` from a running Metro makes `src/features/account/TermsLine.tsx` fail `tsc` (`/legal/undefined`).
- Xcode's Run with the scheme's `.storekit` file was not measured (another session's Xcode did not answer Apple Events).
