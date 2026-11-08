---
branch: fix/reputation-unpaid-rides-distinct
---

# Retro: 264 A, unpaid rides add no people

One migration (`20261109000000_unpaid_rides_no_people.sql`) and one pgTAP file. No new column: a ride's settled row
without a payment is only written by `record_ride_settled`, so `payment_id` already tells paid from unpaid.

- **Check failed once (pgtap-fixture-shape).** The first filter (`payment_id is not null`) failed 25 tests in
  `reputation.test.sql` and `reputation_reviews.test.sql`: their fixtures insert bounty rows without a payment. Scoping
  the rule to rides (`item_kind <> 'ride' or payment_id is not null`) matches the decision's wording and kept the
  fixtures valid. Running the whole suite before writing docs caught it; no escalation.
- **Test design.** A no-show on a closed ride stays `appeal_pending` until the appeal window lapses, so it did not move
  the rate inside one test transaction; the completion check uses settled counts instead.
- **Copy.** 「帮到 N 个新的人」 (tier drop) never promised that rides count; left as is.
