# Carpool (拼车): reference research

Researched 2026-10-31 for the carpool redesign. Round 1 (canvas questions 98–116) was rejected because it skipped
research (memory `research-before-new-area`). Owner's scope for this round: (a) how carpool and trip apps present a
ride, (b) how students carpool today in WeChat groups and 小红书. References: BlaBlaCar, Grab (including GrabShare),
Flighty, the Apple Wallet boarding pass, Citymapper. 滴滴顺风车 and 嘀嗒出行 were deselected and are not used.

What Tapiro's carpool is stays fixed by the spec (`docs/specs/2026-10-11-carpool-design.md`): one organiser books and
pre-pays one Grab, others request to join, the organiser accepts, everyone meets, the organiser ticks who boarded, and
the fare is split equally. No driver offering seats, no booking Grab from Tapiro.

Sources and method:

- App metadata and screenshots: iTunes Lookup API (`https://itunes.apple.com/lookup?id=<id>&country=<cc>`), fetched
  2026-10-31. Screenshots are marketing frames, so they may differ from the live UI. Statements marked **(observed)**
  describe those frames.
- Other facts come from the cited pages. Where only a secondary source exists, it says so.
- Canvas board: https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o, page 「05r 拼车」, 「拼车 · 参考调研（BlaBlaCar、Grab、
  Flighty、Wallet、Citymapper、微信群）· 第 176–179 题」 (`RideResearch.dc.html`, x 0, y 260, 7360 × 2000).

## 1. References

### 1.1 BlaBlaCar: the ride as a timetable row

- App: BlaBlaCar: Carpooling and Bus, id 341329033, version 6.36.0 (2026-10-26), 4.68 from about 440k ratings (FR
  store). https://apps.apple.com/gb/app/id341329033
- Model: drivers offer empty seats and set a price per seat; passengers book a seat. The UK listing: "Share your empty
  seats in minutes and reduce your fuel and toll costs. You're in charge: choose who travels with you by checking
  ratings and member Verified Profiles." (App Store description, gb.)
- Ride card (observed, screenshots 2 and 5): a time column (departure over arrival, duration in grey under the
  departure), a thin vertical line with two hollow dots joining the two city names, the price top right in large
  type, and a footer row with the driver's avatar, first name, ★ rating and small icons (instant booking, max two in
  the back). Cards are grouped under a day heading ("Today").
- Publish flow (observed, screenshot 3): one question per screen. "Set your price per seat" shows one huge number
  with − and + buttons and a green "Recommended price: 30€–38€" tag, then "Similar rides" below as social proof.
