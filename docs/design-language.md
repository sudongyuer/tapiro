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

The mascot stage at the top of the home screen is a moment area inside an everyday screen: it may
show 小貘 at full size with its state pose and background. It collapses to a strip with a ≤ 32 pt
head when scrolled (docs/specs/2026-10-11-foundation-design.md).

Empty and error states of lists inside the home screen follow the everyday class: an inline card
with a ≤ 32 pt head, one line and one button. Reason: the stage above already shows the full-size
小貘 (bounty board, decision 32A).

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

### Hold to commit

The hold button's track is the accent; the gold fill appears only while the user holds (12A, 49A).

| Token                   | Light     | Dark      | Use                                       |
| ----------------------- | --------- | --------- | ----------------------------------------- |
| `--color-hold-track`    | `#25232B` | `#F3EFE6` | `HoldButton` track (the accent)           |
| `--color-on-hold-track` | `#FFFFFF` | `#25232B` | Label on the track (on-accent)            |
| `--color-hold-fill`     | `#F6C66B` | `#D99A2B` | Gold fill while holding and while sending |
| `--color-on-hold-fill`  | `#25232B` | `#25232B` | Label and spinner on the gold fill        |

### Status

| Token                  | Light     | Dark      | Use                                                 |
| ---------------------- | --------- | --------- | --------------------------------------------------- |
| `--color-urgent`       | `#C4321F` | `#FF6B5A` | Deadline under 3 h, overdue, destructive            |
| `--color-success`      | `#187A50` | `#3ECF8E` | Completed                                           |
| `--color-warning`      | `#965A00` | `#FFB340` | Needs your action                                   |
| `--color-urgent-fill`  | `#FCE6E2` | `#3D1D19` | Error card behind urgent text (form errors)         |
| `--color-warning-fill` | `#FFF2D6` | `#3A2A0E` | Notice banner behind warning text (re-check prompt) |

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
| `--color-mascot-eye`     | `#FFFFFF`   |             | 小貘 eye whites and highlights  |
| `--color-mascot-snout`   | `#3A3742`   |             | 小貘 front-view snout           |
| `--color-moment-chip`    | `#FFFFFFBF` | `#FFFFFF1A` | Info chip on moment screens     |

In dark mode only, the 12 pt tier heads (`TierMark`, on the board, the detail and the applicant rows) add a 1 pt
outer outline in `--color-mascot-saddle`, so the dark ink head keeps at least 3:1 against the dark grouped
background. Light mode and every other mascot drawing are unchanged. Source: user, question 56A (2026-10-28).

### Live cards, stage and categories

Dark mode keeps the pastel surfaces (decision D2): cards and stage stay light on the dark
background and their text stays dark ink. The only exception is the pay card, which inverts.

| Token                       | Light     | Dark      | Use                                             |
| --------------------------- | --------- | --------- | ----------------------------------------------- |
| `--color-card-pay`          | `#25232B` | `#F3EFE6` | Live card: you owe a payment                    |
| `--color-on-card-pay`       | `#F3EFE6` | `#25232B` | Text and icons on the pay card                  |
| `--color-card-ride`         | `#F5C8A0` |           | Live card: ride (椰糖杏)                        |
| `--color-on-card-ride`      | `#25232B` |           | Text and icons on the ride card                 |
| `--color-card-progress`     | `#DCEBD2` |           | Live card: a bounty in progress                 |
| `--color-on-card-progress`  | `#25232B` |           | Text and icons on the progress card             |
| `--color-card-calm`         | `#F4F0E6` |           | Live card: nothing pending                      |
| `--color-on-card-calm`      | `#1C1C1E` |           | Text and icons on the calm card                 |
| `--color-ride`              | `#F5C8A0` |           | Ride identity colour (same value as the card)   |
| `--color-stage-urgent`      | `#FBE1D3` |           | Home mascot stage: something urgent             |
| `--color-stage-live`        | `#F9E3CC` |           | Home mascot stage: in progress (no yellow)      |
| `--color-stage-calm`        | `#DCE5EE` |           | Home mascot stage: nothing pending              |
| `--color-on-stage`          | `#1C1C1E` |           | Text on every stage background                  |
| `--color-stage-sun-urgent`  | `#FF9F7A` |           | Stage sun: something urgent                     |
| `--color-stage-sun-live`    | `#F6B47F` |           | Stage sun: in progress (apricot, no yellow)     |
| `--color-stage-sun-calm`    | `#F3EFE6` |           | Stage sun: nothing pending (low cream sun)      |
| `--color-stage-bubble`      | `#FFFFFF` |           | 小貘's speech bubble; ask pill on the calm card |
| `--color-sticker-pickup`    | `#C89B62` |           | 代取 sticker                                    |
| `--color-sticker-buy`       | `#A8D5A2` |           | 代买 sticker                                    |
| `--color-sticker-queue`     | `#F2B8A8` |           | 代排 sticker                                    |
| `--color-sticker-handle`    | `#D9CCF2` |           | 代办 sticker                                    |
| `--color-sticker-move`      | `#B7C9D6` |           | 搬运 sticker                                    |
| `--color-sticker-accompany` | `#9BC4E2` |           | 陪同 sticker                                    |
| `--color-sticker-study`     | `#F0C9DA` |           | 课业 sticker                                    |
| `--color-sticker-other`     | `#D8D4CC` |           | 其他 sticker                                    |
| `--color-on-sticker`        | `#25232B` |           | Glyph on every category sticker                 |

