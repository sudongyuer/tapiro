---
branch: fix/ask-settings-switch-and-sheet-follow
date: 2026-11-18
pr: the 我的 → 小貘 rows no longer jump in ms while withdrawing, and the 问小貘 sheet follows its content after a reply
title: two en/ms regressions from the 问小貘 polish, found by the 2026-11-18 full run
escaped: 2
rework: 1
interventions: 0
overturned: 0
---

# Retro: 问小貘 switch spinner and sheet follow (2026-11-18)

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                         |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 2, both from #152 and both seen only in en and ms                                                 |
| Quality   | Vacuous checks          | 0; `ask_consent_settings` ms and `ask_consent_worst_sheet` en and ms failed on main and pass here |
| Quality   | Skipped verifications   | Device check of the sheet follow                                                                  |
| Speed     | Wall-clock              | About 90 min                                                                                      |
| Autonomy  | Avoidable interventions | 0                                                                                                 |
| Loop      | Minutes on this retro   | 5                                                                                                 |

## What happened

| #   | What happened                                                                                                                                              | Root cause class | Change and layer                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| 1   | ms: the spinner that replaces the switch is narrower, so 「Benarkan Tapir menggunakan awan」 unwrapped and the rows below rose 20 pt                       | missed check     | A hidden switch holds the width; the case already asserted it in ms         |
| 2   | The first fix (hidden full switch) made the zh-Hans row 6 pt taller                                                                                        | incomplete fix   | The hidden switch gets no height; zh-Hans and ms reruns                     |
| 3   | After 知道了 closed the consent page the sheet stayed at the top; the note card #152 moved out of the composer pushed the composer off screen in en and ms | missed check     | The sheet keeps following its content after a reply until the user drags it |

## Next

- A polish PR that changes layout runs its screens' cases in `ms` once before merging.
