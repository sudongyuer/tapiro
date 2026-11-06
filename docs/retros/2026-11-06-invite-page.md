---
branch: feat/invite-page
date: 2026-11-06
pr: invite page (plan Task 10)
title: 我的 → 邀请朋友 with my code, 复制, 分享, the code field, progress rows and five cases
escaped: pending
rework: 3
interventions: 0
overturned: pending
---

# Retro: invite page (Task 10)

## Selection

| Cases          | Runs                                | Reason                                         |
| -------------- | ----------------------------------- | ---------------------------------------------- |
| `invite_*`     | zh-Hans light, en; dark once (page) | New screen, new 我的 row and new copy keys     |
| `invite_worst` | ms                                  | Longest copy and the 41-character invited name |
| smoke          | zh-Hans light                       | 我的 changed for every signed-in case          |

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                         |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | pending                                                                                                                           |
| Quality   | Vacuous checks          | The pasteboard check could pass on a reused Simulator (an earlier paste left the same code there); it now writes a sentinel first |
| Quality   | Skipped verifications   | Device: the real system share sheet (verify records the text at the boundary); double-submit by Return (AXe key events drop)      |
| Speed     | Wall-clock              | About 2.5 h                                                                                                                       |
| Autonomy  | Avoidable interventions | 0                                                                                                                                 |
| Loop      | Minutes on this retro   | 4                                                                                                                                 |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                                                                                           | Root cause class            | Change and layer                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `invite_worst` failed: 好 was a 17 × 20 pt target; a default-style Button in a Form row also made the whole row (beside the field) submit (review) (tag: form-row-button)                                                                                                               | own gap                     | Borderless, with a 44 pt label frame; the case asserts the target. Other Form-row buttons in the repo already set a style                                                                                                          |
| 2   | 已经填过 / 完成第一单后 refusals reload the page, which removes the field and its error footer, so the reason flashed away (review)                                                                                                                                                     | own gap                     | Those two show as a card at the top until the page closes; `redeemTooLate` fixture point and a case segment                                                                                                                        |
| 3   | The pasteboard assertion in `invite_page` could not fail on a reused Simulator (review)                                                                                                                                                                                                 | vacuous check               | Sentinel write before 复制                                                                                                                                                                                                         |
| 4   | A long inviter name would have cut the code in 「{name} 的码 {code}」 (review)                                                                                                                                                                                                          | own gap                     | The code moved to the trailing status                                                                                                                                                                                              |
| 5   | After the round-2 fixes the spinner lost its identifier (`frame` before `accessibilityIdentifier` on a ProgressView), and `invite_redeem` failed with Missing invite-sending                                                                                                            | own gap (modifier order)    | Accessibility modifiers before `frame`; the case caught it                                                                                                                                                                         |
| 6   | `Tapiro Verify 3` then timed out creating the automation session on 10 of 16 runs, twice in a row, at load average 3–7 (tag: automation-session-timeout); `Tapiro Verify 2` passed the same cases at once                                                                               | environment (one Simulator) | Moved the runs to `--udid` Verify 2; no code change                                                                                                                                                                                |
| 7   | The screenshots showed what no assertion caught: `borderedProminent` left 分享 white on the cream accent in dark and hid its icon in light; both reviews read the code and missed it too (tag: prominent-on-accent)                                                                     | own gap (no pixel check)    | `PillButton`, equal and icon-free as drawn; `invite_page` asserts label contrast by pixels in light and dark. `TimePicks`, `RewardSection` and `FormTime` use the same style without `--color-on-accent`: listed, not checked here |
| 8   | `invite_redeem_error` failed once with 「sent again on its own」: the check also fired on 0 rows, because the call log had not reached the plist yet; 3 reruns recorded one redeem (tag: record-lag)                                                                                    | vacuous-in-reverse check    | The case waits for the first call, then checks no second follows, and prints the calls                                                                                                                                             |
| 9   | The cut session left a recording open in `Tapiro Verify 2`, so each run said 「video missing」 (`A recording is already in progress`) (tag: orphan-recording)                                                                                                                           | environment                 | `simctl shutdown` of that Simulator cleared it; read the recorder error before rerunning                                                                                                                                           |
| 10  | `invite_page` in en caught the pills 4 pt apart (Copy vs Share): `flex: 1`, and `flexBasis: 0` with `minWidth: 0`, both still let the label width in                                                                                                                                    | own gap                     | Each pill is 48 % of the row; the width assertion added in row 7 found it                                                                                                                                                          |
| 11  | `Tapiro Verify 2` also timed out on the first read of a run five times later on (`app_launches` twice, `invite_redeem` twice, `invite_page` once), load average 4–9; each passed on a rerun, so the timeout follows the Simulator session, not a case (tag: automation-session-timeout) | environment                 | Rerun once as briefed; no code change. Two agent sessions were cut mid-run, which cost two rebuild-free restarts; the branch is now committed before long runs                                                                     |

## Review findings

Round 1: 0 Critical, 3 Important (rows 1–3), 7 Minor (copy and share enabled with no code; a copy failure unhandled;
row 4; `coinsStore.redeem` stuck in sending if a service throws; a null-order bug in a case helper; no failed-load case,
no back/deselect check; README missing the coins fixtures). All fixed. Round 2: 0 Critical, 0 Important, 4 Minor (the stored code kept after a too-late refusal; an old failure shown after leaving mid-send; the refusal card not announced; the spinner narrower than 好). All fixed.
