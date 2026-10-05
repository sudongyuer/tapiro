# Tapiro design language

Visual mockup: https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o (direction D boards, research and
reference boards). Research: `docs/research/2026-10-04-design-*.md`.

This file is the single source for tokens. `src/ui/theme/tokens.ts` mirrors it;
`node scripts/design-check.mjs` fails when they drift or when product code uses raw colours or
font sizes. Token rows use the form ``| `--token` | `light` | `dark` |``.

## Positioning

"iOS system UI + stickers at the moments that matter." The interface itself is not cartoony;
only the mascot (小貘, a cartoon Malayan tapir) is. Reference: CapWords (ADA 2025), whose real
screens are a neutral grey canvas, white controls and a black pill CTA, with colour coming only
from die-cut stickers.

The skeleton (navigation, tab bar, lists, sheets, controls, semantic colours) belongs to the
platform. Our own expression is spent in exactly these places:

1. **Sticker moments**: post published, task completed, empty states, the sticker book, errors.
   Speckle background, one large die-cut sticker, 小貘 at full size.
2. **Type stickers**: each task type has a small die-cut icon (40–48 pt) on list cards.
3. **One ink accent**: 貘墨黑, the tapir's own colour, for the primary pill button.
4. **Rounded numerals**: rewards and counts in SF Rounded.

Everything else uses platform defaults. Do not imitate a native control the platform provides.

## Principles

1. **One accent.** It expresses only the primary tappable action and "in progress". Never
   decoration.
2. **Chrome is neutral, content is colourful.** Colour on screen comes from stickers and photos.
3. **System colours first.** Backgrounds, labels and separators use iOS semantic colours
   (`PlatformColor`); only the colours below are hand-written.
4. **Status is colour + shape.** A state is never carried by colour alone.
5. **Type is semantic.** Every text node uses a role below. No raw font sizes, no bundled fonts.
6. **Only tokens.** No raw hex or font sizes outside `src/ui/theme/tokens.ts`.
7. **The mascot can appear anywhere, at the size the screen class allows.** Everyday screens
   show the 小貘 character only as a small head (≤ 32 pt) with an expression; moment screens show
   it at full size. Mascot graphics (trust heads, review faces, the coin, tab icons) are allowed
   everywhere. There is no per-screen limit.
8. **Motion is named by intent** and respects Reduce Motion.
9. **Detail and motion are the signature.** Every object the user earns, spends or completes
   (coins, stickers, the tapir) is crafted with material detail and has a purposeful animation;
   chrome stays native and calm. Reference: the coin study on the design canvas.
10. **Signature motion is for key moments.** Frequent actions (lists, buttons, tab switches) use
    system animations. Stickers and large 小貘 animations play at moments; every celebration can
    be skipped or interrupted.
11. **Picture, sound and haptic land together.** One result maps to one haptic (success,
    error, impact) and is never reused for another meaning.

Sources for 8–11 and the mascot and voice rules below: `docs/research/2026-10-05-design-methods.md`
(Duolingo, Monzo, CapWords, Karrot SEED and Apple HIG, checked against each brand's own
publications).

## Screen classes

| Class    | Screens                                                           | Background                | Mascot       | Stickers          |
| -------- | ----------------------------------------------------------------- | ------------------------- | ------------ | ----------------- |
| Everyday | list, detail, chat, post flow, settings                           | system grouped background | head ≤ 32 pt | type icons only   |
| Moment   | post published, completed, empty, sticker book, onboarding, error | moment speckle            | full size    | one large sticker |

Everyday screens are the ones people use daily to get something done. Moment screens are rare
and carry emotion.

## Layers

```text
src/ui/theme/tokens.ts   pure data, no framework imports, testable directly
src/ui/theme/*.ts        hooks: palette, motion, font scale
src/ui/*                 product components that wrap primitives / native views
src/features/*           only use src/ui/*, never raw sizes or colours
```

## Color

System semantic colours (`systemGroupedBackground`, `secondarySystemGroupedBackground`,
`label`, `secondaryLabel`, `tertiaryLabel`, `separator`) are used directly and are not tokens.

### Accent

| Token               | Light     | Dark      | Use                                                |
| ------------------- | --------- | --------- | -------------------------------------------------- |
| `--color-accent`    | `#25232B` | `#F3EFE6` | 貘墨黑. Primary pill button, in-progress indicator |
| `--color-on-accent` | `#FFFFFF` | `#25232B` | Label and icon on an accent fill                   |

### Status

