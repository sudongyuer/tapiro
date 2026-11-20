---
title: Foundation — accounts, navigation shell, direct payment, reputation, coins, 问小貘, chat
status: approved
created: 2026-10-11
approved: 2026-10-13
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Visual mockup: https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o (boards: G 首屏 · 合体版, 底部导航 N3+E · 完整稿,
撮合付款 · 可点原型, B + C 合并 · 个人页, 评价 A, 小貘的 10 种交互做法, 问小貘 · 四屏原型, 交互细节 · 六选).
Decisions: docs/KICKOFF.md rows 2026-10-05 to 2026-10-11. Feature specs built on this one:
2026-10-11-bounty-design.md (悬赏令) and 2026-10-11-carpool-design.md (拼车). -->

## Problem

Tapiro has no product code yet: the repo holds a design-token scene, a verify mode and an empty
home route (`src/app/index.tsx`). No Supabase project, migrations, auth, or `modules/tapiro-kit`
exists. Bounty (悬赏令) and carpool (拼车) both need the same pieces: an account, a place to
live in the app, a way for one student to pay another without Tapiro touching money, a trust
signal, a platform currency, an assistant that drafts, and a chat. Building these inside the
first feature would duplicate them in the second. This spec defines the shared layer once; the
two feature specs only describe their own flows on top of it.

## Goals and scope

**Do**

- Sign in with Apple and Google (native ID tokens), a minimal profile, in-app account deletion.
- The app shell: four native tabs 悬赏 · 拼车 · 消息 · 我的, the 小貘 button in the search slot that
  opens 问小貘 as a sheet, the bottom accessory showing the single most urgent item, minimise on
  scroll; the home G frame (mascot stage, live-card stack) that the bounty spec fills.
- Direct payment (撮合付款): payee methods, the pay sheet, two-sided settlement, unpaid handling.
- 靠谱度 (reputation) with blind three-face reviews; sticker book and mascot levels.
- 貘币: one ledger, IAP packs, spending, refunds and free grants.
- 问小貘: consent, drafting through an Edge Function, 小貘体力 (AI energy) metering, voice and
  image input, memory of places and preferences, on-device conversation history.
- Person-to-person chat per bounty or ride, with report and block.
- Push notifications, and a Live Activity for in-progress items.
- Every string in zh-Hans, en and ms.

**Don't do**

- Money through Tapiro in any form: no wallet, escrow, payout, or card collection. Reason:
  holding or moving users' funds needs a licence Tapiro cannot get (2026-10-05-payments.md §1.2,
  2026-10-05-stripe-feasibility.md, 2026-10-05-wise-feasibility.md; KICKOFF 2026-10-05).
- Deep links that prefill payee and amount in a bank or wallet. Reason: no bank or wallet
  publishes one; app-to-app flows are merchant-only (2026-10-06-payment-app-launch.md §1).
- Collecting IC, passport or student-ID numbers; DuitNow by IC/passport. Reason: KICKOFF
  2026-10-05 "DuitNow 只允许手机号".
- Coin spends other than posting and AI drafts (加急, 置顶, 装扮 purchase). Reason: KICKOFF
  2026-10-06 "暂时只要发布和 AI". Cosmetics in v1 come only from mascot levels.
- Coins paying, tipping or transferring to people; cashing out. Reason: KICKOFF 2026-10-05;
  would make coins e-money (2026-10-05-payments.md §1.1).
- Share extension for importing receive codes. Reason: KICKOFF 2026-10-06 "先不做".
- A chat home screen or a permanent composer bar. Reason: superseded by N3+E (KICKOFF 2026-10-11).
- Server-side storage of 问小貘 conversations or drafts. Reason: KICKOFF 2026-10-11 "只存手机".
- Vouching (reputation research recommends later).
- School verification (e.g. 「Sunway 认证」). Reason: KICKOFF 2026-10-11 F2 "不做", consistent
  with not checking student status.
- Android anything (AGENTS.md).

## Decisions

| Decision              | Choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Why                                                                                                      | Alternatives considered                                                                                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in               | `expo-apple-authentication` and Google Sign-In → `signInWithIdToken`; session in Keychain                                                                                                                                                                                                                                                                                                                                                                                                                | AGENTS.md (no web OAuth, no Apple secret rotation)                                                       | Email OTP: not requested                                                                                                                                                                                                                            |
| Tabs                  | NativeTabs, 4 triggers (悬赏, 拼车, 消息 with unread badge, 我的), `minimizeBehavior="onScrollDown"`                                                                                                                                                                                                                                                                                                                                                                                                     | KICKOFF 2026-10-11 N3+E; spike 2026-10-11-nav-n3e-spike.md                                               | N1/N2/N3 on canvas: rejected by the user                                                                                                                                                                                                            |
| 问小貘 entry          | 5th trigger `role="search"`, `disabled`, custom image icon, `tabPress` → push root `formSheet` route (detents 0.5 and 1, grabber); presentation options in the root layout                                                                                                                                                                                                                                                                                                                               | Spike: verified on iOS 26.5 Simulator; options inside the sheet screen were ignored                      | Raised centre button: impossible with the system tab bar                                                                                                                                                                                            |
| Bottom accessory      | Shows the most urgent item; hidden when there is none; hidden at the top of 悬赏 (the live cards are on screen) and shown there once they scroll away                                                                                                                                                                                                                                                                                                                                                    | KICKOFF 2026-10-11; spike verified mount/unmount per route and scroll state                              | Always on: duplicates the home live cards                                                                                                                                                                                                           |
| Accessory tap         | Opens the item's own screen, the same one its home card opens (a bounty waiting for the poster opens its applicants, money owed either way opens its payment); an item without one (a ride) opens the top of 悬赏 with the cards fanned out                                                                                                                                                                                                                                                              | Owner report 2026-11-20 (「去选」 landed on home); agent, 2026-11-21                                     | Always open home and fan out the cards: the strip promised 「去选」 and needed a second tap on the card                                                                                                                                             |
| Expand after minimise | Tapping the minimised tab expands; scrolling back up does not                                                                                                                                                                                                                                                                                                                                                                                                                                            | Observed in the spike                                                                                    | —                                                                                                                                                                                                                                                   |
| Home frame            | G: stage (mascot pose and colour by state) → live-card stack (stacked when 2+, tap to fan out) → feature content; collapses to a strip on scroll                                                                                                                                                                                                                                                                                                                                                         | KICKOFF 2026-10-10                                                                                       | H1–H3, D, E, F                                                                                                                                                                                                                                      |
| Payment model         | Payer pays payee directly in their own bank/e-wallet app; Tapiro shows what to copy and records two taps                                                                                                                                                                                                                                                                                                                                                                                                 | KICKOFF 2026-10-05; 2026-10-05-duitnow-p2p.md "Recommended flow"                                         | Stripe/Curlec/Wise: need a Malaysian company or are forbidden                                                                                                                                                                                       |
| Payee methods         | DuitNow phone number, bank account, TNG/DuitNow receive QR, Alipay 收钱码, WeChat 收款码, cash in person                                                                                                                                                                                                                                                                                                                                                                                                 | KICKOFF 2026-10-05, 2026-10-06 (Alipay/WeChat labelled by name, not "other code")                        | Payee research recommended leaving Alipay/WeChat out (see review report)                                                                                                                                                                            |
| QR intake             | Pick a screenshot (no Photos permission) or scan; decode on device with Expo modules; store the string and parsed fields, never the image; block paying codes                                                                                                                                                                                                                                                                                                                                            | 2026-10-06-payee-setup.md §3; KICKOFF 2026-10-06 "用 Expo 现成模块"                                      | Vision in the kit: more control, more work                                                                                                                                                                                                          |
| Settlement            | Payer taps 我已付款 (screenshot optional); only the payee's 已收到 settles; 还没收到 notifies the payer; no automatic settlement                                                                                                                                                                                                                                                                                                                                                                         | KICKOFF 2026-10-05 "不自动，只提醒接单人"                                                                | Auto-confirm after N hours: rejected                                                                                                                                                                                                                |
| Payee info visibility | Only the payer of an item where this person is the selected payee, only inside the pay step, hidden after settlement                                                                                                                                                                                                                                                                                                                                                                                     | KICKOFF 2026-10-05; PayFlow board                                                                        | Public on profile: fraud risk                                                                                                                                                                                                                       |
| Reputation            | Two layers: 靠谱度 (rolling 180 days, can fall, gates applications; tiers 新朋友 / 靠谱 / 很靠谱 / 貘友 with the research thresholds, tuned after launch) and sticker book + mascot level (lifetime, cosmetic)                                                                                                                                                                                                                                                                                           | KICKOFF 2026-10-05 B+C, 2026-10-11 F1; 2026-10-04-reputation.md Design B                                 | Single score: mixes trust and joy                                                                                                                                                                                                                   |
| Reviews               | Three faces 开心 / 一般 / 不开心 + chips + optional sentence; only after settlement; sealed until both submit or 7 days; reviewee may reply once                                                                                                                                                                                                                                                                                                                                                         | KICKOFF 2026-10-06 Q4; ReviewA, RepBC boards                                                             | Stars: inflate (reputation research §4.1)                                                                                                                                                                                                           |
| No-show slack         | One excused no-show per 60 days                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | StatusFlows board (2026-10-06)                                                                           | —                                                                                                                                                                                                                                                   |
| Mascot level curve    | Lv2 at 3 stickers, Lv3 8, Lv4 15, Lv5 25, then every +15                                                                                                                                                                                                                                                                                                                                                                                                                                                 | KICKOFF 2026-10-11                                                                                       | Every 10; three stages                                                                                                                                                                                                                              |
| Coins: purchase       | Consumable IAP: RM5 → 5, RM10 → 11, RM30 → 35, at the closest Apple Malaysia price points; purchased coins never expire. At launch IAP is the only way to buy coins; the website only explains them (Q20 C, owner 2026-11-21)                                                                                                                                                                                                                                                                            | KICKOFF 2026-10-06; Guideline 3.1.1 "may not expire" (fetched 2026-10-11)                                | Non-IAP: not allowed for in-app features (3.1.1). Stripe top-up on the website at launch: deferred until there is revenue; allowed later by 3.1.3(b) only if coins stay buyable through IAP and the app never mentions or links the website (Q20 C) |
| Coins: spend          | 1 per published bounty or ride; the first 3 posts per calendar month are free, one allowance shared by bounties and rides; 1 per food portion (嫩叶) for 小貘体力; refunded when nobody is selected or the poster cancels before selecting, and a refunded free post restores the free slot                                                                                                                                                                                                              | KICKOFF 2026-10-06; 2026-10-11 F4, B7, F17                                                               | Separate allowances per feature                                                                                                                                                                                                                     |
| Coins: free grants    | New user 5; onboarding 3 × 1 (payee method added, first post or ride, first help settled); weekly feed 1 (tap the home stage once per calendar week, Monday 00:00 Malaysia time); each help settled 1, max 10 a month; invite 3 to each side after the friend's first settled item; never expire                                                                                                                                                                                                         | KICKOFF 2026-10-06, 2026-10-11 (F7)                                                                      | Feed button in 我的; automatic on first open                                                                                                                                                                                                        |
| Ledger                | Single append-only server ledger; balance derived; all grants and spends written by the server                                                                                                                                                                                                                                                                                                                                                                                                           | KICKOFF 2026-10-06 "单一账本"                                                                            | Two ledgers (paid/earned): dropped                                                                                                                                                                                                                  |
| AI path               | Edge Function in ap-southeast-1 → Qwen on Model Studio Singapore; tool calls return drafts only                                                                                                                                                                                                                                                                                                                                                                                                          | AGENTS.md AI rules                                                                                       | Client-side keys: forbidden                                                                                                                                                                                                                         |
| AI usage (小貘体力)   | All AI use (drafts, translation, ghost-writing, Q&A, receipt split) consumes energy by usage, metered in tokens on the server and never shown as tokens. Free energy refills at 06:00 Malaysia time to about 3 drafts or 30 translated sentences; unused free energy resets daily. 1 coin buys 1 food portion (嫩叶) kept in 小貘's pantry, never expiring; feeding one refills energy to full. Only cloud calls consume energy; on-device Foundation Models calls do not. Exact UI confirmed when built | KICKOFF 2026-10-11 F17, F14; canvas 「问小貘 · AI 用量 = 小貘体力」 E2; Guideline 3.1.1 "may not expire" | Draft count (5 a day, then 1 coin): replaced; energy battery (E1) or mood only (E3)                                                                                                                                                                 |
| AI storage            | Conversations and drafts on device only; "小貘记得" (places, preferences) synced, viewable and deletable                                                                                                                                                                                                                                                                                                                                                                                                 | KICKOFF 2026-10-06, 2026-10-11                                                                           | Server chat history: PDPA minimisation                                                                                                                                                                                                              |
| AI labelling          | Confirmed AI drafts are the user's own content; no AI badge                                                                                                                                                                                                                                                                                                                                                                                                                                              | KICKOFF 2026-10-06 "都不标"                                                                              | —                                                                                                                                                                                                                                                   |
| Chat                  | Supabase-backed thread per bounty or ride, members only; text and images, both reportable; kept indefinitely                                                                                                                                                                                                                                                                                                                                                                                             | KICKOFF 2026-10-11, F8                                                                                   | Device-only: the other side loses history                                                                                                                                                                                                           |
| Push                  | Expo Push Service; provisional authorisation first; IDs only in payloads under `body`                                                                                                                                                                                                                                                                                                                                                                                                                    | 2026-10-04-push-location.md; AGENTS.md                                                                   | Direct APNs: later if needed                                                                                                                                                                                                                        |
| Unpaid handling       | Reminders to the payer at 24 h and 72 h; publishing blocked after 7 days unpaid or with 2 open unpaid items, lifted on settlement or a resolved report                                                                                                                                                                                                                                                                                                                                                   | KICKOFF 2026-10-05 "提醒 + 限制发布"; 2026-10-11 F3                                                      | Stricter (3 days) or reminders only                                                                                                                                                                                                                 |
| Accessory priority    | Money the user owes > a ride departing within 1 h > money owed to the user > an in-progress bounty; `还有 n 件` when more exist                                                                                                                                                                                                                                                                                                                                                                          | KICKOFF 2026-10-11 F5                                                                                    | Ride first; nearest deadline                                                                                                                                                                                                                        |
| Voice in 问小貘       | Microphone button inside the sheet in v1; long-press on the 小貘 button only after a spike proves it                                                                                                                                                                                                                                                                                                                                                                                                     | KICKOFF 2026-10-11 F6; spike verified tap only                                                           | Long-press required in v1                                                                                                                                                                                                                           |
| Account deletion      | Blocked while the user has an unsettled payment (shows which); deletion removes the user's messages and reviews, keeps the other side's thread, keeps anonymised ledger and IAP rows                                                                                                                                                                                                                                                                                                                     | KICKOFF 2026-10-11 F9, F10; Guideline 5.1.1(v)                                                           | Delete whole threads; rename to 已注销用户                                                                                                                                                                                                          |
| Alipay/WeChat codes   | Supported in v1, no legal review                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | KICKOFF 2026-10-11 F15, 2026-10-12 "直接支持就行，不用咨询律师"                                          | Drop until counsel confirms                                                                                                                                                                                                                         |
| Home stage class      | The home stage is a moment area (large mascot allowed); design-language.md is updated to say so                                                                                                                                                                                                                                                                                                                                                                                                          | KICKOFF 2026-10-11 F16                                                                                   | Shrink to a 32 pt head                                                                                                                                                                                                                              |
| Live Activity target  | A widget extension generated by a config plugin, the one exception to "native code lives in the kit"; AGENTS.md is updated to say so                                                                                                                                                                                                                                                                                                                                                                     | KICKOFF 2026-10-11 F12                                                                                   | No Live Activity in v1                                                                                                                                                                                                                              |

