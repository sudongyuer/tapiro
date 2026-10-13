# Bottom tab bars in comparable apps

Date: 2026-10-06. Question from KICKOFF: how to name and structure Tapiro's tabs.

Scope: 18 mobile apps. Images and per-app notes (Chinese) live outside the repo in the session
scratchpad `tab-refs/` (`refs.json` plus one folder per app). Every image is a real screen: a store
screenshot, an official blog/help image, or a public recording. Labels marked "unverified" were not
seen on a screen or in official text.

## Comparison

| App             | Tabs           | Labels (as shown)                                                                                       | Launch tab                       | Create action                                      | "Mine" tab?        | Messages                        | Profile / wallet                        |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------- | ------------------ | ------------------------------- | --------------------------------------- |
| Airtasker       | 5 (3 verified) | My tasks · Messages · Account (+2 unverified)                                                           | unverified                       | Full-screen "Post a task" wizard; entry unverified | Yes, My tasks      | Tab                             | Account (payment methods)               |
| TaskRabbit      | 4              | Home · Tasks · My Taskers · Profile                                                                     | Home ("I need help with" search) | None; search or category on Home                   | Yes, Tasks         | Inside each task (Chat sub-tab) | Profile                                 |
| Fiverr          | 5              | Home · Inbox · Search · Manage orders · Account                                                         | Home                             | None for buyers                                    | Yes, Manage orders | Tab (Inbox)                     | Account (balance)                       |
| UU跑腿          | unverified     | Top: 跑腿/货运/家政/代驾; 帮我送/帮我取/帮我买/万能帮帮/帮排队                                          | Map + order card                 | The home screen is the order form                  | unverified         | Top-right icon                  | unverified                              |
| 闪送            | 0              | No tab bar                                                                                              | Map + 帮取送/帮我买 card         | The home screen is the order form                  | No (icon)          | Top-right bell (unverified)     | Top-left person icon                    |
| Karrot (KR)     | 5              | 홈 Home · 커뮤니티 Community · 동네지도 Neighbourhood map · 채팅 Chats · 나의 당근 My Karrot            | Home (nearby listings)           | Floating "+ 글쓰기" (Write) button                 | No                 | Tab                             | 나의 당근 (incl. 당근페이 wallet)       |
| Karrot (global) | 5              | Home · Search · **Sell** · Chats · My Karrot                                                            | Home                             | Centre tab "Sell" (+)                              | No                 | Tab                             | My Karrot                               |
| 闲鱼            | 5              | 闲鱼 · 同城服务 · **卖闲置** · 消息 · 我的                                                              | 闲鱼 (feed)                      | Raised centre button 卖闲置                        | No                 | Tab                             | 我的                                    |
| OLIO            | 5              | Home · Search · **Add** · Community · Messages                                                          | Home                             | Centre tab "Add" (+)                               | No                 | Tab                             | ☰ menu (no profile tab)                |
| Carousell       | 5              | Explore · For You · **Sell** · Updates · Me (old HK: 探索 · 群組 · 賣嘢 · 動態 · 我)                    | Explore                          | Centre tab "Sell" (red +)                          | No                 | Top-right icon on Explore       | Me                                      |
| Mudah.my        | 5              | Home · Find · **Sell** · Chat · (avatar + name)                                                         | Home (unverified)                | Centre tab "Sell" (camera)                         | No                 | Tab                             | Avatar tab                              |
| BlaBlaCar       | 5              | Rechercher · Publier · Vos trajets · Messages · Profil (FR, 2026 Liquid Glass)                          | Rechercher (Search)              | Plain second tab "Publier"                         | Yes, Vos trajets   | Tab                             | Profil                                  |
| Grab (MY)       | 5              | Home · Discover · Payment · Activity · Messages (older: Home · Activity · Finance · Messages · Account) | Home (service grid)              | None; pick a service on Home                       | Yes, Activity      | Tab                             | Payment tab; account entry unverified   |
| 美团            | 5              | 首页 · 视频 · **问小团** · 购物车 · 我的                                                                | 首页                             | None; order inside each service                    | No (unverified)    | Top-right icon                  | 我的 (unverified)                       |
| 飞猪            | 5              | 首页 · 消息 · **飞猪帮帮** · 行程 · 我的                                                                | 首页 (AI search box)             | None; AI bar docked above the tab bar              | Yes, 行程          | Tab                             | 我的                                    |
| 小红书          | 5              | 首页 · 市集 · **+** · 消息 · 我 (text only, no icons)                                                   | 首页 (发现 feed)                 | Centre red "+"                                     | No                 | Tab                             | 我                                      |
| Duolingo        | 6              | Icon-only; Home · Quests · … · "•••" overflow                                                           | Home (path)                      | None                                               | No                 | —                               | Profile moved behind "•••" (unverified) |
| Finch           | 6              | Home · Quests · Shop · Friends · Bag · (pet name)                                                       | Home                             | None (goals on Home)                               | No                 | —                               | Last tab is the pet                     |
| Musubicho       | 0              | No tab bar; docked AI composer only                                                                     | Home (ledgers)                   | Nav-bar "+" and the composer                       | No                 | —                               | Nav-bar avatar                          |

