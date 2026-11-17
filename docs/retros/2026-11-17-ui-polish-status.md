---
branch: fix/ui-polish-status
date: 2026-11-17
pr: UI polish audit, bounty apply, applicants and status (BS-4–10, 12, 14)
title: nine audit findings fixed; review before the PR caught the no-payee card cut mid-sentence while its case passed
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: UI polish, bounty apply, applicants and status (2026-11-17)

Fix the audit's apply, applicant and status findings that need no owner answer. Finished by a second agent after the
first ran out of quota with the code committed and the runs done.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                                             |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                                                                     |
| Quality   | Vacuous checks          | 1: `bounty_apply_no_payee` passed with the body cut at the card edge; it now reads the body's last characters by OCR inside the card, which fails on the earlier shot |
| Quality   | Skipped verifications   | en (no copy changed); dark only for the cases whose colours changed; BS-13 checked by frame arithmetic, not on a device                                               |
| Speed     | Wall-clock              | Finishing about 2 h: a 35 s incremental build, 10 min of runs, the rest waiting for the shared Simulator lock                                                         |
| Autonomy  | Avoidable interventions | 0                                                                                                                                                                     |
| Loop      | Minutes on this retro   | 5                                                                                                                                                                     |

## What happened

| #   | What happened                                                                                                                                   | Root cause class | Change and layer                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | The no-payee card's body ran on one line past the card edge; the case only compared the VoiceOver label, which holds the whole text             | check design     | `StateRow` gives the RN card the row's width; the case asserts the drawn text by OCR. Tag `rnhost-unwrapped-width` |
| 2   | `TaskCard` already carried the same lesson (an RN row inside `RNHostView` in a Form row is measured unwrapped); `StateRow` was moved without it | process          | The width now lives in `StateRow` itself, so every inline card in a Form row gets it                               |
| 3   | About 1 h 50 min waiting for the Simulator lock held by two other finishing agents                                                              | outside          | None; batches queue behind the lock and retry every 5 min                                                          |

## Next

- Owner questions stay in the plan: BS-1 (no cancelled state drawn), BS-2/BS-3 (system confirmation presentation), P10 (the 有问题 step).
- BS-11 and BS-16 are cross-app follow-ups (pinned bar spacing, page-sheet grabber).
