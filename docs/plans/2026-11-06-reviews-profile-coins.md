# Foundation step 6 and the account-free part of step 5: reviews, profile, mascot level, coins in 我的, weekly feed, invites

> **For agentic workers:** execute task by task. Only one Simulator-using agent runs at a time. Tasks write their UI
> cases but do not run them; the last task runs the selection once (Pace, 2026-10-29). When all tasks are done, run
> `spec-lifecycle` (foundation spec, step 6 record and the step 5 part) before the PR.

**Status:** in progress. Questions 238–255 (canvas page 「06+ 评价、主页与小貘等级」, boards `RepPick1`, `RepPick2`,
`CoinPick1`) are answered with the ★ (owner, 2026-11-06: 「按你推荐的走」; 249 is B). Task 1 (server) is built
(2026-11-06); Task 2 (client core) is built (2026-11-06); Task 5 (profile) is built (2026-11-06); Tasks 6 (tier drop), 8 (coins in 我的) and 10 (invite page) are built (2026-11-06). Questions 256–259 are answered with the ★ (owner, later on 2026-11-06: 「都按推荐」): 256 A, 257 a1 + b1 + c1, 258 A, 259 A, and the ★ defaults of Tasks 1, 2, 5 and 6 are accepted; Tasks 3, 7 and 9 no longer wait on 257.

**Goal:** After a settled bounty or ride, each side can leave a sealed three-face review that both see together; a
profile shows trust first; a tier drop is explained once; 小貘 grows with the sticker count; 我的 shows coins with their
history; 小貘 can be fed once a week; a typed invite code rewards both friends after the friend's first real item.

**Architecture:** Supabase tables `reviews`, `review_replies`, `tier_drops`, `mascot_progress`, `weekly_feeds`,
`invite_codes`, `invites` with RLS on and no client grants; every read and write is a `security definer` RPC. Stickers
are the settlement fact that opens a review pair. Live-only review signals go through the `events` outbox to
`user:<uid>` (`docs/specs/2026-10-31-realtime-push-design.md`) from Task 2 on. Clients: `src/features/reputation/`
(reviews, profile, tier drop, mascot level) and `src/features/coins/` (balance and history, weekly feed, invites), each
with a Supabase service, a fixture service for verify mode and a store; features do not import each other.

**Tech stack:** Expo SDK 58, React Native 0.88, Expo Router, Supabase (Postgres 17, pg_cron), bun test, pgTAP,
`verification/ui` (AXe).

**Spec:** `docs/specs/2026-10-11-foundation-design.md` (Decisions 「Reputation」, 「Reviews」, 「Mascot level curve」,
「Coins: free grants」, 「Ledger」, 「Account deletion」; Behaviour 「Reputation, reviews, stickers, mascot」 and 「貘币」;
Implementation order 5 and 6). Research: `docs/research/2026-11-06-reviews-profile.md`. Story map: `rep.reviews.*`,
`rep.tier.*`, `rep.stickers.levels`, `rep.profile.*`, `coins.ledger.history`, `coins.grants.weekly-feed`,
`coins.grants.invite`.

## Decided (do not re-ask)

- Three faces 开心 / 一般 / 不开心, chips and an optional sentence; only after settlement; sealed until both submit or 7
  days, and a one-sided review is shown alone when the window ends; the reviewee replies once (foundation, ReviewA,
  RepBC). Only chips count toward 靠谱度; free text never does.
- 238–255 as answered below. 112 no longer matters: 218 A gives one car sticker per ride, and the level counts stickers.
- The tier thresholds of 2026-10-27 (`private.tier_for`), the 180-day window and the daily 03:30 recompute stay.
- In-app purchase waits for the developer account; 买貘币 is not shown (252 A).
- Account deletion removes the user's reviews (F10); ledger rows stay anonymised.

## Gaps found while preparing

1. **Rides without a Tapiro payment do not count toward 靠谱度.** `record_settled` runs per payment, so a Grab-split ride
   (or one where nobody but the organiser boarded) writes no `settled` reputation event. Such rides do earn stickers and
   reviews. Asked as 258.
2. **A review cannot be reported.** `report(target_user, message, …)` covers people and chat messages. A review sentence
   is public free text. Asked as 259.
3. **Ride routes on public profiles.** A ride's title is its route of short names, and a start of kind `home` can point
   at where someone lives. Asked as 256; the server hides it until answered.
4. **Motion is not chosen.** The sealed animation inside the review sheet (ReviewA), 小貘 growing on the stage (249 B)
   and the leaf and chew (253 A) are motion choices that belong to the owner (AGENTS.md, Animation). Asked as 257, to be
   drawn on the canvas with numbered options before Tasks 3, 7 and 9.
5. **Accessory art.** 250 A needs four hand-drawn accessories (小红帽, 书包, 雨伞, 围巾) in the 93 A crayon style. Task 7
   ships placeholders drawn as stand-ins; the art is a separate drawing task.

## ★ Server defaults (Task 1, 2026-11-06, for veto)

