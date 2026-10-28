# Bounty step 5: the applicant list, hold-to-commit selection, selected and not-selected states Implementation Plan

> **For agentic workers:** execute task by task. If a plan-execution skill is
> available (for example superpowers `subagent-driven-development` or
> `executing-plans`), use it. Track steps with checkboxes (`- [ ]`). When all
> tasks are done, run `spec-lifecycle` before opening the PR (only "Deviations and rulings" here is updated; the bounty
> spec is implemented after step 12).

**UI questions:** 45–54 answered on 2026-10-28 by the user's advance approval of every recommendation (45B, 46A–54A;
docs/KICKOFF.md; spec rows 45B–54A). The user may overturn any of them; the affected task then reopens.

**Goal:** A poster sees everyone who applied to an open bounty as the 6A single-choice grouped list (name, tier, the
second line per Q48, the note), picks one row, and holds the one gold button at the bottom (「按住，选阿杰来帮你」) for
about a second to choose that person. Release before full and the fill runs back. A lost race shows 「已经选好了」. A
long-press on an applicant row offers the red 「屏蔽{name}」 (5A, third entry). The applicant who opens the bounty after
the choice sees 「{poster}选了你」 with the exact address (selected), or 「这次没选上」 with the untilted sticker and no
stamp (not selected); the one-time seen flag is stored on the server.

**Architecture:** Selection uses the built RPCs: `bounty_applicants(bounty)` for the list, `select_helper(bounty,
applicant)` for the hold, `bounty_detail(bounty, latitude, longitude)` for the header, address and the outcome,
`mark_bounty_seen(bounty, 'not_selected')` for the seen flag and `block_user(target)` for the long-press. One small
migration adds what the 6A rows show and the server does not return yet (`helpedCount`; the distance only if Q48 = B).
The client adds `src/features/bounty/select/` (service, reducer, screen, rows) and a generic `HoldButton` in `src/ui/`
(Reanimated `scaleX` fill from the left plus an opacity cross-fade of the label, Gesture Handler, `expo-haptics`) with
the 12A gold tokens. The applicant list is a push in the 悬赏 Stack (`/bounty/applicants/[id]`). The detail gains two
outcome states. How users reach the poster's screen before step 6's live cards is Q45.

**Tech stack:** Expo SDK 57 (React Native 0.86), TypeScript 6, Expo Router (native Stack push), `@expo/ui` SwiftUI
(`Host`, `Form`/`List`, `Section`, `Button`, `ContextMenu`, `ConfirmationDialog`, `Alert`), Reanimated 4.5 (transforms
and opacity only), Gesture Handler 2.32, `expo-haptics` 57, pgTAP, `bun test`, `verification/ui`. No new dependency.

**Spec:** `docs/specs/2026-10-11-bounty-design.md` (approved): Implementation order step 5; Decisions rows Selecting,
Blocked users, Address privacy, Freshness; UI/UX rows 5A (applicant-row long-press), 6A, 12A, and the note on
one-time cards (seen flag on the server); Motion row "Hold-to-commit fill"; Data flow "State machine" (`open → assigned`,
others `not_selected`) and "In-app events" (selected / not selected); Errors rows "Posting / applying / selecting
fails", "Two devices race on select". Canvas: page 05, board 「悬赏 · 开工前（二）进行中与结清」 (`BountyPickProgress`,
question 6 with 「6A 的其他状态」), board 「（一）发布与申请」 (`BountyPickPost`, 5A), `CraftPick` item 5 (hold
prototype). Built contracts: `supabase/migrations/20261026001200_bounty_flow.sql` (`select_helper`),
`20261027000300_bounty_read.sql` (`bounty_applicants`, `bounty_live_items`, `mark_bounty_seen`),
`20261027000500_bounty_board_privacy.sql` (`bounty_detail` with a point), `20261026000100_blocks.sql`.

## Global constraints

- Zero comments in TypeScript, Swift, SQL and Python unless they explain unexpected behaviour or a hidden invariant
  (AGENTS.md Conventions). No JSDoc.
- iOS only; no Android code, stubs or scripts. Never disable code signing. `ios/` is never edited by hand. No new
  dependency and no Swift in this step, so no `pod install`.
- `src/features/bounty/` imports no other feature. Shared pieces go to `src/ui/` (`HoldButton`) or `src/lib/`.
- Native first: the applicant list is a SwiftUI grouped list with the system checkmark; the long-press is the system
  context menu (`ContextMenu`); confirmations are system action sheets; the race message is a system alert. The hold
  button is the one custom control: iOS has no hold-to-confirm control, so it is built in RN, not imitated from one.
- No user-facing string is hard-coded; every key exists in `zh-Hans`, `en` and `ms` (`src/lib/i18n/resources.test.ts`).
  zh-Hans first; `ms` checked for truncation (the hold label carries a name and is the longest line on the screen).
- Tokens only (`node scripts/design-check.mjs`): the gold is the new 12A token pair from Q49, recorded in
  `docs/design-language.md` as the one exception to "yellow is never a brand colour". No raw colours, font sizes or
  font families in `src/features/bounty/` or `src/ui/HoldButton.tsx`.
- Every interactive element has a VoiceOver label and a 44 pt target; the hold button is 64 pt tall as drawn. Controls a
  case touches have a `testID` from the "testID pattern" table.
- Data integrity: a first-load failure of the list is never shown as 「还没有人申请」 and shows no count; a failed
  refresh keeps the rows under a warning notice with the time of the data; the selection RPC shows progress until it
  answers, is never replayed automatically (no retry on foreground, no retry after relaunch), and a failure keeps the
  selected row. The client never treats a hold as a selection until `select_helper` answered `assigned`.
- Privacy: the list shows only what `bounty_applicants` returns; the exact address appears only from `bounty_detail`
  for the poster and the selected helper (server rule, unchanged).
- Motion: transforms and opacity only; every motion finite, once per event, respects Reduce Motion; no `withRepeat`.
  The hold fill and its haptics follow Q50. Row selection, list reloads and the outcome states do not animate.
