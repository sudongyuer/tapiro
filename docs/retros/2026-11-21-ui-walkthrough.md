---
branch: audit/ui-walkthrough
date: 2026-11-21
pr: UI walkthrough audit report (docs/reviews/2026-11-21-ui-walkthrough.md)
title: UI walkthrough audit
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: UI walkthrough audit

## Core (mandatory)

| Dimension | Measure               | This step                                                                                   |
| --------- | --------------------- | ------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0 (report only)                                                                             |
| Quality   | Skipped verifications | Live two-account flow on the local stack (owned by the agents fixing the five known bugs)   |
| Speed     | Wasted time           | ~10 min (an unnamed `run.py` started the 682-run full matrix); ~60 min queueing on the lock |
| Autonomy  | Interventions         | 0                                                                                           |

## Findings

- `python3 verification/ui/run.py --appearance light` with no case names runs every case in every locale (682 runs,
  about 5 h under load), not zh-Hans only. It was stopped after the first case. The runner ignored SIGINT and needed
  SIGTERM to release the lock. Tag `runner-unnamed-full-matrix`. Fix candidate: refuse a nameless run without
  `--full`, the way `verify:full` names it.
- Reading 600+ screenshots one by one does not fit in context; a small contact-sheet tool (Swift, AppKit) that tiles a
  case's PNGs with labels made the audit possible. Tag `audit-contact-sheet`. If a second audit needs it, move it to
  `verification/ui/` as a helper.
- Load average stayed near 100 (other agents' builds); two cases lost the AXe automation session. Recorded as outside
  load, not product failures. Tag `axe-session-timeout`.
