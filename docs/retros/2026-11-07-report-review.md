---
branch: feat/report-review
date: 2026-11-07
pr: report a review (259 A)
title: Long-press a review to report it, with its copy kept and a hidden reviewer kept hidden
escaped: pending
rework: 2
interventions: 0
overturned: pending
---

# Retro: report a review (259 A)

## Selection

| Cases                                               | Runs          | Reason                                                  |
| --------------------------------------------------- | ------------- | ------------------------------------------------------- |
| `profile_report_review*` (three)                    | zh-Hans light | New long-press, sheet copy and block offer              |
| `profile_other`, `_self`, `_reply`, `_report_block` | zh-Hans light | `ReviewRow`, `ProfileReportSheet` and the fixture moved |
| `profile_report_review*`                            | en            | New copy keys                                           |
| `profile_report_review`                             | ms            | Longest footer                                          |
| `profile_report_review`                             | dark          | The sheet and menu over the profile                     |
| smoke                                               | zh-Hans light | Asked for every PR                                      |

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                       |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending                                                                                         |
| Quality   | Vacuous checks          | 2 removed: a poll for no call with nothing flushed yet, a delete of messages that never existed |
| Quality   | Skipped verifications   | Device: VoiceOver opening the long-press menu (the Simulator's tree cannot show it)             |
| Speed     | Wall-clock              | About 1.5 h                                                                                     |
| Autonomy  | Avoidable interventions | 0                                                                                               |
| Loop      | Minutes on this retro   | 4                                                                                               |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                | Root cause class | Change and layer                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `reports_person_once` covers every row with no message, so a review report would have merged with a person report; a nulled foreign key would then have blocked account deletion                             | own gap          | `review_id` has no foreign key and the index skips it; pgTAP covers both deletions               |
| 2   | Review found the same collision already live on the message side                                                                                                                                             | older bug        | `reports.message_id` lost its foreign key for the same reason                                    |
| 3   | A named target on a review would have told a caller who wrote a hidden ride review                                                                                                                           | own gap          | The server refuses any target with a review; pgTAP asserts right and wrong guesses read the same |
| 4   | The sheet read the review live from the store, so a refresh could lose a later page's review while it was open                                                                                               | own gap          | The sheet pins the review it opened with                                                         |
| 5   | A Python patch script stopped half-way on an anchor Prettier had reindented, after applying its first edits                                                                                                  | own gap          | Rerun only the rest; check what landed before running a patch again                              |
| 6   | `profile_report_review_self` tapped 回复 straight after the drag and the tap landed on nothing; passed with `at_rest` first. `en` `_all` hit the automation-session timeout at load 366; passed on the rerun | own gap, outside | `ui.at_rest()` before the tap; rerun once as the notes say                                       |
| 7   | A chained run used `$R` for the runner: zsh does not split it, so four runs exited 127 and only the exit codes showed it                                                                                     | own gap          | Write the commands out; read the exit codes before reading logs                                  |

## Review findings

One round, one Important (older): two message reports on one sender could block that sender's deletion. Fixed in the
migration. Minor, all fixed: the pinned review; a gone review now closes the sheet; a blocked reviewer is no longer
offered; 44 pt rows; a VoiceOver hint; `ms` uses penilaian, the quote title reads 要举报的评价 and the quote breaks lines;
review 4 is now a real hidden ride review; reviewer deletion tested; the queue shows the item; stale plan lines.