## Behaviour

### Accounts

- First launch: welcome (sticker wall A, the sign-in sheet rises on the same screen) → Sign in with
  Apple or Google → name and avatar (prefilled from the ID
  token when present) → language (follows system, changeable) → home. Email is kept only as the
  provider gives it (Apple relay addresses accepted).
- 我的 → 设置 → 删除账号: confirm sheet listing what goes (profile, payee methods, the user's
  messages and reviews, 小貘记得, coins, stickers). Blocked while the user has an unsettled payment
  (KICKOFF 2026-10-11 F9). Guideline 5.1.1(v) "you must also offer account deletion within the app".

### Navigation shell (N3+E)

- Accessory priority, highest first (KICKOFF 2026-10-11 F5): money the user owes (付给 X RM n), a ride departing within the
  next hour, money the user is owed and not yet confirmed, an in-progress bounty. The feature specs
  provide the items; this layer picks one and shows `还有 n 件` when more exist. Tapping it opens 悬赏,
  scrolls to the top and fans out the live-card stack.
- Minimised layout (system): selected tab at the left, accessory inline in the middle, 小貘 button
  at the right (spike screenshots 02, 06).
- The 小貘 button keeps the current tab selected; the sheet's suggestions depend on the tab
  (AskTapir and N3E boards).
- Home stage states: 有急事 (owes money), 进行中 (something live), 没事. Stage colour and mascot pose
  follow the state; layout does not. The stage is a moment area, so a large mascot is allowed
  there (KICKOFF 2026-10-11 F16; design-language.md to be updated).

### Direct payment (撮合付款)

Payee setup lives only in 我的 → 收款方式 (never sent in chat):

- DuitNow phone: E.164 `+60` number plus "银行显示的名字" (required). Footer: banks will show this
  name to payers.
- Bank account: bank picker, digits-only number, the same name field; masked to the last 4 digits.
- QR (TNG / DuitNow, Alipay 收钱码, WeChat 收款码): pick screenshot → decode → classify:
  DuitNow merchant-presented string with a valid CRC and no amount is accepted and shows the
  bank/wallet and the name from tag 59; Alipay or WeChat URL-form strings are accepted; all-digit
  strings matching paying-code formats are rejected with "这是付款码，不是收款码……" and not saved;
  dynamic (amount) DuitNow codes are rejected. Formats: 2026-10-06-payee-setup.md §1, §3.
- Cash in person: a toggle.
- Re-check prompt every 90 days and after a payer taps 付不了 (payee-setup §Recommended flow 6).

Pay step (opened by the feature when an item becomes payable):

1. Sheet 付给 {name}: amount (large), method picker limited to the payee's methods, each value with
   复制, a reference `TP-XXXX` with 复制, and "付款前核对：银行显示的收款人应该是 {name}".
2. 打开 {app}: opens the chosen app's home screen only, using links confirmed per app on device
   (payment-app-launch §7); otherwise the text "打开你的银行 App，选 DuitNow".
3. QR methods: the code full-screen with 存到相册 for scanning from another phone or the gallery.
4. 我已付款 with optional screenshot (stored privately, visible to both sides and moderators).
5. Payee sees "{name} 说已付款", taps 已收到 (settled) or 还没收到 (payer is reminded). Settlement
   triggers stickers, reviews, coin grants and reputation inputs.

Unpaid handling: reminders to the payer at 24 h and 72 h; after 7 days unpaid, or with 2 open
unpaid items, the payer cannot publish new bounties or rides until settled or a report is resolved
(KICKOFF 2026-10-05 "提醒 + 限制发布"; 2026-10-11 F3). Paying on time counts toward the payer's 靠谱度 (KICKOFF 2026-10-05).

### Reputation, reviews, stickers, mascot

- 靠谱度 inputs (rolling 180 days): settled items, distinct counterparts, completion rate with
  fault-based no-shows and cancellations, on-time payment, share of reviews without negative chips.
  Only structured chips count; free text never does. Tiers 新朋友 / 靠谱 / 很靠谱 / 貘友 with the
  reputation research thresholds; no school verification (KICKOFF 2026-10-11 F1, F2). Displayed
  as plain text badges plus the mascot-head row on profiles (RepBC board).
- Gates: a poster may require a minimum tier to apply; items paid in advance accept only applicants
  at 靠谱 or above (KICKOFF 2026-10-05).
- A drop is announced in a calm native sheet with the reason and how to recover, no sad mascot
  (reputation research Design B).
- Stickers: one per settled item for each side, typed by category; each adds growth; level unlocks
  cosmetics only. No-shows never lower the mascot level.

### 貘币

- Balance in 我的 and on the publish button (发布（本月免费第 n 条）/ 发布 · 1 颗).
- Purchase: native StoreKit sheet; the server verifies the transaction before crediting; restore is
  not applicable to consumables but credited purchases survive reinstall because the ledger is
  server-side.
- Weekly feed: tap 小貘 on the home stage once per calendar week (Monday 00:00 Malaysia time) for
  1 coin (KICKOFF 2026-10-11 F7).
- Insufficient balance at publish: sheet with the three packs and "下个月 1 号还有 3 条免费".
- Free monthly posts: 3 per calendar month shared by bounties and rides; a refunded free post
  restores its slot (KICKOFF 2026-10-11 F4, B7).

### 问小貘

- First use: consent screen naming Alibaba Cloud Model Studio (Singapore), purpose and data sent;
  consent stored with a timestamp (AGENTS.md). Declining keeps every manual path.
- The sheet hosts the 10 patterns from the AIPatterns board, with pattern ⑥ (permanent bar)
  replaced by the sheet itself: ① fill a form in place with undo until leaving the form;
  ② confirm card for anything with consequences; ③ half-sheet answers, pull up to continue as a
  conversation; ④ button follow-ups, one question at a time; ⑤ a per-item record of what 小貘 did;
  ⑦ voice (microphone button in the sheet; long-press pending a spike, F6); ⑧ screenshot, receipt and photo input, multiple items in one screenshot listed for choice;
  ⑨ one dismissible hint in the sheet's prompt, no push; ⑩ mascot size by screen class.
- Speech: on-device engines first, cloud Qwen ASR as fallback (AGENTS.md).
- 小貘体力: the Edge Function meters every cloud call by tokens and deducts energy; the sheet shows
  小貘's fullness, never tokens. Free energy refills at 06:00 Malaysia time (about 3 drafts or 30
  translated sentences) and unused free energy resets. When empty, the user feeds a 嫩叶 from the
  pantry (energy back to full) or exchanges 1 coin for 1 嫩叶; pantry food never expires. On-device
  Foundation Models calls consume nothing (KICKOFF 2026-10-11 F17, F14; canvas E2; UI confirmed when
  built).
- 小貘记得: list under 我的; each entry deletable; a switch to stop remembering.

### Chat

- One thread per bounty (poster + selected helper; applicants get a thread with the poster before
  selection — owned by the bounty spec) and per ride (all members).
- Text and images, both reportable (KICKOFF 2026-10-11 F8); long-press a message → 翻译 / 举报. 问小貘 can translate and draft replies
  (consuming 小貘体力); a draft is sent only on 发送.
- Safety: a fixed hint in new threads about deposits and paying outside the pay step; report and
  block on every profile and message (Guideline 1.2 per 2026-10-04-ai-providers.md §7).

### Notifications and Live Activities

- Provisional authorisation after onboarding; the explicit prompt right after the first post or
  application. Core use works with notifications off.
- Live Activity for the top in-progress item (ride countdown, helper on the way, payment due),
  glance-ranked, one sentence (craft detail 1; craft-inspiration shortlist 2).

### Craft details (tuned per feature, KICKOFF 2026-10-11)

