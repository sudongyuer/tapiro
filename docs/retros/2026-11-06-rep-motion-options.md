---
branch: docs/rep-motion-options
date: 2026-11-06
pr: question 257 motion options
title: canvas options for the sealed review, the level-up grow and the weekly-feed leaf
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: question 257 motion options

## Core (mandatory)

| Dimension | Measure                 | This step                                                                               |
| --------- | ----------------------- | --------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                 |
| Quality   | Vacuous checks          | n/a (docs and canvas only)                                                              |
| Quality   | Skipped verifications   | The three boards were not rendered or screenshotted (the canvas type forbids verifying) |
| Speed     | Wall-clock              | About 1 h: reading the decided boards and motion rules, three interactive boards, docs  |
| Autonomy  | Avoidable interventions | 0                                                                                       |
| Loop      | Minutes on this retro   | 2                                                                                       |

## Problems and root causes

| #   | What happened                                                                                                                                                                  | Root cause class | Change and layer                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | The literal 253 A ("drops a leaf and chews once") makes 小貘 chew before the server answers, so `already_fed` and failures would show an eaten leaf next to a "not fed" bubble | missing context  | Offered as 257c2 next to c1★, which chews only after `fed`; the conflict with the data-integrity rules is on the board |

## Notes

- The canvas previews approximate Reanimated springs with CSS keyframes; the boards say so and list the real configs.
