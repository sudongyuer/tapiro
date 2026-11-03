---
branch: docs/chat-research
date: 2026-11-03
pr: chat reference research
title: chat reference research and canvas review for questions 117-128
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: chat reference research

## Core (mandatory)

| Dimension | Measure                 | This step                                                         |
| --------- | ----------------------- | ----------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                           |
| Quality   | Vacuous checks          | 1: `format:check` does not cover Markdown (see 1)                 |
| Quality   | Skipped verifications   | Code checks and smoke: docs only; canvas not rendered (type rule) |
| Speed     | Wall-clock              | About 1 h, mostly web research                                    |
| Autonomy  | Avoidable interventions | 0                                                                 |
| Autonomy  | Rulings made            | 1: question 125 ★ moved from A to B after research                |
| Loop      | Minutes on this retro   | 3                                                                 |

## Problems and root causes

| #   | What happened                                                                                                                         | Root cause class    | Change and layer                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | `bun run format:check` passed without looking at the new research file: it only globs `src/**/*.{ts,tsx}`, `app.json`, `package.json` | test bug            | No change in this PR; ran `prettier --write` on the file by hand. Candidate: add `docs/**/*.md` to the check |
| 2   | The `require-retro` PR hook reads the session's cwd (the main checkout, on `main`), so a retro on a worktree branch cannot satisfy it | implementation bug  | Cross-project hook; listed for the owner, not changed here                                                   |
| 3   | Most help centres (WhatsApp, Carousell) render client-side or did not surface; 闲鱼 store frames show no chat                         | outside environment | Recorded under Unreachable in the research; App Store frames and HIG JSON used instead                       |

## Candidates (first occurrence, not yet generalised)

- `format-check-md`: Prettier check should include Markdown docs.
- `retro-hook-worktree-cwd`: the retro hook should resolve the branch from the directory the `gh pr create` runs in.

## Kept (worked well)

- Apple HIG text via `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`.
- App Store screenshots through the iTunes Lookup API gave the one primary view of Carousell's chat.
