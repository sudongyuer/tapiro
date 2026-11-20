---
branch: feat/apns-direct
date: 2026-11-20
pr: notify sends through APNs directly; the app registers its APNs token and environment
title: Push for release builds through direct APNs
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: direct APNs

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                                      |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 0 known; real delivery is unverified until a phone runs iOS 26                                                                 |
| Quality   | Skipped verifications | Device delivery (no iOS 26 phone); `verify:smoke` and the `live_push_token` UI case (registration args changed; milestone run) |
| Speed     | Wasted time           | ~15 min: the worktree guard refused piped and heredoc shell commands; scratch scripts written with the editor ran fine         |
| Autonomy  | Interventions         | 0                                                                                                                              |

## Findings

- The shared local stack was behind main (latest migration 20261112000400) and failed four realtime counts in
  `live_push` on main as well. pgTAP for this change ran inside one rolled-back transaction there, then on a fresh
  isolated stack (ports 567xx, as `scripts/db-isolated.sh` does) where all 2243 tests passed; a second fresh run failed
  only `live_push` 35 (broadcast count 26 vs 25), the count CI's comment already calls fragile. Tag
  `live-push-35-count`. Earlier entries: the CI comment in `.github/workflows/ci.yml`. Not fixed here; no broadcast
  code changed.
- `scripts/db-isolated.sh` excludes the Edge Runtime, so a stack test on an isolated stack needed a scratch copy that
  also serves functions. Candidate (first occurrence): an `--functions` flag that serves `local.env` and runs a given
  `test:stack` file. Tag `isolated-stack-functions`.
- Whether the Edge Runtime's `fetch` speaks HTTP/2 to Apple was settled with a scratch probe function in the isolated
  stack: both APNs hosts answered `403 InvalidProviderToken` as JSON. Recorded in the spec's Implementation Record.
- `sessionLifetimes.test.ts` names module-level stores; renaming `expoToken` to `deviceToken` failed it in the full
  `bun test`, which a scoped run of `src/lib/push` did not cover. The registry check did its job.
