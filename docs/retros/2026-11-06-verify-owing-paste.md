---
branch: fix/verify-owing-paste
date: 2026-11-06
pr: verify owing and paste
title: a clock-independent owing case and a paste that works on Xcode 27.2
escaped: 0
rework: 4
interventions: 0
overturned: 0
---

# Retro: verify owing and paste

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                         |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                                           |
| Quality   | Vacuous checks          | 0: `test_zone` fails with the `Etc/GMT` sign flipped; the night case asserts both reminders and 08:00, the day case only pay72    |
| Quality   | Skipped verifications   | `bounty_post_place` still fails after both pastes succeed (Return and typed keys dropped, see 4); dark and en (test-only change)  |
| Speed     | Wall-clock              | About 3 h, most of it measuring AXe key delivery by hand on a runner Simulator                                                    |
| Autonomy  | Avoidable interventions | 0                                                                                                                                 |
| Loop      | Minutes on this retro   | 5                                                                                                                                 |

## Problems and root causes

| #   | What happened                                                                                                                                                                                                         | Root cause class | Change and layer                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ride_settle_owing` failed in London's early morning: the 24 h reminder fell in quiet hours and was deferred to 08:00 today, so two reminders were scheduled                                                          | check bug        | Runner declaration `LOCAL_HOURS`: a fixed-offset zone pins the device hour (09–10 for the day case, 03–04 for the new `ride_settle_owing_night`), unit-tested for all 24 UTC hours |
| 2   | `simctl pbcopy` is a silent no-op on Xcode 27.2: `pbpaste` reads nothing back and `pasted` logs no write                                                                                                              | environment      | `pasteboard.swift`, a UIKit tool run with `simctl spawn`; `paste_into` asserts `pbpaste` before pasting. The tool must read the pasteboard back before exiting or the write is lost |
| 3   | An AXe ⌘V is not an authenticated paste: `pasted` logs `AuthenticationMessageMissing` and `Paste requires user authorization. Prompting...`, and nothing is pasted                                                    | environment      | `paste_into` uses taps only: 全选 then 粘贴 in the edit menu (`AuthMessageAuthentic`, `Paste allowed silently`); labels per locale checked on the Simulator                          |
| 4   | AXe key events (typed keys, ⌘A, Return) are dropped for seconds or minutes on iOS 27.2, across app relaunches; taps on the on-screen keys still work. In `bounty_post_place` the Return after the second paste is lost | environment      | Open: needs its own look (AXe HID session). The earlier retro's note on number fields ignoring input is likely the same fault                                                       |

## Notes

- Measured with `xcrun simctl spawn <udid> log show --predicate 'process == "pasted"'` around each step; that log is the
  quickest way to tell a pasteboard write that never happened from a paste the system refused.
- Three runs on a freshly booted `Tapiro Verify 2` failed on the first `describe-ui` with `Timed out creating the
  simulator remote automation session`; a rerun passed.