- Files under 500 lines; components under 300 lines.
- End of every task, judged by exit status (capture `$?` before any pipe): `bun test`, `bunx tsc --noEmit`,
  `bun run lint -- <changed .ts/.tsx files>`, `bun run format:check`, `node scripts/design-check.mjs` (tasks touching
  `src/`), `node scripts/check-story-map.mjs`, `node scripts/check-specs.mjs --dir docs/specs`, `supabase test db`
  (Task 1). Each new UI case is run once by its author: `bun run verify:build` then `bun run verify:ui <case>`
  (zh-Hans light), screenshots opened before reporting. `bun run verify:smoke` runs once at the end of the PR.
- Never touch the remote Supabase project; pgTAP runs against the local stack only.
- Commits: Conventional Commits with scope `bounty` (`feat(bounty): …`, `test(bounty): …`), `feat(ui): …` for
  `src/ui/HoldButton.tsx`; no AI co-author lines.

## Rulings already made (do not re-ask)

1. One helper per bounty; selection is one `select_helper` call; the server is the single writer and sets every other
   pending application to `not_selected` in the same transaction (spec Decisions "Selecting", B5).
2. No chat before or after selection in v1; poster and helper coordinate through the detail and the exact address (spec
   Known limits).
3. Freshness: the applicant list and the detail load on open, on returning to the foreground, on focus and on
   pull-to-refresh; a write's own answer updates the screen that made it; no Realtime (spec Decisions "Freshness").
4. One-time cards disappear once seen, with the seen flag on the server per user and item (spec UI/UX note; built as
   `bounty_seen` and `mark_bounty_seen`).
5. The applicant-row block uses the 5A copy and flow already built for the detail ⋯ (`bounty.block.*`, `blockFlow.ts`)
   and the 37A 屏蔽名单 for undo.
6. The hold gold is a dedicated token (12A); only its values are open (Q49).
7. The applicant screen, the detail and the outcome states are system screens (spec "Screen classes").

## Decided UI (do not re-ask)

