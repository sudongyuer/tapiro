---
branch: fix/home-board-follows-stack
date: 2026-11-16
pr: the home board follows the card stack's height change over the 420 ms restack (12 A)
title: The board follows the stack, and the calm card rises from its real back pose
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: board follows the stack (2026-11-16)

Follow-up to `2026-11-16-settled-exit` (carry forward: the board moved in one frame).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                        |
| Quality   | Vacuous checks          | 0; the follow assertion failed on the old build (0.00 s, both attempts) and passes on the fix (0.18 s)   |
| Quality   | Skipped verifications   | Dark, en and ms not run: no colour or copy changed. Device feel stays on `pay.settle.payer-collect-feel` |
| Speed     | Wall-clock              | About 1 h; one build and run per side, both under 5 min                                                  |
| Autonomy  | Avoidable interventions | 0                                                                                                        |
| Loop      | Minutes on this retro   | 5                                                                                                        |

## What happened

| #   | Finding                                                                                                    | Cause                  | Action                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The before recording showed the taller calm card drawn over the board's title for its first frames         | fixed 40 pt rise start | The rise starts from the pose the card would have behind the leaving card (`backOffset`); ★ (c) in the plan log. Tag `measure-before-building` |
| 2   | Matching each frame's band under the board title against the last frame gives the board's offset per frame | measurement choice     | `board_follow` in `home_settled_collect`; a jump covers the move between two frames, the restack curve over about 0.2 s                        |
| 3   | `lint:changed` and `format:check` failed once on an import Prettier keeps on one line                      | hand-wrapped import    | `prettier --write` on the file; no new rule, the checks caught it                                                                              |

## Carry forward

- Content below a stack whose layout height changes follows by a transform offset that starts at the old position and
  eases to 0 (`useStackFollow`), the same pattern as `followShift` for opening the stack.
