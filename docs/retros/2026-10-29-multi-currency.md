---
branch: feat/multi-currency
date: 2026-10-29
pr: multi-currency
status: running
---

# Retro: money in any currency

## Candidates

1. Task 1's first money tests failed three times: a writing function (`open_payment`, `confirm_bounty`) was called
   inside a `WHERE` subquery of the statement that read its result, so the snapshot could not see the inserted row.
   Fixed by storing the result first. Tag `pgtap-snapshot`. Candidate: a pgTAP note in `supabase/README.md`.
2. Task 1 first wrote one 1081-line migration against the 500-line limit; split into three on review. Tag
   `size-limit`. Candidate: a check that fails on files over 500 lines (migrations included), so review does not have
   to catch it.
3. The account-delete integration test could not reach the gateway: `supabase status` reports 54321 while the gateway
   listens on 55321 (54321 is taken by another app). Worked around with a PATH wrapper, nothing committed. Tag
   `local-port`. Candidate: let the test read `SUPABASE_URL` from the environment before `supabase status`.
