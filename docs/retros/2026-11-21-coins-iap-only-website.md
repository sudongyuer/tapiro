---
branch: docs/coins-iap-only
date: 2026-11-21
pr: the website says coins are bought in the app through Apple in-app purchase; Stripe removed from terms and privacy
title: Website said coins were paid by Stripe card payment while the app sells them through IAP
escaped: 1
rework: 0
interventions: 0
overturned: 0
---

# Retro: coins are IAP-only on the website

## Core (mandatory)

| Dimension | Measure               | This step                                                                                     |
| --------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 1: the live site named Stripe as the coin processor and promised our own 14-day card refunds  |
| Quality   | Skipped verifications | No UI case: no app screen or copy changed; the website is checked live with curl after deploy |
| Speed     | Wasted time           | None                                                                                          |
| Autonomy  | Interventions         | 0                                                                                             |

## Findings

- Cause: the website was written for the Stripe account application (2026-11-14) before IAP was built (2026-11-11
  plan, built later), and no decision row tied the website's payment copy to 「Coins: purchase」. When the purchase
  path changed in the app, nothing pointed at the website. Tag `copy-drift`.
- Guarantee: the decision now lives in foundation 「Coins: purchase」 and the IAP plan's Decided list, and
  `docs/status.md` 「Website」 states which payment path the site describes, so a later website top-up has to change
  the same rows. A lint for 「Stripe」 in `website/` would block the planned later top-up, so no check is added.
- Refund wording followed the payment path: IAP refunds go through Apple, and the server already removes refunded
  coins (`purchase_refund` ledger rows), so terms say that instead of promising refunds we cannot issue.
- First `tsc` and `bun test` runs failed: the worktree's `node_modules` predated the Google Sign-In dependency
  (`Cannot find module '@react-native-google-signin/google-signin'`). `bun install --frozen-lockfile` fixed both
  (3148 pass, tsc 0). Tag `stale-worktree-deps`; a fresh worktree needs `bun install` before the fast checks.
