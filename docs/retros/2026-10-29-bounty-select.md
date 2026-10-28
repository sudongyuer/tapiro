---
branch: feat/bounty-select
date: 2026-10-29
pr:
status: running
---

# Retro: bounty step 5, applicant selection

Started overnight 2026-10-28 with the user's advance approval of every recommendation (questions 45B, 46A–54A).

## Candidates

1. Task 3 review: the spec was marked ❌ for the haptic ticks, but the code matched the chosen option. The controller had
   summarised option 50A in the spec row as "four light ticks" when the option reads Light, Light, Medium, Medium. Tag
   `lossy-summary`. Cost: one review round spent on a non-defect. Candidate: copy the chosen option's text into the spec
   row instead of paraphrasing it.
2. Task 5 found a Task 4 bug the Task 4 tests missed: `useApplicants` spread the snapshot's `select` state and then
   overwrote it with the `select()` function of the same name. The controller tests covered the store, not the hook's
   returned object. Tag `untested-seam`. Candidate: a hook test asserting the returned shape.
3. Two agents shared the one verify Simulator: Task 3's `verify:build` and a manual launch disturbed another agent's
   case run, which first failed with the wrong scene on screen. Tag `shared-simulator`. Landed as working practice:
   only one Simulator-using agent at a time until the runner owns several Simulators.
4. Task 7's report said `bun test` passed 532; the full suite is 971. The controller reran it. Tag `report-accuracy`.
   The habit of checking result files and counts at the controller holds; no new rule.
5. Task 7's report claimed a story-map device line it never wrote; the re-review caught it with a grep. Tag
   `report-accuracy` (second this step, with item 4). Candidate: the report template lists each claimed doc edit with
   its file:line so the reviewer checks it mechanically.
