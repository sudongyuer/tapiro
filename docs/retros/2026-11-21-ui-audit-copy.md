---
branch: fix/ui-audit-copy
date: 2026-11-21
pr: UI audit batch C, copy and terminology in all three locales
title: One name per thing in every locale
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: UI audit batch C (copy and terminology)

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                    |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 0 known                                                                                                      |
| Quality   | Skipped verifications | N4 not built (its only fix lives in the hungry card, which another session holds); see Findings              |
| Speed     | Wasted time           | ~5 min: the worktree had no `node_modules`, so the first `tsc` failed on a missing package until `bun install` |
| Autonomy  | Interventions         | 0; two mid-task file-lock updates from the coordinator, both honoured                                        |

## Findings

- The ms collisions (C2, C3) were not visible from any one file: the same concept lived in ten namespace files, each
  translated on its own day. A flattened zh/en/ms dump by key (regex over values) found every instance in seconds and
  is what made one-pass replacement safe. Tag `copy-drift`.
- Guarantee at the lowest layer: the terminology now lives in one table (`docs/design-language.md`, 「Terminology」)
  next to the voice rules, so a new string has a place to look up the word. A lint over locale values (for example,
  ms `Selesai` under a key named `settled`, or `Ganjaran` under `reward`) would be the next layer; not built here
  because the key names are not consistent enough for a rule to be precise. Candidate for a follow-up if drift
  recurs.
- Replacements ran as a scripted list of exact (file, old, new, expected count) edits that refused to write unless
  every count matched, so a string that had moved or appeared twice stopped the run instead of being half-changed.
- N4 (「先不翻译」 on the hungry card when the quota is hit from a translation) needs the card to know it was opened
  for a translation; the card is on another session's do-not-touch list, so the copy change waits for that PR.
