---
branch: fix/ui-polish-pay-ride-chat-owner
date: 2026-11-18
pr: UI polish audit, owner rows for payment, carpool and chat (PAY-06, 07, 10, RIDE-10, 15, CHAT-7, 8)
title: seven owner rows decided under delegation; the pinned ticket moved into a native top bar, which first cut its stub
escaped: 0
rework: 4
interventions: 0
overturned: 0
---

# Retro: UI polish owner rows, payment, carpool and chat (2026-11-17/18)

Build the audit's owner rows for payment, carpool and chat under the owner's delegation, ★ for veto.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                  |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                          |
| Quality   | Vacuous checks          | 0; each new assertion was checked against the audit's before screenshot or label and fails there                           |
| Quality   | Skipped verifications   | No device run; ride cases not run in dark (only the bar backing changed colour there, asserted relative to the ground)     |
| Speed     | Wall-clock              | About 4 h of work plus a long wait for the Simulator lock (verify:full held it); two verify builds of 12 and a few minutes |
| Autonomy  | Avoidable interventions | 0                                                                                                                          |
| Loop      | Minutes on this retro   | 5                                                                                                                          |

## What happened

| #   | What happened                                                                                                                                                        | Root cause class | Change and layer                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | The create form's ticket, hosted in the new top safe-area bar through `RNHostView`, laid out wider than the bar once its stub filled, cutting 「RM 13」 on the right | platform         | The ticket takes the window width explicitly; `ride_create_form` now asserts the stub's OCR box sits inside the ticket. |
| 2   | `ride_settle_rows`' new order check found 「每人」 inside 「每人约」 earlier in the label                                                                            | check design     | The check reads the cells after Grab 总价 and matches each label with its trailing space. Tag `measure-the-thing`       |
| 3   | `ride_create_worst` failed twice: Vision read the row's ○ marker into the second line, whose box then started left of the row and was dropped                        | check design     | The case clamps a box that starts left of the row to the row's edge. Tag `ocr-merges-marker`                            |
| 4   | `ride_create_pick` failed twice: Vision read the plane icon into 「→ 航班和行李」, moving that label's left edge 35 pt                                               | check design     | The case compares right edges (both labels are five CJK characters); still fails on the RIDE-16 before shot (5 pt).     |
| 5   | `ride_create_form` timed out on first attempts (180 s, 92–99 AXe calls; once 「Timed out creating the simulator remote automation session」) and passed on retry     | outside          | None; load average was 192–372 from parallel agent builds. Tag `axe-slow`                                               |

## Next

- PAY-10 is kept as both boards draw it; the owner may still prefer the older slot's size.
- The hosted Supabase project needs migration `20261117000100_chat_ride_need.sql` before a client with this change talks to it.
