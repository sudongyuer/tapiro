# Reviews, profile and mascot level: reference research

Researched 2026-11-06 for foundation steps 5 (account-free part) and 6 (`docs/plans/2026-10-30-coins-reputation-remaining.md`),
canvas questions 238–255. The questions: when to ask for a review, how the sealed two-sided state reads, the reply,
what a profile leads with, and how a level or a weekly reward is shown. The earlier reputation study
(`docs/research/2026-10-04-reputation.md`) covers tiers, Airtasker, BlaBlaCar, Airbnb Superhost, Duolingo streaks and
Finch. This note does not repeat it.

What is already decided (not asked again): three faces plus chips plus an optional sentence; reviews only after
settlement; sealed until both submit or 7 days; one reply by the reviewee; only chips count toward 靠谱度; profile
content per RepBC; the tier-drop sheet without a sad mascot; the level curve; the weekly feed is a tap on 小貘 on the
home stage.

Sources and method:

- Help pages fetched 2026-11-06. Where only a third-party page or a search summary was available, the line says
  **(secondary)**. Where nothing could be checked, the line says **(unverified)**, and the canvas says so too.
- Canvas: https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o, page 「06+ 评价、主页与小貘等级」, boards
  `RepPick1.dc.html` (238–244), `RepPick2.dc.html` (245–250) and `CoinPick1.dc.html` (251–255).

## 1. References

### 1.1 Airbnb

- Both sides have "14 days after checkout to submit their review". "Reviews are only posted after both parties have
  submitted their reviews" or when the 14 days end. On checkout day "both the guest and their host will be prompted
  to" leave a review. "You can post a public response to a published review that someone has left for you."
  https://www.airbnb.com/help/article/13
- A related help entry says "You can edit a review for a home until your review is published" **(secondary: seen as
  a summary on the page above, not opened)**.

### 1.2 Carousell

- Feedback needs a deal made through "Make Offer". It is left from the chat ("Leave feedback" under the item) as
  Positive, Neutral or Negative with a comment, within 14 days. Feedback appears once the other side reviews or the
  14 days pass, and cannot be edited once published **(secondary: topbubbleindex.com, ginee.com; the official help
  centre did not come up)**.

### 1.3 闲鱼 Xianyu

- Two searches found no official text on the review window, a default rating or blind reveal. Consumer complaints on
  tousu.sina.com.cn show that the platform blocks reviews it judges abusive ("卖家人品不好" was removed)
  **(secondary)**. Taobao's default positive rating after 15 days is in the 2026-10-04 study **(unverified there
  too)**. Tapiro does not copy a default rating: a review the user did not write must not count.

### 1.4 Uber and Grab

- Uber asks for more detail when a rating is below 5 stars, and offers compliment badges only with a 5-star rating
  (https://www.uber.com/u/beyond-5-stars) **(secondary: search summary of the page)**.
- Grab Malaysia: drivers rate passengers on 5 stars and a submitted rating cannot be changed
  (https://grab.com/my/blog/driver/new-rating-feature); driver badges show passenger compliments
  (https://www.grab.com/ph/blog/driver/car/driverbadges/) **(secondary)**. No Grab help page on the passenger's
  post-ride prompt was found.

### 1.5 BlaBlaCar

- Drivers and passengers rate each other after the trip (third-party guides cite a 24-hour window). Whether
  passengers rate each other could not be confirmed **(secondary)**.

### 1.6 Duolingo

- The design team rebuilt the streak milestone celebration; milestone days get their own animation and ordinary days
  a counter update (https://blog.duolingo.com/streak-milestone-design-animation,
  https://blog.duolingo.com/how-duolingo-streak-builds-habit). The 2026-10-04 study has the retention figures and the
  argument against streaks for Tapiro.

### 1.7 Apple

- HIG, Sheets: "A sheet helps people perform a scoped task that's closely related to their current context." It is
  for "a simple task that they can complete before returning to the parent view."
  (https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sheets.json). HIG, Context menus
  (quoted in the chat research): hide unavailable items, do not dim them.

### 1.8 Invite codes

- Referral pages of Grab and Shopee need an account and were not checked. The canvas drew the common shape (code,
  share, progress list) and marks the reference as unchecked.

## 2. What carries over

| Question | Takeaway                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 238      | Airbnb and Carousell attach the review entry to the deal (checkout day, the chat item). Tapiro: a row on the settled status screen plus one home card.  |
| 239      | A sheet suits a short task that returns to its context (HIG).                                                                                           |
| 240      | Uber asks why only on a low rating; Airtasker splits rates by role. Tapiro: chips per role and kind, so a negative chip always means something true.    |
| 241      | Agreements and money in a ride run between the organiser and each rider; reviews follow them.                                                           |
| 242      | Airbnb and Carousell reveal on both-submitted or at window end. Telling the other side "they have reviewed you" adds a nudge without revealing content. |
| 243      | Airbnb allows one public response.                                                                                                                      |
| 244      | Airbnb allows edits until published; a sealed review hurts nobody when edited, while a mis-tap lowers someone's 靠谱度.                                 |
| 245–247  | Trust first when choosing (Airtasker completion rate, BlaBlaCar levels); the profile opens wherever a person is chosen or met.                          |
| 248      | Reputation Design B: say why and how to recover, once.                                                                                                  |
| 249–250  | Duolingo keeps the big moment for milestones; Finch ties growth to small rewards (accessories).                                                         |
| 253–254  | No streak and no push: a weekly, forgiving reward announced by 小貘 itself.                                                                             |
