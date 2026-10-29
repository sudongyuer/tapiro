---
branch: feat/bounty-status
date: 2026-10-29
pr: step 6
status: complete
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
6. `bounty_select` timed out on its `02-sending` screenshot on every run, identically with the applicant screen restored
   to `origin/main`; later `bounty_detail_outcome`, `bounty_select_race` and `bounty_detail` timed out too (screenshot,
   swipe), all on `Tapiro Verify` (1F1AA09D). On `Tapiro Verify 2` all four passed at once; idle screenshots on the
   stuck device took 0.2 s, so it stalls only under a run. The A/B blamed the code's absence correctly but the device was
   never swapped, costing about an hour across Task 8, Task 9 and the controller. Tags `screenshot-timeout` (third),
   `sick-simulator`. Candidate: the runner's breaker, on two command timeouts on one device, shuts that Simulator down,
   reboots it, and retries the run once on another device, reporting which device stalled.

7. CI failed once on `statusCopy.test.ts`: a literal pinned the local ICU's space in 「10月31日 周六」; CI's ICU writes
   「10月31日周六」. Fixed with a pattern; no other test pins date-weekday spacing (rg). Tag `icu-literal`, first time.
   Candidate: tests compare formatted dates by pattern, not literal; recorded only.

## Outcome

- Quality: four defects found by screenshot review or worst-case data rather than by assertions (pinned area cutting the
  list, no bottom edge effect with the failure line over a row, times without a day, late counts in thousands of
  minutes); all fixed with checks that can fail.
- Time: about an hour went to one stuck Simulator (item 6), read three times as outside load or a known issue.
- Interventions: none from the user after 「按推荐」; every task ran from the plan.

## Actions

| Candidate          | Layer  | Action                                                                                                                                                               |
| ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6 `sick-simulator` | runner | Follow-up: on two command timeouts on one device, reboot it and retry the run once on another device, naming the device in the report. Open as an issue with the PR. |
| 5 `outside-load`   | runner | Folded into 6: a device swap also covers the boot-time load spike.                                                                                                   |
| 4 `native-effect`  | review | Kept as practice: the controller opens the screenshot of every native effect; no rule, it held this time.                                                            |
| 1 `untested-seam`  | brief  | Second occurrence: a brief for two tasks sharing a new contract includes one consumer-side test. Recorded here; promote to AGENTS.md on a third.                     |
| 3 `prep-gap`       | prep   | Preparation maps every drawn card to the field that feeds it; first occurrence, recorded only.                                                                       |
| 2 `case-authoring` | none   | Normal authoring churn.                                                                                                                                              |
