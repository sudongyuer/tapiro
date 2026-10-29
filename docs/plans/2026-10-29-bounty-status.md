# Bounty step 6: status screens, the bounty live-item source, 出发了 / ETA / 完成 / confirm / 有问题 / cancel

> **For agentic workers:** execute task by task (superpowers `subagent-driven-development` if available). Track steps
> with checkboxes. Only one Simulator-using agent runs at a time. When all tasks are done, run `spec-lifecycle` before
> the PR (only "Deviations and rulings" is updated; the bounty spec is implemented after step 12).

**Status:** ready. UI questions 57–63 answered 2026-10-29 (「按推荐」); canvas page 05, 「悬赏 · 状态页 · 第 57–63 题」.

**Goal:** Both sides of a selected bounty follow it on one 7A status screen (vertical timeline, actions pinned at the
bottom), reached from a home live card. The helper taps 出发了, changes the expected arrival (the old time struck
through) and taps 完成; the poster confirms (which opens the built pay sheet) or reports 「有问题」 (8A sheet), and either
side cancels after selection through the 8A action sheet whose copy follows `bounty_cancel_preview`. The bounty
live-item source registers with `setSource` and publishes one card per bounty with the new `bountyAction` kind (9A).

**Built contracts (one small migration, Task 1):** `start_bounty`, `update_eta`, `complete_bounty`, `confirm_bounty`,
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

## UI questions (answered 2026-10-29: 「按推荐」, 57A 58A 59B 60A 61A 62A 63A)

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
comes back (this month's free post, or the 貘币), from the charge Task 1 adds to `bounty_detail`; 62's pay sheet on the
canvas is a stand-in for the built one.

## Rulings made in this plan (overturn by saying so)

1. **The status screen is `/bounty/status/[id]`** in the 悬赏 Stack, pushed from the home card (`withAnchor`, like the
   detail) and from the detail or the applicant screen once the viewer is a party (poster or selected helper) and the
   status is past `open`. Header title empty, back to 悬赏.
2. **Timeline steps** (both roles, 7A board): 选好了{helper} › {helper}出发了 (with ETA) › {helper}点完成 › 你确认完成 /
   {poster}确认 › 付给{helper} RM n / 收 RM n. `disputed` shows the reason under 点完成 with the orange mark; the step
   order never changes. Times come from `events`; the ETA line from `etaAt` / `previousEtaAt`.
3. **Refresh** on screen focus, app foreground and pull; no polling. A failed refresh keeps the screen under a warning
   notice with the time of the data; a first-load failure shows the load-failed card, never an empty timeline.
4. **Actions never replay**: each RPC shows progress in its button until it answers; on failure an inline notice
   「没发出去，再试一次」 and the button returns. The server's idempotent replies (`confirm_bounty`, `cancel_bounty`,
   `close_bounty` return the earlier outcome) count as success.
5. **8A copy** comes from `bounty_cancel_preview`: `offender = other` → 「{name}过了约定时间 30 分钟还没出发，现在取消记在
   {name}那边」; `self` with `waiverAvailable` → the waiver line; `self` without → counted, with the date the waiver comes
   back (`waiverBackAt`, Task 1). The helper's title is 「不帮了？」, the poster's 「取消这单？」.
6. **Home cards** render in `src/features/home` from types in `src/lib/liveItems.ts` (`BountyCardDetail` beside the moved
   `ProgressDetail` and siblings); the bounty feature only publishes items and details. A card tap pushes by path
   (`/bounty/status/[id]`, `/bounty/applicants/[id]`, `/bounty/[id]`), so home imports nothing from bounty.
7. **One-time cards** call `mark_bounty_seen` when the card is first rendered in the front of the stack or the expanded
   list, once per launch; a failed mark is retried on the next display, never in a loop.

## Contracts

- `bounty_live_items()` (Task 1 adds): applicant rows with `role = 'applicant'`, `kind = 'bountyInProgress'`,
  `card = null`, `status = 'open'` for a pending application on an open bounty (not blocked). Ranked with 等对方.
