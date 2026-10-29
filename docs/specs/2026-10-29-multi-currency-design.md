---
title: Money in any currency (RM and ¥ first)
status: approved
created: 2026-10-29
approved: 2026-10-29
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Builds on: foundation (payment, fx) and bounty specs; amends their "amount in RM" decisions (listed under
Background). Visual mockups: design canvas https://claude.ai/artifact/34EC3qaCsv1ibJZ4oeGK3o, questions 64–67.
Decisions: user, 2026-10-29 (「按推荐来吧」 to 1A 2A 3A and the four conversion rules). -->

## Problem

Every amount in Tapiro is Malaysian ringgit:

- Bounty rewards are `bounties.reward_sen` (whole RM 1–500, `supabase/migrations/20261026000900_bounties.sql:22`).
- Payments are `payments.amount_sen`.
- The post form shows a fixed 「RM」 cell (screenshot from the user, 2026-10-29).
- 45 copy strings write "RM" literally.
- `fx_rates` stores one pair, `rm_per_cny`.

A student who thinks in yuan can't post 「¥50」. The user also wants Tapiro to grow beyond Malaysia, so the currency
can't stay hard-coded. There is no production money data yet, which makes this the cheapest time to change the model.

## Background

This spec amends the following decisions; their spec bodies stay as history:

- **Foundation 「Amount in RM」**: amounts were RM, with 约 ¥（参考） under Alipay or WeChat. It becomes: amounts carry
  their currency, and the reference line becomes the converted amount payable in the other currency.
- **Bounty reward**: whole RM 1–500. It becomes a whole amount in the poster's chosen currency, with limits per
  currency.
- **Foundation fx**: the BNM CNY middle rate in `fx_rates.rm_per_cny`. It becomes a rate table keyed by pair, source
  and date, still filled from BNM for pairs with MYR.

## Goals and scope

**Do**

- Every stored amount is an integer in the currency's minor unit, plus an ISO 4217 code (`MYR`, `CNY`). Formatting,
  limits, rounding and payment methods come from per-currency data, not from code that assumes RM.
- The UI offers MYR and CNY. Adding a currency is a data change (a `currencies` row, limits, a rate source), not a
  schema change.
- A bounty is priced in the poster's currency. The payer may pay in the original currency, or in another currency the
  payee accepts, at a rate locked when the payment opens.
- No user-facing string contains a currency symbol; amounts are formatted by one function.

**Don't do**

- **Country-level change**: time zone (Malaysia time in 24 files), PDPA wording, data residency, region-specific
  copy. It gets a separate spec when a second country is real (user, 2026-10-29).
- **New payment rails**: DuitNow, bank, Alipay, WeChat and cash stay as built; each one now has a currency.
- **Holding or converting money in the app**: money still goes payer → payee directly, and the rate is a reference
  both sides agree to.
- **Coins (貘币)**: they are a platform unit, not money, so they are unchanged.
- **Rejected: a per-user display currency** (option C, 2026-10-29). The payee would receive a different currency from
  the one shown.

## Decisions

| Decision              | Choice                                                                                                              | Why                                                                          | Alternatives considered                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| How general (1A)      | Currency-aware storage and logic now; UI offers MYR and CNY                                                         | Cheap before real data; a new country becomes configuration                  | B: add ¥ to bounties only; C: full multi-country now |
| Rate source (2A)      | `fx_rates (base, quote, rate_date, source, rate)`; BNM fills pairs with MYR                                         | Keeps the central-bank rate agreed 2026-10-26; another source plugs in later | B: one generic FX API now                            |
| Default currency (3A) | The device's `getLocales()[0].currencyCode` if offered, else MYR; then the user's last choice, stored on the device | Right by default, one tap to change                                          | B: no default                                        |
| When the rate locks   | When the payment opens (poster taps 确认完成, or a carpool fare is set); stored on the payment with date and source | Both sides see the same numbers until settled                                | Live rate at payment time                            |
| Rounding              | Converted amounts round up to the target currency's minor unit                                                      | Never short-changes the payee by a fraction                                  | Round to 0.5 or a whole unit                         |
| No rate               | Pay only in the original currency; the other currency shows 「暂时不能换算」                                        | A stale rate never moves money                                               | Fall back to the last rate, dated                    |
| Limits                | Per currency and item kind (`post_limits`), integer and step per currency                                           | One rule per currency; MYR keeps 1–500                                       | Convert to MYR and apply the MYR cap                 |
| Method currency       | `payee_method_type` → currency: DuitNow and bank MYR; Alipay and WeChat CNY; cash takes the item's currency         | Matches what each rail moves                                                 | Let the payee tag each method                        |

## Data flow and ownership

- **`currencies` (reference data)**: `code`, `minor_digits` (MYR 2, CNY 2), `symbol` (RM, ¥) and `enabled`. The client
  ships a mirror for formatting, which a unit test compares against the migration.