1. Live Activity / Dynamic Island — this spec. 2. Old time struck through when a time changes —
   feature specs. 3. Published sticker flies to the live-card stack — bounty and carpool. 4. Photo cut
   out into a sticker — bounty. 5. Hold to confirm for selecting a helper — bounty. 6. Settlement
   celebration on every settle (superseded the rarity budget; see step 4's Implementation Record) — this
   spec, via the settlement event. Each follows design-language principles 9–11 and the motion gate in CLAUDE.md.

## Open points

None left for the user. The research spikes below gate their implementation steps and are listed
in Implementation order:

- In-app Dynamic Island: whether a Live Activity shows in the island while its own app is in the
  foreground (the G board assumes it). Device spike before the scroll strip relies on it.
- IAP library and server-side transaction verification (no first-party Expo IAP module chosen).
- Live Activity widget extension generated by a config plugin, with push updates.
- Long-press on the 小貘 search-slot button to start voice.

## UI/UX and motion

Design boards on the canvas (https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o): 「设计交付 · 第 2 步」 is the
handoff for step 2 (approved 2026-10-13); 「第一次打开 Tapiro」 concept A (floating sticker wall) is the chosen welcome (KICKOFF 2026-10-13). Colours are the
approved tokens (KICKOFF 2026-10-13: light per home G, dark D2, stickers S1). Native controls (tab bar,
sheets, glass, large titles) are drawn only to show position and content.

### Screens and states

| Screen                      | Design board                                                             | States to cover                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome and sign-in         | 「第一次打开 Tapiro」 A 漂浮贴纸墙 (a moment screen per design-language) | signed out; sign-in failed line; not configured (dev build)                                                                                                                   |
| Name, language (onboarding) | same board, styled after welcome A                                       | prefilled, empty, 40-character name, save failed                                                                                                                              |
| 悬赏 home frame             | 「设计交付 · 第 2 步」 H1–H5, D1–D2                                      | stage 有急事 / 进行中 / 没事; 1, 2, 3 live cards; stacked vs fanned out; scrolled (strip + minimised bar with the most-urgent item); bounty section placeholder; light / dark |
| 拼车, 消息 (placeholders)   | T1, T2, D5                                                               | empty state; most-urgent item shown above the bar; unread badge on 消息                                                                                                       |
| 我的                        | T3, D3                                                                   | profile header; settings entry (moved from the home toolbar)                                                                                                                  |
| 问小貘 sheet (stub)         | T4, D4                                                                   | opened from two tabs, tab stays selected, suggestions per tab, mic disabled                                                                                                   |
| Most-urgent strip           | T5                                                                       | each of the four item kinds in priority order; 「还有 n 件」; hidden when none; hidden at the top of 悬赏                                                                     |
| Settings, delete account    | step 1 screens (merged in PR #1)                                         | as built: language, sign out, delete, blocked with items                                                                                                                      |

Long copy runs in `ms`; `break-ui` worst-case data runs at the default text size in `zh-Hans` and `ms`, light and dark. Larger accessibility text sizes are not part of the pass (decision 2026-10-14, KICKOFF).

### Motion

| Motion                              | Purpose  | Trigger                                  | Duration token                                                           | Haptic / sound         | Reduce Motion         |
| ----------------------------------- | -------- | ---------------------------------------- | ------------------------------------------------------------------------ | ---------------------- | --------------------- |
| Live cards fan out / collapse       | layering | tap the stack, 摊开, or the strip        | `--duration-settle` (spring; parameters chosen with the user when built) | light haptic           | swap without movement |
| Stage collapses to the strip        | yield    | scroll (follows the finger)              | none, scroll-linked                                                      | none                   | swap at the threshold |
| Tab bar minimise / expand           | yield    | scroll down / tap the minimised tab      | system (`minimizeBehavior`)                                              | system                 | system                |
| Most-urgent strip appears / leaves  | alert    | an item appears / home cards scroll away | system (`bottomAccessory`)                                               | none                   | system                |
| 问小貘 sheet                        | summon   | tap the 小貘 button                      | system `formSheet`                                                       | system                 | system                |
| Press feedback on cards and buttons | feedback | touch down                               | `--duration-press`                                                       | none (frequent action) | dim only, no scale    |

Nothing else animates in step 2; the mascot is a static head until the Rive assets exist.

## Data flow and ownership

```
App (Expo Router)
 ├─ src/features/account, shell, payment, reputation, coins, ask, chat   (no cross-imports)
 ├─ src/lib/supabase  ── PostgREST + RLS, Realtime (chat, live items)
 ├─ src/lib/i18n
 ├─ modules/tapiro-kit ── speech, on-device AI, Live Activity bridge
 └─ widget extension (config plugin) ── Live Activity UI (the one exception, F12)
Supabase (ap-southeast-1)
 ├─ tables (owner → readers)
 │   profiles (self → everyone: public fields)
 │   payee_methods (self → payer of an item where self is the selected payee, until settled)
 │   payments (payer, payee → both; state: due → marked_paid → settled | disputed)
 │   reviews (author → both after reveal), reputation_snapshots (server → everyone: tier only)
 │   stickers, mascot_progress (server → self, public summary)
 │   coin_ledger (server → self), iap_transactions (server only)
 │   ai_energy and ai_pantry (server → self), ai_memory (self)
 │   threads, messages (members), reports, blocks (self → moderators)
 │   push_tokens (self → server)
 └─ Edge Functions
     ai-draft (energy metering, provider call), feed (coin → 嫩叶, 嫩叶 → energy), iap-verify (credit coins),
     settle (on 已收到: stickers, grants, reputation inputs, celebration flag),
     reputation-recompute (scheduled), notify (Expo Push), account-delete
```

- The server owns every number a user could inflate: coin balance, 小貘体力, stickers, levels, tiers.
  Clients write intents (mark paid, confirm received, publish) through RPC/Edge Functions; RLS
  denies direct inserts into server-owned tables.
- Feature tables (bounties, rides) reference `payments`, `threads` and the accessory feed through
  views the shell reads; the shell never imports feature code.
- Verify mode replaces the Supabase client, StoreKit, AI and push at their boundaries with fixtures.

## Errors and degradation

| Failure                                                  | User sees                                                | System does                                          |
| -------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Offline                                                  | Cached screens; actions disabled with 没有网络           | No queued payment or publish intents                 |
| Sign-in cancelled or token rejected                      | Stays on welcome with a one-line reason                  | Nothing stored                                       |
| QR has no code / is a paying code / is dynamic / bad CRC | Specific message (payee-setup §Recommended flow 4)       | Nothing saved                                        |
| Bank app not installed or no confirmed link              | 打开你的银行 App，选 DuitNow                             | No Safari fallback                                   |
| Payer says paid, payee sees nothing                      | 还没收到 → payer reminded; after 24 h 举报               | Item stays unsettled                                 |
| IAP verification fails or is pending                     | 购买处理中                                               | Credit only after verification; retry on next launch |
| AI provider error or timeout                             | 小貘晕了 face + manual path                              | No energy deducted                                   |
| 小貘体力 empty, no 嫩叶 and no coins                     | 小貘饿了: buy coins, wait for 06:00, or continue by hand | —                                                    |
| Push denied                                              | In-app badges and accessory still work                   | —                                                    |
| Account deletion blocked                                 | Which item is unsettled                                  | —                                                    |

## Known limits

- Tapiro cannot see whether money moved; settlement is the payee's word. Disputes go to a
  founder-run report queue.
- Banks publish no app links, so Tapiro never opens a bank app: bank and DuitNow payments get copy
  buttons and 「打开你的银行 App，选 DuitNow」. E-wallets (TNG, Grab, Alipay, WeChat) open to their
  home screen only, each link confirmed on a device before it ships (KICKOFF 2026-10-12).
- Alipay/WeChat receive-code rules and expiry are unverified (payee-setup §Open questions).
- Reputation tiers need real volume to tune; thresholds start low.
- Live Activity and speech are verified on a physical device only.
- The full onboarding (canvas 「新手引导 · 第三版」, 11 screens: try a bounty, peel the first sticker,
  places, explained permissions, school email) waits until the bounty, carpool, payment and
  reputation flows are stable (KICKOFF 2026-10-13). Until then first launch is welcome A → sign-in
  → name and language → home.

## Implementation order

1. Supabase project, migrations baseline, `src/lib/supabase`, sign-in, profile, account deletion;
   verify-mode auth fixture. Testable: verify case "sign-in → profile → delete".
2. Shell: NativeTabs, 小貘 search trigger and sheet stub, accessory with fixture items and the
   visibility rules, home G frame with fixture live cards. Testable: verify cases from the spike.
   Then welcome A replaces the step 1 sign-in screen, after its own design handoff.
3. Payee methods and QR classification (unit tests over real code strings).
4. Pay step and settlement state machine as a shared component driven by fixtures.
5. Spike: IAP library and server verification. Then coin ledger, IAP (sandbox), grants, refunds
   and the shared free allowance (unit tests on ledger rules).
6. Reviews, reputation recompute, stickers and mascot level.
7. Chat with report and block.
8. 问小貘: consent, `ai-draft`, 小貘体力 metering, pantry and feeding, voice (sheet microphone),
   image input, 小貘记得. Spike long-press on the 小貘 button.
9. Spikes: Live Activity extension via config plugin; in-app Dynamic Island. Then push and Live
   Activity.

Steps 1–4 plus the bounty prerequisites (a coin ledger without purchase, reputation level and no-show, the block list; bounty spec, 2026-10-26) unblock the bounty spec.

## Verification

- `bunx expo lint <files>`, `bunx tsc --noEmit`, `bun test`, `bun run format:check`,
  `node scripts/design-check.mjs`, `node scripts/check-specs.mjs --dir docs/specs`.
- Unit tests: QR classification (DuitNow MPM, dynamic, bad CRC, Alipay/WeChat URL, paying codes),
  ledger rules (shared free monthly posts, restored free slot on refund, 嫩叶 exchange, energy
  metering and daily reset, refunds, monthly grant cap), level curve,
  review reveal timing, reputation inputs.
- UI cases under `verification/ui`, light and dark, zh-Hans plus `ms` where copy is long: welcome
  and sign-in; tabs with accessory hidden/shown/minimised; 问小貘 sheet over two tabs; payee setup
  with a blocked paying code; pay sheet; settled celebration; review sealed state; coin purchase
  sheet; account deletion blocked and allowed. Screenshots for states, video for minimise and the
  sheet.
- Acceptance on a physical device: Apple and Google sign-in, push delivery, opening each supported
  payment app, speech in zh/en/ms, a Live Activity, an IAP sandbox purchase.

## Implementation Record (2026-10-14) — step 2: navigation shell and home frame

PR: not opened yet · Commits: a051454..4a620b6 (branch `feat/foundation-shell`). Steps 3–9 and welcome A are
not built; the spec stays `approved` until they are.

### What was built

- Palette tokens and the C1 mascot component. Evidence: `src/ui/theme/tokens.ts`, `src/ui/Mascot.tsx` (c28de87)
- Native tabs (悬赏, 拼车, 消息, 我的) with the 小貘 `role="search"` slot that opens the 问小貘 `formSheet` stub,
  `minimizeBehavior="onScrollDown"`, and the urgent `bottomAccessory` with priority and visibility rules. Evidence:
  `src/app/(tabs)/_layout.tsx`, `src/app/ask.tsx`, `src/features/shell/accessory.ts` (f3f39f1, 57ec546)
- Home G frame: mascot stage, live-card stack that fans out, pay / ride / bounty / calm cards, and the two-tier
  collapse strip under the compact bar. Evidence: `src/features/home/HomeScreen.tsx`, `src/features/home/cards/`,
  `src/features/home/stackLayout.ts` (2401871, 59da54b)
- `modules/tapiro-kit`, the first native module: `TitleHaloView` keeps a white halo on the 悬赏令 navigation title.
  Evidence: `modules/tapiro-kit/ios/TitleHaloView.swift` (68efbc6)
- The live-item contract shared by shell and home (and later bounty and carpool) lives in `src/lib`, so features do
  not import each other. Evidence: `src/lib/liveItems.ts`, `src/lib/useLiveItems.ts` (f32e33e, 40f6952)
- Worst-case layout per the 2026-10-14 decisions: accessory amount on the right and a `+N` pill, big numbers move
  below text only when it would exceed two lines, ride meet point and destination on separate lines, integer-sen
  money with thousands separators through `src/lib/money.ts`. Evidence: 937c4af, 08042ef, aea867b

### Deviations from the design

| Design said                                                | Shipped                                                                            | Why                                                       | Confirmed by                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| G board: hard white sticker outline on the 悬赏令 title    | Native large title plus a soft white halo (kit)                                    | System titles cannot take a hard stroke                   | user, 2026-10-13 ("B 原生 + 白色光晕")                        |
| Fan-out spring left open                                   | dampingRatio 0.8 at `--duration-settle`                                            | Chosen on the canvas                                      | user, 2026-10-13 ("2 稳一点")                                 |
| UI/UX: largest supported text size checked with `break-ui` | Worst-case data at the default text size, zh-Hans and ms, light and dark           | No users at accessibility sizes; acceptance runs at Large | user, 2026-10-14                                              |
| Accessory item carries a composed title                    | Structured `amountSen` shown right-aligned; `+N` pill; title holds action and name | The amount was truncated away with long names             | user, 2026-10-14 ("A")                                        |
| 小貘 line "记得付他"                                       | "记得付款"                                                                         | Gender-neutral, matches en and ms                         | user, 2026-10-14 ("A")                                        |
| Mascot animated with Rive                                  | Static C1 mascot (`react-native-svg`)                                              | No `.riv` assets yet                                      | not intent-changing (ledger ruling; swap the component later) |
| Money shown as "RM 15" in the demo                         | "RM 15.00" everywhere                                                              | One money format app-wide                                 | not intent-changing (ledger ruling)                           |

### Bugs fixed during implementation

- **Symptom:** scroll-to-top and accessory visibility were wrong on home.
  **Root cause:** `contentInset` is always 0 under automatic insets; the resting offset was never known.
  **Fix:** learn the resting offset at the first drag and use the header height (57ec546, `src/features/home/homeScroll.ts`)
- **Symptom:** the accessory appeared while fanned cards were still on screen.
  **Root cause:** the stack reported its stacked bottom, not its fanned bottom.
  **Fix:** report the fanned bottom (59da54b)
- **Symptom:** negative UI waits passed vacuously.
  **Root cause:** empty accessibility trees during transitions read as "element absent".
  **Fix:** `state()` raises `Transition` and `read()` needs two consistent reads (c2016e8)
- **Symptom:** home scrolled back to the top after a fling, once in about ten runs.
  **Root cause:** an outside pointer drag in the Simulator window, not the app (instrumented runs showed no
  app-initiated scroll). **Fix:** README warning (bedc872)
- **Symptom:** long payee names and stops broke the accessory and ride card (break-ui report).
  **Root cause:** single-line composed titles and an unshrinkable stops row.
  **Fix:** 08042ef, aea867b

### Verification

- `bun test` → 172 pass, 0 fail; `bunx tsc --noEmit`, `bun run format:check`, `node scripts/design-check.mjs`,
  `bun run lint -- <changed files>` → exit 0 (2026-10-14)
- UI cases `home_worst home_one shell_minimise` after the last fix → 10/10 pass light and dark (build 101 s, runs
  493 s); screenshots under `.verify/ui/`, before/after set attached to the PR
- Full `bun run verify:ui` at 4a620b6 → 72/74 pass in 31 min 47 s; the two failures passed on rerun
  (`account_flow` zh-Hans light: the typed name lost " Mo" after the space; `home_fan_out` ms light: an empty
  `axe describe-ui` error). Both are recorded as flaky in Known limits.

### Known limits

- Welcome A, payee methods, payment, coins, reviews, chat, 问小貘 and Live Activity are later steps (Implementation order 2–9).
- Stage art is static, slide-to-pay is inert until step 4, no location capsule; the 问小貘 sheet is a stub.
- Reduce Motion paths and the light haptic are implemented but not verified (`useLiveStack.ts`, `HomeScreen.tsx`).
- Halo has a brief gap on pop or tab return; nil compact appearances skip the halo (landscape only).
- `COMPACT_BAR = 54` verified only on the iPhone 17 Pro Simulator.
- Home keeps `minHeight: windowHeight * 2` until the bounty list lands; feed items will move to structured fields
  in the bounty spec (text limits recorded there and in carpool).
- VoiceOver announcement of the 消息 badge count is unverified.
- Flaky UI cases: `account_flow` typing can drop characters after a space; AXe `describe-ui` occasionally returns
  empty (also seen once in `account_onboarding_sign_out`). Not fixed in this step.

## Implementation Record (2026-10-15) — welcome A and onboarding restyle

PR: not opened yet · Commits: 51aa12c..0b76203 (branch `feat/welcome`). Steps 3–9 remain; the spec stays `approved`.

### What was built

- Welcome A: seven object stickers with white outlines that pop in 70 ms apart, drift on 6–8 s loops and hop when
  tapped (小貘's bubble names the example and VoiceOver announces it); the 170 pt C1 小貘 breathing; outlined wordmark
  and tagline; a sign-in panel that is part of the page and rises 0.9 s after appear; Reduce Motion fades only.
  Evidence: `src/features/account/WelcomeScreen.tsx`, `WelcomeHero.tsx`, `WelcomeSticker.tsx`, `welcomeMotion.ts` (203e361)
- Layout fitted to the measured panel: on short screens or long copy the low stickers drop and the hero lifts.
  Evidence: `src/features/account/welcomeLayout.ts`, `welcomeLayout.test.ts` (bc1384f)
- Real `AppleAuthenticationButton` (black in light, white in dark) and a Google button per Google branding; a failed
  or cancelled sign-in shows one line in the panel. Evidence: `src/features/account/SignInButtons.tsx`, `SignInPanel.tsx`
- Name and language steps on the moment background with a small 小貘 head and bubble; native controls unchanged.
  Evidence: `NameStep.tsx`, `LanguageStep.tsx` (203e361, c60138c)
- Draft 《用户协议》 and 《隐私政策》 as page sheets linked from the welcome terms line, three locales, facts limited to
  this spec. Evidence: `src/app/legal/`, `src/features/account/LegalDocument.tsx`, `TermsLine.tsx` (f91329b, b573022, 0b76203)

### Deviations from the design

| Design said                                               | Shipped                                                      | Why                                     | Confirmed by                                          |
| --------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------- |
| Accounts: "name and avatar (prefilled from the ID token)" | Name step shows no avatar; the sign-in avatar is still saved | Board 「名字页头像」 option A           | user, 2026-10-15 ("A A")                              |
| Terms line names documents that do not exist              | Draft in-app legal pages opened as sheets                    | Board 「协议页面怎么打开」 option A     | user, 2026-10-15 ("3 现在就做两个简单页面", "A A")    |
| Canvas panel radius 34 pt, smaller panel text             | 24 pt radius (system sheet), subline 15 pt, terms 13 pt      | Match system sheets; readability        | not intent-changing (shown at walkthrough 2026-10-15) |
| Tagline with white outline                                | No outline in dark mode                                      | The outline clotted CJK strokes in dark | not intent-changing (review finding)                  |

### Bugs fixed during implementation

- **Symptom:** in Malay on a 667 pt screen the tagline would sit under the sign-in panel.
  **Root cause:** the layout assumed a fixed panel height. **Fix:** measure the panel and lay out above it (bc1384f)
- **Symptom:** UI waits for a settled panel could pass in the 0.9 s before it rises.
  **Root cause:** the wait checked the panel frame, which exists off screen. **Fix:** wait for the Apple button on screen (c2c71bc)

### Verification

- `bun test` → 3037 pass; `bunx tsc --noEmit`, `bun run lint -- <changed files>`, `bun run format:check`,
  `node scripts/design-check.mjs` → exit 0 (2026-10-15)
- Full `bun run verify:ui` → 90/90 pass in 41 min 14 s (build before 0b76203); `welcome_legal` after 0b76203 → 4/4
  light and dark, zh-Hans and ms. New cases: `welcome_a`, `welcome_legal`, `onboarding_moment`, `onboarding_language_moment`.

### Known limits

- iPhone SE size is covered by unit tests only (the runner has one iPhone 17 Pro Simulator); Reduce Motion and the
  sign-in failure line are not exercised by a UI case.
- Legal pages are drafts: wording, a real contact address and review are required before App Store release.
- en and ms copy (including "Tapir Ingat", "syiling") needs a native-speaker review.

## Implementation Record (2026-10-15) — step 3: payee methods and QR classification

PR: not opened yet · Commits: a5b912a..883540a (branch `feat/payee-methods`). Steps 4–9 remain; the spec stays `approved`.

### What was built

- `payee_methods` (one table, `type` enum incl. `cash`), owner-only RLS, one default per user (partial unique
  index), first transfer method becomes default and the oldest remaining one is promoted on delete,
  `set_default_payee_method` RPC, `checked_at` refreshed whenever the QR string is re-picked, cascade with the auth
  user. Evidence: `supabase/migrations/20261015000000_payee_methods.sql`, `supabase/tests/payee_methods.test.sql` (a5b912a)
- Pure TS QR classifier: EMV TLV, CRC-16/CCITT-FALSE, DuitNow AID, `01`=`12` and tag `54` rejected, MCC ≠ `0000`
  labelled business, acquirer names from payee-setup §3, Alipay `qr.alipay.com` and WeChat `wxp://` receive codes,
  WeChat `weixin://wxpay/` merchant order codes rejected (2 h expiry), Alipay/WeChat paying codes blocked, and DuitNow
  consumer-presented codes blocked by their `hQVDUFYw` prefix **[I]** (base64 of the EMV CPM header; the EMVCo spec was
  not reachable). TLV lengths count characters (HKMA Common QR Code Specification §2); the CRC runs over UTF-8 bytes. Evidence: `src/features/payee/classifyQr.ts`, `emv.ts` (a5b912a)
- 我的 → 收款方式: native grouped list, + menu, page sheets per type, screenshot pick (`expo-image-picker`, no Photos
  usage string) and the system scanner (`expo-camera` `launchScanner`), confirm step, red error card, yellow re-check
  banner and 我的 red dot. Evidence: `src/features/payee/`, `src/app/payee/` (a441140)

### Deviations from the design

| Design said                           | Shipped                                                                                                                                                             | Why                                                                     | Confirmed by                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| Cash in person: a toggle              | Toggle backed by a `cash` row in `payee_methods`                                                                                                                    | Profiles are public; a profile flag would leak it outside the pay step  | not intent-changing                  |
| Reject dynamic (amount) codes         | Also rejects static codes that carry tag `54` (fixed amount)                                                                                                        | Every payment amount differs; PayNet's own P2P example carries RM 10.00 | not intent-changing                  |
| Bank picker                           | Five banks from payee-setup §3 plus 「其他银行」 with a typed name (no bank code)                                                                                   | Only those acquirer IDs are sourced                                     | user, 2026-10-15                     |
| + menu: DuitNow, bank, QR, cash       | 支付宝收钱码, 微信收款码, TNG 收款码 first, then 「其他」 (DuitNow, bank, cash); per-wallet save steps; a code from another wallet is accepted after a confirm line | Students mainly use Alipay, WeChat Pay and TNG                          | user, 2026-10-15 (PayeeWalletMenu A) |
| Alipay/WeChat accepted as URL strings | Also require the name the wallet shows (no case change), shown to payers as `{name} · 支付宝/微信`                                                                  | Codes carry no payee name, so payers could not check who they pay       | user, 2026-10-16                     |
| Re-pick a QR                          | A code of another type replaces the row in one RPC (`replace_payee_qr`), keeping default and position                                                               | Row shape is per type; `type` is not client-updatable                   | not intent-changing                  |

### Verification

- `bun test` → 272 pass; `supabase test db` → payee_methods 43/43, profiles 23/23; `test:stack` → 12 pass (payee
  service incl. QR replacement and 其他银行, account-delete with payee rows cascading); `tsc`, lint on changed files,
  `format:check`, `design-check` → exit 0 (2026-10-15)
- UI cases `payee_list`, `payee_add_duitnow`, `payee_qr` → 12/12 pass light and dark, zh-Hans and ms at 6f2cee2;
  `payee_long` (seven worst-case methods, last row above the accessory after scrolling) and `payee_list` rerun after
  the fixture follow-ups
- After walkthrough (2026-10-16): `bun test` 281 pass; `supabase test db` 69/69; payee and account integration 8/8;
  main-path cases `payee_qr_alipay`, `payee_qr_wechat` and the real-picker case `payee_qr_real` (images added with
  `simctl addmedia`, picked in the system picker) pass with `payee_qr` and `payee_list` in their locales, light and dark

### Known limits and follow-ups

- Payer visibility (payer of an item where this user is the selected payee, until settled) is not in RLS yet; it
  comes with step 4's `payments` table.
- The "付不了" re-check trigger arrives with step 4; `checked_at` is stored now.
- The per-wallet save steps (Alipay 首页「收钱」, WeChat 「收付款 → 二维码收款」, TNG Receive) need confirming on a device.
- Camera scanning is device-only; screenshot decoding is exercised by `payee_qr_real` in the Simulator.
- Chinese masked wallet names (for example "*明") cannot be typed by AXe; check on a device. Alipay/WeChat receive-code formats remain heuristics (payee-setup §Open questions).

## Implementation Record (2026-10-25) — step 4: pay step and settlement

PR: not opened yet · Commits: 5810e58, c748860, 3324cf8 (branch `feat/payment`). Steps 5–9 remain; the spec stays `approved`.

### What was built

- `payments` (item kind + id, title snapshot, payer, payee, `amount_sen`, `TP-XXXX` reference, state, method, proof,
  `reverses`, `nudged_at`) changed only through RPCs: `mark_payment_paid`, `undo_marked_paid`,
  `confirm_payment_received` (returns `firstSettled`), `report_not_received`; `open_payment`, `open_reverse_payment`
  and `set_payment_amount` are service-role only. Every change logs a `payment_events` row; `settled` is the
  interface for steps 5–6. Payer reads the payee's `payee_methods` while a payment between them is unsettled.
  `publish_blocked()` and `src/lib/unpaid.ts` implement the 7-day / 2-open rule. Evidence:
  `supabase/migrations/20261025000000_payments.sql`, `supabase/tests/payments.test.sql` (61 tests) (5810e58)
- CNY reference from Bank Negara Malaysia: `fx-rate` Edge Function stores the 17:00 CNY middle rate in `fx_rates`,
  scheduled 17:30 Malaysia time by pg_cron; proofs are removed 30 days after settlement by `payment-proof-cleanup`.
  Evidence: `supabase/functions/fx-rate/`, `supabase/functions/payment-proof-cleanup/`,
  `supabase/tests/fx_rates.test.sql` (5810e58)
- Account deletion reads real unsettled payments; a failed check answers 500. Evidence:
  `supabase/functions/account-delete/index.ts`, `account-delete.integration.ts` (5810e58)
- Pay sheet (`src/features/payment`, route `src/app/pay/[id].tsx`), payee side, celebration, QR image from the kit
  (`modules/tapiro-kit/ios/QrImage.swift`), Photos add-only save (c748860); home 去付款 and payment-driven live items
  (3324cf8). Evidence: UI cases `pay_*` under `verification/ui/cases/`.

### Deviations from the design

| Design said          | Shipped                                                                                                  | Why                                                      | Confirmed by                            |
| -------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| Method picker        | Single-select list, wallets first, one method preselected, none preselected otherwise                    | Canvas 「付款 · 开工前六件事」 ①C                        | user, 2026-10-16 ("1c 其他都走推荐")    |
| 打开 {app}           | `WALLET_LINKS` table, every link unconfirmed, so the sheet shows 存到相册 + a per-wallet hint            | Links ship only after a device check (Known limits)      | not intent-changing                     |
| Amount in RM         | RM plus 约 ¥（参考） for Alipay/WeChat at the BNM middle rate, hidden without a rate ≤ 7 days old        | Most students pay from mainland accounts (product notes) | user, 2026-10-15 (2B), 2026-10-26 (BNM) |
| Settlement           | Cash settles from `due` on the payee's 已收到 alone; reverse payments for cancelled prepaid items        | Product answers 3B, 4B                                   | user, 2026-10-15                        |
| Payer after 我已付款 | A quiet `waitingConfirm` item (等 {name} 确认, lowest priority) until settled; 欠款 again after 还没收到 | Data integrity: show progress until the outcome is known | controller ruling C, 2026-10-25         |
| Celebration motion   | Spring pop (`--duration-peel`, damping 0.6) and one 8-spark burst; Reduce Motion fades                   | Canvas ⑥A left the numbers open                          | Unverified: needs the user's pick       |

### Verification

- `bun test` 346 pass; `supabase test db` 4 files, 135 tests; `bun run test:stack` incl.
  `src/features/payment/paymentService.integration.ts` (3) and the real-payment deletion block.
- Fix round (controller review): load states in the live-item contract, proof deletion for drafts and undo, proof
  reuse on retry, payee proof viewer, reference retry on unique violation, proof existence check; pgTAP 70 in
  `payments.test.sql`.
- UI, zh-Hans light, run once: `pay_sheet_wallets`, `pay_sheet_duitnow`, `pay_sheet_cash`, `pay_sheet_none`,
  `pay_mark_paid_undo`, `pay_payee_confirm`, `pay_first_settle`, `pay_card_button`; smoke; and the home, shell,
  account and payee cases touched by the live-item change.

### Known limits and follow-ups

- Push reminders at 24/72 h (step 9), the report entry after 24 h (step 7, placeholder text) and the publish block
  UI (bounty/carpool publish) are not wired; `reminderDue`, `publishBlocked` and `publish_blocked()` are ready.
- BNM dataset terms do not name exchange rates explicitly. The pg_cron jobs need the Vault secrets `project_url` and
  `service_role_key` per environment.
- No network-state detection: offline actions fail with 没成功 and keep the input (an uploaded screenshot is reused on
  retry). A failed or stale payments load shows 付款信息没加载出来 · 重试 on home (`home_payments_failed`); the bottom
  accessory shows nothing for that source meanwhile.
- Moderators have no access path to proofs until reports (step 7).
- Unsettled payments of a cancelled item have no exit until bounty/carpool cancellation exists.
- Device only: wallet links, saving to Photos with add-only access and scanning from the album, haptics.

### Settlement celebration and sticker book (2026-10-26)

Decisions: KICKOFF 2026-10-26 (celebration G final, read-only sticker book now, haptic only, `stickers` table now,
car sticker for rides and 小貘 sticker for bounties until categories exist, three columns). Branch
`feat/settle-celebration`.

- `stickers` (owner, unique `payment_id`, `item_kind`, nullable `category`, title snapshot, `earned_at`), select-own RLS,
  no client writes, owner cascade on account deletion. `confirm_payment_received` is replaced in a new migration: it
  inserts the payee's sticker in the settle transaction (`on conflict (payment_id) do nothing`), skips reverse payments,
  and returns `{ state, firstSettled, stickerCount }`; `firstSettled` is now "this settle earned the first sticker".
  Settled payments from before the table get their stickers in the migration. Evidence:
  `supabase/migrations/20261026000000_stickers.sql`, `supabase/tests/stickers.test.sql` (17),
  `src/features/payment/paymentService.integration.ts`.
- Client: `src/lib/stickers` (model with the single art mapping `stickerArt`, Supabase and fixture services, store with
  loading / failed / ready); `src/ui/EarnedSticker.tsx`, `src/ui/InkText.tsx`.
- Celebration on every payee settle (`src/features/payment/celebration/`), shown in a full-screen modal over the pay
  sheet: receipt card, sticker peel and arc flight into the book slot, headline odometer, CNY line from the BNM rate
  (hidden without a rate ≤ 7 days old), panel with 小貘, confetti, badge and count roll on the first settle only, one
  success haptic at landing, tap to skip, Reduce Motion fade, one VoiceOver announcement. 看看贴纸本 opens the book.
- Sticker book: `src/features/stickers`, route `src/app/(tabs)/me/stickers.tsx`, Me row 我帮过的忙 · n 张 above 收款方式.

| Design said                                     | Shipped                                                                                                     | Why                                                            | Confirmed by                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- |
| Reanimated `withDelay` + `withTiming` per value | One linear clock (`withTiming` 0 → 2600 ms) with the canvas keyframes and cubic-béziers evaluated per frame | Tap-to-skip jumps one value to the end; all parts stay in sync | not intent-changing                          |
| Sticker and amount shine                        | Gradient bar with `mixBlendMode` (soft-light / overlay), clipped to the sticker box and the amount row      | No mask view in the project                                    | Unverified: needs the user's look on device  |
| Canvas liftShadow, slot ghost art               | Not built                                                                                                   | Not in the brief; the sticker keeps its own shadow             | not intent-changing                          |
| Earlier slots show previous stickers            | Shown when the sticker list is loaded; otherwise filled paper slots without art                             | Never show unknown as empty (Data integrity)                   | not intent-changing                          |
| Reverse payment settle                          | No celebration, no sticker; the sheet shows 已结清                                                          | A refund is not an earned errand                               | Unverified: confirm when cancellation exists |

Verification: see the PR; `bun test`, `supabase test db` (stickers 17/17, payments 70/70), `bun run test:stack`, UI cases
`pay_first_settle`, `pay_payee_confirm`, `pay_settle_routine`, `sticker_book`, `sticker_book_empty` (zh-Hans light).

Known limits: device-only checks (haptic, Reduce Motion, VoiceOver announcement, motion feel); no UI case injects a
failed sticker load; stickers for the payer side and categories come with steps 5–6.

### Payment walkthrough fixes (2026-10-26)

Decisions: KICKOFF 2026-10-26 (walkthrough "1A 2A 3A 4A"). Branch `fix/pay-walkthrough`.

- 1A: the pay sheet's main action is a primary `PillButton` pinned under the form (`SheetFrame.tsx`, safe area plus
  8 pt): 已收到 for the payee with 还没收到 as a plain text button under it (cash: 已收到 only), and 我已付款 for the payer,
  which used the same row pattern. 撤回「我已付款」 stays a row. Busy and failure handling is unchanged.
- 2A: the celebration lays out headline, 小貘 and the book as one group centred above the buttons; the panel rises as
  before and then moves up by the measured lower spacer during the flight (`TIMELINE.converge`, 500 + 520 ms, the X
  flight curve). The flight targets the slot's final position. The receipt starts 16 pt below the safe area instead of
  66 pt below the headline so it falls clear of the rising book.
- 3A: the new sticker lands in slot 0; up to five earlier stickers shift one slot forward (`TIMELINE.shift`, 460 + 220 ms,
  transforms only) and the slot that receives the last card fades its outline. Unknown count: no target, no shift.
  Evidence: `src/features/payment/celebration/model.ts`, `celebration.test.ts`.
- 4A: the sheet title is 收款 / Get paid / Terima bayaran for the payee (`pay.sheet.titlePayee`, `sheetTitleKey`).

Verification: `bun test`; UI cases `pay_payee_confirm`, `pay_first_settle`, `pay_settle_routine`, `pay_mark_paid_undo`
(zh-Hans light and dark), `pay_first_settle` and `pay_settle_routine` also en and ms. The cases assert the pinned
buttons, the 收款 title, the landed tint in slot 0 with earlier stickers after it, and a subtitle-to-book gap under
130 pt (the old layout left about 250 pt).

Review fixes: the celebration group sits in a flex stage above the buttons, so the buttons always keep their place;
on a short screen the gap shrinks to 小貘's overhang and then the group scales down (`groupLayout`, unit-checked for
667 pt). An unknown role shows no sheet title. One `SheetFrame` stays mounted across sheet states and views hand
their buttons to it through `SheetActions`; the pinned buttons show a spinner while their action runs. From the
seventh sticker on, the sixth earlier sticker fades out during the shift.
The pinned bar shortened the Form enough that SwiftUI no longer realized the row holding the full-screen QR `Modal`,
so 用另一台手机扫 stopped opening (`pay_sheet_wallets`); sheet modals now mount outside the Host through `SheetLayer`.

## Implementation Record (2026-11-06) — step 7: chat with report and block

PR: #63, #72, #74, #75, #76, #77, #79 and `feat/chat-entries` (this PR) · Plan: `docs/plans/2026-10-30-chat.md` (done).
Steps 5, 6 and 8 remain; the spec stays `approved`.

### What was built

- Server: `threads`, `thread_members` (with `left_at`), `messages`, `reports` with members-only RLS; threads created by
  triggers at a bounty's `assigned` and a ride member's acceptance; `list_threads`, `read_thread`, idempotent
  `send_message`, `report`, `mark_read`, `unread_threads`; block rules; `chat.message` / `chat.read` events and push
  copy; report snapshot retention (one year); private `chat-images` bucket and its sweep. Evidence:
  `supabase/migrations/20261103000200_chat.sql`, `20261103000300_chat_push.sql`, `20261105000200_report_snapshot_retention.sql`,
  `20261106000000_chat_read_state.sql`, `20261106000100_chat_thread_item.sql`, `20261106000200_chat_block_state.sql`,
  `20261106000300_chat_images.sql`; pgTAP `supabase/tests/chat*.test.sql`, `report_retention.test.sql`, `push_kinds.test.sql`
  (#63, #72, #75–#77, #79)
- Client `src/features/chat/`: service, fixture service, store with the device outbox and drafts, live handler and the
  消息 badge (#72); 消息 tab list (#75); thread screen with the item card, safety card, delivery states, the kit's
  `ContextMenuView`, 已读 in bounty threads (#74, #76); report sheet, thread ⋯ menu, block footer and folded group
  messages (#77); image messages with the ＋ menu, Quick Look viewer and image cache (#79).
- Entries (126 A, this PR): 发消息 on the bounty status screen (`src/features/bounty/status/StatusActions.tsx`,
  `timeline.ts` `hasThread`) and the home in-progress card (`src/features/home/cards/BountyCard.tsx`, `chat` on
  `BountyCardDetail` from `src/features/bounty/live/liveBounties.ts`); 群聊 in the ride detail's navigation bar
  (`src/features/ride/detail/DetailMenu.tsx`, `detailModel.ts` `hasThread`); thread lookup through the chat facade
  (`src/features/chat/itemThreads.ts`, `useItemChat.ts`, `findThread` on `threads` under RLS).
- Runner: verify record keys are deleted before each launch (`verification/ui/records.py`, `test_records`).

### Deviations from the design

| Design said                                              | Shipped                                                                                                               | Why                                                    | Confirmed by                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Applicants get a thread with the poster before selection | A bounty thread opens at `assigned`; an application carries one short note                                            | Bounty decision 8A                                     | owner, bounty spec 8A                           |
| Long-press → 翻译 / 举报                                 | 复制 / 举报; 翻译 and 问小貘 drafts arrive with step 8                                                                | 小貘体力 and the AI path are step 8                    | owner, 2026-11-05 (121 A)                       |
| Report and block on every profile                        | No profile screen; 举报 / 屏蔽 in the thread ⋯ menu and on each message                                               | A profile has no content until reviews (step 6)        | owner, 2026-11-05 (127 A)                       |
| (not in the design) read receipts                        | 已读 under your newest message, bounty threads only                                                                   | Urgent errands decide between waiting and calling      | owner, 2026-11-05 (125 B)                       |
| (not in the design) entry points                         | 发消息 on the status screen and home card; 群聊 in the ride detail's bar; hidden until a thread exists                | Canvas 126 A; ride entry not drawn                     | owner 126 A; ride placement ★ default, for veto |
| UI details beyond the answers                            | The ★ defaults in the plan's defaults sections (server, client core, list, thread, report and block, images, entries) | Owner: 「都按推荐」, decide UI details and record them | ★, accepted by the owner 2026-11-06             |

### Bugs fixed during implementation

- **Symptom:** a UI case read the previous launch's fixture calls. **Root cause:** the app resets its record keys at
  launch, but NSUserDefaults reaches the plist seconds later. **Fix:** the runner deletes the keys by container plist
  path before each launch (`verification/ui/records.py`, this PR).
- **Symptom:** a second tap on the home card's busy 发消息 pushed the status screen. **Root cause:** a disabled inner
  Pressable does not take the responder, so the touch reached the card. **Fix:** the pill stays enabled; the hook
  ignores taps while a lookup runs (`src/features/home/cards/BountyCard.tsx`, this PR).
- Earlier steps' bugs are in their retros: `docs/retros/2026-11-06-chat-*.md`.

### Verification

- Fast checks on this PR: `bun test` 2085 pass; `bunx tsc --noEmit`, `bun run lint:changed origin/main`,
  `bun run format:check`, `check-specs`, `check-story-map`, `check:size`, `design-check` pass; runner unit tests
  (67, incl. `test_records`) pass; pgTAP `supabase/tests/chat.test.sql` 82 pass (local database).
- Chat milestone run (2026-11-06, this branch's verify build), 103 runs, selected from what changed across #72–#79 and
  this PR: every `chat_*` case (27) in zh-Hans light and en light; dark for bubbles, sheets, the viewer, the list and
  the entries (16); ms for the cases with long copy (12 chat, plus `bounty_status_poster`, `bounty_status_worst`,
  `home_worst`); `shell_tabs`, `live_notice_tap`, the status (`bounty_status_poster/helper/states/worst`), home
  (`home_bounty_cards`, `home_three_cards`, `home_worst`, `home_worst_inline`, `home_fan_out`, `home_live`,
  `home_one_card`, `live_home_card`) and ride detail (`ride_detail`, `ride_detail_organiser`, `ride_detail_worst`,
  `ride_meetup`) cases the entries touch, zh-Hans light. All pass except `home_fan_out` (closest hidden check 74.7 pt
  from the bar, limit 60; already open on iOS 27.2 at 70.7 pt, `docs/retros/2026-11-03-expo-sdk-58.md`). Reruns:
  `chat_block_refused` (case waited for the first call, then passed), `chat_list_failed` and en `chat_block_refused`
  (dropped taps), dark `chat_block_peer` (spinner missed under load average 30–140) and seven ms runs that timed
  out creating the automation session; all passed on rerun.
- Screenshots: `docs/research/evidence/2026-11-06-chat-entries/`; earlier steps' evidence in the sibling
  `2026-11-06-chat-*` folders.

### Known limits

- Push delivery waits on the paid Apple Developer account (`RecordingSender` until then); the lock-screen preview never
  shows message text.
- Device checks: keyboard feel and the 5-line composer, the context menu preview and VoiceOver order, the camera, Quick
  Look gestures, pasting a copied photo, the VoiceOver custom action 发消息 on the home card.
- An organiser whose riders all left keeps the thread but loses 群聊 (the thread stays in 消息).
- Secondary pills in the status screen's pinned bar are translucent over scrolled content (also 有问题, before this
  step).
- No admin tool for the report queue (`private.report_queue`, service role only).

## Implementation Record (2026-11-07) — step 6 and the account-free part of step 5: reviews, reputation, mascot level, coins in 我的, weekly feed, invites

PR: #85, #87, #88, #90–#98, and `chore/reputation-wrap-up` (this PR) · Plan: `docs/plans/2026-11-06-reviews-profile-coins.md`
(done). Research: `docs/research/2026-11-06-reviews-profile.md`. The IAP spike and purchases of step 5 wait on the paid
account, and steps 8 and 9 remain; the spec stays `approved`.

### What was built

- Server (#85): `reviews`, `review_replies`, `tier_drops`, `mascot_progress`, `weekly_feeds`, `invite_codes`, `invites`
  with RLS on and no client grants; every read and write a `security definer` RPC; the review share in 靠谱度; review
  signals through the `events` outbox (#87). Evidence: `supabase/migrations/20261106000400_reviews.sql` to
  `20261106001000_ride_review_details.sql`; pgTAP `supabase/tests/reviews.test.sql`, `reputation_reviews.test.sql`,
  `mascot_profile.test.sql`, `review_signals.test.sql`, `ride_review.test.sql`, `ride_settle_review.test.sql`,
  `weekly_feed_invites.test.sql`.
- Client core (#87): `src/features/reputation/` and `src/features/coins/` with services, fixture services, stores that
  never show a failed load as empty, a live handler, and copy in zh-Hans, en and ms.
- Review sheet with the envelope seal (#93, 239 A, 240 A, 244 A, 257 a1); review entries under 已结清, on a closed ride
  and on home (#94, 238 A, 241 A, 242 A). Cases `review_sheet*`, `review_entry_*`.
- Profile, 全部评价, 回复, ⋯ 举报 / 屏蔽, five entries and the gone state (#88, 243 A, 245–247 A). Cases `profile_*`.
- Tier-drop sheet (#90, 248 A). Cases `tier_drop_*`.
- 小貘 grows on the stage, 「小貘长大的时刻」, the accessory picker (#95, 249 B, 250 A, 257 b1). Cases `mascot_*`.
- 貘币 row and page (#91, 251 A, 252 A); 邀请朋友 (#92, 255 A); the weekly feed on the stage (#96, 253 A, 254 A, 257 c1).
  Cases `coins_page*`, `invite_*`, `weekly_feed*`.
- 258 A (#97): a closed ride counts as settled toward 靠谱度 with or without a Tapiro payment, one row per organiser–rider
  pair, a lone organiser one settled item and no person, counted back from the close.
  `supabase/migrations/20261107000000_rides_count_settled.sql`, `supabase/tests/ride_settled_reputation.test.sql`.
- 259 A (#98): long-press a review on a profile or 全部评价 to report it; a snapshot of face, chips and sentence follows
  the report retention; sealed reviews and the author cannot report. `supabase/migrations/20261107000100_report_review.sql`,
  `supabase/tests/report_review.test.sql`, cases `profile_report_review*`.
- Fixes the screens rely on: the whole pinned bottom bar is opaque (#99, case `bounty_bar_opaque`); selected chips and
  the home status bar readable in dark, review and coin paging around a reload (#100, cases
  `bounty_post_selected_chips`, `home_status_bar`).

### Deviations from the design

| Design said                                                  | Shipped                                                                                                                                 | Why                                                                        | Confirmed by                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| 靠谱度 inputs include on-time payment                        | The on-time share stays in the snapshot and gates no tier                                                                               | The tier thresholds of 2026-10-27 (`private.tier_for`) stay                | plan 「Decided」, story `rep.tier.inputs`   |
| A settled item is a settled payment                          | A closed ride counts with or without a Tapiro payment                                                                                   | A Grab-split ride would never count; the farming this opens is in the plan | owner, 2026-11-06 (258 A)                   |
| Invite: 3 to each side after the friend's first settled item | After the friend's first item with someone other than the inviter                                                                       | Plan 「★ Server defaults」, the reward rule                                | ★ server default, accepted 2026-11-06       |
| Purchase through a StoreKit sheet                            | 买貘币 is not shown; IAP not built                                                                                                      | Waits on the paid account                                                  | owner, 2026-11-06 (252 A)                   |
| (not in the design) ride reviews on public profiles          | Others read only 「拼车」, without route or reviewer                                                                                    | A ride's start can point at a home                                         | owner, 2026-11-06 (256 A)                   |
| (not in the design) reporting a review                       | Long-press 举报 on a shown review                                                                                                       | A review sentence is public free text                                      | owner, 2026-11-06 (259 A)                   |
| Lv2–5 accessories hand drawn                                 | Stand-in art for 小红帽, 书包, 雨伞, 围巾; replaced by 93 A crayon art on 2026-11-16 (drawing task, plan G6)                            | The art was a separate drawing task, scheduled by owner question 13 C      | plan gap 5                                  |
| UI details beyond the answers                                | The ★ defaults in the plan's sections (server, client core, review, entries, profile, tier drop, mascot, coins, feed, invite, 258, 259) | Owner: decide UI details and record them                                   | ★; Tasks 1, 2, 5, 6 accepted, the rest veto |

### Bugs fixed during implementation

- **Symptom:** 留着草稿 and 放弃 reopened the alert. **Root cause:** a prevented navigation action is prevented again; the
  Expo Router `usePreventRemove` hands the callback `repeat()`. **Fix:** #93, `docs/retros/2026-11-06-review-sheet.md`.
- **Symptom:** a review report would merge with a person report and could block account deletion. **Root cause:**
  `reports_person_once` covered every row with no message; a nulled foreign key collided. **Fix:** #98,
  `docs/retros/2026-11-07-report-review.md`.
- **Symptom:** a fast `fed` answer let a second tap replace the thanks with 吃饱啦. **Root cause:** the tap guard followed
  the request. **Fix:** `createFeedGate`, #96, `docs/retros/2026-11-07-weekly-feed.md`.
- **Symptom:** selected chips at 1.15:1 in dark, a white clock over the home stage, 全部评价 paging that could stop for
  good. **Fix:** #100, `docs/retros/2026-11-07-dark-selected-and-paging.md`.
- Other steps' bugs are in their retros: `docs/retros/2026-11-06-{rep-client-core,profile,tier-drop,coins-page,invite-page,review-sheet,review-entries}.md`,
  `docs/retros/2026-11-07-{mascot-level,rides-count-settled}.md`.

### Verification

- Fast checks on this PR: `bun test` 2268 pass; `bunx tsc --noEmit`, `bun run lint:changed origin/main`,
  `bun run format:check`, `check-specs`, `check-story-map`, `check:size`, `design-check` pass. pgTAP not rerun: no SQL
  here; the last full local run is in `docs/status.md`, and #97 and #98 ran their own files.
- Copy: every key of the zh-Hans, en and ms objects (1841) exists and is non-empty in all three, with the same
  placeholders.
- Milestone run on current main (2026-11-07; app built from 737d582; the selection and reasons are in
  `docs/retros/2026-11-07-reputation-wrap-up.md`): zh-Hans light 90 cases and zh-Hans dark 25 all ended in a passing
  assertion. Three of the light ones (`mascot_accessory_failed`, `profile_entry_detail`, `sticker_book_labels`) and dark `review_sheet` lost only
  their recording on the last run. en light: 6 of 13 before the time limit; ms: not reached. No product bug found. `verify:smoke` 4 of 4.
- First-run failures, all rerun: automation-session timeouts (a stuck `Tapiro Verify`, load up to 175);
  `sticker_book` (a 0.3 s swipe no longer pages on iOS 27.2; the case now swipes for 0.8 s);
  `mascot_level_collapsed` and `home_settled_collect` under load (passed alone with `--workers 1`);
  `profile_entry_ride` (a dropped tap on the back button).

### Known limits

- `rep.reviews.live` has no UI case: the review fixture does not change on a signal, so the reload of an open screen is
  covered by unit and pgTAP only (`docs/story-map.md`).
- Device checks: the seal's motion and haptic, the grow and chew motion, VoiceOver actions on the stage, the share sheet.
- 258 A opens farming through Grab rides with friends (plan, 「★ 258 defaults」); tuned after launch.
- A reload that shrinks a long list may need a scroll to page again (`docs/status.md`, Queue).
- No admin tool for the report queue (`private.report_queue`, service role only).

## Implementation Record (2026-11-15) — step 8: 问小貘

PR: #106, #117, #118, #122, #127, #128, #129, #130, #134, and `feat/ask-wrap` (this PR) · Plan:
`docs/plans/2026-10-30-ask-tapir.md` (Tasks 1–10; ★ choices C, D, E, T, V, P, M, K). Retros:
`docs/retros/2026-11-09-ask-server-core.md`, `2026-11-12-ask-{consent,sheet,energy}.md`,
`2026-11-13-ask-{translate,voice,provider,memory}.md`, `2026-11-15-ask-wrap.md`. Step 8 is built on the fake provider
except the parts listed under 「Not built」; with steps 5 (IAP) and 9 still open, the spec stays `approved`.

### What was built

- Server (#106, #117, #122, #128, #129, #134): consents with versions, energy (0–1000, refilled at 06:00 Malaysia time),
  the pantry ledger, metering, the 5-a-day feed cap, swap-and-feed in one transaction, `transcribe`, 小貘记得 with a switch
  and a cap of 50, all behind `ai-draft` in `ap-southeast-1`. Evidence: `supabase/migrations/20261109000100_ai_coin_reason.sql`
  to `20261115000100_ai_memory.sql`; pgTAP `supabase/tests/ai.test.sql`, `ai_feed_cap.test.sql`, `ai_swap_feed.test.sql`,
  `ai_ask_task.test.sql`, `ai_transcribe_task.test.sql`, `ai_memory.test.sql`; stack tests
  `supabase/functions/tests/ai-draft.integration.ts`, `ai-memory.integration.ts`, `ai-provider.integration.ts`.
- The real provider (#129): Qwen on Model Studio Singapore with dated pins, Qwen ASR for speech, a DeepSeek fallback in the
  same workspace (285 A), tested against recorded fixtures and a mock Model Studio in the Edge Runtime
  (`supabase/functions/ai-draft/modelStudio.test.ts`, `modelStudioAsr.test.ts`). `AI_PROVIDER=fake` stays the default.
- Consent before the first cloud call (129–131), version 2 since 282 A; 我的 → 小貘 with the cloud switch (#117, #134). Cases
  `ask_consent_*`.
- The sheet (132–134, #118): one `ask` task that drafts, answers, asks one question with buttons or lists a screenshot's
  requests; a draft fills the post form in place with the glow and 撤销; words and the last conversation kept on the
  device. Cases `ask_sheet_*`, `shell_ask_tapir`.
- 小貘体力 and the pantry (135–140, 149, #122): the belly bar, the low line, the hungry card with feeding, the coin swap and
  the jar. Cases `ask_energy_*`.
- Chat translation (141, #127): 翻译 in the message menu, under the original, kept on the device. Cases `chat_translate*`.
- Voice (142–143, #128): the microphone in the sheet, the 143 card, the on-device chain in the kit
  (`modules/tapiro-kit/ios/Speech*.swift`) and the cloud fallback. Cases `ask_voice_*`; `bun run test:kit-swift`.
- The dizzy card and 小貘记得 (144–145, 133, 281–284, #134). Cases `ask_memory_*`.
- Copy pass (this PR): the sheet's tab copy promises only what works now; the in-app privacy paragraph matches the
  consent page; Malay terms unified (plan 「★ Task 10 copy choices」).

### Deviations from the design

| Design said                                          | Shipped                                                                                         | Why                                                                                 | Confirmed by                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------- |
| Consent names Alibaba Cloud Model Studio (Singapore) | Also names what is sent, what is not, where it is kept; version 2 adds 小貘记得                 | 129 A board; 282 A                                                                  | owner, 2026-11-12 and 2026-11-15         |
| The sheet hosts the ten patterns                     | ①③④⑦⑧ built; ② is the draft card with 填进表单; ⑤ is the 「小貘填了 N 项」 strip and 133's line | Receipts (`draft_split`), ride and reply drafts are later tasks; ⑨ and ⑩ not traced | plan Tasks 4, 8; ★ D1–D15                |
| Speech: on-device first, cloud Qwen ASR as fallback  | As designed; the engines run only on a device                                                   | No engine produces output on the Simulator (AGENTS.md)                              | ★ V1–V14                                 |
| On-device Foundation Models calls consume nothing    | Not built: every call is cloud and metered                                                      | Its own task (which tasks, draft quality, a device check)                           | ★ M12, story `ask.on-device`             |
| Long-press on the 小貘 button after a spike          | Not built; microphone in the sheet only                                                         | The spike needs a device                                                            | plan 「Decided」, `ask.long-press-voice` |
| Daily limit                                          | The belly is the free limit; paid leaves capped at 5 fed per refill day                         | 149 A; the 5 is provisional                                                         | owner, 2026-11-12                        |
| Suggestions per tab                                  | Only what the sheet can do: draft a bounty, answer; 消息 points to long-press 翻译              | No ride, receipt or reply drafting yet; a ride sentence would become a bounty draft | ★ K1, for veto                           |

### Not built (blocks `implemented`)

- On-device Foundation Models (146 A, M12): no `OnDeviceModel.swift`; story `ask.on-device` is planned.
- The long-press spike (`ask.long-press-voice.spike`, device).
- Patterns ⑨ (one dismissible hint) and ⑩ (mascot size by screen class) were not traced to a screen. Unverified.

### Waiting on the owner or a device (does not block)

- The Model Studio account (148): the smoke run and the measured token budget (plan 「Task 9 smoke run」,
  story `ask.real-run`, planned); `UNMEASURED_PLACEHOLDER_BUDGET` stays. 149's 5 and S10's 20 are revisited with it.
- Device checklist: `ask.voice.*` (three languages, engines, prompts, 60 s, a call), `ask.energy.feed` motion and haptic,
  `ask.translate.layout` at the largest text size.

### Bugs fixed during implementation

- See the retros above (each lists symptom, root cause and fix). The ones that reached the Simulator: a nested scroll view
  pinned over the sheet header, `back()` then `navigate()` in one tick, the glow counted from mount, an empty belly from
  `''.split(',')`, the 晕 face invisible in dark (`docs/retros/2026-11-12-ask-sheet.md`, `2026-11-12-ask-energy.md`,
  `2026-11-13-ask-memory.md`).

### Verification

- Fast checks on this PR: `bun test` 2895 pass; `bunx tsc --noEmit`, `bun run lint:changed origin/main`,
  `bun run format:check`, `check-specs`, `check-story-map`, `check:size`, `design-check` pass; `verify:smoke` 4 of 4.
  pgTAP, Deno and stack tests run in CI (no SQL or function change here); each task ran its own (retros above).
- Milestone run (2026-11-15, app built from cdbd1f7 plus this branch; selection and reasons in
  `docs/retros/2026-11-15-ask-wrap.md` and the walkthrough): all 19 问小貘 cases (`ask_*`, `chat_translate*`,
  `shell_ask_tapir`) plus 7 regression cases for code the feature touched (`bounty_post_form`, `bounty_post_optional`,
  `bounty_post_worst`, `chat_thread_menu`, `chat_thread_states`, `coins_page`, `mascot_level_up`) in zh-Hans and en light,
  and each case's declared `ms`: 72 runs, 60 pass, 11 flaky (passed only on a retry on a fresh Simulator; lost input,
  lost taps and AXe session timeouts at load average 60–85), 1 fail. zh-Hans dark for the sheet, hungry card, consent,
  pantry, 小貘记得 and translation (8 cases): 8 pass.
- The one failure, `ms light shell_ask_tapir` (「sheet background is dark (160)」), failed the same way on a build of
  `main`: one sample pixel saw a ride card's text through the glass sheet. The case now takes the median of five points;
  the fix round passed ms light, zh-Hans light and dark, and the copy changed after the run passed in zh-Hans, en and ms
  (`shell_ask_tapir`) and en (`ask_sheet_worst`, `ask_voice_retry`, `chat_translate_worst`).
- Copy: the 问小貘 strings in zh-Hans, en and ms read for terms and voice; fixes and choices in the plan's 「★ Task 10 copy
  choices」. One review round (copy, story map); its 2 Critical and 4 Important findings are fixed in this PR.

### Known limits

- The consent page's long rows wrap with trailing alignment under a stacked label (LabeledContent); readable, not polished.
- The home calm card's example chip 「五点回 YC 谁一起」 is decorative, not a suggestion, but reads as a ride request.
- M18: content the platform blocks stays 小貘晕了; revisit after the smoke run.

## Implementation Record (2026-11-19) — real sign-in: Apple and Google adapters

PR: not opened yet · Commits: a133fd0c..HEAD (`feat/native-sign-in`)

Step 1 shipped the `signInWithIdToken` boundary with `providerAdapters = {}`: the real adapters waited for the paid Apple
team (the free team cannot sign the Sign in with Apple entitlement) and for Google Cloud clients (PR #1, "the real
Apple/Google adapters wait for the accounts"). The paid account arrived on 2026-11-19.

### What was built

- Apple adapter: a fresh nonce per attempt (`randomUUID`), its SHA-256 hex to `signInAsync` with full name and email
  scopes, the raw value to Supabase; `ERR_REQUEST_CANCELED` → `cancelled`, every other error or a missing identity
  token → `failed`; the one-time name joined family-first without a space for Han names. Evidence:
  `src/features/account/appleIdToken.ts`, `src/features/account/nonce.ts`.
- Google adapter on `@react-native-google-signin/google-signin` 17.0.0 (`bunx expo install`): configured with the iOS
  and web client IDs before every attempt; a `cancelled` response → `cancelled` (the library turns the native cancel
  into it), any throw → `failed`. Built only when both `EXPO_PUBLIC_GOOGLE_*` IDs hold `*.apps.googleusercontent.com`
  values and the app registers the reversed iOS client ID as a URL scheme (kit `registeredUrlSchemes()`); otherwise
  the sign-in screen does not show Google (S7). Sign-out signs out of Google; deletion restores the previous Google sign-in, revokes access, then
  signs out (S8). Adapters are created only outside verify mode. Evidence: `src/features/account/googleIdToken.ts`,
  `src/features/account/providers.ts`, `src/features/account/authService.ts`.
- App config: `ios.appleTeamId: "4RML7RLKML"` (the owner's personal team, owner 2026-11-19); `ios.usesAppleSignIn: true`; `plugins/withoutAppleSignInEntitlement.js` removed;
  `plugins/withGoogleSignIn.js` adds the reversed client ID URL scheme from `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` at prebuild
  and fails prebuild on a malformed value. `.env.example` lists both variables.
- Local Supabase: `[auth.external.apple]` enabled with client ID `app.tapiro`, no secret; `[auth.external.google]` enabled
  with `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"` and `skip_nonce_check = true`. Evidence:
  `supabase/config.toml`.

### Decisions (owner delegated, 2026-11-17; listed for veto)

| #   | Decision                                                                                                                                           | Reason                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Google library: `@react-native-google-signin/google-signin` (free API)                                                                             | The one Supabase's Expo guide uses; peer `expo >=52`. The alternative `react-native-nitro-google-signin` 2.3.1 passes a nonce, but its `compatibility.json` stops at RN 0.87 (we run 0.88) and adds `react-native-nitro-modules`.                                                        |
| S2  | Google nonce check skipped on the backend                                                                                                          | The free API has no nonce parameter; GoogleSignIn-iOS then calls AppAuth's initializer that generates its own nonce (`OIDAuthorizationRequest.m`), which the app never sees. Audience and signature are still checked. Revisit with S1 if nitro supports RN 0.88.                        |
| S3  | Apple nonce: SHA-256 hex to Apple, raw to Supabase                                                                                                 | expo-apple-authentication passes the nonce through unchanged (`AppleAuthenticationRequest.swift:37`); auth-js documents that Supabase hashes the supplied nonce before comparing.                                                                                                        |
| S4  | Apple asks for full name and email                                                                                                                 | The name step is prefilled from the provider (Behaviour → Accounts); Apple gives the name once.                                                                                                                                                                                          |
| S5  | East Asian names (Han, Hangul, kana) joined family + given without a space                                                                         | Apple returns parts; 「小貘 林」 would be wrong for most users. Mixed scripts and Latin names stay given, middle, family with spaces.                                                                                                                                                    |
| S6  | Google client IDs from `EXPO_PUBLIC_GOOGLE_*`, not committed in `app.json`                                                                         | They are public but owner-specific and not yet issued; prebuild and Metro load `.env`, so one place feeds both the URL scheme and the runtime IDs. Unset means the app builds and Google shows the existing 「登录还没配置好」 line.                                                     |
| S7  | The Google button is hidden unless the build has both Google client IDs and registers the reversed iOS client ID as a URL scheme                   | A build without the clients would show a button that always fails; a build prebuilt without the scheme would crash in release, because GoogleSignIn's NSException is caught only in DEBUG (`RNGoogleSignin.mm:135-147`). The kit's `registeredUrlSchemes()` reads Info.plist at runtime. |
| S8  | Tapiro sign-out signs out of Google on the device; account deletion also revokes Tapiro's Google access                                            | The GoogleSignIn keychain entry would otherwise keep the previous user's session, and a deleted account would keep its Google grant (reviews of #189).                                                                                                                                   |
| S9  | Apple token revocation on account deletion is a follow-up, before App Store submission                                                             | Guideline 5.1.1(v) asks apps with Sign in with Apple to revoke tokens through Apple's REST API on deletion. That needs a Sign in with Apple private key (owner) and a server exchange of the authorization code; TestFlight internal testing does not go through App Review.             |
| S10 | Apple's one-time name is kept in memory, bound to the provider and Apple `user` subject; it survives a sign-out and is dropped on account deletion | The token result carries `account: { subject, fullName? }`, so a name cannot exist without its owner and never lands on another account (re-reviews of #189). Persisting it to the Keychain would outlive the launch; the name step still asks when the prefill is lost.                 |

### Deviations from the design

None. The design names `expo-apple-authentication`, Google Sign-In and `signInWithIdToken`; S2 is recorded above.

### Bugs fixed during implementation

- **Symptom (review of #189):** the Google catch compared with the literal `'SIGN_IN_CANCELLED'`; on iOS the code is
  `-5` (`RNGoogleSignin.mm:35`). The third review showed the library's `signIn` already turns that rejection into
  `{ type: 'cancelled' }` (`translateNativeRejection.ts`), so the catch now maps every throw to `failed`.
- **Symptom (fifth review of #189):** after a relaunch, revoking Google access on deletion did nothing (GoogleSignIn
  has no current user until restored), and a throwing local sign-out skipped provider cleanup. **Fix:** configure and
  `signInSilently()` before `revokeAccess()`; the local sign-out in `deleteAccount` is caught.
- **Symptom (third review of #189):** a build prebuilt without the iOS client ID, then bundled with it, would crash on
  the Google tap in release. **Fix:** S7's runtime URL scheme check.
- **Symptom (review of #189):** Apple's one-time name was lost when the token exchange failed or `updateUser` returned
  an error (it resolves `{ error }`, it does not throw). **Fix:** the service keeps the name until a save succeeds.
  The re-review found that this first fix could save it on another account (another provider, or after sign-out);
  the pending name is now bound to the provider and the Apple `user` subject; another account's sign-in leaves it alone,
  and only a successful save or account deletion clears it (S10).
- **Symptom (re-review of #189):** a rejected native `configure` would make every later Google attempt fail until
  restart. **Root cause:** the library stores configure's promise and awaits it in `signIn`; the adapter configured
  once. **Fix:** configure before every attempt.

- **Symptom:** `expo config` failed with `googleSignIn is not a function` when a client ID was set.
  **Root cause:** the library's `app.plugin.js` is an ES module export (`exports.default`).
  **Fix:** require `.default` in `plugins/withGoogleSignIn.js` (this branch).

### Verification

- `bun test src/features/account/` → pass, including `appleIdToken.test.ts` and `googleIdToken.test.ts`.
- `int:src/features/account/idTokenProviders.integration.ts` on a throwaway stack (port prefix 567) → 2 pass on this
  branch ("Bad ID token" for a forged token from each issuer); on `origin/main`'s config both fail with "Provider … is
  not enabled", so the test can fail.
- `expo config --type introspect`: without a client ID, URL schemes `tapiro`, `app.tapiro` and entitlement
  `com.apple.developer.applesignin: ["Default"]`; with `123-abc.apps.googleusercontent.com`, the added scheme
  `com.googleusercontent.apps.123-abc`; a malformed value fails prebuild.

- `bun run verify:build` (Release, Simulator, with `appleTeamId`) → BUILD SUCCEEDED in 248 s; the simulated entitlements of
  the built app hold `com.apple.developer.applesignin: [Default]`. Signing stays on.
- `bun run verify:smoke` → 4 of 4 pass (`app_launches`, `sign_in_fixture`, `shell_tabs`, `home_one_card`, zh-Hans light).
  Selection: no screen layout or copy changed; the native config (entitlement, GoogleSignIn pod, URL scheme) can only
  break launch or the sign-in screen, which the smoke set covers.
- `ui:sign_in_apple_only` (launch argument `-uiVerifyProviders apple`): fails on the build before this change
  (「sign-in-google is still on screen」), passes after it.
- After the review fixes (Google button conditional, kit `registeredUrlSchemes`): rebuilt, `verify:smoke` → 4 of 4
  pass and `sign_in_fixture` in ms light → pass. `providers.ts` calls the kit function at load, in verify mode too.
- `bun test` → 3031 pass; `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`, `check-story-map` → pass.

### Known limits

- Real sign-in is unproven until a device run (`account.sign-in.real-apple`, `account.sign-in.real-google`): it needs
  the Google Cloud clients, Sign in with Apple on the `app.tapiro` App ID, and the hosted Auth providers (owner steps in
  the PR).
- Apple token revocation on deletion is not built (S9); needed before App Store submission.
- The one-time Apple name is kept in memory only; quitting the app after a failed first sign-in loses the prefill (the
  name step still lets the user type it).
- Google client IDs come from `.env.local` at prebuild and bundle time on this Mac; an EAS cloud build would need them
  as EAS environment variables, or Google stays unconfigured.
- After setting or changing the Google iOS client ID, run prebuild again; until then the Google button stays hidden (S7).
- The Google stack case proves the provider is enabled, not that the client IDs match: the forged token fails at the
  signature check first. Audience is proven on the device run.
- The hosted Supabase project is not touched; its Apple and Google providers are configured by the owner.
- The Apple identity token's email may be a private relay address; accepted per Behaviour → Accounts.

## Implementation Record (2026-11-21) — keep the user's context (UI audit batch A)

Source: `docs/reviews/2026-11-21-ui-walkthrough.md` findings N1, N5, P3, R1, R3, A1, D1 and the owner-reported bug
(adding a payee from the apply sheet jumped to 我的). Decided under the owner's delegation (2026-11-17); listed for
veto. Branch `fix/keep-context-navigation`.

### Decisions (for veto)

| #   | Decision                     | Choice                                                                                                                                                                                                                                                                  | Why                                                                                                                                                                                                                                         | Alternatives considered                                                                                                                                       |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | One mechanism, two shapes    | A flow never switches tabs. A screen of another tab is pushed on the root stack over the tabs (system back returns to where the user was); a flow inside a sheet presents the next screen as a sheet over it and returns on close                                         | One rule covers every audit finding; both are native presentations (push for drill-down, sheet for transient flows)                                                                                                                       | Per-tab duplicated routes like `profileHref` (the thread cannot live in 悬赏 or 拼车, see A2); the item as a sheet over the chat (drill-down should push, HIG) |
| A2  | Root routes over the tabs    | `/chat/[thread]`, `/chat/report`, `/bounty-status/[id]`, `/ride-detail/[id]`, `/person/*` (profile, reviews, report, reply), `/sticker-book`; header with a minimal back button and scroll edge effect; the route bodies are shared with the tab routes                 | react-native-screens switches the first scroll view of every stack screen in a tab to automatic insets unless the trigger sets `disableAutomaticContentInsets` (only 消息 does); that broke the thread's keyboard maths in the chat spike | Turning automatic insets off for 悬赏 and 拼车 (every list there relies on them)                                                                               |
| A3  | No ping-pong                 | An item opened from its thread (`from=thread`) returns to the thread on 发消息; a thread opened from its item (`from=item`) returns to the item on the item card                                                                                                       | Otherwise 发消息 → 看详情 → 发消息 stacks copies                                                                                                                                                                                      | Singular routes (the thread exists in two stacks)                                                                                                             |
| A4  | Sheets over sheets           | 先去付款 (confirm and the blocked hint) pushes `/pay/[id]` over the post sheet; 去加收款方式 (ride confirm) and 添加收款方式 (apply) open the payee list as a root page sheet `/payee` with a close button; the screen underneath rechecks when it regains focus (`useOnReturn`) | The user comes back to the step they left, with the gate re-evaluated                                                                                                                                                                       | Closing the sheet and keeping the draft (the audit's complaint)                                                                                               |
| A5  | Delete blocked by payments   | Each unsettled payment row is a button that opens its pay sheet over the delete sheet; after coming back, 删除 is enabled again and a tap re-checks; nothing deletes by itself                                                                                       | The user settles from where they were blocked; never replay a write                                                                                                                                                                        | Opening the item's 进度 (needs the item kind the row does not carry)                                                                                           |
| A6  | Poster's own bounty detail   | Status line and one action: open 「你发的悬赏 · 正在等人申请」 + 查看申请人; expired or closed 「已经关闭 · 这次没有选人」 + 查看申请人; underway the poster's progress summary (「阿杰接了」) + 看进度; cancelled unchanged                                         | The poster arriving from home or a notification saw a live-looking bounty with no way on                                                                                                                                                | Hiding the detail from the poster (the board and map still open it)                                                                                           |
| A7  | Poster's 悬赏过期了 tap      | The route carries `notice=expired`; the detail replaces itself with 申请人 once the viewer is the poster; applicants stay on the detail                                                                                                                                | The server sends one kind to the poster and to pending applicants alike                                                                                                                                                                    | A separate server kind for the poster (migration and push copy for a live-only event)                                                                       |
| A8  | Notification taps            | `router.push(route, { dangerouslySingular: true })` for every kind                                                                                                                                                                                                      | A second tap for the same item moves that screen to the top instead of stacking a copy                                                                                                                                                     | `navigate` (replaces the params of a different item on the same route)                                                                                         |
| A9  | Tab switches left as they are | 消息's empty state 去看看悬赏 → 悬赏; the accessory → 悬赏 home; tier drop and 小貘长大了 「看我的主页」 → 我的; notification taps open the item in its own tab                                                                                                         | Each is a deliberate move to that tab's root or to the user's own profile in 我的, not a step inside a flow (`tier_drop_reviews` asserts 我的)                                                                                           | Moving them over the tabs                                                                                                                                     |

### What was built

- Root routes and options: `src/app/_layout.tsx` (`OVER_TABS`), `src/app/chat/`, `src/app/bounty-status/[id].tsx`,
  `src/app/ride-detail/[id].tsx`, `src/app/person/`, `src/app/sticker-book.tsx`, `src/app/payee/index.tsx`.
- Shared route bodies: `ThreadRoute` in `src/app/(tabs)/messages/[thread].tsx`, `RideDetailRoute` in
  `src/app/(tabs)/ride/[id].tsx`; `ProfileTab` gains `overTabs` (`src/features/reputation/profile/routes.tsx`).
- `src/lib/useOnReturn.ts`; rechecks in `PostConfirm`, `RideConfirm`, `ApplySheet` (`applyReducer` accepts a new check
  from `noPayee`).
- `DeleteAccountSheet` rows; `PosterActions` and `ownState` in `src/features/bounty/detail/`; three new copy keys
  `bounty.detail.poster.*` in zh-Hans, en and ms.
- Fixture: `-uiVerifyOwnBounty <id>` makes a bounty the viewer's own before its applicants are loaded.

### Verification

- `bun test` → 3186 pass, 2 timeouts in `scripts/merge-gate.test.ts` under load average ~800; that file alone → 16
  pass. `bunx tsc --noEmit`, `bun run lint:changed`, `bun run format:check`, `check-specs`, `check-story-map`,
  `verification/ui` unit tests (147) → pass.
- UI, zh-Hans light (selection: the screens whose navigation changed, plus the smoke set and `live_notice_tap` for
  the routing change): `app_launches`, `sign_in_fixture`, `shell_tabs`, `home_one_card`, `chat_entry_status`,
  `chat_entry_ride`, `chat_entry_home`, `chat_thread_hint`, `ride_create_payee`, `bounty_apply_no_payee`,
  `bounty_post_blocked`, `account_delete_open_payment`, `account_delete_sheet_many`, `bounty_detail_poster`,
  `profile_sticker_book_in_tab`, `live_notice_tap` → pass (`live_notice_tap` passed on its retry). Three first-run
  failures were case bugs, fixed in the cases: two 关闭 buttons (apply sheet and payee sheet), and the tab bar minimised
  after scrolling, so the cases read the back button's label instead.
- UI, ms light (new layouts with longer copy): `account_delete_open_payment`, `bounty_detail_poster` → pass; the ms
  status line wraps to two lines without truncation.

### Known limits

- Two copies of one thread can be mounted at once (消息 and over the tabs); both read the same store.
- The payee list's recheck after adding a method is unit-tested (`applyFlow.test.ts`); the fixture has no payee to add
  that flips the apply or ride gate, so the UI cases prove the return path, not the flip.
- A notification tapped twice for one item is a device check: verify mode fakes one tap per launch.
