---
branch: worktree-agent-abde2a888a32cf25d
date: 2026-11-21
pr: UI audit batch E, the remaining Minor flow findings (N2, N3, N4, H6, H9, B1, D3, R2, O4, Consistency 4–6)
title: Ten small flow fixes, two kit changes
escaped: 0
rework: RESULT_REWORK
interventions: 0
overturned: 0
---

# Retro: UI audit batch E

## Core (mandatory)

| Dimension | Measure               | This step     |
| --------- | --------------------- | ------------- |
| Quality   | Escaped defects       | 0             |
| Quality   | Skipped verifications | RESULT_SKIPPED |
| Speed     | Wasted time           | RESULT_WASTED |
| Autonomy  | Interventions         | 0             |

## Findings

- `sessionLifetimes.test.ts` caught the new module-level `safetyNotes` store without a declared lifetime on the first
  `bun test`. The guard works as designed; no new rule.
- Two old assertions were the opposite of the fix: `home_calm` asserted the chips were not buttons, and the board
  helper found 申请 by the ink accent. A fix that overturns an earlier design has to search the cases for the old
  behaviour, not only the code. Tag `case-encodes-old-design`. First occurrence; watch for a second.
- The worktree guard refuses compound shell commands (heredocs with backticks, `$(git …)`); scripted edits went through
  files in the scratchpad. Cost a few minutes; known.
RESULT_FINDINGS
