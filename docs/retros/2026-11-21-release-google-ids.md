---
branch: feat/release-google-ids
date: 2026-11-21
pr: release builds carry the Google client IDs and register the reversed iOS client ID; the archive check proves it
title: Google client IDs in release builds
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: Google client IDs in release builds

## Core (mandatory)

| Dimension | Measure               | This step                                                                                       |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                               |
| Quality   | Skipped verifications | `verify:smoke`: no app code changed. A real Google sign-in on a phone waits on an iOS 26 device |
| Speed     | Wasted time           | ~0                                                                                              |
| Autonomy  | Interventions         | 0                                                                                               |

## Findings

- `EXPO_NO_DOTENV=1` keeps `.env` out of release builds, so values a release needs must live in `scripts/release-env.sh`.
  The Google IDs were the second such value after the Supabase URL; both now sit there with env overrides.
- The app turns Google off when the reversed iOS client ID is not among `registeredUrlSchemes()`, and the scheme only
  exists if the ID was in the environment at prebuild. A release could silently ship with Google off; `check_bundle`
  now fails unless the built `Info.plist` registers the scheme and the bundle carries the ID. Tag `release-config-silent-off`.
