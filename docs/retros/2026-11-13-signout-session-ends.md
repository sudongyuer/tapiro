---
branch: fix/signout-iap-state
date: 2026-11-13
pr: Clear per-user stores when the session ends, not on a render
title: A unit test confirmed the sign-out gap; the same pattern sat in eleven stores and one approved decision
escaped: 1
rework: 1
interventions: 0
overturned: 0
---

# Retro: sign-out clears on the session end

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 1: D4 said signing out deletes the 问小貘 words and conversation; only account deletion did              |
| Quality   | Vacuous checks          | 0 known; the new tests fail without the fix (checked)                                                    |
| Quality   | Skipped verifications   | No test drives the real `services.ts` wiring (react-native cannot load under `bun test`); see follow-ups |
| Speed     | Wall-clock              | About 1 h, alongside the ms type-row fix                                                                 |
| Autonomy  | Avoidable interventions | 0                                                                                                        |
| Loop      | Minutes on this retro   | 5                                                                                                        |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                      | Root cause class | Change and layer                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | The purchase store was cleared only by `followCoins(null)`, which runs only if `(tabs)` renders once more with no user; the same user signing back in skipped the sweep (`signOut.test.ts` showed 1 scan, not 2)   | design gap       | `src/lib/sessionEnds.ts`, fed from the auth store by `account/followSessionEnds.ts`; stores clear on it (code). Tag `signout-render`                         |
| 2   | The same reliance sat in coins, chat, payments, live bounties, settled stickers and reputation; review found payees, profile, the bounty cache, 已申请 marks, place picks and the draft inbox kept across sign-out | same pattern     | All register on `sessionEnds`. Lesson: `userCleanups` means "forget on account deletion"; a store that must not outlive a session registers on `sessionEnds` |
| 3   | D4 (ask plan) said sign-out deletes the 问小貘 words; the code registered `forget` only on deletion. A reply in flight across sign-out and a reopen was written back                                               | missed case      | `forget` on `sessionEnds`; forgets counted per user so a reopen does not revive a late reply (unit test). D4 now says any session end counts                 |

## Follow-ups

- Nothing tests that each `services.ts` registers on `sessionEnds`; a deleted line passes `bun test`. A UI case that signs out
  and back in as the same user with a kept purchase would cover it at the next coins milestone.
- `sessionEnds` and `userCleanups` swallow a throwing handler silently, as before.