| Item | Decision | Source |
| --- | --- | --- |
| Applicant screen | Pushed system screen. Header block: 48 pt sticker, title, status line 「等你选人 · {n} 人申请」, reward (SF Rounded). Section header 「选一个人来帮你」; one grouped row per applicant; section footer 「只有选中的人能看到精确地址。」 | 6A, canvas board 6 |
| Applicant row | Initial avatar, name, `TierMark`, a second line (content per Q48), the note in 「」 on its own line(s); tapping a row puts the system checkmark on it and moves the hold button's name; one selection at a time | 6A |
| Hold button | One button pinned at the bottom (pinned area like the detail's `SheetFrame`), 64 pt tall, fully rounded, ink track; label 「按住，选{name}来帮你」; hint under it 「按住约 1 秒；选好后另外 {n} 人会看到「这次没选上」」 (n = applicants − 1; plural forms) | 6A, CraftPick 5 |
| Holding | Gold fills from left to right; label 「继续按住…」; haptics light → heavy while held; release before full runs the fill back; full → a heavy 「咚」 | CraftPick 5, 6A other states |
| 50 applicants | Still one list of rows; the button stays pinned | 6A |
| Lost race | System alert 「已经选好了」 / 「你在另一台设备上已经选了{name}。」 / 好的 | 6A other states |
| Not selected (applicant) | Detail: the sticker is no longer tilted and the 已申请 stamp is gone; pinned area shows a ≤ 32 pt 小貘 head, 「这次没选上」, 「{poster}选了别人。你的申请已经关掉，不影响靠谱度。」, 「你写的」 with the note, and the button 「看看附近别的悬赏」; tone plain | 6A other states |
| Long-press block | An applicant row's long-press menu holds 「屏蔽{name}」 in red; confirmed by the system action sheet with the 5A copy | 5A |
| Hold colour | A dedicated gold token, the one exception to "yellow is never a brand colour" | 12A |

## Rulings made in this plan (overturn by saying so)

These close small gaps the canvas did not draw, each following an existing decision.

1. **Order** is the RPC's: application time, oldest first (`bounty_applicants` orders by `created_at, applicant_id`). No
   sort by tier: first come is the only neutral order.
2. **The full note** shows in the row, never clamped: the poster chooses by it and it is bounded at 140 code points. A
   row without a note has no note line.
3. **「帮过 N 次」** counts settled bounty payments where the applicant was the payee (`payments.item_kind = 'bounty'`,
   `state = 'settled'`, `reverses is null`); 0 reads 「还没帮过」 rather than 「帮过 0 次」. Computed in the migration,
   never on the client.
4. **Selection survives a reload** while that applicant is still in the list; if the reload drops them (withdrew,
   blocked), the selection clears and the button returns to its no-selection state (Q46).
5. **Same person twice** (two devices hold for the same applicant): `select_helper` answers `assigned` with the same
   helper, so the second device shows success, not 「已经选好了」. 「已经选好了」 is only for `taken`.
6. **The race alert's name** comes from reloading `bounty_detail` (poster role returns `helper`); if that load fails,
   the body reads 「你在另一台设备上已经选好了人。」. 好的 then shows the after-selection state (Q52).
7. **VoiceOver:** the hold button exposes the activate action; activating it opens a system confirmation
   「选{name}来帮你？」 with 选{name} / 取消, because a timed hold is not operable for every user (HIG accessibility).
   The confirmation calls the same `select` path.
8. **Long-press menu** holds only 「屏蔽{name}」 (like 37A's ⋯); the system lifts the row as the preview. The action
   sheet body appends one sentence to the 5A copy: 「{name}的申请也会从这里消失。」. After a block the list reloads and
   the row is gone; if it was the selected row, the selection clears.
9. **「看看附近别的悬赏」** pops the 悬赏 Stack to the board root and scrolls the board to its top.
10. **The detail's outcome comes from `myApplication.status`**: `not_selected` → not-selected state; `viewerRole =
    'helper'` → selected state (Q53); `withdrawn` keeps the step-4 behaviour.
11. **No count on a failed first load**: the status line shows only 「等你选人」 until the list has loaded.
12. **The applicant screen for a bounty that is no longer open** (assigned by another device, expired, cancelled) shows
    the after-selection state (Q52) when assigned, else an inline card 「这条悬赏已经关闭了」 with 返回.

## UI questions (open)

Drawn on the canvas as questions 45–54 (details, options and drawings: `questions.md`). ★ marks the recommendation.

| # | Question | Options | ★ | Blocks |
| --- | --- | --- | --- | --- |
| 45 | How the poster reaches the applicant list before step 6's live cards | A move the bounty live source forward · B Debug scenes until step 6 · C interim 我的 list | B | 5, 10 |
| 46 | The hold button before any row is chosen | A disabled 「先选一个人」 · B first row preselected · C hidden until a choice | A | 5, 6 |
| 47 | The screen while nobody has applied | A inline card, no button · B empty section + disabled button | A | 5 |
| 48 | The row's second line | A 「帮过 N 次」 only · B also the distance, captured at apply time · C nothing (tier only) | A | 1, 4, 5 |
| 49 | Gold token values | A flat gold on the ink track, both modes · B the drawn two-stop gradient · C gold track, ink fill | A | 3 |
| 50 | Fill timing and haptics (motion) | A 1.0 s linear, 4 ticks, heavy at full · B 0.8 s ease-in · C 1.2 s linear, no ticks | A | 3 |
| 51 | While the choice is sent, and when it fails | A fill stays, 「正在选…」, notice above the button · B system alert per reason | A | 6 |
| 52 | The poster's screen right after choosing (until step 6) | A same screen turns into 「选好了{name}」 with address · B pop back with a banner | A | 6 |
| 53 | What the selected applicant sees (until step 6) | A 「{poster}选了你」 + exact address · B plus a 「选中」 stamp · C only the line, no address | A | 8 |
| 54 | When 「这次没选上」 counts as seen | A when the detail shows it · B on 「知道了」 · C on first display of the home card (step 6) | A | 8 |

## Motion

| Motion | Purpose | Gate | Build |
| --- | --- | --- | --- |
| Hold fill, release run-back, haptic ramp | commitment | Passed (spec Motion table, CraftPick 5, 6A); rare and hard to undo | Q50; `HoldButton` in `src/ui` |
| Push to the applicant list, back, system alert and action sheet | navigation | System | Native Stack, `Alert`, `ConfirmationDialog` |
| Row checkmark on tap | — | Frequent while comparing applicants: no animation | Instant swap |
| Long-press lift | — | System context menu | `ContextMenu` |
| Applicant list reload, row removed after a block | — | Not a moment | Instant, list replaced |
| Sticker untilts and the stamp disappears (not selected) | — | The applicant learns the outcome on a reload, not by acting; motion would replay a past event | Static final state |
| 「选好了{name}」 state after success | — | The heavy haptic at full is the feedback; one result, one haptic | Instant swap (Q51 decides the in-flight state) |

No `withRepeat`, no infinite cycles. Reduce Motion: per Q50.

## Contracts

### Server (built)

```ts
// supabase.rpc('bounty_applicants', { bounty }) → Applicant[]  (poster only; pending and selected; blocked pairs hidden)
//   errors: bounty_not_found (P0002), not_poster (42501)
// supabase.rpc('select_helper', { bounty, applicant }) → { status: 'assigned', helperId }
//   idempotent for the same applicant; rejections (message slug): bounty_not_found, not_poster, closed, taken,
//   not_pending, blocked, no_payee_method
// supabase.rpc('bounty_detail', { bounty, latitude, longitude }) → BountyDetail (step 4 type) plus, for parties,
//   helper: Person | null, address: string | null, applicantCount (poster), myApplication.status
// supabase.rpc('mark_bounty_seen', { bounty, card: 'not_selected' }) → void (idempotent; bounty_not_found otherwise)
// supabase.rpc('block_user', { target }) → step 4 block service
```

### Server (new, migration `supabase/migrations/20261029000000_bounty_applicants_helped.sql`)

```sql
-- create or replace public.bounty_applicants(bounty uuid): same checks, filters and order; each item adds
--   'helpedCount', (count of settled bounty payments with payee_id = applicant, reverses is null)::integer
-- Q48 = B only: 'distanceM' = private.rounded_distance(b.place_public, a.applied_from) where
--   bounty_applications gains applied_from geography(Point) (snapped like place_public), written by apply_to_bounty
--   from new optional latitude/longitude arguments; null when either point is missing
-- grants re-issued (revoke from public, anon, authenticated; grant execute to authenticated)
```

### Client (new)

```ts
// src/features/bounty/select/types.ts
export type Applicant = {
  id: string; name: string | null; tier: Tier; note: string | null;
  status: 'pending' | 'selected'; appliedAt: string; helpedCount: number;
  distanceM?: number | null; // Q48 = B only
};
export type SelectFailure = 'taken' | 'closed' | 'notPending' | 'noPayee' | 'gone' | 'failed';
export type SelectService = {
  applicants(bountyId: string): Promise<Applicant[] | 'gone'>; // throws on failure
  select(bountyId: string, applicantId: string):
    Promise<{ ok: true; helperId: string } | { ok: false; reason: SelectFailure }>;
  markNotSelectedSeen(bountyId: string): Promise<void>; // swallows failure; retried on the next display
};
// blocked → notPending (the list hides blocked pairs, so the row is gone after the reload)

// src/features/bounty/select/selectState.ts — pure reducer, tested without React
export type SelectState = {
  list:
    | { kind: 'loading' }
    | { kind: 'failed'; retrying: boolean }
    | { kind: 'ready'; applicants: Applicant[]; loadedAt: string; refreshing: boolean; refreshFailed: boolean }
    | { kind: 'gone' };
  chosen: string | null;                                   // applicant id with the checkmark
  send: { kind: 'idle' } | { kind: 'sending'; applicantId: string }
      | { kind: 'failed'; reason: Exclude<SelectFailure, 'taken'> } | { kind: 'raced' }
      | { kind: 'selected'; helperId: string };
};
// events: loadStarted, loaded(applicants, at), loadFailed, gone, chose(id), holdCompleted, answered(result),
//         blocked(id), raceAcknowledged

// src/ui/HoldButton.tsx
export function HoldButton(props: {
  label: string; holdingLabel: string; busyLabel: string; hint?: string;
  state: 'disabled' | 'ready' | 'busy';
  onComplete: () => void;            // called once when the fill reaches full
  onAccessibilityActivate: () => void; // ruling 7
  testID?: string;
}): JSX.Element;
// src/ui/holdSchedule.ts — pure: haptic ticks and durations per Q50; tested
```

`BountyDetail` (step 4 `board/types.ts`) already carries `viewerRole`, `myApplication.status` and `address`; Task 8 adds
`helper: Person | null` to the parser for the poster and helper roles.

Routes:

| Path | File | Presentation |
| --- | --- | --- |
| `/bounty/applicants/[id]` | `src/app/(tabs)/bounty/applicants/[id].tsx` | Push in the 悬赏 Stack, transparent header with `scrollEdgeEffects`, title hidden (the header block carries it) |

testID pattern:

| Element | testID |
| --- | --- |
| Screen / header | `bounty-applicants`, `bounty-applicants-title`, `bounty-applicants-status`, `bounty-applicants-reward` |
| Rows | `bounty-applicant-<applicantId>`, `-name`, `-tier`, `-meta`, `-note`, `-check` |
| States | `bounty-applicants-empty`, `bounty-applicants-failed`, `bounty-applicants-stale`, `bounty-applicants-closed`, `bounty-applicants-retry` |
| Hold | `bounty-select-hold`, `bounty-select-hint`, `bounty-select-failed`, `bounty-select-busy` |
| After selection | `bounty-select-done`, `bounty-select-done-row`, `bounty-select-done-address` |
| Detail outcome | `bounty-detail-not-selected`, `bounty-detail-not-selected-note`, `bounty-detail-browse`, `bounty-detail-selected`, `bounty-detail-address` |

Verify launch arguments (fixture services, `uiVerify` only):

| Argument | Values | Effect |
| --- | --- | --- |
| `-uiVerifyApplicants` | `three` (default: 阿杰 很靠谱 帮过 14 次 with a note, Hana 新朋友 还没帮过, Aiman 靠谱 帮过 3 次), `none`, `one`, `fifty`, `worst` (40-character names, 140-code-point notes, 貘友, `helpedCount` 128) | `applicants()` data for every bounty id |
| `-uiVerifyApplicantsFail` | `first`, `refresh` | first load fails once / the second load fails |
| `-uiVerifySelect` | `ok` (default), `failOnce`, `taken`, `notPending`, `noPayee`, `closed` | `select()`; in verify builds it takes 2.5 s so a case can see the in-flight state |
| `-uiVerifyDetail` | adds `notSelected`, `selected` | the fixture detail answers with that outcome for `-uiVerifyDetailId` |

## File structure

| Action | Path | Responsibility |
| --- | --- | --- |
| Create | `supabase/migrations/20261029000000_bounty_applicants_helped.sql` | `helpedCount` (and Q48 = B's distance) |
| Create | `supabase/tests/bounty_applicants.test.sql` | Count, order, filters, poster-only, the new key list |
| Modify | `src/lib/i18n/locales/bounty/{zh-Hans,en,ms}.ts` | `bounty.select.*`, `bounty.detail.selected.*`, `bounty.detail.notSelected.*`, `bounty.block.confirm.applicantBody` |
| Modify | `src/ui/theme/tokens.ts`, `docs/design-language.md` | 12A tokens (Q49), exception note, `HoldButton` in the component inventory |
| Create | `src/ui/HoldButton.tsx`, `src/ui/holdSchedule.ts` (+ test) | The hold control |
| Create | `src/features/bounty/select/{types,selectService,fixtureSelectService,parse,selectState,useApplicants,selectCopy}.ts` (+ tests) | Data, state, freshness, failure copy |
| Create | `src/features/bounty/select/{ApplicantsScreen,ApplicantRows,SelectFooter,SelectedSummary}.tsx` | 6A screen (each < 300 lines) |
| Modify | `src/features/bounty/services.ts`, `src/features/bounty/index.ts` | Wire the select service and export the screen |
| Create | `src/app/(tabs)/bounty/applicants/[id].tsx`; Modify `src/app/(tabs)/bounty/_layout.tsx` | Route |
| Modify | `src/features/bounty/detail/{detailState,BountyDetailScreen,DetailRows}.ts(x)`; Create `detail/OutcomeActions.tsx` | Selected / not-selected states |
| Modify | `src/features/bounty/board/{types,parse,fixtureBoardService}.ts` | `helper` on the detail; fixture address and outcomes |
| Modify | `src/features/bounty/block/{blockFlow,hooks}.ts` | Accept any person, not only the poster |
| Modify | `src/debug/BountyScenes.tsx`, `src/debug/scenes.tsx` | Scene `bounty-applicants` |
| Create | `verification/ui/select.py`; cases `bounty_applicants`, `bounty_select`, `bounty_select_failed`, `bounty_select_race`, `bounty_applicant_block`, `bounty_detail_outcome`, `bounty_applicants_worst` | Helpers and cases |
| Modify | `verification/ui/driver.py` | A press-and-hold primitive (Task 6) |
| Modify | `verification/ui/README.md`, `docs/story-map.md` | Docs |

## PR split

**One PR.** The step is one flow (list → hold → outcome) with one small migration; splitting would ship a list nobody can
act on.

## Task 1: `bounty_applicants` row data and pgTAP (Q48 answered)

**Files:** migration, `supabase/tests/bounty_applicants.test.sql`; `supabase/migrations/20261026001100_bounty_apply.sql`
is replaced by a `create or replace` in the new migration only if Q48 = B

**Interfaces**

- Consumes: `public.payments`, `private.is_blocked_between`, `private.bounty_person_name`, `public.reputation_tier`
- Produces: the "Server (new)" contract (Task 4)

**Steps**

- [ ] Write failing pgTAP (local stack; fixtures reuse `pg_temp.post` / `act_as` from `bounty_read.test.sql`; users
      poster P, applicants A (two settled bounty helps as payee, one settled as payer), B (none), C (blocked by P),
      D (blocked P), W (withdrew)): as P the list has exactly A and B in application order; each item has exactly the
      keys `applicantId, name, tier, note, status, appliedAt, helpedCount` (plus `distanceM` with Q48 = B); A's
      `helpedCount` is 2 (the payer-side settle does not count; a reversed payment does not count; an unsettled
      `marked_paid` payment does not count); B's is 0; C, D and W are absent; after `select_helper(A)` the list is A
      with `status = 'selected'` only; as A, `bounty_applicants` raises `42501`; an unknown id raises `P0002`.
- [ ] Q48 = B only: `apply_to_bounty(bounty, note, latitude, longitude)` stores `applied_from` snapped to the
      `place_public` grid; `distanceM` is `null` without either point, rounded like `nearby_bounties` otherwise, and the
      exact `applied_from` is never returned by any function (assert on `bounty_detail`, `my_bounties`,
      `bounty_applicants` as P and as A).
- [ ] Write the migration (`create or replace`, same `security definer`, `search_path = ''`, same filters and order);
      re-issue revoke/grant.
- [ ] Mutation pass (scratch scripts, not committed): count payer-side settles, drop `reverses is null`, drop the block
      filter; each mutant must fail a test. Record the result in the PR body.
- [ ] `supabase test db` passes; commit `feat(bounty): applicant rows carry how often they helped`.

## Task 2: Copy in three languages

**Files:** `src/lib/i18n/locales/bounty/{zh-Hans,en,ms}.ts`

**Steps**

- [ ] Add `bounty.select.*`: header status 「等你选人 · {{count}} 人申请」 (`_one` / `_other`) and the countless 「等你选人」,
      section header 「选一个人来帮你」, footer 「只有选中的人能看到精确地址。」, row meta per Q48 (「帮过 {{count}} 次」,
      「还没帮过」, and with B 「{{distance}}」 joined by 「 · 」), hold label 「按住，选{{name}}来帮你」, holding
      「继续按住…」, hint 「按住约 1 秒；选好后另外 {{count}} 人会看到「这次没选上」」 (`_one` / `_other`; count 0 → the
      hint without the second clause: 「按住约 1 秒」), no-selection label per Q46, empty state per Q47, in-flight and
      failure copy per Q51 (`failed` 「没发出去，再试一次」 from the spec, `notPending`, `noPayee`, `closed`), race alert
      title 「已经选好了」, body 「你在另一台设备上已经选了{{name}}。」 and the nameless body, 好的, VoiceOver confirm
      title 「选{{name}}来帮你？」 with 选{{name}} / 取消, after-selection copy per Q52, first-load failure 「没加载出来」 +
      重试, stale 「没刷新成功 · 下面是 {{time}} 的」, closed 「这条悬赏已经关闭了」 + 返回.
- [ ] `bounty.detail.notSelected.*`: 「这次没选上」, 「{{name}}选了别人。你的申请已经关掉，不影响靠谱度。」, 「你写的」,
      「看看附近别的悬赏」. `bounty.detail.selected.*` per Q53 (「{{name}}选了你」, address row title and footer
      「只有你和{{name}}看得到」).
- [ ] `bounty.block.confirm.applicantBody`: the 5A body plus 「{{name}}的申请也会从这里消失。」 (ruling 8).
- [ ] VoiceOver labels: applicant row (name, tier, meta, note, selected state), hold button (label + 「按住约 1 秒，或
      双击确认」 hint).
- [ ] zh-Hans first, then en, then ms; `bun test src/lib/i18n` passes; commit `feat(bounty): applicant list and
      selection copy in zh-Hans, en, ms`.

## Task 3: Hold token and `HoldButton` (Q49, Q50 answered)

**Files:** `src/ui/theme/tokens.ts`, `docs/design-language.md`, `src/ui/HoldButton.tsx`, `src/ui/holdSchedule.ts` (+ test)

**Interfaces**

- Produces: `HoldButton` (Task 6), tokens `--color-hold-track`, `--color-hold-fill`, `--color-on-hold-track`,
  `--color-on-hold-fill` (values per Q49)

**Steps**

- [ ] Tokens per Q49 in `tokens.ts` light and dark; `design-language.md` Colour table rows, the 12A exception sentence
      under "Yellow is never a brand colour", contrast check (label ≥ 4.5:1 on track and on fill in both modes; record
      the ratios), and `HoldButton` in the component inventory. `bun test src/ui/theme` and `design-check` pass.
- [ ] `holdSchedule.test.ts` first: fill duration, tick times and styles, the heavy impact at full, the run-back
      duration, Reduce Motion values (Q50); a release at any time before full yields no `complete`; `complete` fires
      once even if the finger stays down.
- [ ] `HoldButton`: Gesture Handler `Gesture.LongPress().minDuration(0)` (or `Manual` if `LongPress` cannot report
      begin/end without delay; read `node_modules/react-native-gesture-handler` types first) drives a Reanimated shared
      value `progress` 0 → 1 with `withTiming` per Q50; the fill is a full-width view with `transform: [{ scaleX:
      progress }]` anchored left (`transformOrigin: 'left'`); the label cross-fades from the track label to the fill
      label at 50 % by opacity only; release before 1 runs back per Q50; at 1 `runOnJS(onComplete)` once and the
      heavy impact. Haptic ticks from `holdSchedule` via `runOnJS(Haptics.impactAsync)`. `busy` shows `busyLabel`
      with a spinner and ignores touches; `disabled` uses the disabled appearance and ignores touches.
      `accessibilityRole="button"`, `accessibilityActions=[{ name: 'activate' }]` → `onAccessibilityActivate`.
- [ ] Debug: add the button to the `design-tokens` scene with a label from `debug.*` copy so `design_tokens` shows the
      gold in both modes (update its case only by one pixel assertion on the track colour).
- [ ] Checks; commit `feat(ui): hold-to-commit button with the 12A gold`.

## Task 4: Select service, state and fixture (no UI; Q48 answered)

**Files:** `select/{types,selectService,fixtureSelectService,parse,selectState,useApplicants,selectCopy}.ts` and tests,
`services.ts`

**Interfaces**

- Consumes: `getSupabase`, `uiVerifyArgument`, `inFlightGuard`, the step-4 board `parse.ts` helpers
- Produces: `SelectService`, `selectReducer`, `useApplicants(bountyId)`, `selectFailureCopy`

**Steps**

- [ ] `selectService.test.ts` with a stub client: RPC argument names (`bounty`, `applicant`, `card`); each slug maps to
      its `SelectFailure` (`blocked` → `notPending`, `bounty_not_found` / `not_poster` → `gone`) and a network error to
      `failed`; `applicants` parses every key and rejects a malformed row (throws, never a partial list).
- [ ] `selectState.test.ts`: loading → failed has no applicants (and the status line has no count); ready + refresh
      failure keeps rows and the old `loadedAt`; `chose(id)` moves the check; a reload without the chosen id clears it
      (ruling 4); `holdCompleted` with no choice is ignored; `holdCompleted` → `sending` once (a second
      `holdCompleted` while sending is ignored); `answered(ok)` → `selected`; `answered(taken)` → `raced`;
      other failures → `failed` with the choice kept; a load answer for an older request is dropped; `blocked(id)`
      removes the row and clears the check if it was chosen.
- [ ] `useApplicants`: loads `applicants` and `detail` together on mount, focus, foreground (`AppState`, gated on
      focus like `useBoard`), and pull-to-refresh; never more than one request in flight per kind; `select` through
      `inFlightGuard`; never replays a select after a failure, a background or a relaunch.
- [ ] Fixture per the launch-argument table; `select` returns the same answer for a repeated applicant id like the RPC;
      in verify builds `select` takes 2.5 s (read the delay from `services.ts` like `apply`) and writes the accepted
      arguments to the defaults key `uiVerifySelectedArgs` (cleared at launch), as the post fixture does with
      `uiVerifyPublishedArgs`. The fixture board detail (`fixtureBoardService.ts`, today `address: null`) returns
      `address: 'A 座 12-03'` and `helper` for the poster role after a select and for `-uiVerifyDetail selected`, and
      `null` for every other role, mirroring the server rule.
- [ ] Checks; commit `feat(bounty): applicant service and selection state`.

## Task 5: Applicant screen 6A (Q45, Q46, Q47, Q48 answered)

**Files:** `ApplicantsScreen.tsx`, `ApplicantRows.tsx`, `SelectFooter.tsx`, route, `_layout.tsx`, scene
`bounty-applicants`, case `bounty_applicants`

**Steps**

- [ ] Route `src/app/(tabs)/bounty/applicants/[id].tsx` and its `Stack.Screen` (transparent header, `scrollEdgeEffects`,
      back title 悬赏令). Entry per Q45: with B, only the `bounty-applicants` scene (opens `-uiVerifyDetailId`) pushes it;
      step 6's live card will push the same path.
- [ ] Header block (sticker 48 pt, title, status line, reward) and the grouped list in one `Host` (`List` with one
      `Section`, header and footer copy); rows per "Decided UI" and Q48; the checkmark is the system trailing
      `checkmark` image in the accent, `accessibilityState.selected`; row height grows with the note.
- [ ] Pinned footer (`SheetFrame pinnedAbove="tabBar"`, as the detail): `HoldButton` + hint; no-selection state per Q46;
      zero applicants per Q47; first-load failure 「没加载出来」 + 重试 (`InlineState`, no count); refresh failure: the
      warning `InlineState` with the data time above the list; closed (ruling 12).
- [ ] Case `bounty_applicants` (`ARGS -uiVerifySignedIn onboarded`, scene `bounty-applicants`, `LOCALES ['zh-Hans',
      'ms']`, `DEPS` the select folder, `src/ui/HoldButton.tsx`, the route): three rows in order 阿杰, Hana, Aiman with
      tier text and the Q48 meta; the button shows the Q46 state; tap Hana → check on Hana only and the label reads
      `ui.t('bounty.select.hold', name='Hana')`; tap 阿杰 → the check moves (assert Hana unchecked, so the first
      assertion can fail); the hint count reads 2; every row and the button ≥ 44 pt; `-uiVerifyApplicants none` → the
      Q47 state; `-uiVerifyApplicantsFail first` → 没加载出来, status line without a count, 重试 loads three rows.
      Pixel check: grouped background, the track colour of the button. Screenshots of each state.
- [ ] Checks; run once; commit `feat(bounty): applicant list`.

## Task 6: Hold-to-commit selection, failures and the race (Q50, Q51, Q52 answered)

**Files:** `ApplicantsScreen.tsx`, `SelectFooter.tsx`, `SelectedSummary.tsx`, `selectCopy.ts`, `verification/ui/driver.py`,
`verification/ui/select.py`, cases `bounty_select`, `bounty_select_failed`, `bounty_select_race`

**Steps**

- [ ] `onComplete` → `holdCompleted` → `select`; in flight per Q51; `ok` → the after-selection state per Q52
      (`SelectedSummary`: reload `bounty_detail` for the address; if that load fails, show the summary without the
      address row and a 重试 in its place, never an empty address); failures per Q51 with `selectCopy`; `notPending` and
      `noPayee` also reload the list; `gone` shows 「这条悬赏已经不在了」 and back.
- [ ] `taken` → reload the detail, then the system `Alert` 「已经选好了」 with the name (ruling 6); 好的 → the Q52 state
      for the actual helper.
- [ ] VoiceOver activate → `ConfirmationDialog` (ruling 7) → the same path.
- [ ] `driver.py`: a `press(identifier, seconds)` primitive. Read `axe --help` and `axe touch --help` first (touch down /
      up with a delay, or `swipe` with zero distance and a duration); add a `driver` unit check if `verification/ui` has
      one for gestures. `select.py`: `hold_select(ui, seconds)` and `release_early(ui, seconds)`.
- [ ] Case `bounty_select` (video): choose 阿杰; hold 0.4 s and release → the label returns to the hold label and no
      select was sent (assert the fixture's `uiVerifySelectedArgs` defaults key is empty, the same pattern as
      `uiVerifyPublishedArgs`); hold 1.5 s → the in-flight state per Q51, then the Q52 state naming 阿杰 with the
      address 「A 座 12-03」; the fixture recorded exactly one select for 阿杰. Video frames: the fill grows from the
      left edge (sample the fill's right edge at two frame times, the second further right) and runs back after the
      early release.
- [ ] Case `bounty_select_failed` (`-uiVerifySelect failOnce`, then `notPending`, `noPayee`, `closed` as passes): the
      first hold shows the `failed` copy with 阿杰 still checked and nothing reported as selected; a second hold
      succeeds; `notPending` shows its copy and the list reloads; `closed` shows the closed state. Screenshots.
- [ ] Case `bounty_select_race` (`-uiVerifySelect taken`): hold → the alert title `ui.t('bounty.select.raced.title')` and
      the body naming 阿杰 (the fixture's actual helper); 好的 → the Q52 state for 阿杰.
- [ ] Checks; run each once; commit `feat(bounty): hold to choose a helper`.

## Task 7: Long-press block on an applicant row (5A)

**Files:** `ApplicantRows.tsx`, `block/{blockFlow,hooks}.ts` (+ test), case `bounty_applicant_block`

**Steps**

- [ ] `blockFlow` takes a `BlockedPerson` from any source (today it is fed the poster); unit test that a block from the
      applicant list emits `blocked(id)` to the select reducer and reloads the list, and that a failure keeps the row
      and shows `bounty.block.failed`.
- [ ] Wrap each row in `ContextMenu` with one destructive item 「屏蔽{name}」 (SF Symbol `hand.raised`); the action
      sheet uses `bounty.block.confirm.title` and `applicantBody` (ruling 8); during the call the row shows progress.
- [ ] Case `bounty_applicant_block`: long-press Hana → the menu shows 屏蔽Hana; confirm → Hana is gone, the hint count
      reads 1; with Hana chosen first, the block clears the check and the button returns to the Q46 state; 我的 →
      屏蔽名单 lists Hana. Screenshots.
- [ ] Checks; run once; commit `feat(bounty): block an applicant from the list`.

## Task 8: Selected and not-selected states in the detail (Q53, Q54 answered)

**Files:** `detail/{detailState,BountyDetailScreen,DetailRows}.ts(x)` (+ test), `detail/OutcomeActions.tsx`,
`board/{types,parse}.ts`, `shared/appliedStamp.tsx`, case `bounty_detail_outcome`

**Steps**

- [ ] `detailState.test.ts`: `myApplication.status = 'not_selected'` → action `notSelected` (sticker untilted, no stamp);
      `viewerRole = 'helper'` → `selected`; a pending write is never shown over a server outcome (an apply write older
      than the answer is dropped); `withdrawn` unchanged.
- [ ] Parse `helper` for poster and helper roles; ignore it for others.
- [ ] `OutcomeActions`: not selected per "Decided UI" (head ≤ 32 pt, copy, 「你写的」 with the note clamped to 3 lines like
      44A, 「看看附近别的悬赏」 → ruling 9); selected per Q53 (pinned line, address row in the grouped section with its
      footer). The not-selected state calls `markNotSelectedSeen` per Q54 after a successful load only (never for a
      seed or a failed load).
- [ ] Case `bounty_detail_outcome` (`LOCALES ['zh-Hans', 'ms']`): `-uiVerifyDetail notSelected` → 这次没选上 with
      小林选了别人…, the note, no `bounty-detail-stamp`, sticker untilted (pixel check of the sticker's bounding box
      against the tilted fixture), 看看附近别的悬赏 returns to the board top; the fixture recorded one seen mark;
      `-uiVerifyDetail selected` → 小林选了你 and the address row 「A 座 12-03」. Screenshots.
- [ ] Checks; run once; commit `feat(bounty): selected and not-selected outcomes in the detail`.

## Task 9: Worst-case data (break-ui)

**Files:** fixtures, case `bounty_applicants_worst`; fixes in Task 5–8 files

**Steps**

- [ ] Run `break-ui` on the applicant screen, the hold button and both outcome states with: 50 applicants, 40-character
      names, 140-code-point notes with and without spaces, 貘友 (four heads), `helpedCount` 128, a 60-code-point title,
      RM 500 and RM 1, ms copy, light and dark at the default text size.
- [ ] Case `bounty_applicants_worst` (`-uiVerifyApplicants worst`, `LOCALES ['zh-Hans', 'ms']`): the hold label with a
      40-character name stays on one line or wraps to two without clipping (decide by the screenshot; never truncate the
      verb); the tier keeps its width and the name truncates (42A); the full note is readable; with `fifty` the list
      scrolls to the last row above the pinned button; screenshots top, middle, end.
- [ ] Fix every break (layout only; copy changes go to the user); re-run; commit `fix(bounty): worst-case applicant
      list`.

## Task 10: Story map, README, rulings and the PR gate

**Files:** `docs/story-map.md`, `verification/ui/README.md`, this plan

**Steps**

- [ ] `docs/story-map.md` (`bounty.apply`):
      - `bounty.apply.select` → replace `ui` with `ui:bounty_select`, `ui:bounty_select_race`, add
        `unit:src/features/bounty/select/selectState.test.ts`, `unit:src/ui/holdSchedule.test.ts`, keep `device`
        written as `device: 按住时震动由轻到重、满了重重一下（真机）` and the two-session gap
      - new `bounty.apply.applicants` 「发布者看到所有申请人：名字、靠谱度、帮过几次、那句话，按申请先后；首次加载失败不显示成
        没人申请」 → `db:supabase/tests/bounty_applicants.test.sql`, `ui:bounty_applicants`,
        `unit:src/features/bounty/select/selectService.test.ts`
      - new `bounty.apply.select-failure` 「挑人失败保留选中的人、不自动重发；对方撤回、没有收款方式或悬赏已关闭时说明原因」 →
        `ui:bounty_select_failed`, `unit:src/features/bounty/select/selectState.test.ts`
      - new `bounty.apply.outcome` 「没选上的人看到「这次没选上」和不歪的贴纸；选中的人看到「{发布者}选了你」和精确地址」 →
        `ui:bounty_detail_outcome`, `unit:src/features/bounty/detail/detailState.test.ts`
      - `bounty.apply.seen` → add `ui:bounty_detail_outcome` (the server mark) and keep `ui` planned for the step 6 card
      - `bounty.apply.blocked` → add `ui:bounty_applicant_block`
      - new `bounty.apply.select-worst` 「50 个申请人、40 字名字、140 字留言都排得下，按住按钮不被盖住」 →
        `ui:bounty_applicants_worst`
      - with Q45 = B, add `gap: 发布者从首页卡片进入挑人页在第 6 步接上` to `bounty.apply.applicants`
      Test names exactly as in the files; `node scripts/check-story-map.mjs` passes.
- [ ] README: the four launch arguments, `uiVerifySelectedArgs`, `driver.press`, and every new case row.
- [ ] Device checklist entries (story-map `device:`): haptic ramp and the heavy impact; the hold with a thumb while the
      list is scrolling (no accidental start); VoiceOver double-tap path; Reduce Motion fill behaviour.
- [ ] `bun run verify:smoke` and `bun run verify:ui --affected` (zh-Hans light); open every screenshot.
- [ ] Record answers to 45–54 and anything changed during the build under "Deviations and rulings"; commit
      `docs(bounty): step 5 story map and verification notes`; open the PR with the mutation results in the body.

## Pre-flight conflicts

Tasks that share files or interfaces; run them in order, never in parallel.

| Shared file / interface | Tasks | Rule |
| --- | --- | --- |
| Migration and `bounty_applicants` JSON shape | 1 → 4 | Task 4 starts after Task 1 is committed; types copied from the SQL |
| `apply_to_bounty` signature (only if Q48 = B) | 1 | Step 4's `boardService.apply` and its tests change in Task 1's commit; the apply sheet passes the board origin |
| `src/lib/i18n/locales/bounty/*` | 2, then small additions in 5–9 | Task 2 adds every foreseeable key; later tasks append, never rename |
| `src/ui/theme/tokens.ts`, `docs/design-language.md` | 3 | Only Task 3; `design_tokens` case updated there |
| `src/ui/HoldButton.tsx` (shared path: selects every case) | 3 → 5, 6 | Built once; Tasks 5–6 consume, never fork it |
| `select/selectState.ts` events | 4 → 5, 6, 7 | Contract fixed in Task 4; Task 7 uses `blocked(id)` |
| `ApplicantsScreen.tsx`, `ApplicantRows.tsx`, `SelectFooter.tsx` | 5, 6, 7, 9 | 6 adds the hold wiring, 7 the context menu, 9 fixes layout last |
| `block/blockFlow.ts`, `block/hooks.ts` | 7 | Only Task 7; `bounty_block` (step 4) reruns there |
| `detail/*`, `board/{types,parse}.ts`, `shared/appliedStamp.tsx` | 8 | Only Task 8; `bounty_detail`, `bounty_apply_detail`, `bounty_withdraw` rerun there |
| `src/app/(tabs)/bounty/_layout.tsx` | 5 | Adds `applicants/[id]`; keeps the toolbar 「+」 and the step-4 screens untouched |
| `src/debug/BountyScenes.tsx`, `src/debug/scenes.tsx` (shared path) | 3, 5, 8 | Append scenes and fixture outcomes only |
| `verification/ui/driver.py` (shared path) | 6 | Only Task 6; runner unit tests rerun |
| `verification/ui/README.md`, `docs/story-map.md` | 10 | Only Task 10 |
| Step 6 (status screens, live source) running in parallel | — | Do not start step 6 until this PR merges: both change `detail/*` and the 悬赏 `_layout.tsx` |

## Not in this plan

| Item | Owning step |
| --- | --- |
| Bounty live-item source and home cards (「帮取快递 · 3 人申请，去选」, 「等小林选」, the one-time 「这次没选上」 card), `bountyAction` accessory kind, card-detail types in `src/lib` | Step 6 (unless Q45 = A) |
| Status screen 7A (timeline), 出发了, ETA strike, 完成, confirm, 「有问题」, cancel after selection | Step 6 |
| Poster cancels before selecting (closed, refund) and its entry point | Step 6 (with the status screen's ⋯) |
| The poster's own open bounty detail beyond the applicant screen | Step 6 |
| 「过期了 · 免费次数已退回」 one-time card | Step 6 (live source) |
| Push for new applications and selection | Step 11 |
| Gates and 先付 (applicants below a gate) | Step 12 |
| Applicant profile screen (tapping an applicant's name) | Not scheduled; canvas item with the profile screen |
| Chat with the selected helper | Foundation step 7 |
| Two-session race test in SQL | Known gap (`bounty.apply.select`) |

## Final acceptance

- [ ] Tasks 1–10 committed; `supabase test db`, `bun test`, `tsc`, lint on changed files, `format:check`,
      `design-check`, `check-specs`, `check-story-map` pass; mutation results in the PR body.
- [ ] Cases `bounty_applicants`, `bounty_select`, `bounty_select_failed`, `bounty_select_race`, `bounty_applicant_block`,
      `bounty_detail_outcome`, `bounty_applicants_worst` each ran once (zh-Hans light) with screenshots and the
      `bounty_select` video opened; the reruns named in Pre-flight conflicts ran once; `verify:smoke` passes. Dark, `en`
      and `ms` run at the bounty milestone.
- [ ] Device checklist entries added (Task 10).
- [ ] Answers to 45–54 and the build's deviations recorded below for the bounty spec's Implementation Record.

## Deviations and rulings

Collected for the bounty spec's Implementation Record (written when the bounty spec is implemented). One line each, with
the reason; "cost" is what it costs if the ruling is wrong.

### UI answers

- 45–54: not answered yet.
