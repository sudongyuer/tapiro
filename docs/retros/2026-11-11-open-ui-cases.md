---
branch: fix/open-ui-cases
date: 2026-11-11
pr: triage the open UI case failures of queue 0 and fix the checks that measured the wrong thing
title: The open UI failures were checks that measured the wrong thing; none was a product bug
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: open UI cases

Follow-up to `2026-11-10-verify-full-round`, `2026-11-10-post-hint-keypad-crash` and
`2026-11-11-payee-resign-before-dismiss` (queue 0).

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                        |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 0; no product bug found behind the seven                                                         |
| Quality   | Vacuous checks          | 2 found: `home_settled_collect` (glass backdrop), `live_applicants` (a read placed by a lagging plist) |
| Quality   | Skipped verifications   | `bounty_post_art`'s lost tap not reproduced (0 of 7); the space-typing probe ran at low load only |
| Speed     | Wall-clock              | About 2 h; about 1 h of it Simulator batches at load averages of 40–131 from other projects        |
| Autonomy  | Avoidable interventions | 0                                                                                                |
| Loop      | Minutes on this retro   | 10                                                                                               |

## Problems and root causes

| #   | What happened | Root cause class | Change and layer |
| --- | ------------- | ---------------- | ---------------- |
| 1   | `payee_list` 「cash did not turn off」: `axe tap --id` taps the centre of a SwiftUI `Toggle` row, which never flips it (0 of 20); an instant tap on the switch 1 of 12, a 0.2 s touch 10 of 10 | check bug | `UI.flip` in the driver; tag `swiftui-toggle-tap` |
| 2   | `home_settled_collect` en dark: the glass tab bar shows the board moving behind it when the taller calm card arrives, so the whole icon box differed 0.19 at the start | check bug | Compare only the 我的 glyph's own pixels: 0.00 at start and rest, 0.3–0.9 while the sticker passes; tag `glass-backdrop` |
| 3   | `live_applicants`: the run video held 3 人申请 until this bounty's signal, but the case's one read came after it, because it waited for the other signal in a plist that lagged past the 10 s gap | check bug | Records carry `startedAt`; reads are placed between the signals by the Mac clock; signals 20 s apart; tag `plist-lag` |
| 4   | The first rewrite asked for two reads in the window and failed when one `describe-ui` took 7 s at load 64–131 | own gap | One placed read is enough, as the original case intended |
| 5   | `chat_entry_status` en: the auto-confirm line wraps to three lines, so the address card sat below 发消息 | stale case | Drag it behind each button when it is not already |
| 6   | `bounty_status_poster`: typed reason; the case tests sending and the kept draft, not typing | check bug | `paste_into`; `keys.py` sends spaces as paced keys for cases that do test typing; tag `axe-space-repeat` |
| 7   | `home_title_strip` ms: one 500 pt swipe down did not always undo the fling of the first swipe up (1 of 4; two swipes needed in 2 of 3 later ms runs) | check bug | Swipe down until the large title is back, at most three times; tag `swipe-fling` |

## Notes

- The machine ran other projects' Simulators and `mds_stores` throughout (load average up to 131); every failure in
  this round was read from its log, video or frames before being classed.
- `pay_sheet_duitnow` zh dark passed 3 of 3; its full-run failure was not reproduced.
