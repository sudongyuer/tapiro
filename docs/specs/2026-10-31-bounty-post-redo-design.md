---
title: Posting a bounty, redone (pick first, then a form under a live card)
status: proposed
created: 2026-10-31
approved:
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Builds on: docs/specs/2026-10-11-bounty-design.md; amends its UI decisions 1A, 16A–25A listed under
"Decisions". Visual mockups: design canvas https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o, page 05, boards
「发悬赏 · 方向 A 表单 + 实时卡片」 (questions 152–156), 「方向 B–E」 (question 157) and 「发悬赏 · C+A 合起来」
(questions 158–162). Decisions: user, 2026-10-30 (157 「C+A」) and 2026-10-31 (「全 ★」 to 152A–156A, 158A–162A). -->

## Problem

The user walked the step 9 build and found the post form weak (2026-10-30, screenshots in
`.verify/ui/zh-Hans/light/bounty_post_*`):

1. When the hand-drawn art appears it lands above the title and pushes the field being typed off screen; the art
   group is a large empty card plus a 「换一张」 row (`src/features/bounty/post/PostArt.tsx`).
2. The category is chosen a second time from a menu although the title (and the art) already say what it is.
3. The reward, the most important field, is the lightest: a grey 「RM ⌄」 and a 「1–500」 placeholder in a narrow
   cell (`RewardRow.tsx`).
4. Expanded optional rows are untidy: a red 「移除」 sits between rows and the description has no heading.
5. Nobody knows what a fair reward is, and a new user does not know how to phrase the request.

## Goals and scope

**Do**

- A first screen of six hand-drawn tiles (取快递, 带吃喝, 排队, 搬东西, 陪同, 课业) plus 「都不像，直接写」; a tile sets
  the category and the art.
- The form opens under a live card that shows what others will see: art (tap to swap), title, time and place line,
  reward. The card has a fixed height, so typing never moves the field.
- Per-category hints: title example, time and place labels, description example, a suggested reward range and four
  common amounts.
- A larger reward field with four one-tap amounts.
- Time quick picks per category above the 19A picker.
- Expanded optional rows get a heading row with 「移除」 on its right; collapsed rows show their current value.
- The confirm card shows the category above the title.

**Don't do**

- A server-computed reward median (160B). The suggestion is a fixed range in the app; a later question may switch it
  to real data once there are enough settled bounties.
- Free-text parsing of reward, time and place from one sentence (direction B); that belongs to 问小貘.
- Rejected directions: B 一句话发 (recognition errors in three languages), D 大卡片 (eight colour backgrounds and a
  collapsing hero), E 一步一问 (three or four 「继续」 taps per post, overturns 1A).

## Decisions

| Decision                  | Choice                                                                                                                                                                                                                        | Why                                                                                | Alternatives considered                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 157 Direction             | C + A: pick a tile first, then the 1A form under a live card                                                                                                                                                                  | Fixes the repeated category, the reward guess and the jumping art; keeps 1A and 2A | B one sentence, D hero card, E one question a screen |
| 158 Entry tiles           | Six common tiles + 「都不像，直接写」; 代办 and 其他 go through 直接写                                                                                                                                                        | Fits one screen without scrolling; an 其他 tile would mean the same as 直接写      | B all eight categories                               |
| 153 Category in 直接写    | Guessed from the title with the hand-art keywords, marked 「按标题自动」; a manual choice stops the guessing; no guess leaves it empty and 下一步 asks for one (25A still required)                                           | Same keywords as the art, so card and category agree                               | Manual only                                          |
| 159 Hints follow category | Title example, time label (几点前 / 哪天 / 什么时候), place label (在哪取 / 送到哪 …), description example, suggested range and amounts follow the category; changing the category in the form changes them; typed text stays | The second screen should feel made for this errand                                 | B prefill only category and art                      |
| 160 Reward suggestion     | Fixed per-category range and four amounts for RM; in ¥ no suggestion line and amounts ¥10 / 20 / 30 / 50; 代办 and 其他 have no suggestion and RM 5 / 10 / 15 / 20                                                            | No new query; correct from day one                                                 | B server median, C amounts only                      |
| 154 Reward field          | Its own section: currency menu, large amount field, four amount buttons; the allowed range appears only in the error notice                                                                                                   | The reward is the field people hesitate over                                       | A2 no buttons, B the single row                      |
| 161 Time quick picks      | When time is expanded, three category picks above the 截止 / 时间段 picker set a deadline; picks already past or beyond the 30-day limit are hidden; the 19A picker stays for fine tuning                                     | One tap for most posts without overturning 19A                                     | B picker only                                        |
| 162 Opening with a draft  | A non-empty draft opens the form directly, with the tile screen beneath it (system back 「‹ 换一件事」); clearing the draft returns to the tiles                                                                              | A draft is never hidden behind a new start (data integrity: keep drafts)           | B always the tiles, with a 「接着写」 row            |
| 152 Art and title         | The live card replaces the art group and the 「换一张」 row; tapping the card's art swaps it (VoiceOver action 「换一张」)                                                                                                    | Fixed height; the art is visible from the first second when a tile was picked      | B small art left of the title, C card as form        |
| 155 Confirm               | Keeps 2A: whole card (category, title over up to three lines, time and place line, reward) + summary + cost line + bottom button                                                                                              | 24A as written; the category line helps the poster check the tile                  | B no confirm screen                                  |
| 156 Optional rows         | Expanded: a heading row (label + 「移除」 on the right), then the fields; collapsed: 「＋ label」 with the current value on the right (不限 / 不填就不上地图); the description count shows only from 450 characters           | Each block has a clear start; the red button no longer sits between fields         | B pushed sub-pages                                   |

