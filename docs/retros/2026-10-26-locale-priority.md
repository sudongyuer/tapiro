---
branch: chore/locale-priority
date: 2026-10-26
pr: not opened yet
status: complete before PR
---

# Retro: language order and English coverage

## Core (mandatory)

| Dimension | Measure                                                       | This step                                                                                     |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Quality   | Defects escaping review (walkthrough, CI, after merge)        | pending (payment walkthrough next)                                                            |
| Quality   | Checks that could not fail (vacuous)                          | 2 found by the first `en` run: substring matches that only held in zh-Hans                    |
| Quality   | Skipped verifications / open device checks / new known limits | ride and bounty fixture titles in `src/lib/liveItems.ts` stay Chinese in `en` runs            |
| Speed     | Wall-clock first commit to PR; budget vs actual               | ~4 h, of which the milestone matrix 146 min (242 runs, 237 pass, 5 fail, all 5 pass on rerun) |
| Speed     | Wasted time by class                                          | ~30 min reading a block-buffered log as a stall (`log-buffered`)                              |
| Speed     | Rework rounds                                                 | 0                                                                                             |
| Autonomy  | Avoidable interventions                                       | 1: the user had to state the language order                                                   |
| Autonomy  | Rulings made / overturned                                     | 1 (cases assert copy through keys) / 0                                                        |
| Loop      | Minutes spent on this retro                                   | ~5                                                                                            |

## Candidates

1. No case had ever run in `en`, the second most used language; the order was never written down, and `ms` was
   treated as the second language because truncation cases used it. Fixed at the lowest layer: the runner adds
   `en` to every milestone run and cases read copy through `ui.t(key)`; the order is in AGENTS.md.
2. `pay_card_button` asserted the short button text inside the accessibility label; `payee_list` took the
   minimum y of every element with a menu label, which picked a background row in English. Both passed in
   zh-Hans by coincidence. Tag `locale-coincidence`. Candidate: a review checklist line "an assertion on copy
   names the element it reads".
3. `run.py` output to a file is block-buffered, so the milestone log looked stalled for 30 min while cases kept
   running. Tag `log-buffered`. Candidate: run the runner unbuffered (`python3 -u` in `package.json`, or
   `flush=True`) so a log tail shows progress.
4. `home_one_card` zh-Hans dark failed with `axe describe-ui failed:` and an empty error; the screenshot shows
   the right screen and the light run passed. Load average 8.9–12.8 at the time. Tag `axe-empty-error`; rerun
   alone after the matrix. If it recurs, the driver should retry a describe-ui that returns no error text once
   and log it.
5. `payee_add_bank` en dark: typing `1234564821` left `12345648` in the field (keystrokes dropped); the other four
   runs of the case passed; same load window. Tag `axe-dropped-keys`. With item 4 this is the second
   tool-under-load class this run; if either recurs on the rerun, `ui.type` should verify the field value and
   retype once, and the runner should record load average in `result.json`.
   Recurred in ms dark (`123456482`) at load 6.8, so load is not the explanation. The field is an `@expo/ui`
   SwiftUI `TextField` whose `onTextChange` re-renders React per keystroke; `axe type` bursts keys with no
   delay. Hypothesis: burst HID typing loses trailing keys. Fix after the matrix (the driver is in use):
   paced `key-sequence` for ASCII input, then rerun en/ms dark. Not a retry. Result: en dark, ms dark and the
   zh-Hans light control all pass with paced typing; `home_one_card` passed alone (first occurrence, no fix).
6. Canvas: "这个应该盖在贴纸上" was read as "stamp it" and produced a stamp the user disliked; the intent was
   layering. Ambiguous one-line feedback on a design gets one restated interpretation before a redraw.

7. Review (one round, no Important): upper-case and space input still goes through burst `axe type`
   (`TANMEILING`, `Lin Mo`); if `axe-dropped-keys` recurs there, map shift + letter in `HID_KEYCODES`. Fixed in
   this PR: string export now runs under the Simulator lock, and named-case runs stay zh-Hans unless `--locales`.

## Rules and skills

- Helped: Data integrity (none applicable); the tiered run caught both locale bugs on the first pass.
- Violated: none recorded yet.

## Kept (worked well)

- Delegating the 32-case migration to one subagent with a narrow brief while the canvas work continued.
