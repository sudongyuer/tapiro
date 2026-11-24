---
branch: test/bounty-post-ai-draft
date: 2026-11-24
pr: bounty.post.ai-draft is covered by the existing fill and undo, plus a confirm round trip
title: Post AI draft coverage
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: Post AI draft coverage

## Core (mandatory)

| Dimension | Measure               | This step                                                                 |
| --------- | --------------------- | ------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                         |
| Quality   | Skipped verifications | Real Model Studio path (account not purchased); the fixture draft is used |
| Speed     | Wasted time           | 0                                                                         |
| Autonomy  | Interventions         | 0                                                                         |

## Findings

- The whole behaviour shipped in #118 (plan D7–D9: fill, glow, strip, 撤销) and was covered under `ask.sheet.fill` and
  `ask.sheet.undo`; `bounty.post.ai-draft` still read a bare `ui`. Grepping the story map for the feature's test ids
  before planning turned an implementation task into a coverage task.
- `check-story-map` prints "planned only N" but names none of them; a stale planned row in a `building` story looks
  like open work. Candidate for `escalate-correction`: list planned-only criteria by id in the summary.
- [axe-session-timeout] The ms run's first attempt failed 0.4 s in with "Timed out creating the simulator remote
  automation session" on a freshly booted Simulator; the runner rebooted it and the retry passed. Outside cause, not
  the case.
