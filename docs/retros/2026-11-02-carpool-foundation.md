---
branch: feat/carpool-foundation
date: 2026-11-02
pr: https://github.com/sudongyuer/tapiro/pull/48
title: carpool steps 1–3
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: carpool steps 1–3 (shared modules, schema, nearby_rides)

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                     |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review                                       | 0 so far (no review yet)                                                                      |
| Quality   | Checks that could not fail (vacuous)                          | 0; one pgTAP placeholder that could not fail was deleted before the first run                 |
| Quality   | Skipped verifications / open device checks / new known limits | `verify:smoke` (no screen changed), `test:stack` (Edge runtime); 3 known limits in the spec   |
| Quality   | Acceptance criteria with no covering test and no device mark  | UI halves of every `ride.*` criterion (steps 4–6), marked `ui` + gap                          |
| Speed     | Wall-clock from first commit to PR                            | 0.5 h of commits (`retro-metrics.py`); most time went into reading the spec and the built SQL |
| Speed     | Wasted time by class                                          | ~10 min tooling (isolated stack ports), ~10 min test bugs (below)                             |
| Speed     | Rework rounds                                                 | 0                                                                                             |
| Autonomy  | Avoidable interventions                                       | 0                                                                                             |
| Autonomy  | Rulings made / overturned                                     | 9 (spec Implementation Record, Deviations) / 0                                                |
| Loop      | Minutes spent on this retro                                   | ~5                                                                                            |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                                                                                                                                                                              | Cost           | Root cause class           | Change and layer                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `supabase-shared-stack`: the only local stack (`project_id = "tapiro"`) is shared by every worktree; `db reset` there wipes local data (incident in `2026-10-26-settle-celebration.md`). Ran an isolated stack from a scratch copy of `config.toml`; the first port offset (553xx) hit the `tapiro` Kong on 55321                                                                                                          | ~10 min        | missing tooling            | Candidate: a `scripts/db-isolated.sh <name>` that writes the scratch config with free ports and runs reset + test. Second occurrence → script                                                                                                                             |
| 2   | `check:size` failed at the end on a 507-line migration; the plan's per-task check list omitted it                                                                                                                                                                                                                                                                                                                          | ~3 min         | brief missing a constraint | Plan template for SQL steps lists `check:size`; recorded here                                                                                                                                                                                                             |
| 3   | pgTAP `ok(f() between a and b)` evaluated a volatile RPC twice and logged an extra event                                                                                                                                                                                                                                                                                                                                   | ~3 min         | test bug                   | Capture an RPC result in a temp table before comparing; note for the pgTAP style line                                                                                                                                                                                     |
| 4   | Distance expectation ignored that rides are ordered by the snapped point (two rides tied)                                                                                                                                                                                                                                                                                                                                  | ~2 min         | test bug                   | none; the rule is in the spec record                                                                                                                                                                                                                                      |
| 5   | Existing `stickers.test.sql` used ride payments as a generic second kind; the per-ride sticker rule (change 30) broke 11 assertions                                                                                                                                                                                                                                                                                        | ~5 min         | as designed                | Fixtures moved to bounty payments; ride branch tested in `ride_settle.test.sql`                                                                                                                                                                                           |
| 6   | Independent review of PR 48 found 7 defects: appeal window shut by 到了, earlier revised time, no-show/appealed and past applicants seeing private rows, a sticker for a ride without riders, payment→ride vs ride→payment lock order, late 出发 replay. My pgTAP tested each transition in its happy phase but not adversarial sequences (organiser acting fast to cut a window) or who loses access after a state change | 1 rework round | implementation bug         | `ride_review.test.sql` covers each sequence. Candidate for the SQL plan template: for every time window and every visibility rule, one case that tries to close it early and one that checks access after leaving the qualifying state; lock order named once per feature |

## Candidates (first occurrence, not yet generalised)

- Isolated local Supabase per worktree (item 1).
- `between` over a volatile call in pgTAP (item 3).

## Rules and skills

- Helped: AGENTS.md Data integrity (replay answers the first outcome) shaped every RPC; the bounty plans' typed slugs.
- Unused: none.
- Violated: none.

## Kept (worked well)

- One migration and one pgTAP file per task; each file passed within one or two runs.
