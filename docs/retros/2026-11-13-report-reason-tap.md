---
branch: fix/report-reason-tap
date: 2026-11-13
pr: measure the report sheets' missed reason tap before changing the case; find why a local functions serve kept failing
title: The reason tap was not the picker (0 of 45 missed); the serve failure was a workdir recreated at the same path, not the CLI
escaped: 0
rework: 0
interventions: 0
overturned: 1
---

# Retro: report reason tap and local functions serve (2026-11-13)

Follow-ups to `2026-11-13-verify-full-cases` (still open 2) and `2026-11-13-ask-provider` (#3).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                           |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0; no app bug found                                                                                                 |
| Quality   | Vacuous checks          | 0; no case changed                                                                                                  |
| Quality   | Skipped verifications   | `profile_report_review` ran in zh-Hans only (its en and ms are milestone runs); dark not run, nothing drawn changed |
| Speed     | Wall-clock              | About 2 h; 40 min on the serve failure, about 1 h of Simulator time                                                 |
| Autonomy  | Avoidable interventions | 0                                                                                                                   |
| Loop      | Minutes on this retro   | 10                                                                                                                  |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Root cause class | Change and layer                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `functions serve` failed with 「failed to copy edge runtime main service into container: destination "…:/" must be a directory」 on every start after the first. The Docker Desktop log shows the CLI's `HEAD …/archive` failing with `error while creating mount source path …/stack/work/supabase/functions: no such file or directory`: the agent's script had deleted and recreated the workdir at the same path, and Docker Desktop's file share kept the deleted directory cached. Reproduced 3 of 3 here; one `docker run -v <path>` refreshed it and serve worked at once. The ask-provider retro blamed CLI 2.122.1 (overturned) | environment      | AGENTS.md pitfall (rule): the failing workdir came from an ad hoc script, so the rule is the guard. `scripts/db-isolated.sh` takes a new `mktemp -d` workdir per run and removes it on exit, which is preventive only: it skips the edge runtime and never serves. Tag `edge-runtime-serve` |
| 2   | `chat_report_message` missed the second reason in 3 of 4 runs; the suspect was SwiftUI dropping instant taps, as measured on toggles. Measured on the row (355 x 50 pt, hit at its centre, nothing above it in the AX tree): 0 misses in 45 taps: 18 instant by label, 5 instant at the point, 18 held 0.2 s, and the case 4 of 4. Two of the misses came on Simulators in the aging window of the input loss; one, 6 min after a boot, stays unexplained                                                                                                                                                                                 | environment      | None in the cases; the measurement is in `verification/ui/README.md` so the next agent does not switch the cases to presses. Tag `axe-input-loss`                                                                                                                                           |
| 3   | The long probe (one tap per trial; the 45 add a first 15-tap probe and the retry after the stall) stalled after at least 20 of its 80 planned taps, 23 min after its Simulator booted ("lost the AXe automation session"); 0 misses before it                                                                                                                                                                                                                                                                                                                                                                                             | environment      | Same class as #2; feeds the runner rule still open in status 0e. Tag `axe-input-loss`                                                                                                                                                                                                       |

## Follow-ups

- The runner rule for lost inputs (status 0e) is still the fix for the remaining misses.
- Supabase CLI 3.x needs the `[inbucket]` block in `supabase/config.toml` changed first; nothing here needs 3.x.