- **Chips** are stored as keys, validated per the reviewee's role (240 A): helper `on_time`, `careful`, `kept_posted`,
  `extra_kind` | `late`, `no_heads_up`, `unfinished`, `item_damaged`; poster `clear_ask`, `paid_promptly`,
  `easy_to_talk`, `polite` | `not_as_described`, `slow_to_pay`, `changed_ask`, `rude`; organiser `left_on_time`,
  `fair_split`, `clear_meetup`, `good_company` | `late`, `cancelled_late`, `wrong_fare`, `rude`; rider `on_time`,
  `paid_promptly`, `good_company`, `considerate` | `late`, `luggage_unmentioned`, `slow_to_pay`, `rude`. 开心 takes only
  good chips, 一般 and 不开心 only not-good ones; none is required; at most 4, no repeats. A review counts as negative
  only when it has a not-good chip, so 不开心 with no chip does not lower 靠谱度.
- **Who reviews whom** comes from stickers: a bounty pair holds the two stickers of one settled forward payment; a ride
  pair is the organiser and one boarded member with the ride's car sticker (241 A). The 7-day window opens at the later
  of the pair's two stickers, so a rider boarded later by an appeal gets a full window.
- **Sentence and reply:** at most 200 characters after the chat trim (spaces, newlines, U+00A0, U+200B, U+FEFF); an
  empty sentence is stored as none.
- **Edit** (244 A) is the same `submit_review` call while the review is sealed; `review_locked` after. The window and
  lock checks use the clock after the pair lock, so a submit that waited past the window's end is refused.
  `submittedAt` is the last submit or edit, never the reveal.
- **Deletion:** reviews a user wrote or received go with their account (F10), so the other side's share and counts
  change; unlike reputation events, a deleted reviewer is not kept as one anonymous review.
- **Reveal:** the second submit reveals both at once; otherwise a review is visible from the window's end. Reads use
  `shown_at` (`coalesce(revealed_at, closes_at)`), so nothing waits on the job; `reveal_due_reviews()` (pg_cron
  `reviews-reveal`, every 10 minutes) stamps the reveal time.
- **Signals** wait for Task 2: every event kind must have a tap route (`src/lib/notifications/noticeTaps.test.ts` reads
  the kinds from the migrations), so the kinds land with the client routing. ★ plan: live-only `bounty.reviewed` and
  `ride.reviewed`, subject = the item id, to the reviewee on a first submit and to both on a reveal (the job too); no
  push (238 A). The `bounty.*` kind joins the tap-route table (to the status screen).
- **Reads:** clients have no grant on the tables; `review_state(kind, item)` returns one row per counterpart with
  `state` (`open` / `sealed` / `revealed` / `ended`), `theyReviewed` (never the content while sealed), `mine` with
  `editable` and `theirs` once visible; `pending_reviews()` feeds the home card.
- **Blocks** do not stop a review or hide one: the review is about a deal that happened, and a block must not become a
  way to avoid a negative chip.
- **Reply:** only the reviewee, only after the review is visible; repeating the same text answers with the stored reply,
  other text is `already_replied`.
- **Reviews in 靠谱度:** the share of visible reviews in the window without a negative chip gates a tier only from 3
  reviews: 靠谱 70 %, 很靠谱 80 %, 貘友 90 %. Below 3 reviews the old thresholds apply unchanged. Snapshots keep
  `review_count` and `good_review_share`, private like the other inputs.
- **Tier drop record:** the recompute writes a `tier_drops` row when a tier falls (never on a first snapshot or a rise)
  with the reason (up to 3 counted no-shows with date, kind and title; the negative review count) and the way back
  (settled items, new people and good reviews needed for the previous tier). `pending_tier_drop()` shows the newest
  unseen drop only while the user is still at that tier; `mark_tier_drop_seen(id)` marks it and any older one.
- **Mascot level** (`public.mascot_level`): Lv1 0, Lv2 3, Lv3 8, Lv4 15, Lv5 25, then +15 each, counting every sticker
  (both roles, car stickers included). `mascot_progress` keeps the seen level and the chosen accessory; people who
  already held stickers start with their current level seen, so only levels reached from now on play the moment.
  `my_mascot()` returns `levelUp`, `nextLevelAt`, the unlocked accessories and the one worn (the chosen one, else the
  newest). Cover colours from Lv6 are derived on the device; there is no choice to store yet.
- **Profile** (`profile_card(person)`): name, avatar, joined date, tier, `helped` (distinct people who paid you for a
  settled item, lifetime; a deleted account counts once), `settled` (lifetime), `completionRate` (the snapshot's
  180-day rate, only from 5 lifetime settled items, 246 A), `reviewCount` and face counts of visible reviews, the
  latest 3 (reviewer, face, chips, sentence, reply, bounty title), the public mascot (level, sticker count, accessory)
  and `blockedByMe`. `profile_reviews(person, before, max_count)` pages 20 at a time, newest first, cursor
  `shownAt|id`.
- **Weekly feed** (`feed_weekly()`): one `weekly_feeds` row per Malaysia week (Monday 00:00) under the user's coin lock;
  the answer is `fed` or `already_fed` with the balance and the next Monday, so 「谢谢！+1 貘币」 shows only after the
  server confirms (253 A). `weekly_feed_status()` drives the bubble (254 A).
