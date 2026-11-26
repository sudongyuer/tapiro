---
branch: feat/live-activity-push
date: 2026-11-26
pr: Live Activities by push, and the extension in release builds
title: Live Activity push (plan Tasks 6–8) and the extension in release builds
escaped: 0
rework: 4
interventions: 0
overturned: 0
---

# Retro: Live Activity push and the extension in release builds

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                                                                    |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 0                                                                                                                                                            |
| Quality   | Skipped verifications | Device run (plan Task 9: push-to-start, background attach, consent prompt) needs the owner's phone and a TestFlight build; the archive was not uploaded here |
| Speed     | Wasted time           | ~15 min: two pgTAP reruns (regex bound, ambiguous column), one Release archive rerun for the extension's version                                             |
| Autonomy  | Interventions         | 0                                                                                                                                                            |

## Findings

- Postgres regular expressions cap a bound at 255: `{64,400}` compiled only when a row or call reached it, so the
  migration applied and the first insert failed. Length limits now use `char_length` beside `{64,}`.
- `on conflict (token)` inside a PL/pgSQL function whose parameter is also `token` is ambiguous; the existing migrations
  already use `on conflict on constraint <pkey>` for that reason.
- The first archive embedded the extension at `CFBundleShortVersionString` 1.0 while the app ships 1.0.0: the plugin
  copied the app target's `MARKETING_VERSION`, which Expo never sets to the real version (it writes `Info.plist`
  directly). The plugin now uses `config.version`, and `check_bundle` compares both version keys of the app and the
  extension, so the release scripts stop before an upload App Store Connect would flag.
- Design constraint found while reading Apple's docs: a push-started activity wakes the app without a scene, so React
  Native never runs; the update token has to be sent by native code without a session (device key, LP2).

- The review round found two Important gaps, both about where an activity outlives its owner: a push-started activity
  the app had never read was not ended at sign out, and the unregister call needed a session that may have expired.
  Both came from reusing the local-only design (W11, push registration) unchanged for push. Fixed with LP10 and LP12.

## Actions

- Done in this PR (lowest layer): `check_bundle` fails on a missing extension or mismatched versions.
- Candidate for `escalate-correction`: a lint over `supabase/migrations` for regex bounds above 255 and for
  `on conflict (<name>)` where `<name>` is also a parameter; both failed only at run time.
