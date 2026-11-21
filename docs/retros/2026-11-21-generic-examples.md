---
branch: copy/generic-examples
date: 2026-11-21
pr: form hints, presets and 问小貘 chips use generic examples instead of campuses, YC, KLIA and calculus
title: Examples still pointed at students in Malaysia
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: generic examples

## Core (mandatory)

| Dimension | Measure               | This step                                                    |
| --------- | --------------------- | ------------------------------------------------------------ |
| Quality   | Escaped defects       | 0                                                            |
| Quality   | Skipped verifications | Dark not run: no colour or surface change                    |
| Speed     | Wasted time           | None                                                         |
| Autonomy  | Interventions         | 0: the owner chose this follow-up from the veto list in #226 |

## Findings

- Debug and test fixtures keep real Malaysian places (Sunway Geo Residences and others): they are worst-case data for
  dev and verify builds, never shown in release, and the Simulator place search returns real places.
- Ride preset keys stay (`home`, `campus`): only their copy changed, so stored ride kinds and cases are unaffected.