Amended decisions of the bounty spec: 1A (the sheet now starts on the tile screen; the form no longer has the art
rows), 16A unchanged, 19A (quick picks added above the picker), 22A (after publishing, 「+」 opens the tile screen),
24A (a category line above the title), 25A (a tile presets the category; 直接写 starts empty or guessed).

## Data flow and ownership

- `src/features/bounty/post/postKinds.ts` owns the per-category hints: art, copy keys, suggested range and amounts,
  time picks as rules (`{ inMinutes }`, `{ day: 0 | 1 | 'weekend', at: 'HH:MM' }`). Pure data and functions, unit
  tested.
- The draft gains `categorySource: 'chosen' | 'auto' | null`; old drafts without it load as `'chosen'` when they have
  a category, else `null`. Picking a tile writes `{ category, art, categorySource: 'chosen' }` and keeps everything
  else. Typing a title updates the category only while `categorySource` is not `'chosen'`.
- Routes: `src/app/bounty-post/index.tsx` is the tile screen, `form.tsx` the form; the layout sets
  `unstable_settings = { anchor: 'index' }` and the 「+」 opens `/bounty-post/form` with `withAnchor` when the draft
  is not empty, otherwise `/bounty-post`.
- Publishing, the cost line, the unpaid hint and draft storage are unchanged.

## Errors and degradation

| Failure                                  | User sees                                                   | System does                           |
| ---------------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| 直接写 and the title matches no category | 「选类型」 in the category row; 下一步 shows 「选一个类型」 | Nothing is guessed; the draft is kept |
| A quick pick's time has passed           | That pick is not shown                                      | Picks are recomputed on each render   |
| ¥ selected                               | No suggestion line; ¥ amounts                               | Validation uses the ¥ limits (67A)    |

## UI/UX and motion

### Screens and states

| Screen      | Design board           | States to cover                                                                                      |
| ----------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Tile screen | 发悬赏 · C+A 合起来    | six tiles, 直接写, ms copy (longest), light/dark                                                     |
| Form        | 发悬赏 · C+A 合起来    | from a tile, from 直接写 (auto / none), live card empty and full, ¥, time expanded with picks, worst |
| Confirm     | 方向 A 表单 + 实时卡片 | category line, three-line title, time and place                                                      |

### Motion

No new motion. The tile screen pushes the form with the system push; the card's art changes without motion: the
86A arrival keyframe, re-keyed inside the card's hosted view, left the new drawing invisible on the Simulator, and a
swap is a repeated tap that the motion gate does not animate; the publish drop (94A) is unchanged.

## Known limits

- Suggested ranges are guesses until real data exists; they are copy, reviewed with the en/ms pass.
- 代办 and 其他 have no tile and no hints.

## Implementation order

1. `postKinds.ts`, draft `categorySource`, the title-driven category guess; unit tests.
2. Routes: tile screen, form route, anchor and the 「+」 target; 162A.
3. Form: live card, reward section with amounts and suggestion, per-category labels, time picks, heading rows.
4. Confirm card category line; copy in zh-Hans, en, ms.
5. UI cases: new `bounty_post_pick`; update the post cases whose screens changed; story map rows.

## Verification

- `bun test` for `postKinds`, draft migration, category guess and time picks.
- UI cases: `bounty_post_pick` (tiles → form with hints, 直接写 auto category, back to tiles keeps the title, draft
  opens the form), updated `bounty_post_form`, `bounty_post_art`, `bounty_post_optional`, `bounty_post_currency`,
  `bounty_post_worst`, `bounty_post_draft`, `bounty_post_publish`; zh-Hans light, `ms` for the tile screen and form,
  `en` for new copy keys, dark for the tile screen and the live card.
- The user's walkthrough on the Simulator.

## Implementation Record (2026-10-31)

PR: not opened yet · Commits: b01d680..3241797

