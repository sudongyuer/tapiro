# Tapiro: similar apps, visual design research

Researched 2026-10-04. App metadata (rating, version date, screenshots) comes from the iTunes Lookup API (`https://itunes.apple.com/lookup?id=<id>&country=<cc>`) and the App Store screenshots linked below. Statements marked **(observed)** describe what is visible in that app's current App Store screenshots. They are marketing frames, so they may not match the live UI exactly. Hex values marked **(sampled)** were read from screenshot pixels and are approximate.

Short App Store link form used throughout: `https://apps.apple.com/<cc>/app/id<ID>`.

---

## 1. Task / bounty / errand marketplaces

### 1.1 Airtasker (AU, global): closest functional analogue
- Link: https://apps.apple.com/au/app/id512137061 (4.86 from about 248k ratings, updated 2026-09-28, per Lookup API)
- Mobbin screens: Home flow https://mobbin.com/explore/flows/9ff44aa5-a720-4d31-a033-8689099de5d5 · Homepage https://mobbin.com/explore/screens/2d951c55-51ac-416d-950f-9db019f27073 · Tasker profile flow https://mobbin.com/explore/flows/7f238109-45f4-452c-adb6-d54a41b592df
- Layout (observed): the post-a-task flow is a one-question-per-screen wizard ("Start with a title", a progress bar at the top, a big full-width pill "Continue"). Task detail uses a large bold title, then an icon row for location 📍, date 📅 and budget $, then the description, then a segmented control **Offers (4) | Questions**. Each offer row shows an avatar, name, verified badge, ★ rating (count), "98% Completion rate", and the price on the right.
- Status (observed): the chat header pins a task summary chip ("Weed small garden · $160 · **Assigned**") with two quick actions, "Release payment" and "View task". Status sits in small grey text under the price.
- Settlement (observed): the "Release payment" sheet asks "Are you satisfied that the task is done?", then shows the task price and optional tip chips ($10/$20).
- Brand: rebranded by Koto with a "bolder, brighter, more energetic" personality, an animated logomark that "waves, smiles and jumps", and illustrations that interact with photography ([Brandfetch](https://brandfetch.com/blog/airtasker-new-logo-and-brand), [Brand New](https://www.underconsideration.com/brandnew/archives/new_logo_and_identity_for_airtasker_by_koto.php)). Headline font is PP Formula, with Manrope also used ([Brandfetch](https://brandfetch.com/blog/airtasker-new-logo-and-brand)). The store art shows a cartoon toolbox character with eyes and sneakers, drawn over real photos (observed).
- Palette: signature saturated blue, about **#0A65FC** (sampled), on white UI with navy primary buttons.
- Borrow: the Offers/Questions tabs on task detail; the pinned task chip in chat that carries status and next action; the explicit "confirm done" step before settlement (Tapiro settles offline, so this becomes a "mark as done" confirmation).
- Avoid: condensed all-caps display type (PP Formula) for Chinese UI, because CJK has no matching condensed cut and the voice would clash. Avoid bidding by default; for small campus tasks a fixed reward is simpler.

### 1.2 Taskrabbit (client) and Tasker by Taskrabbit (worker)
- Links: https://apps.apple.com/us/app/id374165361 · https://apps.apple.com/us/app/id1455415833
- Layout (observed, Tasker app): a deep green header ("Hello, Daniel"), then cards for "Same day tasks" with a green **RECEIVING** pill, then a "Today's tasks" list of avatar, category, time and place. "Get Hired" has a **Calendar | Map** toggle with a week date strip.
- Palette (observed): dark forest green on a cream background, about #FFFCE4 (sampled). Calm and grown-up.
- Mascot: none in the product. The brand rests on photography.
- Borrow: the **Calendar/Map toggle** for browsing tasks, and the small all-caps status pill next to a section title.
- Avoid: the corporate, adult tone and photo-heavy marketing. They do not fit a cute student app.

### 1.3 UU跑腿 (user) and UU跑腿跑男端 (runner): Chinese errand reference
- Links: user https://apps.apple.com/cn/app/id991522182 (4.91 from 207k ratings) · runner https://apps.apple.com/cn/app/id991522191 (4.87 from 124k ratings), per Lookup API
- Product analysis: [人人都是产品经理](https://www.woshipm.com/evaluating/3046722.html)
- Services (observed): 帮我送 / 帮我取 / 帮我买 / 万能帮帮 / 帮排队 are segmented tabs on top of a map. 帮排队 and 万能帮手 open icon grids (医院排队, 银行排队, 网红店排队, 照顾宠物, 上门做饭…). This is almost exactly Tapiro's task taxonomy.
- **Runner order card (observed, the best card anatomy found):**
  - Row 1: task type ("帮取 · 文件合同") on the left and the **reward in large orange (23.92元)** on the right.
  - Row 2: deadline in orange ("37分钟内(14:30前)送达") on the left and a match hint ("顺路星级 ★★★★") on the right.
  - Route block: distance column ("0.5 km", "6.6 km") beside **bold place names** with grey address lines.
  - Tag row: small outlined chips ("最高+3U点", "高峰期冲单奖").
  - A full-width orange **抢单** button.
- Status (observed): the user app shows a floating map card, "跑男正在前往取货 · 距取货地 500m · 4分钟", and an "预计送达时间 11:28" ETA card.
- Mascot (observed): a 3D orange-hooded courier boy ("U" on his hood) appears in every store frame, along with gold ¥ coins and red packets.
- Palette: orange **#FE7D28 / #FF760C** (sampled), white cards, orange CTAs.
- Borrow: the card's information order (type → **reward** → deadline → from/to with distance → chips → one CTA) and the service grid for task categories.
- Avoid: gold coins, red packets, "新人福利/邀请有奖" growth clutter, and dense banner carousels.

### 1.4 闪送 (Shansong): one-to-one urgent delivery
- Link: https://apps.apple.com/cn/app/id895374634
- Layout (observed): map home with a bottom sheet holding a **帮取送 | 帮我买** tab, an item-type grid (文件/食品/蛋糕/数码/证件/药品/鲜花…), and a price summary ("尊享送 5.91元", with a strike-through original price).
- Mascot (observed): a small cartoon courier with a headset appears only on the 新客专享 coupon popup. The rest of the store art uses a real courier photo.
- Palette: electric blue **#0071FE** (sampled) with yellow headline type.
- Borrow: the item-type icon grid as the first step of posting.
- Avoid: mixing real-person photography with a cartoon character, which splits the brand voice.

### 1.5 校跑跑 (campus errand, small/indie)
- Link: https://apps.apple.com/cn/app/id1485383596. Last updated 2023-05-26 with 5 ratings (Lookup API), so it is stale. Useful only as a campus pattern.
- Card (observed): a tag "跑腿订单" plus deadline "要求37分钟内送达" with the reward "17.8元" in red at top right. A vertical from/to timeline shows a distance under each node ("<500m 取货", "854m 收货"). Chips: 转单 / 帮送 / 鲜花2kg / 小费2元. Buttons: 联系 (outline) and 我已取货 (filled). The list has tabs 新任务 / 待取件 / 待送达 / 筛选.
- Palette: flat blue **#32A1FD** (sampled), with no mascot.
- Borrow: **status tabs as the "My tasks" structure** (新任务/待取件/待送达), and the "小费" (tip) chip as a reward add-on.
- Avoid: generic template look and the absence of personality.

### 1.6 优你-校园服务 (campus super-app, small/indie)
- Link: https://apps.apple.com/cn/app/id1560472542 (last updated 2024-09-09, 28 ratings, per Lookup API)
- Observed: an orange campus super-app with a school selector at top left ("韶关医学院"), a 5×2 icon grid (美食外卖, 代取快递, 跑腿服务, 课程表, 求职招聘, 社团活动, 表白墙…) and loud promo banners. The 代取快递 form has a "取件凭证" textarea with **一键粘贴** to paste the pickup SMS, plus photo proof.
- Borrow: **paste-the-pickup-SMS** and photo proof for parcel tasks. These map directly onto a "pick up my parcel" bounty.
- Avoid: the banner-stuffed home and the mixed illustration styles.

### 1.7 タイミー Timee (JP gig work): best "cute + utility" balance
- Link: https://apps.apple.com/jp/app/id1409383333 (4.66 from about 400k ratings, per Lookup API)
- Mascot: **タイミン**, a fairy based on the quokka, "the world's happiest animal", who watches over people at work. The name was chosen from 6,346 public submissions in Feb 2024 ([PR Times](https://prtimes.jp/main/html/rd/p/000000226.000036375.html)). LINE stickers followed ([Timee news](https://corp.timee.co.jp/news/detail-3795/)), and there is a logo-usage guideline ([PDF](https://timee.co.jp/wp-content/themes/taimee-hp/pdf/logoguideline.pdf)).
- Layout (observed): home has a location pill, then a **horizontal date strip** (今日/5/6/7…, with today as a yellow rounded square), then a toggle "この日の新しい仕事を通知", then a **2-column photo card grid**. Each card shows the title, date and time "15:00–18:00", the **reward "¥4,800" in bold**, and distance "3.2km".
- Detail (observed): a hero photo with a price tag overlay ("¥4,800"), the title, a time row, "交通費500円込み", a **red urgency chip "あと57分で募集締め切り"** next to a grey chip "募集人数 1/4人", then "ほかの日時でも募集中です" rows with slot counts (👤 3/10).
- Completion (observed): a full-yellow "報酬が確定しました!" screen with a big coin icon and the amount. It is a celebratory moment.
- Palette: Timee yellow **#FFD600** (sampled), black type, white cards, with yellow used for the highlighter underline on headlines.
- Mascot placement (observed): the mascot is small and peeks from the edge of the store art. Inside the UI it is nearly absent, and the cards stay clean.
- Borrow: the date strip; the countdown chip and the "filled 1/4" capacity chip; the **celebration screen on completion**; the restraint of keeping the mascot out of the list cards.
- Avoid: nothing major. Note that photo-first cards suit a job post that has a venue photo. Most Tapiro bounties have no photo, so they need an icon or illustration fallback.

---

## 2. Community / second-hand / rental apps this audience already uses

### 2.1 闲鱼 Xianyu
- Link: https://apps.apple.com/cn/app/id510909506 (4.10 from 803k ratings, per Lookup API)
- Mascot: a round yellow fish with thick black outlines that "自带喜感", backed by a wider "闲鱼 family" of characters ([数英](https://www.digitaling.com/articles/988560.html)). The IP has also been re-rendered in new textures to escape the "e-commerce mascot" stereotype (same source). See also the 闲鱼×U设计周 campaign ([数英](https://www.digitaling.com/projects/218308.html)).
- Layout (observed): a **2-column waterfall feed** of photo cards with title, price in red/orange and seller avatar. The tab bar has a **raised round yellow centre button "卖闲置"** with a camera icon, and the mascot fish peeks next to it on the hero frame. The top tabs are 首页 / 闲鱼集市 / 圈子 / 回收.
- Palette: Xianyu yellow about **#FFE91A** (sampled) with black and white. The CTA is a yellow pill with black text.
- Borrow: the **raised centre "post" button** as the single strongest CTA, the mascot peeking from that button, and a yellow-with-black CTA (high contrast).
- Avoid: an overcrowded home with too many entry points (集市/回收/圈子/AI), and celebrity marketing.

### 2.2 小红书 Xiaohongshu
- Link: https://apps.apple.com/cn/app/id741292507 (4.88 from 21M ratings, per Lookup API)
- Layout (observed): top tabs 关注 / **发现** / 附近 with sub-channels. A 2-column waterfall of image notes shows a short title, author avatar and ♡ count. The tab bar is 首页 / 市集 / **red "+" pill** / 消息 / 我. The palette is mostly white and grey with a single red accent.
- Mascot: none in the product UI (observed).
- Borrow: the **附近 tab** (nearby feed), the red-pill centre post button, and "less chrome, content first". Chinese students already know this grammar.
- Avoid: photo-dependent waterfall cards for bounties that have no photos.

### 2.3 Carousell (SEA, very popular in MY)
- Link: https://apps.apple.com/my/app/id548607187 (4.83 from 190k ratings, per Lookup API)
- Brand: 2019 identity by Superunion; the symbol is a top-down Kodak carousel forming a "c" ([Branding in Asia](https://www.brandinginasia.com/carousell-updates-brand-identity-across-asia-via-superunion/), [Campaign Asia](https://www.campaignasia.com/article/carousell-launches-new-brand-identity/453762)).
- Layout (observed): search plus filter chips ("All Categories", "Delivery", "Filter"), a location line ("7,000+ results in Singapore"), and a 2-column grid with a "1 day ago" overlay, a "Buyer Protection" badge, title, price and size. Chat pins an item header with **Make offer** and **View seller**; offers appear as special bubbles ("Made An Offer S$800", "Accepted Offer"). Reviews use **tag chips** ("Fast and decisive", "Goes the extra mile").
- Palette (observed): Carousell red on white, with flat illustrated people and a green hill motif in the store art. No mascot.
- Borrow: **status events rendered as special chat bubbles** (offered → accepted), and compliment-tag reviews instead of free-text-only reviews (low effort and friendly).
- Avoid: generic flat-people illustration.

### 2.4 Mudah.my (MY classifieds)
- Link: https://apps.apple.com/my/app/id1122343023
- Mascot: a fluffy domestic-shorthair **cat** introduced at the 16th anniversary (2023) as "the new face of the brand… used in all marketing", with a minimalist logo refresh ([TechTRP](https://techtrp.com/news/2023/12/15/mudah-my-the-largest-recommerce-marketplace-in-malaysia-celebrates-its-16th-anniversary/)). In store art the cat wears a suit and glasses and sits beside the "Sell For Free!" CTA (observed).
- Layout (observed): red header with search, filter row (Entire Malaysia / category / Filter), tabs All / Private / Company, a 2-column grid with "FEATURED" ribbons, and price in RM red. "Seller Highlights by Mudah AI" is an icon grid of attributes (Freehold, Renovated, Low Deposit, Near MRT/LRT…).
- Palette: Mudah red about **#CF0105** (sampled).
- Borrow: a **local mascot placed next to the primary CTA**, the icon-attribute grid for rental listings later (Near LRT, Low Deposit), and the Entire Malaysia → state location filter.
- Avoid: an all-red dense header. It reads as an alarm colour.

### 2.5 SPEEDHOME (MY rentals)
- Link: https://apps.apple.com/my/app/id998232868
- Observed: Speedhome yellow about **#FFE733** (sampled) with black type. Listing cards show price "RM 2,200", a purple "ZERO DEPOSIT" chip and a "WHOLE UNIT" chip. The **Events** screen uses filter pills "All (3) / Today (1) / Upcoming (2)". "My properties" groups listings by status labels LIVE / RENTED OUT / ARCHIVED. A cartoon hand-sign mascot badge reading "Your Rental Made Easy" appears in the corner of every frame.
- Borrow: **count-in-pill status filters** ("All (3)") and coloured status micro-labels above titles. Useful for "My bounties".
- Avoid: stamping the mascot badge on every screen.

### 2.6 iProperty Malaysia / PropertyGuru
- Links: https://apps.apple.com/my/app/id366785142 · https://apps.apple.com/my/app/id487538098
- Relevance: the standard MY rental grammar (state → area filters, RM/month). Nothing here is cute. Reference it for the future rental module's filters only.

### 2.7 yeeyi 亿忆 (Australian Chinese community / classifieds), the closest audience analogue
- Link: https://apps.apple.com/au/app/id1157314837 (3.83 from 465 ratings, per Lookup API)
- Observed: a blue-gradient Chinese UI. Home has a city selector, an AUD exchange-rate line, and a **10-icon grid of verticals** (房屋租赁, 房屋交易, 车辆交易, 求职招聘, 二手市场, 物流搬运, 清洁通渠…). The rental list shows thumbnail, title, chips "House / 4室1卫", 入住时间, and **price in red "$220/week" at bottom right**. 本地服务 has a dense category grid that includes **跑腿 and 带货**. There is also a friend list for 本地社交.
- Borrow: proof that a "留学生 everything app" (rent + second-hand + jobs + 跑腿 + social) is viable. Use the per-unit price label ("/week") and Chinese-first labels with English property-type chips.
- Avoid: a dated portal look with long text cards, no personality, and grids of 30+ categories. Its 3.8 rating suggests low delight.
- Related: 今日澳洲 https://apps.apple.com/au/app/id1334483688 (same audience, news-portal style).

### 2.8 Grab (MY super-app)
- Link: https://apps.apple.com/my/app/id647268330
- Observed: Grab green **#01B14F** (sampled). Home is a search bar plus 4 big service tiles (Food / Mart / Car / Express) with 3D-ish food icons, then horizontal "Order food again" cards with distance ("2.5 km"). The ride screen has a map with a bottom card ("Driver is on the way · 4 min", plate number, driver ★, chat field). No mascot; the store art uses illustrated drivers in green helmets.
- Borrow: the **live status bottom card** ("on the way · 4 min · chat") for an accepted bounty in progress; Malaysian users already know it.

---

## 3. Mascots on utility / marketplace products

### 3.1 美团 / 美团外卖: kangaroo 团团
- Links: https://apps.apple.com/cn/app/id423084029 · https://apps.apple.com/cn/app/id737310995
- The kangaroo was chosen in 2015 because of its "large pouch, carries a lot, runs fast", which mapped to many categories and fast delivery. The logo moved from a full running kangaroo to a rounder flat head ([腾讯新闻](https://news.qq.com/rain/a/20210531A0BI9O00), [搜狐](https://www.sohu.com/a/501806656_488474)). In June 2022 the mascot was named **团团** with a "cute and reliable" personality and made group-wide spokesperson ([搜狐](https://www.sohu.com/a/607296826_121124800), [数英](https://www.digitaling.com/projects/212519.html)). "Kangaroo ears" became a standalone IP element, sold as headband merch (腾讯新闻, above).
- Observed: Meituan yellow with black. The mascot head sits in the tab-bar home icon and the centre button. Restaurant list cards are dense (rating, monthly sales, delivery time, distance, discount chips).
- Borrow: **choose the animal for a trait that maps to the product**, then reduce the mascot to a **head mark** for small UI. A **signature body part** works as a mini-IP (for a tapir: the short trunk-snout, or the black-and-white "saddle").
- Avoid: Meituan's list density.

### 3.2 饿了么 / 淘宝闪购
- Link: https://apps.apple.com/cn/app/id507161324. The app now ships as 淘宝闪购 (Lookup API trackName).
- Note: the rebrand into Taobao's flash-sale identity shows that an independent mascot brand can be absorbed. It is not a strong reference now.

### 3.3 Duolingo
- Link: https://apps.apple.com/us/app/id570060128
- Brand facts: Feather Green #58CC02, Mask Green #89E219 behind Duo, Eel #4B4B4B text, and the bespoke Feather Bold typeface whose rounded forms echo the owl ([Canny Creative breakdown](https://www.canny-creative.com/brand-breakdown/brand/duolingo/)). The breakdown also notes generous 12–16 px corner radii (secondary source).
- Observed: chunky buttons with a darker bottom "lip", a bright multi-colour category palette, and Duo used at emotional moments (streak flame "3 day streak", "Keep it up!" speech bubble). The lesson UI itself stays clean.
- Borrow: **mascot at emotional moments** (empty states, success, streaks, errors) and not on every card; chunky tactile buttons; one hero colour plus a functional palette.

### 3.4 KakaoTalk / Kakao Friends
- Link: https://apps.apple.com/kr/app/id362057947
- Kakao Friends began as KakaoTalk emoticons in Nov 2012, by illustrator Hozo. Ryan, a maneless lion, arrived in 2016 and became the breakout ([Wikipedia](https://en.wikipedia.org/wiki/Kakao_Friends), [Kakao Corp](https://www.kakaocorp.com/page/service/service/Kakao%20Friends?lang=ENG&tab=all)).
- Observed: Kakao yellow about **#FFE500** (sampled). The current app UI is plain and photo-centric, and characters live in emoticons and profile decorations, not in core chrome.
- Borrow: **launch the mascot as a sticker / reaction set** (e.g. tapir reactions in task chat: 收到!, 我到了, 谢谢!). It spreads into WeChat and WhatsApp for free.

### 3.5 Mercari (JP)
- Link: https://apps.apple.com/jp/app/id667861049
- Observed: a 3D cast of animal-hooded kids and a pink poodle in campaign frames on hot-pink and yellow. The listing UI itself stays a standard grid.
- Avoid: 3D campaign characters for a small team. They are expensive to keep consistent. A 2D flat tapir with a fixed pose library is cheaper.

---

## 4. Saved screenshots (internal reference only)

Folder: `design-research/similar/` (12 files, about 1 MB total)

| File | App | Store page | Direct image URL |
|---|---|---|---|
| `airtasker-task-detail-offers.png` | Airtasker | https://apps.apple.com/au/app/id512137061 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/0b/ef/11/0bef1151-2de4-a916-cd5f-5bf3e5adbb89/au_screenshot_small_03.png/392x696bb.png |
| `airtasker-release-payment-settlement.png` | Airtasker | https://apps.apple.com/au/app/id512137061 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/8a/07/99/8a07999d-a640-696b-1d20-7caa60c04095/au_screenshot_small_05.png/392x696bb.png |
| `uu-runner-order-card-grab-button.png` | UU跑腿跑男端 | https://apps.apple.com/cn/app/id991522191 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/6f/bd/9d/6fbd9d56-b5d8-2025-0e4d-ca09d4c8a0dd/4_U6d77_U91cf_U8ba2_U5355.png/392x696bb.png |
| `xiaopaopao-campus-errand-card-route.jpg` | 校跑跑 | https://apps.apple.com/cn/app/id1485383596 | https://is1-ssl.mzstatic.com/image/thumb/Purple123/v4/e9/d0/40/e9d04088-223a-eb8e-67ef-2b52b4b61f07/pr_source.jpg/392x696bb.jpg |
| `timee-job-feed-date-strip-grid.jpg` | Timee | https://apps.apple.com/jp/app/id1409383333 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/ef/30/36/ef303615-eaa1-67a5-8c32-3586707d7bb6/ae8fab30-382c-4b5f-aa62-c1ba8d55c6ca_iOS_5.5inch_Screenshot_2.jpg/392x696bb.jpg |
| `timee-job-detail-countdown-slots.jpg` | Timee | https://apps.apple.com/jp/app/id1409383333 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/fc/01/95/fc01956c-2a51-81c5-f859-7517b64f91d7/be00454b-a21c-4ef3-bd79-690a3018efa8_iOS_5.5inch_Screenshot_3.jpg/392x696bb.jpg |
| `timee-reward-confirmed-celebration.jpg` | Timee | https://apps.apple.com/jp/app/id1409383333 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/39/84/4b/39844bde-7d79-fb85-81dc-29e145b581b1/17c93893-928a-408e-baa6-f1b462954071_iOS_5.5inch_Screenshot_4.jpg/392x696bb.jpg |
| `xianyu-mascot-center-post-tabbar.jpg` | 闲鱼 | https://apps.apple.com/cn/app/id510909506 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/61/3f/e9/613fe97c-7795-31b7-ce8f-30247604477c/001.png/320x480bb.jpg |
| `carousell-listing-grid-search.jpg` | Carousell | https://apps.apple.com/my/app/id548607187 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/62/3e/2f/623e2f22-82ae-8c2f-7fe3-b8fa1089ec04/98e69ea3-6c39-448a-942d-2e7834cdf9e0_sg_appstore_1242x2208v2_6.jpg/392x696bb.jpg |
| `mudah-cat-mascot-sell-cta.png` | Mudah.my | https://apps.apple.com/my/app/id1122343023 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/19/59/c0/1959c0e8-ac6b-76a2-c2c7-d98ac99bcc0a/image_07-_1242x2208.png/392x696bb.png |
| `speedhome-viewing-events-status-chips.jpg` | SPEEDHOME | https://apps.apple.com/my/app/id998232868 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource116/v4/67/fe/d2/67fed291-67d3-9c87-0d1e-2864f77be42b/2423397f-4231-4542-9703-30268489a6f3__U00285.5_U0029_Appstore_Screenshots_-_5.jpg/392x696bb.jpg |
| `yeeyi-rental-list-price-tags.jpg` | yeeyi 亿忆 | https://apps.apple.com/au/app/id1157314837 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/dd/70/fc/dd70fc90-aab7-1f8d-50ba-7f5fb79a7077/_U5546_U57ce__U00283_U0029.png/320x480bb.jpg |

All App Store screenshots for every app above (6–7 per app) can be re-fetched from the `screenshotUrls` field of the Lookup API. Contact sheets and raw copies were kept in `design-research/raw/` (not curated).

---

## Patterns to adopt for Tapiro

### Bounty card anatomy (list item)
Based on the UU runner card, the 校跑跑 card and Timee cards:
1. **Top row:** category icon + type label (代取快递 / 搬家帮手 / 代排队) on the left. The **reward on the right, in the largest number on the card** (e.g. `RM 15`), with a small "线下结算" hint the first time. UU and 校跑跑 both put the reward top-right in the accent colour.
2. **Urgency row:** deadline as relative time ("今天 18:00 前 · 还剩 2 小时"). It turns into a red/orange countdown chip when under about 1 h, as Timee's "あと57分で募集締め切り" does.
3. **Place block:** for A→B tasks, a two-node vertical route with **bold place names** (e.g. "Sunway Pyramid → Sunway Geo 宿舍") and the distance beside each node. For single-place tasks, one line plus the distance from me. Show campus or landmark names, not full street addresses, before a task is accepted.
4. **Chip row (max 3):** e.g. 需要搬重物, 可带小费, 女生优先, capacity "1/2 人" (from Timee's 募集人数 1/4).
5. **Footer:** poster avatar, nickname, school badge and ★/completion count (Airtasker's offer row). On the right, a single CTA, **接单**, shown only when actionable.
6. Cards without photos use a **category illustration slot** (tapir doing the task), so the feed never looks empty. Photo-first waterfall layouts (小红书/闲鱼) fail when there is no photo.

### Status display
- One linear lifecycle, shown in three places with the same colour and label set: **待接单 → 已接单 → 进行中 → 待确认完成 → 已完成** (+ 已取消/已过期).
- **My tasks** = segmented status tabs with counts (校跑跑's 新任务/待取件/待送达, SPEEDHOME's "All (3) / Today (1)").
- **In-progress** = a Grab/UU-style **pinned status card** ("小貘已接单 · 预计 15:30 到"), with chat and "我已完成" actions on the card.
- **Chat** = Airtasker/Carousell pattern: a pinned task header (title · reward · status) plus **system bubbles for state changes** ("已接单", "标记完成", "确认完成").
- **Completion** = a Timee-style full-screen celebration ("赏金已确认 RM15 · 记得线下结算"), with the tapir celebrating, then a compliment-tag review (Carousell's chips).

### Navigation structure
- Tab bar (iOS 26 Liquid Glass tab bar): **悬赏 (board) · 附近/地图 · [＋ 发布] · 消息 · 我的**. The raised centre post button follows 闲鱼/小红书, which this audience already knows. Later verticals (租房/二手/拼车) become **top segmented tabs or a vertical switcher inside the board**, not more tabs. That avoids the yeeyi/优你 30-icon grid.
- Board header: a campus/area selector pill (优你's school picker, Timee's location pill) plus filter chips (类型 · 距离 · 赏金 · 截止时间), with an optional Timee **date strip** for "today/tomorrow".
- List/Map toggle on the board (Taskrabbit's Calendar/Map, UU's map home).
- Post flow = an Airtasker-style **one question per screen** wizard: type grid (闪送/UU item grid) → title → place(s) → time → reward → review. 优你's paste-SMS field is the special parcel step.

### Mascot placement (cartoon Malayan tapir)
- **Do place it in:** the centre post button or its peek (闲鱼 fish beside 卖闲置, Mudah cat beside Sell); empty states ("还没有悬赏，发布第一个吧"); the completion celebration (Timee); onboarding; errors and offline; pull-to-refresh; and a **sticker set** for chat quick-replies (Kakao Friends emoticon origin).
- **Keep it off:** every list card and the nav chrome (Timee and Kakao keep the core UI clean). The card illustration slot is the one exception, using a small fixed pose library per task category.
- **Character system:** pick one signature trait (Meituan's kangaroo ears, Duolingo's eyebrows → the tapir's black/white "saddle" and short snout). Derive a **head-only mark** for the app icon and small UI. Keep it flat 2D with a thick rounded outline (闲鱼 style), which is cheaper to scale than Mercari-style 3D.
- **Colour:** reference brands own single saturated hues (Timee/闲鱼/Kakao/Speedhome yellow; UU orange; Grab green; Airtasker blue; Carousell/Mudah red). The Malayan tapir's black-and-white body is itself a high-contrast, ownable motif. Use it with one warm accent for the reward amount and CTA, and do not reuse Speedhome or Timee yellow, which are already taken in this market.

## Anti-patterns
- **Growth clutter:** red packets, gold coins, 新人福利 popups and invite-reward banners (UU, 闪送 coupon popups, 优你 banners). They erode trust in a peer-to-peer app.
- **Category explosion:** 10–30 icon grids on home (yeeyi, 优你, Meituan). Show at most 6 task types and put the rest in 更多.
- **Mascot everywhere:** a badge stamped on every screen (SPEEDHOME) or a mascot competing with data inside cards.
- **Mixed visual voices:** real-person photos plus cartoon courier (闪送), or a 3D cast plus flat UI (Mercari campaigns). Pick one illustration style.
- **All-red or alarm-coloured headers** (Mudah). Keep red for overdue or cancelled status only.
- **Photo-dependent cards** for content that usually has no photo (小红书/闲鱼 waterfall applied to bounties).
- **Bidding by default** (Airtasker offers). For RM5–30 campus errands it adds negotiation friction. Use a fixed reward with an optional "可议价" chip.
- **Exact addresses before acceptance:** UU and 校跑跑 show full addresses. Student safety favours coarse location (campus or condo name) until a task is accepted.
- **Payment-centric UI:** Tapiro settles offline, so do not copy "Release payment" or escrow wording. Use "确认完成" plus a reminder to settle offline.
- **Condensed Latin display fonts** (Airtasker PP Formula) in a Chinese-first UI. Prefer the system PingFang SC / SF with rounded weights for numbers.
- **Stale campus apps:** 校跑跑 (last update 2023) and 优你 (2024, 28 ratings) show that template-built campus errand apps fail to build delight or trust. Personality and polish are the differentiators.
