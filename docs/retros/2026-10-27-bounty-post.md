---
branch: feat/bounty-post
date: 2026-10-27
pr:
status: complete before merge
---

# Retro: bounty step 3 manual posting

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                                                                                                      |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | review: 3 Important (13A 去付款 sheet-on-sheet; changed replay of a committed post shown as success; draft kept after account deletion), 12 Minor; all fixed or ruled          |
| Quality   | Checks that could not fail (vacuous)                          | 2 UI cases (optional time, no-balance tap); repaired. Double-tap guard kept without a test (not reproducible on the Simulator)                                                 |
| Quality   | Skipped verifications / open device checks / new known limits | en and milestone matrix not run; counter counts code points (no `Intl.Segmenter` in Hermes); `bounty_post_optional` can roll over near midnight; en/ms copy review pending     |
| Speed     | Rework rounds                                                 | 1                                                                                                                                                                              |
| Autonomy  | Avoidable interventions                                       | 1: the tier question was asked mid-turn and the user had to ask where it was (twice)                                                                                           |
| Autonomy  | Rulings made / overturned                                     | replay rejects changed content with `post_already_sent` and the notice 「上次那条已经发出去了」; confirm card rebuilt in `@expo/ui` SwiftUI; system control heights left as is |

## Candidates

1. RN `Settings` drops null keys, so "clear" silently did nothing and the draft came back on relaunch; found only by a
   relaunch UI case. Tag `platform-null-key`. Candidate: AGENTS.md platform pitfall "clear Settings keys with '', not null".
2. Reading an `@expo/ui` TextField after its view is removed throws and crashed the app on sheet close. Tag
   `native-unmount-read`. Candidate: platform pitfall.
3. Idempotent replay hid edited content (same id, different body). Tag `rule-interaction`. Review checklist candidate:
   every idempotency key states what happens when the payload changes.
4. The require-retro hook reads the session's checkout branch, so a PR from a second worktree was blocked although its
   retro existed. Tag `hook-worktree`. Fix the hook to resolve the branch from `--head` or the command's directory.
5. The merge of main duplicated the KICKOFF table (prettier realigned every row on both sides). Tag `table-merge`.
   Candidate: append decision rows without re-running prettier on the whole table, or resolve by normalised row.

## Kept (worked well)

- Running the tiers branch in a second worktree while this branch's UI was built; both finished the same day.