Status stays `proposed` until the owner approves this spec; the canvas choices behind it were approved on 2026-10-31
(「全 ★」).

### What was built

- Tile screen with six errands and 「都不像，直接写」; a tile writes category, art and `categorySource: 'chosen'`.
  Evidence: `src/features/bounty/post/PostPick.tsx`, `titleEdit.ts` (`pickPatch`), `src/app/bounty-post/index.tsx` (3241797)
- Per-category hints, suggested ranges, amounts and time picks as data. Evidence: `src/features/bounty/post/postKinds.ts`,
  `kindCopy.ts`, copy under `bounty.post.kind.*`, `bounty.post.timePick.*` in the three locale files (3241797)
- 直接写 guesses the category from the title until a manual choice. Evidence: `titleEdit.ts` (`titlePatch`), `CategoryRow.tsx` (3241797)
- Live card at the top of the form, fixed height, art tap swaps. Evidence: `PostArt.tsx` (`PostLiveCard`), `src/ui/TaskCard.tsx` (`kicker`, `placeholder`, `artPress`) (3241797)
- Reward section, time quick picks, heading rows. Evidence: `RewardSection.tsx`, `TimePicks.tsx`, `OptionalRows.tsx` (`HeadingRow`, `AddRow`), `PlaceRows.tsx` (3241797)
- A kept draft opens the form over the tile screen. Evidence: `src/app/bounty-post/_layout.tsx` (`anchor: 'index'`), `src/app/(tabs)/bounty/index.tsx` (`withAnchor`), `hasPostDraft.ts` (3241797)
- Confirm card shows the category line and up to three title lines. Evidence: `PostConfirm.tsx` (3241797)

### Deviations from the design

| Design said                                              | Shipped                                                                                                                         | Why                                                                                                                                        | Confirmed by                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Motion: the card's art keeps the 240 ms arrival keyframe | The card swaps art without motion (Motion section updated before approval)                                                      | The re-keyed entering animation inside the card's `RNHostView` left the new drawing invisible (`bounty_post_art` pixel count 0, run video) | Pending: owner, with this spec's approval |
| The form keeps 取消 (1A)                                 | The form's top left is the system back 「‹ 要帮什么忙？」; 取消 sits on the tile screen; the sheet still closes by a swipe down | A pushed screen in a native stack gets the back button; HIG keeps one dismiss affordance per screen                                        | Pending: owner, with this spec's approval |
| The category menu re-hints the form                      | Choosing a category in the form keeps a swapped art; only a tile resets the art                                                 | Publishing must send the art the user chose (`bounty_post_art`)                                                                            | not intent-changing                       |

### Bugs fixed during implementation

- **Symptom:** live card art blank after typing. **Root cause:** Reanimated entering keyframe on a re-keyed view inside `RNHostView`. **Fix:** no motion on the card (3241797)
- **Symptom:** amount buttons, time picks and 移除 reported 34 pt or 20 pt targets; `controlSize('large')` truncated 「RM 10」. **Root cause:** bordered buttons size to the label. **Fix:** label height `CHIP_LABEL_HEIGHT` (`RewardSection.tsx`) with the regular size (3241797)
- **Symptom:** `postSheet.test.ts` failed between tests on Flow syntax. **Root cause:** `postSheet.ts` imported the draft store, which pulls in React Native. **Fix:** `hasPostDraft.ts` (3241797)

### Verification

- `bun test` → 1566 pass, 4 fail; the 4 are `scripts/check-file-size.test.ts`, untouched, failing only in this checkout and passing 9/9 in a clean `origin/main` worktree
- `bunx tsc --noEmit` → only the pre-existing `TermsLine.tsx` and `LiveCardStack.tsx` errors that `origin/main` has; `bun run lint:changed`, `format:check`, `check:size`, `check-story-map`, `check-specs`, `design-check` → pass
- `bun run verify:smoke` → 4/4 pass
- UI cases, zh-Hans light: `bounty_post_pick`, `_form`, `_art`, `_optional`, `_currency`, `_draft`, `_publish`, `_worst`, `_place`, `_failed`, `_unpaid_hint`, `_blocked`, `_coin`, `_no_balance`, `money_worst` → pass (last run of each after its fix); ms light: `_pick`, `_form`, `_optional`, `_art` → pass; dark: `_pick`, `_form` → pass; en: `_pick`, `_form` → pass. Artifacts in `.verify/ui/<locale>/<appearance>/<case>/`

### Known limits

- Suggested ranges are copy, not data (160A); a later question may switch to real medians.
- Picking the category the title already guessed keeps the 「按标题自动」 mark (the system menu reports no change).
- The cases after the last code change (chip sizing) reran `_form`, `_currency`, `_optional`, `_pick`; the other post cases last passed before it.
