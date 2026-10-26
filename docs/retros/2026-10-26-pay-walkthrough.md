---
branch: fix/pay-walkthrough
date: 2026-10-26
pr: 10
status: complete before merge
---

# Retro: payment walkthrough fixes

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                                    |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | 4 from the walkthrough (button affordance, empty middle, slot order, sheet title); recheck passed ("OK通过") |
| Quality   | Checks that could not fail (vacuous)                          | pending review                                                                                               |
| Quality   | Skipped verifications / open device checks / new known limits | pending                                                                                                      |
| Speed     | Wall-clock first commit to PR; budget vs actual               | pending                                                                                                      |
| Speed     | Wasted time by class                                          | ~10 min: the Simulator window stayed behind a full-screen terminal (`sim-hidden`)                            |
| Speed     | Rework rounds                                                 | pending                                                                                                      |
| Autonomy  | Avoidable interventions                                       | 2: the user asked where the Simulator was and where to tap 「已收到」                                        |
| Autonomy  | Rulings made / overturned                                     | panel converge values reuse the flight's X curve (brief)                                                     |
| Loop      | Minutes spent on this retro                                   | ~5                                                                                                           |

## Candidates

1. All four findings passed every UI case: cases found the button by identifier, so a control that does not look
   tappable still passes. Tag `affordance-by-id`. Candidate for the review checklist: a screen's main action is
   checked as the primary button style and position (bottom, filled), not only by identifier. If it recurs, a UI
   assertion helper `assert_primary(ui, id)` (bottom third, filled background by pixel sample).
2. Slot order: the celebration (decided first) put the new sticker after the old ones; the book (decided later)
   put newest first. Two canvas decisions on related screens were not cross-checked. Candidate for the brief
   template: when a decision touches a screen already decided, list what it must agree with.
3. Walkthrough setup: I launched the Simulator without checking it was visible and gave tap instructions for a
   state the user could not see. Before handing a walkthrough over, take a screenshot of the screen the user will
   see and name the exact element to tap. Tag `walkthrough-handoff`.

4. The first `--affected --dark` run: 31 pass, 65 fail; from `home_three_cards` on nearly every case failed with
   `Missing home-scroll`, `describe-ui` timeouts or an empty axe error. During the run an `agent-device`
   `xcodebuild test-without-building` from another session was attached to the `Tapiro Verify` Simulator
   (destination id `1F1AA09D…`); it later moved to another device. Tag `sim-contention`. The runner's machine lock
   only covers our runner, not other tools. Candidate: the runner checks for foreign `xcodebuild`/`agent-device`
   processes targeting its UDID before each case and fails fast with that cause; the rerun decides the fixes.

   Follow-up: load average stayed 280–420 for hours (another project's Simulator app and Spotlight indexing). The
   dark payment run failed `pay_sheet_cash` (`describe-ui` timeout after 20 s) and `sticker_book` (missing cell);
   the rerun passed both in dark and `sticker_book` in light, while `pay_sheet_cash` light timed out again (it
   passed in the implementer's light run). Every failure was a timeout or a missing element at load > 280, none
   reproduced at a stable point. Tag `axe-timeout-under-load`. Candidate: the runner records load average per case
   in `result.json` and refuses to start a matrix above a threshold, so a run on a saturated machine fails fast
   with that cause instead of producing 65 false failures.

5. The user asked "为什么老在让我运行某个命令？". I answered from the settings file (`defaultMode: auto`, no project
   allowlist) and blamed missing allow rules, but the session runs in bypass-permissions mode, which the user then
   pointed out; the implementer transcript shows no denied or rejected calls. I diagnosed before finding out what
   the user actually saw. Tag `diagnosis-without-evidence`. Rule for myself: when the user reports something on
   their screen, ask for the text or a screenshot before naming a cause. Root cause of the prompts: open.

## Rules and skills

- Helped: drawing the four fixes on the canvas with the current state beside each option; one-round decision.
- Violated: none recorded yet.

## Kept (worked well)

- The walkthrough found what 256 green UI runs could not; keep it after every milestone.
