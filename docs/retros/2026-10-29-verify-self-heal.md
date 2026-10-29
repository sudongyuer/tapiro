---
branch: chore/verify-self-heal
date: 2026-10-29
pr: verify self-heal and file-size check
status: complete
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: verify self-heal and the file-size check

## Why this exists

- Bounty step 6 lost about an hour to one stalled Simulator: the failures were read as outside load, then as a known
  issue, before swapping the device showed the cause (`docs/retros/2026-10-29-bounty-status.md` item 6, #22).
- The multi-currency Task 1 migration reached 1081 lines and only review caught it against the 500-line rule
  (`docs/retros/2026-10-29-multi-currency.md` item 2).

## What changed

- The runner counts command timeouts per device; two in one run reboot the device and retry the run once elsewhere,
  and the report names the stalled device. Per-command latency is in each `log.txt`.
- `bun run check:size` (CI) fails a source file over 500 lines or a component over 300; files already over on `main`
  are on an allowlist that can only shrink.

## Notes

- Built without a Simulator (fakes only); the first real exercise is the next multi-device UI run.
- The bounty locale files are on the allowlist at their current size, so a feature adding bounty copy must split them
  by area first.
