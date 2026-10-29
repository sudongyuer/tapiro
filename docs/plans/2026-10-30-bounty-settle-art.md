# Bounty step 7: settlement art, the payer's 已结清 card and the 「一起办成的事」 book

> **For agentic workers:** execute task by task (superpowers `subagent-driven-development` if available). Track steps
> with checkboxes. Only one Simulator-using agent runs at a time. Tasks write their UI cases but do not run them; the
> last task runs the selection once (Pace, 2026-10-29). When all tasks are done, run `spec-lifecycle` before the PR (only
> "Deviations and rulings" is updated; the bounty spec is implemented after step 12).

**Status:** ready to start on the recommended options. UI questions 68–74 were drawn on 2026-10-29 while the user was
asleep and are **taken overnight on the ★ options, overturnable**; canvas page 05, board 「【待定】悬赏 · 结清 · 第 68–74 题」.
The step 7 PR is not merged until the user has reviewed those answers.

**Goal:** When a bounty settles, the payer (poster) finds the home card that said 「等{name}确认」 turned into a green
「已结清」 card carrying the sticker. 「收进贴纸本」 flies the sticker to the 我的 tab and the card leaves (10A). The sticker
book becomes 「一起办成的事」: one book for both sides, with each label saying who helped whom (11A). Celebration G keeps
playing for the payee, and its book title follows.

**Built contracts:** `stickers` with `role` payee / payer and `category` (`supabase/migrations/20261026000600_payment_category_and_stickers.sql`).
`confirm_payment_received` writes both stickers and returns `{ state, firstSettled, stickerCount }`, where
`stickerCount` counts both roles (`20261026000700_settle_both_sides.sql`). On the client: `stickerArt` maps category to
art (`src/lib/stickers/model.ts`), and `EarnedSticker` / `CategorySticker` draw it (`src/ui/`). The live-items store has
its accessory ranking in `src/lib/liveItems.ts`.

**Spec:** `docs/specs/2026-10-11-bounty-design.md`: Implementation order 7; Prerequisites note on the payer-side sticker;
decisions 2B, 10A, 11A; Motion row 「Payer card turns 已结清; sticker flies to 我的」. Foundation spec: 「Settlement
celebration and sticker book (2026-10-26)」 and 「Reputation, reviews, stickers, mascot」. Canvas: 「悬赏 · 开工前（二）进行中与
结清」 (10A, 11A drawn), page 06 「贴纸本「我帮过的忙」· 只读版」 and 「G 贴进贴纸本」.

## Decided (do not re-ask)

- **2B** Both sides get a sticker on every settle, typed by the bounty's category. Already built server-side.
- **10A** The payer's 「等{name}确认」 card turns, in place, into the green 「已结清」 card from the canvas:
  - the sticker hangs over the top-right edge, tilted 8°;
  - tag 「已结清」;
  - line 「{title} · {name}确认收到了」;
  - headline 「办成了，贴纸给你」, with the amount on the right;
  - a full-width 「收进贴纸本」 pill;
  - 小貘 says 「{name}收到钱了，这单办成啦」.

  Tapping 「收进贴纸本」 peels the sticker off and flies it in an arc to the 我的 tab with a light haptic, then the card
  leaves. The sticker is already in the book whether or not the payer taps. There is no full-screen moment for the payer.

- **11A** One book, newest first, with no sections. Title 「一起办成的事」, subtitle 「每办成一单、钱结清，就多一张」. Labels say
  who helped whom: 「帮小林取快递」 for the payee, 「Lily 帮我买奶茶」 for the payer. The 我的 row and the celebration's book
  title use the same title. en 「Done together」, ms 「Selesai bersama」.
- **The two roles look the same in the book.** 11A distinguishes them by the label only; the art, tilt and grid stay
  the same (three columns, `StickerBook.dc.html` A).
- **Mascot level counts both roles.** The foundation spec says 「one per settled item for each side … each adds growth」,
  and the level is lifetime and cosmetic. Nothing is built here: the mascot level is foundation step 6.
- **Celebration G is unchanged for the payee.** `stickerCount` already counts both roles, which matches one book. The
  first-settle badge keys on the payee count, so 「第一次收到钱！」 stays true.
- **Not in step 7:** the DOOD / CapWords photo-sticker looks (`docs/product-notes.md` Stickers), which are step 9. Nothing
  here conflicts with them: the book cell, label and flight take any `StickerArt`, so a photo sticker kind slots in later.
  Q74 keeps the category art as built for the same reason.