- `bounty_detail(...)` (Task 1 adds): `charge` (`'free'` / `'coin'`) for the poster while `open`.
- `bounty_cancel_preview(...)` (Task 1 adds): `waiverBackAt` (when the used waiver's 60 days end) when
  `waiverAvailable = false`.
- Typed RPC reasons the client maps: `invalid_transition` → refresh and show 「这单的状态变了」; `not_helper` /
  `not_poster` → load-failed; network → 「没发出去，再试一次」.
- Accessory kinds after this step: `oweMoney › rideSoon › owedToYou › bountyAction › bountyInProgress ›
waitingConfirm` (9A).

## Tasks

### Task 1: SQL — pending applicant card, close charge, waiver date (63A, 58A, 8A)

- [ ] Migration `supabase/migrations/20261029000100_bounty_status_reads.sql`: replace `bounty_live_items`,
      `bounty_detail` (the privacy version in `20261027000500`) and `bounty_cancel_preview` with the three additions.
- [ ] pgTAP in `supabase/tests/`: an applicant sees one pending row and loses it on select (then the `not_selected`
      card) and on withdraw; a blocked pair sees none; `charge` only for the poster while open; `waiverBackAt` set only
      when the waiver is used.
- [ ] `supabase test db` passes.

### Task 2: Copy in three languages

- [ ] Keys under `bounty.status.*`, `bounty.live.*`, `bounty.cancel.*`, `bounty.close.*`, `bounty.eta.*`,
      `bounty.issue.*`, `home.card.bounty.*`, zh-Hans first from the canvas boards (7A, 8A, 9A table, Q57–63), then en
      and ms. `src/lib/i18n/resources.test.ts` passes.

### Task 3: Live-item contract and home cards (9A, 57A, 63A)

- [ ] Move `ProgressDetail` and siblings to `src/lib/liveItems.ts`; add `bountyAction` and `BountyCardDetail` (role,
      status, title, category, reward, counterpart, line, action label, target path, one-time flag).
- [ ] `src/features/home`: a bounty card per item, the action pill on `bountyAction`, tap → target path; the strip
      line for the front bounty card; one-time cards per ruling 7. Unit tests on ordering and stage lines.
- [ ] Update the home cases whose feed changes (`home_*`), run them once.

### Task 4: Bounty live source

- [ ] `src/features/bounty/live/`: service (Supabase `bounty_live_items` and a fixture with every 9A row), store,
      `liveItems.setSource('bounties', …)` with status and retry, mapping to items with copy via `t()`. Unit tests on
      the mapping for every row of the 9A table.

### Task 5: Status service and timeline model

- [ ] `src/features/bounty/status/`: service wrapping `bounty_detail`, `start_bounty`, `update_eta`,
      `complete_bounty`, `confirm_bounty`, `report_bounty_problem`, `cancel_bounty`, `bounty_cancel_preview`,
      `close_bounty`, with typed results; a fixture service with every state; a pure `timeline(detail, role)` per ruling 2
      and `statusActions(detail, role)`; reducer for in-flight and failure states. Unit tests for every state × role.

### Task 6: Status screen 7A

- [ ] Route `src/app/(tabs)/bounty/status/[id].tsx`, screen with summary, timeline, address section (built), pinned
      actions; refresh per ruling 3. Debug scenes for every state × role. UI case `bounty_status_states` (zh-Hans light,
      `ms` in LOCALES), run once.

### Task 7: Helper actions — 出发 with ETA, change ETA, 完成 (59B, 60A, 61A)

- [ ] ETA sheet (`pageSheet` medium detent, system wheel `DateTimePicker` from `@expo/ui`, default now + 30 min,
      「好」); 出发 calls `start_bounty(eta)`; 「改预计到达时间」 reuses the sheet with `update_eta`; the strike motion
      (opacity + translate, Reduce Motion: no motion). 完成 one tap with the success haptic. UI case
      `bounty_status_helper` with video for the ETA change, run once.

### Task 8: Poster actions — 确认完成, 有问题, cancel and close (62A, 8A, 58A)

- [ ] 确认完成: `ConfirmationDialog` with the amount → `confirm_bounty` → push `/pay/[paymentId]`. 有问题: sheet with a
      multi-line reason (≤ 140) → `report_bounty_problem`. Cancel after selection (both roles, ⋯ menu): preview →
      action sheet per ruling 5 → `cancel_bounty`. Close before selection: applicant list ⋯ → 「关掉这单」 → action sheet
      with the charge → `close_bounty`. UI case `bounty_status_poster`, run once.

### Task 9: Detail and applicant screens key on status; links to the status screen

- [ ] The parked step-5 fix: 「选好了{name}」 and 「{poster}选了你」 only while the status is `assigned` or later and not
      `cancelled`; a cancelled bounty shows 「这单取消了」. Parties see 「看进度」 to the status screen. Update
      `bounty_detail_outcome` and the applicant cases, run them.

### Task 10: Worst case, story map, PR gate

- [ ] `break-ui` on the status screen and the bounty home cards (long names, long reasons, ms); fix what breaks.
- [ ] `docs/story-map.md` criteria for 7A, 8A, 9A, 57A–63A with their tests; `check-story-map` passes.
- [ ] Fast checks, `verify:smoke`, retro, `spec-lifecycle` (Deviations only), PR.

## Motion

| Motion                                 | Purpose    | Gate                                         | Build                              |
| -------------------------------------- | ---------- | -------------------------------------------- | ---------------------------------- |
| New ETA flips in, old time struck grey | cause      | Decided (CraftPick 2); rare                  | Reanimated opacity + translate     |
| Timeline step advances                 | —          | Status changes once per step; system refresh | No custom motion                   |
| Push to status, sheets, action sheets  | navigation | System                                       | Native Stack, `ConfirmationDialog` |

## Not in this plan

Settlement art and the payer-side sticker (step 7), map (8), photo stickers and fly-to-stack (9), AI drafting (10), push
and the Live Activity (11), 先付 (12).

## Deviations and rulings

- 2026-10-29, Task 3: `BountyCardDetail.kind` also allows `waitingConfirm`, so the 9A 等对方 rows rank last;
  `ProgressDetail` and `ProgressCard` were removed rather than moved (only the fixture used them); `home.say.bounty` added,
  `home.card.progress.*` removed.
- 2026-10-29, controller: 15A's 「等对方付款」 comes from the built payments source (`pay.live.waiting` while the payment is
  `due`); the bounty source publishes no helper card at `confirmed`, so the two never show the same thing twice.
- 2026-10-29, controller: the applicant's 「这单过期了」 card is dropped for v1: expiry does not mark applications and
  `mark_bounty_seen('expired')` is the poster's. When a bounty expires, the applicant's 「等{name}选」 card disappears and
  the detail shows it closed.
- 2026-10-29, controller: a failed seen mark rejects (`liveStore.markSeen` throws), which is the signal home uses to retry
  on the next display.
