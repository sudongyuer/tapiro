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
- **Timings.** Home card leave 320 → 240 ms; restack 420 ms tween → spring; map pin card flip 500 ms tween → spring,
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

| #   | Decision                                                                                      | Alternative                               | Reason                                                                                  |
| --- | --------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| P1  | Press-in is instant, release eases over 90 ms                                                 | Keep a symmetric 90 ms fade               | Feedback must land with the finger; iOS controls highlight at once                      |
| P2  | Pressed opacity is the `--opacity-pressed` token (0.7) everywhere                             | Keep 0.6 in `PressDim`                    | Two values for one meaning                                                              |
| P3  | Map pin card flip is a spring (`--duration-settle`, damping 0.85)                             | 240 ms tween on `EASE_MOVE`; keep 500 ms  | Interruptible and reads as an object; 500 ms on a tap felt slow                         |
| P4  | Card restack is a spring (`--duration-settle`, damping 0.8), opacity clamped                  | 240 ms tween                              | Matches the fan-out spring and keeps velocity when retargeted                           |
| P5  | Home card leave 240 ms on `EASE_ENTER`                                                        | Keep 320 ms                               | The most-seen screen; under the 300 ms budget                                           |
| P6  | Coin balance rolls with `numericText`, ease-out 240 ms, no count direction                    | Pass `countsDown` from the previous value | Earned and spent objects get motion (principle 9); direction adds state for little gain |
| P7  | Inline errors fade in and out at `--duration-fade`                                            | Fade in only                              | Both edges change layout; a cut on removal reads as a glitch                            |
| P8  | 思考中 does not fade out; the reply fades in                                                  | Cross-fade both                           | The leaving row overlapped the reply for 150 ms                                         |
| P9  | Remote images fade only on network loads (`skipOnCacheHit: 'all'`)                            | Fade on disk loads too                    | Scrolling back must not re-fade                                                         |
| P10 | The calm card's ask control keeps its pill shape; only its shadow joins the bubbles'          | Card radius with a square-cornered mic    | The round mic sits inside the pill; an 18 pt radius breaks the concentric corners       |
| P11 | Formatter cache keyed on locale, options and the device zone offset                           | No cache                                  | Formatters were rebuilt per row and per message                                         |
| P12 | Board cards key 今天/明天 on the day the board loaded; the tick reload moves it past midnight | Recompute the date on every render        | Lets the memoised cards skip renders                                                    |

## Not done

- Virtualising the bounty board (every row mounts a SwiftUI host; paging is unbounded): needs the home scroll as a
  `FlatList` with the stage as its header, a larger change than this pass.
- Formatters built inside four `.tsx` components (`DoneCard`, `MonthCalendar`, `TapirSettingsScreen`, `ConfirmParts`):
  rare screens.
- Symbol bounce on a finished status step, animated SwiftUI form sections and notices: need extra state wiring or
  animate a whole form; left for a later pass.
