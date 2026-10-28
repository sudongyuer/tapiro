---
title: Bounty board (悬赏令) v1
status: approved
created: 2026-10-11
approved: 2026-10-26
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Visual mockups: design canvas https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o, boards
「G 首屏 · 合体版」, 「G 首屏 · 15 种情况」, 「G · 列表/地图怎么切」 (V2), 「底部导航 N3+E · 完整稿」,
「悬赏与拼车 · 状态流程」, 「门槛 · 发布者设置」, 「门槛 · 申请人视角」, 「撮合付款 · 可点原型」,
「交互细节 · 六选」, 「G 贴进贴纸本 · 第三稿」. Builds on: docs/specs/2026-10-11-foundation-design.md. Built there:
steps 1–4 (accounts, shell and home G frame, payee methods, pay step and settlement) plus welcome A, the
`stickers` table, the settlement celebration G and the read-only sticker book. Not built: steps 5–9 (coins,
reputation and reviews, chat with report and block, 问小貘, push and Live Activity). Decisions: docs/KICKOFF.md rows
dated 2026-10-04 to 2026-10-26; the 2026-10-26 reconcile answers are recorded in "Decisions (2026-10-26)". -->

## Problem

Chinese students in Malaysia ask for small favours (collect a parcel, queue at JPJ, help move,
explain homework) in WeChat groups. The request scrolls away, nobody knows who took it, the
payment is chased by hand, and there is no record of who is reliable (KICKOFF 开局摘要;
`docs/research/2026-10-04-reputation.md`).

The 悬赏 tab exists only as a frame: `src/app/(tabs)/bounty/index.tsx` renders `HomeScreen`, whose
`BountySection` is a placeholder (「能接的悬赏」 / 「悬赏功能下一阶段上线」, `src/lib/i18n/locales/zh-Hans.ts`), and
the scroll content keeps `minHeight: windowHeight * 2` until the list lands (`src/features/home/HomeScreen.tsx:134`).
The pay step, settlement, stickers and the celebration are built and are reused here unchanged except where
"Prerequisites" says otherwise.

This spec covers the 悬赏 tab: browsing, posting, applying, choosing a helper, the bounty status
flow, cancellation, and the handoff to payment. Everything shared with carpool is in the
foundation spec and is only referenced here.

## Goals and scope

**Do (v1)**

- The 悬赏 tab is home layout G: 小貘 stage → live-card stack → bounties, viewed as a list or a
  map, switched by two stickers (V2), and the last view is remembered (KICKOFF 2026-10-10). The board replaces
  `BountySection` and removes the `minHeight` workaround.
- List titled 「能接的悬赏」 (KICKOFF 2026-10-11 B9): a distance axis as a sort aid, filters
  全部 / 急单 / 塞得进空档, cards with an 申请 button that tilts the sticker and stamps 已申请 (canvas G).
