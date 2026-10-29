# Bounty step 6: status screens, the bounty live-item source, 出发了 / ETA / 完成 / confirm / 有问题 / cancel

> **For agentic workers:** this file is the preparation draft. Tasks are written after the UI questions below are
> answered; do not start implementation from it yet.

**Status:** preparation. UI questions 57–63 are on the canvas (page 05, 「悬赏 · 状态页 · 第 57–63 题」).

**Goal:** Both sides of a selected bounty follow it on one 7A status screen (vertical timeline, actions pinned at the
bottom), reached from a home live card. The helper taps 出发了, changes the expected arrival (the old time struck
through) and taps 完成; the poster confirms (which opens the built pay sheet) or reports 「有问题」 (8A sheet), and either
side cancels after selection through the 8A action sheet whose copy follows `bounty_cancel_preview`. The bounty
live-item source registers with `setSource` and publishes one card per bounty with the new `bountyAction` kind (9A).

**Built contracts (no SQL expected):** `start_bounty`, `update_eta`, `complete_bounty`, `confirm_bounty`,
`report_bounty_problem`, `cancel_bounty`, `bounty_cancel_preview`, `close_bounty` (poster, while `open`),
`bounty_detail`, `my_bounties`, `bounty_live_items`, `mark_bounty_seen` (`supabase/migrations/20261026001200_bounty_flow.sql`,
`20261026001300_bounty_cancel.sql`, `20261027000300_bounty_read.sql`).

**Spec:** `docs/specs/2026-10-11-bounty-design.md` Implementation order 6; UI/UX rows 7A, 8A, 9A, 15A; Data flow
"State machine" and "In-app events"; Errors rows for 出发了, 48 h, 「有问题」, live source failure. Canvas: board
「悬赏 · 开工前（二）进行中与结清」 (7A, 8A, 9A drawn with every state).

## Decided UI (do not re-ask)

- 7A one status screen per bounty for both roles; timeline done ✓ / current dot (orange ! when it needs you) / upcoming
  grey; the last step is the payment; actions pinned at the bottom; exact address only for the two of them.
- 8A 「有问题」 is a sheet with a multi-line reason; cancel after selection is a system action sheet with the no-show
  consequence (waiver left, waiver used, other side 30 min late, helper withdraws).
- 9A one card per bounty; `bountyAction` ranked after `owedToYou`; the card copy per state is the table on the
  「进行中与结清」 board; settled and cancelled show no card.
- 15A the helper's 「等对方付款」 card from `confirmed` until 「我已付款」.
- ETA change: system time picker; the old time struck through (CraftPick 2).
- One-time home cards (「这次没选上」, 「过期了」) disappear after being seen once (9A board); seen = first display of the
  card on the home, marked with `mark_bounty_seen`. The detail keeps 54A.

## Gaps found while preparing

1. `bounty_live_items` returns no row for an applicant whose application is still pending, but the 9A table draws
   「帮取快递 · 等小林选」 for them. Either the RPC gains that row (one migration) or the card is dropped. Asked as Q63.
2. Step 5 parked: a bounty cancelled after selection still shows 「选好了{name}」 / 「{poster}选了你」; both must key on
   `detail.status`. Fixed in this step.

## UI questions (open)

Drawn on the canvas as questions 57–63. ★ marks the recommendation.

| #   | Question                                                | Options                                                                                                                             | ★   |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --- |
| 57  | Where the poster's open bounty card leads               | A applicant list (built), its 47A card while nobody applied · B status screen with a first step 「等人申请」 that links to the list | A   |
| 58  | Closing an open bounty before anyone is chosen (refund) | A ⋯ on the applicant list → red 「关掉这单」 + system action sheet · B red row at the bottom of the applicant list                  | A   |
| 59  | 出发了 and the expected arrival                         | A one tap starts; ETA is set later with 「改预计到达时间」 · B the tap opens the time picker first, 出发 after picking              | B   |
| 60  | The ETA picker container                                | A half-height sheet with the system wheel and 「好」 · B compact date picker row inline in the timeline                             | A   |
| 61  | 完成 (helper)                                           | A one tap, success haptic · B system action sheet 「做完了？小林会收到确认提醒」                                                    | A   |
| 62  | 确认完成 (poster; opens the payment)                    | A system action sheet stating the amount, then the pay sheet · B the gold hold button · C one tap straight to the pay sheet         | A   |
| 63  | The applicant's pending card 「等小林选」               | A add it (one migration to `bounty_live_items`) · B no card; the board's 已申请 stamp is enough                                     | A   |

Drawing notes (for the tasks, not separate questions): 59B's picker starts at now + 30 min; 58's action sheet says what
comes back, from `bounty_cancel_preview` (this month's free post, or the 貘币); 62's pay sheet on the canvas is a stand-in
for the built one.

## Motion

| Motion                                 | Purpose    | Gate                                         | Build                              |
| -------------------------------------- | ---------- | -------------------------------------------- | ---------------------------------- |
| New ETA flips in, old time struck grey | cause      | Decided (CraftPick 2); rare                  | Reanimated opacity + translate     |
| Timeline step advances                 | —          | Status changes once per step; system refresh | No custom motion                   |
| Push to status, sheets, action sheets  | navigation | System                                       | Native Stack, `ConfirmationDialog` |

## Not in this plan

Settlement art and the payer-side sticker (step 7), map (8), photo stickers and fly-to-stack (9), AI drafting (10), push
and the Live Activity (11), 先付 (12).
