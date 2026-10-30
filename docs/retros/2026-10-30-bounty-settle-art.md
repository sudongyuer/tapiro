---
branch: feat/bounty-settle-art
date: 2026-10-30
pr: bounty step 7
title: 7 settlement art
escaped: 0
rework: 2
interventions: 1
overturned: 0
---

# Retro: bounty step 7, the payer's sticker and 「一起办成的事」

## Core (mandatory)

| Dimension | Measure                                                                                      | This step                                                                                                                                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review (found in walkthrough, CI, after merge)                              | Pending the user's review and walkthrough                                                                                                                                                                                                                  |
| Quality   | Checks that could not fail (vacuous)                                                         | 0. The first draft of `home_settled_collect` measured the card by colour and could not tell the green 已结清 card from the cream calm card that replaced it; it failed rather than passed, and now measures the dark 「收进贴纸本」 button against frame 0 |
| Quality   | Skipped verifications / open device checks / new known limits                                | Device: landing haptic, VoiceOver announcement, Release feel (`pay.settle.payer-collect-feel`). Reduce Motion runs through `-uiVerifyReduceMotion 1`, not the system switch                                                                                |
| Quality   | Acceptance criteria with no covering test and no device mark                                 | 0; `rep.sticker-book.celebration-title` moved from a gap to `pay_first_settle` and `pay_settle_routine`                                                                                                                                                    |
| Speed     | Wall-clock from first commit to PR; budget vs actual                                         | Plan committed 2026-10-29 10:00; Tasks 1–8 the same day; the Task 8 batch took about 15 min of Simulator time (21 + 2 + 5 + 1 runs, plus 2 reruns)                                                                                                         |
| Speed     | Wasted time by class: outside interference, dead-end debugging, rework, waiting on decisions | About 20 min of case authoring for `home_settled_collect` (5 runs to a measure that holds); no outside interference, 0 command timeouts, no stalled Simulator                                                                                              |
| Speed     | Rework rounds (review → fix cycles)                                                          | 1: the batch found three defects in cases written but not run by Tasks 4 and 6                                                                                                                                                                             |
| Autonomy  | Avoidable interventions                                                                      | 0                                                                                                                                                                                                                                                          |
| Autonomy  | Rulings made / overturned                                                                    | 8 plan rulings, 4 dated deviations, 68A–74A taken overnight on ★; overturned: pending review                                                                                                                                                               |
| Loop      | Minutes spent on this retro                                                                  | 10                                                                                                                                                                                                                                                         |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                | Cost                               | Root cause class    | Change and layer                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `home_settled_card` (Task 6) failed three ways on its first run: no `-uiVerifyShellFeed none`, so the default feed put 欠钱 in front; `ui.settled` given a list; tapping the strip by id hit the 欠钱 card in front and opened the pay sheet | One rerun round                    | wrong process order | The plan said "write; do not run" for Tasks 4 and 6, against Pace ("each new case is run once by its author"). Candidate below     |
| 2   | `pay_settle_routine` matched the book cell's VoiceOver label by its title, but Task 4 put line 1 (「帮小林」) first                                                                                                                          | One rerun                          | wrong process order | Same as 1: a copy change to a shared label did not run the cases that read it. Fixed to build the label from `stickers.label.a11y` |
| 3   | `home_settled_card`'s relaunches dropped arguments that were not in the launch list, so `-uiVerifySettled` was passed twice                                                                                                                  | Found while fixing 1               | test bug            | Relaunches now drop slices of `ARGS`                                                                                               |
| 4   | `home_settled_collect`'s first measures: a colour band that matched the calm card too, and a 「leaving」 time taken from the press dim at the tap                                                                                            | 5 authoring runs                   | test bug            | Measure the dark button against frame 0 and take the last frame the card is still whole; kept in the case                          |
| 5   | The owner tried the flight on the Simulator and found it flat: a 78 pt sticker shrinking to a dot, no reaction at 我的, a blank card between the two settled cards                                                                           | One redesign round and one rebuild | missing knowledge   | Q73 offered motion as text options; the owner chose only after an interactive canvas board. Candidate `motion-unseen` below        |

## Candidates (first occurrence, not yet generalised)

- `motion-unseen`: a motion question answered from text options was overturned once seen. Next time, motion options
  are drawn as an interactive canvas board (one artboard, options as pills, replay and ×4 slow) before the task starts.

- `unrun-case`: case bugs written in Tasks 4 and 6 surfaced only in the batch (one fix round, three bugs in
  `home_settled_card`). This is the cost the user chose on 2026-10-29 (「每次做完一个比较大的feature再验证」), traded
  for no per-task Simulator time; it stays. Cheaper mitigation for next time: a task that writes a case also runs
  `python3 -m py_compile` and checks its launch arguments against the fixture parsers, so only real UI behaviour
  is left for the batch.
- Peeks: tapping `live-card-peek-*` by id lands on the front card whenever the front card is taller than the strip;
  `home_bounty_cards` already taps the strip's bottom edge. Second time this tap missed (step 6 retro item 2). Candidate:
  a `tap_peek(ui, index)` helper in `driver.py`.

## Rules and skills

- Helped: Pace's selection by what changed (21 cases instead of the 72-case suite); `recording.clip` + `frames` for the
  flight timing; `-uiVerifySettledCollected` made "exactly one collect" a one-line assertion.
- Unused: the runner's self-heal (no stall).
- Violated: Pace's "run once by its author", by the plan's own instruction (item 1).

## Kept (worked well)

- The kit owns the landing haptic and the Reduce Motion fade; JS only orders collect → flight → card exit → dismiss,
  which is a pure function with five unit tests.
- One background batch per locale or look, three Simulators, no timeouts.

- `vacuous-check` (third, after the multi-currency retro items 4 and 8): the controller's screenshot review found
  line 1 of a payer label truncated to 「Nurul Aisyah…」, losing 「帮我」, so the label no longer said who helped whom.
  `sticker_book_labels` passed because it compares line heights and VoiceOver text, not what is drawn. Fixed with
  middle truncation (「Nurul…ah帮我」); rerun and screenshot confirmed. Third occurrence: the
  `ios-ui-verify` skill should say that truncation and overlap need an OCR or pixel check on the drawn text; that is
  cross-project, so it is put to the user.
