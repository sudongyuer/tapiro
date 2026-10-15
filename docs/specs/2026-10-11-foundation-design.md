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

| Decision              | Choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Why                                                                                                      | Alternatives considered                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Sign-in               | `expo-apple-authentication` and Google Sign-In → `signInWithIdToken`; session in Keychain                                                                                                                                                                                                                                                                                                                                                                                                                | AGENTS.md (no web OAuth, no Apple secret rotation)                                                       | Email OTP: not requested                                                            |
| Tabs                  | NativeTabs, 4 triggers (悬赏, 拼车, 消息 with unread badge, 我的), `minimizeBehavior="onScrollDown"`                                                                                                                                                                                                                                                                                                                                                                                                     | KICKOFF 2026-10-11 N3+E; spike 2026-10-11-nav-n3e-spike.md                                               | N1/N2/N3 on canvas: rejected by the user                                            |
| 问小貘 entry          | 5th trigger `role="search"`, `disabled`, custom image icon, `tabPress` → push root `formSheet` route (detents 0.5 and 1, grabber); presentation options in the root layout                                                                                                                                                                                                                                                                                                                               | Spike: verified on iOS 26.5 Simulator; options inside the sheet screen were ignored                      | Raised centre button: impossible with the system tab bar                            |
| Bottom accessory      | Shows the most urgent item; hidden when there is none; hidden at the top of 悬赏 (the live cards are on screen) and shown there once they scroll away                                                                                                                                                                                                                                                                                                                                                    | KICKOFF 2026-10-11; spike verified mount/unmount per route and scroll state                              | Always on: duplicates the home live cards                                           |
| Expand after minimise | Tapping the minimised tab expands; scrolling back up does not                                                                                                                                                                                                                                                                                                                                                                                                                                            | Observed in the spike                                                                                    | —                                                                                   |
| Home frame            | G: stage (mascot pose and colour by state) → live-card stack (stacked when 2+, tap to fan out) → feature content; collapses to a strip on scroll                                                                                                                                                                                                                                                                                                                                                         | KICKOFF 2026-10-10                                                                                       | H1–H3, D, E, F                                                                      |
| Payment model         | Payer pays payee directly in their own bank/e-wallet app; Tapiro shows what to copy and records two taps                                                                                                                                                                                                                                                                                                                                                                                                 | KICKOFF 2026-10-05; 2026-10-05-duitnow-p2p.md "Recommended flow"                                         | Stripe/Curlec/Wise: need a Malaysian company or are forbidden                       |
| Payee methods         | DuitNow phone number, bank account, TNG/DuitNow receive QR, Alipay 收钱码, WeChat 收款码, cash in person                                                                                                                                                                                                                                                                                                                                                                                                 | KICKOFF 2026-10-05, 2026-10-06 (Alipay/WeChat labelled by name, not "other code")                        | Payee research recommended leaving Alipay/WeChat out (see review report)            |
| QR intake             | Pick a screenshot (no Photos permission) or scan; decode on device with Expo modules; store the string and parsed fields, never the image; block paying codes                                                                                                                                                                                                                                                                                                                                            | 2026-10-06-payee-setup.md §3; KICKOFF 2026-10-06 "用 Expo 现成模块"                                      | Vision in the kit: more control, more work                                          |
| Settlement            | Payer taps 我已付款 (screenshot optional); only the payee's 已收到 settles; 还没收到 notifies the payer; no automatic settlement                                                                                                                                                                                                                                                                                                                                                                         | KICKOFF 2026-10-05 "不自动，只提醒接单人"                                                                | Auto-confirm after N hours: rejected                                                |
| Payee info visibility | Only the payer of an item where this person is the selected payee, only inside the pay step, hidden after settlement                                                                                                                                                                                                                                                                                                                                                                                     | KICKOFF 2026-10-05; PayFlow board                                                                        | Public on profile: fraud risk                                                       |
| Reputation            | Two layers: 靠谱度 (rolling 180 days, can fall, gates applications; tiers 新朋友 / 靠谱 / 很靠谱 / 貘友 with the research thresholds, tuned after launch) and sticker book + mascot level (lifetime, cosmetic)                                                                                                                                                                                                                                                                                           | KICKOFF 2026-10-05 B+C, 2026-10-11 F1; 2026-10-04-reputation.md Design B                                 | Single score: mixes trust and joy                                                   |
| Reviews               | Three faces 开心 / 一般 / 不开心 + chips + optional sentence; only after settlement; sealed until both submit or 7 days; reviewee may reply once                                                                                                                                                                                                                                                                                                                                                         | KICKOFF 2026-10-06 Q4; ReviewA, RepBC boards                                                             | Stars: inflate (reputation research §4.1)                                           |
| No-show slack         | One excused no-show per 60 days                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | StatusFlows board (2026-10-06)                                                                           | —                                                                                   |
| Mascot level curve    | Lv2 at 3 stickers, Lv3 8, Lv4 15, Lv5 25, then every +15                                                                                                                                                                                                                                                                                                                                                                                                                                                 | KICKOFF 2026-10-11                                                                                       | Every 10; three stages                                                              |
| Coins: purchase       | Consumable IAP: RM5 → 5, RM10 → 11, RM30 → 35, at the closest Apple Malaysia price points; purchased coins never expire                                                                                                                                                                                                                                                                                                                                                                                  | KICKOFF 2026-10-06; Guideline 3.1.1 "may not expire" (fetched 2026-10-11)                                | Non-IAP: not allowed for in-app features (3.1.1)                                    |
| Coins: spend          | 1 per published bounty or ride; the first 3 posts per calendar month are free, one allowance shared by bounties and rides; 1 per food portion (嫩叶) for 小貘体力; refunded when nobody is selected or the poster cancels before selecting, and a refunded free post restores the free slot                                                                                                                                                                                                              | KICKOFF 2026-10-06; 2026-10-11 F4, B7, F17                                                               | Separate allowances per feature                                                     |
| Coins: free grants    | New user 5; onboarding 3 × 1 (payee method added, first post or ride, first help settled); weekly feed 1 (tap the home stage once per calendar week, Monday 00:00 Malaysia time); each help settled 1, max 10 a month; invite 3 to each side after the friend's first settled item; never expire                                                                                                                                                                                                         | KICKOFF 2026-10-06, 2026-10-11 (F7)                                                                      | Feed button in 我的; automatic on first open                                        |
| Ledger                | Single append-only server ledger; balance derived; all grants and spends written by the server                                                                                                                                                                                                                                                                                                                                                                                                           | KICKOFF 2026-10-06 "单一账本"                                                                            | Two ledgers (paid/earned): dropped                                                  |
| AI path               | Edge Function in ap-southeast-1 → Qwen on Model Studio Singapore; tool calls return drafts only                                                                                                                                                                                                                                                                                                                                                                                                          | AGENTS.md AI rules                                                                                       | Client-side keys: forbidden                                                         |
| AI usage (小貘体力)   | All AI use (drafts, translation, ghost-writing, Q&A, receipt split) consumes energy by usage, metered in tokens on the server and never shown as tokens. Free energy refills at 06:00 Malaysia time to about 3 drafts or 30 translated sentences; unused free energy resets daily. 1 coin buys 1 food portion (嫩叶) kept in 小貘's pantry, never expiring; feeding one refills energy to full. Only cloud calls consume energy; on-device Foundation Models calls do not. Exact UI confirmed when built | KICKOFF 2026-10-11 F17, F14; canvas 「问小貘 · AI 用量 = 小貘体力」 E2; Guideline 3.1.1 "may not expire" | Draft count (5 a day, then 1 coin): replaced; energy battery (E1) or mood only (E3) |
| AI storage            | Conversations and drafts on device only; "小貘记得" (places, preferences) synced, viewable and deletable                                                                                                                                                                                                                                                                                                                                                                                                 | KICKOFF 2026-10-06, 2026-10-11                                                                           | Server chat history: PDPA minimisation                                              |
| AI labelling          | Confirmed AI drafts are the user's own content; no AI badge                                                                                                                                                                                                                                                                                                                                                                                                                                              | KICKOFF 2026-10-06 "都不标"                                                                              | —                                                                                   |
| Chat                  | Supabase-backed thread per bounty or ride, members only; text and images, both reportable; kept indefinitely                                                                                                                                                                                                                                                                                                                                                                                             | KICKOFF 2026-10-11, F8                                                                                   | Device-only: the other side loses history                                           |
| Push                  | Expo Push Service; provisional authorisation first; IDs only in payloads under `body`                                                                                                                                                                                                                                                                                                                                                                                                                    | 2026-10-04-push-location.md; AGENTS.md                                                                   | Direct APNs: later if needed                                                        |
| Unpaid handling       | Reminders to the payer at 24 h and 72 h; publishing blocked after 7 days unpaid or with 2 open unpaid items, lifted on settlement or a resolved report                                                                                                                                                                                                                                                                                                                                                   | KICKOFF 2026-10-05 "提醒 + 限制发布"; 2026-10-11 F3                                                      | Stricter (3 days) or reminders only                                                 |
| Accessory priority    | Money the user owes > a ride departing within 1 h > money owed to the user > an in-progress bounty; `还有 n 件` when more exist                                                                                                                                                                                                                                                                                                                                                                          | KICKOFF 2026-10-11 F5                                                                                    | Ride first; nearest deadline                                                        |
| Voice in 问小貘       | Microphone button inside the sheet in v1; long-press on the 小貘 button only after a spike proves it                                                                                                                                                                                                                                                                                                                                                                                                     | KICKOFF 2026-10-11 F6; spike verified tap only                                                           | Long-press required in v1                                                           |
| Account deletion      | Blocked while the user has an unsettled payment (shows which); deletion removes the user's messages and reviews, keeps the other side's thread, keeps anonymised ledger and IAP rows                                                                                                                                                                                                                                                                                                                     | KICKOFF 2026-10-11 F9, F10; Guideline 5.1.1(v)                                                           | Delete whole threads; rename to 已注销用户                                          |
| Alipay/WeChat codes   | Supported in v1, no legal review                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | KICKOFF 2026-10-11 F15, 2026-10-12 "直接支持就行，不用咨询律师"                                          | Drop until counsel confirms                                                         |
| Home stage class      | The home stage is a moment area (large mascot allowed); design-language.md is updated to say so                                                                                                                                                                                                                                                                                                                                                                                                          | KICKOFF 2026-10-11 F16                                                                                   | Shrink to a 32 pt head                                                              |
| Live Activity target  | A widget extension generated by a config plugin, the one exception to "native code lives in the kit"; AGENTS.md is updated to say so                                                                                                                                                                                                                                                                                                                                                                     | KICKOFF 2026-10-11 F12                                                                                   | No Live Activity in v1                                                              |

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
   out into a sticker — bounty. 5. Hold to confirm for selecting a helper — bounty. 6. Celebration by
   rarity (first settled item: full burst; routine: check and haptic) — this spec, via the settlement
   event. Each follows design-language principles 9–11 and the motion gate in CLAUDE.md.

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
6. Reviews, reputation recompute, stickers, mascot level and the rarity celebration.
7. Chat with report and block.
8. 问小貘: consent, `ai-draft`, 小貘体力 metering, pantry and feeding, voice (sheet microphone),
   image input, 小貘记得. Spike long-press on the 小貘 button.
