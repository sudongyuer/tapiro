---
branch: feat/iap-asc-products
date: 2026-11-24
pr: App Store Connect coin products, an honest sheet when StoreKit has none, and a release preflight
title: Coin products in App Store Connect
escaped: 1
rework: 0
interventions: 0
overturned: 0
---

# Retro: Coin products in App Store Connect

## Core (mandatory)

| Dimension | Measure               | This step                                                                  |
| --------- | --------------------- | -------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 1: two TestFlight builds shipped a buy sheet that could never load a price |
| Quality   | Skipped verifications | No TestFlight purchase: the Paid Apps agreement is the owner's             |
| Speed     | Wasted time           | None                                                                       |
| Autonomy  | Interventions         | 0                                                                          |

## Findings

- The coin products existed in the `.storekit` file and the hosted `iap_products`, but never in App Store Connect;
  nothing in the release path compared them, so TestFlight 1036 and 1730 shipped a shop StoreKit could not fill.
  Lowest layer: `scripts/testflight.sh` now runs `scripts/iap-preflight.mjs` and stops on any pack missing from App
  Store Connect (unit-tested comparison).
- StoreKit answers an empty list, not an error, for unknown products or a missing Paid Apps agreement. The sheet showed
  「现在买不了貘币，请稍后再试」 with no 重试, which hid the cause. The store now treats no sellable pack as a failed load
  (code structure), with `ui:coins_buy_none`.
- The fixture prices (RM 4.90 / 9.90 / 29.90) had drifted from the plan's RM 5 / 10 / 30; they now match the App Store
  Connect price points so the review screenshot shows the real prices.
- UI run (18 runs: coins_buy, coins_buy_load, coins_buy_none in zh-Hans, en, ms, light and dark) passed; two first runs
  on freshly booted Simulators lost the AXe automation session (AXe timed out creating the remote automation session)
  and passed on the runner's retry. Tag: axe-session-boot; outside cause, no case change.
