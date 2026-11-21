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

| Dimension | Measure               | This step                                                                                           |
| --------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | pending (owner walkthrough)                                                                         |
| Quality   | Skipped verifications | Device checks (swipe feel, Reduce Motion, VoiceOver, Photos); UI runs waited ~1 h for disk and load |
| Speed     | Wasted time           | ~10 min (case-insensitive file names; worktree guard refusing heredoc shell edits)                  |
| Autonomy  | Interventions         | 0                                                                                                   |

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
- The 月历 sheet drew nothing: in a `formSheet` route its `ScrollView` sat inside a wrapper `View`, and it neither
  drew nor scrolled while the floating pill (a sibling) showed. Making the ScrollView the screen's first child fixed it.
  Tag `formsheet-scrollview-first`. Landed as an AGENTS.md platform pitfall (lowest layer available: no lint can see
  route presentation).
- `axe swipe --duration 0.8` reaches the app as a short drag (the card goes about a quarter of the way and springs
  back); 0.5, 1.2 and 2.0 s deliver the whole stroke (probe on the deck, 2026-11-21). Cases swipe for 1.2 s, noted in
  `sticker_book.py`. Tag `axe-swipe-duration`. Fix candidate if it recurs: a driver helper `ui.drag()` with a tested
  duration.
- Simulator runs met load averages of 130+ from parallel agents; `Timed out creating the simulator remote automation
session` twice. Waited for the load to drop below 50 before probing. Tag `host-load`.