## Gaps found while preparing

1. **The counterpart's name is not stored.** `stickers` has `owner_id`, `payment_id`, `role`, `title` and no
   counterpart, so the 11A labels need a read change. Profiles are readable by every signed-in user, and payments by
   both parties. But `payments.payer_id` / `payee_id` reference `auth.users`, so PostgREST cannot embed `profiles`. One
   RPC `sticker_book()` joins `payments` and `profiles` (contract below).
   - The name is read live, not snapshotted, so a deleted account's name does not persist in other people's books (the
     payment's party id becomes null on deletion). That gives the "no name" case asked as Q72.
2. **The client model has no `role`.** `Sticker` gains `role` and `counterpartName`; the fixture gains both.
3. **No server state for the payer's card.** The payments list drops settled payments (`neq('state', 'settled')` in
   `paymentService.ts`), and nothing records whether the payer has collected the sticker. The fix is one column
   (`stickers.collected_at`), a read `settled_cards()` and a write `collect_sticker(id)` (contracts below). Existing
   payer stickers are backfilled as collected, so old settles do not flood the home.
4. **The flight target is native.** NativeTabs draws a native `UITabBar`. RN cannot read the 我的 item's frame, and RN
   views inside a tab's screen render below the tab bar. So the sticker would vanish under the bar before it reaches
   the icon. AGENTS.md says to implement in Swift what RN cannot do at system quality. The kit gets a small flight
   overlay that reads the tab item frame and animates a snapshot of the sticker above the bar (ruling 4, Task 5).
5. **Free-text titles do not compose into 「帮小林取快递」.** Titles are typed by the poster (「帮取快递」, 「帮忙排队领证件」,
   「陪诊」). 「帮」 + name + title gives 「帮小林帮取快递」, and en/ms cannot splice a name into a free title at all. Asked as
   Q71.
6. **"Category art" is partly built.** `stickerArt` → `CategorySticker` already reaches the celebration and the book (P4).
   Only 代取 has an illustration (`ParcelArt`); the other seven are S1 colour tiles with an SF Symbol. Whether to draw
   seven illustrations now is asked as Q74, because step 9's photo-sticker direction may replace them.
7. **Copy that only fits the payee:** `stickers.book.title` 「我帮过的忙」, `stickers.book.sub` and `stickers.empty.body`
   「帮别人做完一单、收到钱之后…」. They change in Task 2. The celebration's `pay.celebrate.*` lines are payee-only and stay.
8. **Rides.** `stickers.item_kind` can be `ride`, and 11A's wording (帮 / 帮我) does not fit a shared ride. Ruling 6.

## UI questions (drawn 2026-10-29; taken overnight on ★, overturnable)

Drawn on the canvas as questions 68–74. ★ marks the recommendation.

| #   | Question                                                     | Options                                                                                                                                                                                       | ★   |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 68  | Where the 已结清 card ranks in the stack                     | A after the cards that need you (欠钱, 等你确认, bounty actions), before in-progress and 等对方 · B always in front until collected · C where 「等对方确认」 was (last)                       | A   |
| 69  | How long the card stays if 「收进贴纸本」 is never tapped    | A until tapped, at most 7 days, then it is collected on its own · B once: gone after it is first shown (like 9A one-time cards)                                                               | A   |
| 70  | Two or more settles since the last open                      | A one card per settle, each with its own 「收进贴纸本」 · B one merged card 「2 单办成了」 with the stickers fanned and 「全部收进贴纸本」                                                    | A   |
| 71  | How the book label is built from a free title                | A two lines: 「帮小林」 / 「Lily 帮我」, then the title as typed · B one line with the category verb 「帮小林代取」 (title dropped) · C title plus a 我帮 / 帮我 tag and the name by the date | A   |
| 72  | The label when the counterpart has no name (deleted account) | A 「帮一位同学」 / 「一位同学帮我」 · B no role line, title only (as built)                                                                                                                   | A   |
| 73  | The 「收进贴纸本」 flight (curve, duration; Reduce Motion)   | A peel 160 ms + arc 520 ms with celebration G's split curves, haptic on landing · B straight 300 ms ease-in-out, no peel · C spring arc (perceptual 450 ms, damping 0.8)                      | A   |
| 74  | Category sticker art in the book and the celebration         | A keep the built S1 tiles (colour + SF Symbol; 代取 is the parcel), illustrations decided with step 9 · B draw seven flat illustrations now, like the parcel                                  | A   |