- Trust (observed, screenshot 5): "Ride safe with Verified Profiles" banner; a check badge on the avatar.
- Booking modes: rides are either instant or "request" (driver approves). Only third-party sources describe this
  (https://twomonkeystravelgroup.com/how-to-use-blablacar-carpooling-europe/,
  https://www.pilotplans.com/blog/blablacar-review); the official help centre did not render (see Unreachable).

Borrow:

- The time–line–place block: two times, two dots, one line, two bold place names. It reads in one glance and is
  already the convention for "a trip from A to B at time T". It fits the spec's 2-line limit for place labels
  (KICKOFF 2026-10-14 ④).
- Day headings in the list ("今天", "明天", "周五").
- The one-big-number price screen with a recommended range. For Tapiro the number is the per-person estimate, and the
  range could come from past rides on the same route (later; needs data).
- Avatar + name + rating in a footer row; Tapiro's tier (新朋友 / 靠谱 / 很靠谱 / 貘友) takes the rating's place.

Do not borrow:

- Price per seat set by a driver: Tapiro has no driver and splits a real Grab fare afterwards. Show an estimate, never
  a price that sounds like a ticket.
- BlaBlaCar's saturated brand blue and its intercity, bus-and-train comparison layer. Tapiro trips are 15–60 min.
- Instant booking: the owner chose "organiser accepts" (C1).

### 1.2 Grab: Group Ride already does invite + split (and GrabShare is gone)

- App: Grab, id 647268330, version 5.432.0 (2026-10-13), 4.73 from about 900k ratings (MY store).
  https://apps.apple.com/my/app/id647268330
- **GrabShare**: launched in Malaysia in February 2017 as on-demand carpooling
  (https://soyacincau.com/2017/02/16/grabshare-rolls-out-in-malaysia-carpooling-made-easier/). On 8 April 2019 Grab
  scaled it down to 4 pm–12 am and called it "disabled for time being for improvement purposes"
  (https://hype.my/2019/166531/grabshare-statement-grab-malaysia). Grab Malaysia's transport page today lists
  Standard, Standard Plus, Standard 6 seats, Premium, Exec, Taxi, Taxi 6 seats and Rent; no GrabShare or shared
  ride type (https://www.grab.com/my/transport/, fetched 2026-10-31). So GrabShare does not exist in Malaysia today.
- **Group Ride** is the current product, and it is the most important finding of this research:
  - Grab Malaysia announced it nationwide on 8 May 2026 with the Transport Minister
    (https://www.grab.com/my/zh/press/others/groupridelaunch/,
    https://www.malaymail.com/news/malaysia/2026/05/08/grab-rolls-out-group-ride-feature-nationwide-as-govt-pushes-smarter-commuting/219202).
    Kuala Lumpur is listed among the cities (https://www.grab.com/inside-grab/stories/grabx-group-ride-save-fares/).
  - Flow (Grab's own story page): tap the Group Ride widget → host picks **Same pickup** or **Same drop-off** → host
    enters the first pickup and drop-off → host shares an invite link through a messaging app → invitees wait in a
    virtual waiting room → each adds their stop and marks ready → host books → fares are split automatically.
  - Split (observed, Grab's images): "Host pays for everyone", "Split fare equally", "Split fare by route"; both
    splits are tagged "Cashless payment only". The payment details screen lists each person's share. The waiting
    screen says "Add 3 friends to the ride, get 10% off" and the car type shows 4 seats.
  - Rules (Lowyat, 2026-03-03, https://www.lowyat.net/2026/384949/grab-group-ride-malaysia/): only the host can
    cancel; the host pays tolls and waiting fees; if a member's payment fails, the host is charged that share and a
    yellow alert appears in the Group Ride summary. Lowyat said distance split was not yet available in March;
    Grab's later images show it.
  - Grab claims savings of up to 40% versus separate rides (press release). China Press frames the old pain in
    Chinese: "有人忘了转账，最后往往容易变成尴尬场面" (https://www.chinapress.com.my/?p=4994658).
- Ride in progress (observed, store screenshot 2): a map with the route, a "Driver is on the way · 4 min" line, then
  the plate number in large type, the car model and colour, the driver's name and rating, and a chat row.

Borrow:

- **Same pickup / Same drop-off** as the first choice when creating a ride. It matches how students talk ("从双威一起去
  机场" versus "大家从各处回 YC"), and it is the field the spec does not have yet.
- The waiting-room idea: members appear as they join and turn "ready". It maps to the spec's 集合 phase and 「我到了」.
- The per-person share list on one screen, host labelled.
- The plate-first layout for the moment the car arrives: the organiser can paste or type the plate so everyone
  looks for the same car (not in the spec; a candidate).

Do not borrow:

- Map-first screens. The spec keeps the ride list off the map, and the route card is a picture, not a route.
- Booking and payment inside the flow: Tapiro cannot book Grab (spec, Don't do).
- Promotional strips and Grab's green.

What Group Ride means for Tapiro (question 177):

- It removes "算钱催钱" for groups that already know each other and all pay cashless in Grab.
- It does not help with **凑人** (finding strangers going the same way): the link goes only to people you already
  message. It has no reputation, no Chinese-first copy, no cash or Alipay/WeChat Pay settlement, and the host still
  carries failed payments.
- So Tapiro's carpool is strongest at finding and gathering people; the split can either stay (spec) or step aside
  when the group split in Grab.

### 1.3 Flighty: one status sentence, then the facts

- App: Flighty – Live Flight Tracker, id 1358823008, version 4.11.3 (2026-10-26), 4.85 from about 160k ratings.
  https://apps.apple.com/us/app/id1358823008. Apple Design Award winner 2023 (App Store description and screenshot 1).
- Site wording: "Get gate info, departure times, baggage belts, and booking codes—all at a glance." "Powerful,
  pilot-grade data that you can actually understand." https://www.flighty.com/
- My Flights list (observed, screenshot 2): each flight is a row with the route in words ("Tokyo to San Francisco"),
  a small status line ("Landing in 3h 30m"), and two time chips with coloured dots (green on time, orange late).
- Live Activity (observed, screenshot 3): SFO 11:00AM ✈ 12:00PM JFK on one line, then a bar with "1h 20m until
  gate arrival"; in the Dynamic Island "Departs Gate in 45m".
- Alerts (observed, screenshot 7): one plain sentence each, e.g. "AUS → JFK · Departed Gate. Taxiing for 13m, for take
  off at 5:34PM."
- Flight detail (observed, screenshot 8): the headline is a countdown sentence ("Gate Departure in 1h 42m"), then two
  blocks, departure and arrival, each with a big time, an on-time/late line and a terminal/gate chip.
- Friends (observed, screenshot 6): a shared list of friends' flights with avatars.
- A Hacker News comment criticises red text for a one-minute delay (https://hn.nuxt.dev/item/47511589); secondary.

Borrow:

- **A status sentence as the headline** of the ride detail and the live card: 「还差 1 人 · 14:30 出发」, 「集合中 · 还有
  12 分钟」, 「已上车 · 预计 15:10 到」, 「到了 · 等阿明分车费」. This is the spec's four phases written as one line.
- The countdown bar for the 集合 phase and the later Live Activity.
- Revised times shown with the old time struck through and the new one coloured: Flighty does this for delays and the
  spec already wants it (bounty 59B).
- Plain-sentence notifications.

Do not borrow:

- The dark, data-dense "pilot-grade" look: maps, globes, many chips. Tapiro's chrome is iOS system UI with stickers.
- Red for small delays; Tapiro's status is colour plus shape and never alarms over a few minutes.

### 1.4 Apple Wallet boarding pass (iOS 26): the trip as a ticket

- Apple: "Refreshed boarding passes in Wallet offer the ability to see and share Live Activities for real-time
  updates on a flight", with "Maps to navigate airports, Find My to track important items and report missing bags".
  https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/
- Boarding pass (observed, newsroom image): airline mark and flight number top; two huge airport codes (JFK ✈ LAX)
  with city names above and times below; passenger name; a row of small labelled fields (BOARDS 9:15 AM · TERM 4 ·
  GATE B30 · GROUP 3 · SEAT 30C); QR code; then "Share Flight Tracker" and two action tiles ("Go to Terminal 4 · Open
  in Maps", "Track Luggage · Open in Find My").
- Live Activity (observed, newsroom image): airline, flight number, SJC ━●┄ DAL with a progress dot, "Updated 30 min
  ago", and three fields (ARRIVAL TERM, ARRIVAL GATE, BAG CLAIM).
- The Live Activity is opt-in and shared trackers hide seat and boarding group (9to5Mac, secondary:
  https://9to5mac.com/2025/09/02/ios-26-gives-boarding-passes-three-new-features-for-your-next-flight/).

Borrow:

- **Big from → to as the hero**, with short names (双威 → KLIA2). A short label per place is what makes it scannable;
  Tapiro place labels are up to 80 characters, so the ticket needs a short name field or a truncation rule.
- **A row of small labelled fields** for the facts members need at the meeting point: 集合点 · 时间 · 座位 · 每人约.
  It is the same idea as GATE / BOARDS / SEAT.
- The action tiles under the pass: 「导航到集合点」 (opens Apple Maps) and 「打开 Grab」.
- "Updated N min ago" on the live surface: matches the realtime spec's freshness rule (question 172).
- One colour block per ticket: Tapiro's 椰糖杏 `--color-ride` can be that block.

Do not borrow:

- A QR code or any imitation of Wallet's pass chrome (AGENTS.md: never imitate a control the platform provides).
  The ticket idea is borrowed; Wallet's look is not.
- Adding rides to Wallet as a real pass: needs a pass-type certificate and server signing, and adds nothing the Live
  Activity will not give later.

### 1.5 Citymapper: the journey as a vertical timeline

- App: Citymapper: Your Transport App, id 469463298, version 11.53.1 (2026-10-29), 4.80 from about 278k ratings (GB).
  https://apps.apple.com/gb/app/id469463298
- Description: "Live wait times and ETA so you'll never miss a bus, train or tram again ... get alerted when it's
  time to get off".
- Route detail (observed, screenshot 4): a map on top, then "Leave within 2 min · Arrive 17:04", then steps (walk to
  Holborn, Central line) with a large "in 6 min" bubble for the next departure.
- Get off now (observed, screenshot 5): a vertical line of stops with a dot for each, the current position on the
  line, and a big "Get off now" alert.
- Compare (observed, screenshot 3): every mode in one list with minutes in large type and prices small.
- A mascot and line illustrations carry the brand around a plain functional UI (observed, all screenshots), close to
  Tapiro's "system UI + stickers at the moments that matter".

Borrow:

- **"Leave within N min"**: the action-first phrasing for the member side of 集合 (「5 分钟内出门」).
- **A vertical step line for the ride's phases** (发起 → 凑齐 → 集合 → 上车 → 到了 → 结清) with the current step marked.
  It shows where the ride is and what comes next, which the round-1 boards did not.
- Members as dots on that line at 集合 (who has tapped 「我到了」).

Do not borrow:

- Turn-by-turn and live vehicle tracking: Tapiro uses no live location (spec).
- Citymapper's green and its comic register; Tapiro's illustration voice is the step 9 crayon set.

## 2. WeChat groups and 小红书 today

### 2.1 What could and could not be reached

- 小红书 search results need the web app's JavaScript and a session; the fetched page had no posts
  (`https://www.xiaohongshu.com/search_result/?keyword=马来西亚 拼车`). Web searches in Chinese and English returned no
  indexed 小红书 or WeChat carpool posts for KLIA, Sunway, Cyberjaya, 回国 or festival trips.
- WeChat groups are closed by design. No public archive exists.
- So the post anatomy below is a **composite** built from the founder's own case, the spec, and the third-party
  sources cited; it is not a quoted post. Question 178 asks the owner for 3–5 real screenshots to replace it.

### 2.2 Evidence that exists

- Founder (KICKOFF 2026-10-06, verbatim): "下课或者上课……谁下午一起回YC……打Grab……大家就在微信群转帐给他"; "对，只是
  一起打车平摊". Pain points selected: 凑人、集合、算钱催钱、不给钱 (all four).
- APRide, an independent carpool product for APU (Bukit Jalil) students
  (https://apride.net/zh/guides/apu-pinche-qun-zenme-zhao, product's own guide, secondary):
  - Three channels today: open social groups ("谁都能进", identity unverified, posts sink), semi-closed dorm, course
    and hometown groups (people are "半个熟人", but no-shows and last-minute changes rely on goodwill), and verified
    closed communities.
  - What must be agreed before leaving: pick-up point, rough route, how costs are shared, rules for lateness and
    cancelling.
  - Its pick-up points are fixed (APU campus, Bukit Jalil station, Fortune Park) and **KLIA is excluded**; it does not
    handle money ("平台不碰钱、同伴先约定"). English-only UI, which it admits is a barrier for new students.
  - Price: free tier with 2 active posts; Premium RM 9.90/month.
- China Press on Group Ride: "有人忘了转账，最后往往容易变成尴尬场面" (https://www.chinapress.com.my/?p=4994658).

### 2.3 Composite post anatomy

A typical 求拼车 message, reconstructed from the fields above:

```
【拼车】今天 15:30 双威 Sunway Geo → KLIA2
还差 2 人（现在 2 人）
Grab 大概 RM70，平摊每人 ~RM18
有 1 个大箱子 / 航班 18:50 AK…
集合：Geo 大堂 Grab 上车点
有意私聊 / 接龙 +1
```

Fields that appear in every version: time (often relative: 今天/明天/下午), from and to (short local names: 双威, Geo,
YC, KLIA2, Pavilion, Cyberjaya), how many still needed, and an approximate per-person price. Fields that appear for
airport and 回国 trips: luggage and flight time. Joining is a reply, a private message or a 接龙 line.

### 2.4 Typical prices

Only airport fares have sources; no source was found for short campus trips or festival trips, so none are quoted.

| Route                               | Fare                                       | Source                                                                                          |
| ----------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| KL city centre ↔ KLIA2, about 55 km | RM 65–100, about 50 min                    | Grab: https://www.grab.com/global/airport-rides/klia2-kuala-lumpur-international-airport-2/     |
| Sunway University → KLIA            | RM 60–80; RM 80–100 at peak or late        | Secondary: https://unchartedlens.com/routes/malaysia/sunway-university-to-kuala-lumpur-airport/ |
| KLIA → city, JustGrab               | RM 65 base plus about RM 10 toll, or RM 88 | Forum users: https://www.bbkz.com/forum/showthread.php?t=10585691                               |

Split four ways, an airport run costs about RM 16–25 each. Group Ride claims up to 40% savings versus separate rides.

### 2.5 Where it breaks down

1. **Posts sink.** In a busy group a request is buried in minutes; people repost or give up (APRide: "信息容易沉底").
2. **Unverified strangers** in open groups; no record of who flakes (APRide).
3. **No-shows and last-minute changes** rest on goodwill, even among "半个熟人" (APRide). Spec answer: the 15-minute
   rule and boarding ticks.
4. **Meeting up**: the pick-up point is a free-text line; large malls and campuses have several entrances. Grab's own
   KLIA2 pick-up is "Level 1, Door 5", which a post rarely states.
5. **Money afterwards**: the organiser pays, then chases transfers; "有人忘了转账" (China Press; founder's case).
6. **Airport and 回国 trips carry extra constraints** (luggage, flight time, late-night surge) that a short message
   does not capture, and APRide excludes KLIA entirely.

## 3. Candidate directions

### A. 群帖卡片 (the post, structured)

The list looks like a cleaned-up group: day headings, and each ride is a card with BlaBlaCar's time–line–place block,
「还差 N 人」 as empty avatar slots, the per-person estimate on the right and the organiser's tier in the footer. The
detail is a plain iOS grouped list. Trade-off: the most familiar and cheapest to build, and it reads like what
students already post; but it is the closest to round 1 and gives carpool little identity beyond the colour.

### B. 车票 (each ride is a ticket)

Each ride is a 椰糖杏 ticket: short from → to names large (双威 → KLIA2), the time, and a row of small labelled fields
(集合点 · 座位 · 每人约), borrowed from the boarding pass. The same ticket shrinks into the home live card and later
the Live Activity, and its top line carries a Flighty-style status sentence (「还差 1 人」 → 「集合中 · 12 分钟」 →
「已上车」 → 「到了 · 分车费」). Trade-off: a strong, consistent identity across list, home and lock screen, and it fits
the crayon stickers as stamps on the ticket; but it needs a short place name (≤ 8 characters) next to the full label,
and a ticket must not drift into imitating Wallet.

### C. 时间线 (the journey line)

The detail is built around a Citymapper-style vertical line of phases (发起 → 凑齐 → 集合 → 上车 → 到了 → 结清), with the
current step expanded: members as dots arriving at the meeting point, 「5 分钟内出门」, the revised time struck
through. The list stays plain (as A). Trade-off: the clearest answer to 集合 and "what happens next", the two pain
points the founder named; but the list itself stays generic, and the line is only rich once a ride is under way.

### D. 群聊里的拼车 (the ride lives in chat)

The ride is a pinned card at the top of its group chat, like Airtasker's task chip, and coordination happens in the
chat. Trade-off: closest to WeChat habits; but chat arrives with foundation step 7, so v1 would ship without its
centre, and a chat-first design hides the list where 凑人 happens.

### Recommendation

**B for the card, with C's line inside the detail.** The ticket gives carpool its own face on the list, the home stack
and the later Live Activity with one component, and the phase line answers 集合 and "what next". A's list remains the
fallback if the ticket does not test well at the 2-line place limit. D waits for chat.

## 4. Questions for the owner

Answered: **176 B** (user, 2026-10-31, after the drawn comparison board 「拼车 · 方向 A/B/C 对比 · 第 176 题」 on
p05r at x 7440, y 260).

Answered: **177 B**, **178 B**, **179 A** (user, 2026-10-31 to 2026-11-02). Tapiro splits the fare by default and the
organiser can tick 「车费已在 Grab 里分好」, which skips the split and only records who boarded. The redesign goes on with
the composite WeChat-post sample; there are no real screenshots. Daily short trips (回宿舍, 去商场, 回 YC) come first;
the airport adds optional fields (flight time, large luggage); holiday long-haul is not designed now.

Answered for screen ① (the list): **180 B**, **181 A**, **182 B**, **183 B**, **184 A**, **185 A** (user, 2026-11-02,
all recommended options, after the board 「拼车 · ① 列表」 on p05r at x 9400, y 260).

- 180 B: a compact ticket with a stub on the right showing 每人约 and seats.
- 181 A: one list with two sections, 我的拼车 then 可以加入.
- 182 B: no filter chips; day subheadings 今天 / 明天, and an airport ticket carries its own marker.
- 183 B: airport info as one icon line, 「✈ 航班 09:10 起飞 · 🧳 2 件大行李」.
- 184 A: 发起拼车 is the nav-bar ＋.
- 185 A: the empty state is a moment screen (speckled background, big car sticker, one line, black 发起拼车 button), with
  the ＋ hidden.

Defaults drawn on the same board and not objected to: the large title 「拼车」; a full ride uses the neutral card colour
with 「已满」 and a crossed-circle icon; urgent red plus a clock for 「8 分钟后出发」; the warning colour plus an
exclamation mark for 「我发起的 · 1 人申请」.

182 B contradicts the quick-filter chips in `docs/specs/2026-10-11-carpool-design.md` (拼车 tab, "Who sees a ride",
risks and step 3–4). The spec is not edited now; a superseding carpool spec will be written once the screens are
settled.

Answered for screen ② (the detail): **186 A**, **187 A**, **188 A**, **189 A**, **190 A**, **191 A**, **192 A** (user,
2026-11-02, 「都按推荐」, after the board 「拼车 · ② 详情（车票 + 时间线）」 on p05r at x 11440, y 260).

- 186 A: the full ticket scrolls away with the content, and the nav bar then shows 「双威 → KLIA2」.
- 187 A: all six phases are listed (发起 → 凑齐 → 集合 → 上车 → 到了 → 结清) with 「现在」 marked; past phases are
  solid, future ones grey with an estimated time.
- 188 A: a non-member sees the organiser's avatar plus dashed empty seats; members are hidden from non-members.
- 189 A: the organiser handles requests on an application card under the ticket (avatar, 靠谱, the applicant's note,
  拒绝 / 通过).
- 190 A: 「车费怎么分」 is chosen at creation and can be changed in the detail until departure.
- 191 A: an airport ride adds two cells to the ticket, 航班起飞 and 大件行李.
- 192 A: after applying, the ticket carries an 「已申请」 stamp; the bottom shows 「等小林通过」 with 撤回申请.

Defaults drawn on the same board and accepted:

- The primary action changes by role: 申请上车; 我到了 once 集合 starts; the organiser's 「出发 · 勾选谁上了车」.
- List load failure: a failed refresh keeps the last tickets under a yellow 「下面是 22:05 的」 note with 重试; a
  first-load failure shows an error card, with the ＋ still visible.
- Non-members see grey, nameless seats.
- An application may carry a one-line note.

The application note is new: `docs/specs/2026-10-11-carpool-design.md` has no note on a join request. It goes into the
superseding carpool spec, with a length limit, alongside 182 B.

Answered for screen ③ (集合): **193 A**, **194 A**, **195 A**, **196 A**, **197 A**, **198 A**, **199 A** (user,
2026-11-02, 「都按推荐」, after the board 「拼车 · ③ 集合」 on p05r at x 13480, y 260).

- 193 A: at 集合 the ticket turns into a countdown ticket: 「10 分钟后出发」 large, with the cells 集合点 / 车牌 / 到了
  n/4. The timeline expands the 集合 step. It stays the same page.
- 194 A: the 集合 step shows a row of avatars: arrived has a green ring and the time, not arrived is dashed, late is
  yellow.
- 195 A: 我到了 is manual only and can be undone (「你 06:21 到了 · 撤销」). No location is used.
- 196 A: a 晚到 button offers 5 / 10 / 15 分钟 or 不来了…; others see a yellow ring with 「晚到 5 分 · 约 06:35」.
- 197 A: the organiser's 出发 opens a half sheet with everyone who tapped 我到了 pre-ticked; unticked people are shown
  the no-show (放鸽子) consequence and that they can appeal; the confirm reads 「3 人出发」.
- 198 A: a 车牌 cell on the ticket, filled by the organiser after calling the car (「VEN 2381 · 白色 Alza」).
  导航到集合点 is for everyone; 打开 Grab is for the organiser only.
- 199 A: nothing is shown while connected; 「可能不是最新 · 06:19 的」 appears only when disconnected.

Defaults drawn on the same board and accepted: the member's display name 小雅; RM 19 each with 4 riders; the line about
the first no-show in 60 days being waived; 打开 Grab for the organiser only.

Additions to the superseding carpool spec, with the application note and 182 B:

- 晚到: a member can report being late (5, 10 or 15 minutes) or 不来了…; `docs/specs/2026-10-11-carpool-design.md` has
  no late state on `ride_members`.
- 车牌: an optional plate-and-car field on the ride, set by the organiser after booking; the spec's `rides` has none.
- 我到了 can be undone; the spec records `arrived_at` once and says nothing about undoing it.

Answered for screen ④ (发起拼车): **200 A**, **201 A**, **202 A**, **203 A**, **204 A**, **205 A**, **206 A** (user,
2026-11-02, 「都按照推荐」, after the board 「拼车 · ④ 发起拼车」 on p05r, `RideCreate1.dc.html`).

- 200 A: ＋ opens 「去哪儿？」 first: the two most recent routes on top (one tap fills start and destination; only the time
  is left), then the tiles 回住处 / 去学校 / 去商场 / 去机场 / 都不像，直接写; then the form under a live list-style ticket.
- 201 A: the ticket's short name is filled automatically from a table of common place names (Mid Valley Megamall →
  谷中城, Sunway Geo → 双威); other places take the leading part of the name. A line 「票上叫「谷中城」· 自动 · 改」 lets
  the organiser edit it. Search results show the short name too.
- 202 A: a stepper 「一共几人（含你）」, 2–6, default 4, with 「还要 n 人」 under it.
- 203 A: three quick picks (今晚 22:00 / 明早 06:30 / 选时间) plus the system date and time picker; 集合 is fixed at 30
  minutes before departure (「06:00 起集合 · 出发前 30 分钟」) and cannot be edited.
- 204 A: the organiser enters the whole-ride estimate (「全程约 RM 76」); 「4 人平分，每人约 RM 19」 is computed and follows
  the seat count.
- 205 A: the 航班和行李 group (起飞时间, 大件行李 count, 移除) opens automatically when the destination is an airport
  (KLIA, KLIA2, or the 去机场 tile); otherwise it is a collapsed 「＋ 航班和行李」 row.
- 206 A: 下一步 opens a confirm page as for bounties: the list ticket, the 出发 / 集合 / 人数 / 车费 rows, the fee line
  「本月免费 · 还剩 2/3」 and the refund rule, and 「发出去」. Without a payee method the reason is shown and the button
  becomes 「去加收款方式」.

Defaults drawn on the same board and accepted: the ticket above the form keeps a fixed height while typing (bounty
152 A); with 6 people the line reads 「还要 5 人 · 记得叫 6 座的车」; 集合说明 sits under 「加点细节 · 都可以不填」; 车费怎么分
is a system menu defaulting to Tapiro 平分; with the free posts used up the fee line reads 「1 貘币 · 余额 n」.

Answered for screen ⑤ (到了 · 分车费 · 结清): **210 A**, **211 A**, **212 B**, **213 A**, **214 A**, **215 A**, **216 A**,
**217 A**, **218 A**, **219 A** (user, 2026-11-02, 「都按照推荐」, after the board 「拼车 · ⑤ 到了 · 分车费 · 结清」 on p05r,
`RideSettle1.dc.html`).

- 210 A: only the organiser presses 「到了 · 分车费」; the others' tickets read 「等小林分车费」, and the home card reminds
  the organiser.
- 211 A: a half sheet with the Grab total, then one row per boarded person (the organiser's own row first), each amount
  editable; shares round up to 0.10 and the line 「多出的 RM 0.10 归你」 states the organiser keeps the extra.
- 212 B: an optional Grab receipt screenshot (「附 Grab 收据截图 · 可不附」), visible to the riders in the 结清 step and to
  moderators, deleted 30 days after settling, stored as the payment proofs are.
- 213 A: the rider's bottom button 「付给小林 RM 24.70」 with 「金额不对」 to its left opens the built payment sheet, titled
  拼车.
- 214 A: the organiser confirms receipt per person in rows inside the 结清 step (还没收到 / 已收到; 还没付 for riders who
  have not paid).
- 215 A: riders see each other's paid status, one row each.
- 216 A: only Tapiro reminds (24 h / 72 h; publishing paused at 7 days or 2 unpaid); the rider's ticket reads 「RM 24.70
  还欠小林 · 已欠 1 天」 with a yellow notice; the organiser has no nudge button and sees 「Tapiro 会在 72 小时再提醒」.
- 217 A: a ride whose fare was split in Grab settles when the organiser presses 到了: 到了 and 结清 tick together, 结清
  reads 「在 Grab 里分好了」, the ticket gets the 「已结清」 stamp and everyone who boarded gets one car sticker.
- 218 A: one car sticker per ride, granted at the last settlement; the organiser sees one celebration, on the last
  已收到; riders' tickets get the 「已结清」 stamp in place with 「收进贴纸本」. Resolves the old questions 111 and 112.
- 219 A: a settled ride stays in 我的拼车 for 24 h with its stamp, then moves to a 「去过的 · n 趟」 row at the bottom of
  the list.

Defaults drawn on the same board and accepted: the organiser's 结清 rows show the method, the time and 「有截图」; the
rider's ticket cells change to Grab 总价 / 平分 / 你; a settled ticket in the list shows the amount paid with 「你付了」.

All of 176–219 are recorded in the superseding spec `docs/specs/2026-11-02-carpool-design.md`.

**176.** 拼车调研已完成（BlaBlaCar、Grab、Flighty、Wallet 登机牌、Citymapper），下一步是先定整体方向，再一屏一屏重画。
拼车的整体样子选哪个方向？

- A：群帖卡片，像整理过的微信群帖子（时间—线—地点、还差几人、每人约多少）。最熟悉、最省工，但和第一轮最像、辨识度低。
- B ★：车票，每趟拼车是一张椰糖杏色的票（大字「双威 → KLIA2」、集合点·座位·每人约），首页卡和以后的灵动岛用同一张票，详情里放 C 的时间线。辨识度最高、一个组件到处用；需要给地点加一个 8 字以内的短名。
- C：时间线，详情以「发起 → 凑齐 → 集合 → 上车 → 到了 → 结清」竖线为主，列表保持朴素。集合阶段最清楚，但列表本身没有特点。

**177.** Grab 已在 2026 年 5 月全国推出 Group Ride（邀请链接、等待室、自动分账，分账只能无现金，Grab 的示意图是加 3 位朋友），能替熟人解决「算钱催钱」，但不帮忙找陌生人凑人。Tapiro 的分账怎么对待它？

- A：不管 Grab Group Ride，照 spec 自己分账。最简单；已经在 Grab 里分过钱的人会被要求再分一次。
- B ★：默认自己分账，发起人可以选「车费已在 Grab 里分好」，选了就跳过分账，只记谁上车。两种人都顺手；多一个分支要设计和测试。
- C：不做分账，全部交给 Grab Group Ride。范围最小；失去现金/支付宝结算、欠款提醒和「不给钱」的约束。

**178.** 小红书需要登录、微信群不公开，我没拿到真实的拼车帖，调研里的「群帖结构」是根据你最初描述和二手资料拼出来的样例。要不要补真实样本？

- A ★：你发 3–5 张真实拼车帖截图（打码），我对照修正字段和用词。最准；要你花几分钟。
- B：先用现在的样例往下走。不占你时间；字段可能漏掉真实习惯（比如接龙格式）。
- C：我再去 Facebook 公开群等渠道找，需要登录的跳过。不占你时间；大概率仍找不到中国留学生的帖子。

**179.** 拼车场景有三类：日常短途（回宿舍、去商场）、机场/回国、节假日长途。它们需要的字段不同（机场要航班时间和行李）。先按哪类设计？

- A ★：日常短途为主，机场作为可选字段（航班时间、大件行李）补上。贴合你最初的「回 YC」场景、最常发生；机场场景只是加字段。
- B：机场/回国为主。单笔钱最多、最需要靠谱；日常短途会显得字段太多。
- C：三类并重，用场景标签切换不同表单。覆盖最全；表单和列表都更复杂。

## Unreachable

- 小红书 search (`https://www.xiaohongshu.com/search_result/?keyword=马来西亚 拼车`): rendered without posts (needs
  the web app and a session). Not logged in, per the no-accounts rule.
- WeChat groups: closed; no public source.
- BlaBlaCar help centre (`https://support.blablacar.com/hc/en-gb`): rendered only "Loading..."; `https://www.blablacar.co.uk/`
  returned 403; `https://newsroom.blablacar.com/news` not fetched after a redirect.
- 52Tours Malaysian ground-transport guide (`https://www.52tours.com/25323.html`): expired TLS certificate.
- DuckDuckGo HTML search: bot check. Bing `site:xiaohongshu.com` search returned unrelated results.
- No source found for typical short-trip campus fares or festival (CNY, Hari Raya) carpool practice among Chinese
  students; nothing about them is stated above.
