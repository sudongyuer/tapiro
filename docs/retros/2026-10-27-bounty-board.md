---
branch: feat/bounty-board
date: 2026-10-27
pr:
status: running
---

# Retro: bounty step 4 board and place picker

## Candidates

1. The 26–33 choice board was drawn 9380 px tall; the canvas caps a frame at 8000 (its SKILL.md says `w`,`h` 40–8000),
   so the bottom questions were clipped and the user reported it twice ("下面的看不见了", "还是看不见"). The first fix
   restored h 9380, which the canvas clamped again. Tag `tool-limit`. Done: the shared generator (`board()` in the scratchpad `gen_bounty_post.py`) now refuses W or H outside 40–8000
   and names the fix (split the sections). Scratchpad only, so a future board generator needs the same guard.
2. Typing a kit module as `NativeModule<E> & {…}` fails `tsc` (no `addListener`); `declare class … extends NativeModule<E>`
   works. Tag `library-footgun`. Candidate: one line in the kit README or a typed helper in the facade.
3. Task 5: the verify build had no `NSLocationWhenInUseUsageDescription` although `app.json` and the native string files
   had it since Task 3. `ios/` was last prebuilt on 2026-10-25 and `build.sh` prebuilds only when the workspace is
   missing, so config-plugin changes never reached the build; requesting location would have crashed a real build.
   Re-running `expo prebuild --platform ios` fixed it. Tag `stale-prebuild`. Candidate: `build.sh` prebuilds when
   `app.json`, `plugins/` or `src/lib/i18n/native/` are newer than `ios/Podfile.lock`, or a check that greps the built
   `Info.plist` for every usage key the config declares. Done: `build.sh` prebuilds when a native input (app config,
   lockfiles, plugins, native strings, kit non-TS files) is newer than `ios/.verify-prebuild-stamp`.
4. Task 7: two verify runs passed without exercising the failure path. `run.py` read `ARGS` with a regex that skipped a
   `[*BASE, …]` splat, so the launch argument never reached the app and the case silently ran the happy path. Tag
   `vacuous-check`. Done: `run.py` reads `SCENE`/`LOCALES`/`ARGS`/`BUDGET` with `ast.literal_eval` and exits naming the
   case when a value is not a literal (all 61 cases parse the same as before).
5. Task 7: after a prebuild, `pod install` again pointed `ios/.xcode.env.local` at Node 18 and the verify build failed
   (AGENTS.md "Rules from incidents" already names it, so a written rule did not hold). Tag `stale-prebuild`. Done:
   `build.sh` writes `NODE_BINARY` from Homebrew Node on every run. Candidate: shorten the AGENTS.md rule to point at
   `build.sh` once it holds.
6. Task 8: `bun run verify:ui <case> --locale ms` ran zero cases and exited 0, because a named case runs only zh-Hans
   unless `--locales` is also given and `--locale` then filters that list to nothing. Tag `vacuous-check`. Candidate:
   `run.py` exits non-zero when the selection is empty, or `--locale` implies `--locales`.
   Done: `--locale` runs exactly that locale (choices limited to the three), and a run with no case exits non-zero.
   Second `vacuous-check` this step (see 4).
7. Task 8: the board case scrolled a card into view with a 36 pt drag; AXe swipes that short never scroll (the drag stays
   under the scroll slop), so ten identical swipes failed. Tag `ui-scroll`. Done: `verification/ui/board.py` drags at
   least 120 pt.
8. Task 8 fix round: two ms runs of `bounty_board_list` timed out on the first `axe describe-ui` (20 s) while the
   machine's load average was 217–320 (a VM and LobeHub on top of `ps`); the same build passed once load fell to ~6.
   Tag `screenshot-timeout`. Outside cause, recorded with the load numbers; no change.
9. Task 9: after the first `bounty_board_location` run, every `simctl io recordVideo` on `Tapiro Verify` failed with
   "Host recording is already in progress" (no recorder process left on the host) and every `simctl io screenshot`
   taken right after an AXe tap or swipe took 5–8 s, so the axis case saw one frame in 5 s and missed the 1.3 s ring.
   `xcrun simctl shutdown` + `boot` of the verify Simulator cleared both (screenshots back to 0.2 s, recording works).
   Tag `simulator-state`. Candidate: `run.py` treats "video missing" or a recorder exit code 16 as a Simulator fault and
   reboots the device once before the next case, instead of reporting it next to an unrelated assertion.
10. Task 10: the implementer reported the zh-Hans light screenshots as opened, but the result on disk was the mutant
   run's failure with screenshots 03–06 missing; the reviewer caught it by reading `result.json`. Tag `stale-evidence`.
   Candidate: reviews check that each case's `result.json` is `pass` with the reviewed commit, or the runner writes a
   summary the report must quote.