- **Invites:** a 6-character code from the payment-reference alphabet (no 0, O, 1, I), made on the first
  `my_invite()`. `redeem_invite(code)` ignores case, spaces and hyphens; errors `code_not_found`, `own_code`,
  `already_redeemed` (a second, different code), `too_late` (after the first settled item), `mutual_invite` (the code's
  owner was invited by you); the same code again answers with the stored invite. The reward is 3 coins each the first
  time a sticker of the friend's comes from an item with someone other than the inviter; an inviter who deleted their
  account leaves the friend's 3 in place. Ledger rows carry no friend id, so the history line reads 「邀请奖励」 without
  a name. Settles take the invite lock shared (a code entry takes it exclusive), so settles never deadlock on it; two
  settles between two unrewarded invitees in opposite roles at the same moment can still meet on the invite row locks,
  and one fails and is retried by the user (known, rare).
- **Coin history** (`coin_history(before, max_count)`): ledger rows newest first, 50 a page (1–100), each with its
  Malaysia `month` (`YYYY-MM`) for grouping and the item title for spends, refunds and help grants; free posts write no
  row, as before.

## ★ Client core defaults (Task 2, 2026-11-06, for veto)

- **Signals:** migration `20261106000900_review_signals.sql` adds live-only `bounty.reviewed` and `ride.reviewed`
  (subject = the item id, never pushed) from a trigger on `public.reviews`: a first submit signals the reviewee only;
  a reveal signals both sides with no actor, so the submitter's other devices reload too; the second submit of a pair
  sends one reveal signal per person (its own insert sends none), and the reveal job signals both sides of each
  one-sided review it stamps. An edit while sealed sends nothing. `bounty.reviewed` taps open the status screen;
  `ride.reviewed` the ride (prefix route). The existing bounty and ride live handlers also reload on these kinds,
  which costs one extra read and is left as is.
- **Live handler:** `reviewStore` reloads the pending list and the item's review state when that item is on screen,
  marks it stale otherwise (read again on next open); a resync (`null`) reloads everything loaded; profiles on screen
  reload and the rest go stale. Coins reload the balance and mark the history stale on `payment.settled` and
  `ride.settled` (help grants, invite rewards); the mascot reloads on the same kinds (new stickers can level up).
  Every store also reloads on a return from background.
- **Loads:** every read is a `Loadable` (`src/lib/loadable.ts`): `loading` and `failed` carry no data, a failed
  reload of shown data is `stale` (kept, marked not current); a newer answer always wins over an older one. A local
  write (submit, reply, feed, redeem, block mark, mascot write) drops reads already in flight and, when it dropped
  one, reads again once, since the dropped read may have carried rows the write did not touch. A signal for an item
  off screen marks it stale, and a read already out for it lands as stale too. A next page is dropped when the first
  page was read again meanwhile, and appending a page never turns a stale list ready. A failed first load is never an
  empty list or a 0 balance. A deleted account's profile reads as gone (`useProfileGone`), not as a retryable failure.
- **Coins on screen:** the balance, the weekly feed and the invite read again whenever their screen gains focus and
  no read is out (the balance changes on posts and on refunds of your own cancels, and an inviter's reward sends the
  inviter no signal); a ready history keeps its loaded pages on return and reads again only when stale or failed. On
  screen they also reload on `payment.settled` and `ride.settled`. No next page starts while the first page is being
  read.
- **Writes:** submit, reply and the invite code are stored on the device before the call (`reviewDrafts`, per user;
  the invite code per user) and kept after any failure; nothing is retried automatically; a second tap while one is
  in flight is ignored; an invalid draft or reply is kept and reported as `invalid`. `closed`, `locked`, `notFound`
  and `failed` reload the item and the pending list (the review that is
  already public shows); `alreadyReplied` reloads the profile. A tier drop dismissed in the app stays hidden for the
  session even when `mark_tier_drop_seen` fails (it shows again on the next launch until marked). The weekly feed
  shows its answer only from the server (`answered: fed | already_fed`), `failed` otherwise.
- **Parsing:** an unknown pair state, face, role or tier fails the read (shown as failed, not guessed); an unknown
  coin reason reads as `other` so one new server reason does not blank the whole history. An invite answer may carry
  no code yet (a redeem before the first `my_invite()`). A typed code not in the code alphabet is refused on the
  device as `malformed` (same copy as `notFound`) without a call.
- **Copy:** chips, faces, level names, accessories, coin reasons, the sealed lines, the home card, the tier-drop
  lines, the weekly-feed bubbles and the invite page in zh-Hans, en and ms from the boards; new ★ wording where the
  boards had none: en faces Happy / Okay / Unhappy, ms Gembira / Biasa / Tidak gembira; en level names Baby, Little,
  Student, Teen, Young and Grown Tapir; accessories en Red hat / Backpack / Umbrella / Scarf, ms Topi merah / Beg
  galas / Payung / Selendang; coins keep the existing 「Coins」 / 「Syiling」; invite errors 「这是你自己的邀请码」,
  「你已经填过邀请码了」, 「完成第一单后就不能再填邀请码了」, 「TA 是你邀请来的，不能填 TA 的码」 and
  「没填上，请检查网络后重试」. The tier names stay under `bounty.tier.*`. Malay copy needs a native review (spec).
