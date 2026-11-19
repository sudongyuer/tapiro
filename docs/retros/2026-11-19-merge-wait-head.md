---
branch: fix/merge-when-green-head
date: 2026-11-19
pr: merge-when-green waits for checks on the pushed head
title: right after a push the merge script read the previous head's checks and refused
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: merge-when-green waits for the pushed head

## Core (mandatory)

| Dimension | Measure               | This step                                                             |
| --------- | --------------------- | --------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                     |
| Quality   | Skipped verifications | None; the script runs against a stand-in `gh` in `merge-gate.test.ts` |
| Speed     | Wasted time           | ~0 here; the old behaviour cost two refused merges in the 11-19 run   |
| Autonomy  | Interventions         | 0                                                                     |

## Findings

- `gh pr view` returns the previous head and its green rollup for a few seconds after a push. The script took that as
  registered checks, `gh pr checks --watch` then saw the new head with none, and it refused (safely, twice). The
  script now reads the branch ref (updated with the push), waits until the pull request's `headRefOid` equals it with
  checks registered, and merges only that SHA. Four new tests fail on the old script. Tag `merge-stale-head`.
