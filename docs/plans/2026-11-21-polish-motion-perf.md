# Polish pass: motion, render and finish (2026-11-21)

Goal from the owner (2026-11-21): a more professional, polished app with good performance and small animations, built
without questions while the owner is away. Four read-only audits ran first (motion opportunities, existing motion,
render performance, visual consistency); this pass takes the findings that change no product decision. Layout and
flow findings in `src/features` (card buttons, pressed fills, capsule heights, stamp radius, map elevation, ask card
gaps, the urgent accessory) went to the parallel UI walkthrough session (`docs/reviews/2026-11-21-ui-walkthrough.md`).

## What changed

- **Reduce Motion.** One hook, `useMotionReduced()` in `src/ui/theme/motion.ts`, replaces 31 direct
  `useReducedMotion()` calls and always honours verify mode's `-uiVerifyReduceMotion`; ESLint forbids the direct import.
  The payment celebration, the welcome screen, the board's list/map switch, the ETA flip and the selected-row fade
  jumped under Reduce Motion because their replacement fade did not pass `ReduceMotion.Never` (Reanimated 4.7 skips
  such a timing); they fade now.
- **Curves.** `EASE_ENTER` (0.23, 1, 0.32, 1) and `EASE_MOVE` (0.77, 0, 0.175, 1) replace eight copies.
- **Press feedback.** `PressDim` dims at once to `--opacity-pressed` (was a 90 ms ease to 0.6, which lagged the
  finger and disagreed with the 0.7 token used elsewhere) and recovers over `--duration-press`.
- **Timings.** Home card leave 320 → 240 ms (the restack keeps its 420 ms tween, P4); map pin card flip 500 ms tween → spring,
  its leave no longer longer than its appear; settled collect exit on the fade token.
- **Small fades.** Offline line, 问小貘 turns (a restored conversation does not fade), inline errors on the name step,
  ride detail footer and blocked chat footer; the coin balance rolls (`numericText`, an opacity change under Reduce
  Motion).
- **Render.** Cached `Intl` formatters (`src/lib/intlCache.ts`, 13 modules); memoised board, ticket and coin-history
  rows; the board no longer re-renders on every scroll frame; rows skip their focus fade when nothing is highlighted;
  ride history no longer re-renders every minute.
- **Finish.** Continuous corners on cards, pills and the composer; remote images fade in on network loads only; the two
  小貘 speech bubbles share one radius and shadow; pressed feedback on review faces, review chips and the terms links; a
  label for the older-messages spinner.

## Decisions (★, for veto)

| #   | Decision                                                                                      | Alternative                               | Reason                                                                                              |
| --- | --------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| P1  | Press-in is instant, release eases over 90 ms                                                 | Keep a symmetric 90 ms fade               | Feedback must land with the finger; iOS controls highlight at once                                  |
| P2  | Pressed opacity is the `--opacity-pressed` token (0.7) everywhere                             | Keep 0.6 in `PressDim`                    | Two values for one meaning                                                                          |
| P3  | Map pin card flip is a spring (`--duration-settle`, damping 0.85)                             | 240 ms tween on `EASE_MOVE`; keep 500 ms  | Interruptible and reads as an object; 500 ms on a tap felt slow                                     |
| P4  | Withdrawn: card restack stays the 420 ms ease-out tween                                       | Spring (`--duration-settle`, damping 0.8) | Measured in `home_settled_collect`: the spring moved the board 44 pt in about 30 ms, a visible jump |
| P5  | Home card leave 240 ms on `EASE_ENTER`                                                        | Keep 320 ms                               | The most-seen screen; under the 300 ms budget                                                       |
| P6  | Coin balance rolls with `numericText`, ease-out 240 ms, no count direction                    | Pass `countsDown` from the previous value | Earned and spent objects get motion (principle 9); direction adds state for little gain             |
| P7  | Inline errors fade in and out at `--duration-fade`                                            | Fade in only                              | Both edges change layout; a cut on removal reads as a glitch                                        |
| P8  | 思考中 does not fade out; the reply fades in                                                  | Cross-fade both                           | The leaving row overlapped the reply for 150 ms                                                     |
| P9  | Remote images fade only on network loads (`skipOnCacheHit: 'all'`)                            | Fade on disk loads too                    | Scrolling back must not re-fade                                                                     |
| P10 | The calm card's ask control keeps its pill shape; only its shadow joins the bubbles'          | Card radius with a square-cornered mic    | The round mic sits inside the pill; an 18 pt radius breaks the concentric corners                   |
| P11 | Formatter cache keyed on locale, options and the device zone offset                           | No cache                                  | Formatters were rebuilt per row and per message                                                     |
| P12 | Board cards key 今天/明天 on the day the board loaded; the tick reload moves it past midnight | Recompute the date on every render        | Lets the memoised cards skip renders                                                                |

