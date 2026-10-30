---
branch: feat/bounty-hand-art
date: 2026-10-30
pr: not opened yet
title: 9 hand-drawn intent art
escaped: 0
rework: 0
interventions: 2
overturned: 0
---

# Retro: bounty step 9, hand-drawn intent art (running)

Running file, started at the design stage; the implementation session fills the Core table before the PR.

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
