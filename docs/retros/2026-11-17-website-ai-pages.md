---
branch: docs/website-ai-pages
date: 2026-11-17
pr: Website AI wording aligned with 问小貘
title: The public pages describe 问小貘 from app copy and code; one non-AI mismatch on how coins are bought left for the owner
escaped: 0
rework: 0
interventions: 0
overturned: 0
---

# Retro: website AI pages

## Core (mandatory)

| Dimension | Measure               | This step                                                                         |
| --------- | --------------------- | --------------------------------------------------------------------------------- |
| Quality   | Escaped defects       | 0                                                                                 |
| Quality   | Skipped verifications | No browser screenshot; pages checked live by HTTP content after deploy            |
| Speed     | Wasted time           | ~0                                                                                |
| Autonomy  | Interventions         | 0                                                                                 |

## Findings

- "Coins unlock AI drafting" was wrong in kind, not only in scope: 问小貘 has free daily energy, and a coin is swapped
  for a leaf that refills it (`swap_coin_for_leaf`). Public copy about a paid unit is traced to the SQL that spends it.
- The in-app terms say coins are bought through the App Store; `terms.html` and `/coins` also describe card payments
  on the website, written for the Stripe application. Not changed here (money, owner's choice); listed for the owner.
