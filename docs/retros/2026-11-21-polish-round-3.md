---
branch: feat/polish-round-3
date: 2026-11-21
pr: chat list rows stop re-rendering on every reload
title: Chat rows re-rendered on every list reload
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: polish round 3

## Core (mandatory)

| Dimension | Measure               | This step                                                                          |
| --------- | --------------------- | ---------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                  |
| Quality   | Skipped verifications | Device Instruments (the 13 Pro Max waits for the owner); smoke and `chat_list` ran |
| Speed     | Wasted time           | Queued behind the parallel session's milestone run on the Simulator lock           |
| Autonomy  | Interventions         | 0                                                                                  |

## Findings

- The chat list passed the reload time to every memoised row, so each reload re-rendered every row. Rows only read
  the day (today, yesterday, this week, this year), so they now get the start of the loaded day; a unit test pins that
  the day start reads every row as the load moment does.
- Not changed: the ride list's minute tick. Its countdowns need the minute, and narrowing which tickets get it risks
  stale times on screen for about 50 renders a minute saved.
- The PR hook checks for the retro before a compound command runs, so a retro written and committed in the same
  command as `gh pr create` is never written. Write and commit the retro first, then open the PR.
