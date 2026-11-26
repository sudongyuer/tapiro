---
title: 小貘 reads the Grab receipt into the ride split
status: proposed
created: 2026-11-24
approved:
implemented:
supersedes:
superseded-by:
pr:
---

Builds on: [carpool](2026-11-02-carpool-design.md) 212 B (optional receipt screenshot in the split sheet) and its
"Later" row 「Receipt reading by 问小貘 (step 8, consumes 小貘体力)」; [carpool 2026-10-11](2026-10-11-carpool-design.md)
「Receipt split (later)」; [foundation](2026-10-11-foundation-design.md) §AI usage (小貘体力) and pattern ⑧; plan
`docs/plans/2026-10-30-ask-tapir.md` 147 A and the P-section note that `draft_split` uses the same Qwen plus vision pin.
Story map: `ride.split.receipt`.

## Problem

The organiser types the Grab total by hand even after attaching the Grab receipt screenshot. The criterion
「拍 Grab 收据，小貘起草分账，组织者确认（按用量扣小貘体力）」 was left `gap: not built`; nothing reads the receipt.

## Goals and scope

**Do**

- In the split sheet, once a receipt is attached, offer 「让小貘读总价」. One tap sends that image to `ai-draft`
  (`task: read_receipt`), which returns `draft_split` `{ total, currency }`. A read total fills the total field; the
  existing equal split and rows follow, and nothing is sent until the organiser taps 发给.
- Meter it like every cloud call (小貘体力 by tokens, the per-user daily lease, consent first, the China storefront
  refusal), as its own task `read_receipt`.

**Don't do**

- No camera capture; the receipt comes from the photo library as today (Grab shows the receipt in its app).
- No per-person amounts from the receipt: one Grab receipt is one total (carpool "The split assumes one Grab receipt").
- No 问小貘 sheet entry for receipts (the sheet has no ride scope; K1 in the ask plan: copy says only what it does).

## Decisions

Made under the owner's delegation (2026-11-17); ★ for veto.

| #      | Decision                                                                                                                                                                                                                                                  | Reason                                                                                                                                                                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RR1 ★  | Reading lives in the split sheet's receipt section, not in the 问小貘 sheet                                                                                                                                                                               | The receipt is already picked there (212 B) and the total it fills is one row above; the AskTapir board ③ sheet flow predates the built split                                                                                                                                             |
| RR2 ★  | An explicit 「让小貘读总价」 button (SF Symbol `text.viewfinder`); attaching a receipt never reads it by itself                                                                                                                                           | Reading spends 小貘体力 and needs consent; a receipt attached only as proof should cost nothing                                                                                                                                                                                           |
| RR3 ★  | The receipt section's footer says what reading costs: 「小貘可以读出收据上的总价，按用量用小貘体力。」                                                                                                                                                    | The criterion's 按用量扣小貘体力 is told before the tap, in the words the 问小貘 sheet uses                                                                                                                                                                                               |
| RR4 ★  | While reading, a system progress row 「小貘在读收据…」 replaces the button; the sheet stays usable and 发给 stays as it is                                                                                                                                | The organiser may type the total meanwhile; nothing waits on 小貘                                                                                                                                                                                                                         |
| RR5 ★  | A read total fills the field only if the total still holds what it held at the tap and the same receipt is attached; otherwise the footer says 「小貘读到 RM x … 没有替换」                                                                               | A total the organiser typed is theirs (Data integrity: never overwrite input)                                                                                                                                                                                                             |
| RR6 ★  | After a fill the footer reads 「小貘从收据读出 RM x，已填进总价。发之前核对一下。」 and the button goes away; editing the total afterwards turns the line into 「小貘读到」                                                                               | The AI only drafts; the organiser confirms by 发给 (AGENTS.md AI rules)                                                                                                                                                                                                                   |
| RR7 ★  | Nothing read, another currency, a failure, hungry, capped or an old app: one footer line each, the total stays empty, the button stays for a retry where a retry can help                                                                                 | Every AI flow keeps its manual path; the footer is the sheet's only free-text place                                                                                                                                                                                                       |
| RR8 ★  | A total in a currency other than the ride's is not converted: 「收据上是 ¥ x，跟这趟的币种不一样，请自己填总价。」                                                                                                                                        | The split is in the ride currency; converting would be a guess                                                                                                                                                                                                                            |
| RR9 ★  | Before the first consent the tap closes the split sheet (its draft kept), opens the consent page, and reading goes on after 同意; the organiser reopens 分车费 to see it                                                                                  | The consent route would dismiss the SwiftUI sheet anyway, so it closes first and the route opens after it is gone; reopening the sheet during the consent page's dismissal is unreliable, and the draft is never lost                                                                     |
| RR10 ★ | `draft_split` returns `total` as a decimal string (`^\d{1,6}(\.\d{1,2})?$`, above 0) or null, and `currency` MYR, CNY or null; null currency means the ride's                                                                                             | A decimal string avoids float and integer-as-string drift (the ask plan's `rewardMajor` lesson); null is "could not read", never a guess                                                                                                                                                  |
| RR11 ★ | Model: the `ask` pin, Qwen plus (vision), at most 200 output tokens; the DeepSeek fallback as for every chat task                                                                                                                                         | 147 A and the P-section note: the same model reads screenshots; a total needs few tokens                                                                                                                                                                                                  |
| RR12 ★ | The image is the picked receipt shrunk as the 问小貘 screenshot pick does (1280 px long edge, JPEG 0.6, at most 1.4 MB base64); it is never stored by `ai-draft`                                                                                          | One encoder and one server limit; no prompt or image is kept on the server                                                                                                                                                                                                                |
| RR13   | Superseded by RR14 (2026-11-26): ~~The sheet still opens at the medium detent; with a receipt attached the rider rows sit below it and the organiser drags the sheet up to edit them~~                                                                    | Equal shares need no edit and the organiser's own row stays in view; opening at large for everyone would hide the ride behind the sheet                                                                                                                                                   |
| RR14 ★ | The split sheet orders total → rider rows (with the split footer) → receipt section; the rider rows stay at the medium detent whatever the receipt holds, and the receipt section sits below them                                                         | The rider rows are what the organiser edits; the receipt is optional proof and reading it is a helper, so it gives way. One Form, system rows, no compact custom receipt control (HIG: do not imitate a control). Supersedes RR13: in #245 a receipt pushed the rows below the half sheet |
| RR15 ★ | What a reading found (filled, kept, other currency, nothing read, failed) is the total section's footer (`ride-split-read-note`); the receipt footer keeps the privacy note, and while the button is offered adds the 小貘体力 line as a second paragraph | The read result is about the total it changed and was run into the privacy note as one paragraph; the cost line explains the button right above it. Refines where RR3, RR6 and RR7 put their lines                                                                                        |

