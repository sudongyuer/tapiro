---
branch: copy/broaden-positioning
date: 2026-11-21
pr: copy, the 问小貘 persona and the website stop positioning Tapiro around Malaysia and students
title: Positioning narrowed to students in Malaysia
escaped: 1
rework: 0
interventions: 1
overturned: 0
---

# Retro: broaden positioning

## Core (mandatory)

| Dimension | Measure               | This step                                                                |
| --------- | --------------------- | ------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 1: welcome, About, stickers and the website still said students/Malaysia |
| Quality   | Skipped verifications | No UI case run: copy only, cases assert through `ui.t`                   |
| Speed     | Wasted time           | None                                                                     |
| Autonomy  | Interventions         | 1: the owner had to say it a second time                                 |

## Findings

- The first line of `AGENTS.md` described Tapiro as an app for Chinese students in Malaysia, and every agent wrote copy,
  the 问小貘 persona and the website from it; the owner's earlier choice (no "Malaysia" on the website) lived only in
  `docs/status.md`. Tag `positioning-source`: the description agents read first now states the neutral positioning and
  the rule, so new copy starts from it.
- Country-specific behaviour stays: MYR, DuitNow, Malaysian mobile numbers, the Bank Negara rate, Malaysia time for
  server rules, the default map region.
