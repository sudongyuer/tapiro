---
branch: spike/chat-thread
date: 2026-11-06
pr: chat thread spike
title: RN thread screen with react-native-keyboard-controller inside NativeTabs
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: chat thread spike

## Core (mandatory)

| Dimension | Measure                 | This step                                                                                                            |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects         | 0 known                                                                                                              |
| Quality   | Vacuous checks          | 0: positions were read from `describe-ui` frames, not from screenshots alone                                         |
| Quality   | Skipped verifications   | No UI case (Task 5 writes the thread cases on the real route); dark and en not run; device checks listed in the note |
| Speed     | Wall-clock              | About 2.5 h; about 1 h went to the scroll-range bug (1 and 2 below), measured with temporary logging into defaults   |
| Autonomy  | Avoidable interventions | 0                                                                                                                    |
| Loop      | Minutes on this retro   | 5                                                                                                                    |

## Problems and root causes

| #   | What happened                                                                                                               | Root cause class  | Change and layer                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The thread opened short of its last message and the scroll range was a tab bar too long                                     | library behaviour | react-native-screens forces `automatic` insets on a tab's first scroll view; `disableAutomaticContentInsets` on the 消息 trigger (code), recorded in the research note |
| 2   | After 1, animated `scrollToEnd` still stopped short                                                                         | own bug           | A 0.33 pt `withTiming` on `extraContentPadding` reset `contentInset` every frame; growth is rounded and set once (code)                                                |
| 3   | Three rebuilds chased a composer that would not focus (glass, gesture area) before checking that a tab tap also did nothing | environment       | Plain `axe tap` was dropped; `axe touch --down --up --delay` worked. Check a known-good control first when an input ignores taps (note in the research method)         |
| 4   | Inverted list, the library's default chat layout, blurred the whole transcript under the transparent header                 | library behaviour | Non-inverted list (code); recorded as a constraint in the plan                                                                                                         |

## Notes

- Reading `Settings.set` logs back from the app container (`plutil -p …/Preferences/app.tapiro.plist`) needs a few
  seconds of lag, as `live.py` already notes; the first read showed the previous launch.
- `ffmpeg` is not installed; `verification/ui/frames.swift` plus a small AppKit contact-sheet script was enough to read
  keyboard motion frame by frame.
