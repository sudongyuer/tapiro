---
branch: fix/ui-polish-ask
date: 2026-11-17
pr: UI polish audit, 问小貘 (ASK-2 to ASK-11, 13 to 16, 19, 20; G2-2 for its switches)
title: sixteen audit findings fixed; seven cases failed on helpers the polish round deleted, found only by a Simulator run
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: UI polish, 问小貘 (2026-11-17)

Fixes from the UI audit of 2026-11-16 for the 问小貘 sheet, 我的 → 小貘 and 小貘记得. The first session ran out of quota
after its second fix round; a second agent finished the branch.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                     |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                             |
| Quality   | Vacuous checks          | 0; the new 添加一条 check reads luma 0 on the audit's capture of the full list and fails there                |
| Quality   | Skipped verifications   | ASK-17 not changed (system list spacing); no device run; the real speech engines stay device-only             |
| Speed     | Wall-clock              | Second session about 1 h, of which about 25 min waiting for the shared Simulator lock and 22 min of case runs |
| Autonomy  | Avoidable interventions | 0                                                                                                             |
| Loop      | Minutes on this retro   | 5                                                                                                             |

## What happened

| #   | What happened                                                                                                                                                                                            | Root cause class | Change and layer                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The second fix round rewrote `verification/ui/ask.py` and dropped `turn`, `footer` and `toggle_on`; nine cases import them and seven failed with ImportError on the Simulator, two rounds after the edit | process          | Helpers restored. Candidate check for `escalate-correction`: a unit test (or CI step) that every name a case imports from a `verification/ui` helper module exists; a 30-line AST script did it here in 1 s |
| 2   | ASK-14 (the disabled 添加一条 in full ink at 50 entries) was in the audit but not in the round's commit                                                                                                  | process          | Fixed with the tertiary style; the case asserts the drawn ink                                                                                                                                               |
| 3   | Five runs passed only on the retry: lost typed text (「the prompt never read parcel」, twice), AXe session loss and a keyboard that never showed; load average was 60 when the batch started             | outside          | None; tags `axe-typing-lost`, `axe-session-lost`                                                                                                                                                            |

## Carry forward

- After editing a shared case helper, run the import check over every case before the Simulator: an ImportError costs a
  full run per case and per appearance.