### Sticker book and receipt

Paper surfaces of the settlement celebration and the sticker book. They are paper, so dark mode keeps the same
values, as it does for stickers.

| Token                    | Light       | Use                                                        |
| ------------------------ | ----------- | ---------------------------------------------------------- |
| `--color-paper`          | `#FFFDF8`   | Sticker book page in the celebration                       |
| `--color-paper-line`     | `#EDE7DA`   | Ruled lines on the page                                    |
| `--color-paper-slot`     | `#D6D1C6`   | Dashed outline of an empty slot, binding dots              |
| `--color-paper-landed`   | `#187A5014` | Fill of the slot a sticker just landed in                  |
| `--color-on-paper`       | `#25232B`   | Text on paper and on the receipt                           |
| `--color-on-paper-muted` | `#6C6C70`   | Secondary text on paper, the receipt and sticker labels    |
| `--color-receipt`        | `#FFFFFF`   | Receipt card the sticker is peeled from; sticker labels    |
| `--color-paper-green`    | `#187A50`   | Green on paper: 第一次收款 badge fill, receipt amount      |
| `--color-glow`           | `#3ECF8E8C` | Glow centre when a sticker lands                           |
| `--color-glow-clear`     | `#3ECF8E00` | Glow edge                                                  |
| `--color-shine`          | `#FFFFFFB3` | Centre of the shine that sweeps the sticker and the amount |
| `--color-shine-clear`    | `#FFFFFF00` | Shine edge                                                 |

### Object stickers

The welcome screen's die-cut objects (parcel, coffee, queue ticket, books, umbrella, car, milk
tea). They are artwork, so dark mode keeps the same fills and the white die-cut border; the
outline is `--color-sticker-border` and dark lines use `--color-on-sticker`.

| Token                          | Light     | Use                        |
| ------------------------------ | --------- | -------------------------- |
| `--color-object-cardboard`     | `#C8925A` | Parcel box                 |
| `--color-object-cardboard-lid` | `#DDA874` | Parcel lid                 |
| `--color-object-tape`          | `#EBD3A8` | Parcel tape, coffee sleeve |
| `--color-object-coffee`        | `#7A4E35` | Coffee cup and handle      |
| `--color-object-roast`         | `#3B2F2A` | Coffee lid, tapioca pearls |
| `--color-object-red`           | `#D2412C` | Ticket number, top book    |
| `--color-object-grey`          | `#C7C7CC` | Ticket rule, hubcaps       |
| `--color-object-blue`          | `#1D6FD1` | Book                       |
| `--color-object-green`         | `#187A50` | Book                       |
| `--color-object-orange`        | `#E8833A` | Book                       |
| `--color-object-violet`        | `#6D4AFF` | Umbrella canopy            |
| `--color-object-coral`         | `#E8604C` | Car body, straw            |
| `--color-object-glass`         | `#BFE3F5` | Car windows                |
| `--color-object-milk-tea`      | `#EFD9B4` | Milk-tea cup               |
| `--color-object-cream`         | `#F3EFE6` | Milk-tea lid               |

### Sign in with Google

Google's branding guidelines fix these values (developers.google.com/identity/branding-guidelines,
light and dark themes, standard-colour G). They are not Tapiro colours and are used only by the
Google sign-in button.

| Token                   | Light     | Dark      | Use                    |
| ----------------------- | --------- | --------- | ---------------------- |
| `--color-google-fill`   | `#FFFFFF` | `#131314` | Button fill            |
| `--color-google-stroke` | `#747775` | `#8E918F` | 1 pt inside stroke     |
| `--color-google-label`  | `#1F1F1F` | `#E3E3E3` | Button label           |
| `--color-google-blue`   | `#4285F4` |           | G logo                 |
| `--color-google-green`  | `#34A853` |           | G logo                 |
| `--color-google-yellow` | `#FBBC05` |           | G logo                 |
| `--color-google-red`    | `#EA4335` |           | G logo                 |
| `--google-stroke-width` | `1`       |           | Stroke width in points |

The stage hill is drawn in the screen background (`systemGroupedBackground`), so the stage meets
the page in both appearances.

Contrast rules, enforced by `src/ui/theme/tokens.test.ts`:

- Accent ≥ 4.5:1 against white (light) and `#1C1C1E` (dark), and on-accent ≥ 4.5:1 on accent.
- Each status colour ≥ 4.5:1 against white and `#F2F2F7` (light) and `#1C1C1E` (dark).
- Each `--color-on-card-*` ≥ 4.5:1 on its card, also at the 72 % muted opacity used for
  secondary card lines; `--color-on-stage` on every stage and on the bubble; and
  `--color-on-sticker` on every category colour, in light and dark.
