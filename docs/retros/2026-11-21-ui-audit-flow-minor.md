---
branch: worktree-agent-abde2a888a32cf25d
date: 2026-11-21
pr: UI audit batch E, the remaining Minor flow findings (N2, N3, N4, H6, H9, B1, D3, R2, O4, Consistency 4–6)
title: Ten small flow fixes, two kit changes
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: UI audit batch E

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                             |
| --------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                                                     |
| Quality   | Skipped verifications | `ms` and `en` dark; Settings 退出登录 left without a confirm (E9)                                                     |
| Speed     | Wasted time           | ~40 min queued on the Simulator lock; one Simulator automation timeout (dark `chat_translate_worst`, passed on rerun) |
| Autonomy  | Interventions         | 0                                                                                                                     |

## Findings

- `sessionLifetimes.test.ts` caught the new module-level `safetyNotes` store without a declared lifetime on the first
  `bun test`. The guard works as designed; no new rule.
- Two old assertions were the opposite of the fix: `home_calm` asserted the chips were not buttons, and the board
  helper found 申请 by the ink accent. A fix that overturns an earlier design has to search the cases for the old
  behaviour, not only the code. Tag `case-encodes-old-design`. First occurrence; watch for a second.
- The worktree guard refuses compound shell commands (heredocs with backticks, `$(git …)`); scripted edits went through
  files in the scratchpad. Cost a few minutes; known.
- Rework 1: 收起提醒 did nothing in the first UI run. The header subscribed to a version number it ignored and read
  `safetyNotes.hidden(...)` beside it; React Compiler memoised that call on unchanged arguments. Fixed by making the
  hidden set the store snapshot; no other discarded `useSyncExternalStore` result in `src/`. Tag
  `compiler-impure-read`: with the compiler on, a store value must come from the snapshot, never a getter beside it.
  Unit tests could not catch it (they test the store, not the hook); the UI case did.
- Rework 2: the board helper found the new grey 申请 pill by colour, and in ms anti-aliased grey text edges in the
  same quadrant matched (23 px across 65 pt). It now requires a filled area (500 px). Tag `pixel-colour-ambiguous`.
