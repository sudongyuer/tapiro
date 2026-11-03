---
title: Carpool (拼车) v1, redesigned as a ticket
status: approved
created: 2026-11-02
approved: 2026-11-02
implemented:
supersedes: 2026-10-11-carpool-design.md
superseded-by:
pr:
---

<!-- Visual source of truth: design canvas https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o, page 05r 「拼车」, boards
RideDirections (176), RideList1 (180–185), RideDetail1 (186–192), RideMeetup1 (193–199), RideCreate1 (200–206) and
RideSettle1 (210–219). Research and the recorded answers: docs/research/2026-10-31-carpool-references.md.
Builds on: docs/specs/2026-10-11-foundation-design.md (accounts, payee methods, pay sheet, settlement, stickers),
docs/specs/2026-10-29-multi-currency-design.md and docs/specs/2026-10-31-realtime-push-design.md. Sibling:
docs/specs/2026-10-11-bounty-design.md and docs/specs/2026-10-31-bounty-post-redo-design.md. -->

Approved by the owner in the main session on 2026-11-02 (relayed by the coordinating session), before the final text;
the decisions are the ★ answers recorded on the boards. Rows marked "★ by default, owner may veto" fill gaps the boards
did not draw.

## Background and lessons

- **Round 1 was rejected.** The first carpool design (canvas questions 98–116, the ride card and the hand-drawn route
  card) was drawn overnight without reference research or an agreed visual direction. The owner rejected all of it
  (「重新画，感觉都好丑」, retro `docs/retros/2026-10-31-chat-plan-live.md`). Questions 98–116 are void, except 114,
  whose ruling became the realtime spec. The rules of `2026-10-11-carpool-design.md` (seats, fees, no-shows, split)
  were never in dispute; its screens were. Lesson, kept as memory `research-before-new-area`: a new area starts with
  a joint research board and a written direction, then one screen at a time.
- **The research found Grab Group Ride.** Grab Malaysia launched Group Ride nationwide on 2026-05-08: invite link,
  waiting room, automatic cashless split. It removes "算钱催钱" for friends who all pay in Grab, but does not help find
  strangers going the same way and has no cash, Alipay or WeChat settlement and no reputation (research §1.2). So
  Tapiro keeps its own split and lets the organiser say the fare was split in Grab (177 B).
- **The direction is the ticket (176 B).** Each ride is a 椰糖杏 ticket with short names large (双威 → KLIA2), small
  labelled cells (borrowed from the boarding pass, never imitating Wallet) and a Flighty-style status sentence on top.
  The detail adds Citymapper's six-phase line. The same ticket is the list card, the home live card and later the Live
  Activity. Daily short trips come first; the airport adds optional fields (179 A).
- The boards were then drawn one screen at a time (list, detail, 集合, create, settle) and answered with every ★
  (2026-11-02). This spec writes those answers down and carries every unchanged rule over from the old spec.

## Problem

Students in Sunway, Subang and other campus areas share Grab rides home, to malls and to the airport. Today one person
asks in a WeChat group (「谁下午一起回 YC」), a few reply, they agree a pick-up point, the organiser books and pays, and
afterwards chases everyone for their share (KICKOFF 2026-10-06). The founder named all four pain points: gathering
people, meeting up, working out and chasing the money, and people who never pay. Posts sink in busy groups, strangers
are unverified and the meeting point is a free-text line (research §2.5).

The 拼车 tab exists only as a frame (`src/app/(tabs)/ride/index.tsx` renders `EmptyTab`); the home ride card and the
`rideSoon` accessory exist with fixture data only.

## Goals and scope

**Do (v1)**

- 拼车 tab: one list, 我的拼车 then 可以加入, compact tickets under 今天 / 明天 subheadings, no filter chips.
- Create: 「去哪儿？」 picker, then the form under a live ticket, then a confirm page with the fee line.
- Join by request with an optional note; the organiser approves on an application card.
- Detail: the ticket and the six-phase timeline; 集合 as a countdown ticket with the arrival row, 我到了 (undoable),
  晚到, the 车牌 cell, 导航到集合点 and (organiser) 打开 Grab; 出发 with a boarding sheet.
- 到了 · 分车费: total, one row per person, optional receipt screenshot, one payment per rider through the built pay
  sheet, per-person receipt rows, shared paid status; or 「车费已在 Grab 里分好」.
- One car sticker per ride; a settled ride stays 24 h, then moves to 「去过的 · n 趟」.
- Live updates and push per the realtime spec; every string in zh-Hans, en and ms.

**v1: absent, arrives later**

- 问小貘 drafting and reading the receipt (foundation step 8). The manual form and the typed total are the v1 paths.
- The ride group chat (foundation step 7).
- Push delivery and the ride 集合 Live Activity (realtime 174 A) wait on the Apple Developer account; until then the
  recording sender, live in-app updates and on-device reminders (173 A).
- Reviews after settlement (foundation step 6). The boards draw no review and leave no space for it.
- Holiday long-haul trips (179 A).

**Don't do**

- Driver-offers-seats rides or paid driving; booking Grab or reading Grab trip data (Tapiro only opens Grab's home
  screen once its link is confirmed on a device).
- Routing or "along the route" matching; any radius limit on who sees a ride.
- Live or background location. 我到了 never uses location (195 A).
- Holding money. Money goes rider → organiser directly.
- Charging no-shows; coins for completing a ride; auto-accept joins; per-rider split confirmation.
- Filter chips (182 B); an organiser nudge button (216 A); a hand-drawn route card (176 B: hand-drawn art is only the
  car sticker and the 小貘 button).

## Decisions

Every answered question and the defaults drawn on each board. Board names are the canvas files on page 05r.

