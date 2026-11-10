---
branch: docs/iap-live-activity-plans
---

# Retro: plans for the account-free halves of IAP and the Live Activity

Docs only: two plans, a Queue pointer and questions 268–278. No defects or rework.

- Finding worth keeping: a StoreKit configuration set in the scheme is reported to apply only when the app is launched
  from Xcode, not through `xcodebuild` (RevenueCat docs; Apple forum thread 826971). The IAP plan's first spike measures
  it on Xcode 27.2 before any task relies on `expo run:ios` for purchases.
- Apple's documentation pages render client-side; their JSON at `developer.apple.com/tutorials/data/documentation/<path>.json`
  gives the text for primary-source checks. Not escalated: one use so far.