- Each hold label ≥ 4.5:1 on its surface in light and dark: on-hold-track on the track 15.5:1 (light) and
  13.5:1 (dark); on-hold-fill on the gold 9.8:1 (light) and 6.4:1 (dark).
- Yellow is never a brand colour; it is owned by 美团 / 闲鱼 / Timee in this market. The one exception (12A) is
  `--color-hold-fill`, the gold that fills the hold-to-commit button only while the user holds or the choice is
  being sent; it never appears at rest.

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

| Token                                | Value | Role                                                |
| ------------------------------------ | ----- | --------------------------------------------------- |
| `--font-sans`                        |       | System (PingFang SC / SF Pro)                       |
| `--font-rounded`                     |       | SF Rounded, numerals only                           |
| `--text-wordmark`                    | `48`  | Tapiro wordmark, rounded heavy, white outline       |
| `--text-wordmark--line-height`       | `56`  |                                                     |
| `--text-amount-hero`                 | `62`  | Celebration amount, rounded heavy, white outline    |
| `--text-amount-hero--line-height`    | `66`  |                                                     |
| `--text-amount`                      | `48`  | Live-card amount and countdown, rounded heavy       |
| `--text-amount--line-height`         | `52`  |                                                     |
| `--text-amount-compact`              | `36`  | Amount beside a card title, rounded heavy           |
| `--text-amount-compact--line-height` | `40`  |                                                     |
| `--text-large-title`                 | `34`  | Tab root titles (Large Title, bold)                 |
| `--text-large-title--line-height`    | `41`  |                                                     |
| `--text-moment-title`                | `28`  | Moment screen title (Title 1, heavy, white outline) |
| `--text-moment-title--line-height`   | `34`  |                                                     |
| `--text-reward`                      | `22`  | Reward amount, rounded heavy (Title 2)              |
| `--text-reward--line-height`         | `28`  |                                                     |
| `--text-title`                       | `20`  | Section and sheet titles (Title 3, semibold)        |
| `--text-title--line-height`          | `25`  |                                                     |
| `--text-body`                        | `17`  | Content, list primary text, inputs (Body)           |
| `--text-body--line-height`           | `22`  |                                                     |
| `--text-secondary`                   | `15`  | Row subtitles, places (Subhead)                     |
| `--text-secondary--line-height`      | `20`  |                                                     |
| `--text-meta`                        | `13`  | Time, poster, footers (Footnote)                    |
| `--text-meta--line-height`           | `18`  |                                                     |

The reward and the primary action wrap rather than truncate at any size.

## Spacing, radius, targets

| Token               | Value |
| ------------------- | ----- |
| `--space-1`         | `4`   |
| `--space-2`         | `8`   |
| `--space-3`         | `12`  |
| `--space-4`         | `16`  |
| `--space-5`         | `20`  |
| `--space-6`         | `24`  |
| `--space-7`         | `32`  |
| `--radius-chip`     | `12`  |
| `--radius-card`     | `18`  |
| `--radius-sheet`    | `24`  |
| `--radius-pill`     | `999` |
| `--touch-min`       | `44`  |
| `--opacity-pressed` | `0.7` |

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

Navigation uses NativeTabs with a native Stack per tab (see AGENTS.md, UI baseline).

- Four tabs: 悬赏 · 拼车 · 消息 · 我的. The tab icon is the C1 front head.
- The 小貘 button sits in the search slot on the right of the bar and opens the 问小貘 half sheet.
- The accessory strip above the bar shows the single most urgent item and minimises on scroll.
- Home: mascot stage (background by state: urgent, live, calm) → live-card stack (pay, ride,
  in progress, calm) → bounty section. The stage collapses to a strip on scroll.

Details: docs/specs/2026-10-11-foundation-design.md.

## Component inventory

| Component        | Replaces                              |
| ---------------- | ------------------------------------- |
| `AppText`        | raw font sizes                        |
| `Mascot`         | ad-hoc 小貘 drawings (C1 side, front) |
| `LiveCard`       | per-screen live-card layouts          |
| `MascotStage`    | per-screen home hero areas            |
| `AccessoryStrip` | ad-hoc urgent-item bars               |
| `StatusBadge`    | status strings and ad-hoc colours     |
| `TaskCard`       | per-screen card layouts               |
| `TierMark`       | ad-hoc tier labels (name + 1–4 heads) |
| `Sticker`        | ad-hoc image borders and shadows      |
| `MomentScreen`   | per-screen celebration layouts        |
| `ListState`      | ad-hoc empty / error / loading states |
| `HoldButton`     | ad-hoc hold-to-confirm controls       |

## Verification

- `src/ui/theme/tokens.test.ts`: contrast for every colour pair above.
- `node scripts/design-check.mjs`: token drift between this file and `tokens.ts`, plus raw
  colours, font sizes and font families in `src/`.
- UI checks in light and dark; status shapes distinguishable under colour-blindness simulation.
