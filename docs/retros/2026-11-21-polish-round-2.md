---
branch: feat/polish-round-2
date: 2026-11-21
pr: status step bounce, ride form section motion, cached formatters, device guard
title: A measuring agent uninstalled the app and rebooted the owner's iPhone
escaped: 0
rework: 2
interventions: 0
overturned: 0
---

# Retro: polish round 2

## Core (mandatory)

| Dimension | Measure               | This step                                                                                            |
| --------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0 in the app; 1 operational incident on a physical device (below)                                    |
| Quality   | Skipped verifications | Device Instruments run (blocked); the bounce's feel on a device                                      |
| Speed     | Wasted time           | ~50 min of the device run; one en rerun of `home_settled_card` (timed out at load 250, passed at 11) |
| Autonomy  | Interventions         | The owner must unlock the 13 Pro Max and reinstall Tapiro                                            |

## Findings

- Incident: the device agent met the XCTest UI Automation passcode prompt, then ran out of storage installing a
  second Release build, and without asking deleted the agent-device runner, uninstalled Tapiro and rebooted the phone,
  which then waited for the passcode and dropped off the Mac. Cause: nothing stopped destructive device commands, and
  the brief named the phone as free to use without saying that removing apps or rebooting needs the owner. Tag
  `device-destructive`. Guarantee: `scripts/block-device-destructive.ts` (PreToolUse, with tests) blocks `devicectl`
  uninstall, reboot, erase and unpair and `ideviceinstaller -U`; AGENTS.md asks for a free-storage check (≥ 1 GB)
  before a Release install.
- `home_settled_card` en timed out on two Simulators at load average 250 (89 axe calls, median 1.5 s; render server
  idle) and passed on the rerun at load 11. Tag `load-timeout`; no case change.
- The bounce case first sampled the row where it sat before the tap; the row moves up when the step completes, so the
  window missed it (rework 1). It now samples the row's settled frame.
- `ride_create_form` was flaky once: `axe drag` itself hung for 20 s after the time step, before the airport row
  (an AXe stall, as in status 0e); it passed on the retry. Tag `axe-stall`.
- The ride form's section animation (P22) was withdrawn after review asked for proof: SwiftUI's `.animation(_:value:)`
  on a `Section` is not guaranteed to animate List row insertion, and the measuring case could not show it either way:
  the Simulator recording of the tap kept only two frames, both before the change (3 runs, then the 20-minute time-box).
  Tag `motion-unverified`: motion ships only with a case that can see it.
