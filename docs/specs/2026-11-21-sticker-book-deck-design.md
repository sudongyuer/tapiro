---
title: Sticker book as a card deck, a month calendar sheet and shareable posters
status: proposed
created: 2026-11-21
approved:
implemented:
supersedes:
superseded-by:
pr:
---

Builds on: [bounty](2026-10-11-bounty-design.md) step 9 record (95A card stack with a 卡堆 / 月历 switch, 96A month
calendar). Amends that record: the switch, the persisted view and the paged month calendar are replaced. Plan with the
decisions table: `docs/plans/2026-11-21-sticker-book-deck.md`. Reference: the owner's screen recording of a daily-card
app (2026-11-21), key frames in the plan.

## Problem

The owner asked (2026-11-21) to make the sticker book feel like the reference app: 「参考视频优化我们的卡片和日历的UI/UX，
做的很类似都行，我喜欢这种UI/UX交互，然后分享的卡片的功能」. Today the book (`src/features/stickers/`) is a paging
`FlatList` under a large outlined title with a native 卡堆 / 月历 segmented switch; the calendar shows one month at a time
behind chevrons, and nothing can be shared. The reference shows one deck that follows the finger, a continuous month
calendar in a sheet, and a poster share flow.

## Goals and scope

**Do**

- The book screen is the deck: a date title, 今天, the deck, the position line, and two pills (月历, 分享).
- Swiping turns cards with the finger (tilt, fly-off, the next card rising from the stack, rubber-band at the ends).
- 月历 is a page sheet with every month from the first sticker to now, art instead of numbers on done days, and a
  floating 分享{month} pill.
- 分享 opens a poster sheet (card poster or month poster) with three backgrounds, 存到相册 and the system share sheet.
- Posters render to a 3× PNG through the kit.

**Don't do**

- No Instagram Story button: it needs a Facebook app ID and the system sheet already reaches Instagram, WeChat and
  小红书.
- No video poster (the reference's second round button): stills only.
- No counterpart names on posters: posters leave the app.

## Decisions

The decisions table lives in the plan (S1–S8, ★ for veto) and is repeated in the Implementation Record when built.

## Data flow and ownership

- `useStickers` (the existing sticker store) feeds the book, the calendar sheet and the share sheet; the sheets are
  root routes (`/sticker-calendar`, `/sticker-share?card=<id>` or `?month=YYYY-M`) and read the same store.
- `bookFocus` (`src/features/stickers/services.ts`, cleared on session end) carries the card in front to the calendar
  (which month to open on) and a tapped day back to the book (`jumpTo` → the book remounts the deck on that card).
- The deck keeps the finger position in Reanimated shared values (`position`, `base`); React holds only the settled
  index, so a turn never re-renders per frame. Pose maths is pure (`deckMotion.ts`) and unit-tested.
- Posters are RN views drawn from `posterData.ts` (no names), snapshotted by `TapiroKit.snapshotPoster(viewTag)`
  (`modules/tapiro-kit/ios/PosterSnapshot.swift`, `drawHierarchy` at 3×, typed `{ status, code }` result) into a temp
  PNG that is saved with `expo-media-library` (add-only) or shared with `Share.share({ url })`, then deleted.

## Errors and degradation

| Failure                       | User sees                                               | System does                      |
| ----------------------------- | ------------------------------------------------------- | -------------------------------- |
| Sticker load failed           | 贴纸没加载出来 · 重试 (book, calendar and share sheets) | No empty book; retry on tap      |
| Refresh failed                | Last stickers with the stale line                       | Retry on tap                     |
| Snapshot or save failed       | Sheet stays, 存到相册 unchanged, 没存上，再试一次。     | Temp file deleted; no auto retry |
| Photos add permission refused | Sheet stays, the 「设置」 hint                          | Nothing saved                    |
| Share sheet could not open    | 没打开分享，再试一次。                                  | Temp file deleted                |

## UI/UX and motion

### Screens and states

| Screen      | Design board              | States to cover                                                             |
| ----------- | ------------------------- | --------------------------------------------------------------------------- |
| Book (deck) | reference video key frame | loading, failed, stale, empty, one, seven, 38, worst titles, ms, dark       |
| 月历 sheet  | reference video key frame | months Sep–Nov, a day with three, every day done, future days, ms           |
| Share sheet | reference video key frame | card and month posters × three backgrounds, saved, failed, worst title, one |

### Motion

| Motion                      | Purpose      | Trigger            | Duration token                             | Haptic / sound     | Reduce Motion          |
| --------------------------- | ------------ | ------------------ | ------------------------------------------ | ------------------ | ---------------------- |
| Card follows finger, tilts  | Cause        | Pan                | none (finger)                              | none               | No follow, no tilt     |
| Fly-off and next card rises | Continuity   | Release past 30 %  | `--duration-settle` spring, ratio 1, clamp | selection per turn | `FADE_IN` of next card |
| Spring back / rubber band   | Feedback     | Short release, end | `--duration-settle` spring, ratio 0.8      | none               | No motion              |
| Saved                       | Confirmation | Save succeeds      | none                                       | success            | Same                   |

## Known limits

- A pan that starts while a card is still flying snaps the card to the nearest whole position before following.
- Posters are fixed paper colours; they do not follow dark mode (they are images that leave the app).
- The poster preview is the exported layout; its size follows the sheet (at most 360 pt wide), so the PNG width
  varies by device (at most 1080 px).

## Implementation order

1. Pure logic and tests (`deckMotion`, `posterData`, `monthInView`, `shareTarget`, `bookFocus`).
2. Kit snapshot function; deck; calendar sheet; share sheet; routes.
3. Fixtures (`month`), UI cases, story map, docs.

## Verification

- `bun test` (deck, poster and calendar logic), `tsc`, lint, format, specs, story map, design check.
- UI cases `sticker_book`, `sticker_book_calendar`, `sticker_book_one`, `sticker_book_empty`, `sticker_book_labels`,
  `sticker_share`, `sticker_share_worst`; zh-Hans light, ms, dark for the deck and posters; a recorded swipe.
- Device: swipe feel in a Release build, Reduce Motion, VoiceOver adjust, a saved 3× poster in Photos.
