---
branch: fix/board-tier-ms
date: 2026-11-09
pr: the board card and the map card show the poster's tier whole in ms
title: Measured first; the fixture never carried the longest tier, and OCR misread ms
escaped: pending
rework: 0
interventions: 0
overturned: pending
---

# Retro: board tier in ms

## Selection

| Cases                    | Runs              | Reason                                                      |
| ------------------------ | ----------------- | ----------------------------------------------------------- |
| `bounty_board_worst`     | ms, zh-Hans light | The card foot changed; ms carries the longest tier and name |
| `bounty_board_map_worst` | ms, zh-Hans light | The map card's back changed the same way                    |
| smoke                    | zh-Hans light     | Every PR                                                    |

No dark run: no colour, token or surface changed. No en run: no copy key added (one unused key removed).

## Findings

| Finding                   | Measured                                                                                                              | Outcome                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Board card tier cut in ms | Unfixed build, iPhone 17 Pro: OCR read 「Sangat Boleh D…」 and 「Nur…」 beside 申请 (89 pt)                           | Fixed, P12: name over tier       |
| Map card back, same line  | `{name} · {tier}` on one line, so a 40-character name pushed the tier out                                             | Fixed the same way               |
| After the fix             | ms tier read whole, 171.2 pt with the heads (130.8 pt text intrinsic); the column is 209 pt at 402 pt, ~182 pt at 375 | Pass, ms and zh-Hans, both cases |
| Other `TierMark` sites    | `ApplicantRows`, `SelectedSummary` already `fixedSize` + `layoutPriority(1)`; `DetailRows` has its own line           | No change                        |

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                         |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending                                                                                                           |
| Quality   | Vacuous checks          | 0; the new tier check failed on the unfixed build                                                                 |
| Quality   | Skipped verifications   | 375 pt: the runner owns only iPhone 17 Pro Simulators and must not create others; computed from the 402 pt frames |
| Speed     | Wall-clock              | About 60 min                                                                                                      |
| Autonomy  | Avoidable interventions | 0                                                                                                                 |
| Loop      | Minutes on this retro   | 4                                                                                                                 |

## Problems and root causes

| #   | What happened                                                                                                                                  | Root cause  | Fix                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| 1   | The worst board's poster was 貘友 (「Kawan Tapir」), not the longest tier, so no case could have shown the cut; the unit test pinned that tier | fixture gap | The worst poster is 很靠谱; the fixture test asserts it   |
| 2   | [ocr] `bounty_board_worst` failed in ms before the new check: Vision read 「+42 lebin jaun」 with zh-Hans first                                | check gap   | `ocr.lines_in` adds an en-US-first read for Latin locales |
| 3   | [ocr] `bounty_board_map_worst` in ms: 「Lihat Butıran」 (Turkish dotless i) from the en-US read                                                | check gap   | `ocr.lines` folds ı to i                                  |