Bold = centre slot used for create or AI.

## Patterns

**How many tabs.** Five is the norm: 12 of 18 apps (UU跑腿 unverified). TaskRabbit uses 4. Finch and Duolingo use 6,
both with custom-drawn bars; native iOS would turn the sixth into a "More" tab. Two single-job
apps (闪送, Musubicho) have no tab bar. Apple: "If horizontal space limits the number of visible
tabs, the trailing tab becomes a More tab"; keep the default to "five or fewer" ([HIG Tab bars][hig]).

**Labels: nouns vs verbs.** Navigation tabs are nouns. Verbs appear only on the create slot:
Sell, Add, Publier, 卖闲置, 글쓰기. Apple says "Use single words whenever possible" ([HIG][hig]).
English labels are one word, except "My tasks", "Manage orders" and "My Karrot". Chinese labels are
two characters (首页, 消息, 我的, 行程). 小红书 shows that text-only tabs work when the labels are short.

**"Home" vs the feature name.** Marketplaces and super-apps call the first tab Home/首页.
Single-purpose apps name the job: BlaBlaCar "Rechercher", Carousell "Explore", 闲鱼 uses its own
brand name. Apps with two or more equal features (Grab, 美团, 飞猪) use Home plus a service grid
rather than one tab per feature. Karrot KR is the exception: it gives tabs to Community and
Neighbourhood map, and moves create to a floating button.

**Centre create button.** Six apps put create in the centre slot (闲鱼, 小红书, Karrot global, OLIO,
Carousell, Mudah). All are supply-driven marketplaces or UGC, where posting is the core loop.
Task and ride apps don't: TaskRabbit, Fiverr and Grab have no create tab; BlaBlaCar keeps
"Publier" as an ordinary second tab. Apple's guidance runs against action tabs: "Use a tab bar to
support navigation, not to provide actions" ([HIG][hig]). The same app can switch: Karrot moved
create out of the KR tab bar into a floating button.

**Centre AI.** 美团 (问小团) and 飞猪 (飞猪帮帮) use the centre slot for an AI mascot. 飞猪 also docks
a "发消息或者按住说话…" bar above the tab bar on Home. That is the closest match to 问小貘, and it
shows the cost: two AI entries on one screen. Musubicho drops the tab bar so the composer owns the
bottom edge.

**Separate "mine" tab.** Service apps where you track something in progress give it a tab: Airtasker
(My tasks), TaskRabbit (Tasks), Fiverr (Manage orders), BlaBlaCar (Vos trajets), Grab (Activity),
飞猪 (行程). Marketplaces keep my listings inside Me. Tapiro has live state (bounty in progress,
ride gathering, money owed), so it sits closer to the service apps.

**Messages.** A tab in 10 apps. Exceptions put chat inside the order (TaskRabbit) or as a top-right
icon (Carousell, 美团, UU). Tapiro's chat is per bounty or ride, but people also need one inbox.

**Profile and wallet.** The last tab is almost always Me/我/我的/Account/Profile. Brand variants:
"My Karrot", Mudah's avatar, Finch's pet name. Only Grab gives the wallet its own tab (Payment).
Karrot keeps its wallet inside My Karrot.

## Platform constraint for the docked composer

