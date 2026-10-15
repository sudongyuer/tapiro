---
title: Bounty board (悬赏令) v1
status: proposed
created: 2026-10-11
approved:
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Visual mockups: design canvas https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o, boards
「G 首屏 · 合体版」, 「G 首屏 · 15 种情况」, 「G · 列表/地图怎么切」 (V2), 「底部导航 N3+E · 完整稿」,
「悬赏与拼车 · 状态流程」, 「门槛 · 发布者设置」, 「门槛 · 申请人视角」, 「撮合付款 · 可点原型」,
「交互细节 · 六选」. Builds on: docs/specs/2026-10-11-foundation-design.md (accounts, navigation
shell, home shell and live-card stack, 撮合付款, 靠谱度 / reviews / stickers / levels, 貘币 ledger,
问小貘 sheet and 小貘体力, chat, notifications). Decisions: docs/KICKOFF.md rows dated 2026-10-04 to
2026-10-11. -->

## Problem

Chinese students in Malaysia ask for small favours (collect a parcel, queue at JPJ, help move,
explain homework) in WeChat groups. The request scrolls away, nobody knows who took it, the
payment is chased by hand, and there is no record of who is reliable (KICKOFF 开局摘要;
`docs/research/2026-10-04-reputation.md`). Tapiro has no bounty feature yet: `src/app/index.tsx`
renders an empty home screen.

This spec covers the 悬赏 tab: browsing, posting, applying, choosing a helper, the bounty status
flow, cancellation, and the handoff to payment and reviews. Everything shared with carpool is in
the foundation spec and is only referenced here.

## Goals and scope

**Do**

- The 悬赏 tab is home layout G: 小貘 stage → live-card stack → bounties, viewed as a list or a
  map, switched by two stickers (V2), and the last view is remembered (KICKOFF 2026-10-10).
- List titled 「能接的悬赏」 (KICKOFF 2026-10-11 B9): a distance axis as a sort aid, filters
  全部 / 急单 / 塞得进空档, cards with an 申请 button that tilts the
  sticker and stamps 已申请 (canvas G; KICKOFF 2026-10-10).