- **`post_limits`**: `(item_kind, currency) → min_minor, max_minor, step_minor`. MYR is RM 1–500 in steps of RM 1.
  CNY is ¥1–800 in steps of ¥1 (67A).
- **Bounties**: `reward_minor bigint` and `reward_currency`, replacing `reward_sen`. `publish_bounty` checks them
  against `post_limits`.
- **Payments**:
  - `amount_minor` and `currency`: the original price, copied from the item.
  - `rate`, `rate_base`, `rate_quote`, `rate_date` and `rate_source`: locked at open, null when no rate exists.
  - `paid_minor` and `paid_currency`: what the payer marked as sent, written by `mark_paid` from the method's
    currency and the locked rate.
  - The server computes payable amounts; the client only displays them.
- **`fx_rates`**: rekeyed as above. The existing `rm_per_cny` rows migrate to `(CNY, MYR, date, 'bnm')`. The
  `fx-rate` function writes the new shape.
- **Client**:
  - `src/lib/money.ts` exposes `Money = { minor, currency }` and `formatMoney(money, locale)`, which picks the symbol
    from `currencies`.
  - Copy takes `{{amount}}` as a formatted string, so the 45 literal "RM" go away.
  - `formatRinggit` and `*Sen` names are replaced.
- **Migration**: one migration renames `*_sen` to `*_minor`, adds currency columns defaulting to `MYR` for existing
  rows, and rewrites the RPCs that read them. pgTAP covers every money RPC with MYR and CNY.

## Errors and degradation

| Failure                                                  | User sees                                                           | System does                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| No rate ≤ 7 days old when the payment opens              | Original currency only; other methods say 「暂时不能换算」          | Payment opens with a null rate; never locks a stale one                    |
| Rate arrives after the payment opened without one        | Unchanged: original currency only                                   | The rate is never added after opening, so both sides keep the same numbers |
| Payee has no method in the original currency and no rate | 「对方还没有能收{currency}的方式」, with the existing no-payee path | Nothing is marked paid                                                     |
| Unknown currency from the server                         | The load-failed state                                               | Parser rejects; never formats as RM                                        |

## UI/UX and motion

Answered on the canvas board 「币种 · 第 64–67 题」 (user, 2026-10-29: 「按推荐」):

| #   | Choice                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 64A | The 赏金 row's 「RM」 cell becomes a system pull-down 「RM ⌄」 (RM 马来西亚令吉 / ¥ 人民币); the footer follows the currency                                                                                                                         |
| 65A | The original amount everywhere; the detail and status screens add a small 「约 RM 32.47」 at today's rate, for reference; board and home cards show the original only                                                                                |
| 66A | The pay sheet header shows the original; each method row shows its own amount; a footer names the BNM rate, its date and that it locked when the payment opened; with no rate, methods in the other currency are disabled with 「暂时不能换算成 RM」 |
| 67A | ¥ rewards are whole yuan, ¥1–800 (about RM 500)                                                                                                                                                                                                      |

Motion: none new.

### Screens and states

| Screen                                | Design board | States to cover                                                           |
| ------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| Post form, reward row                 | 64           | MYR default, CNY chosen, remembered choice, limit errors per currency, ms |
| Board card, detail, status, home card | 65           | MYR item, CNY item, long amounts (¥ 1,000)                                |
| Pay sheet                             | 66           | Same currency, converted with rate, no rate, payee lacks the currency     |

## Known limits

- **Pairs**: only pairs with MYR have a rate source (BNM). A CNY↔(future) pair needs a source before that currency is
  enabled.
- **Cash**: it is assumed to be in the item's currency.
- **Carpool**: the spec is not built yet. It follows this model when built (fare in the organiser's currency).

## Implementation order

1. **Schema and RPCs**: `currencies`, `post_limits`, money columns, `fx_rates` rekey, payment rate lock and paid
   amount; pgTAP with MYR and CNY.
2. **Client money type and formatter**: copy without literal symbols, parsers, all `*Sen` call sites. Unit tests per
   currency and locale.
3. **Post form currency choice** (64) and limits (67).
4. **Display of priced items** (65) on the board, detail, applicants, status and home.
5. **Pay sheet and settlement** with conversion (66); celebration amounts in the paid currency.
6. **Worst case and story map**: ¥ 1,000 / RM 500, no rate, ms copy.

## Verification

- pgTAP: every money RPC with MYR and CNY; rate lock at open; no rate → original-only; limits per currency.
- Unit: `formatMoney` across currencies × locales; conversion rounds up to the minor unit; copy contains no currency
  symbol (a test over the locale files).
- UI cases: the post form in CNY; a ¥ bounty on the board and status; the pay sheet converted and without a rate, in
  zh-Hans and ms.
- Design QA: screenshots beside boards 64–66.
