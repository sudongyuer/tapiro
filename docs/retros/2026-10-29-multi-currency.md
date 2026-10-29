---
branch: feat/multi-currency
date: 2026-10-29
pr: multi-currency
title: Money in any currency
status: complete
escaped: 1
rework: 2
interventions: 2
overturned: 0
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
4. The user found the 「第一次收款」 badge drawn under the landed sticker (payment step, unchanged since). The badge
   lived inside the book while the flying sticker stays in a top layer, and `pay_first_settle` only checked the badge's
   label, so it passed with the badge hidden. Fixed by drawing the badge in the top layer, plus a pixel check on the
   overlap that fails on the old screenshot. Tags `vacuous-check`, `layering`. Candidate: an element meant to sit on
   top of another gets a pixel check where they overlap.
5. The user said throughput is too low (「效率还是太低」). Measured from the session's task durations:
   - Simulator runs and reruns took over half of each 25–70 min task.
   - One stalled Simulator cost about an hour.
   - Tasks ran one at a time because each needed the Simulator.
   - The first pinned-bar approach was redone (about 20 min).

   Tags `slow-verify`, `serial-tasks`, `sick-simulator` (fourth). Changes:
   - Tasks write cases and the feature runs them once (AGENTS.md Pace, f7ac024).
   - Disjoint tasks now run in parallel worktrees (Task 5 beside Task 4).
   - The runner reboots a stalled device and retries elsewhere (#22, in progress).
   - A file-size check replaces review for the 500-line rule (in progress).

6. After merging main, `scripts/check-file-size.test.ts` fails 4 of 9 tests only when `bun test` runs from this
   checkout's root: the spawned `git` and `node` return no output. The same file passes 9/9 from another directory,
   in the agent's worktree and in CI. There is no `.env`, preload or shim; cause unknown after a 20-minute time-box.
   Tag `local-env`. Open: rerun on a fresh clone; if it reproduces, pass `cwd: root` and an explicit `env` to the
   test's spawns.
7. The bounty locale files outgrew the new size check on the first merge, as predicted in the self-heal retro;
   split the step-6 sections into `locales/bounty/progress/`. Tag `size-limit` (second).
8. Task 6's break-ui run found the rate footer splitting 「¥1 =」 from 「RM 0.6122」 across lines in ms, while
   `pay_sheet_converted` passed in ms: the label check reads the AX text, which has no line breaks. Fixed with
   non-breaking spaces around 「=」 and a unit test that fails on a plain space in the equation. Tag `vacuous-check`
   (second, after 4). Candidate: a text that must stay on one line gets a unit check on its spaces, not a label check.

## Outcome

- **Numbers**: 16 commits over 2.8 h of commits; 6 tasks; one batch UI run of 45 runs, all passing, no stalled device.
- **Escaped (1)**: the first-payment badge hidden under the sticker, from the payment step, found by the user.
- **Rework (2)**:
  - the 1081-line migration was split;
  - the ms rate footer broke, found by break-ui before the PR.
- **Interventions (2)**:
  - the currency direction, a product choice for the user;
  - 「效率还是太低」, a process correction.
- **Overturned**: none.

## Actions (decided for you)

| Candidate                       | Layer           | Action                                                                                                       |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| 5 `slow-verify`, `serial-tasks` | rule + practice | Tasks write cases and the feature runs them once (AGENTS.md Pace); disjoint tasks run in parallel worktrees  |
| 3, 6 `sick-simulator`           | runner          | #24: a stalled device reboots and the run retries elsewhere                                                  |
| 2, 7 `size-limit`               | CI check        | #24: `check:size` with an allowlist that can only shrink; the bounty locale files were split                 |
| 4, 8 `vacuous-check`            | case            | Pixel checks where layering or wrapping matters; a third occurrence promotes this to the ios-ui-verify skill |
| 1 `pgtap-snapshot`              | none yet        | Recorded; a second occurrence adds a note to `supabase/README.md`                                            |
| 3 `local-port`, 6 `local-env`   | none yet        | Recorded; reproduce on a fresh clone before changing tests                                                   |
