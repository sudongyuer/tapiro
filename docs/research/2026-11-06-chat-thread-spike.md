# Spike: chat thread screen in RN with react-native-keyboard-controller

Date: 2026-11-06. Chat plan Task 0 (`docs/plans/2026-10-30-chat.md`), the risk behind answer 128 A: can an RN thread
screen reach Messages quality inside our NativeTabs + native Stack (transparent header with `scrollEdgeEffects`)?

## Method

- `react-native-keyboard-controller` **1.22.7** (`bunx expo install`; the version Expo SDK 58 lists in
  `bundledNativeModules.json`; peers `react-native: *`, `react-native-reanimated: >=3.0.0`, so Reanimated 4.7.1 is
  fine). Native module, so `pod install` through prebuild; `KeyboardProvider` at the root layout.
- Production-shaped components in `src/features/chat/thread/` (`ThreadScreen`, `Composer`, `MessageBubble`,
  `ChatScrollView`), fed by the chat fixture service. Debug route `src/app/(tabs)/messages/debug-thread.tsx`, reached
  through the `chat-thread` scene, so the screen runs inside the 消息 tab's native Stack. Launch arguments:
  `-uiVerifySignedIn onboarded -uiVerifyChat 1 -uiVerifyChatLong 1 -uiVerifyScene chat-thread`; the new
  `-uiVerifyChatLong 1` adds `fixture-chat-long` (44 messages, two replies dated 20 s and 40 s after launch that appear
  on the next read, triggered with `-uiVerifyLive 25000:chat.message:fixture-chat-long,…`).
- Release verify build, `Tapiro Verify` Simulator (iPhone 17 Pro, iOS 27.2), driven with AXe; positions read from
  `describe-ui` frames, motion from `simctl io recordVideo` split with `verification/ui/frames.swift`. Messages on the
  same Simulator as the reference.
- Layout: a non-inverted `FlatList` (oldest first) rendering into `KeyboardChatScrollView`
  (`keyboardDismissMode="interactive"`, `offset` = bottom inset − 8), a `KeyboardGestureArea` (`offset` = composer
  height, linked to the input by `nativeID`), and the composer in a `KeyboardStickyView` over the list: a
  `GlassView` capsule with a multiline `TextInput` (5 lines, then it scrolls) and an SF Symbol send button. The
  composer's growth beyond one line feeds `extraContentPadding`.

Evidence: `docs/research/evidence/2026-11-06-chat-thread-spike/`.

## Criteria

| Criterion                                                     | Result                                                                                                                                                                                                                                         | Evidence      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Inverted list                                                 | **Fail, not used.** The flipped scroll view takes the header's scroll edge effect on the wrong edge: the whole transcript blurs and the oldest rows draw over the status bar                                                                   | 01            |
| Bottom-anchored list, opens at the newest message             | Pass (non-inverted). Needs the first page rendered whole (`initialNumToRender` = page size) and the list kept transparent until its first scroll to the end; without them it opened mid-thread or showed one frame at the top                  | 02            |
| Composer on the tab bar safe area when the keyboard is hidden | Pass: field bottom at 783 pt with the tab bar at 791 pt; with the urgent accessory shown the composer sits above it                                                                                                                            | 02            |
| Composer on the keyboard, content lifted with it              | Pass: field moves 739 → 513 pt; the last message stays 8 pt above it                                                                                                                                                                           | 04, 09        |
| No jump when the keyboard opens or closes                     | Pass on the Simulator: composer, keyboard and content move in the same frames (09). Frame pacing at 120 Hz is a device check                                                                                                                   | 09            |
| Interactive dismiss by dragging the list                      | Pass: the list scrolls with the finger; once the finger reaches the composer the keyboard follows it down and the composer rides on it (frames 342–356)                                                                                        | 08            |
| Composer grows to ~5 lines, then scrolls                      | Pass: 44 → 132 pt (5 × 22 pt lines plus padding), then the field scrolls; the transcript keeps its last message above the composer with the keyboard open and closed. Messages grows further (to about half the screen); 5 lines is our choice | 06, 07, 10    |
| Scroll to the end on send                                     | Pass: the sent message lands just above the composer with the keyboard open                                                                                                                                                                    | 05            |
| No jump when a message arrives                                | Pass: at the end, the list scrolls to show it (03); scrolled up into history, the position stays (rows unchanged in `describe-ui` before and after both replies)                                                                               | 03            |
| VoiceOver order                                               | Likely pass: the accessibility tree lists messages oldest → newest top to bottom, then the composer, each bubble one element with its text. Actual VoiceOver swipe order, the navigation bar first and rotor use are device checks             | `describe-ui` |
| Messages reference                                            | Same structure: composer on the keyboard, drag-to-dismiss, growing field. Messages has no tab bar and no cap on growth                                                                                                                         | 10            |

