---
branch: fix/asc-upload-status
date: 2026-11-20
pr: bun run testflight waits for Apple's processing and fails with Apple's error codes
title: a failed upload looked like a slow one
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: App Store Connect upload status

## Core (mandatory)

| Dimension | Measure               | This step                                                                             |
| --------- | --------------------- | ------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                     |
| Quality   | Skipped verifications | None; the status script read FAILED with 90683 for 1136 and COMPLETE for 1227         |
| Speed     | Wasted time           | ~5 min (lint `no-undef` on `Buffer` in an `.mjs` script; imported from `node:buffer`) |
| Autonomy  | Interventions         | 0                                                                                     |

## Findings

- Follows `2026-11-20-photo-purpose-string`: the rejected build was visible all along through
  `/v1/apps/{id}/buildUploads`, which my first queries did not try. Now the script reports it within the run that
  uploaded the build. Tag `asc-failed-upload-invisible`.