- **Verify fixtures:** `-uiVerifyReviews` / `-uiVerifyProfile` (`many` default, `one`, `empty`, `failed`, `worst`),
  `-uiVerifyRepFail <state,pending,submit,reply,profile,reviews,mascot,accessory,tierDrop>` (fail once),
  `-uiVerifyRepDelayMs`; `-uiVerifyCoins` (same variants), `-uiVerifyCoinsFail <balance,history,feedStatus,feed,
invite,redeem,historyAgain,historyMore,inviteAgain,redeemTooLate>` (`historyAgain` and `inviteAgain` fail the second read, a refresh; `historyMore` the first next page; `redeemTooLate` answers one redeem `tooLate` as if the first deal landed meanwhile), `-uiVerifyCoinsDelayMs`, `-uiVerifyInviteDraft`; calls are recorded under `uiVerifyRepCalls` and
  `uiVerifyCoinsCalls`. A ride id ending in `-rider` gives the rider's view (one organiser row); other ride ids give
  the organiser's four rows (open, sealed, they reviewed, ended). The friend code is `7KQ3XP`, mine `M8WQ4K`.
- **256 / 258 / 259:** nothing in the client depends on the answers: ride reviews parse with or without a route and a
  reviewer (256), counting rides is server-only (258), and reporting a review would be a later addition to Task 5
  (259).

## ★ Profile defaults (Task 5, 2026-11-06, for veto)

| #   | Decision ★                                                                                                                                                                                                                                                                                                                              | Why                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| P1  | The profile is a pushed Form in the current tab (`/<tab>/profile/[id]`, also `reviews/[id]`, and form sheets `report`, `reply`); the navigation title stays empty and the name is the header                                                                                                                                            | HIG push, back returns to where you were (247 A)                                                |
| P2  | Others: header → three numbers → 评价 (faces line, latest 3, 「全部 N 条评价」 only when there are more) → one 小貘 row without a chevron                                                                                                                                                                                               | 245 A; no big mascot view exists yet, so the row is not a link until Task 7                     |
| P3  | Own: header → numbers → 小貘等级 · 只升不降 card (level, progress, 再收 n 张 → next level, the four accessories as rows with ✓ or the unlocking level) → 一起办成的事 (opens the sticker book) → 评价 with 回复; the RepBC 靠谱度 explainer card is left out                                                                            | RepBC order; the explainer needs inputs the profile read does not return                        |
| P4  | The header note reads 「刚来 Tapiro」 while the person has no settled item, else 「近 180 天」                                                                                                                                                                                                                                          | 246 A board text                                                                                |
| P5  | 回复 opens a sheet 「回复评价」 quoting the review, with a 0/200 count; 发送 asks 「回复发出后不能修改」 (再想想 / 发出); the draft stays on the device across failures and closing, so no discard prompt                                                                                                                               | 243 A: confirm once, final                                                                      |
| P6  | ⋯ (others only) holds 举报 {name} and 屏蔽 {name}, or 解除屏蔽 {name} once blocked; a blocked profile says 「你屏蔽了{name}」 under the header; the report sheet is chat's sheet for a person (same reasons and copy, no message), offering a block afterwards; its note, like chat's, lives only while the sheet is open               | 127 A, reuse; reasons moved to `src/lib/report.ts` so features do not import each other         |
| P7  | Entries: bounty detail poster row (chevron), applicant avatar as its own 44 pt button plus 看{name}的主页 in the row's long-press menu (a tap on the rest of the row still chooses), the bounty thread's navigation title (ride group titles stay the route), the ride organiser line and each join-request name, and the 我的 name row | 247 A; the name stays inside the choose target because a selection row must stay one tap target |
| P8  | 256 A is one server switch, `private.ride_review_details_public()` (false); the reviewee now also sees the route of ride reviews on their own profile, which the Task 1 read had hidden                                                                                                                                                 | 256 A says the reviewee still sees both                                                         |
| P9  | Pull to refresh on the profile and the list; a failed refresh keeps the profile with 「没刷新成功 · 下面是上次加载的主页」 and 重试                                                                                                                                                                                                     | Data integrity: stale is never shown as current                                                 |
| P10 | A deleted account reads 「这个账号已经注销了」 with 返回                                                                                                                                                                                                                                                                                | Not a retryable failure                                                                         |

## ★ Tier-drop defaults (Task 6, 2026-11-06, for veto)

