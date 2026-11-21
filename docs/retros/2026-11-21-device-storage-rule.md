---
branch: docs/device-storage-rule
date: 2026-11-21
pr: device storage is checked before every install
title: A once-per-loan storage check did not hold across six installs
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: device storage rule

## Core (mandatory)

| Dimension | Measure               | This step       |
| --------- | --------------------- | --------------- |
| Quality   | Escaped defects       | 0               |
| Quality   | Skipped verifications | None; docs only |
| Speed     | Wasted time           | None            |
| Autonomy  | Interventions         | 0               |

## Findings

- The rule asked to «read the device's free storage», which `devicectl` cannot do, so the check fell to the owner
  reading Settings once per loan. Six reinstalls later the phone was full. The rule now makes each build's first install
  the check and requires scripts to stop on the first failed install.
- The lower layer was considered: a hook cannot read device storage either, so the guarantee sits in the measuring
  scripts (`perf-artifacts/run.sh` and `campaign.sh` now stop and print the install error) plus the rule.