| #             | Decision                                                                                                                                                                                                             | Board          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 176 B         | Each ride is a 椰糖杏 ticket (short names large, labelled cells, status sentence); the detail adds the six-phase timeline                                                                                            | RideDirections |
| 177 B         | Tapiro splits by default; the organiser may choose 「车费已在 Grab 里分好」, which skips the split and only records who boarded                                                                                      | RideResearch   |
| 178 B         | Go on with the composite WeChat-post sample; no real screenshots                                                                                                                                                     | RideResearch   |
| 179 A         | Daily short trips first; airport adds optional 航班起飞 and 大件行李; holiday long-haul not designed                                                                                                                 | RideResearch   |
| 180 B         | The list uses a compact ticket with a right-hand stub showing 每人约 and seats (1/4)                                                                                                                                 | RideList1      |
| 181 A         | One list, two sections: 我的拼车, then 可以加入                                                                                                                                                                      | RideList1      |
| 182 B         | No filter chips; day subheadings 今天 / 明天; an airport ticket carries its own marker                                                                                                                               | RideList1      |
| 183 B         | Airport info is one icon line on the ticket: 「✈ 航班 09:10 起飞 · 🧳 2 件大行李」                                                                                                                                   | RideList1      |
| 184 A         | 发起拼车 is the nav-bar ＋                                                                                                                                                                                           | RideList1      |
| 185 A         | Empty list is a moment screen (speckled ground, big car sticker, one line, black 发起拼车); the ＋ is hidden                                                                                                         | RideList1      |
| default       | Large title 「拼车」; a full ride is neutral with 「已满」 and a crossed circle; urgent red plus a clock for 「8 分钟后出发」; warning colour plus 「!」 for 「我发起的 · 1 人申请」                                 | RideList1      |
| 186 A         | The full ticket scrolls away; the nav bar then shows 「双威 → KLIA2」                                                                                                                                                | RideDetail1    |
| 187 A         | All six phases listed (发起 → 凑齐 → 集合 → 上车 → 到了 → 结清), 「现在」 marked; past solid, future grey with an estimated time                                                                                     | RideDetail1    |
| 188 A         | A non-member sees the organiser's avatar plus dashed, nameless empty seats; members are hidden from non-members                                                                                                      | RideDetail1    |
| 189 A         | The organiser handles requests on an application card under the ticket (avatar, tier, the note, 拒绝 / 通过)                                                                                                         | RideDetail1    |
| 190 A         | 「车费怎么分」 is chosen at creation and can be changed in the detail until departure                                                                                                                                | RideDetail1    |
| 191 A         | An airport ride adds two ticket cells, 航班起飞 and 大件行李                                                                                                                                                         | RideDetail1    |
| 192 A         | After applying, the ticket carries an 「已申请」 stamp; the bottom shows 「等小林通过」 with 撤回申请                                                                                                                | RideDetail1    |
| default       | The primary action follows the role: 申请上车; 我到了 from 集合; the organiser's 「出发 · 勾选谁上了车」                                                                                                             | RideDetail1    |
| default       | A failed refresh keeps the last tickets under a yellow 「下面是 22:05 的」 note with 重试; a failed first load shows an error card, the ＋ still visible                                                             | RideDetail1    |
| default       | An application may carry a one-line note                                                                                                                                                                             | RideDetail1    |
| 193 A         | At 集合 the ticket becomes a countdown ticket (「10 分钟后出发」, cells 集合点 / 车牌 / 到了 n/4); the timeline expands 集合; same page                                                                              | RideMeetup1    |
| 194 A         | The 集合 step shows a row of avatars: arrived has a green ring and the time, not arrived is dashed, late is yellow                                                                                                   | RideMeetup1    |
| 195 A         | 我到了 is manual only and can be undone (「你 06:21 到了 · 撤销」); no location                                                                                                                                      | RideMeetup1    |
| 196 A         | 晚到 offers 5 / 10 / 15 分钟 or 不来了…; others see a yellow ring with 「晚到 5 分 · 约 06:35」                                                                                                                      | RideMeetup1    |
| 197 A         | 出发 opens a half sheet with everyone who tapped 我到了 pre-ticked; unticked people are shown the no-show consequence and the appeal; confirm 「3 人出发」                                                           | RideMeetup1    |
| 198 A         | A 车牌 cell filled by the organiser after calling the car (「VEN 2381 · 白色 Alza」); 导航到集合点 for everyone; 打开 Grab for the organiser only                                                                    | RideMeetup1    |
| 199 A         | Nothing is shown while connected; 「可能不是最新 · 06:19 的」 only while disconnected                                                                                                                                | RideMeetup1    |
| default       | The first no-show in 60 days is waived, and the boarding sheet says so                                                                                                                                               | RideMeetup1    |
| 200 A         | ＋ opens 「去哪儿？」: two recent routes, then 回住处 / 去学校 / 去商场 / 去机场 / 都不像; then the form under a live list-style ticket                                                                              | RideCreate1    |
| 201 A         | The short name fills from a table of common place names (Mid Valley Megamall → 谷中城, Sunway Geo → 双威), else the leading part of the name; editable                                                               | RideCreate1    |
| 202 A         | Stepper 「一共几人（含你）」, 2–6, default 4; below it 「还要 n 人」                                                                                                                                                 | RideCreate1    |
| 203 A         | Quick picks plus the system date and time picker; 集合 is fixed at 30 min before departure and cannot be edited                                                                                                      | RideCreate1    |
| 204 A         | The organiser enters the whole-ride estimate; 每人约 is computed and follows the seat count                                                                                                                          | RideCreate1    |
| 205 A         | The 航班和行李 group opens automatically when the destination is an airport; otherwise a collapsed 「＋ 航班和行李」 row                                                                                             | RideCreate1    |
| 206 A         | Confirm page as for bounties: ticket, summary, fee line 「本月免费 · 还剩 n/3」, refund rule; with no payee method the button becomes 「去加收款方式」                                                               | RideCreate1    |
| default       | The form's ticket keeps a fixed height while typing (bounty 152 A); at 6 people 「记得叫 6 座的车」; 集合说明 under 「加点细节 · 都可以不填」                                                                        | RideCreate1    |
| default       | 车费怎么分 is a system menu defaulting to Tapiro 平分; with the free posts used the fee line reads 「1 貘币 · 余额 n」                                                                                               | RideCreate1    |
| 210 A         | Only the organiser presses 「到了 · 分车费」; others read 「等小林分车费」; the home card reminds the organiser                                                                                                      | RideSettle1    |
| 211 A         | Half sheet: total, then one row per boarded person, each editable; shares round up to 0.10; the organiser keeps the extra                                                                                            | RideSettle1    |
| 212 B         | Optional Grab receipt screenshot; visible to riders and moderators; deleted 30 days after settling                                                                                                                   | RideSettle1    |
| 213 A         | Rider's bottom button 「付给小林 RM x」 plus 「金额不对」; opens the built payment sheet, titled 拼车                                                                                                                | RideSettle1    |
| 214 A         | The organiser confirms receipt per person in rows inside the 结清 step (还没收到 / 已收到)                                                                                                                           | RideSettle1    |
| 215 A         | Riders see each other's paid status, one row each                                                                                                                                                                    | RideSettle1    |
| 216 A         | Only Tapiro reminds (24 h / 72 h; publishing paused at 7 days or 2 unpaid); the organiser has no nudge button                                                                                                        | RideSettle1    |
| 217 A         | A Grab-split ride settles when the organiser presses 到了: 「已结清」 stamp and one car sticker each, without a payment                                                                                              | RideSettle1    |
| 218 A         | One car sticker per ride, granted at the last settlement; one celebration for the organiser. Resolves old questions 111 and 112                                                                                      | RideSettle1    |
| 219 A         | A settled ride stays 24 h with its stamp, then moves to a 「去过的 · n 趟」 history row                                                                                                                              | RideSettle1    |
| default       | 结清 rows show the method, time and 「有截图」; a settled list ticket shows the amount with 「你付了」                                                                                                               | RideSettle1    |
| 221 ★ default | 每人约 is the estimate ÷ seats before 出发 and ÷ boarded people after, rounded to the nearest whole unit. ★ by default, owner may veto                                                                               | RideCreate1    |
| 222 ★ default | Short names ≤ 8 characters; the table also marks airports (KLIA, KLIA2), which drives 205 A. ★ by default, owner may veto                                                                                            | RideCreate1    |
| 223 ★ default | After publishing only the time (late sheet), 车费怎么分 (until 出发), 车牌, 预计到 and 集合说明 change; other edits mean cancel and repost. ★ by default, owner may veto                                             | RideDetail1    |
| 224 ★ default | The home live card is the compact list ticket with its status sentence. ★ by default, owner may veto                                                                                                                 | RideList1      |
| 225 ★ default | 「去过的 · n 趟」 pushes a list of the user's settled rides, newest first, each opening the read-only detail; cancelled and expired rides leave 我的拼车 after 24 h and are not listed. ★ by default, owner may veto | RideSettle1    |
| 226 ★ default | The 预计到 cell is optional, typed by the organiser with 车牌, hidden when empty; a ride stays 上车 until 到了, with home-card reminders. ★ by default, owner may veto                                               | RideSettle1    |
| 227 ★ default | 车牌, 预计到 and 集合说明 are visible to the organiser and accepted members; the receipt to boarded people and moderators. ★ by default, owner may veto                                                              | RideMeetup1    |
| 228 ★ default | 晚到 can be changed or cleared until 出发 and does not change the no-show rules; 不来了… is leaving. ★ by default, owner may veto                                                                                    | RideMeetup1    |
| 229 ★ default | The application note is optional, ≤ 140 characters, seen by the organiser only, as bounty. ★ by default, owner may veto                                                                                              | RideDetail1    |
| 230 ★ default | A Grab-split ride also needs a payee method to publish, since the mode can change until 出发. ★ by default, owner may veto                                                                                           | RideCreate1    |
| 231 ★ default | Stickers go to everyone who boarded, organiser included; no-shows get none unless an appeal restores them. ★ by default, owner may veto                                                                              | RideSettle1    |
| 232 ★ default | 我到了 can be undone until 出发, not after. ★ by default, owner may veto                                                                                                                                             | RideMeetup1    |
| 220 A         | Editing one rider's share leaves the others fixed; the organiser's row is the total minus the others; 发给… is disabled while the others exceed the total. Owner, 2026-11-02                                         | RideSettle1    |
| 233 A         | An appeal no boarded member confirms within 72 h of the actual 出发 lapses: the no-show counts again, waiver as if no appeal had happened; a confirmed appeal still removes it. Owner, 2026-11-02                    | RideMeetup1    |

Questions 220 and 233 touch money or reputation and were answered by the owner on 2026-11-02 (see "Needs the owner").

## Changes versus the old spec

Each line is a change to `2026-10-11-carpool-design.md`.

1. Direction: the ride is a ticket (176 B) with a six-phase timeline in the detail (187 A); the hand-drawn route card
   (86E) is dropped, and hand-drawn art appears only as the car sticker and the 小貘 button.
2. List: no filter chips; 今天 / 明天 subheadings; airport tickets carry their own marker (182 B). The old "chips filter
   by day and destination" is removed from the tab, "Who sees a ride", the risks and `nearby_rides`.
3. List: compact ticket with a 每人约 / seats stub (180 B), one list with two sections (181 A), ＋ in the nav bar (184 A),
   a moment-screen empty state with the ＋ hidden (185 A), full / urgent / request-waiting markers (defaults).
4. Load failure on the list: last tickets kept under 「下面是 hh:mm 的」 with 重试 (default), replacing the bounty 32A
   reuse.
5. Create: a 「去哪儿？」 picker with two recent routes and five tiles comes first (200 A); the form sits under a live,
   fixed-height ticket.
6. Create: a short name (≤ 8) per place, filled from a common-name table or the name's leading part, editable (201 A,
   222). New table of short names and place kinds.
7. Create: airport detection: an airport destination opens 航班和行李 (flight departure time, large-luggage count)
   automatically (205 A); the ride stores both, shown as one icon line on the list (183 B) and two cells in the detail
   (191 A).
8. Create: seats are asked as 「一共几人（含你）」 with 「还要 n 人」 and the 6-seat car hint (202 A); the rule is unchanged.
9. Create: time by quick picks plus the system picker; 集合 shown as fixed (203 A).
10. Create: the whole-ride estimate replaces the per-person estimate; 每人约 is computed and follows seats, then boarded
    people (204 A, 221).
11. Create: 车费怎么分 (Tapiro 平分 / 车费已在 Grab 里分好) is chosen at creation and changeable until 出发 (177 B, 190 A).
12. Create: the confirm page shows the fee line 「本月免费 · 还剩 n/3」 or 「1 貘币 · 余额 n」 and the refund rule; without a
    payee method the button is 「去加收款方式」 (206 A).
13. Join: an application carries an optional note ≤ 140 (default, 229); the organiser approves on an application card
    (189 A); an applicant sees the 「已申请」 stamp and 撤回申请 (192 A).
14. Privacy of members shown as drawn: non-members see the organiser and dashed nameless seats (188 A); the rule is
    unchanged.
15. 集合: the countdown ticket with 集合点 / 车牌 / 到了 n/4 (193 A) and the avatar row with arrived, not arrived and late
    states (194 A).
16. 我到了 can be undone until 出发 (195 A, 232); `arrived_at` is cleared on undo and the event is logged.
17. 晚到: a member reports 5 / 10 / 15 minutes late or 不来了… (196 A, 228). New `late_until` on `ride_members`.
18. 车牌: an optional plate-and-car field set by the organiser after booking (198 A); 导航到集合点 for everyone, 打开 Grab for
    the organiser only. New `plate` (≤ 40) and optional `eta` on `rides` (226).
19. Boarding: 出发 opens a half sheet with 我到了 people pre-ticked and the no-show consequence for the unticked (197 A).
20. Freshness: the realtime spec replaces "question 114": live updates on the meet-up, polling every 15 s within 15 min
    of departure (175 B), 「可能不是最新 · hh:mm 的」 only while disconnected (172 B, 199 A).
