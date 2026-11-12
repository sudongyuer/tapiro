---
branch: feat/ask-provider
date: 2026-11-13
pr: 问小貘 Task 9 server side, the Model Studio provider behind ai-draft with pinned Qwen and a DeepSeek fallback
title: Pins and error rules from the Model Studio docs; review found prose answers that could be cut off or be a tool call
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: 问小貘 real provider, server side (Task 9)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                             |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                               |
| Quality   | Vacuous checks          | 0; every new rule was mutation-checked (removing it fails at least one test)                          |
| Quality   | Skipped verifications   | `verify:smoke` (no Simulator in this task, no UI changed); the final `test:stack` run is CI's, see #3 |
| Speed     | Wall-clock              | About 3 h; about 50 min reading the Model Studio docs                                                 |
| Autonomy  | Avoidable interventions | 0; one privacy question (281) raised for the owner, as the AI rules require                           |
| Loop      | Minutes on this retro   | 10                                                                                                    |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                               | Root cause class | Change and layer                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Review: `finish_reason` was not read, so an `ask` answer cut off at `max_tokens`, or a tool call written as prose, would have reached the user as a full answer and been charged; the forced `answer` task also accepted prose              | missed case      | Only `stop` or `tool_calls` is complete; prose that looks like a tool call or answers a forced tool is discarded; four fixture tests. Tag `partial-as-complete`             |
| 2   | Review: 502, 504 and a connection lost late could follow a model run that was already billed, so the fallback could bill one request twice                                                                                                  | missed case      | Fallback only on the documented 404, 429, 500, 503 and a connection that fails within 3 s; tests for both sides of each window. Tag `double-bill`                           |
| 3   | The isolated stack's `functions serve` worked once (the new stack test and `ai-draft` passed in the Edge Runtime), then failed every later start with 「failed to copy edge runtime main service into container」, on fresh project ids too | environment      | Time-boxed at 20 min: `docker cp` into the same image works, so it is the CLI 2.122.1 serve step on this machine. The final run is CI's (Linux). Tag `edge-runtime-serve`   |
| 4   | The Model Studio `.md` URLs return the HTML page, which `WebFetch` summarises and can misquote IDs                                                                                                                                          | research         | Downloaded the pages and read the text directly for every ID, status code and limit; the plan cites page and date. Tag `doc-fetch`                                          |
| 5   | Prettier over `docs/story-map.md` realigned the whole `ask.draft` table, which the parallel voice branch also edits                                                                                                                         | process          | Reverted to the three new rows. Second `doc-churn` in two tasks: worth a lint that fails a story-map diff touching rows outside the ids it adds (follow-up, not built here) |

## Follow-ups

- The smoke run (plan 「Task 9 smoke run」) once 148 is done; measure the budget with `bun run ai:budget`.
- Question 281 decides whether `MODEL_STUDIO_FALLBACK=deepseek` turns on.
- Task 8 decides whether `data_inspection_failed` gets its own card instead of 小貘晕了.
- If CI's `test:stack` cannot reach `host.docker.internal` on Linux, add the host gateway for the edge runtime there.