## Data flow and ownership

`SplitReceipt` → `useSettleSheets.readReceipt` (ride) → `ReceiptReader` (type in `src/lib/drafts/receiptDraft.ts`,
passed in by the route from `useReceiptReader` in the ask feature) → `createReceiptReader`: consent
(`askConsent`), `cloudImageOf(uri)`, `cloudCall({ task: 'read_receipt', input: { text: '', image } })` through
`metered` → Edge Function `ai-draft`: `parseAiRequest` → `begin` (lease, energy) → provider with `draft_split` forced →
`validToolResult` → `finish` (meter row `read_receipt`) → `parseReceiptReply` → `fillFromReading` writes the split draft.

## Errors and degradation

| Case                          | What the organiser sees                                     |
| ----------------------------- | ----------------------------------------------------------- |
| AI not offered (storefront)   | No button; the manual total as before                       |
| Consent declined              | The sheet's draft unchanged; the offer line again           |
| No network / provider error   | 「没读成。可以再试，或者自己填。」 and the button           |
| Hungry / capped / busy        | The matching line; total untouched                          |
| Image cannot be prepared      | 「这张截图打不开。换一张，或者自己填。」, nothing sent      |
| A reply that fails the schema | Discarded and counted on the server (no energy); 「没读成」 |

## UI/UX and motion

No motion: the progress row is the system `ProgressView`. The button, progress row and footer live in the existing
SwiftUI `Form` section; touch targets are system rows.

## Verification

Unit: `src/features/ride/detail/receiptRead.test.ts`, `src/features/ask/receiptReader.test.ts`,
`src/lib/drafts/receiptDraft.test.ts`, `src/features/ask/fixtureAskReplies.test.ts`; server:
`supabase/functions/ai-draft/receipt.test.ts`, `contract.test.ts` (`draft_split` and the app agree); stack:
`supabase/functions/tests/ai-draft.integration.ts` (served function, fake provider); pgTAP
`supabase/tests/ai_read_receipt_task.test.sql`; UI `ride_settle_receipt_read` (zh-Hans, ms).

## Implementation Record (2026-11-25)

Status stays `proposed`: the owner has not approved the design; decisions RR1–RR13 (★ for veto) were made under the
owner's delegation (2026-11-17). Branch `feat/ride-split-receipt`.

- Built as designed. Server: `ai-draft` task `read_receipt` and tool `draft_split` (`tools.ts`, `prompts.ts`,
  `models.ts`, fake provider reads RM 74.00); migration `20261124000500_ai_read_receipt_task.sql` adds the task to
  `ai_metering_task_check`. App: `src/lib/drafts/receiptDraft.ts` (reply parser and `ReceiptReader` type),
  `src/features/ask/receiptReader.ts` and `useReceiptReader`, `cloudImageOf` in `screenshot.ts`;
  `src/features/ride/detail/receiptRead.ts`, `SplitReceipt.tsx`, `SettleSheets.tsx` (reading state, consent hand-off
  through the sheet's `onDismiss`), copy `rideSettle.sheet.read.*` in zh-Hans, en and ms. The route passes the reader
  only when AI is offered in the storefront.
- Already existed and reused: the receipt picker and upload (212 B), consent, metering, the China storefront refusal,
  the screenshot encoder.
- Checks: `bun test` (unit and server), `contract.test.ts`, pgTAP `ai_read_receipt_task.test.sql` on the local stack in
  a rolled-back transaction; UI `ride_settle_receipt_read` zh-Hans and ms, light and dark; `ride_settle_split` and
  `verify:smoke`; `tsc`, `lint:changed`, `format:check`, `check-specs`, `check-story-map`. `test:stack` with the new
  served-function case runs in CI (the shared local stack serves main's functions).
- Unverified: a real Qwen read of a Grab receipt (Model Studio `AccessDenied.Unpurchased`).
- Hosted: migration `20261124000500_ai_read_receipt_task.sql` and an `ai-draft` redeploy are not applied.

### Layout fix (2026-11-26)

- RR14 and RR15 replace RR13: `SplitSheet.tsx` renders the receipt section after the rider rows and gives the total
  section the read note as its footer; `SplitReceipt.tsx` keeps the privacy note and the 小貘体力 line as separate
  paragraphs. No copy keys changed.
- Checks: UI `ride_settle_receipt_read` (reopens the filled sheet at the medium detent and asserts the total, the read
  note and all three rider rows are on screen) and `ride_settle_split` (attaches the receipt before editing again, as
  before #245), zh-Hans light and ms; `verify:smoke`.
