---
branch: fix/select-applicant-navigates-home
date: 2026-11-21
pr: the bottom accessory opens its item's own screen; 「去选」 lands on the applicants, not home
title: accessory opens the item
escaped: 1
rework: 0
interventions: 1
overturned: 0
---

# Retro: accessory opens the item

## Core (mandatory)

| Dimension | Measure               | This step                                                                                     |
| --------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 1 (owner, TestFlight 20261120.1739: 「点选人」 went back to home and nothing was selected)    |
| Quality   | Skipped verifications | Push-tap entry not driven on a device: neither phone had a Tapiro push in Notification Centre |
| Speed     | Wasted time           | ~40 min (B's phone path first; the poster's own phone held the state that showed the cause)   |
| Autonomy  | Interventions         | 1 (the 14 Pro auto-locked while driven; the owner unlocked it and set Auto-Lock to Never)     |

## Findings

- The select flow itself worked on both phones (home card → row → hold → `assigned` on hosted). Only the bottom accessory
  sent the poster home: on other tabs it read 「1 人申请，去选」 and opened the top of home by design (story-map
  `shell.accessory.tap`), and on the applicants screen it showed another bounty directly under the disabled 「先选一个人」
  button. The accessory now opens what its home card opens. Tag `strip-promise-vs-target`.
- Reproducing on the reporter's own device and account found it in three taps; B's phone had a different feed (one live
  item, so no accessory on the applicants screen). Ask for the reporter's device first when a bug depends on live
  state. Tag `repro-on-reporter-device`.
- A driven phone auto-locks mid-session. Before driving a phone, ask for Auto-Lock to be Never. Tag `device-auto-lock`.
