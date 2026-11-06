---
branch: fix/case-account-detail
date: 2026-11-06
pr: bounty_detail and account_flow on iOS 27.2
title: Two cases left unconfirmed after #88, neither caused by it; back button and edit-menu paste
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: bounty_detail and account_flow after #88

## Selection

| Cases           | Runs                               | Reason                                                       |
| --------------- | ---------------------------------- | ------------------------------------------------------------ |
| `bounty_detail` | zh-Hans light, before and after    | Failed after #88, which changed the poster row on the detail |
| `account_flow`  | zh-Hans and ms light, before/after | Failed after #88 at the name step; #88 changed `MeView`      |

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                           |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                             |
| Quality   | Vacuous checks          | 0: the return still asserts the scroll position and the deselected fill; the empty-name step still needs the error  |
| Quality   | Skipped verifications   | No build of #88's parent: on main both cases got past the steps #88 touched (below); dark and en (case-only change) |
| Speed     | Wall-clock              | About 40 min                                                                                                        |
| Autonomy  | Avoidable interventions | 0                                                                                                                   |
| Loop      | Minutes on this retro   | 4                                                                                                                   |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                               | Root cause class                 | Change and layer                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `bounty_detail` on main: the poster row assertion (小林 · 靠谱, now with a chevron) and the 01 screenshot pass; it fails at the edge swipe (`bounty-detail-title is still on screen`), the README's known iOS 27.2 AXe fault                                | environment, not #88             | Case: `BackButton`, as `chat_list` does; the story map lists the interactive pop under `device`. Passed zh-Hans light with every later step (page two, worst, failed, gone)                                                    |
| 2   | `account_flow` passed on main in zh-Hans and ms (2 of 2), so #88 did not cause the earlier failure; its name step used `backspace` and `axe type`, the AXe key events that drop on iOS 27.2 (tag: axe-key-drop)                                             | environment, intermittent        | Case: `paste_into` for both steps (spaces for the empty-name error, then the name); passed zh-Hans and ms                                                                                                                      |
| 3   | The paste steps took the ms run to 205 s against a 200 s budget                                                                                                                                                                                             | own gap                          | `BUDGET = 280`                                                                                                                                                                                                                 |
| 4   | One run timed out creating the automation session on `Tapiro Verify 2` (load average 64 a few minutes before) (tag: automation-session-timeout)                                                                                                             | environment                      | Reran; passed                                                                                                                                                                                                                  |
| 5   | Review: three more cases went back with an edge swipe (`bounty_apply_detail`, `bounty_detail_outcome`, `bounty_withdraw`) and one from the place search (`bounty_board_location`); `account_flow` did not list `bounty.py` and `pasteboard.swift` in `DEPS` | own gap (same pattern not swept) | All four use `BackButton`; on the place search the focused search bar holds the close button where back was, so the case closes it first (probed: `Button 关闭` at the top right). All four passed zh-Hans light; `DEPS` fixed |

## Review findings

Round 1: 0 Critical, 2 Important (the four other edge-swipe cases; `DEPS`), 2 Minor (the story map row cited only
`bounty_detail` for the poster push, now also `profile_entry_detail`; a comment repeating `paste_into`'s reason). All
fixed.
