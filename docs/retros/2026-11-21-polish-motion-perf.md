---
branch: feat/polish-motion-perf
date: 2026-11-21
pr: app-wide motion, render and finish polish
title: Reduce Motion fades that never played; formatters rebuilt per row
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: polish pass (motion, render, finish)

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                   |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                                           |
| Quality   | Skipped verifications | No device Instruments run (performance sign-off needs a device; both phones were held by the other session) |
| Speed     | Wasted time           | ~10 min: the Simulator queue held two other sessions' runs ahead of this one                                |
| Autonomy  | Interventions         | 0 (owner asleep; decisions P1–P12 recorded for veto)                                                        |

## Findings

- Five Reduce Motion paths jumped instead of fading. Cause: in Reanimated 4.7 a timing without `reduceMotion` is
  skipped when Reduce Motion is on, so a fade written as the Reduce Motion replacement never plays; and 17 of 31 call
  sites read `useReducedMotion()` without verify mode's override, so no case could reach those paths. Tag
  `reduce-motion-untested`. Guarantee at the lowest layer: one hook, `useMotionReduced()`, and an ESLint
  `no-restricted-imports` rule on `useReducedMotion` outside `src/ui/theme/motion.ts`; shared `FADE_IN`/`FADE_OUT`
  builders carry `ReduceMotion.Never`.
- `Intl` formatters were constructed on every call in 13 modules (per card, ticket, message). One cache in
  `src/lib/intlCache.ts`; the remaining four `.tsx` sites are listed in the plan.
- Rework (review round): the first threshold for `home_settled_collect`'s leave span (0.06 s) sat inside the jitter of
  30 ms frames against the new 240 ms curve; the check now asserts the change spans more than one frame, which is the
  property it exists for. Board cards' 今天/明天 were first keyed on the load time string; now on the load day.
- Parallel agents in one worktree with disjoint file lists worked without conflicts; one lint error crossed the line
  (the new rule fired in a file another agent owned) and was fixed at integration.
- Rework (Simulator run): turning the card restack into a 240 ms spring made the board below move 44 pt in about
  30 ms; `home_settled_collect` failed on two Simulators (follow 0.04 s and 0.07 s, against a reduced-motion jump of
  0.07 s). A spring of the same nominal duration front-loads its travel. The 420 ms tween stays (P4 withdrawn). Tag
  `spring-vs-tween-follow`: before swapping a tween for a spring where another element follows it, run the case that
  measures the follow.