21. Push: no longer "absent in v1"; the carpool events of the realtime spec apply (push waits on the Apple account).
22. 到了: only the organiser presses 「到了 · 分车费」 (210 A); the home card reminds; no timeout (226).
23. Split sheet: one row per boarded person with the organiser's row showing the remainder (211 A, 220).
24. Receipt screenshot: optional, visible to boarded riders and moderators, deleted 30 days after settling (212 B).
    New `receipt_proof` on `rides`, cleaned by the payment-proof cleanup.
25. Paying: the rider's bottom button 「付给小林 RM x」 with 「金额不对」 opens the built pay sheet titled 拼车 (213 A).
26. Receiving: per-person rows inside the 结清 step replace "the organiser confirms each rider through the payee view"
    (214 A). The built `confirm_payment_received` is called from those rows.
27. Riders see each other's paid status (215 A); new read of payment states for boarded members.
28. Unpaid: no organiser nudge; the rider's ticket shows 「已欠 n 天」 and the Tapiro reminder line (216 A).
29. Grab-split rides settle at 到了 with stamp and stickers and no payment (217 A). New settle path without payments.
30. Stickers: one car sticker per ride per boarded person, granted at the last settlement; one organiser celebration on
    the last 已收到 (218 A, 231). This changes the built one-sticker-per-payment rule for rides (`stickers.payment_id`
    unique) to one per (owner, ride).
31. History: a settled ride stays 24 h with its stamp, then moves to 「去过的 · n 趟」 (219 A, 225). New `settled_at`.
32. Live Activity: the four phases become the ride 集合 Live Activity of realtime 174 A, later.
33. Shared modules: unchanged plan, plus the short-name table client lives in `src/features/place`.

## Rules carried over unchanged

| Rule               | Choice                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What a ride is     | The organiser books and pre-pays one Grab; others split                                                                                                                                                                               |
| Who sees a ride    | Everyone signed in sees every open ride unless blocked; ordered by start-point distance to the viewer, then same destination; no radius limit                                                                                         |
| Geo queries        | PostGIS; `nearby_rides(point, cursor)` orders by `<->`; non-members get points snapped to about 110 m                                                                                                                                 |
| Places             | Named places (common, recent, search, map pin), stored as `geography(Point)` plus a label ≤ 80; never raw GPS                                                                                                                         |
| Seats              | 2–6 total including the organiser, default 4                                                                                                                                                                                          |
| Fees               | 1 coin, or one of the 3 free posts a month shared with bounties; refunded when the ride is cancelled or expires with no accepted member; publish needs a payee method and is rejected while `publish_blocked()`                       |
| Joining            | Request to join; organiser accepts or declines; a full or departed ride accepts no requests; a requester can withdraw before acceptance; joining is not blocked by unpaid debts                                                       |
| Not full at T-15   | The organiser is asked 「照常走还是取消」; the split counts actual riders                                                                                                                                                             |
| No-show            | A member who leaves inside 15 min before departure, or is not ticked as boarded, is a no-show; one waiver per 60 days; an organiser who cancels after accepting members is a no-show only inside the same window, with no refund      |
| Appeals            | An unticked member taps 「我上车了」; any boarded member confirms in one tap and the no-show is removed; until then 申诉中, not counted; unconfirmed 72 h after the actual 出发, it lapses and the no-show counts as recorded (233 A) |
| Driver late        | The organiser sets a new time with the bounty ETA sheet (60A); the old time is struck through for everyone                                                                                                                            |
| Split and rounding | Equal among boarded people including the organiser, each share rounded up to 0.10 of the currency; the organiser receives the few cents over; editable per rider; total within `post_limits` for `ride`                               |
| Split confirmation | No rider confirmation; 「金额不对」 with an optional note ≤ 140; the organiser edits that rider's amount, which reopens that payment if it is still `due`                                                                             |
| Payment            | One payment per boarded rider (payer rider, payee organiser), opened when the organiser sends the split; the rate locks then; only the organiser's 已收到 settles                                                                     |
| Time nodes         | 集合 from T-30; a ride with no 出发 expires 2 h after departure and nobody is marked no-show                                                                                                                                          |
| Text limits        | Place label ≤ 80, short name ≤ 8, meeting note ≤ 140, application note ≤ 140, 「金额不对」 note ≤ 140, plate ≤ 40, large luggage 0–9; enforced by `char_length` / checks and the same `maxLength`                                     |
| Privacy of members | Ride summaries readable by signed-in users unless blocked; members, 集合说明, 车牌 and payment states only by the organiser and accepted members                                                                                      |
| Unpaid             | Reminders at 24 h and 72 h; publishing blocked after 7 days or 2 open unpaid items                                                                                                                                                    |
| Account deletion   | Blocked while organiser or accepted member of a ride not closed, listed with unsettled payments; requests withdrawn                                                                                                                   |
| Data integrity     | Drafts kept on the device across failures; progress until each RPC answers; never replayed automatically; failed loads never shown as empty                                                                                           |
| Colour             | 椰糖杏 `--color-ride` for the ticket                                                                                                                                                                                                  |
| Later              | Receipt reading by 问小貘 (step 8, consumes 小貘体力); one group chat per ride kept forever (step 7)                                                                                                                                  |

## Needs the owner

Only gaps touching money, privacy or a paid service are asked here. Both are answered (owner, 2026-11-02); nothing is
open.

**220.** 发起人在「到了 · 分车费」里改某个人的金额时，其他人和发起人自己那份怎么变？（211 A 只画了「点金额能单独改」。）
**Answered A** by the owner, 2026-11-02; already built in PR 48 (`src/features/ride/split.ts`).

- A ★：别人的金额不动，发起人自己那行永远是「总价减去别人」，实时变；别人加起来超过总价时「发给…」按钮变灰。账永远对得上总价，发起人不会多收；改大一个人，发起人自己少出。
- B：改一个人以后，其余乘客自动重新平分剩下的钱，发起人那份不动。省得发起人算；改一个人会牵动别人，大家看到的数会变。
- C：不设上限，别人加起来可以超过总价（比如发起人垫了过路费）。最灵活；陌生人之间容易被多收，「金额不对」会变多。

**233.** What happens to a 「我上车了」 appeal that no boarded member confirms? **Answered A** by the owner, 2026-11-02:
it lapses 72 h after the actual 出发; the no-show then counts again and the 60-day waiver applies as if no appeal had
happened. A confirmed appeal still removes the no-show.

## Data flow and ownership

```
app (拼车 tab, create, detail, sheets) ──RPC──> Supabase (rides, ride_members, ride_events, place_short_names; RLS)
        │                                          │
        ├─ pay sheet (built) ───────────────────> payments (one per boarded rider, Tapiro split only)
        ├─ ride live source ──setSource──> home tickets and the accessory
        └─ realtime layer (user:<uid>), on-device reminders; push and Live Activity later
```

- **`rides`**: organiser, start and destination (point, label, short name), `depart_at`, `revised_at`, seats,
  `estimate_total` (`Money`, optional), `split_mode` (`tapiro` | `grab`), `flight_departs_at` and `large_bags`
  (optional), meeting note, `plate`, `eta`, `receipt_proof`, state, `settled_at`. States: `open` (凑人) → `gathering`
  (from T-30) → `departed` (上车) → `arrived` (到了; total entered, Tapiro split) → `settling` → `closed`; a Grab-split
  ride goes `departed` → `closed` at 到了. Side exits `cancelled`, `expired`. History is `closed` with
  `settled_at` older than 24 h.
- **`ride_members`**: `requested` (with `note`) → `accepted` | `declined` | `withdrawn`; `accepted` → `left` | `boarded` |
  `no_show`; `no_show` → `appealed` → `boarded` (confirmed) | `no_show` (lapsed after 72 h, 233 A). `arrived_at` (nullable, cleared on undo), `late_until`, `share`.
- **`ride_events`**: append-only (arrive, undo, late, revised time, plate, appeal, appeal lapse, 「金额不对」 notes, split sent).
- **`place_short_names`**: seeded by migration: name pattern → short name and place kind (`airport`, `mall`, `campus`,
  `home`); readable by everyone; used by the place search results and the form.
- **Stickers**: the settle of a ride's last payment (or 到了 on a Grab-split ride) inserts one car sticker per boarded
  person, unique per (owner, `ride`, ride id), in the same transaction; earlier payments of the ride settle without a
  sticker or celebration flag.
- **RLS and transitions**: every transition is one `security definer` RPC that checks actor and state, writes
  `ride_events` and calls the contracts (`publish_blocked`, `spend_post`, `refund_post`, `record_no_show`,
  `open_payment('ride', ..)`, `confirm_payment_received`), with typed rejections.
- **Scheduled jobs**: T-30 → `gathering`; departure + 2 h without 出发 → `expired`; receipt cleanup with the payment-proof
  cleanup.
- **Client**: `src/features/ride/`; imports `src/features/place`, `src/features/block`, `src/lib`, `src/ui`, never
  `src/features/bounty`.

## Errors and degradation

| Failure                      | User sees                                                             | System does                                        |
| ---------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| Location denied              | Order by departure time; 「选一个地方」                               | No GPS used                                        |
| First load fails             | Error card with 重试; the ＋ stays                                    | Nothing shown as empty                             |
| Refresh fails                | Last tickets under 「下面是 hh:mm 的」 with 重试                      | Not shown as current                               |
| Disconnected on the meet-up  | 「可能不是最新 · hh:mm 的」                                           | Polls every 15 s within 15 min of departure        |
| Publish without payee method | Confirm page explains; 「去加收款方式」                               | RPC rejects                                        |
| Join after full or departed  | 「这趟满了」 / 「已经出发了」                                         | RPC rejects                                        |
| Member leaves inside 15 min  | Action sheet 「现在退出会记一次放鸽子」 first                         | `no_show` with the 60-day waiver                   |
| Organiser never taps 出发    | Reminder on the organiser's card                                      | Expires at departure + 2 h; nobody is a no-show    |
| Organiser never taps 到了    | 「等小林分车费」 for riders; reminder on the organiser's card         | Ride stays `departed`                              |
| Receipt upload fails         | 没成功 on the row; total and rows kept                                | Upload reused on retry; never sent automatically   |
| Rider never pays             | 「已欠 n 天」 and the Tapiro reminder line                            | Ride stays `settling`; `publish_blocked()` applies |
| Any write fails              | Progress until the RPC answers, then 「没成功，再试一次」; input kept | Never replayed automatically                       |

