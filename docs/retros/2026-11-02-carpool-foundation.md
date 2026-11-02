---
branch: feat/carpool-foundation
date: 2026-11-02
pr: not opened yet
title: carpool steps 1–3
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: carpool steps 1–3 (shared modules, schema, nearby_rides)

## Candidates (running)

1. `supabase-shared-stack` — the only local stack (`project_id = "tapiro"`) is shared by every worktree and session;
   `supabase db reset` there wipes local data (incident in `2026-10-26-settle-celebration.md`) and would apply this
   branch's migrations under other sessions. Worked around with an isolated stack from a scratch copy of
   `config.toml` (`project_id = "tapiro-carpool"`). Cost ~10 min: the first offset (553xx) collided with the
   `tapiro` stack's Kong on 55321; 567xx was free. Class: missing tooling.
