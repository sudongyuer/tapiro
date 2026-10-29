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
4. Task 7's first pinned-area fix reserved space with an empty `safeAreaBar` and left the buttons as RN views on top;
   the case passed, but the controller's screenshot review found no bottom edge effect and the failure line over a row.
   Putting the real buttons in the bar (`PinnedBar` + `RNHostView`) fixed both on the first build. Tag `native-effect`.
   Candidate: a system effect is checked in the screenshot, not inferred from a passing assertion.
5. The applicant-list cases failed on the first three-Simulator run (axe 20 s timeouts, a 12 s touch that missed the
   hold) with load average 124 while two Simulators booted. Tags `outside-load`, `screenshot-timeout` (second, after
   item 2 and Task 8's `bounty_select`). Candidate: the runner waits for load to settle after booting extra Simulators
   before handing out jobs.
6. `bounty_select` times out on its `02-sending` screenshot (`simctl io screenshot` > 20 s while the clip records) on
   every run on this branch at load 10–40, and identically with `ApplicantsScreen` and `applicantsView` restored to
   `origin/main` (controller A/B, same build otherwise). Not caused by step 6; the other three applicant cases pass on one
   Simulator. Tag `screenshot-timeout`. Open: find what in the hold's busy state stalls the screenshot (measure first).
