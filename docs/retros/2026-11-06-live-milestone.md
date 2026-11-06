---
branch: fix/live-milestone
date: 2026-11-06
pr: live updates milestone run
title: The live updates milestone run, and scroll and OCR fixes for two cases on iOS 27.2
escaped: 0
rework: 4
interventions: 0
overturned: 0
---

# Retro: live updates milestone run

## Selection

| Cases                                                                                            | Runs              | Reason                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `live_applicants`, `live_home_card`, `live_notice_tap`, `live_push_token`, `live_detail_expired` | zh-Hans light     | The feature's own cases; written in #66 and #71 and never run                                                              |
| `bounty_applicants`, `bounty_applicants_worst`                                                   | zh-Hans, ms light | 挑人 gained the arrival motion and the offline section; `worst` and `ms` cover the longest copy under the pinned button    |
| `bounty_status_states`                                                                           | zh-Hans light     | The status screen gained the offline section and live reloads; this case covers its states and the refresh-failed notice   |
| `ride_detail`                                                                                    | zh-Hans light     | The ride detail gained the offline line and live reloads                                                                   |
| `home_live`, `home_bounty_cards`, `home_settled_card`, `home_fan_out`                            | zh-Hans, ms light | Home's card, payment and settled stores now reload on signals (answer order, foreground rule); one case per card family    |
| `live_applicants`                                                                                | en light          | The only case that shows the new `live.offline` key; `live.staleAt` and `account.settings.signingOut` show in no live case |

Dark was not run: no colour, token or overlay changed. `live_*` cases other than the two that declare `ms` ran in zh-Hans
only.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                                       |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                                         |
| Quality   | Vacuous checks          | 0 added: the OCR match still fails when a verb or the tail is cut, and `home_fan_out` still needs a hidden check within 60 pt and the accessory |
| Quality   | Skipped verifications   | Dark (no visual change); `en` beyond `live_applicants`                                                                                          |
| Speed     | Wall-clock              | About 1.5 h; about 40 min on the two case fixes and their reruns                                                                                |
| Autonomy  | Avoidable interventions | 0                                                                                                                                               |
| Loop      | Minutes on this retro   | 5                                                                                                                                               |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                                                    | Root cause class                                   | Change and layer                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `home_fan_out` (the SDK 58 retro's open item): closest hidden check 74.7 pt (limit 60), then in ms 16 steps stuck 77 pt from the bar. Measured: a 40 pt `axe swipe` scrolls 0 pt, a 300 pt one 385 pt; a held drag moves its distance less ~10 pt                                                | environment (iOS 27.2 gesture physics), not layout | `gestures.drag` (held `axe drag`); the case stops long steps 100 pt short and aims short ones inside the check. Passed zh-Hans and ms                                                                                                                |
| 2   | `bounty_applicants_worst`: OCR read the intact hold label 按住，选 as 接住，and Tahan untuk pilih as Tanan untuk piih (the screenshot shows it intact)                                                                                                                                           | check design                                       | The verb check matches parts by edit distance within a fifth of their length; a cut still fails (unit-checked by hand on cut and intact strings)                                                                                                     |
| 3   | The same case's `reveal` swiped one way only, so a fling carried the target row past the top and it never came back                                                                                                                                                                              | check design                                       | `reveal` drags (no fling) and scrolls back when the row is above the top. Passed zh-Hans and ms on `Tapiro Verify 3`                                                                                                                                 |
| 4   | `home_bounty_cards` timed out creating the automation session three times on `Tapiro Verify` and once on a freshly booted `Tapiro Verify 2` (load average 5–73; the app idle at 0.5% CPU). Probes on Verify 2 read the fanned tree fine                                                          | environment                                        | Reran on the warm `Tapiro Verify 2`; passed. Tag `automation-session-timeout`                                                                                                                                                                        |
| 5   | Two later `bounty_applicants_worst` runs on `Tapiro Verify 2` lost a tap (a board card, then an applicant row) and one timed out creating the session (load average 3–4)                                                                                                                         | environment                                        | Reran on `Tapiro Verify 3`; both locales passed. Tags `axe-tap-drop`, `automation-session-timeout`                                                                                                                                                   |
| 6   | One review round: 2 Important (a 4-character verb allowed one edit, so 按住，…来帮你 passed; near steps over 80 pt ran as long drags that can carry on 50 pt), 5 Minor (reveal read a moving frame, a wrong comment, a fifth that was a quarter, a fixed first step, unnamed margins); all fixed | own gaps                                           | Each label end is matched with the two name characters beside it (cut strings fail by hand); near steps are slow 40-step drags; reveal waits for rest; the first step comes from the fanned frames. Both cases passed zh-Hans and ms after the fixes |

## Notes

- `live_applicants`, the known intermittent of 2026-11-04, passed 3 of 3 (zh-Hans, ms, en); the README note records it.
- Seen in the screenshots, not changed: on 挑人 the 「按住约 1 秒…」 line under the pinned hold button sits over the scrolling
  rows with only the soft edge behind it, and on the status screen the glass 发消息 button sits over the timeline. Both
  read, but less cleanly than on iOS 26; worth a look in the owner's walkthrough.
- `Tapiro Verify` timed out creating the automation session on every run in this step; `Tapiro Verify 3` ran clean.
