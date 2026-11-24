---
branch: chore/owner-blockers
date: 2026-11-25
topic: owner-blockers-probe
---

# Retro: owner blockers probe

Escalates `stale-external-state` from `2026-11-25-stale-blocker-status.md`.

| #   | What happened                                                                                                                                                                         | Class                | Fix                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `docs/status.md` and `docs/story-map.md` still said APNs, Model Studio and the Paid Apps agreement waited on the owner, days after hosted data and App Store Connect showed them done | stale-external-state | `scripts/owner-blockers.mjs` probes hosted secrets, `push_queue`, `ai_metering` and the IAP products live; AGENTS.md asks reports to quote it. Agreements have no API and print as CHECK |
| 2   | PR 246's `supabase` job failed on the runner (`54322` address already in use) while this branch waited to start                                                                       | CI infra             | Reported to the main session, which reran it; no change                                                                                                                                  |

- Escaped defects: 0. Rework rounds: 0. Wasted time: ~10 min waiting on #246's rerun. Avoidable interventions: 0.