- Map: a real Apple map (`expo-maps`, `AppleMaps`) with bounty stickers as image annotations and
  the user's position; tapping a pin opens a detail card with 申请 (KICKOFF 2026-10-11 B8 "M2"). `expo-maps` is
  alpha in SDK 57 and annotations are images only ([docs](https://docs.expo.dev/versions/v57.0.0/sdk/maps/));
  sticker annotations are rendered to images.
- Posting through the manual 「+」 form, which leads to a confirm screen. A dynamic form: no online/offline field;
  optional fields depend on the content; location is optional (KICKOFF 2026-10-06 "表单应该是动态的").
- Every v1 bounty is 完成后付 and open to every signed-in user; 先付 and gates are in "Later: 先付 and application
  gates" (decision 7).
- Optional photo of the item turned into a die-cut sticker on the card (交互细节六选 item 4).
- Posting costs 1 貘币; the first 3 posts each month are free, shared with rides; the coin (or the
  free slot) is refunded when nobody was selected, the bounty expires, or the poster cancels before selecting
  (KICKOFF 2026-10-06; 2026-10-11 F4, B7).
- Applying is not accepting: an application carries one short note, and applicants wait for the poster to pick.
  There is no chat before selection (decision 8).
- Choosing a helper is a hold-to-commit action; unselected applicants see 「这次没选上」 (交互细节 item 5).
- The status flow from 「悬赏与拼车 · 状态流程」 (Q1–Q4), cancellation and its no-show record, completion → 撮合付款
  → settlement → a sticker for each side.
- Bounty states feed the home live cards and the N3+E accessory strip; a slipped arrival time strikes through the
  old time (KICKOFF 2026-10-11 items 1 and 2). Which states and their rank are decided on the canvas.
- Publishing flies the sticker into the live-card stack (item 3). The settlement celebration G plays on every
  settle, as built (KICKOFF 2026-10-26).

**v1: absent, arrives later**

- 问小貘 drafting into the confirm form: arrives with foundation step 8 (consent, `ai-draft`, 小貘体力). The manual
  form is the only v1 path.
- Chat between poster and helper, report, and the 发消息 button on the in-progress card: arrive with foundation
  step 7. The block list is carved out of step 7 as a prerequisite.
- Push notifications and the explicit permission prompt after the first post or application: arrive with
  foundation step 9. Every event has an in-app surface instead (Data flow → In-app events).
- Live Activity and Dynamic Island for `en_route`: arrive with foundation step 9.
- Reviews after settlement: arrive with foundation step 6 reviews; the prerequisite carves out only the level and
  the no-show record.
- Buying 貘币: arrives with foundation step 5 IAP, after the developer account exists.
- Realtime updates: none in v1 (freshness rule below).

**Don't do**

- Paid boosts 加急 / 置顶 / 装扮: deferred by KICKOFF 2026-10-06 ("暂时只要发布和 AI"). The 急 seal
  is derived from the deadline and free (KICKOFF 2026-10-11 B2).
- Multi-helper bounties: one helper per bounty; a two-person move is posted twice (B5).
- Money through Tapiro, escrow, or coins as a reward: the canvas board 「发布时选貘币或现金」 (PublishChoose) is
  superseded by KICKOFF 2026-10-05 ("貘币不能当最后的结算", direct payment) and must not be built.
- Swipe-through card browsing (F3) and the cork-board wall (F1): dropped (KICKOFF 2026-10-10).
- A full-screen AI chat as the main surface (`docs/research/2026-10-06-ai-native-patterns.md`).
- Background location. Location is When In Use only (`docs/research/2026-10-04-push-location.md`).
- A human support or dispute step for 「有问题」 (decision 10); admin tooling beyond the foundation spec.

## Prerequisites

Built before bounty step 1 (decision 1, order A). Each is carved from a foundation step; the rest of that step
stays where it is. Contracts are named at the level of this spec; columns are indicative.

| Piece                                  | Carved from                                                           | What bounty consumes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 Coin ledger without purchase        | Foundation step 5 (IAP spike and purchase stay there)                 | `coin_ledger` (append-only, server-written, balance derived, select-own); the shared monthly free allowance (3 posts per Malaysia calendar month, bounties and rides); service-role `spend_post(user, item)` returning `free` or `coin` and failing typed on no balance; `refund_post(item)` restoring the coin or the free slot, idempotent per item; grant entries per the foundation's free-grant rules, of which bounty triggers only "each help settled" (from the settle transaction); a `coin_balance()` read for the publish button |
| P2 Reputation level and no-show record | Foundation step 6 (reviews, mascot level and recompute UI stay there) | `reputation_events` (server-written; kinds include `no_show` with the item and the at-fault user, and `settled`); service-role `record_no_show(user, kind, item)` applying the one-waiver-per-60-days rule; `reputation_snapshots` tier per user (新朋友 / 靠谱 / 很靠谱 / 貘友), readable by every signed-in user as tier only; a scheduled recompute (pg_cron, rolling 180 days, inputs without reviews until step 6)                                                                                                                     |
| P3 Block list                          | Foundation step 7 (chat, report and the report queue stay there)      | `blocks` (blocker, blocked; self-owned, unreadable by the blocked user); `block_user` / `unblock_user` RPCs; an `is_blocked_between(a, b)` helper for RLS and RPCs. The block entry point on profiles and bounties is a canvas item                                                                                                                                                                                                                                                                                                         |
| P4 Payment-layer changes               | Foundation step 4 payment layer                                       | A partial unique index on `payments (item_kind, item_id) where reverses is null`, so a bounty has one open payment; `confirm_payment_received` writes a sticker for the payee and the payer (`stickers` unique on `(payment_id, owner_id)` instead of `payment_id`), copies the bounty's `category` into both, and keeps `firstSettled` / `stickerCount` for the payee; a check that `stickers.category` is null or one of the eight slugs; `stickerArt` maps a bounty category to `CategorySticker` in the book and the celebration        |

Notes:

- `open_payment` stays service-role only (`supabase/migrations/20261025000000_payments.sql`); the bounty
  transition functions are `security definer` and call it.
- The payer-side sticker changes the book and the mascot level count: the book's 「我帮过的忙」 /
  「每帮成一单、收到钱」 copy no longer fits the poster, and the payer has no celebration today (the payee settles in
  the pay sheet). Both are canvas items (decision 2); no copy or motion is written here.
- Location: the `postgis` extension is not enabled (only `pg_cron` and `pg_net`, `20261025000200_schedules.sql`).
  Bounty step 1 enables it, stores the place as `geography(Point)` with a GiST index, and `nearby_bounties` orders
  by distance. `expo-location` is not installed; the board step installs it with `bunx expo install`, sets
  `locationAlwaysAndWhenInUsePermission`, `locationAlwaysPermission` and `motionUsagePermission` to `false`,
  keeps `isIosBackgroundLocationEnabled` false, and gives `locationWhenInUsePermission` zh-Hans, en and ms text
  through the app config `locales` map ([docs](https://docs.expo.dev/versions/v57.0.0/sdk/location/)). `expo-maps`
  is not installed either; the map step adds it after its spike.
- Scheduled jobs (48 h auto-confirm, expiry) reuse the built pattern: pg_cron calling SQL directly or
  `call_edge_function`, which needs the Vault secrets `project_url` and `service_role_key` per environment.

## Decisions

| Decision                       | Choice                                                                                                                                                                                                                                                          | Why                                                                                                                         | Alternatives considered                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Tab layout                     | Home G in the 悬赏 tab; the shell (stage, live-card stack, strip when scrolled) comes from the foundation spec                                                                                                                                                  | KICKOFF 2026-10-10                                                                                                          | H1/H2/H3, D/E/F alone: merged into G                      |
| List vs map switch             | Two die-cut stickers beside the section title; the selected one tilts and scales                                                                                                                                                                                | KICKOFF 2026-10-10 "V2"                                                                                                     | V1 icons, V3 floating capsule, V4 no switch               |
| View memory                    | Last view (list/map) stored on the device and restored on launch, with 「记住了」 hint the first time                                                                                                                                                           | Canvas G13                                                                                                                  | Always list                                               |
| Distance axis                  | 0–2 km axis, one sticker per located bounty; tapping one rings its card                                                                                                                                                                                         | Canvas HomeD/G (Citymapper, Apple Weather reference)                                                                        | Map only                                                  |
| Filters                        | 全部 / 急单 / 塞得进空档 chips; 急 = deadline within 3 hours, automatic and free                                                                                                                                                                                | Canvas G10; KICKOFF 2026-10-11 B2                                                                                           | E3 full timeline: dropped, only the gap filter kept       |
| Posting entry                  | v1: the manual 「+」 on the 悬赏 tab. With foundation step 8: also the 问小貘 sheet (one sentence, voice, screenshot or photo), filling the same confirm form in place with changed fields highlighted and one 撤销 until the user leaves the form; no AI label | KICKOFF 2026-10-06 (撤销 "直到离开这个表单", "都不标"), 2026-10-11 (N3+E); decision 1                                       | Draft card in a thread                                    |
| Form shape                     | Fixed core (title, category, reward) plus optional fields chosen from the content: place, exact address, time window or deadline, photo sticker, description                                                                                                    | KICKOFF 2026-10-06 "表单应该是动态的"; 2026-10-11 B10                                                                       | Online/offline toggle: rejected by the user               |
| Reward                         | Whole RM 1–500 (integers), stored as integer sen; enforced on the server and in the form                                                                                                                                                                        | KICKOFF 2026-10-11 B10; decision 6                                                                                          | RM 0.10 steps; any sen                                    |
| Text limits                    | Title ≤ 60, place label ≤ 80, application note ≤ 140, description ≤ 500, exact address ≤ 120 characters                                                                                                                                                         | KICKOFF 2026-10-14; decision 12                                                                                             | No limit on description and address                       |
| Category                       | Fixed 8 slugs with labels: `pickup` 代取, `buy` 代买, `queue` 代排, `handle` 代办, `move` 搬运, `accompany` 陪同, `study` 课业, `other` 其他; picked in the form (by 小貘 once drafting exists), shown as a tag with 「改类型」                                 | Canvas 「门槛 · 发布者设置」; B6; slugs and colours already built (`src/ui/CategorySticker.tsx`, `docs/design-language.md`) | Free tags                                                 |
| Applying                       | 申请 sends an application with one short note (≤ 140); the applicant can withdraw before selection; it requires at least one `payee_methods` row (cash counts)                                                                                                  | Canvas G; KICKOFF 2026-10-15 5A ("没有收款方式不能申请接单"); decision 8                                                    | First come, first served; chat before selection           |
| Selecting                      | Poster picks exactly one applicant with hold-to-commit; others become `not_selected`                                                                                                                                                                            | 交互细节 item 5; B5                                                                                                         | Tap + confirm alert                                       |
| Start                          | Helper taps 「出发了」. At the agreed start time without it, both sides see a reminder; if the poster cancels more than 30 min after that reminder, the no-show is the helper's                                                                                 | Status board Q1; B4                                                                                                         | Start implied by selection                                |
| Task completion                | Helper taps 完成; if the poster neither confirms nor reports 「有问题」 within 48 h, the task is confirmed automatically                                                                                                                                        | Status board Q2                                                                                                             | No auto-confirm                                           |
| 「有问题」                     | Pauses the 48 h auto-confirm and shows the poster's reason to the helper; the helper can tap 完成 again after fixing it, which restarts a fresh 48 h; no human support step                                                                                     | Decision 10                                                                                                                 | Routed to a report queue                                  |
| Payment                        | v1 is 完成后付: the payment opens when the task is `confirmed`, one per bounty; settlement is never automatic, only the helper's 「已收到」 settles                                                                                                             | KICKOFF 2026-10-05; decision 7                                                                                              | Auto-settle after N days                                  |
| Settled                        | Derived from the linked payment's state, not stored on the bounty                                                                                                                                                                                               | One source of truth with the payment                                                                                        | Copy a flag at settle                                     |
| Stickers on settle             | Both sides get one, typed by the bounty's category; the celebration plays on every settle                                                                                                                                                                       | Decision 2; KICKOFF 2026-10-26 (celebration G)                                                                              | Helper only; rarity budget (first vs routine): superseded |
| Poster cancels after selecting | Counts as a no-show for the poster, same as a helper cancelling; one waiver per 60 days                                                                                                                                                                         | Status board Q3                                                                                                             | No penalty for posters                                    |
| Expiry                         | An open bounty closes at its deadline, or 7 days after publishing when it has none; nobody selected → coin refunded                                                                                                                                             | Decision 9                                                                                                                  | Never expires                                             |
| Unpaid poster                  | Publishing is rejected while `publish_blocked()` is true (7 days unpaid or 2 open unpaid items, cash included)                                                                                                                                                  | Foundation unpaid handling; KICKOFF 2026-10-26 ("维持现状")                                                                 | Reminders only                                            |
| Coin cost                      | 1 貘币 per post; 3 free posts per calendar month shared with rides; refund (coin or free slot) when nobody was selected, the bounty expires, or the poster cancels before selecting                                                                             | KICKOFF 2026-10-06; F4, B7                                                                                                  | Charge per application                                    |
| Account deletion               | Blocked while the user has an active bounty (selected and not yet settled, as poster or helper), the same way and in the same list as an unsettled payment; open bounties are closed and pending applications withdrawn by the deletion                         | Decision 11; foundation F9                                                                                                  | Auto-cancel active bounties                               |
| Location                       | Optional per bounty; the viewer's position uses precise location, When In Use only; if Precise is off, distances fall back to approximate (about 1 km off); manual area fallback when declined                                                                  | KICKOFF 2026-10-12; App Review 5.1.1(iv)                                                                                    | Approximate only                                          |
| Address privacy                | Everyone sees the place label and area; the exact address only the poster and the selected helper                                                                                                                                                               | B11                                                                                                                         | Visible to applicants                                     |
| Distance query                 | PostGIS nearest-neighbour through an RPC                                                                                                                                                                                                                        | `docs/research/2026-10-04-backend-platform.md`                                                                              | Client-side filtering                                     |
| Freshness (v1)                 | Bounty surfaces load on app open, on returning to the foreground, on tab focus and on pull-to-refresh; a write's own answer updates the screen that made it; no Realtime                                                                                        | Decision 1; same rule as payments (`src/features/payment/hooks.ts`)                                                         | Realtime (arrives with chat, step 7)                      |
| Blocked users                  | A bounty is hidden from, and cannot be applied to by, a user when either of them blocked the other                                                                                                                                                              | P3; foundation chat safety                                                                                                  | Hide only when the poster blocked                         |

## Decisions (2026-10-26)

The reconcile against the built foundation produced twelve answers (KICKOFF 2026-10-26, row 「悬赏需求对照 12 题」):
1A prerequisites first (P1–P3; push, chat and 问小貘 stay in their steps; v1 freshness rule); 2B a sticker for both
sides; 3A cancel with an unsettled payment (later, with 先付); 4A unpaid prepay frees the helper (later); 5A fresh
先付 `due` exempt from `publish_blocked()` for 24 h (later); 6A whole RM; 7A no 先付 or gates in v1; 8A no chat before
selection, one short note; 9A 7-day expiry without a deadline; 10A 「有问题」 loop; 11A deletion blocked by an active
bounty; 12A description 500, address 120. Still open on the canvas: which bounty states become live cards and strip
items and their rank in the F5 order; every bounty screen, state and motion; the poster's sticker copy and the
payer-side celebration.

Follow-up answers (KICKOFF 2026-10-26, row 「悬赏修订 6 题」): 1A decisions 3–5 and the `void` payment state stay
under "Later"; 2A the 「有问题」 loop without an exit is a known limit; 3A when a 先付 poster never pays, the no-show
is the poster's; 4A v1 settles without reviews and the tier is computed without them until step 6; 5A the ledger
ships only grants that need no new UI (new user, onboarding tasks, each help settled); 6A a block by either side
hides the bounty and stops applying.

## UI/UX and motion

Decided on the design canvas, page 05, boards 「悬赏 · 开工前（一）发布与申请」, 「（二）进行中与结清」, 「（三）」 and 「（四）附近的悬赏与地点」 (KICKOFF
2026-10-26, rows 「悬赏界面 15 题」). Option ids refer to those boards.

| #   | Surface                | Decision                                                                                                                                                                                                                                                                                       |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1A  | Posting form           | Full-height sheet with a native grouped Form: title, category (system menu), reward (number pad, whole RM) fixed on top; optional fields as 「＋ 添加…」 rows that expand in place (exact address appears only after a place)                                                                  |
| 2A  | Confirm                | Pushed inside the same sheet, a system screen: list-card preview, summary, one cost line (本月免费 n/3 or 1 貘币 and balance). Blocked states: unpaid → primary becomes 「去付款」; no free slot and no coin → 「需要 1 貘币」 with when the next free slot comes and how to earn; no purchase |
| 3A  | Detail                 | Pushed from a list card or a map pin; grouped rows (place + distance, time, poster + tier, description) under the sticker and reward; 「申请」 pinned at the bottom; ⋯ top right                                                                                                               |
| 4A  | Apply                  | Sheet with a multi-line note (≤ 140, optional) and 「发送」; no payee method → the same sheet explains and offers 「添加收款方式」; applied → sticker tilts with an 已申请 stamp, note shown, 「撤回申请」 confirmed by an action sheet                                                        |
| 5A  | Block                  | 「屏蔽某某」 in red in the detail ⋯ menu, the profile ⋯ menu and an applicant row's long-press menu; confirmed by an action sheet stating the effect                                                                                                                                           |
| 6A  | Choose helper          | Single-choice grouped list of applicants (name, tier, note); one hold-to-commit button at the bottom naming the selected person; others see 「这次没选上」; a lost race shows 「已经选好了」                                                                                                   |
| 7A  | Status                 | One screen per bounty, both roles: vertical timeline (done ✓, current, upcoming grey, last step the payment), actions pinned at the bottom; slipped arrival struck through; 48 h auto-confirm time shown; confirmed → 「去付款」 opens the built pay sheet                                     |
| 8A  | 有问题 / cancel        | 「有问题」: sheet with a multi-line reason shown to the helper; cancel after selection: action sheet stating the no-show consequence (waiver left, waiver used, the other side 30 min late → theirs, helper withdraws)                                                                         |
| 9A  | Home live cards        | One card per bounty; one new accessory kind `bountyAction` (选人, 出发, 确认完成, 处理有问题) ranked after `owedToYou`; order oweMoney › rideSoon › owedToYou › bountyAction › bountyInProgress › waitingConfirm                                                                               |
| 10A | Payer settle           | The payer's pay card turns 「已结清」 in place with the sticker; 「收进贴纸本」 flies the sticker to 我的; no full-screen moment for the payer                                                                                                                                                 |
| 11A | Sticker book           | Title 「一起办成的事」, subtitle 「每办成一单、钱结清，就多一张」; labels say who helped whom (「帮小林取快递」 / 「Lily 帮我买奶茶」); the built celebration's book title follows; en/ms copy reviewed in the copy pass                                                                       |
| 12A | Hold button colour     | A dedicated token for the hold-to-commit gold, recorded in design-language as the one exception to "yellow is never a brand colour"                                                                                                                                                            |
| 13A | Unpaid block timing    | Tapping 「+」 while `publish_blocked()` shows the reason once; the form still opens and the draft is kept; the confirm screen blocks as in 2A                                                                                                                                                  |
| 14A | Application note       | Optional                                                                                                                                                                                                                                                                                       |
| 15A | Helper after confirmed | A 「等对方付款」 card for the helper from `confirmed` until the poster taps 「我已付款」 (then the built `owedToYou` card takes over)                                                                                                                                                          |
| 16A | 「+」 placement        | Native toolbar button on the 悬赏 nav bar (SF Symbol `plus`, label 「发悬赏」)                                                                                                                                                                                                                 |
| 17A | 13A reason             | The form opens, then a system alert 「先付清再发新的」 with 「去付款」 / 「先写着」, once per tap                                                                                                                                                                                              |
| 18A | Place in step 3        | Step 3 posts without place rows; a place picker goes on the canvas before step 4 and is built there                                                                                                                                                                                            |
| 19A | Time row               | 「＋ 时间」 expands to a segmented 截止 / 时间段 picker with compact date pickers; one kind at a time; 「移除」 collapses it                                                                                                                                                                   |
| 20A | Validation feedback    | 下一步 always enabled; the first error shows as an urgent NoticeCard at the top and clears on the next edit                                                                                                                                                                                    |
| 21A | Discard draft          | A red 「清空草稿」 row at the end of a non-empty form, confirmed by a system action sheet                                                                                                                                                                                                      |
| 22A | After publish (step 3) | The sheet closes with the success haptic; 「+」 then opens an empty form                                                                                                                                                                                                                       |
| 23A | 「去付款」 target      | Close the post sheet (draft kept) and open the pay sheet for the oldest unpaid payment                                                                                                                                                                                                         |
| 24A | Confirm preview card   | Sticker, title, place label, time line and reward; no poster line and no distance                                                                                                                                                                                                              |
| 25A | Empty draft defaults   | No category chosen (placeholder 「选类型」) and an empty reward; both required                                                                                                                                                                                                                 |
| 26A | Board card             | Three rows: sticker, category, title, reward / time, place label, distance / poster, tier, 申请; one SwiftUI Host per card inside the home RN scroll view; sticker 48 pt                                                                                                                       |
| 27A | Beyond the axis        | The distance axis covers 0–2 km and ends in a 「+N 更远」 bubble; the list follows the RPC order, with bounties without a place last under a small header                                                                                                                                      |
| 28A | Location permission    | An inline card at the top of the board; the system prompt (When In Use only) appears only after 「允许定位」; 「先不用」 replaces it with 「选一个地方」                                                                                                                                       |
| 29A | 「选一个地方」         | Search any place with the 33A search screen; distances and the axis use the chosen point, labelled 「这里」; the choice is kept on the device                                                                                                                                                  |
| 30A | Filters                | 全部 / 急 / 塞得进空档 chips under the section title, scrolling with the list; an empty filter shows 「这个筛选下没有」 with 「看全部」                                                                                                                                                        |
| 31A | Withdraw               | Only in the bounty detail; the card shows 「已申请 · 等对方选」 in place of 申请                                                                                                                                                                                                               |
| 32A | Board states           | First-load failure, empty board and end of list are inline cards (mascot head ≤ 32 pt, one line, one button); a failed refresh keeps the list under a notice with the time of the data; first-load failure never shows a count                                                                 |
| 33A | Place picker           | MapKit `MKLocalSearchCompleter` in tapiro-kit; first row 「用当前位置」 asks When In Use only when tapped; the label others see defaults to the result name and is editable (≤ 80); the exact-address row appears after a place is chosen                                                      |
| 34B | Count on 全部          | The selected 全部 chip shows the number of matching bounties (「全部 12」) from a total on the first page; a first-load failure shows no count                                                                                                                                                 |
| 35A | Crowded axis           | Axis stickers closer than 44 pt merge into one sticker with a count; a tap scrolls to the nearest card of the group                                                                                                                                                                            |
| 36A | Apply without payee    | 「添加收款方式」 closes the apply sheet and opens 我的 → 收款方式; the detail stays in the 悬赏 stack                                                                                                                                                                                          |
| 37A | Block in step 4        | The detail's ⋯ holds only 屏蔽 (system action sheet); 我的 → 屏蔽名单 lists blocked people with swipe 解除; the poster row is not tappable until a profile screen exists                                                                                                                       |
| 38A | Apply sheet height     | Full-height `pageSheet`, like the pay and payee sheets                                                                                                                                                                                                                                         |
| 39A | Applied motion         | Once per application: the sticker springs to 8° (damping 14, stiffness 220) and the 已申请 stamp lands 80 ms later with the success haptic; Reduce Motion fades the stamp in and shows the tilt statically                                                                                     |
| 40A | Scroll-to-card outline | After the scroll settles, a 2 pt accent ring fades in 150 ms, holds 1.2 s and fades out 240 ms, once; Reduce Motion shows and hides it without fading                                                                                                                                          |
| 41A | Applied card status    | 「已申请 · 等对方选」 sits on its own line under the poster row, never truncated in any language; the 申请 pill is gone on an applied card                                                                                                                                                                |
| 42A | Card poster row space  | When the poster row cannot fit, the tier mark keeps its width and the name truncates; the full name is in the VoiceOver label and the detail                                                                                                                                                   |
| 43B | Axis 「+N 更远」 count     | The board RPC returns the total of located bounties, so 「+N 更远」 is exact from the first page rather than over-counting unloaded bounties without a place                                                                                                                                       |
| 44A | Applied detail pinned area | The pinned area shows the status, the note clamped to 3 lines with an ellipsis, and 撤回                                                                                                                                                                                                  |
| 45B | Poster entry before step 6 | The applicant list is a real route reached from Debug scenes until step 6 builds the live card                                                                                                                                                                                          |
| 46A | Hold before a choice   | No row is preselected; the button reads 「先选一个人」, disabled, until a row is checked                                                                                                                                                                                                           |
| 47A | No applicants yet      | The header reads 等人申请 and one inline card says nobody has applied yet; no button                                                                                                                                                                                                            |
| 48A | Applicant second line  | 「帮过 N 次」, or 「还没帮过」 for zero; no distance                                                                                                                                                                                                                                                   |
| 49A | Hold gold              | The track is the accent; the fill is one flat gold token per mode, shown only while holding                                                                                                                                                                                                 |
| 50A | Hold timing            | Fill 1.0 s linear with four light ticks and a heavy haptic at full; release runs it back                                                                                                                                                                                                    |
| 51A | Sending the choice     | At full the button stays gold with a spinner and 正在选…; a failure shows an inline notice and the fill runs back                                                                                                                                                                              |
| 52A | After choosing         | The same screen becomes 「选好了{name}」 with the chosen person as one row                                                                                                                                                                                                                       |
| 53A | Selected applicant     | The detail pins 「{poster}选了你」 and shows the exact address only the two of them can see                                                                                                                                                                                                      |
| 54A | Not selected seen      | The first successful load of the not-selected detail marks it seen on the server                                                                                                                                                                                                            |

- Reputation tiers are named 新朋友 / 靠谱 / 很靠谱 / 貘友 everywhere (the CraftPick 「新来的」 is superseded).
- One-time cards (「这次没选上」, 「过期了 · 免费次数已退回」) disappear once seen; the seen flag is stored on the
  server per user and item, so it holds across devices.
- Screen classes: posting form, confirm, detail, apply, applicants and status are system screens; the publish
  flight and the payee celebration are moments (design-language).

**Motion.** Each runs only once per event and passes the motion gate; curves and durations are offered as numbered
options at implementation (`animate-expo`).

| Motion                                           | Purpose    | Decided by                                                             |
| ------------------------------------------------ | ---------- | ---------------------------------------------------------------------- |
| Published sticker flies into the live-card stack | continuity | CraftPick item 3                                                       |
| 申请 tilts the sticker and stamps 已申请         | feedback   | canvas G, 4A                                                           |
| Hold-to-commit fill                              | commitment | CraftPick item 5, 6A                                                   |
| Payer card turns 已结清; sticker flies to 我的   | reward     | 10A                                                                    |
| Current timeline step                            | status     | pulse a finite number of times or not at all: chosen at implementation |
| Payee celebration G                              | reward     | built                                                                  |

## Data flow and ownership

**Server (Supabase, `ap-southeast-1`).** Tables named here are contracts; columns are indicative.

- `bounties`: owner `poster_id`; title, description, `category` (check: one of the eight slugs), `reward_sen`
  (check: between 100 and 50000 and a multiple of 100), optional place (`geography(Point)` plus a label), optional
  time window and deadline, `expires_at` (deadline, else published + 7 days), optional sticker image path,
  `status`, `payment_timing` and `gate` columns fixed to `after` / `anyone` in v1 (see Later), timestamps. Exact
  address text lives in a separate table readable only by the poster and the selected helper.
- `bounty_applications`: one row per (bounty, applicant); note, status (`pending` / `withdrawn` / `selected` /
  `not_selected`).
- Text limits are `char_length` checks in the migration and the same `maxLength` in the forms.
- `bounty_events`: append-only history of status changes, ETA updates, the start reminder and 「有问题」 reasons
  (who, when, from, to). Live items, status screens and no-show decisions read from it.
- Storage bucket for stickers: written by the poster, readable by anyone who can read the bounty.

**RLS and transitions.** Open bounties are readable by signed-in users unless `is_blocked_between` holds.
Applications are readable by their applicant and by the bounty's poster. Clients never update `status` directly:
every transition is one `security definer` RPC that checks the actor, the current state and the rules, writes
`bounty_events`, and calls the contracts: `publish_blocked()` and `spend_post` on publish, `refund_post` on close,
`record_no_show` on cancel, `open_payment('bounty', id, title, poster, helper, reward_sen)` on confirm. Each
rejection carries a typed reason (taken, closed, blocked, no payee method, publish blocked, no balance).

**State machine (task).**

```
open ──select──▶ assigned ──出发了──▶ en_route ──完成──▶ done ──确认完成 / 48 h──▶ confirmed ──payment settled──▶ settled
 │                  │                    │               ▲  │                       (payment opens here)      (derived)
 │                  │                    │          完成 │  │ 有问题
 │                  │                    │               │  ▼
 │                  │                    │             disputed (auto-confirm paused)
 ├─ deadline / 7 days / poster cancel ─▶ closed (coin or free slot refunded)
 └─ assigned / en_route ── cancel ──▶ cancelled (no-show for the canceller unless exempt)
```

- `open`: on the board; applications accepted (payee method and block checks on apply).
- `assigned`: one applicant selected; others become `not_selected`; the exact address becomes readable.
- `en_route`: the helper may update the expected arrival; the previous time is kept for the struck-through display.
- `done` / `disputed`: as in Decisions; the 48 h job only confirms `done` rows whose clock has run out.
- `confirmed`: the payment opens and the poster's pay card appears through the built payment live items.
- `settled`: the payment is `settled`; both stickers were written in the settle transaction.
- `closed`: expired or cancelled by the poster while `open`; refunded through `refund_post`.
- `cancelled`: either side cancelled after selection and before 完成; v1 never has a payment at this point.

**Client.**

- `src/features/bounty/`: board (list, map, filters, distance axis), detail, posting form and confirm screen,
  applicant list, status screens, and the bounty live-item source. It does not import `src/features/carpool/` or
  `src/features/home/`.
- Live items follow the built contract: the bounty source registers through `setSource` with
  `loading` / `ready` / `failed` / `stale` and publishes `AccessoryItem`s (strings localized by the source with
  `t()`, amounts as `amountSen`). The card-detail types (`ProgressDetail` and siblings in
  `src/features/home/homeModel.ts`) move into `src/lib` beside `liveItems` so the bounty source can publish card
  details without a cross-feature import.
- Board data: one RPC `nearby_bounties(point, filters, cursor)` returning open bounties with distance;
  bounties without a place are included without distance and are not placed on the axis or map.
- Unsent manual drafts stay on the device (KICKOFF 2026-10-11 "只存手机"; data integrity: keep drafts across failures).
- Photo → sticker: subject cut-out runs on the device in `modules/tapiro-kit`; only the resulting PNG is uploaded.

**In-app events (v1, no push).** New application → the poster's bounty shows the applicant count; selected / not
selected → the applicant's application shows the outcome; start time passed without 「出发了」 → a reminder item for
both; arrival time changed → the poster's card shows the struck-through time; 完成 → a confirm item for the poster
with the auto-confirm time; 「有问题」 → the reason on the helper's item; expiry → the poster's bounty shows closed
and refunded. Push for these arrives with foundation step 9.

## Errors and degradation

| Failure                                       | User sees                                                                                                            | System does                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Board first load fails                        | A load-failed state with 重试, never 「没有悬赏」                                                                    | Nothing cached is shown as current                                             |
| Board refresh fails                           | The last list stays, marked not current                                                                              | Next foreground or pull retries                                                |
| Bounty live source fails or is stale          | The home shows it as unavailable, as payments do; the strip shows nothing for that source                            | `setSource` status `failed` / `stale`                                          |
| Posting / applying / selecting fails          | The action shows progress until the RPC answers, then 「没发出去，再试一次」; the form stays filled                  | Nothing is written; no coin is debited; never replayed automatically           |
| No balance and no free post left              | The confirm button says a coin is needed, when the next free posts arrive, and how to earn one; no 充值 until step 5 | `spend_post` rejects; nothing is published                                     |
| Publishing blocked by unpaid items            | The reason with 去付款 to the unpaid payment                                                                         | Publish RPC rejects while `publish_blocked()`                                  |
| Applicant has no payee method                 | 申请 explains why and links to 我的 → 收款方式                                                                       | Apply RPC rejects                                                              |
| Bounty taken, closed or blocked while viewing | Card shows it is no longer open; 申请 disabled                                                                       | Server rejects with a typed reason                                             |
| Two devices race on select                    | Second attempt shows 「已经选好了」                                                                                  | The transition function is the single writer                                   |
| Location denied                               | Board offers 「选一个地方」 (29A); until a place is chosen it sorts by recency                                       | No distance axis or map pins until a place is chosen                           |
| Sticker cut-out fails                         | The photo is kept as a rounded thumbnail                                                                             | Upload continues                                                               |
| Helper never taps 「出发了」                  | Reminder item to both at the agreed time; poster can cancel                                                          | No-show is the helper's if the poster cancels > 30 min after the reminder (B4) |
| Poster never confirms 完成                    | The confirm item shows the auto-confirm time                                                                         | Scheduled job confirms at 48 h                                                 |
| 「有问题」 never resolved                     | Both see the reason and the helper's 完成                                                                            | Auto-confirm stays paused (Known limits)                                       |
| Poster never pays                             | The built pay card and unpaid handling                                                                               | Bounty stays `confirmed`; `publish_blocked()` applies                          |
| Account deletion with an active bounty        | The bounty listed beside unsettled payments                                                                          | `account-delete` rejects with both lists                                       |

## Later: 先付 and application gates

Not offered in v1 (decision 7). They open by a later decision once reputation has data; the rules are kept here.

- Payment timing: the poster chooses 先付 or 完成后付 when posting (KICKOFF 2026-10-05 "发布者自己选"). For 先付 the
  payment opens at selection; 「出发了」 stays disabled until the helper taps 「已收到」 (B3).
- Gate: 所有人 (default) / 靠谱及以上 / 很靠谱及以上, chosen by the poster; the category suggests a higher gate for
  home-entry and accompany types but never forces it. 先付 bounties accept only applicants at 靠谱 or above
  (KICKOFF 2026-10-05). Gate checks read `reputation_snapshots` (P2); the server rejects regardless of client state.
- Below the gate: the bounty stays in the list, dimmed, with 「{tier} 及以上可申请」 and 「怎么解锁」, which opens a
  sheet showing what is missing (KICKOFF 2026-10-11 "L1"); 先付 uses the reason 「先付的单需要靠谱及以上」.
- Unpaid prepay (decision 4): once the agreed time passes without the prepayment received, the helper's cancel is
  not a no-show; the no-show is the poster's (2026-10-26 follow-up 3A).
- Cancel with an unsettled payment (decision 3): if the poster has not tapped 「我已付款」 (`due`), the payment is
  voided with the cancel. If they have (`marked_paid`), the bounty waits in `cancelling` and the cancel completes
  after the helper's 已收到 (then as below) or 还没收到 (the payment is voided). An undo of 「我已付款」 returns to
  the first case. The no-show is recorded at the cancel request.
- Cancel after a settled prepay (KICKOFF 2026-10-15): `open_reverse_payment` opens the helper → poster payment;
  the bounty waits in `cancelling` until the poster's 已收到 settles it, then `cancelled`. The reverse settle has no
  sticker and no celebration (built).
- Publish block (decision 5): a 先付 `due` payment does not count for `publish_blocked()` during its first 24 h.
- Dependencies on the payment layer: a `void` payment state with a service-role `void_payment(id)` allowed from
  `due`, and from `marked_paid` only after 还没收到 on a cancelling item; `publish_blocked()`, the unsettled-payment
  check in `account-delete`, the payment live items and the pay sheet treat `void` as closed; the 24 h exemption
  needs the payment's timing, read from the bounty.

## Known limits

- If the user turns Precise Location off, distances use the approximate position (about 1.2 km offset measured on
  the Simulator, `2026-10-04-push-location.md`). The poster's place is exact.
- One helper per bounty; 「搬家帮手 2 人」 means two posts.
- The 塞得进空档 filter only knows the user's Tapiro commitments (accepted bounties and rides); not the iOS calendar.
- The map has no turn-by-turn or route; it shows bounty stickers on Apple Maps.
- v1 has no chat: after selection, poster and helper coordinate through the bounty's details and exact address
  until foundation step 7.
- Without push, a user learns of selection, completion or reminders only when the app is open (freshness rule).
- A 「有问题」 the two sides never resolve stays `disputed`; there is no human support step yet (decision 10).
- No network-state detection: "offline" is a failed load or write, not a probe (foundation known limit).
- The reputation tier in v1 is computed without reviews; reviews join with foundation step 6.

## Implementation order

0. Prerequisites P1–P4, each with its own pgTAP and unit tests (ledger arithmetic, free slot restore, waiver
   window, block visibility, two stickers per settle with the category).
1. Schema with `postgis`, RLS and the transition functions; pgTAP for every allowed and forbidden transition,
   blocks, the payee-method rule, `publish_blocked()`, coin spend and refund, expiry (deadline and 7 days), the 48 h
   job, 「有问题」 pause and restart, no-show recording, `open_payment` on confirm, settled derivation, and the
   `account-delete` extension. No UI.
2. `nearby_bounties` RPC with filters and cursor; tests with fixtures around Sunway.
3. Manual posting: form, dynamic optional fields, category, limits, confirm screen, free allowance and coin cost,
   publish-block and no-balance states. Verify scene with fixtures.
4. Board list replacing `BountySection`: cards, distance axis (`expo-location` installed here), filters,
   apply/withdraw with the payee-method block, 已申请 stamp, load-failed and not-current states.
5. Applicant list and hold-to-commit selection; in-app selected / not-selected states.
6. Status screens and the bounty live-item source with the card-detail contract in `src/lib`; 出发了, ETA strike,
   完成, confirm / 「有问题」, cancellation.
7. Settlement: category art in the celebration and book, the payer-side sticker surfaces per the canvas.
8. Map view (after the `expo-maps` spike) with the V2 sticker switch and remembered view.
9. Photo → die-cut sticker in the kit, and the publish fly-to-stack animation.
10. After foundation step 8: 问小貘 drafting into the confirm form, with 撤销 and the manual fallback.
11. After foundation step 9: push for the in-app events and the Live Activity for `en_route`.
12. Later, by decision: 先付 and gates with the `void` payment state.

Every UI step starts only after its canvas handoff is approved and writes the UI cases for the screens it changes.

## Verification

- Every PR: `bun test`, `bunx tsc --noEmit`, `bun run lint -- <changed files>`, `bun run format:check`,
  `node scripts/check-specs.mjs --dir docs/specs`, `node scripts/check-story-map.mjs`, `supabase test db` when SQL
  changed, and `bun run verify:smoke`. `node scripts/design-check.mjs` for UI; no raw colours, font sizes or font
  families in `src/features/bounty/`.
- UI cases under `verification/ui`, written in the step that changes the screen and run once by the author
  (zh-Hans light). Each declares `DEPS`, asserts copy through `ui.t('<key>')` and appearance with pixels; long-copy
  cases declare `LOCALES` with `ms`. Screenshots for states, video for hold-to-commit, ETA strike and the publish
  moment.
- Milestone when the bounty area is done: `bun run verify:ui --affected --base <last milestone> --dark --locales`
  (adds `en` to every case and dark), then the user's walkthrough.
- `break-ui` worst-case data at the default text size in zh-Hans and ms, light and dark: 60-character titles,
  500-character descriptions, 40-character helper and applicant names, rewards RM 500 and RM 1, 50 applicants,
  bounties without place or time.
- Device checklist: location prompt text (precise, When In Use), haptics on hold-to-commit, photo cut-out quality.

Criteria for `docs/story-map.md` (each names its test when written):

| Criterion                                                                                         | Test     |
| ------------------------------------------------------------------------------------------------- | -------- |
| Publish rejected while `publish_blocked()`; the form shows the reason and 去付款                  | db, ui   |
| Reward accepts whole RM 1–500 only; description ≤ 500, address ≤ 120 on server and form           | unit, db |
| Category is one of the eight slugs; settle copies it into both stickers                           | db       |
| No balance and no free post: publish rejected, nothing written                                    | db, ui   |
| Apply rejected without a payee method; UI links to 收款方式                                       | db, ui   |
| Blocked pairs neither see nor apply to each other's bounties                                      | db       |
| Open bounty without a deadline closes after 7 days and refunds the coin or free slot              | db       |
| 「有问题」 pauses auto-confirm, shows the reason to the helper, 完成 again restarts 48 h          | db, ui   |
| Settle gives the helper and the poster one sticker each, the celebration plays for the payee      | db, ui   |
| Bounty `settled` follows the payment; one open payment per bounty                                 | db       |
| Account deletion blocked by an active bounty, listed with unsettled payments                      | int, ui  |
| Board first-load failure is not shown as empty; refresh failure keeps the list marked not current | unit, ui |
| Bounty surfaces refresh on app open, foreground and focus                                         | unit     |

## Open questions

None for this spec beyond the canvas items in "UI/UX and motion". Research spike before step 8: `expo-maps` (alpha)
with image annotations for stickers on SDK 57; if it cannot render them acceptably, fall back to MapKit through
`modules/tapiro-kit`.

<!-- After implementation, spec-lifecycle appends "## Implementation Record (YYYY-MM-DD)" below. -->
