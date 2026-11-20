---
branch: fix/verify-video-missing
date: 2026-11-19
pr: the runner frees a recording left by a killed recorder before each case instead of failing it as video missing
title: passing runs failed on 「video missing」 after a run or probe had been killed
escaped: 0
rework: 1
interventions: 0
overturned: 0
---

# Retro: video missing

## Core (mandatory)

| Dimension | Measure               | This step                                                                                          |
| --------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                                  |
| Quality   | Skipped verifications | None; the cause was measured on the Simulator and the fix ran against the same reproduction        |
| Speed     | Wasted time           | ~40 min: 21 cold-boot runs chasing the retros' "after boot" reading, a queue ticket lost to a name |
| Autonomy  | Interventions         | 0                                                                                                  |

## Findings

- Cause, measured: a `simctl io recordVideo` that ends on SIGTERM, SIGHUP or SIGKILL after 「Recording started」 leaves
  the Simulator holding the recording until it shuts down; every later recorder exits 16 with 「A recording is already
  in progress」 (SIGINT, and any signal before the recording starts, leave it free). A run or probe killed mid-case
  (a tool timeout, a stopped task) does exactly that, and the runner never shut the first Simulator down at the start
  of a run, so the next run's first case on it passed its script and failed 「video missing」; the heal reboot then
  freed it and the retry passed, which read as "right after boot". Reproduced on the old runner: a recorder ended with
  SIGTERM, then `ride_create_form` → `FLAKY … PASS: …; video missing`, recorder output `Code=16 … A recording is already
in progress`. Tags `video-missing-after-boot` (third time), `orphan-recording` (2026-11-06), `runner-kill-recorder`
  (2026-11-09).
- The earlier entries blamed the environment and recorded "none" as the change three times; the recorder's own output
  was in a pipe nobody read. The runner now keeps it and puts it in the failure message. Tag `unread-tool-output`.
- 21 cold-boot runs (three Simulators shut down before each round, load up to 870) never lost a video: the "after
  boot" reading of the retros described when the failure showed, not why. Measuring the recorder's exit paths found it
  in one probe. Tag `guessed-cause`.
- First fix rebooted with `shutdown` + `boot` only; `simctl launch` right after that exits 3 (「did not return a process
  handle」). The reboot now goes through the runner's heal (`prepare`, which reinstalls the app). Rework 1.
- Side finding, not fixed here: `sim-lock.sh release <name>` deletes every queued ticket with that name, so a second
  `run` with the same name queued behind the first waits forever. Use a unique name per run (`<task>-$$`). Tag
  `sim-lock-same-name`.

## Changes

- `recording.arm` stops any leftover recorder with SIGINT, waits for 「Recording started」 (replacing a 1.5 s sleep),
  and on exit 16 reboots that Simulator once and arms again; a recorder that still cannot start, or exits during the
  case, fails the run as `video missing (<recorder error>)`, so a motion case never passes without its video.
- `recording.start` stops a recorder that did not start with SIGINT before SIGKILL, so its own timeout no longer
  leaves the Simulator busy.
- `test_recorder_busy` drives `run_case` against a stand-in `xcrun`; two of its three tests fail on the old runner
  (`('fail', 'PASS: shown; video missing') != ('pass', 'PASS: shown')`).
