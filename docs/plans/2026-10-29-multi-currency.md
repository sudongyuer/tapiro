# Money in any currency: RM and ¥ first

> **For agentic workers:** execute task by task (superpowers `subagent-driven-development` if available). Track steps
> with checkboxes. Only one Simulator-using agent runs at a time. When all tasks are done, run `spec-lifecycle`
> (full record: this spec is implemented by this plan alone) before the PR.

**Status:** ready (spec approved 2026-10-29, 「批准」). UI questions 64–67 answered 2026-10-29 (「按推荐」); canvas page 06, board
「币种 · 第 64–67 题」.

**Goal:**

- Every amount carries its currency.
- A bounty can be posted in RM or ¥.
- Others see the original price, plus 「约 RM」 on the detail and status screens.
- The payer pays in the original currency, or in another currency the payee accepts, at the BNM rate locked when
  the payment opened.
- No copy string contains a currency symbol.

**Spec:** `docs/specs/2026-10-29-multi-currency-design.md`.

## Decided (do not re-ask)

- **1A**: storage and logic are currency-aware; the UI offers MYR and CNY.
- **2A**: `fx_rates (base, quote, rate_date, source, rate)`, filled by BNM.
- **3A**: the default currency is the device's `currencyCode` if offered, else MYR; then the last choice.
- **Conversion**:
  - The rate locks when the payment opens.
  - The result rounds up to the minor unit.
  - With no rate ≤ 7 days old, payment is in the original currency only.
  - Limits are set per currency.
- **64A**: the pull-down 「RM ⌄」 on the 赏金 row.
- **65A**: the original amount everywhere; 「约 RM 32.47」 on the detail and status screens.
- **66A**: each pay method shows its own amount, with a footer naming the locked rate. With no rate, methods in the
  other currency are disabled.
- **67A**: ¥1–800, whole yuan.

## Rulings made in this plan (overturn by saying so)

1. **Column names.**
   - Amount columns become `<name>_minor bigint` with a sibling `<name>_currency char(3)`, so `reward_minor` with
     `reward_currency`, and `payments.amount_minor` with `payments.currency`.
   - Existing rows backfill `MYR`.
   - No money column keeps the `_sen` name.
2. **Method currency is derived, not stored.**
   - The mapping is a SQL function `method_currency(type, item_currency)`, mirrored in the client.
   - `cash` returns the item's currency.
3. **The 「约」 line uses today's rate**, never the locked one, and only before a payment exists. Once a payment
   opens, every screen shows the locked conversion.
4. **Formatting** is `formatMoney({ minor, currency }, locale, { whole?: boolean })` in `src/lib/money.ts`.
   - The symbol comes from the `currencies` mirror (`RM`, `¥`), followed by a non-breaking space.
   - Copy receives `{{amount}}` already formatted.
   - A locale-file test fails on `RM` or `¥` inside any string.
5. **The last-used currency** is stored with the post draft on the device, not on the server.

### ★ UI polish, payment, payee methods and sticker book (2026-11-17, for veto)

Fixes from the UI audit of 2026-11-16 (PAY-01 to PAY-05, PAY-08, PAY-09, PAY-11 to PAY-14). The payee forms and the
sticker book have no plan of their own, so their choices are listed here. No amount, state or order of actions changed.

| #   | Choice (★ taken)                                                                                                                                                                                                                                                     | Alternative                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| P1  | 复制 / 已复制 use the system large control size (about 50 pt high) so the target reaches 44 pt (PAY-04).                                                                                                                                                             | Keep the small pill and grow only the row's tap area.          |
| P2  | The bank sheet's 账号 field moves into its own section titled 账号, like 手机号 on the DuitNow sheet, with the footer 「只填数字…」 under it; its placeholder becomes a new example, 「例如 512345678901」 / 「e.g. 512345678901」 / 「cth. 512345678901」 (PAY-14). | A label on the left of the row (LabeledContent), no new copy.  |
| P3  | The QR add sheet's 用相机扫 is the system bordered capsule (grey fill), full width under the accent 从相册选截图; both keep their symbols (PAY-08; PayeeSetupPick ③ A draws a white secondary button and no symbols).                                                | A white fill drawn by hand; no symbols.                        |
| P4  | 汇率来源 is a footnote-size link in the accent with a 44 pt high, full-width target under the rate line (PAY-03).                                                                                                                                                    | Secondary colour with an underline.                            |
| P5  | The payee's settled row keeps 「已结清 · 收到 RM 8.00」 and its second line is the errand title only; the payer's row is unchanged (PAY-09).                                                                                                                         | Keep the amount on the second line and drop it from the first. |
| P6  | The rate footer ends with a full stop in zh-Hans, en and ms (PAY-12); method row amounts are SF Rounded like the header (PAY-13); celebration slots, badge, chip and ruled paper use continuous corners (PAY-11).                                                    | —                                                              |

