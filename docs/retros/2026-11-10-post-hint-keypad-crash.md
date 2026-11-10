---
branch: fix/post-hint-keypad-crash
date: 2026-11-10
pr: the unpaid hint with a draft, number pads that never go away, the payee save crash
title: A log line settled the hint bug that a guess had not; the "check flaw" pad was a product defect
escaped: 2
rework: 1
interventions: 0
overturned: 0
---

# Retro: post hint, keypads, payee crash

Follow-up to `2026-11-10-verify-full-round` (queue 0a–0c).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                    |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 2 found in the full run and fixed here: the unpaid hint lost with a draft; a number pad nobody could dismiss |
| Quality   | Vacuous checks          | 1 found: `home_settled_collect` en dark passed its flight check from frame 0; guarded                         |
| Quality   | Skipped verifications   | The payee save crash is not reproduced (0 of 27 saves); no fix shipped, options to the owner                 |
| Speed     | Wall-clock              | About 3 h; about 30 min on crash probes that did not reproduce                                               |
| Autonomy  | Avoidable interventions | 0                                                                                                            |
| Loop      | Minutes on this retro   | 10                                                                                                           |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                 | Root cause class | Change and layer                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The hint bug had a focus-order fix that failed and a second guess (an Alert dropped during a transition) that RN's own alert window rules out; four `console.error` lines in a Release verify build showed the order in one run: answer, tile blur, form focus | wrong diagnosis  | Gate tracks focus per screen; unit tests replay the logged order. Lesson: log the event order before the second hypothesis (`console.error` reaches os_log in Release) |
| 2   | 0c was filed as a check flaw; an A/B on the post form showed a drag never dismissed the pad, so a person was stuck with it too                                                                                                                                 | wrong diagnosis  | Product: pad forms and the place search results dismiss the keyboard on scroll (★ for veto); cases drag as a person would                                           |
| 3   | `interactively` dismissal was tried first; the downward drag it needs closed the whole post sheet in two cases                                                                                                                                                 | own gap          | `immediately`; README notes the sheet pull                                                                                                                          |
| 4   | Steps never reached since iOS 27.2 broke the pad surfaced one by one in `bounty_post_optional`: 38 pt calendar days, AXe keys not autocapitalised, a lazy picker off screen, a 12-hour picker against a 24-hour confirm                                        | stale            | Case updated; four reruns. Tag `axe-keys-ios27`                                                                                                                      |
| 5   | `ride_create_worst` en/ms: upward `axe swipe` from the top of the ride form's band never scrolled (10 of 10)                                                                                                                                                   | check bug        | `ride.form_scroll_to` uses held drags, as the README already advised                                                                                                 |
| 6   | `home_settled_collect` en dark: the tab region differs from its resting look from frame 0 (0.19 against a 0.12 threshold), so the flight check passed with the sticker 「over 我的」 at 0.00 s                                                                     | check bug        | Guard: the clip must start below the threshold; the case now fails honestly in en dark (open)                                                                        |
| 7   | Payee save crash not reproduced: 15 adds and 12 `payee_list` re-picks in ms on one Simulator; the full run's 3 crashes came at load averages of 50–100                                                                                                         | environment      | Queue 0b with options; probes kept out of the repo                                                                                                                  |

## Follow-ups

- 0b: owner picks a fix (PR body).
- `home_settled_collect` now passes on the same frame (owner ★); the 已结清 card still leaves in one frame instead of
  its 320 ms exit on iOS 27.2, open since the SDK 58 retro.
