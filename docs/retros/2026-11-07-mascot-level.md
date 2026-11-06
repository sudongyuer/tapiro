---
branch: feat/mascot-level
date: 2026-11-07
pr: mascot level (plan Task 7)
title: 小貘 grows on the home stage, 「小貘长大的时刻」, the accessory picker and stand-in accessory art
escaped: pending
rework: 1
interventions: 0
overturned: pending
---

# Retro: mascot level (Task 7)

## Selection

| Cases                                                                      | Runs          | Reason                                                              |
| -------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------- |
| `mascot_*` (seven)                                                         | zh-Hans light | New stage states, a new screen, the picker                          |
| `mascot_level_up`, `_jump`, `mascot_accessory`, `_failed`                  | en            | New copy keys                                                       |
| `mascot_level_up`, `_jump`, `mascot_accessory`                             | ms            | Long moment copy                                                    |
| `mascot_level_up`, `_busy`, `_jump`, `mascot_accessory`                    | dark          | New surfaces and colours: stage, moment, picker; contrast by eye    |
| `profile_self`                                                             | zh-Hans light | Its accessory rows changed                                          |
| smoke                                                                      | zh-Hans light | The home stage is on every launch                                   |

Motion: one appearance with video (`grow.mp4`, `replay.mp4`, `reduced.mp4`, `back.mp4`).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                  |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | pending                                                                                    |
| Quality   | Vacuous checks          | Three found in review (AX label proves no pixels; a span any motion passes), fixed         |
| Quality   | Skipped verifications   | Device: VoiceOver double-tap and the action, a tap mid-way, feel of the spring on a Release build |
| Speed     | Wall-clock              | About 1 h                                                                                  |
| Autonomy  | Avoidable interventions | 0                                                                                          |
| Loop      | Minutes on this retro   | 4                                                                                          |

## Problems and root causes

| #   | What happened                                                                                                                                                  | Root cause class | Change and layer                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | The accessories were clipped: `overflow: 'visible'` on the `Svg` does not reach past the viewBox                                                               | own gap          | Art stays inside the box; noted in the plan (M5)                                                     |
| 2   | A motion clip started after a fixture delay missed the animation under load                                                                                    | own gap          | The clip runs across a relaunch, so the recorder is on before the app starts                         |
| 3   | `ARGS`, `DEPS` must be literals; imported lists stopped the runner                                                                                             | own gap          | Inline in each case; the runner's message already says so                                            |
| 4   | The spring as written peaks near 1.02, not the board's 1.07: the canvas keyframes approximate it                                                               | foreseen         | M7, for the owner; computed from Reanimated's own stiffness code before building                     |
| 5   | `react-hooks/set-state-in-effect` refused the first hook: the phase lived in React state                                                                       | own gap          | The timeline lives in shared values, the decision in a pure `growStep` with unit tests               |
| 6   | `mascot_accessory_failed` read the call log with no wait right after a tap, so plist lag looked like a resend                                                  | own gap          | Wait for the first call, then for a second; the same rule as `records.py`                            |
| 8   | A case that needs a tap inside 760 ms cannot work: AXe tap latency was 5–13 s under load                                                                      | own gap          | Timing inside a motion is a device check, not a UI case; note in the plan row                         |
| 7   | Automation-session timeouts on three cases at load 87 (`load averages: 52 87 99`); the reruns passed                                                           | outside          | Rerun once as the task notes say                                                                     |

## Review findings

Round 1: 0 Critical, 7 Important, 8 Minor, all fixed. Important: VoiceOver double-tap did nothing (Fabric sends `onAccessibilityTap`, not `activate`); the bubble that says 点我看看 was not a tap target; a one-frame jump from 1 to 0.88 before each play (★ M6: the crouch now starts from the size on screen); two animated styles wrote one view's opacity (reveal now wraps the scroll style); `mascot_level_reduced` could not catch a broken path; no case proved the end state with pixels; the waits, skips and mid-way tap had no test (`growStep` unit tests, `mascot_level_collapsed`, `mascot_level_midway`). 

Round 2 (re-review after Important): 0 Critical, 4 Important, 8 Minor, all fixed. The growth could play with 小貘 still under the bar (`visible` reused the strip threshold; now its own reaction, M16); the reveal style detached mid-value (now always attached in the stage); three cases had assertions that could not fail. Round 3 (re-review of those fixes): 0 Critical, 1 Important, 5 Minor. The Important was `mascot_level_midway`: AXe taps took 5–13 s at this load against a 760 ms window, so no Simulator case can place a tap inside the motion. The case is removed; the decision is unit-tested in `growStep` and the tap is a device check in the story map.