## Contracts

- **`currencies`**: rows `('MYR', 2, 'RM', true)` and `('CNY', 2, '¥', true)`.
- **`post_limits`**:
  - bounty MYR: 100–50000 minor, step 100.
  - bounty CNY: 100–80000 minor, step 100.
- **`publish_bounty(..., reward_minor, reward_currency)`**: rejects with `invalid_reward` outside the limits, or when
  the currency is unknown or disabled.
- **Payments**:
  - `open_payment` locks the rate (`rate`, `rate_base`, `rate_quote`, `rate_date`, `rate_source`), or leaves it null
    when no rate is 7 days old or newer.
  - `payment_detail` returns, per payee method, `{ method, currency, amount_minor | null }`. The amount is null when
    the method needs a conversion and there is no locked rate.
  - `mark_paid(method)` writes `paid_minor` and `paid_currency`, and rejects `no_rate` for a method that can't be
    converted.
- **`fx_rates`**: `(base, quote, rate_date, source)` is the primary key. The `fx-rate` function writes
  `('CNY', 'MYR', date, 'bnm', rm_per_cny)`.
- **Reads**:
  - `bounty_detail`, `my_bounties`, the board RPCs and `bounty_live_items` return `reward_minor` and
    `reward_currency`.
  - The board and detail also return `reference` (today's converted amount into the viewer's default currency, or
    null) for 65A.

## Tasks

### Task 1: Schema, RPCs and pgTAP

- [ ] Write one migration covering `currencies`, `post_limits`, the money columns with their backfill, the `fx_rates`
      rekey with its data migration, `method_currency`, and the rewritten money RPCs listed in Contracts.
- [ ] Update `fx-rate` and its test.
- [ ] pgTAP: every money RPC with MYR and CNY. Cover the rate lock at open; a rate arriving later never changes an
      open payment; no rate → original currency only; limits per currency; rounding up at a half-sen boundary.

### Task 2: Client money type and copy

- [ ] Write `Money`, `formatMoney`, the `currencies` mirror (with a test against the migration) and conversion helpers.
- [ ] Replace `formatRinggit`, `*Sen` names and the parsers for every changed RPC.
- [ ] Remove every literal `RM` from the three locales; add the locale-symbol test.
- [ ] Unit tests: each currency × each locale; conversion rounding.

### Task 3: Post form currency (64A, 67A)

- [ ] Add the system pull-down on the 赏金 row (an `@expo/ui` Menu or the kit; no imitation), with the default from
      `currencyCode` and the last choice kept in the draft.
- [ ] The footer and errors follow `post_limits`; the confirm sheet and the publish call carry the currency.
- [ ] Update the post UI cases and add one case for CNY (zh-Hans, plus ms for the footer).

### Task 4: Priced items display (65A)

- [ ] Show the original amount on the board card, detail, applicants, status and home cards, with the 「约」 line on
      the detail and status screens.
- [ ] UI case: a ¥ bounty on the board, detail and status.

### Task 5: Pay sheet and settlement (66A)

- [ ] Method rows show their own amount, with a rate footer and the no-rate disabled state.
- [ ] Payee and celebration screens show the paid currency.
- [ ] Replace the old 「约 ¥（参考）」 line; the `pay.sheet.cny` and `pay.confirm.celebration-cny` criteria change.
- [ ] UI cases: converted, no rate, and the payee lacking the currency.

### Task 6: Worst case, story map, PR gate

- [ ] Run `break-ui` on the post form, cards and pay sheet with ¥800 / RM 500, long names and ms.
- [ ] Add the story-map criteria for 64A–67A and the conversion rules.
- [ ] Run the fast checks, `verify:smoke`, the retro and `spec-lifecycle`, then open the PR.