## UI/UX and motion

### Screens and states

| Screen                  | Design board | States to cover                                                                                                                |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 拼车 list               | RideList1    | empty (moment), mine + joinable, full, urgent, request waiting, airport, settled (24 h), history row, failed, long labels (ms) |
| Detail                  | RideDetail1  | non-member, applicant (已申请), organiser with application card, airport cells, scrolled nav title                             |
| 集合                    | RideMeetup1  | countdown ticket, arrived / not arrived / late, undo, 晚到 sheet, 车牌 filled and empty, boarding sheet, disconnected          |
| 去哪儿？ and form       | RideCreate1  | recent routes, no recent, airport expanded, mall collapsed, 6 people, longest place name                                       |
| Confirm                 | RideCreate1  | free post left, coin, no payee method, no balance                                                                              |
| 到了 · 分车费 sheet     | RideSettle1  | equal rows, edited row, receipt attached / not                                                                                 |
| 结清 (rider, organiser) | RideSettle1  | 0/n paid, partly paid, owed n days, settled with stamp and sticker, Grab-split settled                                         |
| 去过的 list             | —            | Not drawn (225)                                                                                                                |

### Motion

Each motion passes the gate and runs once per event; curves and durations are offered as numbered options at
implementation (`animate-expo`). Candidates: the 「已申请」 and 「已结清」 stamps, the sticker going into the book, the
organiser's celebration G on the last 已收到. Ticket changes at 集合 are not animated beyond the system default.

## Known gaps

Not drawn on the boards. Each either follows a carried rule, takes a ★ default above, or waits for a later step.

- Reviews after settlement: foundation step 6; no space reserved (219 board).
- The 「金额不对」 flow: the rider's note sheet and the organiser's edit are not drawn; the carried rule applies, and the
  share bound is 220 A.
- Holiday long-haul trips: not designed (179 A).
- Accessibility sizes: boards are drawn at the default size. Acceptance runs at Large (AGENTS.md); the fixed-height
  ticket keeps system text scaling without separate layouts.
- Dark mode and en / ms copy: drawn in zh-Hans light only; covered by the verification cases.
- The T-15 「照常走还是取消」 prompt, the appeal (「我上车了」), cancel and leave action sheets, and 「⋯」 (屏蔽, 取消这趟) are
  not redrawn; the old spec's rulings (bounty 37A, 58A, 8A, 60A, 59B) apply inside the new detail.
- The home live card and the history list (224, 225), and the source of 预计到 (226).
- 问小貘 drafting, receipt reading, chat, push delivery and the Live Activity: later steps.
- The RideCreate1 6-person frame shows RM 16 on the ticket and RM 13 in the form for RM 76; the form value is the rule
  (221).

## Known limits

- Ordering is by area, not route; without chips the list relies on day subheadings while volume is low.
- No-shows are not charged; the organiser may lose money.
- The estimate is the organiser's number; Tapiro has no Grab price data.
- 我到了 and 晚到 are self-reported.
- A Grab-split ride is trusted: Tapiro cannot see whether anyone paid in Grab.
- Stickers wait for the last payment; one unpaid rider holds back everyone's sticker.
- The split assumes one Grab receipt per ride.

## Implementation order

1. **Shared modules**: move place search, origin store and the block client out of `src/features/bounty`.
2. **Schema and transitions**: `rides`, `ride_members`, `ride_events`, `place_short_names`, RLS, every transition RPC
   (including undo 我到了, 晚到, plate, split mode, Grab-split settle), the jobs, `post_limits` rows, the per-ride sticker
   grant, account deletion; pgTAP for every allowed and forbidden transition.
3. **`nearby_rides`** with cursor and day grouping.
4. **List and create**: tab, 去哪儿？, form with the live ticket, short names, airport group, confirm.
5. **Detail and 集合**: ticket, timeline, application card, 已申请, countdown ticket, arrivals, 晚到, 车牌, boarding sheet,
   appeal, cancel and leave; the ride live source and realtime kinds.
6. **到了 and 结清**: split sheet, receipt, payments, 金额不对, receipt rows, paid status, Grab-split settle, stickers,
   celebration, 24 h and history.
7. **Reminders** (local, 173 A) and the recording push sender's carpool kinds.
8. After foundation steps 6–9: reviews, chat, 问小貘, push delivery, Live Activity.

Every UI step writes the UI cases for the screens it changes; the feature's cases run once when step 7 is done.

## Verification

- Every PR: `bun test`, `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`, `check-specs`,
  `check-story-map`, `supabase test db` when SQL changed, `bun run verify:smoke`; `design-check` for UI.
