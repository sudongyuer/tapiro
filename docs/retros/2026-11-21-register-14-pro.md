---
branch: docs/register-14-pro
date: 2026-11-21
pr: the owner's iPhone 14 Pro is registered on the team and listed in docs/status.md
title: second device registered
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: second device registered

## Core (mandatory)

| Dimension | Measure               | This step                                                            |
| --------- | --------------------- | -------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                    |
| Quality   | Skipped verifications | No build or install; the owner asked for registration only           |
| Speed     | Wasted time           | ~0                                                                   |
| Autonomy  | Interventions         | 0 (the owner approved this device by UDID)                           |

## Findings

- The device's iOS version was read before recording it (26.3.1), after the 13 Pro Max turned out to be on iOS 18.
  The 14 Pro is the first registered phone that can run Tapiro. Tag `device-os-below-target`.
