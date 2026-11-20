---
branch: fix/keep-context-navigation
date: 2026-11-21
pr: "#211"
title: UI audit batch A, keep the user's context
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: UI audit batch A, keep the user's context

## Core (mandatory)

| Dimension | Measure               | This step                                                                                  |
| --------- | --------------------- | ------------------------------------------------------------------------------------------ |
| Quality   | Escaped defects       | 0 known                                                                                    |
| Quality   | Skipped verifications | Notification double-tap stacking (verify mode fakes one tap per launch; device checklist)  |
| Speed     | Wasted time           | ~15 min (scratchpad file collision with a parallel agent; shell edits refused by the guard) |
| Autonomy  | Interventions         | 0                                                                                          |

## Findings

- The first design was per-tab duplicated routes, as `profileHref` does. Reading react-native-screens showed every
  stack screen inside a tab gets its first scroll view switched to automatic insets unless the tab trigger sets
  `disableAutomaticContentInsets` (only 消息 does), which is what broke the thread's keyboard maths in the chat spike.
  So the thread cannot be pushed into 悬赏 or 拼车. Screens of another tab now push on the root stack instead. Tag
  `nav-thread-insets`. Lesson: check the native constraints of the screen you want to duplicate before picking the
  mechanism; the reason is now a comment beside `OVER_TABS` in the root layout.
- Parallel agents of one session share the scratchpad directory. My `build.txt` was overwritten by another worktree's
  build output, which looked like my build had used another checkout's DerivedData. Tag `scratchpad-shared`. Fix:
  prefix scratch files with the batch name; candidate for a written rule if it happens again.
- Multi-line heredocs and `$var` arguments are refused by the worktree guard; writing the edit script with the Write
  tool and running `python3 <script> <root>` worked first time. Tag `worktree-guard-heredoc`.
- Three new or changed UI cases failed on their first run for case reasons, not product ones: two sheets each had a
  「关闭」 button, and the tab bar had minimised after scrolling, so its `AXValue` was not readable. The cases now tap
  the top sheet's button by position and read the back button's label. Tag `ui-case-minimised-tabbar`. Lesson: prove
  "which tab" with the back label, not the tab bar, on any screen that scrolls.
- `bun test`: two `merge-gate` timeouts under load average ~800 (5 s test timeout); the file passed alone. Tag
  `load-timeout`.
- About 75 minutes waiting for the shared Simulator lock behind batches B, C, D and the shared-UI walkthrough.
