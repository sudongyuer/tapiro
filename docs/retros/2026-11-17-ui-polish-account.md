---
branch: fix/ui-polish-account
date: 2026-11-17
pr: UI polish audit, account, onboarding, settings and mascot level (ACC-1 to 4, 6 to 12)
title: eleven audit findings fixed; the delete sheet's pinned buttons fought react-native-screens and became one scroll
escaped: 0
rework: 2
interventions: 0
overturned: 1
---

# Retro: UI polish, account, onboarding, settings and mascot level (2026-11-17)

Fixes from the UI audit of 2026-11-16 for onboarding, Settings, the delete-account sheet and the profile level card, plus
an accent caret on the chat composer, the 问小貘 input and the review sentence field. The first session ran out of quota
after its runs; a second agent finished the branch.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                              |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                                      |
| Quality   | Vacuous checks          | 0; the real-sheet case failed on both earlier layouts (list below the sheet, list under the buttons) and passes on the scrolling sheet |
| Quality   | Skipped verifications   | ACC-10 shows the placeholder avatar in the fixture (no picture URL); a real picture is a device check. No device run                   |
| Speed     | Wall-clock              | Second session about 1 h 20 min, of which about 25 min waiting for the shared Simulator lock                                           |
| Autonomy  | Avoidable interventions | 0                                                                                                                                      |
| Loop      | Minutes on this retro   | 5                                                                                                                                      |

## What happened

| #   | What happened                                                                                                                                                                                                                                          | Root cause class | Change and layer                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The pinned-button layout passed in the Debug scene and failed in the real form sheet: react-native-screens 4.30 finds a form sheet's first ScrollView (`tryFindDescendantScrollView`) and sets its frame to the sheet's, which moved the list below it | platform         | The sheet is one ScrollView, the case react-native-screens supports; ★ P1 changed from pinned buttons to buttons that scroll with the list (overturned the first session's ★, for veto) |
| 2   | A spacer view to keep the list off the searched chain only moved the failure: the list then filled the sheet under the buttons                                                                                                                         | platform         | Dropped with #1                                                                                                                                                                         |
| 3   | The rewritten real-sheet case passed a frame where `bottom()` wants an element (KeyError), one extra run                                                                                                                                               | process          | Fixed; tag `case-typo`                                                                                                                                                                  |
| 4   | `account_flow` passed only on the retry in light (a 280 s timeout under load) and dark (the keyboard never settled once); `shell_tabs` in smoke lost the AXe session once                                                                              | outside          | None; tags `axe-session-lost`, `load-timeout`                                                                                                                                           |

## Carry forward

- A layout inside a form sheet is checked in the real sheet, not only in its Debug scene: react-native-screens resizes
  the sheet's first ScrollView, so a sheet with a scroll view and a pinned bar cannot be proven in a plain screen.
