---
title: Money in any currency (RM and ¥ first)
status: implemented
created: 2026-10-29
approved: 2026-10-29
implemented: 2026-10-30
supersedes:
superseded-by:
pr: https://github.com/sudongyuer/tapiro/pull/25
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

## Implementation Record (2026-10-30)

PR: [#25](https://github.com/sudongyuer/tapiro/pull/25) · Branch `feat/multi-currency`, commits 19d7662..0608763 (plan:
`docs/plans/2026-10-29-multi-currency.md`, Tasks 1–6).

### What was built

- **Schema**:
  - `currencies` (MYR, CNY) and `post_limits` (bounty: RM 1–500, ¥1–800, whole units).
  - Money columns are `*_minor` + `*_currency`, existing rows backfilled to MYR.
  - `fx_rates` keyed by `(base, quote, rate_date, source)` with BNM rows migrated; `method_currency()`.
  - Evidence: `supabase/migrations/20261029000200_money_schema.sql` (19d7662).
- **Payments**:
  - `open_payment` locks the rate at open, or leaves it null with no rate ≤ 7 days old.
  - `payment_detail` returns one amount per payee method.
  - `mark_payment_paid` records `paid_minor`/`paid_currency` and rejects `no_rate`; reversals use the paid amount.
  - `bounty_detail` returns the payment's locked conversion.
  - Evidence: `20261029000300_money_payments.sql`, `20261029000500_money_payment_conversion.sql` (19d7662, 0608763).
- **Client money type**:
  - `Money`, `formatMoney`/`formatMoneyRange` (RM spaced, ¥ not) and `convertUp`, all in `src/lib/money.ts`.
  - The `CURRENCIES`/`POST_LIMITS` mirrors are tested against the migration.
  - No locale string contains `RM` or `¥` (`src/lib/i18n/resources.test.ts`).
  - Evidence: 8c72121.
- **64A, 67A**:
  - The 赏金 row's system pull-down 「RM ⌄」; limits, footer and errors per currency.
  - Default from `getLocales()[0].currencyCode`, then the last choice kept in the draft.
  - Evidence: `src/features/bounty/post/RewardRow.tsx`, `src/lib/deviceCurrency.ts` (2d1c411).
- **65A**: the original amount everywhere. The detail and status headers add 「约 RM x」 from today's rate, then from
  the payment's locked rate once a payment exists. Evidence: `src/features/bounty/shared/rewardText.ts` (ba812e8,
  0608763).
- **66A**:
  - Each method row shows its own amount, with a footer naming the locked BNM rate and date.
  - With no rate, methods needing a conversion are disabled; a payee with no method in the currency gets the
    no-method card.
  - The payee and celebration show the paid amount, plus the original when it differs.
  - Evidence: fbb01f7.

### Deviations from the design

- **Rate column names**: `quote_per_base` / `rate_quote_per_base` instead of the plan's `rate`; the name states the
  direction.
- **RPC names**: `mark_payment_paid` keeps its name, and `payment_detail` is new.
- **`reference_currency` parameter**: the board and detail reads take it, because the server cannot know the device's
  currency.
- **Celebration reference**: it uses the locked rate (Ruling 3), so the day-rate `latestRate` path was removed.
- **Rate wording**: the rate reads 「¥1 = RM 0.6122」, with non-breaking spaces so the equation never splits (it split
  in ms during break-ui).
- **Default currency**: 3A's default is the device currency only when it is enabled; else MYR.

### Verification

- **pgTAP**: 1003 tests in 24 files, including `money.test.sql` (47) and `bounty_payment_conversion.test.sql` (8).
- **`bun test`**: 1392 pass. The 4 failures in `scripts/check-file-size.test.ts` fail only from this checkout's
  root, and pass from any other directory and in CI (retro item 6).
- **Other checks**: `tsc`, `lint:changed`, `format:check`, design-check, `check-story-map`, `check-file-size` and
  `check-specs` pass.
- **UI, one batch run at the end** (45 runs, all pass, no stalled device):
  - 17 cases in zh-Hans light, 16 in ms, 6 in en, 6 in dark, plus smoke.
  - New cases: `bounty_post_currency`, `bounty_cny_display`, `pay_sheet_converted`, `pay_sheet_no_rate`,
    `pay_sheet_no_method`, `money_worst`.
- **Design QA**: screenshots beside boards 64–66 are in the PR.

### Bugs fixed during implementation

- **Rate equation split in ms**: in ms the rate footer broke between 「¥1 =」 and 「RM 0.6122」. Cause: plain spaces
  around 「=」. Fix: non-breaking spaces, with a unit test that fails on the old string (0608763).
- **Post form range text**: it read 「RM 1–RM 500」. Cause: each bound was formatted with its symbol. Fix:
  `formatMoneyRange` writes one symbol (2d1c411).
- **The first-payment badge under the landed sticker**: found by the user, built in the payment step. Cause: the
  badge lived inside the book while the sticker flies in a top layer. Fix: the badge is drawn in the top layer, and
  `pay_first_settle` gained a pixel check on the overlap (d2a4aeb).

### Known limits

- Only pairs with MYR have a rate source (BNM).
- Cash is assumed to be in the item's currency.
- Carpool follows this model when built.
- `pay.sheet.worst` (RM 12,345.60) remains a story-map gap.
