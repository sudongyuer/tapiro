---
branch: feat/testflight
date: 2026-11-20
pr: scripts/testflight.sh uploads a Release build against the hosted Supabase project; scripts/device-install.sh puts the same build on a cabled iPhone
title: first TestFlight upload
escaped: 0
rework: 2
interventions: 1
overturned: 0
---

# Retro: first TestFlight upload

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                  |
| --------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                                          |
| Quality   | Skipped verifications | `verify:smoke`: no screen or JS changed. A device run of the installed build waits on the owner's hands    |
| Speed     | Wasted time           | ~15 min: two archive runs that failed on signing, a rebase onto #189 that landed while the branch was open |
| Autonomy  | Interventions         | 1 (registering the owner's iPhone, an account change the owner must approve)                               |

## Findings

- Automatic signing archives with a development profile, and Apple will not make one for a team with no registered
  devices (「Your team has no devices from which to generate a provisioning profile」). Forcing `Apple Distribution`
  under automatic signing is rejected as a conflict. The fix was one registered device, not a different signing route.
  A new team needs a device before its first archive; `scripts/testflight.sh` names this in its failure output via the
  xcodebuild error. Tag `signing-no-device`.
- The branch started from `2da3997a` while #189 (real sign-in, `appleTeamId`, `usesAppleSignIn`) was merging; the first
  report called sign-in missing from a stale base. Fetch `origin/main` before reporting a gap in code another agent may
  own. Tag `stale-base`.
- The anon key is fetched by the Supabase CLI at build time and filtered with jq to the `anon` entry, so no key lands
  in the repo and none of the service keys is printed. `EXPO_NO_DOTENV=1` keeps a developer's `.env.local` (local stack,
  verify mode) out of a release bundle; the script checks the bundle for the hosted URL and against a local one.
- The owner's registered iPhone 13 Pro Max runs iOS 18.7.8, below the iOS 26.0 deployment target; xcodebuild found it
  only as an ineligible destination. `scripts/device-install.sh` now reads the paired device's iOS version from
  `devicectl` before building and builds for `generic/platform=iOS`, so the reason is one line, not an xcodebuild
  destination dump. A device's OS should be checked when it is offered for testing. Tag `device-os-below-target`.
- The worktree guard refuses commands that mention git inside compound shell lines (`.gitignore` in a `sed`, a
  `bash script` whose body runs git). Plain single commands and running scripts by path passed. Tag `worktree-guard`.
