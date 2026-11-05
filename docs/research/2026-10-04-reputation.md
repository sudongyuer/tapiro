# Tapiro: reputation growth and leveling research

Date: 2026-10-04. Scope: how Tapiro's reputation can grow from real completed help, in the way Duolingo makes progress feel good, without handling money and without guilt mechanics.

Already decided for trust v1 (not reopened here): (a) the sticker book is the reputation, so each completed task gives both sides a sticker and the profile is a sticker wall; (b) an optional school-email badge; (c) a personal review section that records negative reviews too.

Citation convention: every factual claim links to its source. **[unverified]** marks claims that come only from a search-result snippet, a third-party guide or a community wiki that could not be fetched or checked against a primary source.

---

## 1. Duolingo progression systems

| Mechanic | How it works | Evidence on effect |
|---|---|---|
| Streak | Count of consecutive days with at least one lesson. | Users who reach a 7-day streak are "3.6 times more likely to complete their course" ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)). In Q3 2022, 10M of 14.9M DAUs had a streak longer than 7 days and 2.3M had one longer than 365 days ([Q3 2022 shareholder letter, SEC](https://www.sec.gov/Archives/edgar/data/1562088/000156208822000163/q3fy22duolingoshareholde.htm)). |
| Lowering the streak bar | The streak was decoupled from the daily XP goal, so one lesson now extends it. | A/B test: D14 retention +3.3%, DAU +1%, daily learners on a streak +10.5%. After one year, users on a 7+ day streak were up more than 40% ([Duolingo blog, "Improving the streak"](https://blog.duolingo.com/improving-the-streak/)). Duolingo's stated lesson is that lowering the barrier to a consistent habit matters more than the amount done each day. |
| Streak Freeze | Protects the streak on a missed day. Learners can now equip two. | Allowing two equipped freezes raised daily active learners by +0.38%. Duolingo justifies freezes with University of Pennsylvania / UCLA research showing that "slack" in goal pursuit sustains persistence. It also says that losing a streak "can have the opposite effect, and actually feel quite de-motivating" ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)). A "21% churn reduction" figure circulates on secondary blogs **[unverified]**. |
| Streak milestone animation | Celebration at milestone days. | New-learner retention +1.7% ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/), see also [the animation post](https://blog.duolingo.com/streak-milestone-design-animation)). |
| Leagues / leaderboards | Weekly XP leaderboard. Users are matched with people who have "similar study habits" and are in a similar time zone. There are 10 leagues, up from 5 when the feature was first tested in 2018, and the top 10 in Diamond enter a tournament ([Duolingo blog](https://blog.duolingo.com/duolingo-leagues-leaderboards/)). | The official post gives no metric. A "+25% lesson completion" figure appears on a third-party site **[unverified]** ([Deconstructor of Fun](https://duolingo.deconstructoroffun.com/mechanics/leagues)). Leaderboards were modeled on Zynga-style leagues ([Lenny's Newsletter, Jorge Mazal](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)). |
| Friend Streak | A shared streak with up to 5 friends, both of whom must do a lesson daily, plus a "nudge". | Learners with at least one friend streak are "22% more likely to complete their daily lesson" ([Duolingo blog](https://blog.duolingo.com/friend-streak/)). |
| Friends Quests | A weekly cooperative goal with one friend. In 2025, matching opened to learners without friends ([Duolingo blog](https://blog.duolingo.com/friends-quests/), [2025 highlights](https://blog.duolingo.com/product-highlights/)). | No public metric found. |
| XP / gems / achievements | XP per lesson, gems as soft currency (buy freezes, refills), achievement badges for milestones ([third-party guide](https://duoplanet.com/duolingo-gems-and-lingots/) **[unverified]**). | Gems connect to monetization. In Q3 2022, a gem-based mode was described as "increasing in-app purchases" ([SEC letter](https://www.sec.gov/Archives/edgar/data/1562088/000156208822000163/q3fy22duolingoshareholde.htm)). |

**What carries over to Tapiro.** Make the first step small: the first sticker should come from the smallest task. Celebrate milestones. Make social and cooperative progress visible, as Friend Streak does. Give "slack" instead of punishment.

**What does not carry over.** Daily streaks and weekly XP leagues reward frequency. Tapiro's supply of help is driven by demand, because nobody can help if nobody nearby posts a task. A streak would punish users for a lack of demand and would push them toward fake tasks. A leaderboard ranking helpers by volume invites farming and makes help competitive.

---

## 2. Reputation in peer and two-sided marketplaces

| Platform | Mechanism | Takeaway for Tapiro |
|---|---|---|
| **Airbnb Superhost** | Four criteria over the past 12 months: at least 10 stays (or 3 stays totaling at least 100 nights), a 90% response rate within 24h, a cancellation rate under 1% with exceptions for valid reasons, and an overall rating of 4.8 or higher. Assessed quarterly on Jan 1, Apr 1, Jul 1 and Oct 1. Benefits are added search visibility, rewards and a badge ([Airbnb help 829](https://www.airbnb.com/help/article/829)). | A status computed over a rolling window and rechecked on a fixed cadence. It combines volume, reliability and quality, and its status can be lost. |
| **Airbnb reviews** | 14-day window. Reviews are hidden until both sides submit or the window closes. A host can post one public response. Honest negative reviews stay ([Airbnb help 13](https://www.airbnb.com/help/article/13)). Retaliatory or extortion reviews can be removed ([Airbnb resource center](https://www.airbnb.com/resources/hosting-homes/a/how-to-handle-a-retaliatory-review-552)). | Simultaneous reveal, reply rights and narrow removal rules. |
| **eBay** | Positive +1, neutral 0, negative −1. Repeat positives from the same buyer in the same week count once. Buyers have 60 days to leave feedback ([eBay help 4007](https://www.ebay.com/help/buying/leaving-feedback-sellers/leaving-feedback-sellers?id=4007)). One reply per feedback. Extortion and manipulation are prohibited ([eBay feedback policy](https://www.ebay.com/help/policies/feedback-policies/feedback-policies?id=4208)). Since 2008, sellers can leave only positive feedback for buyers ([eBay help via search snippet](https://www.ebay.com/help/buying/leaving-feedback-sellers/leaving-feedback-sellers?id=4007) **[unverified: not on the fetched page]**). | Repeat-pair dampening is a cheap, proven anti-collusion rule. |
| **Uber** | Rating is the average of the last 500 ratings. Uber excludes ratings from riders who "consistently" rate low and ratings that cite factors outside the driver's control, such as navigation, the pin or co-riders ([Uber ratings](https://www.uber.com/us/en/drive/basics/how-ratings-work/), [Uber ratings protection](https://www.uber.com/us/en/blog/ratings-protection/)). Deactivation is said to happen near 4.6 **[unverified, third-party]**. | A rolling window acts as decay. Filtering out harsh raters and "not your fault" tags makes negatives fairer. |
| **Grab driver tiers (Malaysia)** | Member, Gold, Platinum, Ultimate. The Alor Setar example: quarterly rides of 50 or more for Gold, 350 for Platinum and 1,000 for Ultimate; cancellation rate ≤4% (≤3% for Ultimate); rating 4.9 or higher. Thresholds vary by city. Tiers refresh quarterly. Perks are insurance, partner discounts and upskilling ([GrabBenefits MY](https://www.grab.com/my/grab-benefits/)). | A model local users already know: tiers that refresh quarterly and can be lost. |
| **TaskRabbit Elite** | Performance Score (invoiced tasks ÷ invitations, per skill) in the top 35% of the metro area, plus volume and no policy violations ([TaskRabbit support](https://support.taskrabbit.com/hc/en-us/articles/46260436549915-Elite-Status-Overview)). Also 7 tasks/month, 150 lifetime tasks and 40 lifetime tasks in the category ([TaskRabbit support](https://support.taskrabbit.com/hc/en-us/articles/46260521586715-What-s-Required-to-Become-an-Elite-Tasker) **[unverified: from snippet]**). | Status is scoped per skill, so reputation is per category. |
| **Airtasker** | Two completion rates, one as Tasker and one as Poster. Only cancellations caused by you count. The rate is shown only after 5 completed tasks ([Airtasker blog](https://www.airtasker.com/blog/airtasker-feature-completion-rate/)). Verbal bands: 90–100% highly reliable … <50% extremely unreliable ([Airtasker support](https://support.airtasker.com/hc/en-us/articles/225875007-What-are-completion-rates) **[snippet]**). Badges cover ID, police check, licences and partner skills ([Airtasker blog](https://www.airtasker.com/blog/airtasker-badges/)). | **The closest analogue to Tapiro's no-shows**: rates on both sides, fault-based counting and a minimum sample before display. |
| **BlaBlaCar** | Experience levels: Newcomer, Intermediate, Experienced, Expert, Ambassador. Based on verification, profile completion, number and percentage of positive ratings, and seniority ([BlaBlaCar FAQ](https://www.blablacar.co.uk/faq/question/what-are-experience-levels)). Reported thresholds run from 1 rating, >60% positive and 1 month up to 12 ratings, >90% and 12 months **[unverified: snippet, page 403]**. | Seniority plus a positive ratio makes a cheap, legible ladder with few events, which suits low-frequency peer help. |
| **Carousell** | Positive / neutral / negative plus stars. Feedback is said to appear once both submit or the window closes, and the giver can amend it ([third-party guide](https://myuserfeedback.com/blog/struggling-with-carousell-feedback-practical-guide-reviews-disputes-boosting-sales)) **[unverified]**. | The SEA C2C norm users already know. |
| **闲鱼 (Xianyu)** | Three systems. 芝麻信用 (Sesame Credit) is shown in 5 bands on listings and profiles. 闲气值 tracks account safety; below 80, the account is restricted, muted or banned. 鱼力值 is computed separately as buyer and seller from positive-review rate, refunds and disputes. Reported problems: almost everyone sits at "good or above", so the signal is weak; new accounts farm about 20 good reviews within two months; violators delete the account and re-register ([腾讯新闻](https://news.qq.com/rain/a/20240626A042LY00)). Benefits apply at 鱼力值 ≥800 with buyer and seller scores each ≥350 ([百家/知乎 summary](https://zhuanlan.zhihu.com/p/666456202) **[unverified]**). | A three-way split: identity/safety score, behavior score and transaction score. Shows how inflation and farming happen when completion is cheap. |
| **Taobao** | If one side rates positive and the other does not rate within 15 days, the system records a default positive ([知乎](https://www.zhihu.com/question/265275173) **[unverified]**). Paying for good reviews (好评返现) has been banned on Taobao since 2021-12-28, and by JD and others ([界面新闻](https://www.jiemian.com/article/7008859.html)). Since 2024-09-01 it is illegal under 《网络反不正当竞争暂行规定》 ([新浪](https://finance.sina.com.cn/tech/roll/2024-09-26/doc-incqmcmc3689654.shtml)). | Default positive ratings drive inflation, so avoid them. Bribed reviews are a known pattern in Chinese users' culture, and Tapiro's offline rewards are a vector for them. |
| **美团骑手** | Levels run 青铜 → 王者, with 4 sub-levels each. Reported mechanics: +1 "蜂值" per order, +2 per good review, −4 for lateness, more for complaints. Higher levels get dispatch priority and lateness exemption ([知乎](https://zhuanlan.zhihu.com/p/59595136), [澎湃 survey](https://www.thepaper.cn/newsDetail_forward_6733259)) **[unverified details]**. This system is widely criticized as "困在系统里" (trapped in the system) ([知乎](https://zhuanlan.zhihu.com/p/225120404)). | An anti-pattern for volunteer help: penalties that compound and a level that rules the user. |
| **Stack Overflow** | +10 per upvote ([Wikipedia](https://en.wikipedia.org/wiki/Stack_Overflow)). Privileges unlock as reputation grows: upvote at 15, downvote at 125, edit others' posts at 2,000, close votes at 3,000 ([search summary of the SO help center](https://stackoverflow.blog/2010/03/19/important-reputation-rule-changes/) **[unverified: stackoverflow.com/help/privileges blocked to fetch]**). | **Privileges unlocked by reputation** is the best model for "what levels unlock": trust earns capability, not cosmetics alone. |
| **Reddit karma** | Approximately reflects up and down votes, not 1:1, and some communities require a minimum karma to post as a spam control ([Reddit help](https://support.reddithelp.com/hc/en-us/articles/204511829-What-is-karma)). Upvotes from established accounts reportedly weigh more **[unverified]**. | A fuzzy, non-exact score discourages optimizing against it. |
| **小红书** | 10 levels from 尿布薯 to 金冠薯, earned through actions such as posting and getting likes or saves. Higher levels reportedly bring more exposure ([知乎](https://zhuanlan.zhihu.com/p/581089494), [新榜](https://xh.newrank.cn/product/article/article-detail/48b1a97167e54fe1)) **[unverified]**. | Cute level names are culturally familiar to the users. A "小貘" level-naming scheme would land, but the names should stay on stickers and the mascot, not in UI chrome. |
| **Couchsurfing** | Once had "vouching" on top of references. Vouching was removed because references were enough ([search summary, Couchsurfing](https://support.couchsurfing.org/hc/en-us/articles/50041760259355-What-Are-References-and-How-Do-They-Work) **[unverified]**). | Keep one endorsement channel. |

---

## 3. Gamified care and growth apps

| App | How growth is tied to real behavior | Failure modes |
|---|---|---|
| **Finch** | Self-set goals such as drinking water or a walk give energy. The bird grows, goes on adventures and gains accessories ([Finch](https://finchcare.com/about-finch)). | Users report guilt on reopening after missed days because "the thing that was supposed to make self-care easier" becomes "one more place where you are behind" ([aidorable blog](https://www.aidorable.ai/blog/finch-self-care-pet-app) **[opinion]**). Self-reported goals are trivially gameable, which is acceptable only because nobody else depends on them. |
| **Forest** | A tree grows during a focus session and dies if you leave the app. Completed trees stay in your forest. Coins can fund real trees: more than 2.1M planted with Trees for the Future, up to 5 per account ([forestapp.cc](https://forestapp.cc/)). | The loss mechanic is described as intentional: a "small sense of loss" ([forestapp.cc](https://forestapp.cc/)). The permanent forest is the positive half: history never disappears. |
| **Pokémon Sleep** | Drowsy Power = Snorlax Strength × Sleep Score, and more Pokémon appear. Strength cannot go down within a week and resets each Monday ([Game8](https://game8.co/games/Pokemon-Sleep/archives/418690), [Charlie INTEL](https://www.charlieintel.com/pokemon/pokemon-sleep-how-to-increase-sleep-score-268788/)) **[third-party]**. | A weekly reset with no downside is a growth loop that never punishes. |
| **Habitica** | Missed Dailies cost HP. In a quest, everyone's missed Dailies damage the whole party ([Habitica wiki](https://habitica.fandom.com/wiki/Health_Points) **[wiki]**). There is a "Pause Damage" option. | Documented frustration: parties dying repeatedly and taking 35–45 damage/day ([Habitica GitHub #3161](https://github.com/HabitRPG/habitica/issues/3161), [#5919](https://github.com/HabitRPG/habitica/issues/5919)). Shared punishment for social accountability backfires. |

**Motivation risk.** Extrinsic rewards can crowd out intrinsic motivation (the overjustification effect). This is supported by Deci, Koestner and Ryan's 1999 meta-analysis of 128 studies and applies to volunteering ([Decision Lab summary](https://thedecisionlab.com/biases/overjustification-effect)). Self-determination-theory guidance says to keep rewards *informational* ("you are reliable") rather than *controlling* ("do X to keep your level") ([Rutledge et al. 2018, SDT](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2018_RutledgeWalshEtAl_Gamification.pdf)). For a help app this is the main design constraint: levels should *recognize* help, not *demand* it.

---

## 4. Anti-gaming and fairness

### 4.1 Rating inflation
- Average feedback rose sharply over a decade on one online labor marketplace, with heavy top-censoring. At least 35–45% of the rise came from raters using lower standards, not from better service. Inflation is the equilibrium when bad feedback is costly to give ([Filippas, Horton & Golden, Marketing Science 2022](https://john-joseph-horton.com/papers/longrun.pdf), [paper page](https://john-joseph-horton.com/papers/reputation-inflation/index.html)).
- 闲鱼's 芝麻信用 band carries little information because almost everyone is "good or above" ([腾讯新闻](https://news.qq.com/rain/a/20240626A042LY00)).
- **Implication.** Star averages on Tapiro would converge to about 5.0 quickly. Prefer signals that do not inflate: completion and no-show *rates*, counts of distinct people helped, and specific praise tags. Add a **private** "anything the team should know?" channel, because raters pay no social cost for private feedback.

### 4.2 Retaliation and blind reviews
- In Airbnb's experiment, simultaneous reveal raised review rates. Reviews containing negative text increased by 12% (guests) and 17% (hosts), and guest 1-star ratings fell by 31%. Users felt more comfortable being honest ([EurekAlert summary of Fradkin, Grewal & Holtz, Marketing Science 2021](https://www.eurekalert.org/news-releases/933743), [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2939064)).
- Reply rights: Airbnb allows one public response ([Airbnb help 13](https://www.airbnb.com/help/article/13)), and eBay allows one reply that cannot be edited ([eBay](https://www.ebay.com/help/policies/feedback-policies/feedback-policies?id=4208)).
- Removal is narrow. Airbnb and eBay remove reviews for extortion, retaliation, threats, irrelevance and personal info, but not honest negatives ([Airbnb resource center](https://www.airbnb.com/resources/hosting-homes/a/how-to-handle-a-retaliatory-review-552), [eBay policy](https://www.ebay.com/help/policies/feedback-policies/feedback-policies?id=4208)).
- "Not your fault" exclusions: Uber removes ratings from consistently harsh raters and ratings tagged with causes outside the driver's control ([Uber](https://www.uber.com/us/en/blog/ratings-protection/)). Airtasker counts a cancellation only against the party that caused it ([Airtasker](https://www.airtasker.com/blog/airtasker-feature-completion-rate/)).

### 4.3 Collusion and fake completions (offline settlement)
- Sybil and pairwise collusion are standard attacks on reputation systems. The forms are two peers doing fake transactions to boost each other, groups and many accounts, plus whitewashing (re-registering to shed a bad history) ([Traupman, IFIPTM 2007](https://dl.ifip.org/db/conf/ifiptm/ifiptm2007/Traupman07.pdf), [Zhao et al., reliable reputation design](https://people.cs.uchicago.edu/~ravenben/publications/pdf/reputation-ecrj10.pdf)).
- 闲鱼 sees exactly this: about 20 good reviews within 2 months on new accounts, and delete-and-re-register after violations ([腾讯新闻](https://news.qq.com/rain/a/20240626A042LY00)).
- eBay counts repeat positives from the same buyer in the same week only once ([eBay](https://www.ebay.com/help/buying/leaving-feedback-sellers/leaving-feedback-sellers?id=4007)).
- **Tapiro-specific.** No money flows, so nothing costs anything: a fake task costs two friends ten seconds. Every point must therefore be (a) confirmed by both sides, (b) dampened for repeat pairs, (c) weighted by the counterpart's own trust (account age, school email) and (d) **independent of the declared reward amount**, because reward values are unverified text.

### 4.4 Decay and recency
- Rolling windows: Airbnb uses the past 12 months, rechecked quarterly ([Airbnb](https://www.airbnb.com/help/article/829)). Grab uses one quarter ([GrabBenefits](https://www.grab.com/my/grab-benefits/)). Uber uses the last 500 ratings ([Uber](https://www.uber.com/us/en/drive/basics/how-ratings-work/)).
- Pattern: **lifetime history is visible, while current status is computed over a window.** This lets negative reviews stay "recorded" (decision c) without one bad week being permanent in the *score*.

---

## 5. Cultural notes (Malaysia and China, students)

- **Scale and density.** 44,043 Chinese students made up 38.4% of all international students in Malaysia in 2023, and applications grew 25% in 2024 ([The Star](https://www.thestar.com.my/news/nation/2025/04/28/interactive-malaysia-sees-surge-in-chinese-student-applications), [Fulcrum](https://fulcrum.sg/2025-top-10-why-students-from-china-are-picking-malaysia-over-traditional-destinations/)). Each campus cluster is small, so reviewers and reviewees probably share friends and group chats. That raises the social cost of a public negative review, which is the mechanism behind inflation (§4.1). This is an inference.
- **面子 (face).** Mianzi shapes how Chinese consumers respond to service failures and recovery ([ResearchGate, mianzi and interactional justice](https://www.researchgate.net/publication/299509761_A_Closer_Look_of_Mianzi_Influences_on_Perceived_Interactional_Justice_by_Chinese_Customers_during_Service_Recovery_Process)). Chinese online reviews use "mitigation" devices that soften criticism ([Pragmatics, Culture & Society / ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S2211695817301745), abstract only, **[not read in full]**).
- **Malaysia.** Malaysia is collectivist with high power distance. In a Southeast Asian (Malaysian) health-professions study, trainees were reluctant to give critical feedback, especially upward, and mostly gave positive feedback ([Research Square preprint](https://www.researchsquare.com/article/rs-8704772/v1), [PMC scoping review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12781924)). This is indirect evidence, from education settings rather than marketplaces.
- **Gap.** I found **no** source specifically on Chinese students' reluctance to leave public negative reviews in Malaysia. Treat the following as a hypothesis to validate in user interviews: users will avoid public negatives and use private reports instead. Design for it anyway: structured "what went wrong" chips plus a private report path.
- **Bribed reviews are normalized in Chinese users' e-commerce memory** (好评返现), and paying for them is now illegal in China ([界面](https://www.jiemian.com/article/7008859.html)). With offline rewards, "I'll add RM5 if you give me a good review" is easy, so ban it explicitly and make it reportable.

---

## 6. Three reputation-growth designs for Tapiro v1

Shared ground rules for all three:
- **R1.** Only a *completed* task counts: the poster marks it done, the helper confirms, and a 48h objection window passes.
- **R2.** Points never scale with the declared reward amount.
- **R3.** The same pair counts once per 14 days for progression. eBay applies the same rule per week. The sticker is still issued, because the sticker book is a memory as well as a score.
- **R4.** Reviews use a 7-day simultaneous reveal. Each side gets one public reply. Disputes go to a manual queue.
- **R5.** No daily or weekly streak. No public volume leaderboard. Nothing decays from user *inactivity*: being away is never penalized.

### Design A: "贴纸本章节" (Sticker Book Chapters), a pure collection ladder

- **Earning.** Each completed task adds a die-cut sticker of that task to the book. A level is a *chapter*: 1 / 3 / 8 / 15 / 30 / 50 stickers that count for progression. Bonus "rare" stickers come from *variety* rather than volume: a first task in a new category, the first help to a new arrival in their first month, a task whose counterpart is school-verified.
- **Unlocks.** Purely cosmetic and expressive: book cover styles, foil or holographic sticker edges, 小貘 outfits, a profile "chapter" label. No functional privileges.
- **Negatives and no-shows.** These do not remove stickers. They appear in the separate review section from decision (c) and in an Airtasker-style completion rate, shown after 5 tasks.
- **小貘.** 小貘 "pastes" each new sticker in with a short die-cut moment. New chapters bring a new 小貘 pose on the book cover.
- **Anti-gaming.** R1–R3 only. Low stakes, because there is nothing to gain beyond cosmetics.
- **Effort.** S. Mostly content and art: sticker templates per category plus a counter.
- **Risks.** A sticker count signals *activity*, not *reliability*. A user with 30 stickers and 5 no-shows looks great at a glance. Little reason to keep going once collecting is no longer novel. Does not answer the question "can I trust this person to take me to the hospital?".

### Design B: "两层信誉: 贴纸本 + 靠谱度" (Two-layer reputation: Sticker Book + Reliability), recommended

Two signals, kept separate on purpose, following the Airbnb, Grab and Uber pattern: lifetime history plus current status over a rolling window.

1. **Layer 1, Sticker Book (lifetime, never shrinks).** As in Design A: stickers, chapters, variety rarities and cosmetic unlocks. This is the joy layer.
2. **Layer 2, 靠谱度 (current reliability tier, rolling 180 days, recomputed monthly).**
   - Inputs: counted completions (after R1–R3), *distinct* people helped, **completion rate** with fault-based no-shows and cancellations as on Airtasker, and the share of reviews with no negative chips. No star average, because stars inflate (§4.1).
   - Tiers, shown as plain native-iOS text badges, not cartoon:
     - **新朋友 (New friend)**: default.
     - **靠谱 (Reliable)**: at least 3 counted tasks with at least 2 distinct people, completion rate shown, no unresolved no-show.
     - **很靠谱 (Very reliable)**: at least 8 tasks with at least 5 distinct people, completion rate ≥90%, and either a school-email badge or account age ≥60 days.
     - **貘友 (Tapir friend)**: at least 20 tasks with at least 12 distinct people, completion rate ≥95%, school-verified, and no upheld dispute in the window.
   - **Unlocks**, following the Stack Overflow model of trust earning capability:
     - Sensitive categories gated by tier. *Posting* "accompany to immigration/hospital" or "enter my home / moving" is open to everyone, but those tasks can only be *accepted* by helpers at 靠谱 or above (configurable). This is the real safety value.
     - A "可靠的人" filter and a soft sort boost on the board. Featured placement is never bought and never volume-ranked.
     - Higher limits on simultaneous open tasks: 1 → 3 → 5.
     - 貘友 can vouch a newcomer once per month. The vouch counts as one "distinct person" for the newcomer's first tier, and the voucher's own tier is at stake if the newcomer is banned.
   - **Negative reviews and no-shows.**
     - A negative review is recorded publicly, in line with decision (c), and the reviewee gets one reply.
     - Only *structured* negative chips (late, no-show, rude, unsafe) affect the tier. Free text never does.
     - No-shows count only if the other side reports them and the accused does not contest within 48h, or if the dispute is upheld.
     - **Slack, not guilt**, in the spirit of the Streak Freeze: one "life happens" excused cancellation per 60 days if it is made more than 6h before the meeting. Using it is private and never shown.
     - Old negatives stay visible in history with their date, but fall out of the tier window after 180 days.
   - **小貘 expression.** 小貘 is not shown sad or punished. On tier-up, 小貘 hands over a special die-cut "tier sticker" that goes on the book's first page. On a drop, the app shows a calm native sheet ("你的靠谱度这个月是 新朋友 —— 原因：1 次未到场。完成 2 次互助即可恢复") with no mascot tears.
   - **Anti-gaming.**
     - R1–R5 apply.
     - Tier inputs count *distinct* counterparts, so one friend can only help once.
     - Counterparts under 14 days old or unverified count at 0.5 weight.
     - A cap of 3 counted tasks per 24h.
     - A collusion flag fires when two accounts mostly transact with each other (closed cluster), triggering manual review.
     - Bribing a review or threatening one (eBay and Airbnb call it "extortion") is reportable, with removal and a demotion.
     - Re-registration is limited by phone number plus school email. Whitewashing is the main threat (§4.3).
   - **Effort.** M. A tier job (monthly cron), a completion-rate calculation, a dispute queue (admin-only in v1), the category gate and the blind-review window.
   - **Risks.**
     - Demand in a small community may be too thin for anyone to reach 很靠谱. Thresholds must be tuned to real volume, and should start low.
     - Gating categories can block a genuine urgent need, for example "someone go with me to the hospital now". Mitigation: let the *poster* opt to allow any tier.
     - Dispute handling needs a human. Plan for founder-run moderation.

### Design C: "小貘成长 + 权限阶梯" (Tapir growth + privilege ladder), a mascot-centric Finch × Stack Overflow model

- **Earning.** Each user has their own 小貘 that "eats" help points: +10 per counted completion, +5 for each positive tag received, −15 for an upheld no-show or unsafe report. 小貘 grows through 5 stages (baby → teen → adult → elder → legend), and each stage unlocks a Stack Overflow-style privilege: post in sensitive categories, create group tasks, vouch, act as a community "flagger" whose reports skip the queue.
- **Unlocks.** Privileges as listed, plus 小貘 cosmetics and habitats.
- **Negatives and no-shows.** These subtract points, and the mascot can regress a stage.
- **小貘 expression.** Central. 小貘 is the reputation.
- **Anti-gaming.** R1–R3 plus point caps per day and per pair.
- **Effort.** L. A per-user mascot with growth states needs a lot of art and animation, and a point economy needs balancing.
- **Risks.**
  - Turning the mascot into the score breaks the art direction ("only the mascot is cartoon", and here the reputation itself becomes cartoony).
  - It invites the Finch guilt failure mode and turns penalties into "my tapir shrank", which is emotional loss aversion: a dark pattern for a help app.
  - A single number conflates activity with reliability, the same flaw as Design A.
  - Reputation-gated moderation powers are overkill at launch scale.

### Comparison

| | A Chapters | **B Two-layer** | C Tapir growth |
|---|---|---|---|
| Signals reliability, not just activity | No | **Yes** | Partly (one number) |
| Real safety value (category gating) | No | **Yes** | Yes |
| Negative reviews stay recorded but fair | Yes | **Yes (window + reply + chips)** | Weak (point loss only) |
| Guilt or loss-aversion risk | Low | **Low (calm sheet, slack)** | High |
| Fits "native UI + sticker moments" | Yes | **Yes** | No |
| Build effort | S | **M** | L |

## 7. Recommendation

**Design B, "两层信誉: 贴纸本 + 靠谱度".** It keeps all three v1 decisions. The sticker book becomes Layer 1. The school email becomes a tier input. Negative reviews stay recorded in public history while only recent structured chips drive the tier.

It takes the parts of Duolingo that suit a help app: a small first step, milestone celebrations and slack instead of punishment ([Duolingo](https://blog.duolingo.com/improving-the-streak/), [Duolingo](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)). It leaves out streaks and leagues, which would push fake tasks in a market limited by demand. Its unlock is meaningful trust, the Stack Overflow model, rather than vanity. Its rolling window with lifetime history follows what Airbnb, Grab and Uber converged on.

Cheap staging path:
1. Ship Layer 1 plus completion rate plus the blind review in v1.
2. Turn on the 靠谱度 tiers and category gating once real volume exists to tune thresholds.

### Open decisions for the user
1. Which categories are tier-gated by default? Recommendation: accompany to immigration or hospital, and enter home / moving.
2. Should tier names use playful 小貘 words (貘友) or plain words (靠谱 / 很靠谱)? Recommendation: plain words for the badge, playful words only on the tier sticker.
3. Should the vouch mechanic be in v1 or later? Recommendation: later.
4. Should the "life happens" excuse be allowed, and how often? Recommendation: once per 60 days.
