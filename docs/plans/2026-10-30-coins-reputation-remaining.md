# Foundation steps 5 and 6: what is left (coins purchase, grants, reviews, profile, mascot level)

> Short plan written overnight 2026-10-30 by checking the foundation spec's steps 5 and 6 against main (b2fab87). It
> lists what is built, what is left, what is blocked on the user, and the UI questions to draw before each step
> starts. It is not a task plan yet.

**Spec:** `docs/specs/2026-10-11-foundation-design.md` (Decisions 「Coins: purchase / spend / free grants」, 「Ledger」,
「Reputation」, 「Reviews」, 「Mascot level curve」; Implementation order 5 and 6). Bounty spec prerequisites P1 and P2
carved parts of both steps out early. Story map: `coins.*`, `rep.*`.

## Built (do not rebuild)

| Piece                                                                                                                       | Evidence                                                                        |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Append-only `coin_ledger`, derived balance, `spend_post` / `refund_post`, 3 free posts a month shared by bounties and rides | `20261026000400_coin_ledger.sql`, `supabase/tests/coins.test.sql`               |
| Grants: new user 5, onboarding 3 × 1, each help settled 1 (max 10 a month, bounties only)                                   | `20261026000500_coin_grants.sql`                                                |
| Cost line on the bounty confirm screen (free n/3 or 1 coin and balance; no-balance state without purchase)                  | `src/features/bounty/post/CostSection.tsx`, bounty 2A                           |
| `reputation_events` (settled, no_show), `record_no_show` with the 60-day waiver                                             | `20261026000200_reputation_events.sql`                                          |
| `reputation_snapshots`, `private.tier_for` thresholds (KICKOFF 2026-10-27 "C"), daily 03:30 recompute, tier readable by all | `20261027000200_reputation_snapshots.sql`, `supabase/tests/reputation.test.sql` |
| Tier mark on board cards and applicant rows                                                                                 | `src/ui/TierMark.tsx`, bounty 26A / 48A                                         |
| Stickers for both sides on settle, the read-only book 「一起办成的事」; step 9 turns it into a card stack and calendar      | `20261026000700_settle_both_sides.sql`, `src/features/stickers`                 |

## Left in step 5 (coins)

1. **Purchase (IAP).** Three consumable packs (RM5 → 5, RM10 → 11, RM30 → 35 at the nearest Apple Malaysia price
   points), server verification before credit, `iap_transactions`, a `purchase` `coin_reason`, the purchase sheet,
   「购买处理中」 for pending, and the no-balance sheet gaining the packs. Library: no first-party Expo module; a spike
   picks between a community IAP module and StoreKit 2 in the kit (AGENTS.md: native code lives in the kit).
2. **Weekly feed.** Tap 小貘 on the home stage once per calendar week (Monday 00:00 Malaysia time) for 1 coin
   (F7). Not built: no `weekly_feed` reason, no stage tap handler. Needs no account.
3. **Invites.** 3 coins to each side after the friend's first settled item. Needs an invite code or link; a universal
   link needs Associated Domains, so it waits for the developer account. A typed code works without one.
4. **Coins in 我的.** Balance and history (foundation: "Balance in 我的"). Not built.
5. **Pantry swap** (`pantry_swap` reason) arrives with step 8 (`docs/plans/2026-10-30-ask-tapir.md`).

**Blocked on the user (accounts, paid):** the Apple Developer Program membership; the app record in App Store Connect;
the Paid Applications agreement with banking and tax; the three consumable products; an In-App Purchase key (`.p8`) for
the App Store Server API, stored as a Supabase secret; a Sandbox tester. Until then items 2 and 4 (and 3 with a typed
code) can ship.

**UI questions to draw before step 5 starts:** where the balance and history live in 我的; the purchase sheet (system
StoreKit sheet is fixed, the pack list around it is ours); pending and failed purchase states; the weekly-feed moment on
the home stage (tap target, once-a-week feedback, Reduce Motion); the invite entry and the code screen.

## Left in step 6 (reviews, profile, mascot level)

1. **Reviews.** Three faces 开心 / 一般 / 不开心 + structured chips + optional sentence, only after settlement, sealed
   until both submit or 7 days, one reply by the reviewee (ReviewA board, RepBC). Tables `reviews`, `review_replies`;
   reveal job; account deletion removes the user's reviews (F10). Reviews join the recompute as "share of reviews
   without negative chips" (foundation 靠谱度 inputs; free text never counts).
2. **Profile screen** (RepBC "B+C"): name, tier as text plus the mascot-head row, sticker count and level, recent
   public reviews; ⋯ with report and block (chat question 127 decides whether a minimal profile comes earlier). Entry
   from the poster row on the bounty detail (37A said it is not tappable until a profile exists), applicant rows and
   chat.
3. **Tier drop sheet.** A calm native sheet with the reason and how to recover, no sad mascot (Design B). Needs a
   "seen" record per drop.
4. **Mascot level.** Curve Lv2 3, Lv3 8, Lv4 15, Lv5 25, then every +15 stickers; cosmetics only; the level-up moment
   (RepBC2 「小貘长大的时刻」). Depends on the answer to carpool question 112 (one card per person per ride), since the
   level counts cards.

**Blocked on the user:** nothing.

**UI questions to draw before step 6 starts:** when the review prompt appears (after the payee celebration, after the
payer's 已结清 card, or a home card); the chip list per role and kind (bounty poster / helper, ride organiser / rider)
in three languages; the sealed state on both sides; the reply; the profile layout against RepBC with real data
(new user, worst-case names, 0 and 99+ reviews); where the level-up moment plays; the tier-drop sheet copy.

## Order

Step 6 needs no account and makes the tier real (reviews) and gives report and block a profile, so it can run as soon
as its questions are drawn and answered. Step 5's purchase waits for the account; weekly feed and coins in 我的 can be a
small PR on their own.
