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
   `Info.plist` for every usage key the config declares.
