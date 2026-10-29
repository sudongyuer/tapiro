---
branch: chore/integration-env
date: 2026-10-30
pr: integration tests take the local URL from the environment
title: integration tests and the local port
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: integration tests and the local port

- Why: in the multi-currency work the integration tests could not reach the local gateway. 54321 is held by another
  app, so the gateway listens on 55321 while `supabase status` reports 54321. It was worked around with a PATH
  wrapper in the scratchpad (`docs/retros/2026-10-29-multi-currency.md` item 3).
- Change: one helper, `scripts/local-supabase.ts`, replaces five copies of the `supabase status` parser. It takes
  `SUPABASE_LOCAL_*` overrides first, and the README names them.
- Check: the payment, post and account-delete integration tests pass (15) with `SUPABASE_LOCAL_API_URL` pointing at
  55321, with no wrapper.
- Process: the PR hook checks for a retro before the whole command runs, so a combined "write retro, commit, open PR"
  command was blocked and wrote nothing. Commit the retro in its own step first.
