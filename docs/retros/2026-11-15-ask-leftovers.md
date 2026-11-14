---
branch: fix/ask-leftovers
date: 2026-11-15
pr: three 问小貘 leftovers from the Task 10 review (consent rows, suggestions beside error cards, the home sample tag)
title: Three review leftovers fixed in one pass; every case passed on its first run
escaped: 3
rework: 0
interventions: 0
overturned: 0
---

# Retro: 问小貘 review leftovers (2026-11-15)

Follow-up to `2026-11-15-ask-wrap` (#135), whose review named three small UI leftovers it did not fix.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                  |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects         | 3 from Task 10 (found in its review, fixed here)                                                                                           |
| Quality   | Vacuous checks          | 0 by construction, not run on origin/main: there `showSuggestions` stays true beside 晕了 and offline, and tag 0 has no `chipQuestion` key |
| Quality   | Skipped verifications   | Dark not run: no colour or token changed. Consent alignment is checked by screenshot only (AX gives one frame for the combined row)        |
| Speed     | Wall-clock              | About 1 h; 16 min of it the verify build and the selected cases                                                                            |
| Autonomy  | Avoidable interventions | 0                                                                                                                                          |
| Loop      | Minutes on this retro   | 5                                                                                                                                          |

## Problems and root causes

| #   | What happened                                                                                                                         | Root cause class | Change and layer                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Consent rows used `LabeledContent` with a trailing multi-line value; SwiftUI stacked them once the value wrapped, lines right-aligned | design           | Rows are a leading `VStack`, name above value (code). The other `multilineTextAlignment('trailing')` uses are single-line amount fields and a short invite status |
| 2   | The suggestions hid for the hungry card only; the error cards were added later without the same condition                             | design           | `showSuggestions` also hides on any failure card; `ask_sheet_worst` asserts it for 晕了, 饿了 and offline (case)                                                  |
| 3   | K1 trimmed the sheet's suggestions to what 小貘 can do but kept the home tag as "home design"                                         | judgment         | K3 replaces it; `home_calm` asserts each tag's copy and that none is a button (case)                                                                              |

## Follow-ups

- None. K3 is listed for veto in the plan.
