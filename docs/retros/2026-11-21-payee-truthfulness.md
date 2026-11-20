---
branch: fix/ui-audit-batch-b
date: 2026-11-21
pr: UI audit batch B — payee and payment data truthfulness, pay sheet reminder, guarded onboarding name step
title: Cash on still said 还没有收款方式
escaped: 1
rework: 1
interventions: 0
overturned: 0
---

# Retro: payee truthfulness (audit batch B)

## Core (mandatory)

| Dimension | Measure               | This step                                                                                                                   |
| --------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 1: the owner saw 「还没有收款方式」 on a device with cash on; plus audit findings Y1–Y5 and O1 from code reading            |
| Quality   | Skipped verifications | Dark and en runs of the new cases (milestone only, per Pace); the loading spinner of the name step has no case              |
| Speed     | Wasted time           | ~5 min: a rebase conflict in `NameStep.tsx` with #206's error fade, and the worktree guard refusing compound shell commands |
| Autonomy  | Interventions         | 0                                                                                                                           |

## Findings

- Root cause of the device bug: `PayeeListView` chose its empty state from `transferMethods(methods)`, which filters
  cash out, so a cash-only list rendered 「还没有收款方式」 right above a switched-on cash toggle. The store was right; the
  view counted the wrong set. Tag `subset-shown-as-empty`. Y2 (no stale marker, no refetch on focus) is a separate
  cause in the store, which could make it worse: a failed reload after the save left the toggle off with no warning.
- Guarantee at the lowest layer: the payee store now has a `refreshFailed` + `loadedAt` ready state and `refresh()`;
  unit tests fail if a failed reload is shown as current or if a focus refetch turns the list back into a spinner. The
  empty state has a UI case (`payee_cash_only`) that fails on the old view.
- Sweep for the same pattern (stale or failed shown as live): `liveStore`, `paymentStore`, `settledStore`,
  `stickers/store`, `memoryStore`, `coinsStore`, `reputation/profileStore` and `reviewStore` already keep a `stale`
  state; `account/profileStore` keeps `failed` without data, and the name step now honours it (O1). The bounty apply
  check treats a failed payee lookup as "has a method" and lets the server decide; left as is.
- Rework: two new case assertions were wrong on the first run (`settled` needs a predicate that returns the element,
  not the tree; a "no cash in the menu" label search also matched the toggle's text behind the menu). Both were fixed
  by reading `log.txt` and the failure screenshot; the app was right. Tag `case-assertion-scope`.
- Pattern to watch: a view that filters a list before deciding "empty" must ask whether the filtered-out items still
  count. Candidate lint is not practical; keep it in review.
