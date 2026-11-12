---
branch: fix/verify-full-cases
date: 2026-11-13
pr: three case flaws found by the overnight verify:full; most other failures were lost inputs on aging Simulators
title: bounty_post_form failed on an idle machine too; its budget and a number pad over the swipe were the cause, not load
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: verify:full cases (2026-11-13)

Follow-up to `2026-11-13-ms-type-row` (#2: `bounty_post_form` never finished under load 30–57).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                  |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0; no product bug among the 24 failures                                                                    |
| Quality   | Vacuous checks          | 0                                                                                                          |
| Quality   | Skipped verifications   | The full matrix stopped after 230 of 1248 runs (light only, `account_*` to `chat_thread_*`), the 4 h limit |
| Speed     | Wall-clock              | About 4 h of Simulator time; 1.1 runs a minute on three Simulators, half the 11-10 rate                    |
| Autonomy  | Avoidable interventions | 0                                                                                                          |
| Loop      | Minutes on this retro   | 10                                                                                                         |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                                                                                                                                                          | Root cause class | Change and layer                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `bounty_post_form` timed out at 240 s in zh-Hans, en and ms at load averages 10–12 on three Simulators, each at the same step: after RM 8 the number pad stayed up and `form_scroll_to` swiped from 75 % of the form height, which is on the pad, so nothing scrolled. The steps before RM 8 alone took 230 s                                                                                          | check flaw       | The case dismisses the pad with `dismiss_keyboard` before scrolling, and its budget is 360 s (check). Tag `pad-covers-swipe`            |
| 2   | `bounty_applicants_worst` zh-Hans ran out of its 600 s budget on the last leg; en and ms passed in 595 s and 594 s                                                                                                                                                                                                                                                                                     | check flaw       | Budget 900 s (check). Tag `budget-edge`                                                                                                 |
| 3   | `bounty_post_place` en pasted `Sunway Pyramid 北门`, which an earlier case had left on the pasteboard, although `simctl pbpaste` already read the new text (also 2026-11-10, en and ms)                                                                                                                                                                                                                | environment      | `paste_into` writes and pastes once more when the field reads something else, and logs it (check). Tag `stale-paste`                    |
| 4   | 19 failures were inputs that never arrived: taps on a screen at rest, a sheet-dismiss swipe, the first tap after a launch. Each Simulator lost inputs 8–40 min after its last boot, and the ones that went on lost their AXe session soon after (V3 03:25–03:39 then a stall at 03:57; V1 03:40, stall 04:06); Verify 2 never stalled and failed 13 runs from 04:45 on. 13 of 14 passed on fresh boots | environment      | None in this PR. The runner heals only on the session error; options for the runner are in the 2026-11-13 summary. Tag `axe-input-loss` |

## Follow-ups

- A runner rule for lost inputs (reboot a Simulator after a set uptime, or after a failed run, or retry a failed run once on another Simulator), measured before it lands.
- The rest of the matrix (`chat_*` onwards, and all of dark) on an idle night.
