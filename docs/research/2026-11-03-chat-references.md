# Chat (聊天): reference research

Researched 2026-11-03 for foundation step 7 (`docs/plans/2026-10-30-chat.md`), canvas questions 117–128. The question
is how chats attached to an order, a listing or a ride handle the safety hint, reporting, blocking, delivery and read
states, entry points and the pinned item header. References: Apple Messages (iMessage) and the Apple HIG, 闲鱼
Xianyu, Airbnb, Grab (GrabChat), Carousell, WhatsApp, plus Airtasker from the earlier similar-apps study.

What is fixed already (do not re-ask): one thread per bounty (after selection) and per ride, members only, text and
images, kept indefinitely, a fixed hint about deposits and off-platform payment, long-press 翻译 / 举报, block from
either side hides both (bounty 6A).

Sources and method:

- Help-centre and developer pages fetched 2026-11-03. Apple HIG text came from the HIG JSON
  (`https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`) because the HTML page
  renders client-side.
- App Store screenshots via the iTunes Lookup API (`https://itunes.apple.com/lookup?id=<id>&country=<cc>`). They are
  marketing frames. Statements marked **(observed)** describe those frames.
- Where only a secondary source exists, the line says **(secondary)**.
- Canvas: https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o, page 「05+ 消息与聊天」, boards `ChatPick1.dc.html`
  (117–122) and `ChatPick2.dc.html` (123–128), version 1793717005-0c9d.

## 1. References

### 1.1 Apple Messages and the HIG

- Failed send: "Tap the red exclamation point, then tap Try Again." A failed iMessage can also be sent as a text.
  https://support.apple.com/en-my/ht204065
- Read receipts: off unless the user turns on Settings → Apps → Messages → Send Read Receipts, and can be set per
  conversation. "When read receipts are turned on, the sender sees the word 'Read' below messages they've sent to
  you … If you haven't read their message, the sender sees 'Delivered.'" Only under the latest message.
  https://support.apple.com/guide/iphone/turn-read-receipts-on-or-off-iph5e713a045/ios,
  https://support.apple.com/en-in/guide/personal-safety/ipsdccb7919d/web
- HIG, Context menus: "Hide unavailable menu items, don't dim them." "Aim for a small number of menu items." "Always
  make context menu items available in the main interface, too." Destructive items go last and "the system can
  display a destructive menu item using a red text color." The menu can show a preview of the content. "Provide
  either a context menu or an edit menu for an item, but not both."
  https://developer.apple.com/design/human-interface-guidelines/context-menus
- HIG, Action sheets: use one, not an alert, for choices about an intended action; put destructive choices first,
  with Cancel at the bottom. https://developer.apple.com/design/human-interface-guidelines/action-sheets
- HIG, Privacy: "Request permission only when your app clearly needs access", ideally when people use the feature.
  https://developer.apple.com/design/human-interface-guidelines/privacy
- PhotoKit: the system photo picker "is private by default. The user doesn't need to explicitly authorize your app to
  select photos." https://developer.apple.com/documentation/photokit/delivering-an-enhanced-privacy-experience-in-your-photos-app
- App Review Guideline 1.2: apps with user content need a filter, a way to report content with timely responses, a
  way to block abusive users, and published contact information. https://developer.apple.com/app-store/review/guidelines/

### 1.2 Airbnb

- Threads are per reservation: "Every reservation automatically creates a group thread where all bookers,
  co-travelers, hosts and co-hosts can connect."
- Read receipts are on "for all messages on Airbnb to help keep communication between guests and hosts transparent."
- Edit within 15 minutes, unsend within 24 hours; 25 messages per 24 hours or 10 per hour.
- Off-platform payment: if someone pushes you to pay outside Airbnb, tap the flag or the three dots next to the
  message and report it. https://www.airbnb.com/help/article/145
- Report flow ("Report and block a host or guest's messages"): three dots on the message → "Report this message" →
  choose a reason → add details if required → Submit; then, for some reasons, "Block this person". Blocking stops
  messages, but with an upcoming or active reservation messages may continue until two weeks after it ends.
  https://www.airbnb.com/help/article/2020

### 1.3 Carousell

