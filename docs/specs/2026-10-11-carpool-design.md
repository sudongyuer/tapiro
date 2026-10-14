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

<!-- Visual mockup: design canvas https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o, boards
「悬赏与拼车 · 状态流程」, 「问小貘 · 四屏原型」, 「小貘的 10 种交互做法」,
「底部导航 N3+E · 完整稿」 (拼车 tab), 「交互细节 · 六选」 (cells 1 and 2).
Builds on: docs/specs/2026-10-11-foundation-design.md (accounts, navigation shell, direct
payment, reputation, coins, 问小貘, chat, notifications). Sibling: 2026-10-11-bounty-design.md. -->

## Problem

Students in Sunway, Subang and other campus areas share Grab rides home or to the airport. Today
one person asks in a WeChat group ("谁下午一起回 YC"), a few reply, they agree a pick-up point and
time, the organiser books and pays for the Grab, and afterwards chases everyone for their share
by WeChat transfer (KICKOFF 2026-10-06, user case quoted verbatim). The pain points the founder
selected are all four: gathering people, meeting up, working out and chasing the money, and people
who never pay (KICKOFF 2026-10-06 "痛点全选").

Carpool is a separate feature from bounties but shares payment and reputation with them ("独立
功能，共用付款和信誉", KICKOFF 2026-10-06). It ships in v1 together with bounties ("悬赏令 +
拼车一起做第一版", KICKOFF 2026-10-06).

## Goals and scope

**Do**

- 拼车 tab: my rides first, then open rides I can join, filtered by quick chips.
- Every ride is visible to everyone; rides starting near the viewer and going to the same
  destination sort first, and chips filter (KICKOFF 2026-10-11 C2).
- Create a ride from one sentence or a WeChat-group screenshot through 问小貘, or with a manual
  form. 2–6 seats, default 4. Costs 1 coin or one of the 3 monthly free posts shared with bounties,
  refunded (coin or free slot) when nobody joined.
- Join by request; the organiser accepts or declines (KICKOFF 2026-10-11 C1).
- Gathering: meeting point, live countdown, 「我到了」, group chat, Live Activity with four phases
  (凑人 / 集合 / 上车 / 到了).
- 15 minutes before departure: if not full, the organiser decides to go or cancel; leaving inside
  that window counts as a no-show.
- At departure the organiser ticks who boarded; unticked members are no-shows and can appeal.
- When the driver is late, the old time is struck through and the new time shown.
- Split: equal by default among everyone who boarded, organiser included, each share rounded up to
  RM 0.10; editable by the organiser; or photograph
  the Grab receipt and let 问小貘 draft the split.
- Each rider pays the organiser through the foundation's direct-pay flow; the organiser confirms
  receipt per rider. No per-rider confirmation of the split; a rider can tap 「金额不对」.
- Reputation, stickers and reviews through the foundation.

**Don't do**

- Driver-offers-seats rides or any paid driving. Carpool is only a shared Grab ("对，只是一起打车
  平摊", KICKOFF 2026-10-06).
- Booking Grab from Tapiro or reading Grab trip data. No Grab API for this was researched; the
  organiser books in Grab. Tapiro may only open Grab's home screen (`grab://open?screenType=MAIN`,
  docs/research/2026-10-06-payment-app-launch.md §7).
- Routing or "along the route" matching (detours, pick-ups on the way), and any radius limit on
  who sees a ride (KICKOFF 2026-10-11 C2).
- Live location sharing or background location. Location is When In Use only, precise when the
  user allows it (KICKOFF 2026-10-12; AGENTS.md platform pitfalls).
- Collecting money in the app or holding fares. Money goes rider → organiser directly (KICKOFF
  2026-10-05; foundation spec).
- Charging no-shows a share. Tapiro cannot collect money; a no-show affects reputation only
  (KICKOFF 2026-10-11 C4).
- Coins for completing a ride. Free coins come only from the four sources in KICKOFF 2026-10-11.
- Rejected: auto-accept joins (KICKOFF 2026-10-11 C1);
  per-rider split confirmation (Q8 "不用确认").

## Decisions

| Decision                     | Choice                                                                                                                                                                                                                                                                                 | Why                                                                                                                     | Alternatives considered                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| What a ride is               | Organiser books and pre-pays one Grab; others split                                                                                                                                                                                                                                    | KICKOFF 2026-10-06 user case                                                                                            | Driver offering seats: rejected by the founder          |
| Who sees a ride              | Everyone signed in sees every open ride; order by start-point distance to the viewer, then same destination; chips filter by day and destination; no radius limit                                                                                                                      | KICKOFF 2026-10-11 C2 "出发点也不应该有限制" (overturns 2026-10-06 "出发点附近、目的地顺路的人")                        | Radii R_start/R_dest: rejected by the user              |
| Geo queries                  | PostGIS distance for sorting only (nearest-neighbour `<->`, `ST_Distance`) through an RPC                                                                                                                                                                                              | docs/research/2026-10-04-backend-platform.md; feasibility "PostGIS 支持最近邻查询"                                      | Geohash: false positives                                |
| Start and destination points | Named places (picker with common places, 小貘记得 places, map pin), stored as points; never raw GPS                                                                                                                                                                                    | Places are what riders agree on, not where a phone happens to be; preset places plus a map pin (KICKOFF 2026-10-11 C12) | GPS fix as start point                                  |
| Seats                        | 2–6 total including organiser, default 4                                                                                                                                                                                                                                               | Q5 "发起人选 2–6 人，默认 4"                                                                                            | —                                                       |
| Cost to create               | 1 coin, or one of the 3 free posts a month shared with bounties                                                                                                                                                                                                                        | "和悬赏一样 1 颗" (KICKOFF 2026-10-06); 2026-10-11 F4                                                                   | —                                                       |
| Coin refund                  | Refund (coin or free slot) when the ride is cancelled or expires with no accepted member                                                                                                                                                                                               | "没人接或接单前取消退回" (KICKOFF 2026-10-06) applied to rides                                                          | Refund on any cancel: invites free reposting            |
| Joining                      | Request to join; organiser accepts or declines; full ride accepts no more requests                                                                                                                                                                                                     | KICKOFF 2026-10-11 C1; organiser carries the money risk                                                                 | Auto-accept until full                                  |
| Not full 15 min before       | Notify organiser to go or cancel; fare split by actual riders                                                                                                                                                                                                                          | Q6 "发起人决定" (StatusFlows board)                                                                                     | —                                                       |
| No-show                      | A member who leaves within 15 min before departure, or is not ticked as boarded, is a no-show; one waiver per 60 days. An organiser who cancels after members accepted counts as a no-show only inside the same 15-minute window; no coin refund then (C3). No-shows pay no share (C4) | KICKOFF 2026-10-06, 2026-10-11 C3, C4; StatusFlows board ("放鸽子 60 天豁免 1 次")                                      | —                                                       |
| Boarding                     | Organiser taps 「出发」 and ticks who boarded; an unticked member taps 「我上车了」, any other boarded member confirms in one tap and the no-show is removed; until then it shows 申诉中 and does not count                                                                            | Q7; KICKOFF 2026-10-11 C9                                                                                               | GPS check-in: needs precise location                    |
| Driver late                  | Organiser sets a new time (or 问小貘 drafts it from a sentence); old time struck through, members notified                                                                                                                                                                             | Craft detail 2 (KICKOFF 2026-10-11)                                                                                     | —                                                       |
| Split                        | Default equal among boarded people including the organiser; each share rounded up to RM 0.10 (the organiser receives the few sen over the total); organiser may edit per person                                                                                                        | Q6, KICKOFF "默认平均，发起人可以改"; 2026-10-11 C5, C6                                                                 | Organiser excluded; remainder absorbed by the organiser |
| Receipt split                | Photo of Grab receipt → 问小貘 reads total and time → split draft card → organiser confirms; consumes 小貘体力 like any AI use (C7)                                                                                                                                                    | AI ability list (docs/research/2026-10-06-ai-native-reference.md); AskTapir board ③                                     | —                                                       |
| Split confirmation           | No rider confirmation; payment request carries the receipt; rider may tap 「金额不对」, organiser edits and resends                                                                                                                                                                    | Q8                                                                                                                      | —                                                       |
| Payment                      | Foundation direct pay: rider sees organiser's payee info in the pay step, copies, opens their app, marks paid; organiser taps 「已收到」 per rider                                                                                                                                     | KICKOFF 2026-10-05/06; payment-app-launch §7                                                                            | —                                                       |
| Chat                         | One group chat per ride for accepted members, kept forever                                                                                                                                                                                                                             | KICKOFF 2026-10-11 "一直保留"; foundation chat                                                                          | —                                                       |
| Live Activity                | Four phases 凑人 / 集合 / 上车 / 到了, one sentence and a progress line                                                                                                                                                                                                                | Craft detail 1 (KICKOFF 2026-10-11); CraftPick board                                                                    | —                                                       |
| Time nodes                   | 集合 starts 30 min before departure; a ride with no 出发 expires 2 h after departure and nobody is marked no-show                                                                                                                                                                      | KICKOFF 2026-10-11 C14                                                                                                  | 15 min / 1 h                                            |

## UI/UX and motion

Pending design handoff: the screens, their states and the motion table are delivered on the canvas and
written here before its first UI step starts; the spec returns to approved after that review (process adopted
2026-10-13, KICKOFF).

## Data flow and ownership

```
app (拼车 tab, ride detail, sheets) ──RPC──> Supabase (rides, members, places; RLS)
        │                                         │
        ├─ 问小貘 sheet ──> Edge Function (AI, foundation) ──> draft only
        ├─ direct-pay sheet (foundation) ──> payment requests per rider
        └─ Live Activity (tapiro-kit) <── push updates from server on phase change
```

- **Ride** (server): organiser, start place, destination place, departure time, revised time
  (nullable, for the struck-through display), seat count, meeting note, state, coin charge id.
  States: `open` (凑人) → `gathering` (集合; from T-30 min) → `departed` (上车; organiser
  tapped 出发) → `arrived` (到了; organiser entered or confirmed the total) → `settling` →
  `closed`. Side exits: `cancelled`, `expired` (departure + 2 h with no 出发).
- **Member** (server): one row per requester: `requested` → `accepted` | `declined`;
  `accepted` → `left` | `boarded` | `no_show`; `no_show` → `appealed`. Arrival flag for 「我到了」.
- **Split and payments** (server, owned by the foundation's payment module): the ride creates one
  payment request per boarded rider with amount, receipt image reference and reason "拼车". The
  carpool module never stores payee details.
- **Places** (server): shared named places (campus gates, condos, airport) plus the user's own
  remembered places from 小貘记得 (foundation). Points are stored in a PostGIS geography column.
- **Listing** (server): an RPC takes the viewer's position or chosen place and optional destination
  and returns all open rides in the chip's window, ordered by start distance then same
  destination; no radius filter. RLS: anyone
  signed in sees ride summaries returned by the RPC; the meeting note and member list are visible
  to accepted members only.
- **AI** (foundation Edge Function): tools `draft_ride` (from text or screenshot) and
  `draft_split` (from receipt photo) return drafts; the app shows a confirm card. Nothing is
  published or sent without a tap (AGENTS.md AI rules). Every call consumes 小貘体力 (foundation).
- **Client state**: the 拼车 tab list, filters and the last chip are view state; ride state comes
  from the server and realtime updates for members of that ride.

### Screens and flows

1. **拼车 tab**: large title 「拼车」, nav-bar 「+」 (manual create), chips 今天 / 明天 / one chip
   per frequent destination (e.g. 回 YC) / 去机场. Section 1: my rides (organising or accepted),
   coloured by state. Section 2: all open rides, nearest start and same destination first. Each card: departure time (struck-through
   old time when revised), route, 约 RM x/人 estimate if the organiser gave one, 差 n 人, organiser
   reputation badge, 「申请上车」.
2. **Create**: from 问小貘 ("下午五点从校门口回 YC，谁一起") or a WeChat screenshot (multiple items
   → list to pick, per KICKOFF 2026-10-06) → draft card (time, start, destination, seats,
   optional estimate) → 「发布」 spends 1 coin or a free post. Manual form has the same fields.
3. **Join**: 「申请上车」 → request sent → organiser gets a notification and accepts/declines in
   ride detail. On accept: member joins the group chat and sees the meeting note.
4. **Gathering**: ride detail shows meeting point, countdown, member avatars with 已到 marks,
   「我到了」 (notifies others), chat entry. Home G live card and the N3+E accessory show the ride
   (foundation shell). T-15: organiser prompt 「还差 n 人，照常走还是取消？」.
5. **Departure**: organiser taps 「出发」, ticks boarded members, optional 「打开 Grab」.
6. **Arrival and split**: organiser taps 「到了」 → photograph receipt (问小貘 split draft) or enter
   total → split card (equal, editable) → 「发付款单给 n 人」.
7. **Pay**: each rider gets a payment request (foundation direct pay). 「金额不对」 sends a note to
   the organiser, who edits and resends. Organiser taps 「已收到」 per rider; when all are
   received the ride closes.
8. **Review**: after a rider's payment is received, organiser and that rider can review each other
   (foundation three-face review; public when both reviewed or after 7 days, StatusFlows board).

- Text limits (KICKOFF 2026-10-14): titles ≤ 60 characters, place labels ≤ 80, notes ≤ 140, enforced
  by `char_length` checks in the migration and the same `maxLength` in the forms. Live items carry
  structured fields (kind, names, amount in sen, time) and are localized where they render.

## Errors and degradation

| Failure                                    | User sees                                                              | System does                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Location denied                            | Place picker with campus and saved places                              | No GPS used (App Review 5.1.1(iv), push-location research)          |
| No matching rides                          | Empty state with 小貘 and 「自己发一个」                               | —                                                                   |
| AI unavailable or 小貘体力 empty           | 「小貘现在没法起草，可以自己填」 + manual form prefilled with any text | Every AI flow has a manual path (AGENTS.md)                         |
| Receipt unreadable                         | 「没读出来，自己输入总价」                                             | No split drafted                                                    |
| Join request after ride filled or departed | 「这趟满了」 / 「已经出发了」                                          | Request rejected server-side                                        |
| Organiser cancels after members accepted   | Members notified; ride shows 已取消                                    | Counts as organiser no-show only inside 15 min (C3); no coin refund |
| Member leaves within 15 min                | Warning before leaving: 「现在退出会记一次放鸽子」                     | Marks `no_show`, applies 60-day waiver                              |
| Organiser never taps 出发                  | Reminders to organiser; after departure + 2 h ride expires             | Members not marked no-show                                          |
| Rider never pays                           | Reminders; foundation unpaid rule (提醒 + 限制发布)                    | Per foundation                                                      |
| Offline                                    | Cached ride detail read-only; actions disabled with reason             | Actions are server calls, no replay                                 |
| Live Activity not allowed by user          | Nothing missing in-app                                                 | Notifications still sent                                            |

## Known limits

- Ordering is by area, not route: a ride to a stop on the way is not ranked as "same
  destination". With every ride visible, the list can grow long; chips are the only filter.
- No-shows are not charged; the organiser may lose money when someone does not turn up.
- The fare estimate is the organiser's own number; Tapiro has no Grab price data.
- 「我到了」 is self-reported; no location proof.
- The split assumes one Grab receipt per ride.

## Implementation order

1. **Places and listing RPC**: place model, seed places plus map pin, ordering query; unit tests
   for ordering, same-destination ranking and no-destination cases. Testable without UI.
2. **Ride and member state machine** on the server with state-transition tests (join, accept,
   leave inside/outside 15 min, depart with ticks, expire, cancel, coin charge and refund).
3. **拼车 tab and ride detail (manual path)**: list with chips, create form, join, accept, gather,
   depart, struck-through revised time. UI checks in light and dark.
4. **Split and payment requests**: equal split, edit, 「金额不对」, hand-off to foundation direct
   pay, close on all received.
5. **问小貘 drafts** (after a spike verifying a vision-capable Qwen model on Model Studio
   Singapore for receipts): `draft_ride` from text and screenshot, `draft_split` from receipt, confirm
   cards.
6. **Notifications and reputation hooks**: join, accept, T-15 prompt, 我到了, departure, payment
   reminders; no-show and review events into the foundation's reputation module.
7. **Live Activity** after the foundation's spike: widget extension generated by a config plugin
   (the AGENTS.md exception) with push updates.

## Verification

- `bun test`: listing order cases, every state transition, coin charge/refund, split arithmetic
  (each share rounded up to RM 0.10; the organiser's received total is ≥ the fare by less than
  RM 0.10 × riders).
- `bunx expo lint` and `bunx tsc --noEmit` on changed files; `bun run format:check`;
  `node scripts/design-check.mjs`.
- UI cases under `verification/ui`, zh-Hans light and dark, `ms` for long copy: 拼车 tab with my
  rides and open rides; ride detail in 凑人, 集合 (countdown, 我到了), 上车 (boarding ticks), 到了
  (split card); revised time struck through; empty state; 「金额不对」 sheet. Video for the
  boarding and split flow.
- Worst-case data via `break-ui`: long place names, 6 riders, RM 999.99 totals, one rider.
- Acceptance on device: Live Activity phases; receipt photo split; notifications.

## Open points

None for the user. Card colour is decided: 椰糖杏 (gula melaka apricot) instead of yellow
(KICKOFF 2026-10-11 C13 "Y2"); a new token `--color-ride` (light `#F5C8A0`, dark value set with
the token change) goes into design-language.md and `tokens.ts`, keeping the rule that yellow is
never a brand colour.

Research spikes that gate steps (not user decisions): vision model for receipt reading (step 5);
Live Activity extension and push updates (step 7, foundation).
