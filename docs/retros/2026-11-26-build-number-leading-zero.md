---
branch: fix/build-number-leading-zero
date: 2026-11-26
topic: build-number-leading-zero
---

# Retro candidates: a morning build number App Store Connect rewrote

- What happened: `bun run testflight` at 08:45 UTC stamped build `20261126.0845`. Upload and processing passed, then
  `asc-testflight.mjs` waited for a VALID build and gave up, twice: App Store Connect stores the number as
  `20261126.845`, so the lookup by the stamped string never matched.
- Cost: two failed external submissions and about 10 minutes; the build reached testers only after a manual rerun
  with the stripped number.
- Root-cause class: an identifier formatted one way locally and normalised by the remote service; every earlier build
  was stamped after 10:00 UTC, so the path had never run.
- Tag: `remote-normalised-id`
- Fix (landed): `testflight.sh` drops the leading zero from the time part, and `asc-testflight.mjs` canonicalises any
  build number before looking it up, with a unit test for a stamp before 10:00.