- Chat screen (observed, MY store screenshot 4, Carousell 2.485.0, id 548607187): the navigation bar shows the other
  person with "Online 1h ago", a ⚠ report icon and ⋯. Under it a pinned listing strip (photo, title, price) with
  "Make offer" and "View seller". Offers render as special bubbles ("Made An Offer S$800", "Accepted Offer"). Own
  messages carry "Seen 11:24 AM" under them. https://apps.apple.com/my/app/id548607187
- Safety: chat requires a verified local mobile number; new chats show "New User" or "Not Verified"; email addresses
  and website links are blocked in chat; a warning page appears for non-Carousell links; the safety policy forbids
  asking buyers to pay before meet-ups outside the Buy button.
  https://www.mha.gov.sg/e-commerce-marketplace-transaction-safety-ratings/carousell/ (Singapore MHA rating page),
  https://thestar.com.my/tech/tech-news/2023/01/03/carousell-banks-in-spore-take-steps-to-tackle-spike-in-phishing-scams
- Report and block steps: in-app Report on a listing or profile, pick a reason such as "Scam"
  **(secondary)** https://www.scam.sg/scam-prevention/how-to-report-a-carousell-scam-and-get-your-money-back-in-singapore.
  Carousell's own help centre did not appear in search; see Unreachable.

### 1.4 Grab (GrabChat)

- Chat sessions close "once the passenger leaves the vehicle", and the history is dissolved after the trip; template
  messages ("I'm 2 minutes away") send with one tap. https://grab.com/sg/understanding-grabchat
- Number masking keeps either side from contacting the other after the ride.
  https://grab.com/my/number-masking-another-way-to-stay-safe
- Usage data: auto-translation (Bahasa Melayu, Simplified Chinese and others); photos are used mostly to show the
  pickup spot, at airports, malls, stations and hotels; bookings that used templates had "10% more completions".
  https://engineering.grab.com/tourist-chat-data-story
- Entry point (observed in 2026-10-04 similar-apps study): the chat field sits on the live ride card.

### 1.5 WhatsApp

- Status icons: a clock means not yet sent; one grey check sent; two grey checks delivered; two blue checks read.
  Long-press → Info shows the times. Blue checks are missing when read receipts are off or the person blocked you.
  https://faq.whatsapp.com/en/iphone/28041116 (page body did not render; text from the search summary of that page)
- Blocking: a message to someone who blocked you keeps one check and is never delivered; WhatsApp does not tell you
  who blocked you **(secondary)** https://maketecheasier.com/what-happens-you-block-someone-on-whatsapp.
- Reporting sends the reported contact's last five messages; "Report" and "Report and block" are separate choices;
  the reported person is not notified **(secondary)** https://beebom.com/how-report-whatsapp-messages.

### 1.6 闲鱼 Xianyu

- Safety: 闲鱼 says that once a trade leaves the platform it cannot monitor the trade, and in-platform links get
  warnings or are blocked. Common scam lines are 「平台手续费高」「资金被冻结」「走微信转账更快」; 闲鱼 never charges a
  「交易保证金」 or 「账户解冻金」 **(secondary, news reports)** https://m.thepaper.cn/newsDetail_forward_33486994,
  https://www.toutiao.com/zixun/7531174315682105344
- Read state: chat shows whether a message was read, a pattern from Taobao's chat **(secondary)**
  https://www.woshipm.com/pd/5964209.html
- The current store screenshots (闲鱼 7.28.80, id 510909506) show no chat frame, so the pinned item card and the
  report and block flows are not confirmed here.

### 1.7 Airtasker (from `2026-10-04-design-similar-apps.md`)

- Private messaging opens only once a task is assigned; threads sit under the Messages tab; poster is advised to
  message the tasker straight after assigning. https://support.airtasker.com/hc/en-au/articles/200294269,
  https://support.airtasker.com/hc/en-au/articles/360020701892-How-to-communicate-well-on-Airtasker
- Chat header pins a task chip (title · price · Assigned) with "Release payment" and "View task" **(observed, earlier
  study)**.

## 2. Findings per question

