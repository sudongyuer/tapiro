---
title: Carpool (拼车) v1
status: proposed
created: 2026-10-11
approved:
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Visual mockups: design canvas https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o, page 05: 「悬赏与拼车 · 状态流程」,
「【已定】门槛看得到但锁着 L1 · 真实地图 M2 · 拼车椰糖杏 Y2」, 「交互细节 6 条」 (cells 1 and 2), 「手绘插画 · 可交互」
prototype E (86E), and the carpool question boards 「拼车 · 开工前（一）（二）（三）」 (questions 98–116, 2026-10-30).
Builds on: docs/specs/2026-10-11-foundation-design.md (accounts, shell, payee methods, pay step and settlement) and
docs/specs/2026-10-29-multi-currency-design.md. Sibling: 2026-10-11-bounty-design.md, whose prerequisites P1–P4 and
patterns this spec reuses. Reconciled with what is built on 2026-10-30 (main d132cfa plus the step 9 plan). -->

## Problem

Students in Sunway, Subang and other campus areas share Grab rides home or to the airport. Today one person asks in a
WeChat group ("谁下午一起回 YC"), a few reply, they agree a pick-up point and time, the organiser books and pays for the
Grab, and afterwards chases everyone for their share by WeChat transfer (KICKOFF 2026-10-06, user case quoted
verbatim). The pain points the founder selected are all four: gathering people, meeting up, working out and chasing
the money, and people who never pay (KICKOFF 2026-10-06 "痛点全选").

Carpool is a separate feature from bounties but shares payment and reputation with them ("独立功能，共用付款和信誉",
KICKOFF 2026-10-06). The 拼车 tab exists only as a frame: `src/app/(tabs)/ride/index.tsx` renders `EmptyTab` with
`shell.ride.emptyTitle`. The home ride card (`src/features/home/cards/RideCard.tsx`) and the `rideSoon` accessory kind
(`src/lib/liveItems.ts`) exist with fixture data only.

## Goals and scope

**Do (v1)**

- 拼车 tab: my rides first, then open rides I can join, filtered by quick chips.
- Every ride is visible to everyone; rides starting near the viewer and going to the same destination sort first
  (KICKOFF 2026-10-11 C2).
- Create a ride with the manual form: start, destination, departure time, 2–6 seats (default 4), an optional fare
  estimate per person and an optional meeting note. Costs 1 coin or one of the 3 monthly free posts shared with
  bounties, refunded when nobody joined.
- Join by request; the organiser accepts or declines (C1).
- Gathering: meeting point, countdown, 「我到了」, the T-15 「照常走还是取消」 prompt, the struck-through revised time.
- At departure the organiser ticks who boarded; unticked members are no-shows and can appeal (C9).
- Split: equal among everyone who boarded, organiser included, each share rounded up to 0.10 of the fare's currency;
  editable by the organiser; one payment per rider through the built pay sheet; 「金额不对」.
- A hand-drawn route card (86E) on the ride detail and in 「一起办成的事」, in the step 9 crayon style.
- Every string in zh-Hans, en and ms.

**v1: absent, arrives later**

- 问小貘 drafting (from a sentence or a WeChat screenshot) and the receipt split: arrive with foundation step 8. The
  manual form and the typed total are the only v1 paths.
- The ride group chat: arrives with foundation step 7 (question 113). Until then the meeting note, the member list and
  「我到了」 carry the coordination.
- Push notifications: arrive with foundation step 9, which needs the Apple Developer account. v1 uses in-app surfaces
  and on-device scheduled reminders (question 115).
- Live Activity with the four phases: arrives with foundation step 9 after its spikes.
- Reviews after settlement: arrive with foundation step 6, as for bounties.

**Don't do**

- Driver-offers-seats rides or any paid driving. Carpool is only a shared Grab ("对，只是一起打车平摊", KICKOFF
  2026-10-06).
- Booking Grab from Tapiro or reading Grab trip data. Tapiro may only open Grab's home screen, and only once its link
  is confirmed on a device (`WALLET_LINKS`, foundation Known limits).
- Routing or "along the route" matching, and any radius limit on who sees a ride (C2). The hand-drawn route is a
  picture, not a map route.
- Live location sharing or background location. Location is When In Use only.
- Collecting money in the app or holding fares. Money goes rider → organiser directly.
- Charging no-shows a share (C4). Coins for completing a ride. Auto-accept joins (C1). Per-rider split confirmation (Q8).