Every option keeps the same Reduce Motion path for Q73: no flight; the sticker and the card fade out in place over
200 ms. The haptic stays, and VoiceOver announces 「已收进贴纸本」.

## Rulings made in this plan (overturn by saying so)

1. **Card source.** The 已结清 card comes from `settled_cards()`, through a live-items source `stickers` registered in
   `src/lib/stickers/live.ts`. It is a lib, not a feature, so home can call `collect` without importing a feature.
   - Kind `settled`, detail `SettledDetail` (sticker id, art, title, counterpart, amount as `Money`).
   - The card renders in `src/features/home/cards/SettledCard.tsx`.
   - The amount shown is what the payer paid (`paid_minor` / `paid_currency`), formatted with the built money
     formatter.
2. **Ranking (68A).** `ACCESSORY_KINDS` becomes `oweMoney › rideSoon › owedToYou › bountyAction › settled ›
bountyInProgress › waitingConfirm`. A settled card is only full-size when it is the front card. Behind another card
   it shows as a strip 「{title} · 办成了」, with no sticker hanging over the card in front.
3. **Collect.** Tapping 「收进贴纸本」 starts the flight and calls `collect_sticker` at the same moment. The sticker is
   already in the book, so the motion is a true statement and does not wait for the write.
   - A failed collect does not bring the card back mid-session. The sticker id is kept in memory, and the mark is
     retried on the next home load, never in a loop (same rule as step 6 ruling 7).
   - Under 69A, `settled_cards()` returns nothing older than 7 days. The read marks those rows collected, so the card
     never shows after day 7.
4. **Flight overlay in the kit.** Swift adds `StickerFlight.flyToTab({ viewTag, tabIndex, reduceMotion })`.
   - It snapshots the RN sticker view (`snapshotView(afterScreenUpdates: false)`) and reads the tab item's window frame
     from the tab bar controller's `tabBar`.
   - It animates the snapshot in a passthrough overlay above the tab bar with `UIViewPropertyAnimator`, using the Q73
     values. It resolves when the sticker lands, which is when JS plays the haptic and removes the card.
   - If the frame cannot be read (no tab bar, or the item is hidden), it resolves at once with `{ landed: false }` and
     JS uses the Reduce Motion fade.
   - The existing kit module facade exports it; no new bridge package. A spike step first proves the snapshot and frame
     on Simulator (Task 5).
5. **Labels (71A, 72A).**
   - Line 1 (bold, one line): payee 「帮{name}」, payer 「{name}帮我」.
   - Line 2 (secondary, at most two lines): the title as stored.
   - With no name, line 1 reads 「帮一位同学」 / 「一位同学帮我」.
   - VoiceOver reads 「{line1}，{title}，{date}」.
   - en: 「Helped {{name}}」 / 「{{name}} helped me」; ms: 「Bantu {{name}}」 / 「{{name}} bantu saya」. The copy pass
     reviews these.
6. **Rides.** A ride sticker's line 1 is 「和{name}」 for both roles (「和一位同学」 with no name). Rides have no 帮 direction.
7. **Blocked counterparts keep their name in the book.** The book is private to its owner and is history, as the pay
   sheet's history is. Blocking changes visibility of live items, not records.
8. **Refresh.** The book reloads on screen focus, and the card source on home load, foreground and pull, as the other
   sources do. A failed card load shows the home source issue as the payments source does. A failed book load keeps
   the built failed / stale states, never an empty book.

## Contracts

- `stickers.collected_at timestamptz null`. Backfill: every existing payer row gets `collected_at = earned_at`. Payee
  rows are never read for it.
- `sticker_book()` returns `setof jsonb`, `security definer`, own rows only, newest first:
  `{ id, paymentId, role, itemKind, category, title, earnedAt, counterpartName }`. `counterpartName` is the other
  party's `profiles.display_name`, or `null` when that party is gone. It replaces the client's direct `from('stickers')`
  select.