9. Spikes: Live Activity extension via config plugin; in-app Dynamic Island. Then push and Live
   Activity.

Steps 1–4 unblock the bounty and carpool specs.

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

- `bun test` → 194 pass; `bunx tsc --noEmit`, `bun run lint -- <changed files>`, `bun run format:check`,
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

| Design said                     | Shipped                                                                                                                                                             | Why                                                                     | Confirmed by                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| Cash in person: a toggle        | Toggle backed by a `cash` row in `payee_methods`                                                                                                                    | Profiles are public; a profile flag would leak it outside the pay step  | not intent-changing                  |
| Reject dynamic (amount) codes   | Also rejects static codes that carry tag `54` (fixed amount)                                                                                                        | Every payment amount differs; PayNet's own P2P example carries RM 10.00 | not intent-changing                  |
| Bank picker                     | Five banks from payee-setup §3 plus 「其他银行」 with a typed name (no bank code)                                                                                   | Only those acquirer IDs are sourced                                     | user, 2026-10-15                     |
| + menu: DuitNow, bank, QR, cash | 支付宝收钱码, 微信收款码, TNG 收款码 first, then 「其他」 (DuitNow, bank, cash); per-wallet save steps; a code from another wallet is accepted after a confirm line | Students mainly use Alipay, WeChat Pay and TNG                          | user, 2026-10-15 (PayeeWalletMenu A) |
| Re-pick a QR                    | A code of another type replaces the row in one RPC (`replace_payee_qr`), keeping default and position                                                               | Row shape is per type; `type` is not client-updatable                   | not intent-changing                  |

### Verification

- `bun test` → 256 pass; `supabase test db` → payee_methods 25/25, profiles 23/23; `test:stack` payee service and
  account-delete (payee rows cascade) pass; `tsc`, lint on changed files, `format:check`, `design-check` → exit 0
- UI cases `payee_list`, `payee_add_duitnow`, `payee_qr` → 12/12 pass light and dark, zh-Hans and ms

### Known limits and follow-ups

- Payer visibility (payer of an item where this user is the selected payee, until settled) is not in RLS yet; it
  comes with step 4's `payments` table.
- The "付不了" re-check trigger arrives with step 4; `checked_at` is stored now.
- The per-wallet save steps (Alipay 首页「收钱」, WeChat 「收付款 → 二维码收款」, TNG Receive) need confirming on a device.
- Camera scanning and real screenshot decoding are not exercised by UI cases (injected at the decode boundary);
  check on a device. Alipay/WeChat receive-code formats remain heuristics (payee-setup §Open questions).
