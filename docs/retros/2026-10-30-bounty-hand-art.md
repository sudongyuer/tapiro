---
branch: feat/bounty-hand-art
date: 2026-10-30
pr: bounty step 9
title: 9 hand-drawn intent art
escaped: 0
rework: 1
interventions: 2
overturned: 0
---

# Retro: bounty step 9, hand-drawn intent art

Started at the design stage; the overnight implementation session (2026-10-30 → 31) filled the Core table.

## Core (mandatory)

| Dimension | Measure                                                         | This step                                                                                                                                                          |
| --------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality   | Defects escaping review (found in walkthrough, CI, after merge) | Pending the user's review and walkthrough                                                                                                                          |
| Quality   | Checks that could not fail (vacuous)                            | 0 known. Art checks count colourful pixels inside the art frame and compare the ride's red against the coffee card's, so a blank or wrong drawing fails            |
| Quality   | Skipped verifications / open device checks / new known limits   | Device: the arrival drop on the home card, map pins with art, Long Cang rendering on device. Limit: celebration G does not animate into the stack (question 150)   |
| Quality   | Acceptance criteria with no covering test and no device mark    | 0; `bounty.post.photo` is an explicit gap (90A)                                                                                                                    |
| Speed     | Wall-clock from first commit to PR                              | Plan 10:13, implementation commit 10:39 local; the UI batch and PR follow (see PR)                                                                                 |
| Speed     | Wasted time by class                                            | About 5 min: headless Chrome hung once while rendering the PNGs (`chrome-headless-hang`), fixed with a per-image timeout and a file check instead of the exit code |
| Speed     | Rework rounds                                                   | 1: the dark screenshot showed the handwritten month heading in black on the dark page; the case passed                                                             |     |
| Autonomy  | Avoidable interventions                                         | 0 overnight                                                                                                                                                        |
| Autonomy  | Rulings made / overturned                                       | 12 rulings in the plan, taken on ★; overturned: pending review                                                                                                     |
| Loop      | Minutes spent on this retro                                     | 10                                                                                                                                                                 |

## Candidates so far (design stage, 2026-10-30)

1. **Canvas boards were hard to find** (tag `canvas-findability`). The user asked 「你画的设计稿在哪 我没看到呢」 and then
   「87不是要看验证效果么？出来了么」: the evidence board existed but the canvas opens on page 00 and the boards sat at
   the bottom of page 05. Cost: two round trips. Class: missing knowledge at hand-off. Fix applied: every reply that
   points at a new board names the page and position, and `canvas.json` `launch` now opens page 05 while its questions
   are open.
2. **Photo stickers were spiked before the look was judged on a real photo** (tag `spike-scope`). The cut-out worked
   (Mac 4/4, iPhone 14 Pro 2/2), but the first real photos on the phone showed the product question: photos clash with
   hand-drawn art (90A dropped them). A ten-minute device try at the start would have reached 90A before the
   Image Playground and Core Image research. Class: verified feasibility before desirability. No rule yet; second
   occurrence would make it a decision principle (「先用真实素材看效果，再验证技术」).
3. **Device run hit two environment traps** (tag `device-run`). `bunx expo` picked Node 18 from `/usr/local/bin`
   (restart, about 2 min), and port 8081 belonged to another project's Metro, so the Debug build would have loaded the
   wrong bundle. Worked: Homebrew Node first on PATH, `--port 8083`, and launch with
   `xcrun devicectl device process launch ... app.tapiro -- -RCT_jsLocation <mac-ip>:8083`. First occurrence; recorded
   here. If it recurs, a `scripts/run-device.mjs` wrapper.
4. **I asked for an API key to generate style samples** (tag `blocked-on-key`). The user wanted lightweight stand-ins
   drawn on the canvas plus a polished model-agnostic prompt. Memory `design-samples-drawn` records it.
5. **86 ABCDE contradicted 90A** (D). Flagged and resolved by 90A; no cost.

## Candidates (implementation, 2026-10-30 night)

6. **A plan item assumed a surface that does not exist** (tag `plan-unchecked-surface`). 94A said the art flies "to
   the top of the board", but `nearby_bounties` never lists the poster's own bounties; found while wiring the motion,
   ruled to land on the home live card. Class: missing knowledge at planning. Cheap fix next time: when a plan names a
   destination screen, grep the read that fills it before asking the question. First occurrence.
7. **The plan kept the art "resolved locally" while offering 换一张** (tag `plan-unchecked-surface`, second item):
   a swap that is not stored is lost at publish. Ruled to store `bounties.art`, which touched 8 SQL functions (one
   helper agent, about 10 min). Same class as 6; with two instances in one plan this becomes a planning check:
   "every user choice in a flow names where it is stored".
8. **`check-file-size.test.ts` fails locally** (tag `local-node-output`): under `bun test` the spawned `node` exits with
   the right code but its stdout and stderr arrive empty, so 4 tests fail; the same test copied to another folder
   passes, and a plain `bun` script gets the output. Not caused by this branch (file untouched; CI runs it). Cause not
   found after 15 min; left for a daytime look.
9. **Headless Chrome hung on one of 12 screenshots** (tag `chrome-headless-hang`): the first render exited non-zero
   with output written, the second hung past 120 s. `render.mjs` now gives each image 30 s and checks the file.
10. **A dark-mode defect passed its case** (tag `vacuous-appearance`). `HandText` set no colour, so the calendar's
    month heading rendered black on the dark page; `sticker_book_calendar` passed in dark because it checked the art,
    not the heading. Found by opening the screenshots (AGENTS.md: open them before reporting). Fixes: `HandText` now
    always sets the label colour (structure), and the case counts the heading's ink against the appearance (check).
