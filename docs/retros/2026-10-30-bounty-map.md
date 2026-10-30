---
branch: feat/bounty-map
date: 2026-10-30
pr: bounty step 8
title: 8 map view
escaped: 0
rework: 1
interventions: 1
overturned: 0
---

# Retro: bounty step 8, the map view

## Numbers

22 commits over 2.9 h of commit time (`retro-metrics.py --base origin/main`). One fix round: the first selection run
passed 7 of 11 cases; the 4 map failures were 2 product bugs (`pin-hit-test`, `tail-under-shadow`) and 2 case bugs
(`pull-distance`, a missing `-uiVerifyLocation denied` in the switch case). No escaped defect, no overturned ruling.

## Decided for you

- `verification/ui/build.sh` keeps the full log and prints the `error:` lines on failure (`build-log-tail`).
- The kit pin hit-tests only its drawn parts (`pin-hit-test`).

## Candidates (first occurrence, not yet generalised)

- `build-log-tail`: Task 3's first `verify:build` failed (exit 65, `MKMetersBetweenMapPoints` unavailable on the iOS 26
  SDK), but `build.sh` piped xcodebuild through `tail -n 20`, so the error was not in the output and the agent reran
  xcodebuild by hand to find it. Fixed in `build.sh`: the full log goes to `.verify/build.log`, and a failure prints the
  `error:` lines and the log path.
- `parallel-shared-table`: Tasks 3 and 4 ran in parallel; Task 4 moved `CATEGORY_SYMBOLS` to `src/ui/categoryArt.ts`
  while Task 3 imported it from `CategorySticker`, so the merge broke `tsc` (fixed in `cb204b8`). The plan named disjoint
  files but not the shared table both would touch. Next plan: list shared modules a parallel task may move.
- `args-literal`: three new cases built `ARGS` from list splats (`*NO_ORIGIN`); the runner reads `ARGS` with
  `ast.literal_eval` and aborted the whole run. Already caught by the runner at load time; cost one aborted run.
- `pull-distance`: `bounty_board_map_states` pulled 290 pt and never triggered a refresh (460 pt does), so the stale
  notice "was missing". Case problem, not product.
- `at-rest-location-dot`: zoomed out, MapKit's breathing user-location dot kept `at_rest` from settling; the crowded case
  now waits for each pin's position to hold instead.
- `pin-hit-test`: transparent corners of a pin view took taps meant for a fanned neighbour, and MapKit sometimes
  selected another annotation than the one under the finger. Fixed in the kit (`888498f`): hit-test only the drawn disc
  and label, report the pin the touch actually hit. Found by the crowded case, not by the user.
- `tail-under-shadow`: the pin card's tail was drawn under the faces' shadow and read grey (`dbcbed5`).
- `local-file-size-test`: `bun test` fails the 4 `check-file-size` fixture tests locally (exit 1, empty output) while
  the same script on the same kind of fixture, run from the shell or from a one-off `bun test` probe, prints the
  finding. CI passes. Not from this branch (it also fails on `main`); time-boxed, cause unknown.
- `at-rest-location-dot` (second time): the dark `bounty_board_map` run failed "never came to rest" on the same
  breathing user-location dot, half hidden behind a pin. Moved down a layer: `UI.at_rest(ignore=...)` masks given
  frames, and `map.map_at_rest` masks MapKit's location dot, used by every map case.
- `ui-ruling-unasked`: plan ruling 10 decided on its own that an applied bounty's pin keeps its normal sticker (only the
  card says 已申请), while the list tilts the sticker and stamps it. The owner asked during the walkthrough whether the
  map marks applied bounties. A visible state difference between list and map is a UI choice: it belonged on the canvas
  with the other map questions, not in the rulings.
