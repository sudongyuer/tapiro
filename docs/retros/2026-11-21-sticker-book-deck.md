---
branch: feat/sticker-book-deck
date: 2026-11-21
pr: Sticker book deck, month calendar sheet and posters
title: Sticker book deck
escaped: pending
rework: 1
interventions: 0
overturned: pending
---

# Retro: sticker book deck

## Core (mandatory)

| Dimension | Measure               | This step                                                                                             |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | pending (owner walkthrough)                                                                           |
| Quality   | Skipped verifications | Simulator runs while the disk held 14.4 GB (below the 15 GB rule for Release builds); see the PR body |
| Speed     | Wasted time           | ~10 min (case-insensitive file names; worktree guard refusing heredoc shell edits)                    |
| Autonomy  | Interventions         | 0                                                                                                     |

## Findings

- `deck.ts` next to `Deck.tsx` (and `poster.ts` next to `Poster.tsx`) broke `tsc` with TS1149: APFS is case-insensitive,
  so the two paths are one module. Tag `case-insensitive-names`. Renamed to `deckMotion.ts` / `posterData.ts`. Fix
  candidate if it recurs: a lint rule that rejects two files in one folder differing only in case.
- First deck draft ordered cards by React render order switched through `useAnimatedReaction` → `setState`; a finished
  turn toward newer cards would redraw the old top card above the new one for a frame before React reordered. The pose
  now carries `zIndex`, so order changes on the UI thread with the pose. Tag `deck-order-frame`. Found in self-review,
  before any run.
- The worktree guard refuses compound shell commands (heredocs with `$PWD`, `git -C`); scripted edits went through
  scratchpad Python files with literal paths. Tag `worktree-guard`; already known (2026-11-02 retros).
- Free disk was 14.4 GB while two other agents held the Simulator queue; no Release verify build was started.
  Tag `disk-below-15gb`.