No criterion failed in a way RN cannot meet, so no SwiftUI alternative was sketched.

## Decision

★ **Confirm 128 A**: RN with `react-native-keyboard-controller` 1.22.7, non-inverted list in `KeyboardChatScrollView`,
composer in `KeyboardStickyView`, `KeyboardGestureArea` for the drag. Task 5 keeps `src/features/chat/thread/`.

## Library and platform caveats (each cost time in this spike)

1. **NativeTabs force automatic insets on the first scroll view of each tab.** react-native-screens
   (`RNSScrollViewHelper`) switches the first scroll view in a tab screen's first-subview chain from `never` to
   `automatic`, so the header and tab bar were added on top of our own padding and the keyboard library's maths was off
   by the tab bar height. Fix: `disableAutomaticContentInsets` on the 消息 trigger. Consequence: every screen in the
   消息 tab that wants system insets must set `contentInsetAdjustmentBehavior="automatic"` itself (the Task 4 list).
2. **Fabric `scrollToEnd` ignores `adjustedContentInset`** (`RCTScrollViewComponentView.mm`), the other half of 1.
3. **Inverted lists break `scrollEdgeEffects`** (criterion 1). Non-inverted needs the initial-placement rule above and
   `maintainVisibleContentPosition` for older pages.
4. **Sub-pixel padding updates cancel animated scrolls.** The composer measured 143.33 pt, and a `withTiming` on a
   0.33 pt `extraContentPadding` change set `contentInset` every frame, which stopped `scrollToEnd({ animated })`
   short. Growth is rounded and applied only when it changes, without timing (the input itself grows without
   animation).
5. **Staying at the end** uses a pin: pinned until the user drags away, pinned again when the end is visible. Using
   `onEndVisible` alone raced with content growth and left the list short of the end.
6. `KeyboardProvider` `preload` (default on) was tried off while chasing 4 and made no difference; it is back to the
   default.
7. Long thread pages: the whole first page (50) renders up front. A thread with long bubbles or images may want
   FlashList or LegendList (`initialScrollAtEnd`) later; not needed for 50 text rows.

## Open for Task 5 (UI choices, ★ to draw on the canvas before the task starts)

- The tab bar stays visible in a thread today, and it minimises when the transcript scrolls, which leaves a gap under
  the composer (the composer keeps the full tab bar inset). With the urgent accessory the bottom stacks composer,
  accessory and tab bar. ★ Hide the tab bar (and with it the accessory) while a thread is open, as WhatsApp and
  Telegram do; otherwise turn off minimise-on-scroll in threads.
- Composer cap: 5 lines (plan) against Messages' half screen. ★ Keep 5.

## Device checks (not provable on the Simulator)

- Keyboard sync at 120 Hz while opening, closing and dragging; Instruments on the drag.
- Interactive dismiss feel, including a fast flick.
- VoiceOver: swipe order (navigation bar, item card, messages, composer), the composer's label and the send button.
- Pinyin and Malay keyboards: the candidate bar changes the keyboard height while typing; the content must follow.
- Hardware keyboard attached (no software keyboard): the composer stays on the tab bar inset.

## Method notes

- On this Simulator, plain `axe tap` was dropped for long stretches (tabs and the composer did nothing) while
  `axe touch --down --up --delay 0.12` and drags worked; Return keys were dropped too (the same fault as #73).