Expo Router NativeTabs exposes iOS 26's tab-bar accessory as `NativeTabs.BottomAccessory`
(SDK 55+). It has `regular` (above the bar) and `inline` (in the minimized bar) placements, and
`minimizeBehavior="onScrollDown"` shrinks the bar on scroll
([Expo native tabs](https://docs.expo.dev/router/advanced/native-tabs.md),
[UITabBarController.bottomAccessory](https://developer.apple.com/documentation/uikit/uitabbarcontroller/bottomaccessory)).
That matches the KICKOFF decision "缩，停下来再展开". Expo renders two accessory instances, so the
composer's state must live outside it. Unverified: how a text field with the keyboard behaves in
the accessory. Prototype this before the spec. The doc page above is the latest version, not v57.

## Candidate tab sets for Tapiro

Malay labels are drafts and need a native-speaker review. All sets keep 问小貘 as the bottom
accessory, so none needs an AI tab.

### A. Two feature tabs + centre post (闲鱼 / Carousell grammar)

| zh   | en       | ms (draft) | SF Symbol idea                 |
| ---- | -------- | ---------- | ------------------------------ |
| 悬赏 | Bounties | Ganjaran   | `flag`                         |
| 拼车 | Rides    | Tumpang    | `car`                          |
| 发布 | Post     | Siar       | `plus` (centre)                |
| 消息 | Chats    | Sembang    | `bubble.left.and.bubble.right` |
| 我的 | Me       | Saya       | `person`                       |

- For: familiar to Chinese students from 闲鱼 and 小红书. Both features are one tap away.
- Against: the post tab is an action, which the HIG advises against. It duplicates the composer,
  whose main job is drafting a bounty or ride. Adding 二手 or 租房 later means removing a tab.
  "My bounties / my rides" live inside 我的, two taps deep.

### B. Feature tabs, no post tab (recommended)

| zh   | en       | ms (draft) | SF Symbol idea                 |
| ---- | -------- | ---------- | ------------------------------ |
| 悬赏 | Bounties | Ganjaran   | `flag`                         |
| 拼车 | Rides    | Tumpang    | `car`                          |
| 消息 | Chats    | Sembang    | `bubble.left.and.bubble.right` |
| 我的 | Me       | Saya       | `person`                       |

- Create comes from 问小貘 (one sentence) or a nav-bar "+" on the 悬赏 and 拼车 screens (manual path).
  This follows Musubicho and the HIG, and avoids 飞猪's two AI entries.
- Each feature tab shows "mine in progress" at the top, then the board. This mirrors Karrot KR,
  which moved create out of the bar.
- For: 4 tabs leave a slot for the next feature (二手 or 租房) without reshuffling. Labels are
  single nouns in all three languages.
- Against: no visible create button for someone who ignores the composer. The nav-bar "+" must
  carry that.

### C. Home + My activity (Grab / BlaBlaCar grammar)

| zh     | en       | ms (draft) | SF Symbol idea                 |
| ------ | -------- | ---------- | ------------------------------ |
| 首页   | Home     | Utama      | `house`                        |
| 进行中 | Activity | Aktiviti   | `list.bullet.rectangle`        |
| 消息   | Chats    | Sembang    | `bubble.left.and.bubble.right` |
| 我的   | Me       | Saya       | `person`                       |

- Home mixes bounties and rides (segmented control on top). Activity holds everything I posted or
  joined, grouped by status, like Grab Activity and BlaBlaCar "Vos trajets".
- For: live state (ride gathering, payment owed) is one tap away. It scales to more features
  without new tabs.
- Against: "Home" says nothing about the app. Bounties and rides compete on one feed. 进行中 has three
  characters where the others have two; 订单 reads as shopping.

### Open choices

1. Brand the last tab ("我的小貘", like "My Karrot" or Finch's pet tab) or keep 我的 / Me / Saya.
2. Where the coin balance and sticker book live: inside 我的 (Karrot) or a tab (Grab Payment).
   No comparable app gives collectibles their own tab except Finch (Shop, Bag).

[hig]: https://developer.apple.com/design/human-interface-guidelines/tab-bars

## Sources

- App Store listings: Airtasker https://apps.apple.com/au/app/id512137061 · TaskRabbit
  https://apps.apple.com/us/app/id374165361 · Fiverr https://apps.apple.com/us/app/id346080608 ·
  UU跑腿 https://apps.apple.com/cn/app/id991522182 · 闪送 https://apps.apple.com/cn/app/id895374634 ·
  당근 https://apps.apple.com/kr/app/id1018769995 · Karrot https://apps.apple.com/ca/app/id1018769995 ·
  闲鱼 https://apps.apple.com/cn/app/id510909506 · OLIO https://apps.apple.com/gb/app/id1008237086 ·
  Carousell https://apps.apple.com/tw/app/id548607187 · Mudah https://apps.apple.com/my/app/id1122343023 ·
  Grab https://apps.apple.com/my/app/id647268330 · 美团 https://apps.apple.com/cn/app/id423084029 ·
  飞猪 https://apps.apple.com/cn/app/id453691481 · 小红书 https://apps.apple.com/cn/app/id741292507
- Google Play: Grab https://play.google.com/store/apps/details?id=com.grabtaxi.passenger&hl=ms&gl=MY ·
  Carousell https://play.google.com/store/apps/details?id=com.thecarousell.Carousell&hl=en&gl=MY ·
  Airtasker https://play.google.com/store/apps/details?id=au.com.airtasker
- 应用宝 UU跑腿: https://sj.qq.com/appdetail/1104642400
- Help centres: Fiverr https://help.fiverr.com/hc/en-us/articles/360011448497 (FR labels:
  https://help.fiverr.com/hc/fr/articles/360011448497) · Airtasker
  https://support.airtasker.com/hc/en-au/articles/215612858 and
  https://support.airtasker.com/hc/en-au/articles/204835374
- BlaBlaCar 2026 redesign: https://iphonesoft.fr/2026/02/17/blablacar-offre-nouvelle-interface-true-blue-ios ·
  https://www.lazyweb.com/company/blablacar
- TaskRabbit recording: https://www.lazyweb.com/company/taskrabbit
- Duolingo: https://blog.duolingo.com/guide-to-duolingo-practice-hub/ · https://blog.duolingo.com/friends-quests/
- Finch: https://screensdesign.com/apps/finch-self-care-pet/ · "six tabs" per
  https://www.internetmatters.org/advice/apps-and-platforms/wellbeing/finch/ (search snippet; page returned 403)
- Karrot wallet in 나의 당근: https://www.mt.co.kr/future/2025/06/30/2025063014272277409
- 闪送 account icon: https://www.smartshanghai.com/articles/tech/how-to-courier-something-in-shanghai
- Musubicho: https://x.com/__oQuery/status/2106325021140668756 (see `2026-10-06-ai-native-reference.md`)
