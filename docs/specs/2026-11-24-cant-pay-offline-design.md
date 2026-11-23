---
title: 付不了 (a payer reports a method that does not work) and the pay sheet without a network
status: proposed
created: 2026-11-24
approved:
implemented:
supersedes:
superseded-by:
pr:
---

Builds on: [foundation](2026-10-11-foundation-design.md) §payee methods ("Re-check prompt every 90 days and after a
payer taps 付不了", payee-setup research §Recommended flow 6) and the step-3 note "The 付不了 re-check trigger arrives
with step 4; `checked_at` is stored now". Story map: `pay.cant-pay`, `pay.sheet.offline`.

## Problem

A payer whose bank rejects the DuitNow number, or whose wallet cannot read the QR code, has no way to tell the payee
from the pay sheet; they leave the sheet and write in chat, and the payee's 收款方式 list only ever asks for a check
after 90 days. Separately, the pay sheet has no idea whether the phone is online: 我已付款, 已收到, 还没收到 and 撤回 are
all tappable offline, fail, and show 「没成功」.

## Goals and scope

**Do**

- The payer taps 「付不了？告诉{name}」 under the chosen method; the server marks that method reported and tells the
  payee (live event and push).
- The payee's 收款方式 list leads with a yellow 「有人付不了你的{method}」 card naming the method, with 检查这个收款方式 and
  没问题，保留; 我的 shows the red dot with its own reason.
- The report clears when the payee changes the method's details, re-picks the QR code, or taps 没问题，保留.
- The pay sheet reads the network state; offline it says 没有网络 at the top and turns every write off, keeping the
  chosen method and any picked screenshot. Reconnecting reloads the sheet (a read), never a write.

**Don't do**

- No report reason picker (wrong number / wrong name / QR unreadable): one tap is enough to make the payee look, and the
  chat is there for details.
- No live refresh of the payer's sheet when the payee fixes the method: the payer sees the fix when the sheet next
  loads (reopen or reconnect). An event per method edit to every open payer is more than this needs.
- No network gating outside the pay sheet in this change (bounty, ride and chat keep their own failure lines).

## Decisions

| #    | Decision               | Choice                                                                                                                                                                                                          | Why                                                                                                                                                                      | Alternatives considered                                                                   |
| ---- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| CP1★ | Where 付不了 lives     | A plain button in its own section under the name-check card, for the selected non-cash method, with a footer saying the payee will be asked to check                                                            | It sits where the payer finds out (after copying the number or saving the code) and next to 「对不上就别付」; it is a quiet escape, so it is not a pinned primary button | Pinned under 我已付款 (competes with the main action); toolbar menu (hidden)              |
| CP2★ | Confirmation           | None: one tap sends, the button becomes 「已提醒{name}检查这个收款方式…」, and it cannot be sent twice                                                                                                          | Matches 还没收到, which also notifies the other side on one tap; the result is harmless and the payee can dismiss it                                                     | An alert first (one more tap on every report)                                             |
| CP3  | What is stored         | `payee_methods.reported_at`, set only by `report_cant_pay(payment, method)` (security definer; payer of a due payment, the payee's non-cash method)                                                             | The prompt is about the method, not the payment; the payer already reads the method row, so the sheet shows the sent state after a reload with no extra table            | A `payment_cant_pay` table per report (needs its own RLS and a join for the list)         |
| CP4  | Repeated reports       | A method already reported stays reported and sends no second push, whoever reports it                                                                                                                           | One payee is never spammed by repeated taps or several payers                                                                                                            | Rate limit per payer (more state for the same outcome)                                    |
| CP5★ | How the prompt clears  | Changing any detail, re-picking the QR (`replace_payee_qr` inserts a fresh row) or 没问题，保留 (stamps `checked_at`) clears it in a trigger; saving unchanged details keeps it                                 | The payee either fixed it or vouched for it; an unchanged save is neither                                                                                                | Clear on opening the method (a look is not a check); expire after N days (silently wrong) |
| CP6★ | Payee card             | Yellow warning card above the list with the method title, its masked detail, 检查这个收款方式 (QR: re-pick; phone/bank: the edit form) and 没问题，保留; it replaces the 90-day card while shown                | The 90-day card's pattern, colour and place; the masked detail tells two phones apart                                                                                    | A red card (reads as an error the payee caused); a badge on the row only (easy to miss)   |
| CP7  | 我的 dot               | Same red dot, label 「有人付不了，去检查收款方式」 instead of the 90-day line                                                                                                                                   | VoiceOver and the row say why the dot is there                                                                                                                           | Same label for both (wrong for a phone number)                                            |
| CP8★ | Push                   | Event `payment.cant_pay` (push, not urgent, so quiet hours hold it) to the payee: 「{name}付不了，去检查一下你的收款方式」; a tap opens 收款方式                                                                | The outbox makes it one row in `private.event_kinds`; the payee should fix it before the payer gives up                                                                  | Live only (the payee would not know until they open the app)                              |
| OF1  | Network source         | `expo-network` (`addNetworkStateListener` + `getNetworkStateAsync`) behind `src/lib/network`, verify mode reads `-uiVerifyOffline`                                                                              | Expo SDK module with an iOS `NWPathMonitor`; no helper existed in `src/lib`                                                                                              | `@react-native-community/netinfo` (another dependency for the same reading)               |
| OF2  | What counts as offline | Only `isConnected === false`; an unknown reading counts as online                                                                                                                                               | A wrong "offline" locks the user out; a wrong "online" only shows the old 「没成功」                                                                                     | Treat unknown as offline                                                                  |
| OF3★ | Offline sheet          | A yellow 「没有网络」 card at the top with 「连上网络后才能付款或确认。你选的方式和截图会保留。」; 我已付款, 付不了, 已收到, 还没收到 and 撤回 are off; copying, saving the QR and picking a screenshot stay on | Those three work offline; the others are writes                                                                                                                          | The quiet stale line (too easy to miss for a blocked action)                              |
| OF4  | Reconnect              | The sheet reloads once when the network comes back; no write is replayed                                                                                                                                        | Data integrity: the user retries writes                                                                                                                                  | Auto-send a pending 我已付款 (forbidden)                                                  |

## Data flow and ownership

- `report_cant_pay` → `payee_methods.reported_at` → `private.emit_event([payee], 'payment.cant_pay', payment, payer)` →
  the events outbox (live broadcast, push queue). `src/features/payee/services.ts` refreshes the payee store on that
  live kind; the payment store refreshes on every `payment.` kind as before.
- `payee_methods_clear_report` (before update) clears `reported_at` when the owner changes a detail or `checked_at`.
- The payer's sheet reads `reported_at` through the existing payer select policy (`toMethod` → `reportedAt` →
  `PayOption.reported`).
- `src/lib/network/networkStore.ts` holds one listener while anything subscribes; `useOffline()` feeds `PaySheet`, which
  passes `offline` to the payer, payee and waiting views.

## Errors and degradation

| Failure               | User sees                                       | System does                 |
| --------------------- | ----------------------------------------------- | --------------------------- |
| 付不了 write fails    | 「没成功，请检查网络后再试一次。」, button back | No retry; the sheet reloads |
| 没问题 write fails    | 「没成功，请检查网络后再试一次。」 on the list  | Card stays; no retry        |
| No network            | 没有网络 card; writes off                       | Reload on reconnect only    |
| Network state unknown | Nothing                                         | Treated as online           |

## UI/UX and motion

### Screens and states

| Screen          | Design board | States to cover                                                      |
| --------------- | ------------ | -------------------------------------------------------------------- |
| Pay sheet payer | none (★)     | 付不了 offered, sending, sent; offline; ms                           |
| Pay sheet payee | none         | offline                                                              |
| 收款方式        | none (★)     | reported card over the 90-day card, after 没问题, long bank name, ms |
| 我的            | none         | dot with the reported label                                          |

### Motion

None: the sections swap in place with the list's own row animation.

## Known limits

- The payer's sheet does not update live when the payee fixes the method.
- The design canvas was not updated for these screens; CP1, CP6 and OF3 are listed for veto with screenshots in the PR.

## Verification

- pgTAP `supabase/tests/payee_cant_pay.test.sql`; unit tests in `methods.test.ts`, `payeeStore.test.ts`,
  `model.test.ts`, `paymentStore.test.ts`, `networkStore.test.ts`, `copy.test.ts`, `noticeTaps.test.ts`.
- UI cases `pay_cant_pay`, `payee_reported`, `pay_sheet_offline`, `pay_payee_offline` (zh-Hans; ms where declared).