| Token             | Light     | Dark      | Use                                      |
| ----------------- | --------- | --------- | ---------------------------------------- |
| `--color-urgent`  | `#C4321F` | `#FF6B5A` | Deadline under 1 h, overdue, destructive |
| `--color-success` | `#187A50` | `#3ECF8E` | Completed                                |
| `--color-warning` | `#965A00` | `#FFB340` | Needs your action                        |

### Moments, stickers and mascot

| Token                    | Light       | Dark        | Use                             |
| ------------------------ | ----------- | ----------- | ------------------------------- |
| `--color-moment-bg`      | `#F4F0E6`   | `#24221E`   | Moment screen background        |
| `--color-moment-grain`   | `#3C321E21` | `#F4F0E61A` | Speckle dots on moment screens  |
| `--color-sticker-border` | `#FFFFFF`   | `#FFFFFF`   | Die-cut border of every sticker |
| `--color-sticker-shadow` | `#1E1B222E` | `#0000004D` | Sticker drop shadow             |
| `--color-mascot-ink`     | `#2E2B35`   |             | 小貘 head, legs, rump           |
| `--color-mascot-line`    | `#1E1C22`   |             | 小貘 outline                    |
| `--color-mascot-saddle`  | `#F3EFE6`   |             | 小貘 saddle and ear rims        |
| `--color-mascot-blush`   | `#FF8A7A`   |             | 小貘 cheeks                     |

Contrast rules, enforced by `src/ui/theme/tokens.test.ts`:

- Accent ≥ 4.5:1 against white (light) and `#1C1C1E` (dark), and on-accent ≥ 4.5:1 on accent.
- Each status colour ≥ 4.5:1 against white and `#F2F2F7` (light) and `#1C1C1E` (dark).
- Yellow is never a brand colour; it is owned by 美团 / 闲鱼 / Timee in this market.

## Status language

One component renders status everywhere (`src/ui/StatusBadge`).

| Status                    | Colour          | SF Symbol                     |
| ------------------------- | --------------- | ----------------------------- |
| 待接单 Open               | secondary label | `circle`                      |
| 已接单 Accepted           | accent          | `circle.inset.filled`         |
| 进行中 In progress        | accent          | `circle.fill` + pulse         |
| 待确认 Needs you          | warning         | `exclamationmark.circle.fill` |
| 已完成 Done               | success         | `checkmark.circle.fill`       |
| 已取消 / 已过期 Cancelled | tertiary label  | `xmark.circle`                |
| 紧急 Urgent (modifier)    | urgent          | `clock.badge.exclamationmark` |

## Typography

System fonts only; nothing is bundled. Chinese renders in PingFang SC, Latin in SF Pro,
numerals for money and counts in SF Rounded (`fontFamily: 'ui-rounded'`). Sizes are the iOS
Dynamic Type defaults at the Large setting (Apple HIG, Typography → Specifications) and scale
with the user's text size. Acceptance runs at Large; there are no separate layouts for
accessibility sizes.

| Token                              | Value | Role                                                |
| ---------------------------------- | ----- | --------------------------------------------------- |
| `--font-sans`                      |       | System (PingFang SC / SF Pro)                       |
| `--font-rounded`                   |       | SF Rounded, numerals only                           |
| `--text-large-title`               | `34`  | Tab root titles (Large Title, bold)                 |
| `--text-large-title--line-height`  | `41`  |                                                     |
| `--text-moment-title`              | `28`  | Moment screen title (Title 1, heavy, white outline) |
| `--text-moment-title--line-height` | `34`  |                                                     |
| `--text-reward`                    | `22`  | Reward amount, rounded heavy (Title 2)              |
| `--text-reward--line-height`       | `28`  |                                                     |
| `--text-title`                     | `20`  | Section and sheet titles (Title 3, semibold)        |
| `--text-title--line-height`        | `25`  |                                                     |
| `--text-body`                      | `17`  | Content, list primary text, inputs (Body)           |
| `--text-body--line-height`         | `22`  |                                                     |
| `--text-secondary`                 | `15`  | Row subtitles, places (Subhead)                     |
| `--text-secondary--line-height`    | `20`  |                                                     |
| `--text-meta`                      | `13`  | Time, poster, footers (Footnote)                    |
| `--text-meta--line-height`         | `18`  |                                                     |

The reward and the primary action wrap rather than truncate at any size.

## Spacing, radius, targets

| Token            | Value |
| ---------------- | ----- |
| `--space-1`      | `4`   |
| `--space-2`      | `8`   |
| `--space-3`      | `12`  |
| `--space-4`      | `16`  |
| `--space-5`      | `20`  |
| `--space-6`      | `24`  |
| `--space-7`      | `32`  |
| `--radius-chip`  | `12`  |
| `--radius-card`  | `18`  |
| `--radius-sheet` | `24`  |
| `--radius-pill`  | `999` |
| `--touch-min`    | `44`  |

