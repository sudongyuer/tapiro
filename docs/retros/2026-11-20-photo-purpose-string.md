---
branch: fix/photo-purpose-string
date: 2026-11-20
pr: the photo library purpose string ships in all three languages; release builds check every purpose string before upload
title: App Store processing rejected build 20261120.1136 (ITMS-90683)
escaped: 1
rework: 0
interventions: 1
overturned: 0
---

# Retro: photo purpose string

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                    |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 1: the first TestFlight build failed Apple's processing (ITMS-90683, `NSPhotoLibraryUsageDescription`)       |
| Quality   | Skipped verifications | None; the new check ran against the rejected archive and failed on exactly Apple's finding                   |
| Speed     | Wasted time           | ~40 min: one upload and the wait for a build that never listed                                               |
| Autonomy  | Interventions         | 1 (the owner read the failure in App Store Connect; the API's builds list shows nothing for a failed upload) |

## Findings

- Cause: `expo-image-picker` and `expo-media-library` had `photosPermission: false`. Every picker in the app is the
  system picker (`launchImageLibraryAsync`), which needs no permission at runtime, so the string looked unnecessary;
  but the binary links `Photos` (ExpoMediaLibrary, the image picker), and App Store processing requires the purpose
  string for any linked API that could ask, used or not. Tag `purpose-string-static-scan`.
- Guarantee at the lowest layer: `scripts/check-purpose-strings.mjs` reads the built app's linked system frameworks
  (`otool -L` on the app and its embedded frameworks), maps them to the purpose keys Apple requires, and fails when a
  key is missing or empty in `Info.plist` or any `.lproj/InfoPlist.strings`. It runs inside `check_bundle`, so both
  `bun run testflight` and `bun run device-install` stop before upload or install. On the rejected archive it reports
  the four missing entries; a unit test keeps all three native locale files complete for the frameworks we link.
- The App Store Connect API `GET /v1/builds` never lists an upload that failed processing, and `/v1/buildUploads`
  allows no collection read, so a failed upload looked like a slow one. The app's relationship
  `/v1/apps/{id}/buildUploads` does list it, with `state.state` (`PROCESSING`, `FAILED`, `COMPLETE`) and Apple's error
  codes. `scripts/asc-upload-status.mjs` reads it, and `bun run testflight` now waits on it after the upload and fails
  on `FAILED` with Apple's message (follow-up PR `fix/asc-upload-status`). Tag `asc-failed-upload-invisible`.
