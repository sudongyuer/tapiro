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

1. **Sticker moments**: post published, task completed, empty states, the sticker book. Speckle
   background, one large die-cut sticker, at most one 小貘.
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
7. **Mascot only in moments.** Never on list cards or navigation chrome.
8. **Motion is named by intent** and respects Reduce Motion.

## Screen classes

| Class    | Screens                                                    | Background                | Mascot      | Stickers          |
| -------- | ---------------------------------------------------------- | ------------------------- | ----------- | ----------------- |
| Everyday | list, detail, chat, post flow, settings                    | system grouped background | never       | type icons only   |
| Moment   | post published, completed, empty, sticker book, onboarding | moment speckle            | at most one | one large sticker |

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
| `--color-mascot-ink`     | `#25232B`   |             | 小貘 head, legs, rump           |
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
with the user's text size.

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

Layouts must not truncate the reward or the primary action at accessibility sizes.

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

- 小貘: black head, legs and rump, cream saddle, white-rimmed ears, blush cheeks (tokens above).
  Animated with Rive (see AGENTS.md).
- Appears only on moment screens and waiting states; never on list cards or navigation chrome.
- Final character art comes from a designer; mockup drawings are placeholders.

## Motion

| Token               | Value | Use                                                        |
| ------------------- | ----- | ---------------------------------------------------------- |
| `--duration-press`  | `90`  | Press feedback                                             |
| `--duration-fade`   | `150` | Appear / disappear                                         |
| `--duration-settle` | `240` | Layout changes, card pop (spring)                          |
| `--duration-peel`   | `420` | Sticker peels off and flies into the sticker book (spring) |

Completion pairs `peel` with a light haptic and an optional paper sound (off by default).
Waiting states use a small 小貘 loop instead of a spinner. Every animation respects Reduce Motion.

## Information architecture

Navigation uses the system tab bar. Tabs, the first screen and how future verticals
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
