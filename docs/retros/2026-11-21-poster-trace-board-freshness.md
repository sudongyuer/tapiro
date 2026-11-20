---
branch: fix/bounty-poster-sees-own-open
date: 2026-11-21
pr: the poster sees their new bounty on home; the board reloads itself
title: two defects escaped to the owner's first device test because no case let time pass with the screen open
escaped: 2
rework: 0
interventions: 0
overturned: 0
---

# Retro: the poster's trace and the board's freshness (2026-11-21)

The owner's first TestFlight test: after 发出去 home stayed calm, so they posted three times; a second phone's board
stayed at 「全部 0」 until a relaunch.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                 |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 2, both found by the owner on a device                                                                                                                    |
| Quality   | Vacuous checks          | 0; the new unit tests fail with the reload removed (checked for `postFlow.test.ts`); the UI cases start from a fixture that returns nothing on first load |
| Quality   | Skipped verifications   | No device run; foreground reload still has no UI case (verify mode cannot background the app)                                                             |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                         |

## What happened

| #   | What happened                                                                                                                                                                                                                                              | Root cause class   | Change and layer                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `bounty_post_publish` asserted only that the sheet closed onto home; the verify live service returned no rows before and after, so the missing reload of the poster's own bounties could not show. The spec said "lands on the new live card" (94A)        | check design       | Code: the publish flow takes a required `reloadMine` dependency, so a flow built without it does not type-check. Check: `bounty_post_shows_mine` uses a fixture whose later loads differ from the first one. Tag `write-no-refresh` |
| 2   | Same class on the applicant side: apply and withdraw signal only the poster, so the applicant's 「等某某选」 card also waited for a relaunch. Found by searching for other own writes that rely on a live signal                                           | check design       | Code: `reloadOnOwnApplications` reloads on every user-made application change. Tag `write-no-refresh`                                                                                                                               |
| 3   | The board followed the v1 freshness rule exactly (launch, foreground, tab focus, pull); with the app open and nobody pulling, it never changed. No case let time pass with the board open                                                                  | spec gap           | A 60 s timed reload while the home is on screen (spec Implementation Record 2026-11-21); `bounty_board_new_posts` covers pull and the timed reload                                                                                  |
| 4   | `tsc` first failed on a missing `@react-native-google-signin` module: this worktree's `node_modules` predated #201                                                                                                                                         | outside            | None; `bun install` fixed it. Tag `stale-worktree-modules`                                                                                                                                                                          |
| 5   | `bounty_board_new_posts` failed in both appearances on its first run: with a 4 s tick the timed reload landed before the case's several reads of the empty board finished, so 「全部 1」 showed where 「全部 0」 was asserted                              | check design       | The case reads the empty state once and the tick is 15 s; passed in zh-Hans and ms, light and dark. Tag `tick-faster-than-reads`                                                                                                    |
| 6   | `bounty_board_new_posts` ms dark: the first attempt failed with 「the screen never came to rest」. Its failure screenshot shows the pull-to-refresh spinner still showing after the board read 「Semua 1」. It passed on retry, and in the other five runs | outside (unproven) | None yet. Load average was 155 with other agents' runs. If it recurs, check `useTracked` in `useBountyBoard.ts`, whose comment already names a RefreshControl that keeps spinning. Tag `refresh-spinner-stuck`                      |

## Next

- Rule candidate (second time a write's own screen missed its update would make it a rule): every UI case for a write
  asserts the screen the user lands on shows the result, with a fixture whose later loads differ from the first.