- Map: a real Apple map (`expo-maps`, `AppleMaps`) with bounty stickers as image annotations and
  the user's position; tapping a pin opens a detail card with 申请 (KICKOFF 2026-10-11
  B8 "M2"; canvas 「spec 待定」 M2). `expo-maps` is alpha in SDK 57 and annotations are images
  only, not React views ([docs](https://docs.expo.dev/versions/v57.0.0/sdk/maps/)); sticker
  annotations are rendered to images.
- Below the gate: the bounty stays in the list, dimmed, with 「{tier} 及以上可申请」 and
  「怎么解锁」, which opens a sheet showing what is missing (KICKOFF 2026-10-11 B1 "L1").
- Posting by one sentence to 问小貘 (a draft the user confirms) or by a manual form; both lead
  to the same confirm screen (AGENTS.md "Every AI flow has a manual path"; KICKOFF 2026-10-06).
- A dynamic form: no online/offline field; fields depend on the content; location is optional
  (KICKOFF 2026-10-06 "表单应该是动态的").
- Optional photo of the item turned into a die-cut sticker on the card (KICKOFF 2026-10-11
  交互细节六选, item 4).
- The poster chooses payment timing and who may apply (gate) (KICKOFF 2026-10-05 撮合付款;
  canvas 「门槛 · 发布者设置」).
- Posting costs 1 貘币; the first 3 posts each month are free, shared with rides; the coin (or the
  free slot) is refunded when nobody was selected or the poster cancels before selecting (KICKOFF
  2026-10-06; 2026-10-11 F4, B7).
- Applying is not accepting: applicants wait for the poster to pick (canvas G; KICKOFF).
- Prepay bounties accept applications only from 靠谱 and above (KICKOFF 2026-10-05).
- Choosing a helper is a hold-to-commit action; unselected applicants are told
  「这次没选上」 (KICKOFF 2026-10-11 item 5; canvas 「交互细节 · 六选」).
- The status flow from the canvas board 「悬赏与拼车 · 状态流程」 (Q1–Q4), cancellation rules
  and their effect on 靠谱度, completion → 撮合付款 → settlement → reviews.
- Bounty states feed the home live cards, the N3+E accessory strip and a Live Activity while the
  helper is on the way; a slipped arrival time strikes through the old time (KICKOFF 2026-10-11
  items 1 and 2).
- Publishing flies the sticker into the live-card stack (item 3); settlement celebrations follow
  the rarity budget (item 6).

**Don't do**

- Paid boosts 加急 / 置顶 / 装扮: deferred by KICKOFF 2026-10-06 ("暂时只要发布和 AI"). The 急 seal
  in v1 is derived from the deadline and free (KICKOFF 2026-10-11 B2).
- Multi-helper bounties: one helper per bounty in v1; a two-person move is posted twice (KICKOFF
  2026-10-11 B5).
- Money through Tapiro, escrow, or coins as a reward: the canvas board 「发布时选貘币或现金」
  (PublishChoose) shows a coin reward and escrow; it is superseded by KICKOFF 2026-10-05 ("貘币不能
  当最后的结算", direct payment) and must not be built.
- Swipe-through card browsing (F3) and the cork-board wall (F1): dropped (KICKOFF 2026-10-10).
- A full-screen AI chat as the main surface (`docs/research/2026-10-06-ai-native-patterns.md`).
- Background location. Location is When In Use only (`docs/research/2026-10-04-push-location.md`).
- Admin tooling for disputes beyond what the foundation spec defines.

## Decisions

| Decision                       | Choice                                                                                                                                                                                                                  | Why                                                                                                                                                                | Alternatives considered                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Tab layout                     | Home G in the 悬赏 tab; the shell (stage, live-card stack, strip when scrolled) comes from the foundation spec                                                                                                          | KICKOFF 2026-10-10                                                                                                                                                 | H1/H2/H3, D/E/F alone: merged into G                |
| List vs map switch             | Two die-cut stickers beside the section title; the selected one tilts and scales                                                                                                                                        | KICKOFF 2026-10-10 "V2"                                                                                                                                            | V1 icons, V3 floating capsule, V4 no switch         |
| View memory                    | Last view (list/map) stored on the device and restored on launch, with 「记住了」 hint the first time                                                                                                                   | Canvas G13                                                                                                                                                         | Always list                                         |
| Distance axis                  | 0–2 km axis, one sticker per located bounty; tapping one rings its card                                                                                                                                                 | Canvas HomeD/G (Citymapper, Apple Weather reference)                                                                                                               | Map only                                            |
| Filters                        | 全部 / 急单 / 塞得进空档 chips; 急 = deadline within 3 hours, automatic and free                                                                                                                                        | Canvas G10; KICKOFF 2026-10-11 B2                                                                                                                                  | E3 full timeline: dropped, only the gap filter kept |
| Posting entry                  | 问小貘 sheet (one sentence, voice, screenshot or photo) or the manual 「+」 on the 悬赏 tab                                                                                                                             | KICKOFF 2026-10-06, 2026-10-11 (N3+E); canvas 「N3+E 完整稿」 case 5                                                                                               | Composer always docked: dropped with N3+E           |
| AI draft placement             | The draft fills the confirm form in place, changed fields highlighted, one 撤销 until the user leaves the form                                                                                                          | KICKOFF 2026-10-06 (撤销 "直到离开这个表单"); `2026-10-06-ai-native-patterns.md` recommendation 1                                                                  | Draft card in a thread                              |
| AI label                       | No "AI wrote this" label; content confirmed by the user is the user's                                                                                                                                                   | KICKOFF 2026-10-06 "都不标"                                                                                                                                        | Label drafts                                        |
| Form shape                     | Fixed core (title, reward RM 1–500 enforced on the server, payment timing, gate) plus optional fields chosen from the content: place, time window or deadline, photo sticker, description                               | KICKOFF 2026-10-06 "表单应该是动态的"; 2026-10-11 B10                                                                                                              | Online/offline toggle: rejected by the user         |
| Category                       | Fixed 8: 代取, 代买, 代排, 代办, 搬运, 陪同, 课业, 其他; 小貘 picks one, shown as a tag with 「改类型」; it drives the gate suggestion                                                                                  | Canvas 「门槛 · 发布者设置」; KICKOFF 2026-10-11 B6                                                                                                                | Free tags; picker as the first step                 |
| Gate                           | 所有人 (default) / 靠谱及以上 / 很靠谱及以上, chosen by the poster; 小貘 suggests a higher gate for home-entry and accompany types but never forces it                                                                  | Canvas 「门槛 · 发布者设置」; `2026-10-04-reputation.md` Design B                                                                                                  | Gate fixed per category                             |
| Payment timing                 | Poster chooses 先付 or 完成后付 when posting; 先付 bounties only accept applicants at 靠谱 or above                                                                                                                     | KICKOFF 2026-10-05 ("发布者自己选", "限制谁能接先付的单")                                                                                                          | Always pay after                                    |
| Applying                       | 申请 sends an application with an optional note; the applicant can withdraw before selection                                                                                                                            | Canvas G (「已申请，等 X 挑人」)                                                                                                                                   | First come, first served                            |
| Selecting                      | Poster picks exactly one applicant (KICKOFF 2026-10-11 B5) with hold-to-commit; others get 「这次没选上」                                                                                                               | KICKOFF 2026-10-11 item 5; canvas 「交互细节 · 六选」 cell 5                                                                                                       | Tap + confirm alert                                 |
| Start                          | Helper taps 「出发了」 (for 先付, only after the prepay is 「已收到」); at the agreed time without it, both sides are reminded; if the poster cancels more than 30 min after that reminder, the no-show is the helper's | Status board Q1; KICKOFF 2026-10-11 B3, B4                                                                                                                         | Start implied by selection                          |
| Task completion                | Helper taps 完成; if the poster neither confirms nor disputes within 48 h, the task is confirmed automatically                                                                                                          | Status board Q2                                                                                                                                                    | No auto-confirm                                     |
| Payment settlement             | Never automatic: only the helper's 「已收到」 settles; the app only reminds the helper                                                                                                                                  | KICKOFF 2026-10-05 "不自动，只提醒接单人"; canvas 撮合付款                                                                                                         | Auto-settle after N days                            |
| Poster cancels after selecting | Counts as a no-show for the poster, same as a helper cancelling; one waiver per 60 days                                                                                                                                 | Status board Q3                                                                                                                                                    | No penalty for posters                              |
| Reviews                        | Only after settlement; both sides' reviews are revealed when both have reviewed or after 7 days                                                                                                                         | Status board Q4 and header note                                                                                                                                    | Review on completion                                |
| Coin cost                      | 1 貘币 per post; 3 free posts per calendar month shared with rides; refund (coin or free slot) when nobody was selected or the poster cancels before selecting                                                          | KICKOFF 2026-10-06; 2026-10-11 F4, B7                                                                                                                              | Charge per application                              |
| Location                       | Optional per bounty; the viewer's position uses precise location, When In Use only; if the user turns Precise off, distances fall back to approximate (about 1 km off); manual area fallback when declined              | KICKOFF 2026-10-12 (overturns the approximate-only recommendation in `2026-10-04-push-location.md`: the real map and meeting points need it); App Review 5.1.1(iv) | Approximate only: pins about 1 km off               |
| Address privacy                | Everyone sees the place label and area; the exact address (room, unit) only the selected helper                                                                                                                         | KICKOFF 2026-10-11 B11                                                                                                                                             | Visible to applicants                               |
| Distance query                 | PostGIS nearest-neighbour through an RPC                                                                                                                                                                                | `docs/research/2026-10-04-backend-platform.md`                                                                                                                     | Client-side filtering                               |

## UI/UX and motion

Pending design handoff: the screens, their states and the motion table are delivered on the canvas and
written here before its first UI step starts; the spec returns to approved after that review (process adopted
2026-10-13, KICKOFF).

## Data flow and ownership

**Server (Supabase, `ap-southeast-1`).** Tables named here are contracts; columns are indicative.

- `bounties`: owner `poster_id`; title, description, category, reward amount (MYR, integer sen),
  payment timing (`prepay` / `after`), gate (`anyone` / `reliable` / `very_reliable`), optional
  place (PostGIS geography point plus a human label), optional time window and deadline,
  optional sticker image path, `status`, timestamps. Exact address text, if any, is a separate
  field readable only by the poster and the selected helper.
- `bounty_applications`: one row per (bounty, applicant); note, status (`pending` / `withdrawn` /
  `selected` / `not_selected`).
- Text limits (KICKOFF 2026-10-14): titles ≤ 60 characters, place labels ≤ 80, notes ≤ 140, enforced
  by `char_length` checks in the migration and the same `maxLength` in the forms. Live items carry
  structured fields (kind, names, amount in sen, time) and are localized where they render.
- `bounty_events`: append-only history of status changes and ETA updates (who, when, from, to).
  Live cards, notifications, the Live Activity and dispute review read from it.
- Storage bucket for stickers: written by the poster, readable by anyone who can read the bounty.

**RLS.** Open bounties are readable by signed-in users who are not blocked by the poster.
Applications are readable by their applicant and by the bounty's poster. Clients never update
`status` directly: every transition goes through one Postgres function (RPC) or Edge Function that
checks the actor, the current state and the gate, writes `bounty_events`, and calls the foundation
contracts (coin debit/refund, 靠谱度 event, payment record, notification). Gate checks read the
applicant's current tier from the foundation's reputation view.

**State machine (task).** Payment state is the foundation's 撮合付款 record linked to the bounty;
this spec only says when it starts.

```
open ──select──▶ assigned ──出发了──▶ en_route ──完成──▶ done ──confirm / 48 h──▶ confirmed
  │                 │  (先付: payment record starts here)            (完成后付: payment starts here)
  ├─expire/cancel──▶ closed (coin refunded)            confirmed + payment settled ──▶ settled ──▶ reviews
  └ assigned/en_route ──cancel──▶ cancelled (no-show recorded for the canceller)
```

- `open`: visible on the board; applications accepted (gate and prepay rule enforced on apply).
- `assigned`: one applicant selected; others become `not_selected`. For 先付, the poster's
  payment card appears now; 「出发了」 stays disabled until the helper taps 「已收到」 (KICKOFF
  2026-10-11 B3).
- `en_route`: helper tapped 「出发了」. The helper may update the expected arrival; the previous
  time is kept for the struck-through display.
- `done`: helper tapped 完成. The poster sees 确认完成 / 有问题. 48 h without either confirms
  automatically (scheduled job).
- `confirmed`: for 完成后付, the payment card appears on the poster's home.
- `settled`: the foundation reports the helper's 「已收到」. Both sides get a sticker; reviews open.
- `closed`: deadline passed with nobody selected, or the poster cancelled while `open`.
- `cancelled`: either side cancelled after selection; a no-show event goes to 靠谱度 (60-day
  waiver handled by the foundation).

**Client.**

- `src/features/bounty/`: board (list, map, filters, distance axis), detail, posting form and
  confirm screen, applicant list, status screens, live-card content for bounty states. It does not
  import `src/features/carpool/`; shared pieces come from foundation modules.
- Board data: one RPC `nearby_bounties(area or point, filters, cursor)` returning open bounties
  with distance; bounties without a place are included without distance and are not placed on the
  axis or map.
- Live updates for a bounty the user is part of come through Supabase Realtime (foundation
  transport); the board itself refreshes on pull-to-refresh and on focus.
- Drafts from 问小貘 and unsent manual drafts stay on the device (KICKOFF 2026-10-11 "只存手机").
- Photo → sticker: subject cut-out runs on the device in `modules/tapiro-kit` (AGENTS.md: native
  code lives in the kit); only the resulting PNG is uploaded.
- Live Activity and Dynamic Island for `en_route`: content defined here (helper name, one sentence,
  progress, arrival time); the native extension and update transport belong to the foundation spec.

**Notifications** (delivery by the foundation): new application (poster); selected / not selected
(applicant); start-time reminder without 「出发了」 (both); arrival time changed (poster); 完成
(poster); auto-confirm warning before 48 h (poster); deadline reached with nobody selected (poster).

## Errors and degradation

| Failure                                     | User sees                                                                                      | System does                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Offline while browsing                      | Last loaded list with 「离线 · 下拉重试」                                                      | No writes queued                                                                       |
| Offline when posting / applying / selecting | The action button shows 「没发出去，再试一次」; the form stays filled                          | Nothing is written; no coin is debited                                                 |
| Coin balance 0 and no free post left        | Confirm button becomes 「需要 1 貘币」 with 充值 and earn options                              | Foundation coin sheet                                                                  |
| Gate not met                                | Locked card: 「发布者设了「靠谱」才能申请」 with how to unlock (or hidden; open question 1)    | Server rejects the application regardless of client state                              |
| 先付 bounty, applicant below 靠谱           | Same locked state, reason 「先付的单需要靠谱及以上」                                           | Server rejects                                                                         |
| Bounty taken or closed while viewing        | Card shows 「已经有人在帮了」, 申请 disabled                                                   | Server rejects with a typed reason                                                     |
| Two posters' devices race on select         | Second attempt shows 「已经选好了」                                                            | Transition function is the single writer                                               |
| Location denied                             | Board sorts by recency; area picker 「选一个地方」 at the top                                  | No distance axis or map pins                                                           |
| AI unavailable or 小貘体力 empty            | 问小貘 says so in one line and opens the manual form with the sentence kept as the description | Foundation 小貘体力 rules                                                              |
| Sticker cut-out fails                       | The photo is kept as a rounded thumbnail                                                       | Upload continues                                                                       |
| Helper never taps 「出发了」                | Reminder to both at the agreed time; poster can cancel with no penalty to themselves           | No-show recorded for the helper if the poster cancels > 30 min after the reminder (B4) |
| Poster never confirms 完成                  | Reminder, then auto-confirm at 48 h                                                            | Scheduled job writes the transition                                                    |
| Poster never pays                           | Foundation 撮合付款: reminders and posting limit                                               | Bounty stays `confirmed`                                                               |

## Known limits

- If the user turns Precise Location off, distances use the approximate position (about 1.2 km
  offset measured on the Simulator, `2026-10-04-push-location.md`). The poster's place is exact.
- One helper per bounty (KICKOFF 2026-10-11 B5); 「搬家帮手 2 人」 means two posts.
- The 塞得进空档 filter only knows the user's Tapiro commitments (accepted bounties and rides);
  it does not read the iOS calendar.
- The map has no turn-by-turn or route; it shows bounty stickers on Apple Maps.
- Live Activity updates depend on the foundation's push path; until then the Live Activity updates
  only while the app runs.

## Implementation order

1. Schema, RLS and the transition function with tests for every allowed and forbidden transition,
   gate and prepay checks, coin debit/refund calls (against the foundation ledger), and the 48 h
   auto-confirm job. No UI.
2. `nearby_bounties` RPC with filters and cursor; tests with fixtures around Sunway.
3. Manual posting: form, dynamic optional fields, confirm screen, gate and payment timing, free
   monthly allowance (shared with rides), refund restoring the free slot, and coin cost. Verify scene with fixtures.
4. Board list in the 悬赏 tab: cards, distance axis, filters, apply/withdraw, 已申请 stamp.
5. Applicant list and hold-to-commit selection; selected / not-selected notifications.
6. Status screens and live-card content for every state; 出发了, ETA update with struck-through
   time, 完成, confirm/dispute, cancellation with no-show recording.
7. Handoff to 撮合付款 and reviews (foundation), settlement stickers and the rarity-budget
   celebration.
8. Map view (after the `expo-maps` spike) with the V2 sticker switch and remembered view.
9. 问小貘 drafting into the confirm form, with 撤销 and the manual fallback.
10. Photo → die-cut sticker in the kit, and the publish fly-to-stack animation.
11. Live Activity content for `en_route` once the foundation extension exists.

Each step ships behind the previous one and has its own UI case where it adds UI.

## Verification

- `bunx expo lint <changed files>`, `bunx tsc --noEmit`, `bun run format:check`, `bun test`
  (transition rules, free-allowance and refund arithmetic, reward bounds, distance bucketing, ETA strike logic).
- Database tests for RLS (applicant cannot read others' applications; non-selected users cannot
  read the exact address; clients cannot update `status`) and for every transition; tooling as set
  in the foundation spec.
- `node scripts/design-check.mjs`; no raw colours or font sizes in `src/features/bounty/`.
- UI cases under `verification/ui` in zh-Hans, light and dark; long-copy cases also in `ms`:
  board list (empty, one, many, no location permission), filters, map with pins, posting form
  (minimal and all optional fields), gate locked card, applicant list, hold-to-commit (video),
  each status live card, ETA struck-through (video), publish fly-to-stack (video), settlement
  celebration first vs routine (video).
- `break-ui` worst-case data: 60-character titles, Malay copy, RM 9,999 rewards, 50 applicants,
  bounties without place or time.
- Acceptance on a physical device: location prompt text (precise, When In Use), haptics on hold-to-commit,
  Live Activity on the Lock Screen and Dynamic Island, photo cut-out quality.

## Open questions

None. Research spike before step 8: `expo-maps` (alpha) with image annotations for stickers on
SDK 57; if it cannot render them acceptably, fall back to MapKit through `modules/tapiro-kit`.

<!-- After implementation, spec-lifecycle appends "## Implementation Record (YYYY-MM-DD)" below. -->
