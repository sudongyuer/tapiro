---
branch: feat/china-storefront
date: 2026-11-21
pr: China mainland storefront phase 1 (no cloud AI on CHN, ai-draft 451, ICP slot) with spec and research
title: China mainland storefront, phase 1
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: China mainland storefront, phase 1

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                                     |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0 known                                                                                                                       |
| Quality   | Skipped verifications | Only smoke and the two new UI cases ran (Pace); the stack test ran on an isolated stack with `functions serve` from this tree |
| Speed     | Wasted time           | ~10 min: the worktree guard refused heredocs and multi-file shell edits; a `test.each` of bare strings broke under Deno       |
| Autonomy  | Interventions         | 0                                                                                                                             |

## Findings

- The Deno shim for `bun:test` (`supabase/functions/tests/deno-bun-test.ts`) spreads each `test.each` case, so a case
  list of bare strings passed `'C'` instead of `'CHN'`; Bun passed, Deno failed. Cases are tuples now. Tag
  `deno-shim-each`. Lowest layer: the shim's `Case` type already says `readonly unknown[]`, but `test:deno` runs with
  `--no-check`; making the shim throw on a non-array case would catch it at once. Not changed here (one line, shared
  test infrastructure) — candidate for the next infra pass.
- `sessionLifetimes.test.ts` caught the new module-level `storefront` store without a declared lifetime: the check
  worked as intended.
- The verify runner rejects an `ARGS` entry that is not a literal (`ICP` constant); `test_affected` caught it before any
  Simulator time.
- Apple's docs, read through the JSON endpoints under `developer.apple.com/tutorials/data/documentation/storekit/`,
  settled that `AppTransaction` carries no storefront, which decided the server design (spec decision 4).
- Review (one round, all fixed together): a StoreKit answer arriving after the 5 s timeout was dropped (a China
  install could keep AI until the next foreground); installs with no storefront flipped the tab trigger's `hidden` every
  cold launch, which remounts expo-router's tabs; native start/stop for updates were unordered; refreshes could overlap;
  the UI case could not tell CHN from "pending". Pattern: a timeout race that discards the slower result. Tag
  `timeout-drops-answer`; the regression test now covers it.
- Coordinator relayed the owner's release sequencing mid-task (China excluded from the first release); recorded as
  spec decision 13 and in `docs/status.md`.
- No canvas round: the UI change is removals plus one footer and one row in a system form (spec decision 8).
