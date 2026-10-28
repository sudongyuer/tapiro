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
6. Task 8: two failures while writing `bounty_detail_outcome`. `bun test` hit an unhandled `Unexpected typeof` from
   react-native because `./exactAddress` resolved to the new `ExactAddress.tsx` on the case-insensitive disk; renamed the
   component file to `AddressSection.tsx`. Then 看看附近别的悬赏 scrolled the home about 54 pt short of the top: the scroll
   ran while the detail still covered the board, and the large title expanded on appear. The top request now waits for
   the board's `transitionEnd`. Tags `case-insensitive-path`, `scroll-before-appear`. Candidate: a lint rule that rejects
   two files in one folder whose names differ only by case.
7. Task 9: the first dark run of `bounty_applicants_worst` failed because OCR did not read the secondary-label tier
   text (貘友) on the dark grouped background, while the light run read it. The tier was on screen. The case now proves
   the one-line name by the position of the 帮过 line, which OCR reads in both appearances, and reads the tier in light
   only. Tag `ocr-dark-secondary`. Candidate: a note in `verification/ui/README.md` that OCR on secondary text in dark is
   unreliable, so a case asserts layout through AX frames or a primary-ink line.
