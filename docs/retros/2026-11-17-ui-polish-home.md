---
branch: fix/ui-polish-home
date: 2026-11-17
pr: UI polish audit, home and shell (HOME-1, -2, -4, -8)
title: four audit findings fixed in one round; about 75 min of the step waiting for the shared Simulator lock
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: UI polish, home and shell (2026-11-17)

Fix the audit's home findings that need no owner answer: the bubble's width per pose, 「+」 over the stage in dark mode,
the stale back title after a language switch, raw paddings.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                              |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                                      |
| Quality   | Vacuous checks          | 0; the bubble and 「+」 thresholds were set on the audit's screenshots, where the old build fails (bubble 230 pt wide, glass luma 176) |
| Quality   | Skipped verifications   | `home_one` not run (its bubble is one short line); dark only for `home_status_bar`; no device run                                      |
| Speed     | Wall-clock              | Stage 2 about 1 h 45 min: 10 min build, 12 min of runs, about 75 min waiting for the Simulator lock held by another capture            |
| Autonomy  | Avoidable interventions | 0                                                                                                                                      |
| Loop      | Minutes on this retro   | 5                                                                                                                                      |

## What happened

| #   | What happened                                                                                                                                                             | Root cause class | Change and layer                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | `lint:changed` and `format:check` failed once: a scripted edit left a style line over the print width in `CalmCard.tsx`                                                   | process          | Already a rule (run `format:check` after scripted edits); it caught it. Tag `scripted-edit-format`         |
| 2   | The narrower bubble needs four lines for a 40-character name in en and ms; found before the Simulator by wrapping the lines with CoreText on macOS, confirmed in the runs | check design     | The cap went to four lines with the fourth growing upward; `stage.py` reads the last word by OCR           |
| 3   | Both ms runs failed first with 「video missing」 right after the Simulators booted and passed on the retry; the cases themselves passed both times                        | outside          | None; load average was 236 with another agent's build and captures running. Tag `video-missing-after-boot` |
| 4   | Smoke: `sign_in_fixture` lost the AXe automation session once and passed on the retry                                                                                     | outside          | None; same load. Tag `axe-session-lost`                                                                    |
| 5   | About 75 min waiting for the Simulator lock                                                                                                                               | process          | The build now runs before the lock is taken (coordinator's change this round)                              |

## Next

- Owner question in the PR: stale back titles in other tabs' pushed screens after a language switch (★ leave).