- `settled_cards()` returns `setof jsonb` for the caller's `role = 'payer'` bounty and ride stickers with
  `collected_at is null` and `earned_at > now() - interval '7 days'`:
  `{ stickerId, paymentId, itemKind, category, title, earnedAt, counterpartName, amount: { minor, currency } }`. The
  amount is from `paid_minor` / `paid_currency`. It first marks the caller's older uncollected payer rows collected (69A).
- `collect_sticker(sticker uuid)` returns `{ collected: true }`. It is idempotent, and only the owner of a payer row may
  call it. Typed errors: `not_found` (not yours, or not a payer row).
- Client: `Sticker` gains `role: 'payee' | 'payer'` and `counterpartName: string | null`. `stickerLabel(sticker, t)`
  returns `{ line1, title }`. The live kind is `settled`.
- Kit: `StickerFlight.flyToTab(options): Promise<{ landed: boolean }>` (ruling 4).

## Tasks

Parallel groups: **Tasks 1, 2 and 5 can run in parallel.** Their files are disjoint (SQL, locale files, Swift kit) and
none consumes another's new contract. **Tasks 3 → (4 ∥ 6) → 7 → 8** follow, where 4 and 6 run in parallel: disjoint
files (`src/features/stickers` + `MeView` vs `src/lib/liveItems.ts` + `src/features/home`), both consuming Task 3's
model. Task 7 needs Tasks 5 and 6.

### Task 1: SQL — collected flag, book read, card read, collect (gaps 1, 3; 69A)

- [ ] Write the migration `supabase/migrations/20261030000000_sticker_book_reads.sql`:
  - add `collected_at` and backfill it;
  - add `sticker_book()`, `settled_cards()` and `collect_sticker()`;
  - grant execute to `authenticated` only.
- [ ] Add pgTAP tests in `supabase/tests/stickers.test.sql` for:
  - the payee's book row names the payer, and the payer's names the payee;
  - a deleted counterpart reads `null`;
  - another user sees nothing;
  - a payer card appears on settle and is gone after `collect_sticker`;
  - collect is idempotent, and a payee row or another user's row fails;
  - a row older than 7 days is marked collected and not returned;
  - the backfill leaves no old cards;
  - the amount is the paid currency.
- [ ] `supabase test db` passes.

### Task 2: Copy in three languages (11A, 71A, 72A, 10A)

- [ ] Write zh-Hans first, then en and ms:
  - `stickers.book.title` / `sub` / `empty.body` per 11A;
  - `stickers.label.payee` / `payer` / `payeeUnnamed` / `payerUnnamed` / `ride` / `rideUnnamed` / `a11y`;
  - `home.card.settled.*` (tag, line, headline, 收进贴纸本, strip, a11y, 已收进贴纸本 announcement);
  - `home.say.settled`.
- [ ] `src/lib/i18n/resources.test.ts` passes.

### Task 3: Sticker model, service, labels and the card source (gaps 1–3; rulings 1, 3, 5, 6)

- [ ] `src/lib/stickers`:
  - `role` and `counterpartName` on `Sticker`;
  - the service reads `sticker_book()`;
  - `stickerLabel`;
  - `live.ts` with `settled_cards()`, `collect` and the source registration;
  - fixture variants with both roles, an unnamed counterpart, a ride, the worst-case names (40 code points) and titles
    (120), and `-uiVerifySettled none|one|two|behind|worst`.
- [ ] Unit tests for the label of every role × kind × named / unnamed, and for card mapping and ranking. A failed collect
      keeps the card hidden this session and retries the mark once on the next load.

### Task 4: Book screen 「一起办成的事」 (11A, 71A, 72A)

- [ ] `StickerCell` gets the two-line label (line 1 bold, title secondary, at most two lines) and the VoiceOver label.
      The 我的 row and the celebration book title pick up the new title through the key.
- [ ] Update the cases `sticker_book` and `sticker_book_empty`. Add `sticker_book_labels` (both roles, unnamed, ride,
      worst; `LOCALES` with `ms`). Write them; do not run them.

### Task 5: Kit flight overlay (ruling 4, gap 4)

- [ ] Spike, time-boxed to 30 min: in a Debug scene, snapshot an RN view by tag and read the 我的 item frame under
      NativeTabs on iOS 26. If the frame cannot be read, fall back to the computed frame of the 4th of 4 items in the tab
      bar's bounds, and record that under Deviations.
- [ ] `modules/tapiro-kit/ios/StickerFlight.swift` plus the facade export and TS types. Run `pod install` in `ios/`
      after adding the file. UIKit work stays on the main queue.

