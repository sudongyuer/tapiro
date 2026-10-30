---
branch: docs/bounty-milestone
date: 2026-10-31
pr: bounty milestone
title: bounty milestone run (steps 1–9) and walkthrough checklist
escaped: 4
rework: 1
interventions: 0
overturned: 0
---

# Retro: bounty milestone run

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                         |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 4 case defects from step 9 surfaced here (items 1–3); no product defect                                                           |
| Quality   | Vacuous checks          | 0: the narrowed urgent-colour check still fails if the plain card's time line turns urgent                                        |
| Quality   | Skipped verifications   | Device lines in the walkthrough; `verify:full` runs after this PR                                                                 |
| Speed     | Wall-clock              | About 2 h: 135 runs on 3 Simulators (35 min zh light, 35 min en light, about 15 min dark, about 25 min ms), one fix round, rerun |
| Autonomy  | Avoidable interventions | 0                                                                                                                                 |
| Loop      | Minutes on this retro   | 4                                                                                                                                 |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                     | Root cause class   | Change and layer                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Step 9's art row made the post form about 190 pt taller; `bounty_post_place`, `bounty_post_form` (en, ms) and `bounty_post_draft` (en) looked up 「＋ 地点」 and 清空草稿 without scrolling, so they were off screen | wrong selection    | The cases call `form_scroll_to` first. Step 9's selection picked cases whose sticker changed, not those that reach rows below the new art; the Pace bullet "a screen's layout" covers it, so no new rule, noted here |
| 2   | `bounty_applicant_block` long-pressed the middle of Hana's row after the 没屏蔽成功 notice had pushed it under the pinned hold button                                                                                              | test bug           | The case scrolls the row clear of the button (en needed it; the first fix only pressed the visible part), then scrolls back so the minimised tab bar returns |
| 3   | In dark, the plain-card check in `bounty_board_list` counted the tea drawing's red straw as the urgent colour                                                                                                                    | check too wide     | The check reads only the time line, located from the urgent card                                                                                                                                                         |
| 4   | The small-fixes retro (#34) did not add its row to the index                                                                                                                                                                      | missed step        | Row added here                                                                                                                                                                                                           |
