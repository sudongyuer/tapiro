---
branch: feat/bounty-map
date: 2026-10-30
pr: bounty step 8
title: 8 map view
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: bounty step 8, the map view (running)

## Candidates (first occurrence, not yet generalised)

- `build-log-tail`: Task 3's first `verify:build` failed (exit 65, `MKMetersBetweenMapPoints` unavailable on the iOS 26
  SDK), but `build.sh` piped xcodebuild through `tail -n 20`, so the error was not in the output and the agent reran
  xcodebuild by hand to find it. Fixed in `build.sh`: the full log goes to `.verify/build.log`, and a failure prints the
  `error:` lines and the log path.
- `parallel-shared-table`: Tasks 3 and 4 ran in parallel; Task 4 moved `CATEGORY_SYMBOLS` to `src/ui/categoryArt.ts`
  while Task 3 imported it from `CategorySticker`, so the merge broke `tsc` (fixed in `cb204b8`). The plan named disjoint
  files but not the shared table both would touch. Next plan: list shared modules a parallel task may move.
