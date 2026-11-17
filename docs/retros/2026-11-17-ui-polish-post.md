---
branch: fix/ui-polish-post
date: 2026-11-17
pr: UI polish audit, posting a bounty (BP-1–11)
title: eleven audit findings fixed; the form's shared case helpers needed four rounds of fixes before the cases ran
escaped: 0
rework: 4
interventions: 0
overturned: 0
---

# Retro: UI polish, posting a bounty (2026-11-17)

Fix the audit's post-form findings. Finished by a second agent after the first ran out of quota mid-way through the case
helpers.

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                                       |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0                                                                                                                               |
| Quality   | Vacuous checks          | 0                                                                                                                               |
| Quality   | Skipped verifications   | dark for `bounty_post_form` and `bounty_post_art` only; en and ms for `bounty_post_form` only; BP-12 and BP-13 not built       |
| Speed     | Wall-clock              | Finishing about 4 h: about 1 h 15 min of runs in six batches, the rest waiting for the shared Simulator lock                   |
| Autonomy  | Avoidable interventions | 0                                                                                                                               |
| Loop      | Minutes on this retro   | 10                                                                                                                              |

## What happened

| #   | What happened                                                                                                                                                                                     | Root cause class | Change and layer                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `pick_category` passed a list to `ui.settled`, which compares frames; every case that picks a type threw `AttributeError`                                                                          | check design     | Settle on the picker element, read the tree separately                                                                                                                            |
| 2   | It then skipped every menu option: SwiftUI menu items carry their SF Symbol name as `AXUniqueId`, and the guard kept only unidentified elements                                                    | check design     | The option is the `Button` with the name (the picker is a `PopUpButton`). Tag `menu-item-symbol-id`                                                                               |
| 3   | Its "menu closed" probe could be the very type being picked, so the wait never ended                                                                                                              | check design     | The probe excludes the target                                                                                                                                                     |
| 4   | Number-pad typing right after the title's keyboard sent pad taps through to the place row (`on_pad` reads "no Return key" as the pad during the swap), and BP-8 moved the amount buttons under the pad | check design     | `typed` waits for the screen to rest after focusing a field it fills with digits; the case dismisses the pad before 「RM 8」. Dismissing the title keyboard first was tried and dropped: the scroll hid the error notice. Driver-level `on_pad` left as is (other areas) |
| 5   | BP-9 put 说明 after 地点, below the fold, so `bounty_post_optional` could not find it                                                                                                              | check design     | The case scrolls to it                                                                                                                                                            |
| 6   | The first agent's runs started before these helper fixes; most of this step was Simulator time spent learning that                                                                                | process          | Run one case against a helper change before queueing a batch. Tag `helper-before-batch`                                                                                           |

## Next

- BP-12 (owner: a success fill token) and BP-13 (date picker format, cause not found) stay open.
- `keys.on_pad` treats "no keyboard" as the number pad; a driver fix would need its own runner tests.
