---
branch: feat/owner-decisions-1105
date: 2026-11-05
pr: owner decisions 2026-11-05
title: quiet hours for the bounty you are on, expiry to pending applicants, report snapshot retention, carpool record
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: owner decisions 2026-11-05

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                  |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                    |
| Quality   | Vacuous checks          | 0: each new pgTAP file was run against the old function bodies; 9 of 23 assertions fail there, the rest are guards against over-broad rules |
| Quality   | Skipped verifications   | The new `live_detail_expired` case is written, not run (another session owned the Simulators; it runs at the live milestone) |
| Speed     | Wall-clock              | About 2 h, mostly reading the four migrations the decisions touch                                           |
| Autonomy  | Avoidable interventions | 0                                                                                                          |
| Loop      | Minutes on this retro   | 5                                                                                                          |

## Problems and root causes

| #   | What happened | Root cause class | Change and layer |
| --- | ------------- | ---------------- | ---------------- |
| 1   | A status-only quiet-hours rule would hold 「取消了」 for a helper already on the way: when the push is queued the bounty is already `cancelled` | design gap | Code: `private.on_active_bounty` also exempts the transition that leaves `en_route` or `done`; recorded as a ★ default |
| 2   | The first "latest event" rule exempted confirmed bounties forever (their last event leaves `done`) | logic slip, caught by reading the existing `live_push` quiet-hours case | Code: status `en_route`, `done`, `disputed`, or a `cancelled` event from `en_route`; no ordering dependency; tests assert a confirmed bounty's thread is held |
| 3   | Live-reloading the detail alone would not have changed what an applicant sees: a pending application on a closed bounty still rendered 已申请 | hidden UI dependency | Code: `detailAction` returns `closed` for a pending application on a bounty that is not open; unit test |
| 4   | `rides_schema.test.sql` test 39 fails on the local database seeded by `db:test-accounts` (it counts every `ride_events` row) | test assumes an empty database | Listed, not changed here: CI runs on a fresh database; the test could count only its own fixtures |
| 5   | The spec checker rejected `## Implementation Record (2026-11-05, milestone and walkthrough)` | heading format | None needed: the checker already catches it (`check-specs.mjs` RECORD_HEADING) |

## Review findings

One round, 0 Critical, 1 Important, 8 Minor; all fixed in the same round.

- Important: the detail's live reload had only unit tests. Added the fixture mode `expiresLive` (first detail load open,
  later loads closed, unit-tested) and the case `verification/ui/cases/live_detail_expired.py`. Lesson: a hook wired to
  live signals needs a UI case even when its predicate is pure; the existing `live_*` cases were the template.
- Minor: clearer quiet-hours predicate; `taken` before the pending branch; two chat assertions (disputed sent, after a
  cancel held); a redundant assertion removed; stale plan and spec lines; PR list without #52.
- Not fixed (pre-existing): a cached board row can flash 已申请 on an expired bounty until the detail load returns.
