---
branch: fix/ai-live-qwen
date: 2026-11-20
pr: translate returns the translation and Qwen drafts keep their reward, found on the first hosted run against real Qwen
title: the first live Qwen run showed two faults every fixture had hidden
escaped: 2
rework: 0
interventions: 0
overturned: 0
---

# Retro: first live Qwen run

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                                                                                                  |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 2 (built in Task 9 on 2026-11-13, found on the first real call): translate echoed the source; drafts discarded                                                                             |
| Quality   | Skipped verifications | Live rerun of translate, draft_bounty, answer and ask after the fix, and the 3.8-flash quality comparison: Model Studio began answering `AccessDenied.Unpurchased` for every model mid-run |
| Speed     | Wasted time           | ~0; one probe call per hypothesis found both causes                                                                                                                                        |
| Autonomy  | Interventions         | 0                                                                                                                                                                                          |

## Findings

- Both faults lived in the request, not in code a fixture could exercise: the fixtures were written from the docs'
  reply shape with arguments we chose, so a model that reads a tool's argument as its input, or answers a type list
  with a string, could never show up. Tag `fixture-from-docs`.
- Translate: the tool `translate(text)` described as 「Translate the given message」 reads as an action the model asks
  for, so it filled `text` with the message to translate (9 of 9). An output-only tool needs its description and field
  to say the argument is the result. Tag `tool-as-output`.
- Draft: `type: ['integer', 'null']` got `"15"` 5 of 5 times; `anyOf` got `15` 3 of 3; a `description` asking for an
  integer and `['number', 'null']` did not help. Tag `qwen-type-list`.
- The first `tsc` failed on a missing `@react-native-google-signin/google-signin`: the new worktree had not run
  `bun install` since #189 added it. Tag `worktree-stale-deps`.
- The raw body was visible only through a temporary function, since `ai-draft` logs codes only (by design). A probe
  that reuses the module code and answers one account is cheap; it was deleted after use.

## Changes

- `tools.ts`: `rewardMajor` as `anyOf`; whole-number strings in integer fields are read as numbers before validation;
  translate's description and field name the argument as the translation.
- `liveReplies.test.ts` holds a recorded live reply and asserts on the sent schema (no numeric type lists, the
  translate field's meaning); four of its tests failed on the old code.
- Live recordings now back fixtures: a provider adapter is not done until one recorded real reply per tool is in the
  tests. Lowest layer that holds: a test file that replays recorded bodies (`modelStudioRecorded.ts`), extended as each
  tool is recorded; translate, answer and ask still need one once Model Studio access is back.
