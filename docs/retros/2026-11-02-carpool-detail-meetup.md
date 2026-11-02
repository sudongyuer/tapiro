---
branch: feat/carpool-detail-meetup
date: 2026-11-02
pr: https://github.com/sudongyuer/tapiro/pull/51
title: carpool step 5 (detail and 集合)
escaped: pending
rework: 0
interventions: 0
overturned: pending
---

# Retro: carpool step 5 (ride detail, 集合, boarding and appeals)

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                                                                                         |
| --------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review                                       | pending (no review yet)                                                                                                                                           |
| Quality   | Checks that could not fail (vacuous)                          | 1 caught before commit: an `or True` overlap assertion in `ride_detail_worst` (removed); two un-awaited `rejects` assertions in `detailService.test.ts` (awaited) |
| Quality   | Skipped verifications / open device checks / new known limits | 6 of 8 new ride cases written but not run (Pace: after step 7); device: 打开 Grab and the Apple Maps link                                                         |
| Quality   | Acceptance criteria with no covering test and no device mark  | ride.join.late (the struck-through time has no case yet)                                                                                                          |
| Speed     | Wall-clock from first commit to PR                            | see PR; most time went into reading the boards, the spec's records and the SQL return shapes                                                                      |
| Speed     | Wasted time by class                                          | ~10 min tooling (worktree guard refused compound shell commands again; `node_modules` missing in the worktree)                                                    |
| Speed     | Rework rounds                                                 | 0                                                                                                                                                                 |
| Autonomy  | Avoidable interventions                                       | 0                                                                                                                                                                 |
| Autonomy  | Rulings made / overturned                                     | 10 (spec Implementation Record, step 5 deviations) / pending                                                                                                      |
| Loop      | Minutes spent on this retro                                   | ~5                                                                                                                                                                |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                                                            | Cost                  | Root cause class | Change and layer                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `worktree-sandbox`: the guard refused pipes into `head`, `$PATH` overrides, `rg` inside Python and a headless-Chrome call with a quoted path; each became a scratchpad script                                                                                                                            | ~10 min               | missing tooling  | Second occurrence (step 4 retro #1). Candidate stands: `scripts/run-check.sh <name> <cmd>` writing the log and printing the exit status |
| 2   | `tsc-exhaustive`: the fixture switch missed the `worst` scene; tsc caught it on the first run                                                                                                                                                                                                            | ~1 min                | implementation   | none; the compiler holds it                                                                                                             |
| 3   | `lint-prettier`: the first lint run failed on formatting in 12 new files                                                                                                                                                                                                                                 | ~2 min                | implementation   | none; `prettier --write` on the changed list before lint                                                                                |
| 4   | `check-file-size-worktree`: the 4 known `scripts/check-file-size.test.ts` cases fail inside `.claude/worktrees` only (step 4 retro #5); not chased, per the brief                                                                                                                                        | 0                     | environment      | Recorded; CI passes                                                                                                                     |
| 6   | `sheet-toolbar-id`: SwiftUI toolbar buttons in a sheet expose their id twice, so `axe tap --id` refused; the bounty cases already had a `tap_bar` helper, now copied into `ride.py`, and the 186 A title threshold was the whole ticket, which a short page cannot scroll past; it is now the route line | ~15 min (two UI runs) | known pattern    | Candidate: move `tap_bar` into `driver.py` so every case uses it                                                                        |
| 5   | `vacuous-check`: an assertion ending in `or True` and two un-awaited `expect(...).rejects` would have passed whatever the app did; found while re-reading before commit                                                                                                                                  | ~2 min                | test authoring   | AGENTS already says each assertion must be able to fail; the self-review before commit caught both                                      |

## Candidates (first occurrence, not yet generalised)

- A read RPC per detail screen (`bounty_detail`, now `ride_detail`) that mirrors the table policies in one place made the
  privacy rules testable in pgTAP without a client; worth naming in the plan template for the next feature's detail.