### Task 6: 已结清 home card (10A, 68A, 70A)

- [ ] `src/lib/liveItems.ts`: add the `settled` kind and `SettledDetail`, and rank per ruling 2.
- [ ] `src/features/home/cards/SettledCard.tsx`: the 10A look with tokens only, the strip form behind another card, and
      `home.say.settled` when the card is in front. No motion yet.
- [ ] Unit tests for the ranking with every kind present.
- [ ] Add the case `home_settled_card` (front, behind an 欠钱 card, two settles, worst; `LOCALES` with `ms`). Update
      the `home_*` cases whose feed changes. Write them; do not run them.

### Task 7: 「收进贴纸本」 flight and collect (73A, ruling 3)

- [ ] On tap:
  - call `collect` and `StickerFlight.flyToTab` together;
  - on landing, play a light impact haptic and exit the card (opacity + translateY 8 pt, 220 ms, `EASE_ENTER`), and
    the stack closes with its built spring;
  - under Reduce Motion, use the 200 ms in-place fade;
  - announce 「已收进贴纸本」 once.
- [ ] Add the case `home_settled_collect` with video (one appearance). Write it; do not run it.

### Task 8: Run the selection, worst case, story map, PR gate

- [ ] Run the selection, each case once, and write it with its reasons in the report. The motion case gets one run
      with video.

  | Case                                     | Mode                | Why                                  |
  | ---------------------------------------- | ------------------- | ------------------------------------ |
  | `sticker_book`, `sticker_book_empty`     | zh-Hans light       | Book layout and copy changed         |
  | `sticker_book_labels`                    | zh-Hans light, `ms` | New labels; long copy                |
  | `home_settled_card`                      | zh-Hans light, `ms` | New card                             |
  | `home_settled_card`                      | dark                | A new colour surface over the stage  |
  | `home_settled_collect`                   | video               | Motion                               |
  | The `home_*` cases whose feed changed    | zh-Hans light       | Ranking changed                      |
  | `pay_settle_routine`, `pay_first_settle` | zh-Hans light       | The celebration's book title changed |
  | One case per above                       | `en`                | New copy keys                        |

- [ ] `break-ui` on the book and the 已结清 card, with:
  - a 40-code-point name and a 120-code-point title;
  - `ms`;
  - no name;
  - ¥ and RM 500;
  - three settles at once.

  Fix what breaks.

- [ ] Update `docs/story-map.md`:
  - `rep.sticker-book.*`: rename to 「一起办成的事」; add `labels`, `unnamed` and `ride`;
  - `pay.settle.payer-card`, `pay.settle.payer-collect`, `pay.settle.payer-card-expiry`;
  - motion and haptic as `device`.

  `node scripts/check-story-map.mjs` passes.

- [ ] Run the fast checks (`bun test`, `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`,
      `check-specs`, `check-story-map`, `supabase test db`) and `verify:smoke`.
- [ ] Retro, then `spec-lifecycle` (Deviations only), then the PR. The PR description lists the overnight answers 68A–74A
      as overturnable, and the PR waits for the user's review before merge.

## Motion

| Motion                                          | Purpose                     | Gate                                                      | Build                                                                                                                             |
| ----------------------------------------------- | --------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 「收进贴纸本」: sticker peels and flies to 我的 | spatial (where it went)     | Rare: at most once per settle; decided by 10A             | Kit `UIViewPropertyAnimator` overlay (ruling 4) with the Q73 values; light impact at landing; Reduce Motion: 200 ms fade in place |
| 已结清 card leaves the stack                    | preventing a jarring change | Follows the flight; once per settle                       | Reanimated opacity + translateY 220 ms `EASE_ENTER`; the stack's built spring closes the gap; Reduce Motion: fade only            |
| 等对方确认 card becomes 已结清                  | —                           | Happens across a reload (no Realtime); nothing to animate | No custom motion: the new card renders in place                                                                                   |
| Book cells                                      | —                           | Static page; scrolling is system                          | No motion                                                                                                                         |
| Payee celebration G                             | reward                      | Built                                                     | Unchanged                                                                                                                         |

## Not in this plan

Mascot level and its UI (foundation step 6), map (8), photo stickers and the DOOD / CapWords looks (9), push and Realtime,
so the card does not flip live (11), 先付 (12).

## Deviations and rulings
