---
branch: docs/website-retro-followup
date: 2026-11-21
pr: Record the two defects that escaped from the tapiro.app site step
title: The website retro said 0 escaped; two were found a week later
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: website retro follow-up

## Core (mandatory)

| Dimension | Measure               | This step       |
| --------- | --------------------- | --------------- |
| Quality   | Escaped defects       | 0               |
| Quality   | Skipped verifications | None; docs only |
| Speed     | Wasted time           | None            |
| Autonomy  | Interventions         | 0               |

## Findings

- `2026-11-14-website` now counts its two escaped defects; both were already guaranteed by later retros, so no new
  rule is added here.
- The retro hook (`~/.claude/hooks/require-retro.sh`, cross-project) checks the session checkout's branch. A fix that
  reads the directory of a leading `cd <dir> &&` is drafted with a test that fails on the current hook; it waits on
  the owner because it changes cross-project config.