## Reconcile with what is built (2026-10-30)

| Area                 | Built                                                                                                                   | What carpool does with it                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item kind            | `payment_item_kind` enum already has `ride` (`20261025000000_payments.sql`)                                             | `payments`, `coin_ledger`, `post_charges`, `reputation_events` and `stickers` take `ride` rows without a type change                                                                     |
| One payment per item | `payments_one_forward_per_item` is limited to `item_kind = 'bounty'`                                                    | A ride opens one payment per boarded rider (payer = rider, payee = organiser); no index change                                                                                           |
| Coins (P1)           | `spend_post(user, kind, item)`, `refund_post(kind, item)`, shared monthly allowance                                     | `publish_ride` calls `spend_post(.., 'ride', ..)`; cancel or expiry with no accepted member calls `refund_post`                                                                          |
| Coin grants          | `grant_help_settled` grants only for `bounty`                                                                           | Unchanged: rides earn no coins (scope). `onboarding_first_post` counts a ride as the first post                                                                                          |
| No-show (P2)         | `record_no_show(offender, kind, item)` with the 60-day waiver; unique per (user, kind, item)                            | Leave inside 15 min, unticked at boarding, organiser cancel inside 15 min after accepting: one call each                                                                                 |
| Tier (P2)            | `reputation_snapshots` tier readable by everyone                                                                        | Shown on the board card and the request rows, as in bounty 26A / 48A                                                                                                                     |
| Blocks (P3)          | `blocks`, `is_blocked_between`; client in `src/features/bounty/block`                                                   | Rides hidden and joins rejected when either side blocked. The block client moves to a shared place (below), since chat needs it too                                                      |
| Unpaid               | `publish_blocked()` (7 days or 2 open unpaid items)                                                                     | Rejects `publish_ride`; joining is not blocked, the same as applying to a bounty                                                                                                         |
| Payee methods        | A payee needs at least one `payee_methods` row (bounty 5A)                                                              | The organiser is the payee, so publishing a ride requires a payee method (cash counts); the confirm screen explains and links to 收款方式, as bounty 36A                                 |
| Money (#25)          | `Money = { minor, currency }`, `post_limits (item_kind, currency)`, rate locked when the payment opens                  | The fare total and estimate are in the organiser's chosen currency (RM or ¥, 64A pull-down); `post_limits` gains `ride` rows; each rider's payment locks its rate when the split is sent |
| Pay sheet            | `src/features/payment` (payer and payee views, 我已付款, 已收到, 还没收到, celebration G)                               | Riders pay through it unchanged. The organiser confirms each rider through the payee view                                                                                                |
| Stickers             | Settle writes one sticker per side per payment; `stickerArt` maps a ride to the car sticker                             | Question 112: one card per person per ride rather than one per payment                                                                                                                   |
| Celebration G        | Plays for the payee on every settle                                                                                     | Question 111: the organiser has n-1 settles per ride                                                                                                                                     |
| Live items           | `RideDetail` card and the `rideSoon` accessory kind (fixture only); priority oweMoney › rideSoon › owedToYou › …        | A ride live source registers through `setSource` like the bounty source; `rideSoon` stays second (F5)                                                                                    |
| Board patterns       | Bounty board: chips, load-failed and not-current states (32A), freshness rule, origin store, place search (kit, 33A)    | Reused as patterns. The place search (`src/features/bounty/place`) and the origin store move to a shared module so both features use them without cross-feature imports                  |
| Hand art (step 9)    | Plan: crayon art set with stable ids, `HandArt` component, Long Cang + Caveat, 「一起办成的事」 card stack and calendar | Ride uses the `car` art and new place-kind art (home, campus, airport, mall, station) for the route card; ride cards join the stack and the calendar                                     |
| Map                  | Kit `BountyMapView` (MapKit) with pins and a full-screen route                                                          | Not used for the ride list in v1; the place picker's 「在地图上选」 uses a plain MapKit view with a centre pin (kit)                                                                     |
| Chat, push, AI       | Not built (foundation steps 7–9)                                                                                        | See "v1: absent"                                                                                                                                                                         |

Shared modules: features do not import each other (AGENTS.md Layout), so the step that first needs them moves
`src/features/bounty/place` and `src/features/bounty/board/originStore.ts` to `src/features/place/` and the block client
to `src/features/block/`, each with a facade; bounty imports them from there. No behaviour change.

## Decisions

| Decision               | Choice                                                                                                                                                                                                                                                     | Why                                                               | Alternatives considered                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| What a ride is         | Organiser books and pre-pays one Grab; others split                                                                                                                                                                                                        | KICKOFF 2026-10-06 user case                                      | Driver offering seats: rejected by the founder          |
| Who sees a ride        | Everyone signed in sees every open ride unless blocked; order by start-point distance to the viewer, then same destination; chips filter by day and destination; no radius limit                                                                           | C2 (overturns 2026-10-06 "出发点附近、目的地顺路的人"); bounty P3 | Radii: rejected by the user                             |
| Geo queries            | PostGIS (enabled by bounty step 1); `nearby_rides(point, filters, cursor)` orders by `<->`; non-members get points snapped to about 110 m, like the bounty board                                                                                           | Bounty step 8 record                                              | Geohash                                                 |
| Start and destination  | Named places (common places, the user's recent places, search, map pin), stored as `geography(Point)` plus a label ≤ 80; never raw GPS                                                                                                                     | C12                                                               | GPS fix as start point                                  |
| Seats                  | 2–6 total including the organiser, default 4                                                                                                                                                                                                               | Q5                                                                | —                                                       |
| Cost to create         | 1 coin, or one of the 3 free posts a month shared with bounties; publish needs a payee method and is rejected while `publish_blocked()`                                                                                                                    | F4; bounty 5A applied to the payee                                | —                                                       |
| Coin refund            | Refund when the ride is cancelled or expires with no accepted member                                                                                                                                                                                       | KICKOFF 2026-10-06                                                | Refund on any cancel: invites free reposting            |
| Joining                | Request to join; organiser accepts or declines; a full or departed ride accepts no requests; a requester can withdraw before acceptance                                                                                                                    | C1                                                                | Auto-accept until full                                  |
| Not full 15 min before | The organiser is asked to go or cancel; the split counts actual riders                                                                                                                                                                                     | Q6                                                                | —                                                       |
| No-show                | A member who leaves inside 15 min before departure, or is not ticked as boarded, is a no-show (one waiver per 60 days); an organiser who cancels after accepting members is a no-show only inside the same window, with no refund                          | C3, C4                                                            | —                                                       |
| Boarding               | Organiser taps 「出发」 and ticks who boarded; an unticked member taps 「我上车了」, any other boarded member confirms in one tap and the no-show is removed; until then it shows 申诉中 and does not count                                                | Q7, C9                                                            | GPS check-in                                            |
| Driver late            | Organiser sets a new time with the bounty ETA sheet (60A); the old time is struck through for everyone                                                                                                                                                     | Craft detail 2; bounty 60A                                        | —                                                       |
| Fare and split         | The organiser enters the total (any minor unit, within `post_limits` for `ride`); default equal among boarded people including the organiser, each share rounded up to 0.10 of the currency; editable per rider; the organiser receives the few cents over | Q6, C5, C6; multi-currency spec                                   | Organiser excluded; remainder absorbed by the organiser |
| Split confirmation     | No rider confirmation; a rider may tap 「金额不对」 with an optional note; the organiser edits that rider's amount, which reopens that payment if it is still `due`                                                                                        | Q8                                                                | —                                                       |
| Payment                | One payment per boarded rider, opened when the organiser sends the split; the rate locks then; only the organiser's 已收到 settles; the ride closes when every payment is settled                                                                          | Foundation settlement; multi-currency "When the rate locks"       | —                                                       |
| Time nodes             | 集合 from T-30 min; a ride with no 出发 expires 2 h after departure and nobody is marked no-show                                                                                                                                                           | C14                                                               | 15 min / 1 h                                            |
| Text limits            | Place label ≤ 80, meeting note ≤ 140, 「金额不对」 note ≤ 140, enforced by `char_length` and the same `maxLength`                                                                                                                                          | KICKOFF 2026-10-14                                                | —                                                       |
| Freshness              | As bounty: load on open, foreground, focus and pull; plus the answer to question 114 for 集合 and 上车                                                                                                                                                     | Bounty freshness rule                                             | —                                                       |
| Account deletion       | Blocked while the user is the organiser or an accepted member of a ride that is not closed, listed with unsettled payments; requests are withdrawn by the deletion                                                                                         | Bounty decision 11                                                | Auto-leave                                              |
| Receipt split (later)  | Photo of the Grab receipt → 问小貘 reads total and time → split draft → organiser confirms; consumes 小貘体力 (C7); arrives with foundation step 8                                                                                                         | AI ability list; AskTapir board ③                                 | —                                                       |
| Chat (later)           | One group chat per ride for accepted members, kept forever; arrives with foundation step 7                                                                                                                                                                 | KICKOFF 2026-10-11 "一直保留"                                     | —                                                       |
| Live Activity (later)  | Four phases 凑人 / 集合 / 上车 / 到了, one sentence and a progress line; arrives with foundation step 9                                                                                                                                                    | Craft detail 1; CraftPick board                                   | —                                                       |
| Colour                 | 椰糖杏 `--color-ride` (built token) for ride cards; the route card ground stays white like the step 9 cards                                                                                                                                                | C13 "Y2"                                                          | —                                                       |

## UI/UX and motion

Open on the canvas, page 05, boards 「拼车 · 开工前（一）（二）（三）」, questions 98–116. This section is written after the
answers; the spec moves to `approved` only after that (process 2026-10-13).

Rulings taken while reconciling, which follow built patterns and are not asked:

- Screen classes: tab list, create form, confirm, detail, request rows, boarding sheet, split sheet are system screens;
  the route card is a sticker-style element inside them; the organiser's settle moment follows question 111.
- The create form reuses the bounty form's sheet, validation notice (20A), discard row (21A), draft kept on the device
  and the confirm screen's cost line (2A).
- Load and failure states reuse bounty 32A (inline cards, refresh failure keeps the list marked not current).
- 「⋯」 on the detail holds 屏蔽 for non-members (37A) and, for the organiser, 「取消这趟」 with an action sheet that
  states the refund or no-show consequence (bounty 58A / 8A).
- The revised time uses the bounty ETA sheet (60A) and the strike-through of 59B.
- What each role sees on home (live cards through the built contract; the accessory follows F5):

  | State                 | Organiser                                                     | Requester / member                                   |
  | --------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
  | `open`, requests wait | 「n 人想上车」 → detail (105)                                 | 「等{organiser}同意」                                |
  | accepted, before T-30 | Ride card (built `RideCard`)                                  | Ride card                                            |
  | `gathering`           | Ride card; `rideSoon` accessory within 1 h; T-15 prompt (107) | Ride card; `rideSoon` accessory                      |
  | `departed`            | 「到了点这里分车费」                                          | Ride card, 上车 phase                                |
  | `settling`            | One grouped card (110)                                        | Built 付款 card (`oweMoney`), then `waitingConfirm`  |
  | declined / cancelled  | —                                                             | One-time card, seen flag on the server (bounty rule) |

- Motion: each runs once per event and passes the motion gate; curves and durations are offered as numbered options at
  implementation (`animate-expo`). The published card flying into 「我的拼车」 reuses the step 9 publish flight.

## Data flow and ownership

```
app (拼车 tab, detail, sheets) ──RPC──> Supabase (rides, ride_members, ride_events; RLS)
        │                                     │
        ├─ pay sheet (built) ──────────────> payments (one per boarded rider)
        ├─ ride live source ──setSource──> home cards and the accessory (built contract)
        └─ on-device reminders (question 115); Live Activity and push later
```

- **`rides`**: organiser, start and destination (point + label), `depart_at`, `revised_at` (nullable, for the strike),
  seats, optional estimate (`Money`), meeting note, state, timestamps. States: `open` (凑人) → `gathering` (集合; from
  T-30, derived by the reads and set by the job) → `departed` (上车) → `arrived` (到了; total entered) → `settling`
  (payments open) → `closed` (all settled). Side exits: `cancelled`, `expired`.
- **`ride_members`**: one row per requester: `requested` → `accepted` | `declined` | `withdrawn`; `accepted` → `left` |
  `boarded` | `no_show`; `no_show` → `appealed` → `boarded`. `arrived_at` for 「我到了」. `share` (`Money`) after the split.
- **`ride_events`**: append-only history (who, when, from, to, revised times, appeals, 「金额不对」 notes). Live items and
  no-show decisions read from it.
- **RLS and transitions**: summaries of open rides are readable by signed-in users unless blocked; the meeting note and
  the member list only by accepted members and the organiser. Every transition is one `security definer` RPC that
  checks the actor and state, writes `ride_events` and calls the contracts (`publish_blocked`, `spend_post`,
  `refund_post`, `record_no_show`, `open_payment('ride', ..)`), with typed rejections (full, departed, blocked, no payee
  method, publish blocked, no balance).
- **Scheduled jobs** (pg_cron, as bounty): T-30 → `gathering`; departure + 2 h without 出发 → `expired` (refund if nobody
  was accepted).
- **Client**: `src/features/ride/` (tab list, create form and confirm, detail, sheets, ride live source). It imports
  `src/features/place`, `src/features/block`, `src/lib`, `src/ui`, never `src/features/bounty`.

## Errors and degradation

| Failure                                  | User sees                                                             | System does                                        |
| ---------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| Location denied                          | Order by departure time; 「选一个地方」 as on the bounty board        | No GPS used                                        |
| First load fails / refresh fails         | Bounty 32A states; never 「没有拼车」                                 | Nothing cached shown as current                    |
| No matching rides                        | Empty card with 小貘 and 「自己发一个」                               | —                                                  |
| Publish without payee method             | Confirm screen explains and links to 我的 → 收款方式                  | RPC rejects                                        |
| Join after the ride filled or departed   | 「这趟满了」 / 「已经出发了」                                         | RPC rejects                                        |
| Organiser cancels after members accepted | Members see 已取消 with the reason line                               | No-show only inside 15 min; no refund then (C3)    |
| Member leaves inside 15 min              | Action sheet 「现在退出会记一次放鸽子」 first                         | `no_show` with the 60-day waiver                   |
| Organiser never taps 出发                | Reminder line on the organiser's card                                 | Expires at departure + 2 h; nobody is a no-show    |
| Rider never pays                         | Built pay card and unpaid handling                                    | Ride stays `settling`; `publish_blocked()` applies |
| Any write fails                          | Progress until the RPC answers, then 「没成功，再试一次」; input kept | Never replayed automatically                       |

## Known limits

- Ordering is by area, not route; with every ride visible, the list can grow long; chips are the only filter.
- No-shows are not charged; the organiser may lose money when someone does not turn up.
- The fare estimate is the organiser's own number; Tapiro has no Grab price data.
- 「我到了」 is self-reported.
- Without push, join requests and acceptances reach people only when the app is open (question 115).
- The split assumes one Grab receipt per ride.

## Implementation order

1. **Shared modules**: move place search, origin store and the block client out of `src/features/bounty` (no behaviour
   change; bounty cases rerun at the milestone).
2. **Schema and transitions**: `rides`, `ride_members`, `ride_events`, RLS, every transition RPC, the two jobs,
   `post_limits` rows for `ride`, account-delete extension; pgTAP for every allowed and forbidden transition, coins,
   no-shows and waivers, blocks, payee-method and publish-block rules.
3. **`nearby_rides`** with chips and cursor; tests with fixtures around Sunway.
4. **Create** (form, place picker, confirm, cost line) and the **拼车 tab** (my rides, open rides, chips, states).
5. **Detail**: join and withdraw, accept and decline, gathering, 我到了, T-15 prompt, revised time, boarding ticks,
   appeal, cancel and leave; the route card (86E); the ride live source.
6. **Split and payments**: total, equal split and edits, sending the payments, 「金额不对」, the organiser's receive rows,
   closing, stickers and the celebration per 111–112.
7. **Reminders** per question 115.
8. After foundation steps 7–9: group chat, 问小貘 drafts and the receipt split, push, Live Activity.

Every UI step writes the UI cases for the screens it changes; the feature's cases run once when step 7 is done.

## Verification

- Every PR: `bun test`, `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`, `check-specs`,
  `check-story-map`, `supabase test db` when SQL changed, `bun run verify:smoke`; `design-check` for UI.
- Unit: split arithmetic (rounding up to 0.10 per currency; the organiser's received total exceeds the fare by less
  than 0.10 × riders), listing order, time nodes.
- UI cases (zh-Hans light; `ms` for long copy; dark for the route card and ride colour): tab with my rides and open
  rides, empty and failed states; create form and confirm (no payee method, no balance); detail in 凑人, 集合, 上车,
  到了; requests; boarding sheet; split sheet; 「金额不对」; revised time. Video for the route card motion.
- `break-ui`: 80-character place labels, 6 riders with 40-character names, ¥ and RM totals at the limit, one rider.
- Device: reminders per 115, haptics.

## Open questions

Questions 98–116 on the canvas (page 05, 「拼车 · 开工前」 boards), including the approval question 116.

Research spikes that gate later steps (not user decisions): vision model for receipts (step 8, with 问小貘); Live
Activity extension and push updates (foundation step 9).
