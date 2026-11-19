---
branch: fix/verify-followups-1119
date: 2026-11-19
pr: lint:changed runs the size check; cases read set times through clock_at; a guard against hard-coded clocks
title: follow-ups from the 2026-11-19 full run (size check skipped locally, six 24-hour-only cases)
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: verify follow-ups from the 2026-11-19 full run

## Core (mandatory)

| Dimension | Measure               | This step                                                  |
| --------- | --------------------- | ---------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                          |
| Quality   | Skipped verifications | None; ms 12-hour not run (the task asked zh-Hans and en)   |
| Speed     | Wasted time           | ~5 min waiting for the Simulator lock behind another agent |
| Autonomy  | Interventions         | 0                                                          |

## Findings

- `check:size` lived only in CI and in a list agents read; it was skipped twice. `lint:changed` now runs it first and
  fails on it even when nothing needs linting; `scripts/lint-changed.test.ts` fails on the old script. AGENTS.md keeps
  one sentence. Tag `skipped-local-check`.
- Six cases asserted a 24-hour clock in copy (`'09:10'` in a translated string, `\d{1,2}[:.]\d{2}` next to copy that
  continues with `AM`, a `%H:%M` reminder time). `hourcycle.clock_at(hour, minute)` gives the exact time in the
  run's cycle. `test_clock_guard.py` fails a case with a literal clock or a clock regex outside `hourcycle`; against
  main it lists all six (plus `bounty_status_poster` and the `ride_list` OCR pattern, which passed by matching a
  substring and now check the period too). Helpers outside `cases/` are not scanned: their clock regexes parse both
  cycles on purpose. Tag `hour-cycle`.
- Found while building the guard: the ride create confirm sheet shows the stored flight time `09:10` in a 12-hour
  run, while the picker and ticket show `9:10 AM`. Left as a product follow-up, exempted in the guard with that
  reason. Tag `hour-cycle`.