| #   | Question          | What the references do                                                                                                   | ★                                                     |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 117 | Tab rows          | Airbnb per reservation, Airtasker per task, Carousell per listing; none groups by person                                 | A: item art + title + other side + last line, newest  |
| 118 | Pinned header     | Carousell and Airtasker pin the item with its next action                                                                | A: small card under the nav bar with 看详情           |
| 119 | Safety hint       | Airbnb asks users to report off-platform payment; Carousell warns on links and personal details; 闲鱼 warns off-platform | A: fixed first card, 32 pt head, not dismissable      |
| 120 | Delivery states   | iMessage: red ! → Try Again, "Delivered" under the last message; WhatsApp: clock / ✓ / ✓✓                                | A: dim while sending, solid when stored, red ! failed |
| 121 | Long-press menu   | HIG: hide unavailable items, keep it short, red only for destructive; Airbnb allows edit and unsend                      | A: 复制 / 翻译 (from step 8) / 举报; no unsend        |
| 122 | Report flow       | Airbnb: reason → details → submit → offer block; WhatsApp: Report vs Report and block                                    | A: reason sheet + optional note, then offer block     |
| 123 | Block outcome     | WhatsApp: sender's message never delivers, not told; Airbnb: no new messages, history stays                              | A: history stays; composer replaced; sender fails     |
| 124 | Image source      | Grab: photos mostly show the pickup spot; PhotoKit picker needs no permission                                            | A: + menu with 照片 and 拍照                          |
| 125 | Read receipts     | Carousell "Seen", Airbnb on by default, 闲鱼 shows read; iMessage opt-in; WeChat none                                    | B (changed from A): 已读 under your last message      |
| 126 | Entry points      | Airtasker: message right after assigning; Grab: chat on the live ride card                                               | A: status page and home in-progress card              |
| 127 | Profile screen    | Guideline 1.2 needs report and block; HIG: context-menu actions also in the main UI; Carousell ⚠ in the chat nav bar     | A: not now; 举报 / 屏蔽 in the thread ⋯ menu          |
| 128 | Thread technology | Messages-quality keyboard handling is native in SwiftUI; RN needs a library                                              | A: RN + keyboard-controller after a half-day spike    |

## 3. What a native iOS implementation gets for free

- Context menu with a lifted preview of the bubble, haptic and VoiceOver actions: `ContextMenu` from
  `@expo/ui/swift-ui` (already used in `src/features/bounty/select/ApplicantRows.tsx`). It has to be checked for
  scroll performance when every bubble is wrapped (Task 0 of the plan).
- Photo picker with no library permission (PHPicker via `expo-image-picker`, already installed). The camera needs a
  purpose string; today's string in `app.json` covers only scanning receive codes, so 124A changes it in all three
  locales.
- Destructive confirmation as a system action sheet (block), as in the existing bounty block flow.
- In SwiftUI only: interactive keyboard dismissal (`scrollDismissesKeyboard(.interactively)`) and a growing input
  (`TextField(axis: .vertical)`). In RN these come from `react-native-keyboard-controller`, which is not installed.

## 4. Changes made on the canvas

- Every question now ends with a one-line ★ reason and a reference line; options that were text only are drawn.
- 120 gains option B (「已送达」 under the last message, iMessage) and C (✓ on every bubble, WhatsApp).
- 121: 翻译 is hidden, not dimmed, until step 8 (HIG); 举报 sits in its own last group in label colour, since it
  destroys nothing; red is kept for 屏蔽.
- 123 draws both sides; context notes Airbnb's delayed block during an active reservation and why Tapiro does not need
  it (payment does not go through chat).
- 124 notes the camera purpose string change.
- 125: ★ moved from A (none) to B (已读 under your last message, bounty threads only), with C (a switch, WhatsApp).
  Reason: every transaction reference shows read state and a bounty is time-critical; only social chat hides it.
- 127 draws the thread ⋯ menu (看详情 / 举报小林 / 屏蔽小林).

## 5. Gaps the questions do not cover

- Status events in the thread (已选你、已完成、已付款) as system rows, as Carousell does with offers. Not asked; the
  status page owns these today.
- Blocking during an assigned bounty: what happens to the bounty itself (cancel, keep for payment). Airbnb delays the
  block until after the stay; Tapiro needs a rule before Task 6.
- Group read state for rides (「3 人已读」) is left to the carpool chat.
- Quick replies (Grab templates, the sticker set from the similar-apps study) are not in v1.
- Link and contact filtering (Carousell blocks links and emails) would serve Guideline 1.2's filter requirement; the
  plan has no filter yet.

## 6. Unreachable

- WhatsApp Help Center bodies (`faq.whatsapp.com`) render client-side; only titles and search summaries were read.
- Carousell Help Centre articles on blocking and reporting did not appear in search.
- 闲鱼 has no public help pages for chat reporting and blocking; its store screenshots show no chat frame.
