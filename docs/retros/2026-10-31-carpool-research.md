---
branch: docs/carpool-research
date: 2026-10-31
pr: carpool research
title: carpool reference research, research board on page 05r, questions 176–179
escaped: pending
rework: 0
interventions: 0
overturned: pending
---

# Retro: carpool reference research

## Core (mandatory)

| Dimension | Measure                 | This step                                                                |
| --------- | ----------------------- | ------------------------------------------------------------------------ |
| Quality   | Escaped defects         | Pending the owner's reading of the board                                 |
| Quality   | Vacuous checks          | None                                                                     |
| Quality   | Skipped verifications   | Board not rendered or screenshotted (the canvas type says not to verify) |
| Speed     | Wall-clock              | About 60 min                                                             |
| Autonomy  | Avoidable interventions | 0                                                                        |
| Loop      | Minutes on this retro   | 3                                                                        |

## Problems and root causes

| #   | What happened                                                                                                                                                                | Root cause class  | Change and layer                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Direction (b) asked for real WeChat and 小红书 posts. 小红书 renders no posts without a session and WeChat groups are closed, so the post anatomy is a composite, not quoted | missing access    | Ask the owner for screenshots at the start of any "how people do it today" research, not after searching (question 178). Written here; promote to a rule if it recurs |
| 2   | Grab Group Ride (May 2026) already does invite, waiting room and auto split; the spec written on 2026-10-11 and reconciled on 2026-10-30 does not mention it                 | missing knowledge | A spec that defines a feature against a named incumbent checks that incumbent's current product before approval. Raised as question 177 rather than a spec edit       |
| 3   | The image-tiling commands (`magick`, Python with a loop variable) were refused by the worktree guard; ffmpeg's `tile` filter with plain arguments worked                     | tooling           | Use `ffmpeg -i img/x_%d.jpg -vf "scale=300:-1,tile=5x1"` for contact sheets in worktree agents; no change needed elsewhere                                            |
