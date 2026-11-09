---
branch: fix/paging-and-post-place
date: 2026-11-09
pr: 消息 list paging around a reload; shrink stall measured; bounty_post_place passes
title: A reasoned stall measured away, and a "dropped key" that was a Return with no effect
escaped: 1
rework: 3
interventions: 0
overturned: 0
---

# Retro: paging and post place

## Selection

| Cases                                                                   | Runs              | Reason                                                                     |
| ----------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `chat_list`, `chat_list_worst`, `chat_list_failed`                      | zh-Hans light     | The list's store and footer changed: rows, paging with 重试, stale refresh |
| `chat_list_stale_more` (new)                                            | zh-Hans light     | A stale list now pages and shows its footer                                |
| `chat_list_shrink`, `coins_page_shrink`, `profile_reviews_shrink` (new) | zh-Hans light     | Queue 4: measure the stall on each list                                    |
| `bounty_post_place`                                                     | zh-Hans light, ms | The helper `end_editing` changed; the case declares ms                     |
| smoke                                                                   | zh-Hans light     | Asked for every PR                                                         |

`--affected` would pick more (all chat cases); nothing else reads the list store's paging. Coin and review screens did
not change, so their other cases do not run.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                 |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 1: the 消息 list lost a next page around a reload (queue item, shipped with chat)                                         |
| Quality   | Vacuous checks          | 0 kept: `coins_page_shrink` failed on a handler that fires once per row; `chat_list_stale_more` is run without its footer |
| Quality   | Skipped verifications   | Device: the stall is measured on the iOS 27.2 Simulator only                                                              |
| Speed     | Wall-clock              | About 2 h, most of it Simulator runs and rebuilds after review                                                            |
| Autonomy  | Avoidable interventions | 0                                                                                                                         |
| Loop      | Minutes on this retro   | 5                                                                                                                         |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                            | Root cause class | Change and layer                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `bounty_post_place` was recorded as a dropped Return. Measured: `axe key 40` left the field focused 3 of 3 (3 s later) while typed keys landed; the tap for the address hit the `g` key under it, so `gA-12-03` went into the place name | wrong diagnosis  | `end_editing` taps the keyboard's own `Return` and waits for it to go. Other cases blamed on the drop are in Queue. Tag `axe-keys-ios27`                  |
| 2   | `loadMoreThreads` refused or dropped a page around a reload and nothing asked again                                                                                                                                                      | own gap          | `moreWanted`, as in #100; 8 of 10 new tests failed first; the sign-out one fails without its reset, and the last guards the retry row. Tag `paging-stall` |
| 3   | Review: a page rejecting before a reload landed left no re-ask in chat. Coins and reviews are not affected: their head key moves when the reload starts (checked by a mutation, not only read)                                           | own gap          | Failed page with a reload out asks again; test failed first                                                                                               |
| 4   | Re-review: paging on a stale list had no footer in the screen, so a failed page looked like the end of the list                                                                                                                          | own gap          | The screen reads `more` on stale; `chat_list_stale_more`. Store tests cannot see the screen                                                               |
| 5   | `chat_list` and `chat_list_worst` failed just after midnight: fixture times read 昨天                                                                                                                                                    | check bug        | `LOCAL_HOURS = [9, 10]` on both. Tag `clock-dependent-case`                                                                                               |
| 6   | Stopping a run mid-case left every following run `video missing`, even passing ones; shutting the Simulator down cleared it                                                                                                              | environment      | README note. Tag `runner-kill-recorder`                                                                                                                   |
| 7   | First drafts of the new cases: the wrong signal kinds, a signal before the scroll finished, a row counted as on screen when only mounted, a tap on an off-screen 重试 that opened a thread                                               | own gap          | Frames asserted; timed signals fail loudly when they come early                                                                                           |

## Notes

- Queue 4 was not reproduced: on all three lists a head read that shrinks the list with the new last row on screen asks
  for the next page. On the coin list it also holds when the handler is attached to every row from the start, so the
  handler fires again without the row's modifiers changing; why is not known. No sentinel row was built.
- A stale 消息 list now pages, as coins and reviews already did (★ for veto): refusing left a dead 重试.
- Accepted from review: the new cases assert no pixels, since they claim only paging; the timed signals can fail under
  load, loudly. `end_editing` needs the software keyboard, which the runner's headless Simulators always show.
- Review: round 1, 1 Important and Minors; re-review, 1 Important; both fixed.
