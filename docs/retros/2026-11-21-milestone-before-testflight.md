---
branch: fix/milestone-2026-11-21
date: 2026-11-21
pr: Milestone run over #204–#216 before the next TestFlight build, and its fixes
title: Merged together, the audit batches broke two screens and four cases
escaped: 2
rework: 3
interventions: 0
overturned: 1
---

# Retro: milestone before TestFlight

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                                                                       |
| --------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 2 reached main: the language step's heading under the back button (batch D's O2 fix), and the post form's floating 完成 over the reward and the new 说明 field (P5) |
| Quality   | Skipped verifications | dark beyond the surface cases, ms dark, device checks (no phones by instruction)                                                                                |
| Speed     | Wasted time           | ~2.5 h: a first batch launched in both appearances and restarted, a kit inset that was tried in four builds and dropped, a machine at load 100–300                |
| Autonomy  | Interventions         | 0                                                                                                                                                               |

## Findings

- Each audit batch ran only its own screens' cases; nobody ran the combination until this milestone, and #214's O2 fix
  broke `account_flow`'s "both steps share one bubble height" assertion, which batch D did not select. The milestone
  is the designed catch; it worked. Tag `batch-combination`.
- Four cases still asserted the design the merged batches replaced: the strip on 挑人 (`home_bounty_cards`, H3), the
  payee jump to 我的 (`bounty_apply_detail`, batch A), the ink 申请 pill and the 「已申请 · 」 line
  (`bounty_board_worst`, E2 and E3). Tag `case-encodes-old-design`, second occurrence after batch E's; escalated to a
  written rule in `AGENTS.md` (Checks): a change that overturns a behaviour searches `verification/ui` for the old
  behaviour's identifiers and copy keys.
- Rework 1–3, the keyboard toolbar: since iOS 26 the keyboard toolbar floats outside the keyboard safe area. A kit
  bottom inset (toggled on keyboard notifications, then constant) fixed the reward case but raced the scroll to the
  focused field and moved rows other post cases rely on; it was dropped, and the post form no longer shows the toolbar
  (M2). Lesson: when a system control misbehaves on one screen, removing it there is cheaper than compensating for it
  in the kit. Tag `keyboard-toolbar-overlay`.
- `onboarding_language_moment` asserted the column and the whole title but not the heading's top, so the O2 fix's
  overlap with the back button passed it. It now asserts the greeting starts below the navigation bar.
- The Settings confirm first anchored on the label, not the row: a SwiftUI `Button` without `fullRow` reports the row
  frame to accessibility while the popover points at the text. `ClearSection` already used `fullRow`; Settings now does.
- Real data never disagreed on the sticker count (`sticker_book()` and the profile both count `public.stickers` by
  owner); the fixtures did. The self profile in verify mode now counts the fixture book.