## Not done

- Virtualising the bounty board (every row mounts a SwiftUI host; paging is unbounded): needs the home scroll as a
  `FlatList` with the stage as its header, a larger change than this pass.
- Formatters built inside four `.tsx` components (`DoneCard`, `MonthCalendar`, `TapirSettingsScreen`, `ConfirmParts`):
  rare screens.
- Symbol bounce on a finished status step, animated SwiftUI form sections and notices: need extra state wiring or
  animate a whole form; left for a later pass.

## Follow-up: walkthrough shared-ui items

Handed back from `docs/reviews/2026-11-21-ui-walkthrough.md` (H4, H5, S2, K2, Consistency 1–3 and 7).

| #   | Decision                                                                                            | Alternative                                  | Reason                                                                                   |
| --- | --------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| P13 | A disabled pill keeps its shape on the secondary fill with a `tertiaryLabel` label (H4)             | `secondaryLabel`; keep the 0.4 opacity       | Matches UIKit's disabled style and stays legible; `secondaryLabel` reads as tappable     |
| P14 | One `CardButton` on the home cards: min `--touch-min`, `body` semibold, two lines, 16 pt sides (H5) | 52 pt for every card                         | 52 pt crowds the cards and two buttons no longer fit side by side                        |
| P15 | One pressed and selected row fill, `systemGray4`; each row keeps its own corners                    | `systemFill`                                 | The native selected-cell colour; the SwiftUI rows already used it                        |
| P16 | Capsules in the card stack are 28 pt (`--capsule-min`)                                              | 24 pt                                        | 24 is tight for the chip copy; 30 was a raw number                                       |
| P17 | The 问小貘 sheet header sits outside the scroll view, so content clips at its edge (S2)             | Move the header into a native navigation bar | react-native-screens sizes a form sheet's scroll view below a header sibling; no overlay |
| P18 | Empty belly pips have a 1 pt outline, `tertiaryLabel` in light and `secondaryLabel` in dark (K2)    | One colour for both                          | `tertiaryLabel` faded on the lighter dark glass (pixel check)                            |
| P19 | The hungry card's primary pill is 「自己填」; 「明早再来」 is secondary (K2)                        | Keep 「明早再来」 primary                    | The primary action moves the task on                                                     |

## Round 2

| #   | Decision                                                                                         | Alternative                                        | Reason                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| P20 | A status step's check bounces once (`symbolEffect` bounce) when it turns done during the session | `contentTransition(.symbolEffect(.replace))`       | @expo/ui 58 offers no symbol replace transition; a few completions per job, so it is feedback                    |
| P21 | Under Reduce Motion the check swaps without the bounce                                           | Rely on the system                                 | Neither the types nor the Swift source show that the effect follows Reduce Motion                                |
| P22 | Withdrawn: the ride form's details section keeps its instant swap                                | `animation` on the Section when 机场 or 备注 opens | Unverified: the Simulator recording kept only two frames of the change, so no case could show the rows easing in |
| P23 | The bounty board is not virtualised for now                                                      | `FlatList` home with the stage as header           | The hosted board holds 2 rows and pages by 20; measure on a device once lists pass ~40 rows                      |

Device performance sign-off is still open: the 13 Pro Max run was blocked (UI Automation passcode, then storage) and
left the phone needing the owner (`docs/research/2026-11-21-device-perf.md`). A hook now blocks uninstalling,
rebooting, erasing or unpairing a physical iPhone.
