---
branch: chore/verify-simulators
date: 2026-10-29
pr: verify runner on three Simulators
status: complete before PR
---

# Retro: the verify runner owns three Simulators

From step 5's retro item 3 (`shared-simulator`, user choice A): the runner hands runs to `Tapiro Verify`, `Tapiro Verify
2` and `Tapiro Verify 3` from one queue, and falls back to one Simulator when the checkout's disk has under 15 GB free.

## Candidates

1. The first run created and booted two new Simulators at once; load average reached ~245 for about two minutes while
   their first boot spawned daemons, and nothing printed until the boot finished. Tag `first-boot-load`. The cases still
   passed. Candidate: print a line before booting (「booting 3 Simulators」) so a quiet start is not read as a stall
   (same family as the 2026-10-26 `buffered-log` entry). Done in this branch.
2. The 3-way breaker had to change meaning: three consecutive timeouts across interleaved Simulators would rarely trip
   on one sick device, so the streak is now counted per Simulator. Tag `parallel-semantics`. No rule; README states it.
3. Parallel compile of the Swift helpers (`ocr`, `frames`) could race on `.verify/<name>`; `swifttool` now compiles
   under a file lock. Found by reading, not by a failure.

## Landed

- `pool.py` (names, worker count, disk floor) with `test_pool` in CI; README and AGENTS.md describe the three Simulators.
- Step 5's working practice "one Simulator-using agent at a time" stays: two agents still cannot share one runner lock,
  and a manual launch or `verify:build` on `Tapiro Verify` still disturbs a run.
