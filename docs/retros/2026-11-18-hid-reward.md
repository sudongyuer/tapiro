---
branch: fix/hid-numeric-fields
date: 2026-11-18
pr: the reward "typed by HID but not taken" report was the field's placeholder; bounty.typed refuses placeholder text
title: No product bug in the numeric fields; a case read the placeholder 0 as typed text
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: HID digits in the reward field

Status 0f (2026-11-18) recorded that HID digits typed into the post form's reward put `0` in the field while the form
still said 填一下赏金, and asked whether the form drops hardware-keyboard input.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                 |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                         |
| Quality   | Vacuous checks          | 1 found and removed: `typed(ui, 'bounty-post-reward', '0')` passed with nothing typed                     |
| Quality   | Skipped verifications   | A real Bluetooth keyboard on a device (the Simulator pad drops AXe's HID keys before the field sees them) |
| Speed     | Wall-clock              | About 2 h 30 min, most of it waiting for the shared Simulator lock                                        |
| Autonomy  | Avoidable interventions | 0                                                                                                         |
| Loop      | Minutes on this retro   | 5                                                                                                         |

## What happened

| #   | What happened                                                                                                                                                                                                                                                          | Root cause class | Change and layer                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Probe (evidence `docs/research/evidence/2026-11-18-hid-reward/`): reward focused, number pad on screen, HID `5` sent; the field kept its grey placeholder and its AXValue stayed `0`, then 下一步 showed 填一下赏金. Same with the hardware-keyboard defaults set to 1 | check design     | No product change: the keys never reached the field, and the form was right that it was empty                                                       |
| 2   | An empty reward field reports its placeholder `0` as AXValue, so `typed(..., '0')` returned at once; the HID fallback "put 0 in the field" only in the AX tree                                                                                                         | check design     | `bounty.typed` asserts the expected text is not the field's placeholder; `bounty_post_form` types `00` for the zero reward. Tag `placeholder-value` |

Every numeric field (reward, payee phone and account, ride estimate, split amounts, share estimate) is a
`SyncedTextField`, and every submit path calls `sync()`, which reads the native text; `textSync.test.ts` already covers a
keystroke that arrives without its event. No case types a value equal to another field's placeholder (ride estimate `0`
and split `0.00` are never typed as such).
