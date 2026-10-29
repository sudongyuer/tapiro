---
branch: feat/bounty-status
date: 2026-10-29
pr: step 6
status: running
---

# Retro: bounty step 6, status screens and the live source

## Candidates

1. Task 3 and Task 4 ran in parallel against a contract one of them was writing. The seam broke in one place: Task 4's
   `markSeen` resolved on failure while home retries only on a rejection. Caught by Task 3 reading Task 4's file; fixed
   by the controller. Tag `untested-seam` (second, after step 5 item 2). Candidate: when two tasks share a new
   contract, the first task's brief includes one test on the consumer side of the seam.
2. `home_bounty_cards` failed three times while it was written (a short wait for the seen mark, a toggle off screen, a
   peek tap landing on the front card) and once on an `axe` timeout with load average 191 from another project's
   Simulator and Spotlight. Tags `case-authoring`, `outside-load`. The outside cause was in the log; no rule.
3. Two 9A rows had no server source (helper 「等对方付款」 at `confirmed`, applicant 「这单过期了」). Found by Task 4, not
   during preparation. Tag `prep-gap`. Candidate: preparation maps every drawn card or state to the field that feeds it.