| #   | Decision ★                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Why                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| D1  | A root form sheet sized to its content (`fitToContents`) with the grabber; for the drawn copy it is a medium sheet (its title measured at 556–598 pt of 874 in zh-Hans, en and ms), and the worst copy grows it instead of clipping; there is no scroll view, so a 667 pt screen is a device check                                                                                                                                                                                                     | 248 A 中号; long Malay never cut                                           |
| D2  | It opens only over a tab screen, never over another sheet (the root sheets, and 举报 / 回复 inside the tabs), and waits until that sheet closes; one drop opens once per launch. Known gap: the check reads route segments, so an RN `Modal` open inside a tab (the payment celebration, a full-screen QR) is not seen; a drop lands on the first read after launch, before any of them                                                                                                                | Never stack sheets; first open after the drop                              |
| D3  | Any close marks it seen: 知道了, 看我的主页 (closes, then pushes your own profile in 我的) and dragging it down; a failed mark keeps it hidden this launch and it shows again next launch (Task 2 rule); a failed read shows nothing and marks nothing                                                                                                                                                                                                                                                 | Data integrity: a failure is neither a drop nor "seen"                     |
| D4  | Reasons: the no-shows the server lists (up to 3) as 「日期 · 标题」 joined by 「；」, a missing title reads 悬赏 / 拼车; negative reviews 「近 180 天里有 N 条评价提到了没做好的地方」, after the no-shows 「还有 N 条…」; with neither, 「近 180 天里顺利完成的次数和帮到的人，不够「原来的档位」了。」 (no counts, so no 「0 次」 and no plural)                                                                                                                                                     | The drawing has only the no-show line; the server also gives review counts |
| D5  | The way back names only the steps still needed (再顺利完成 N 次、帮到 N 个新的人、再收到 N 条好评); none left reads 「之后一直顺利完成，就能回到「…」。」                                                                                                                                                                                                                                                                                                                                              | No 「0 次」                                                                |
| D6  | Dates are month and day in `<language>-MY` on the device clock (10月7日, 7 Oct, 7 Okt); long titles are shown whole                                                                                                                                                                                                                                                                                                                                                                                    | Malaysian date order in en; nothing hidden                                 |
| D7  | 看我的主页 is the plain pill of the delete-account sheet (label colour), not the drawing's accent-coloured text                                                                                                                                                                                                                                                                                                                                                                                        | One secondary style for sheets                                             |
| D8  | New en / ms wording: reviews 「N review(s) mentioned something that went wrong」 / 「N ulasan menyebut perkara yang tidak berjalan baik」; steps 「get N more good review(s)」 / 「dapatkan N lagi ulasan baik」; fallback 「Keep finishing smoothly…」 / 「Terus selesaikan dengan lancar…」; a missing title Bounty / Carpool (as on the profile), Ganjaran / Tumpangan; 知道了 reads 「Got It」 in title case like the other en buttons (the board wrote 「Got it」). Malay needs the native review | Boards had only the drawn sentence                                         |

## ★ Coins defaults (Task 8, 2026-11-06, for veto)