- Unit: split arithmetic (round up to 0.10 per currency; the organiser's remainder), 每人约 rounding, short-name
  fallback, airport detection, time nodes, the 24 h move to history.
- pgTAP: transitions, undo and late, Grab-split settle, one sticker per (owner, ride), receipt visibility, paid-status
  visibility to boarded members only.
- UI cases (zh-Hans light; `ms` for long copy; dark for the ticket colour and stamps; `en` for new copy keys): the
  screens and states above, with screenshots beside the boards.
- `break-ui`: 80-character labels, 8-character short names, 6 riders with long names, ¥ and RM totals at the limit, one
  rider.
- Device: reminders, haptics, 打开 Grab and Apple Maps links.

## Implementation Record (2026-11-02, steps 1–3)

PR: https://github.com/sudongyuer/tapiro/pull/48 · Commits: e27f62b..HEAD on `feat/carpool-foundation`. Status stays `approved`: steps 4–8 remain.
Plan: `docs/plans/2026-11-02-carpool-foundation.md`.

### What was built

- Step 1, shared modules: place search, place pick, current place and the origin store live in `src/features/place/`
  (facade `index.ts`); the block client, flow, events, menu and list screen in `src/features/block/`. Bounty imports
  both; verify-mode block fixture people are registered by bounty (`src/features/bounty/shared/blockFixturePeople.ts`).
  Evidence: 71b7b4d, 54cc90a.
- Pure logic: `src/features/place/shortName.ts` (table match, leading-part fallback ≤ 8, airport detection),
  `src/features/ride/split.ts` (220 A), `perPerson.ts` (221), `rideTimes.ts` (T-30, T-15, +2 h, 24 h). Evidence: 2360d14.
- Step 2, schema and RLS: `rides` (snapped `start_public` / `dest_public`), `ride_details` (note, plate, eta),
  `ride_receipts`, `ride_members` (the organiser holds a row), `ride_events`, `place_short_names` with 21 seed patterns,
  `post_limits` rows for `ride`, bucket `ride-receipts`. Evidence: `supabase/migrations/20261102000000_rides.sql` (df3234c).
- Transitions: `publish_ride`, `request_ride`, `withdraw_ride_request`, `decide_ride_request`, `ride_leave_preview`,
  `leave_ride`, `ride_cancel_preview`, `cancel_ride` (a14c8f7); `mark_ride_arrived`, `undo_ride_arrived`,
  `report_ride_late`, `revise_ride_time`, `update_ride_details`, `set_ride_split_mode`, `depart_ride`,
  `appeal_ride_no_show`, `confirm_ride_appeal` (2a16466); `reach_ride`, `send_ride_split`, `set_ride_receipt`,
  `dispute_ride_share`, `change_ride_share`, `ride_paid_states`, the ride branch of `confirm_payment_received` and one
  car sticker per (owner, ride) (4bb8f5c); `run_ride_jobs` (cron `ride-jobs`, every minute),
  `ride_receipts_to_delete`, `clear_ride_receipt`, `active_rides_of`, the `auth.users` delete trigger and `rides` in
  the `account-delete` 409 (78af614).
- Step 3: `nearby_rides(latitude, longitude, page_after, page_size, reference_currency)`, `my_rides()` (24 h rule),
  `ride_history()`. Evidence: `supabase/migrations/20261102000500_nearby_rides.sql` (0a6f74e).

### Deviations from the design

| Design said                                                         | Shipped                                                                                                                                                        | Why                                                                                                           | Confirmed by                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Carpool events go to the realtime outbox                            | Transitions write `ride_events` only                                                                                                                           | `public.events` does not exist yet (no migration); the kinds are emitted in step 5                            | not intent-changing                                                        |
| Receipt cleanup with the payment-proof cleanup                      | `ride_receipts_to_delete()` and `clear_ride_receipt()` exist; the Edge Function does not call them yet                                                         | No client can upload a receipt before step 6                                                                  | not intent-changing                                                        |
| Receipt visible to moderators                                       | Moderators read through the service role                                                                                                                       | No moderator role exists in the schema                                                                        | not intent-changing                                                        |
| Order by distance, "then same destination"                          | Malaysia day, then snapped start distance, then departure, then id                                                                                             | "Same destination" names no reference point; distance uses the snapped point so ties fall to departure        | not intent-changing                                                        |
| Equal split rounds up to 0.10                                       | Rounded up, capped at total ÷ (riders) so the organiser's row is never negative                                                                                | Totals under about RM 3 for 6 people would go negative                                                        | not intent-changing                                                        |
| 每人约 rounds to the nearest unit                                   | Same, never below one unit                                                                                                                                     | Avoids showing RM 0                                                                                           | not intent-changing                                                        |
| Leaving inside 15 min is a no-show                                  | Member state `left` plus a no-show record (not state `no_show`)                                                                                                | Keeps 我上车了 appeals to unticked boarders only                                                              | not intent-changing                                                        |
| Appeal: 申诉中, not counted                                         | The no-show row is deleted at appeal; an appeal nobody confirms is never counted                                                                               | The spec has no rejection path                                                                                | superseded by 233 A (owner, 2026-11-02); see the appeal lapse record below |
| Appeals (carried rule, no window given)                             | 我上车了 and its confirmation work for 72 h after the actual 出发, in any later status including `settling` and `closed`                                       | Otherwise the organiser could shut the window by pressing 到了 or sending the split at once (review of PR 48) | coordinator, 2026-11-02                                                    |
| A confirmed appeal boards the member                                | After the split is sent the split stays as sent: no share, no payment, no sticker for the late boarder                                                         | Reopening a sent split would change other riders' amounts                                                     | coordinator, 2026-11-02                                                    |
| Driver late: the organiser sets a new time                          | The new time must be later than the current one and within 24 h of the first                                                                                   | An earlier time collapsed 集合 and the 15-minute window (review of PR 48)                                     | coordinator, 2026-11-02                                                    |
| Members, 集合说明, 车牌 only for the organiser and accepted members | `no_show` and `appealed` members lose them; a confirmed appeal restores them. Declined, withdrawn and left users see a ride only while it is open, like anyone | `is_ride_member` and `has_ride_row` were wider (review of PR 48)                                              | coordinator, 2026-11-02                                                    |
| One car sticker per boarded person                                  | No sticker when nobody but the organiser boarded, for a Tapiro or a Grab-split ride                                                                            | A ride without riders minted a sticker (review of PR 48)                                                      | coordinator, 2026-11-02                                                    |
| Sticker per payment (built)                                         | Ride payments earn no per-payment sticker; the ride closes at the last settle and stickers go to every boarded person                                          | Change 30 of this spec; `stickers.test.sql` fixtures moved to bounty payments                                 | spec 218 A / 231                                                           |

### Bugs fixed during implementation

- **Symptom:** `check:size` failed on `20261102000100_ride_join.sql` (507 lines). **Root cause:** the plan's per-task
  checks omitted `check:size`. **Fix:** no-show helpers moved into the schema migration (d658677).

- **Symptom (review of PR 48):** `confirm_payment_received` locked the payment, then the ride; `change_ride_share` locked the ride, then the payment. **Root cause:** no lock order across the two paths. **Fix:** the settle locks the ride row first. No single-session pgTAP case can show a deadlock, so this fix has no failing test.
- **Symptom (review of PR 48):** a `depart_ride` replay after 到了 raised `closed`. **Root cause:** the replay check only accepted status `departed`. **Fix:** any later status answers the first boarding. Test: `ride_review.test.sql`.

### Verification

- `supabase test db` on an isolated local stack (`project_id` `tapiro-carpool`) → 32 files, 1294 tests, PASS (after the review fixes; `ride_review.test.sql` failed on the pre-fix migrations at each finding in turn).
- `bun test` → 1597 pass, 0 fail.
- `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`, `bun run check:size`,
  `node scripts/check-specs.mjs --dir docs/specs`, `node scripts/check-story-map.mjs` → exit 0.
- Skipped: `verify:smoke` (no screen changed) and `test:stack` (needs the Edge runtime on the shared stack).

### Known limits

- `sticker_book()` and `settled_cards()` join `payments`, so ride stickers do not show in the book yet (step 6).
- The client payment fixture still earns a per-payment ride sticker (`src/features/payment/fixturePaymentService.ts`); step 6.
- The app does not list `rides` from the account-delete 409 yet; it treats the answer as blocked.
- The six `20261102…` migrations ran only on the local stack; nothing was pushed to the hosted project.

## Implementation Record (2026-11-02, appeal lapse, 233 A)

PR: https://github.com/sudongyuer/tapiro/pull/49, branch `feat/carpool-appeal-lapse`. Status stays `approved`: steps 4–8 remain. 220 A needed no code; it was
built in PR 48 (`src/features/ride/split.ts`).

### What was built

- `supabase/migrations/20261102000600_ride_appeal_lapse.sql`: `reputation_events.appeal_pending` (no-show rows only).
  `appeal_ride_no_show` marks the ride's no-show row pending instead of deleting it; `confirm_ride_appeal` deletes it;
  `recompute_reputation` skips pending rows. `run_ride_jobs` gains a lapse step: an `appealed` member whose ride
  departed 72 h or more ago goes back to `no_show`, the row is un-pended with its original `created_at` and `waived`,
  and one `appeal_lapsed` event (note `counted` or `waived`) is logged; the job result gains `lapsed`. Appeals made
  before this migration (row already deleted) are backfilled as pending rows from their `no_show` event.
- Race safety: the lapse locks the member row with `skip locked`, the row `confirm_ride_appeal` also locks, and its
  update is guarded on `status = 'appealed'`; confirmation and lapse use the same 72 h boundary from the first
  `departed` event, so at most one of them applies.

### Deviations from the design

| Design said                            | Shipped                                                                                                                        | Why                                                                                     | Confirmed by        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------- |
| 申诉中, not counted                    | A pending row is left out of the reputation count but still holds its 60-day waiver; a later no-show while it waits is counted | 233 A: the lapse restores the waiver "as if no appeal had happened"                     | not intent-changing |
| A confirmed appeal removes the no-show | Removing a waived row frees the waiver for later no-shows; a no-show already counted while the appeal waited stays counted     | Recomputing other items' outcomes after the fact would change answers users already saw | not intent-changing |

### Verification

- `supabase test db` on an isolated stack (`scripts/db-isolated.sh appeal-lapse 565`, `project_id`
  `tapiro-appeal-lapse`, ports 565xx, stopped after) → 33 files, 1314 tests, PASS. Without the new migration,
  `ride_appeal_lapse.test.sql` failed at the pending row, the held waiver, the lapse count and the lapsed state, then
  aborted at `appeal_lapsed`; `ride_jobs.test.sql` and `ride_meetup.test.sql` failed on the new result key and column.
- The rejected late confirmation (`throws_ok`) also passed before this change; its case fails before through the
  assertions that follow it (the member stays `appealed`, then lapses).
- The backfill ran on an empty table only; no pgTAP case can reach it after migrations apply.

### Known limits

- The lapse runs with the every-minute `ride-jobs` cron, so a lapse lands up to a minute after the 72 h mark; a
  confirmation in that minute is already refused.

## Implementation Record (2026-11-02, step 4)

PR: https://github.com/sudongyuer/tapiro/pull/50 (`feat/carpool-list-create`) · Commits: ea0d213, 2009c88, fafc6f0 and this record. Status stays `approved`: steps
5–8 remain.

### What was built

- 拼车 tab (`src/app/(tabs)/ride/`, `src/features/ride/RideListScreen.tsx`): 我的拼车 then 可以加入 under 今天 / 明天 / date
  subheadings (181 A, 182 B), compact tickets (`RideTicket.tsx`, 180 B) with the 每人约 · taken/seats stub, the urgent,
  request-waiting, 已满 (neutral `--color-card-calm`) and 已申请 markers (`ticket.ts`), the airport line (183 B), the
  nav-bar ＋ (184 A), the moment empty screen with ＋ hidden (185 A), the first-load error card with ＋ kept and the
  stale note on a failed refresh (`listState.ts`), 「去过的 · n 趟」 pushing `ride_history` (225), and a placeholder
  detail route `ride/[id]` that shows only the cached ticket.
- Create sheet (`src/app/ride-create/`, `src/features/ride/create/`): 去哪儿？ with two recent routes and four tiles
  (200 A), the form under a pinned live ticket (fixed height), places from the shared place search with the short name
  from `place_short_names` (201 A, editable ≤ 8), quick times and the system picker with the fixed 集合 line (203 A), the
  people stepper with 还要 n 人 and the 6-seat hint (202 A), the whole-ride estimate and 每人约 (204 A, 221), 车费怎么分
  as a system menu (190 A), 航班和行李 opened by an airport destination or tile (205 A), 集合说明 (≤ 140), and the
  confirm page with the fee line, refund rule, and 去加收款方式 without a payee method (206 A, 230). The draft is kept on
  the device and the publish id makes a retry answer the first outcome.
- Services: `rideService.ts` (`nearby_rides`, `my_rides`, `ride_history`, `place_short_names`, post status with the
  payee count, `publish_ride` with typed failures); verify fixtures (`fixtureRides.ts`, `fixtureRideService.ts`,
  `fixtureCreate.ts`) and Debug scenes `ride-list`, `ride-form`, `ride-confirm`.
- Copy: `src/lib/i18n/locales/ride/{zh-Hans,en,ms}.ts`; the old `shell.ride.empty*` placeholder strings are gone.

### Deviations from the design

| Design said                                                     | Shipped                                                                                              | Why                                                                                                   | Confirmed by        |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| 「选时间」 is a third capsule                                   | It shows until a time is set; then the 出发 row holds the system compact date and time picker        | The compact picker is the system picker; a second entry would duplicate it                            | not intent-changing |
| The live ticket sits at the top of the form                     | It is pinned above the scrolling Form                                                                | The board's 「往下滑到底」 frame keeps it in view; an RN view in a Form row mis-measures (TaskCard)    | not intent-changing |
| Place search rows read 「票上叫「谷中城」」                     | The short name shows under the chosen place in the form, not in the search rows                      | The shared search screen serves bounty too; the form line carries the same information                | not intent-changing |
| 车费怎么分 menu items carry a one-line explanation              | Titles only                                                                                          | The system menu Picker renders one line per option                                                    | not intent-changing |
| (not drawn) currency                                            | The device currency (MYR, CNY on China-region devices); no currency menu in the form                 | Bounty's currency menu was not drawn for rides                                                        | not intent-changing |
| Location denied: 「选一个地方」                                 | The list orders by the current location only when permission is already granted, else by time        | No place chooser was drawn for 拼车; ordering by time is the spec's fallback                          | not intent-changing |
| 航班起飞 row in the airport group                               | 「加起飞时间」 adds it; the clock is stored as the first such time after departure                    | A flight time is optional; departure-relative storage matches `publish_ride`'s 24 h rule              | not intent-changing |
| A settled list ticket shows 「你付了」                          | Shows 已结清 only                                                                                    | `my_rides` returns no share; step 6                                                                   | not intent-changing |
| 已申请 stamp (192 A)                                            | Status line 「已申请 · 等通过」 on the list ticket                                                   | The stamp belongs to the detail (step 5)                                                              | not intent-changing |
| Pages of 20 with automatic loading                              | Pages of 50 with a 「再看更多」 card                                                                 | Volume is low (spec Known limits)                                                                     | not intent-changing |

### Verification

- `bun test` → 1636 pass; the 4 `scripts/check-file-size.test.ts` cases fail only when `bun test` runs inside this sandboxed worktree (the same file passes from outside it and passed in this session's first full run; `scripts/` is unchanged). `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`,
  `bun run check:size`, `node scripts/design-check.mjs`, `node scripts/check-specs.mjs --dir docs/specs`,
  `node scripts/check-story-map.mjs` → exit 0.
- `bun run verify:build` and `bun run verify:smoke` (4 cases) → pass. `ride_list` ran once in zh-Hans light and dark →
  pass; the screenshot matches RideList1 180 B / 181 A / 182 B / 183 B.
- Written, not run (Pace, they run after step 7): `ride_list_empty`, `ride_list_failed`, `ride_list_worst`,
  `ride_history`, `ride_create_pick`, `ride_create_form`, `ride_create_confirm`, `ride_create_payee`,
  `ride_create_cost`, `ride_create_worst`.

### Notes for step 5

- `bounty.block.*` copy is still in the bounty namespace; step 4 does not use it. Move it before the detail's ⋯ menu.
- `rideCache` (`services.ts`) holds the last summaries the list loaded; `RideDetailStub` reads it. Replace the stub
  route `ride/[id]` with the detail, keep the route name.
- `RideTicket` takes a `TicketView`; `rideTicketView` builds it from a summary plus the viewer's role. The home live
  card (224) can reuse both.

## Implementation Record (2026-11-02, step 5)

PR: https://github.com/sudongyuer/tapiro/pull/51 (`feat/carpool-detail-meetup`) · Commits: 17f0b68..HEAD. Status stays `approved`: steps 6–8 remain.

### What was built

- Read: `public.ride_detail(ride, reference_currency)` (`supabase/migrations/20261102000700_ride_detail.sql`) returns
  the summary plus the viewer's role (`organiser`, `member`, `applicant`, `viewer`, `noShow`), their own status, note,
  arrival and late time, the phase times (published, filled, departed, reached), the 72 h appeal end, whether their
  appeal lapsed and the no-show outcome. Members (with arrival, late time and approval time), 车牌 / 预计到 / 集合说明
  and the exact start point go only to the organiser and accepted or boarded members; requests with notes only to the
  organiser; everyone else gets the snapped point. It mirrors `rides_select`: a blocked viewer and a non-member of a
  departed ride get `ride_not_found`. pgTAP `ride_detail.test.sql` (30 tests).
- Detail (`src/features/ride/detail/`, route `ride/[id]`): the full ticket with the cells and the two airport cells
  (186 A, 191 A); the nav title 「双威 → KLIA2」 once the ticket scrolls away (186 A); the six-step timeline with 「现在」,
  past solid and future grey with times, 「约」 for a typed 预计到 (187 A); a non-member's seat row with the organiser,
  filled-but-hidden seats and dashed empty seats plus the privacy line (188 A); the organiser's application card with
  tier, note, 拒绝 / 通过 (189 A); 车费怎么分 as a system menu until 出发 (190 A); 申请上车 with an optional note sheet,
  then the 已申请 stamp, 「等小林通过」 and 撤回申请 behind a confirmation (192 A); the 「⋯」 menu (改出发时间, 车牌和集合说明,
  取消这趟 for the organiser; 退出这趟 and 屏蔽 for others) with the leave and cancel previews in system action sheets.
- 集合: the countdown ticket with 集合点 / 车牌 / 到了 n/m (193 A); the avatar row, green with the time, dashed 还没到,
  yellow 晚到 n 分 then 「说 hh:mm」, and the 「阿杰 hh:mm 说晚到 5 分钟 · 约 hh:mm」 line (194 A, 196 A); 我到了 and
  「你 hh:mm 到了 · 撤销」 (195 A); 晚到 as a system menu with 5 / 10 / 15 分钟, 不晚到了 and 不来了… (leave flow, 228);
  导航到集合点 for everyone (Apple Maps `https://maps.apple.com/directions?destination=<lat>,<lng>&mode=walking`,
  unified Map URLs), 打开 Grab (`grab://open?screenType=MAIN`, research 2026-10-06) and 填车牌 for the organiser
  (198 A); the boarding sheet with arrivals pre-ticked, the no-show consequence naming the unticked and 「n 人出发」
  (197 A); the organiser's 「照常走还是取消」 card inside T-15 when seats are empty (carried rule).
- Appeals: 「你没被勾上车」 with 我上车了 until the 72 h end, 申诉中, 申诉过期了 (lapsed, 233 A) and the closed state; any
  boarded member sees 「阿杰说已经上车了」 with one-tap 确认上车了.
- Freshness without the realtime layer (`src/lib/live/` and `public.events` do not exist yet): refetch on focus, on
  foreground, on pull and after every write; poll every 15 s while the screen is focused at 集合 within 15 minutes of
  departure (175 B); a failed load keeps the last detail and shows 「可能不是最新 · hh:mm 的」 in the 集合 step (199 A),
  or 「没刷新成功 · 下面是 hh:mm 的」 with 重试 before 集合.
- Data integrity: the apply note and the plate / note draft are kept per ride until the write succeeds; a failed write
  shows 「没成功，再试一次」 and is never replayed; a typed rejection reloads.
- Shared block copy: `bounty.block.*` moved to `block.*` (`src/lib/i18n/locales/block/`), and its body now names rides.
- Verify mode: `fixtureDetailService.ts` with scenes `viewer`, `viewerMall`, `applicant`, `organiser`, `member`,
  `meetup` (06:20), `meetupArrived`, `meetupLate` (06:29), `depart` (06:36), `goOrCancel`, `appealOpen`,
  `appealPending`, `appealLapsed`, `confirmAppeal`, `worst` (`-uiVerifyRideDetail`), `-uiVerifyRideDetailFail
  first|refresh|write`, every call recorded in `uiVerifyRideDetailCalls`; Debug scene `ride-detail`.

### Deviations from the design

| Design said                                                                | Shipped                                                                                                                   | Why                                                                                              | Confirmed by        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------- |
| 集合 step and 集合点 cell read a pickup spot (「Geo 大堂 Grab 上车点」) | The 集合点 cell reads the start's short name (双威, as on the ticket); the 集合 step reads the full start label; the exact spot goes in 集合说明 | A ride has no pickup-spot field; the full label truncated in the cell (「Sunway G…」) | coordinator, 2026-11-02 |
| 到了 shows 「约 07:20」                                                    | Shown only when the organiser typed 预计到 (226), else no time                                                            | Tapiro has no route data                                                                          | not intent-changing |
| Boarding sheet: check circles and a black 「3 人出发」 pill                 | System toggles; 「n 人出发」 is the sheet's confirm button                                                                | Native sheet pattern of the ETA sheet; no imitated controls                                      | not intent-changing |
| The organiser's 集合 bar has only 出发                                     | A secondary 我到了 sits beside 出发 until the organiser taps it                                                           | 196 A shows the organiser with an arrival time; the server accepts the organiser's 我到了         | not intent-changing |
| 填车牌 is one text field                                                   | One sheet: 车牌, optional 预计到, 集合说明                                                                               | `update_ride_details` writes all three; 223 and 226 make them the organiser's edits               | not intent-changing |
| (not drawn) the note field for 申请上车, 改时间, appeal cards, T-15 prompt | Half sheets for the note and the time (later only, ≤ 24 h); cards under the ticket for appeals and 「照常走还是取消」      | Known gaps of this spec; closest board patterns                                                   | not intent-changing |
| Realtime updates and the carpool event kinds (step 5)                      | Focus / foreground / pull / after-write refetch and the 15 s poll; no ride live source on home, no event kinds            | The shared live layer is not built; the realtime spec's interim behaviour applies                 | not intent-changing |
| 199 A: the line shows while disconnected                                   | It shows after a failed refresh or poll                                                                                   | Without a channel, a failed load is the only disconnection signal                                 | not intent-changing |
| The 已申请 stamp (motion candidate) | Motion A: the bounty stamp landing (same values, `detail/useStampLanding.ts`, since features do not import each other), a spring from 1.4 to 1 with a success haptic when it settles, a 150 ms fade under Reduce Motion; only when the stamp appears on screen, not on load. ★ by default, owner may veto | The owner's standing rule takes the ★ option | ★ by default, owner may veto |
| Replace the stub detail | `RideDetailStub.tsx` deleted | Created by step 4 of this effort | coordinator, 2026-11-02 |

### Verification

- `supabase test db` on an isolated stack (`scripts/db-isolated.sh ride-detail 566`) → 34 files, 1344 tests, PASS.
- `bun test` → 1667 pass, 4 fail (the known `scripts/check-file-size.test.ts` cases that fail only inside
  `.claude/worktrees`); `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`, `bun run check:size`,
  `node scripts/design-check.mjs`, `node scripts/check-specs.mjs --dir docs/specs`, `node scripts/check-story-map.mjs`
  → exit 0.
- `bun run verify:build` and `bun run verify:smoke` (4 cases) → pass. `ride_detail` and `ride_meetup` in zh-Hans light
  and dark → pass; screenshots match RideDetail1 189 A / 192 A and RideMeetup1 193 A–195 A.
- Written, not run (Pace, they run after step 7): `ride_detail_organiser`, `ride_detail_worst`, `ride_meetup_late`,
  `ride_meetup_depart`, `ride_meetup_stale`, `ride_appeal`; `ride_list` now opens the real detail.
- Device: 打开 Grab and the Apple Maps link (device checklist, `ride.join.plate`).

### Blocks and ride membership (review of PR 51)

Bug: `ride_detail` hid members blocked in either direction from the organiser while `block_user` kept the membership,
so `depart_ride` recorded the hidden accepted member as a no-show the boarding sheet never named. Decision, ★ by default,
owner may veto:

- Before 出发 (ride open or gathering), a block between the organiser and an accepted member or an applicant ends the
  membership: the row becomes `left` (or `withdrawn` for an applicant), the seat frees up, and a `left` / `withdrawn`
  event with the note `blocked` goes to `ride_events`. It is not a leave: no no-show and no 15-minute penalty. Built as
  an `after insert` trigger on `public.blocks` (`supabase/migrations/20261102000800_ride_block_membership.sql`), which
  also backfills blocks made before it.
- After 出发 a block changes no membership or settlement; the organiser's `ride_detail` lists every member whatever the
  blocks, so boarding, appeals and the split stay correct. Only future rides are affected.
- Intentional: a no-show member who blocked the organiser still reads their own ride and appeal state (`noShow` role).
- The member's 「⋯ → 屏蔽」 sheet says so (`block.confirm.rideBody`, zh-Hans / en / ms).
- Test: `supabase/tests/ride_block.test.sql` (17). Before the migration 8 failed (the ended memberships, the freed seats,
  the events, no hidden no-show at 出发, the organiser still listing a member blocked after 出发); the after-出发 guards
  (status unchanged, appeal, confirmation, 到了, split, payments) pass both before and after by design.
  `rides_schema.test.sql` now expects the withdrawal its fixture block writes.
- `supabase test db` (isolated, `db-isolated.sh ride-block 567`) → 35 files, 1361 tests, PASS.

### Notes for step 6

- `ride_detail` has no payment fields yet: add the split, shares, receipt and paid states there (or call
  `ride_paid_states`) and render 到了 · 分车费 / 结清 in `detail/DetailBody.tsx`; `footer()` in `detailModel.ts` returns
  `none` after 出发, which is where 「到了 · 分车费」 and 「付给小林 RM x」 go.
- `timeline()` already marks 到了 and 结清 from `reachedAt` and `settledAt`; the 结清 step body is in `Timeline.tsx`.
- Writes go through `store.act` (no replay, reload after a typed rejection); drafts through `detail/drafts.ts`.

## Implementation Record (2026-11-02, step 6)

PR: https://github.com/sudongyuer/tapiro/pull/53 (`feat/carpool-settle`). Status stays `approved`: step 7 and the milestone remain.

### What was built

- Server (`supabase/migrations/20261102000900_ride_settle_reads.sql`): `ride_detail` gains `currency`, `settle`
  (total, the organiser's remainder, sent time, receipt path and one row per rider with share and paid status;
  payment id, method, times, proof flag, due-since and the open 「金额不对」 note only for the organiser and that rider),
  `myShare` and the viewer's ride `sticker`; settle and share go only to the organiser and boarded members.
  `my_rides` gains `currency`, `myShare` and `myPaid` for the settled ticket. `sticker_book` and `settled_cards` no
  longer inner-join `payments`: ride stickers reach the book (rider's counterpart is the organiser, the organiser's is
  the earliest rider who shared the fare) and a rider's settled card carries their own settled payment; a Grab-split
  ride has no settled card. `change_ride_share` now locks the payment before reading its state. `close_ride` gives no
  sticker to a member whose appeal was confirmed after the split (no share), as the steps 1–3 record said.
- Receipt cleanup: `payment-proof-cleanup` sweeps a list of buckets; `ride-receipts` runs through
  `ride_receipts_to_delete` / `clear_ride_receipt` with the existing daily cron. Nothing was deployed.
- Client (`src/features/ride/detail/`): 到了 · 分车费 for the organiser only and 「等小林分车费」 for riders (210 A); the
  split half sheet with the Grab total, the optional receipt, the organiser's remainder row, one editable row per rider
  and the 「多出的 RM 0.10 归你」 footer, sending blocked while the others exceed the total (211 A, 212 B, 220 A;
  `splitDraft.ts`); the draft and an uploaded receipt path are kept per ride across failures and reused on retry.
  The rider's 「付给小林 RM x」 and 金额不对 (note sheet → `dispute_ride_share`); the organiser sees the note on that row with
  改金额 (`change_ride_share`, due payments only) (213 A, carried rule). The 结清 step: the receipt row (full-screen viewer),
  the organiser's rows with method, time, 有截图, 看截图 / 还没收到 / 已收到 and the Tapiro reminder footnote (214 A, 216 A);
  riders see each rider's 已付 / 还没付 (215 A); the owing card 「已欠 n 天」 (216 A). A Grab-split ride settles at 到了
  (217 A). The settled ticket carries the 已结清 stamp (the step 5 stamp motion, reused) and 你付了; the sticker card
  offers 收进贴纸本 (`collect_sticker`); the organiser's last 已收到 plays the built celebration once (218 A). The list's
  settled ticket shows the share with 你付了 / 你出 (219 A).
- Payment (`src/features/payment/`): the pay sheet is titled 拼车 for ride payments; a ride payment celebrates only the
  settle that closes the ride (`celebratesSettle`), so a payee who confirms from the pay sheet also celebrates once;
  `useSettleCelebration` is exported for the ride route, which composes it (features do not import each other). The
  verify payment fixture holds three ride payments and earns one ride sticker at the last settle, not one per payment.
- Copy: `rideSettle.*` in zh-Hans, en and ms; `pay.sheet.titleRide`; `ride.detail.errors.noPayee`.
- Verify: scenes `reach`, `reachRider`, `reachGrab`, `paying`, `paidSome`, `paidSomeRider`, `owing`, `settled`,
  `settledOrganiser`, `grabSettled`, `settleWorst` (6 riders, 40-character names, RM 1,000.00), `settleCny`
  (¥1,600.00), `settleOne` (`-uiVerifyRideDetail`), `-uiVerifyRideDetailFail receipt`, list `-uiVerifyRides settled`.

### Deviations from the design

| Design said | Shipped | Why | Confirmed by |
| --- | --- | --- | --- |
| 「发给阿明和小雅」 as a black button under the rows | The sheet's toolbar confirm reads 「发给 n 人」; the names are in the footer | Native sheet pattern of the boarding sheet (step 5) | not intent-changing |
| The home card reminds the organiser to press 到了 (210 A) | Not built | No ride live source on home yet (step 5 record) | not intent-changing |
| 「Tapiro 今天 07:26 提醒过你」 on the owing card | The card says when Tapiro reminds (24 h, 72 h) and the publishing pause | Reminders are scheduled in step 7; the card shows no reminder that was not sent | not intent-changing |
| 已收到 for a due payment when the organiser takes cash | 已收到 shows only once the rider said paid | The detail does not know the organiser's methods; the pay sheet still offers cash confirmation | not intent-changing |
| Riders see each other's paid status | Riders see 已付 for marked-paid and settled alike, without method or time | Least exposure that still answers 215 A | not intent-changing |
| The 到了 step is 「现在」 once the car leaves | `timeline()` marks 到了 as now from 出发 (was 上车) | RideSettle1 draws 「现在 · 到了？」 at 07:24 | not intent-changing |
| Organiser's ride sticker names the riders (「和小林、阿明」) | The book names one counterpart: the earliest rider | The sticker label has one name slot | not intent-changing |
| A Grab-split rider collects from the home settled card | Collected from the ride detail; no home card | A Grab-split ride has no payment amount for the card | not intent-changing |

### Verification

- `supabase test db` on an isolated stack (`scripts/db-isolated.sh carpool-settle 568`) → 36 files, 1408 tests, PASS.
  Without the new migration (`settle-before 569`), `ride_settle_reads.test.sql` failed 17 of its first 33 tests (settle
  block, paid status, share, 金额不对 note, sticker book, settled card, ride sticker) and aborted at `collect_sticker`; the
  late-boarder sticker rule was not reached there and fails by inspection of the old `close_ride`. 「A share marked paid
  no longer changes」 passes before too: the race it fixes (an edit waiting on the payment row while 我已付款 commits)
  needs two sessions, which pgTAP cannot run.
- `bun test` → 1692 pass, 4 fail (the known `scripts/check-file-size.test.ts` cases inside `.claude/worktrees`);
  `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`, `bun run check:size`,
  `node scripts/design-check.mjs`, `node scripts/check-specs.mjs --dir docs/specs`, `node scripts/check-story-map.mjs` →
  exit 0.
- `bun run verify:build` and `bun run verify:smoke` (4 cases) → pass. `ride_settle_split` and `ride_settled` in zh-Hans
  light → pass; screenshots match RideSettle1 210 A (车上 ticket, 「到了？」, one bottom button), 211 A (half sheet,
  RM 24.70 / 24.70 / your RM 24.60, 「多出的 RM 0.10 归你」), 214 A (0/2 人的钱收到了, receipt row, rows) and 218 A (stamp,
  你付了 RM 24.70, sticker card, 收进贴纸本).
- Written, not run (Pace: after step 7): `ride_settle_pay`, `ride_settle_rows`, `ride_settle_owing`, `ride_settle_grab`,
  `ride_settle_worst`, `ride_list_settled`; `ride_meetup_depart` now expects 车上 after 出发.
- Not run: `test:stack` (Edge runtime on the shared stack); the cleanup function was not deployed or invoked.

### Notes for step 7

- Owed state for reminders: `ride_detail.settle.riders[].dueSince` (the payment's `created_at`) and `paid`; the
  24 h / 72 h schedule and the 7-day publishing block come from the foundation payment rules. `owedDays` in
  `detail/settleModel.ts` is the client's day count.
- The owing card copy (`rideSettle.owe.body`) describes reminders only; when step 7 records a sent reminder, add its time.
- The organiser's 到了 reminder on the home card (210 A) waits for the ride live source.

### Review of PR 53

Fixed on the same branch; each fix has a test that fails before it unless noted.

- **Stale amounts on send.** The split sheet and 改金额 now read every field with `sync()` on confirm, as the other
  sheets do; a split that no longer validates after the sync stays open. `syncedDraft` (`detail/splitDraft.ts`) merges
  the typed text; unit `sending reads the fields as typed`. The component wiring itself has no failing-first test:
  `bun test` cannot render the SwiftUI fields.
- **`mark_payment_paid` names the amount** (`supabase/migrations/20261102001000_ride_settle_review.sql`): the payer
  passes `expected_minor`; a different amount is refused with `amount_changed` (55000, not a retryable code). The pay
  sheet shows 「金额变了，请重新确认」 and reloads, never retrying. Bounty and ride callers pass the amount they show;
  bounty behaviour is otherwise unchanged (`payments`, `money` and `stickers` pgTAP files updated to pass it).
  pgTAP `ride_settle_review.test.sql`; unit `sends the amount the payer saw and maps a changed amount to a typed error`.
- **`ride_paid_states` dropped**: it leaked each rider's method and settle time; nothing used it. pgTAP
  `ride_settle.test.sql` (`hasnt_function`).
- **Settled list ticket.** 你付了 only when the server says paid or settled, 你要付 when due, the estimate wording when
  the state is missing or unknown; VoiceOver reads 「你付了 RM x」. Unit `ticketShare.test.ts`.
- **Grab label.** A Tapiro ride the organiser rode alone is no longer labelled 在 Grab 里分. Unit `settleTicketView.test.ts`.
- **Receipt after cleanup.** Before a retry reuses an uploaded receipt, the app checks the object still exists; if the
  cleanup removed it, the draft drops it and the sheet says 「截图已过期，请重新附上」; nothing is re-uploaded by itself.
  `detail/receiptPrep.ts`, unit `receiptPrep.test.ts` (the reuse-without-check logic it replaces returned the stale path).
- **Decimal separator.** `parseEstimate` reads the device's decimal separator (`expo-localization` `decimalSeparator`,
  `src/lib/deviceDecimal.ts`) and rejects anything else, grouping commas and spaces included, instead of stripping them.
  Unit `the device decimal separator`; `validate.test.ts` now expects 「1,000」 to be refused.
- **Appeal after a close without a split** (231 A): a trigger on `ride_members` gives an appeal confirmed after a
  Grab-split or lone close the appellant's car sticker, and the organiser theirs if they had none; one per (owner,
  ride). pgTAP `ride_appeal_sticker.test.sql` (2 of 4 fail before).
- **Motion ★1 (sticker flying into the book from the detail) and ★2 (a row animating from 已付 to 已收到): no motion.**
  Settling is rare and the static states read clearly. ★ by default, owner may veto.

Verification after the review: `supabase test db` (isolated, `db-isolated.sh carpool-settle 568`) → 38 files, 1417
tests, PASS; without `20261102001000_ride_settle_review.sql` the amount checks, the dropped read and the appeal
stickers fail. `bun test` → 1704 pass, 4 fail (the known worktree `check-file-size` cases); `tsc`, `lint:changed`,
`format:check`, `check:size`, `design-check`, `check-specs`, `check-story-map` → exit 0. `verify:build`, then
`ride_settle_split` → pass and `ride_settled` → pass on a rerun (the first run's UI read 已收进贴纸本 but the call log
plist lagged past 10 s; see the retro).

## Implementation Record (2026-11-03, step 7)

PR: pending (`feat/carpool-reminders`). Status stays `approved`: the carpool milestone (UI run and walkthrough) remains.

### What was built

- Server (`supabase/migrations/20261102001100_ride_event_outbox.sql`): the realtime spec's outbox `public.events`
  (recipient, kind, subject, push, `push_error`) with the push flag per kind in `private.event_kinds`; no client access.
  An `after insert` trigger on `ride_events` fans every ride transition out to its recipients in the same transaction:
  join request → organiser; approve, decline → the requester; withdraw, leave → organiser; cancel, revised time →
  accepted members and applicants; 集合, 我到了 / undo / 晚到 (`ride.arrival`), 车牌, 车费怎么分 → organiser and accepted
  members; 出发, 到了, split, receipt, settled, appeal → boarded members; no-show, appeal confirmed or lapsed, share changed →
  that member; 金额不对 → organiser; the actor is never told of their own action. A trigger on ride `payments` adds
  `payment.marked_paid` (payee), `payment.not_received` (payer) and `payment.settled` (payer, the n−1 settles).
  Push (170 A, must act or waiting): requested, approved, declined, cancelled, time revised, no-show, appealed, split
  sent, 金额不对, share changed, marked paid, not received. Live only: the rest, including 我到了.
- The recording sender: `public.push_recordings`, one row per push event with `thread_id` `ride:<id>` (grouped per ride)
  and `send_at`; between 23:00 and 08:00 Malaysia time a push is held until 08:00 (`quiet`), except for a ride in
  `gathering` or `departed` (the ride you are on). `delete_old_events()` with the daily cron `events-cleanup-daily`
  removes events after 7 days. `my_rides` gains `myDueSince` (the rider's own due payment) and `eta` (accepted and
  boarded members). Nothing was deployed or pushed to the hosted project.
- Local reminders (173 A, `src/features/ride/reminders/`): stable identifiers `ride:<id>:<kind>`:
  - `meetup` at T-30 (集合 starts) for the organiser and accepted members of an open or gathering ride;
  - `goOrCancel` at T-15 for the organiser while seats are empty (the carried 「照常走还是取消」 rule);
  - `arrive` at the typed 预计到 for the organiser of a departed ride (the 到了 reminder; none without 预计到);
  - `pay24` and `pay72` for a boarded rider whose payment is `due`, 24 h and 72 h after the split, moved out of quiet
    hours to 08:00.
  `planReminders` computes them from the server's data only; `noticeDiff` (`src/lib/notifications/reconcile.ts`)
  cancels what is no longer wanted, reschedules a changed time or copy under the same identifier and never schedules a
  time already past. Reconciled from `my_rides` on sign-in, on every foreground and after the first publish or
  request; from `ride_detail` on every fresh detail load (a revised time, leave, cancel, block, settle or
  `ride_not_found` cancels or moves that ride's reminders); a detail read after a `my_rides` read wins for that ride.
  Sign-out and account deletion cancel every ride reminder and clear the ledger. Copy in `rideReminders.*`
  (zh-Hans, en, ms), in the app language at scheduling time; a language change reschedules on the next sync.
- Permission (`src/lib/notifications/`): provisional authorisation when onboarding finishes (no prompt); the explicit
  prompt once, after the first ride published or the first ride request; provisional is read from `ios.status`
  (AGENTS.md), and reminders are scheduled when allowed or provisional, never when denied or undetermined. A tap on a
  ride reminder opens that ride's detail, from a cold start too (`getLastNotificationResponse`, cleared once handled).
- The owing card (`rideSettle.owe.next` / `.sent`): 「Tapiro 会在明天 10:30 提醒你」 while a pay reminder is scheduled on
  this device, 「Tapiro 今天 10:30 提醒过你」 once its time has passed, else the old general line.
- Native: `expo-notifications` 57.0.24; `plugins/withoutPushEntitlement.js` strips the `aps-environment` entitlement
  the package's auto-applied plugin adds, which a free team cannot sign (as for Sign in with Apple). Verify mode
  replaces permission and scheduling at the boundary (`-uiVerifyNotifications allowed|provisional|denied|undetermined`,
  pending reminders in `uiVerifyScheduledNotices`).

### Deviations from the design

| Design said | Shipped | Why | Confirmed by |
| --- | --- | --- | --- |
| `notify` Edge Function with a `RecordingSender` reads `push_tokens` and writes a table | A trigger on `events` writes `push_recordings` with the thread and the quiet-hours hold; no `push_tokens`, no copy yet | Delivery waits on the Apple account; the account half's `ExpoSender` can drain the same rows. The row holds kind and ids only, so copy is built at send time in the recipient's language | not intent-changing |
| Each transition inserts its events | One trigger on `ride_events` (every ride RPC already logs there) and one on ride payments; same transaction | No RPC had to be rewritten; recipients come from `ride_members` at that moment | not intent-changing |
| Events also feed Broadcast (`realtime.send`) | No send trigger | The live layer is not built (status queue item 2) | not intent-changing |
| (not listed) push for 车牌 and 集合 changes | Live only; 集合 itself is the local `meetup` reminder | 170 A pushes only must-act and waiting; a server push at T-30 would duplicate the local one | not intent-changing |
| (not listed) events for a membership ended by a block or an account deletion | None | Telling either side would reveal the block | not intent-changing |
| The home card reminds the organiser to press 到了 (210 A) | A local reminder at the typed 预计到; the home card reminder is still not built | The home card waits for the ride live source; without 预计到 there is no time to remind at | not intent-changing |
| 「Tapiro 今天 07:26 提醒过你」 | 「提醒过你」 only for a reminder this device scheduled whose time has passed; 「会在…提醒你」 for the next one | A local notification gives no delivery receipt; the card never names a reminder that was not scheduled | not intent-changing |
| Reminders for 还没收到 (foundation `reminderDue` covers `due` only) | Local reminders only for `due`; 还没收到 records a `payment.not_received` push | Same rule as `src/lib/unpaid.ts` | not intent-changing |

### Verification

- See the PR body for the run on this branch (pgTAP on an isolated stack, unit tests, UI build, smoke and
  `ride_settle_owing`).

### Known limits

- Reminders are scheduled from what this device last read. A ride approved, revised or filled while the app stays in
  the background keeps its old reminders until the next foreground or detail load; the T-15 prompt can then fire for a
  ride that filled meanwhile. Server pushes for those events arrive with the Apple account.
- 「提醒过你」 assumes the system delivered the scheduled reminder; notifications switched off in Settings after
  scheduling are not detected until the next sync.
- The explicit prompt is not yet asked after the first bounty post or application; the shared flag
  (`tapiro.notificationsAsked`) is ready for bounty.
