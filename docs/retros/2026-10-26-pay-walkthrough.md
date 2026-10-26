---
branch: fix/pay-walkthrough
date: 2026-10-26
pr: not opened yet
status: running
---

# Retro: payment walkthrough fixes

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                         |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | 4 from the walkthrough (button affordance, empty middle, slot order, sheet title) |
| Quality   | Checks that could not fail (vacuous)                          | pending review                                                                    |
| Quality   | Skipped verifications / open device checks / new known limits | pending                                                                           |
| Speed     | Wall-clock first commit to PR; budget vs actual               | pending                                                                           |
| Speed     | Wasted time by class                                          | ~10 min: the Simulator window stayed behind a full-screen terminal (`sim-hidden`) |
| Speed     | Rework rounds                                                 | pending                                                                           |
| Autonomy  | Avoidable interventions                                       | 2: the user asked where the Simulator was and where to tap 「已收到」             |
| Autonomy  | Rulings made / overturned                                     | panel converge values reuse the flight's X curve (brief)                          |
| Loop      | Minutes spent on this retro                                   | ~5                                                                                |

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

## Rules and skills

- Helped: drawing the four fixes on the canvas with the current state beside each option; one-round decision.
- Violated: none recorded yet.

## Kept (worked well)

- The walkthrough found what 256 green UI runs could not; keep it after every milestone.
