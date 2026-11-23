---
branch: feat/testflight-external
date: 2026-11-24
pr: bun run testflight sends a processed build to the external group Public and beta app review
title: TestFlight external group and beta review
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: TestFlight external group and beta review

## Core (mandatory)

| Dimension | Measure               | This step                                                                                       |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                               |
| Quality   | Skipped verifications | No write was sent to Apple (owner's rule); reads and `--dry-run` on builds 1730 and 1036 only   |
| Speed     | Wasted time           | ~5 min: the fresh worktree had no `node_modules`, so `tsc` and `bun test` resolved the parent's |
| Autonomy  | Interventions         | 0                                                                                               |

## Findings

- Endpoints and bodies came from Apple's documentation JSON (`developer.apple.com/tutorials/data/documentation/`
  `appstoreconnectapi/<page>.json`), which the rendered pages hide behind JavaScript; read-only GETs then confirmed the
  shapes: a build with no submission answers `data: null`, the group's builds relationship refuses GET (403), and
  build 1730 already had both What to Test texts and a submission `WAITING_FOR_REVIEW`.
- A rerun after a failure skips what is done: the same text is not rewritten, a build already in the group is not
  added again (`filter[betaGroups]` + `filter[id]` on `/v1/builds`, checked on 1730 and 1036) and an existing
  submission is not resubmitted.
- Tag `stale-worktree-modules`, fifth occurrence (2026-11-03, 11-21 twice, 11-21 poster, now). Moved to a check:
  `lint:changed` refuses a checkout without `node_modules` and names `bun install --frozen-lockfile`
  (`lint-changed.test.ts`). It does not catch modules that exist but predate the lockfile.
