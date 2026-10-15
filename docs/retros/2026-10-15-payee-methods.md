---
branch: feat/payee-methods
date: 2026-10-15
pr: not opened yet
status: running (step not finished)
---

# Retro: foundation step 3 — payee methods

Running file: candidates are added as they appear; the core table is completed before the PR.

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                                                    |
| --------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | pending                                                                                                                      |
| Quality   | Checks that could not fail (vacuous)                          | 1: `payee_list` "cash above accessory" passed with 3 rows; fixed by `payee_long`                                             |
| Quality   | Skipped verifications / open device checks / new known limits | camera scan, real screenshot decode, per-wallet save-step names, character-counted lengths on a real DuitNow code            |
| Quality   | Acceptance criteria with no covering test and no device mark  | unknown: no story map yet                                                                                                    |
| Speed     | Wall-clock first commit to PR; budget vs actual               | pending (implement 73 min vs ~3 h budget; fix round 1 53 min vs 90; follow-ups 17 min vs 40)                                 |
| Speed     | Wasted time by class                                          | outside interference ~25 min (other projects' Simulators); full suite 104 min with 53 timeouts (cause under investigation)   |
| Speed     | Rework rounds                                                 | 2 (review → fix round 1 → follow-ups)                                                                                        |
| Autonomy  | Avoidable interventions                                       | 3 so far: wallets-over-banks came after implementation; the user raised coverage; the user asked where retro items were kept |
| Autonomy  | Rulings made / overturned                                     | pending                                                                                                                      |
| Loop      | Minutes spent on this retro                                   | pending                                                                                                                      |

## Candidates (first occurrence, not yet generalised)

1. The runner reports "Simulator unresponsive" from a 20 s timeout alone. That is an inference; the tools may be waiting for
   an idle app that the welcome screen's endless animations never reach. Investigation running.
2. No requirements-to-test traceability: suite completeness rested on judgment. Decided: user story map, traceability
   check and a generated canvas board (separate PR).
3. Product usage facts (wallets over banks) were never asked before the setup board. Ask "how do users actually do this"
   in step 0.
4. Promised retro items lived only in conversation context until the user asked where they were kept. Start the retro
   file when the first candidate appears, not at the end.
5. Ledger lines are free-form, so `retro-metrics.py` undercounts rulings and user decisions. Use the prefixes it expects
   (`Ruling:`, `User:`).
6. The new `require-retro` hook blocked a command whose heredoc text only mentioned `gh pr create`. Fixed in
   `~/work/claude` 8d99a81 with regression cases.

## Rules and skills

- Helped: Pace 20-minute time-box (outside stalls were not chased); review before the PR caught UTF-8 CRC, WeChat order
  codes, QR type switch and load states.
- Unused: pending
- Violated: pending

## Kept (worked well)

- Canvas decisions before implementation: six questions answered in one round.