Radii are continuous corners. Buttons are pills.

## Stickers

| Token                    | Value | Use                                    |
| ------------------------ | ----- | -------------------------------------- |
| `--sticker-border`       | `3`   | White die-cut border, stickers ≥ 48 pt |
| `--sticker-border-small` | `2`   | Stickers under 48 pt                   |
| `--sticker-shadow-y`     | `5`   | Shadow offset                          |
| `--sticker-shadow-blur`  | `6`   | Shadow radius                          |
| `--sticker-rotation-max` | `8`   | Degrees; rotate between 2 and this     |

- Flat fills, no outline strokes. Photo → subject cut-out (VisionKit) when available;
  otherwise the task type's sticker icon.
- Stickers never wrap buttons, text or navigation.

## Mascot

- **Drawing: style C1** (design canvas, 品牌元素 → 小貘 C 重画). Big head, short legs; one outer
  outline in mascot-line, and a single inner line on the saddle edge. The saddle wraps from
  behind the shoulders to the rump. Cream-rimmed ears, round eyes with a highlight, blush
  cheeks. Side view: a short, soft, drooping trunk. Front view: a round snout with two nostrils,
  no outline. Far-side legs are one shade darker. Every expression, pose, the coin, badges and
  growth stages are drawn from these rules; no second style.
- **Expressions follow real events.** The same event always shows the same expression; a tap
  stops any mascot animation.
- **Any moment, including negative ones.** Errors may use dizzy; disputes, reports and money
  moments may use upset or angry. The copy stays plain (see Voice).
- **One trait, one meaning.** The saddle carries things; the trunk points and hands things over.
  New poses do not have to relate to bounties.
- While 小貘 drafts a bounty it shows its thinking expression next to the draft.
- Animated with Rive (see AGENTS.md). Final character art comes from a designer, following C1.

## Voice

| Context                                                                     | Tone            |
| --------------------------------------------------------------------------- | --------------- |
| Completion, sticker book, empty states, onboarding                          | Playful allowed |
| Errors, disputes, reports, cancellations, payments, coins, account security | Plain, no jokes |

Humour is seasoning: the user is part of the joke, never its target. When a joke does not
translate into all three languages, drop it.

## Motion

| Token               | Value | Use                                                        |
| ------------------- | ----- | ---------------------------------------------------------- |
| `--duration-press`  | `90`  | Press feedback                                             |
| `--duration-fade`   | `150` | Appear / disappear                                         |
| `--duration-settle` | `240` | Layout changes, card pop (spring)                          |
| `--duration-peel`   | `420` | Sticker peels off and flies into the sticker book (spring) |

Motion principles:

- **Weight**: things that land squash and settle (spring), never stop dead.
- **Cause and effect**: the user sees where an object comes from and where it goes (coin into
  the bounty slot, coins from the sticker into the balance).
- **Paired with haptics and sound**: every signature animation has a matching haptic and sound.
- **Interruptible and skippable**: no animation blocks input for more than its duration.
- **Waiting has a picture**: split a wait into steps the user takes part in (confirm the photo
  and type while the server works) and show a small 小貘 loop instead of a spinner.

Completion pairs `peel` with a light haptic and a paper sound. Sound is on by default, follows
the ring/silent switch, and can be turned off in settings. Every animation respects Reduce
Motion. Easing curves and a reduced-motion token set are added with the first production
animation.

## Information architecture

Navigation uses NativeTabs with a native Stack per tab (see AGENTS.md, UI baseline). Tabs, the first screen and how future verticals
(租房 / 二手 / 拼车) are reached are decided in feature specs, not here.

## Component inventory

| Component      | Replaces                              |
| -------------- | ------------------------------------- |
| `AppText`      | raw font sizes                        |
| `StatusBadge`  | status strings and ad-hoc colours     |
| `TaskCard`     | per-screen card layouts               |
| `Sticker`      | ad-hoc image borders and shadows      |
| `MomentScreen` | per-screen celebration layouts        |
| `ListState`    | ad-hoc empty / error / loading states |

## Verification

- `src/ui/theme/tokens.test.ts`: contrast for every colour pair above.
- `node scripts/design-check.mjs`: token drift between this file and `tokens.ts`, plus raw
  colours, font sizes and font families in `src/`.
- UI checks in light and dark; status shapes distinguishable under colour-blindness simulation.
