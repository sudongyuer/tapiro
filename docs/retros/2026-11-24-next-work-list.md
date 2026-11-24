---
branch: chore/story-map-open
date: 2026-11-24
topic: next-work-list
---

# Retro candidates: what is left to build

- What happened: asked what development could continue, I listed release plumbing, AX5 fixes, store listing and
  China phase 2, and left out the v1 business stories that are still `planned` or carry `gap: not built` in
  `docs/story-map.md` (pay.cant-pay, ride.split.receipt, bounty.flow.eta-overdue, pay.sheet.offline). The owner asked
  「还有业务功能不是没开发完么」.
- Cost: one extra round with the owner.
- Root-cause class: answered from session memory (recent PRs and status.md's queue) instead of the source that lists
  unbuilt behaviour, the story map's status and gap columns.
- Tag: `remaining-work-source`
- Candidate fix: a `scripts/check-story-map.mjs --open` listing (v1 stories not done, criteria with `not built`) to
  run before answering what is left.
- Landed: `node scripts/check-story-map.mjs --open` lists every unfinished story and every criterion with a bare
  planned category or a gap, v1 first; the default summary names the planned-only ids; AGENTS.md (Checks) says
  remaining work is read from it.

- What happened: I then told the owner the purchase path was code-complete and only waited on the Paid Apps
  agreement. App Store Connect has no in-app purchase products at all (`inAppPurchasesV2` is empty), so on TestFlight
  the 买貘币 sheet can never load a price. The owner asked 「不是购买链路也没有么」.
- Cost: a wrong status given to the owner; the gap had shipped in every TestFlight build since 1739.
- Root-cause class: "built" was judged from repo code and local StoreKit runs; nothing checks that the store-side
  configuration the release build depends on (IAP products, prices) exists.
- Tag: `store-config-unchecked`
- Candidate fix: `scripts/testflight.sh` (or a release preflight) fails when a product in `iap_products` is missing
  from App Store Connect.
