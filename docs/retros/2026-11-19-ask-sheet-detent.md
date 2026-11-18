---
branch: fix/ask-sheet-first-detent
date: 2026-11-19
pr: 问小貘 sheet keeps 自己填 whole in en and ms and holds the belly row while it loads
title: two 问小貘 layout bugs from #165 that only en, ms or a slow belly load showed
escaped: 2
rework: 0
interventions: 0
overturned: 0
---

# Retro: 问小貘 sheet first detent and belly row

## Core (mandatory)

| Dimension | Measure               | This step                                                                            |
| --------- | --------------------- | ------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 2, both from #165, found by the 2026-11-19 full run                                  |
| Quality   | Skipped verifications | None; the changed sheet's cases ran zh-Hans, en and ms light and zh-Hans and en dark |
| Speed     | Wasted time           | ~0                                                                                   |
| Autonomy  | Interventions         | 0                                                                                    |

## Findings

- 自己填 under 「接着上次」 fell 12.5 pt below the sheet in en: #165 put the header in the bar row and the subtitle wraps
  in en and ms, while zh-Hans had 5 pt to spare. `ask_sheet_answer` declared no locales, so #165's run was zh-Hans
  only. It now declares `ms`. Tag `missed-locale`.
- The belly row appeared 7.5 s after the sheet (the case delays the consent status by 8 s) and pushed the field and
  mic down 26.6 pt; `ask_voice_cloud` caught it as 「停 moved from under the finger」 and the suggestion tap of
  `ask_sheet_answer` dark missed. The row's height is now held while the status loads. Tag `late-row-jump`.
