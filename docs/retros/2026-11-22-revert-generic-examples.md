---
branch: revert/generic-examples
date: 2026-11-22
pr: revert #229; form, ride and 问小貘 examples go back to what they were
title: Examples changed beyond the owner's request
escaped: 0
rework: 1
interventions: 1
overturned: 1
---

# Retro: revert generic examples

## Core (mandatory)

| Dimension | Measure               | This step                                                    |
| --------- | --------------------- | ------------------------------------------------------------ |
| Quality   | Escaped defects       | 0: reverted before any TestFlight build                      |
| Quality   | Skipped verifications | No UI run: the revert restores copy the cases already passed |
| Speed     | Wasted time           | One PR and a 20-minute Simulator run                         |
| Autonomy  | Interventions         | 1: the owner said examples were not to be changed            |

## Findings

- #226's veto list offered three example spots; #229 changed those plus every other example it found (问小貘 chips,
  welcome cards, study and queue examples, the icon). The owner's direction was about positioning, not examples. Tag
  `scope-from-offer`: a follow-up chosen from a veto list changes only the items listed; anything found beyond them is
  listed again, not changed.