| #   | Decision ★                                                                                                                                                                                                                                                                                                                                                                 | Why                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| C1  | 我的 gets a 「貘币」 row right under 一起办成的事 with the balance on the right (grouped digits, 1,234) and a chevron; during the first load, after a failed load and after a failed refresh the row shows no number (a refresh in flight keeps the last good number) (never 0, never an old number as current); the page says why                                         | 251 A; a failure is never 0                                                             |
| C2  | The row has no coin icon: the app has no coin art yet (the board's TapirCoin is canvas-only), and the other rows carry none                                                                                                                                                                                                                                                | Never draw a stand-in icon in product UI; the coin art joins the accessory drawing task |
| C3  | The 貘币 page is a pushed Form titled 貘币 (inline title): the balance in large rounded bold digits, then 「本月免费发布还剩 n 条（共 3 条）」, then one section per Malaysia month (newest first): 「11 月」 this year, 「2025 年 11 月」 otherwise (en 「November」 / 「November 2025」, ms 「November」 / 「November 2025」; the month names are copy keys, not `Intl`) | 251 A drawing; the year only when it differs                                            |
| C4  | A row reads the reason, with 「 · 标题」 for spends, refunds and help (one line, cut at the end), then the signed amount (+1 / −1, semibold) and the date as month and day on the device clock (11月2日, 2 Nov), like D6; VoiceOver reads the whole title, the amount and the date                                                                                         | Board text; nothing hidden from VoiceOver                                               |
| C5  | A failed first load of the balance or the history shows one 「没加载出来」 card with 重试 (reloads both) in place of what is missing; what did load stays; the history never reads 「还没有明细」 after a failure                                                                                                                                                          | Data integrity                                                                          |
| C6  | Pull to refresh reloads the balance and the history; a failed refresh keeps them with 「没刷新成功 · 下面是上次加载的貘币」 and 重试 (P9 pattern). A list marked stale by a signal while off screen reads again on open and shows no warning                                                                                                                               | Stale is never shown as current                                                         |
| C7  | The next page (50 rows) loads when the last row appears; a failed page reads 「更早的明细没加载出来 · 重试」                                                                                                                                                                                                                                                               | Same as 全部评价                                                                        |
| C8  | No 买貘币 anywhere (252 A); the free-post line has no 「下个月 1 号」 date, since the no-balance sheet already says it                                                                                                                                                                                                                                                     | 252 A; the drawing has only the count                                                   |
| C9  | New en / ms wording: stale 「Couldn’t refresh · Showing your coins from last time」 / 「Tidak dapat dimuat semula · Ini Syiling yang dimuatkan sebelum ini」; VoiceOver balance 「N coin(s)」 / 「N Syiling」; loading 「Loading coins」 / 「Memuatkan Syiling」. Malay needs the native review                                                                            | Boards had no such lines                                                                |

## ★ Invite defaults (Task 10, 2026-11-06, for veto)

| #   | Decision ★                                                                                                                                                                                                                                                                                                                                                                                                                                         | Why                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| I1  | 我的 gets 「邀请朋友」 right under 貘币 (no value on the right); it pushes a Form titled 邀请朋友                                                                                                                                                                                                                                                                                                                                                  | 255 A drawing order                                            |
| I2  | The first section: 「我的邀请码」, the code in large monospaced letters with letter spacing and text selection, then 复制 (secondary) and 分享 (primary) as two equal `PillButton`s without icons, as drawn, and the reward line 「朋友填了你的码…各得 3 颗貘币」 as its footer; VoiceOver spells the code letter by letter                                                                                                                        | 255 A; a spelled code is easier to read out to a friend        |
| I3  | 复制 copies the code alone (not the share text) and reads 「已复制」 for 2 s, like the pay sheet; 分享 opens the system share sheet with the board's text                                                                                                                                                                                                                                                                                          | The code is what a friend types; the text is for chat apps     |
| I4  | 「填朋友的码」 shows only while `canRedeem`: one field (monospaced, all caps, no autocorrect, ASCII keyboard, placeholder 「例如 7KQ3XP」) and 好 (a borderless 44 pt button, so a tap beside the field does not send; disabled while empty, a spinner while sending); Return also sends; 复制 and 分享 are disabled while there is no code                                                                                                        | 255 A; the code alphabet is ASCII                              |
| I5  | A refusal shows its line in red under the field and keeps what was typed; the line goes away when the code changes; 已经填过 and 完成第一单后 refusals, which reload the page and remove the field, show their line as a card at the top (announced to VoiceOver) until you leave the page, and drop the stored code; the typed code stays on the device across failures and relaunches and is cleared after success; nothing is resent on its own | Data integrity; 255 A 「不清空输入」                           |
| I6  | After a code is taken (or once it was taken earlier), the field is replaced by 「我填的邀请码」 with 「{name} 的码」 and, on the right, 「{code} · 还没完成」 or 「{code} · 已完成第一单 · +3」 (the code never cut by a long name); past the first deal without a code there is neither                                                                                                                                                           | The drawing shows only the field; this answers 「did it work」 |
| I7  | 「我邀请的人」 lists each friend (newest first, from the server) with 已完成第一单 · +3 or 还没完成; a deleted account reads 「一位同学」; with nobody invited the section is not shown                                                                                                                                                                                                                                                            | No empty-state copy on the board                               |
| I8  | A failed first load reads 「没加载出来」 with 重试; pull to refresh; a failed refresh keeps the page with 「没刷新成功 · 下面是上次加载的邀请」                                                                                                                                                                                                                                                                                                    | Same as the 貘币 page (C5, C6)                                 |
| I9  | The share sheet is replaced at the device boundary in verify mode (the text is recorded under `uiVerifyCoinsCalls`); the real sheet is a device check                                                                                                                                                                                                                                                                                              | Verify replaces services at their boundary                     |
| I10 | New en / ms wording: Copied / Disalin; 「Code I entered」 / 「Kod yang saya masukkan」; 「{name}’s code {code}」 / 「Kod {name} {code}」; 「A fellow student」 / 「Seorang pelajar」; the stale line. Malay needs the native review                                                                                                                                                                                                                | Boards had no such lines                                       |

## File structure

| Action | Path                                                                             | Responsibility                                            |
| ------ | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Create | `supabase/migrations/20261106000400_reviews.sql`                                 | reviews, replies, chips, pairs, RPCs, reveal job          |
| Create | `supabase/migrations/20261106000500_reputation_reviews.sql`                      | review share in the recompute, tier drops                 |
| Create | `supabase/migrations/20261106000600_mascot_profile.sql`                          | mascot level and progress, profile reads                  |
| Create | `supabase/migrations/20261106000700_coin_reasons.sql`                            | `weekly_feed`, `invite_inviter`, `invite_invitee`         |
| Create | `supabase/migrations/20261106000800_weekly_feed_invites.sql`                     | weekly feed, invite codes and rewards, coin history       |
| Create | `supabase/tests/{reviews,reputation_reviews,mascot_profile,weekly_feed_invites}` | pgTAP                                                     |
| Create | `src/features/reputation/`                                                       | review, profile, tier-drop and mascot services and stores |
| Create | `src/features/coins/`                                                            | balance and history, weekly feed, invite services         |
| Create | `src/app/(tabs)/*/profile/[id].tsx`, `src/app/review.tsx` (sheet)                | routes                                                    |
| Modify | bounty status, ride detail, home stage and cards, 我的 list                      | entries                                                   |
| Create | `verification/ui/cases/review_*`, `profile_*`, `coins_*`, `invite_*`, …          | UI cases with fixture services                            |

## Tasks

1. **Server** — **done 2026-11-06** (this plan's first PR): the five migrations and four pgTAP files above. Defaults
   above. Account deletion needs no Edge Function change: every new table cascades or sets null with `auth.users`.
2. **Client core** — **done 2026-11-06** (no UI): `src/features/reputation/` and `src/features/coins/` with types, parsers, the Supabase
   services, fixture services (`-uiVerifyReviews`, `-uiVerifyProfile`, `-uiVerifyCoins` variants: empty, one, many,
   failed, worst-case names), stores that never show a failed load as empty; a migration adding the review signals
   (Signals above) with their tap routes, and a live handler that reloads the open item's review state and the
   pending list; chip, face, level-name and coin-reason copy in zh-Hans,
   en and ms. Unit tests for parsing, the store states and the level curve (`rep.stickers.levels`). UI cases: none.
   Public surface for Tasks 3–10: `@/features/reputation` exports the hooks `useReviewState(kind, itemId)`,
   `usePendingReviews()`, `useReviewSubmit(target)`, `useProfile(personId)`, `useProfileGone(personId)`, `useProfileReviews(personId)`,
   `useReplyState(reviewId)`, `useTierDrop()`, `useMyMascot()`, `useAccessoryState()`; the stores `reviewStore`
   (`submit`, `draft`, `saveDraft`, `dismissFailure`, `reloadItem`, `reloadPending`), `profileStore` (`reply`,
   `replyDraft`, `saveReplyDraft`, `loadMore`, `reloadCard`, `reloadList`), `meStore` (`markLevelSeen`,
   `setAccessory`, `dismissTierDrop`); and the model helpers (`chipsFor`, `pickFace`, `toggleChip`, `validDraft`,
   `draftFromReview`, `draftChanged`, `canReview`, `daysLeft`, `mascotLevel`, `levelStartsAt`, `levelNameKey`,
   `unlockedAccessories`). `@/features/coins` exports `useCoinBalance()`, `useCoinHistory()`, `useWeeklyFeed()`,
   `useInvite()`, `coinsStore` (`feed`, `settleFeed`, `redeem`, `codeDraft`, `saveCodeDraft`, `loadMoreHistory`, the
   reloads), `groupByMonth`, `reasonKey`, `signedDelta`, `normalizeInviteCode`, `inviteCodeShaped`.
3. **Review sheet** (239 A, 240 A, 244 A, after 257): a large system sheet with 取消 and the title 「评价{name}」; faces,
   then the chip set for the reviewee's role (good chips for 开心, not-good for 一般 / 不开心), the sentence, 提交;
   the draft is kept on the device across failures and a discard asks first; the same sheet opens for 改一下 with the
   stored review. UI cases `review_sheet`, `review_sheet_edit`, `review_sheet_discard`, `review_sheet_failed`,
   `review_sheet_worst` (ms chips).
4. **Review entries** (238 A, 241 A, 242 A): under 已结清 on the bounty status screen one 「评价 {name}」 row with the
   days left; on a closed ride one row per counterpart (the organiser sees each rider, a rider sees the organiser);
   the sealed copy on both sides and 「评价已结束」; one home card per pending review until reviewed or the window
   ends. UI cases `review_entry_status`, `review_entry_sealed`, `review_entry_ride`, `review_entry_home`.
5. **Profile** — **done 2026-11-06** (243 A, 245 A, 246 A, 247 A; ★ details in 「★ Profile defaults」): a pushed screen in the current tab: header, three numbers, reviews (latest
   3, 「全部评价」 page), one 小貘 and stickers row; your own profile keeps the RepBC order and offers 回复 under each
   received review (confirm once, 200 characters); ⋯ with 举报 and 屏蔽 reusing the chat report and the block module;
   entries from the bounty poster row, applicant rows, the chat navigation title, ride member rows and the 我的 name
   row. UI cases `profile_other` (with paging), `profile_new`, `profile_worst` (ms), `profile_failed`, `profile_gone`,
   `profile_self`, `profile_reply`, `profile_report_block` and one `profile_entry_*` per entry.
6. **Tier-drop sheet** — **done 2026-11-06** (248 A; ★ details in 「★ Tier-drop defaults」): a medium sheet on the first open after a drop: the new tier, the reason, the way back,
   知道了 and 看我的主页; marked seen when dismissed. UI cases `tier_drop_no_shows`, `tier_drop_reviews`,
   `tier_drop_both`, `tier_drop_worst` (ms), `tier_drop_failed`, `tier_drop_dismissed`.
7. **Mascot level** (249 B, 250 A, after 257): the home stage shows the grown 小貘 with the worn accessory and the
   「我长大了！」 bubble until tapped; the tap opens 「小貘长大的时刻」 (RepBC2) once and marks the level seen; the
   accessory picker on your own profile; Reduce Motion swaps the image. UI cases `mascot_level_up`,
   `mascot_accessory`; motion: one appearance with video.
8. **Coins in 我的** — **done 2026-11-06** (251 A, 252 A; ★ details in 「★ Coins defaults」): a 「貘币 n」 row beside 一起办成的事 pushing the 貘币 page: the balance, free posts
   left this month and the monthly history; a failed load reads 「没加载出来 · 重试」, never 0. UI cases `coins_page`,
   `coins_page_empty`, `coins_page_failed`, `coins_page_worst`.
9. **Weekly feed** (253 A, 254 A, after 257): tapping 小貘 on the stage drops a leaf and chews once; 「谢谢！+1 貘币」
   after the server answers `fed`, 「这周吃饱啦，周一再来」 for `already_fed`, 「没喂上，再点一下试试」 on failure (no
   automatic retry); the idle bubble 「新的一周，点我喂片叶子」 or a small leaf beside 小貘 when a live item owns the
   bubble; the level-up bubble goes first; a VoiceOver action 「喂小貘」. UI cases `weekly_feed`,
   `weekly_feed_already`, `weekly_feed_failed`, `weekly_feed_busy_stage`; motion: one appearance with video.
10. **Invite page** — **done 2026-11-06** (255 A; ★ details in 「★ Invite defaults」): 我的 → 邀请朋友 with my code, 复制 and 分享 (system share sheet with the copy in the
    canvas), the code field only while `canRedeem`, 「没有这个邀请码」 and the other errors without clearing the field,
    and the progress rows. UI cases `invite_page`, `invite_redeem`, `invite_redeem_error`, `invite_worst` (ms).
11. **Wrap-up:** every new string in zh-Hans, en and ms; story-map stories marked done with their cases; the milestone
    selection (the cases above in zh-Hans light, `en` for new copy, `ms` where marked, dark for the review sheet and the
    profile); the foundation spec's Implementation Record for step 6 and the step 5 part.

## Questions (2026-11-06, answered)

Answered later on 2026-11-06 (owner, 「都按推荐」, relayed by the main session): **256 A**, **257 a1 + b1 + c1**,
**258 A**, **259 A**. The ★ defaults of Task 1, Task 2, Task 5 (P1–P10) and Task 6 (D1–D8) are accepted; the Task 8
coins defaults (C1–C9) came after and stay listed for veto.

256. Ride reviews on someone else's profile: **A★** show 「拼车」 without the route (a short name can be someone's home)
     and without the reviewer (who rode with whom); the reviewee still sees both on their own profile; **B** show the
     route's short names and the reviewer like bounty reviews. Touches privacy. The server does A until answered.
257. Motion for the sealed review, 小貘 growing and the leaf: drawn on the canvas page 「06+ 评价、主页与小貘等级」,
     boards `Motion257Seal`, `Motion257Grow` and `Motion257Leaf` (live previews, keyframes, exact values). Pick one per
     row before Tasks 3, 7 and 9 start. All three: transform and opacity only, Reanimated on the UI thread, one linear
     clock per sequence so a tap skips to the end; Reduce Motion drops movement and keeps 150 ms fades
     (`withTiming` with `reduceMotion: ReduceMotion.Never`), haptics stay.
     - **257a, sealed review** (plays only after the server acknowledges; occasional; purpose: state). **a1★** fold
       into an envelope: the chosen face moves into the envelope (320 ms, ease-in-out 0.77/0/0.175/1, scale 0.55), the
       envelope rises (200 ms ease-out 0.23/1/0.32/1), the flap folds shut (rotateX 180° → 0°, 200 ms), a 小貘 seal
       presses (spring `{ duration: 240, dampingRatio: 0.7 }`, scale 1.12 → 1, `impactAsync(Light)`), the copy fades
       in; about 0.75 s. Reason: shows "your review is put away, not public yet", the new double-blind rule. **a2** a
       sealed envelope pops in (spring `{ duration: 300, dampingRatio: 1 }`, 0.95 → 1) and the seal presses; 0.6 s.
       **a3** a 150 ms cross-fade with the light haptic only.
     - **257b, 小貘 grows on the stage** (rare; once per level when the stage is visible; purpose: state). **b1★**
       crouch then grow, origin at the feet: 140 ms ease-out to scaleX 0.93 / scaleY 0.81 (from the old 0.88), then
       spring `{ duration: 420, dampingRatio: 0.55 }` to 1 (peak about 1.07), the accessory fades in with 0.95 → 1
       (150 ms), the 「我长大了！」 bubble rises 6 pt (200 ms) at 560 ms; about 0.76 s; no haptic (the user did not
       cause it); a tap mid-way skips to the end and opens RepBC2. Reason: one weighted grow says "it grew" without a
       second celebration on an everyday screen. **b2** b1 plus six sparkles (520 ms), which repeat celebration G's
       sparks. **b3** a 240 ms cross-fade of the old and new image.
     - **257c, weekly-feed leaf** (occasional; purpose: feedback and cause and effect). **c1★** the leaf drops on the
       tap (translateY −110 → 0 pt with a −18° → 14° → 0° sway, 420 ms ease-out) and waits at the mouth, 「…」 only if
       the answer is not in by then; on `fed` one chew (two bites, scaleY 0.94 / scaleX 1.03, 360 ms ease-in-out,
       `impactAsync(Light)` on the first) and 「谢谢！+1 貘币」; on `already_fed` or failure the leaf falls to the
       hill and fades (240 ms) with no chew. Reason: feedback within 0.1 s, and nothing shows "eaten" before the server
       confirms. **c2** chew right after the drop (the literal 253 A); on `already_fed` or failure 小貘 has already
       chewed. **c3** press 小貘 (0.97, 90 ms) and show 「…」; drop and chew only after `fed`.
258. Rides without a Tapiro payment (Grab split, or riding alone): **A★** count a closed ride as a settled item for the
     organiser and each boarded rider (no on-time input), so carpool counts toward 靠谱度 the same either way; **B** keep
     counting only paid rides. Changes how tiers are computed.
259. Reporting a review: **A★** long-press a review on a profile → 举报 with the same reasons, snapshotting the face,
     chips and sentence like a chat message; a report never hides the review by itself; **B** only report the person
     from ⋯. Touches safety and moderation.

## Answers (canvas 「06+ 评价、主页与小貘等级」, 238–255; owner 2026-11-06, all ★, 249 B)

See `docs/plans/2026-10-30-coins-reputation-remaining.md`, 「Answers」, for the one-line answers; the drawings on the
boards `RepPick1`, `RepPick2` and `CoinPick1` carry the details this plan follows (chip tables, sealed copy, profile
order, the tier-drop copy in three languages, level names, the invite rules).
