---
branch: feat/ask-translate
date: 2026-11-13
pr: 问小貘 Task 6, long-press 翻译 in chat with the translation under the original, kept on the device (141)
title: Built from the 141 board; review found a queued tap that outlived sign-out, the Simulator found a case without consent
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: 问小貘 chat translation (Task 6)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                              |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 0 known                                                                                                |
| Quality   | Vacuous checks          | 2 caught in review (below, #2)                                                                         |
| Quality   | Skipped verifications   | None; the stack test ran locally through `supabase functions serve` after applying two missed migrations |
| Speed     | Wall-clock              | About 2.5 h; no wait for the Simulator lock, about 35 min in Simulator runs                            |
| Autonomy  | Avoidable interventions | 0                                                                                                      |
| Loop      | Minutes on this retro   | 10                                                                                                     |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                      | Root cause class | Change and layer                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Review: the sign-out counter was read when a queued translation started, not when it was tapped, so a tap queued before sign-out could restart consent for the old user and write its store back                                 | missed case      | The counter is captured on the tap and checked before anything runs; a unit test holds one call, queues a second and signs out. Third `late-write` in three tasks: an async job captures the user's epoch at its origin, not at its start. Tag `late-write` |
| 2   | Review: two UI-case assertions could not fail (翻译 checked with no menu open; the waiting line checked after the answer had landed)                                                                                                | vacuous check    | Removed one, moved the other before the wait. Tag `vacuous-ui`                                                                                                                                                   |
| 3   | First Simulator run: `chat_translate_worst` met the consent page, since the fixture's consent is not given unless the launch says so                                                                                                | test harness     | The case passes `-uiVerifyAiConsent given`. Tag `fixture-default`                                                                                                                                                |
| 4   | The 「translating」 screenshot showed the finished translation: a 2.5 s fixture delay ran out between finding the line and capturing it                                                                                                | test harness     | 5 s delay in `chat_translate`. Tag `short-window`                                                                                                                                                                |
| 5   | The shared local database was two migrations behind `main`, so the stack test could not have passed without `supabase migration up --local`                                                                                        | environment      | None; applied forward migrations from `main` only. Tag `local-stack-drift`                                                                                                                                       |
| 6   | Prettier on the docs realigned story-map tables this change did not touch, which would conflict with the parallel voice branch                                                                                                    | process          | Reverted to only the new rows. Lesson: never run prettier over shared docs. Tag `doc-churn`                                                                                                                      |

## Follow-ups

- Task 9 checks what the real provider returns for a message already in the target language (T2) and re-measures the translate cost against 「约 30 句」.
- T12's known gaps are listed in the plan for the owner.
