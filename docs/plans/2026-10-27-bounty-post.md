# Bounty step 3: manual posting Implementation Plan

> **For agentic workers:** execute task by task. If a plan-execution skill is
> available (for example superpowers `subagent-driven-development` or
> `executing-plans`), use it. Track steps with checkboxes (`- [ ]`). When all
> tasks are done, run `spec-lifecycle` before opening the PR.

**Goal:** A signed-in user taps 「+」 on the 悬赏 tab, fills the 1A form (title, category, reward, plus optional rows),
reviews it on the 2A confirm screen with the cost line, and publishes. The draft stays on the device across closes,
failures and restarts. The confirm screen blocks publishing while the user has unpaid payments (「去付款」) or has
no free post and no coin (「需要 1 貘币」). Tapping 「+」 while blocked shows the reason once (13A).

**Architecture:** A new feature folder `src/features/bounty/` with a post service (Supabase and verify fixture), a
draft store persisted per user in `NSUserDefaults` (`Settings`), pure validation and mapping modules, and two
system screens in a nested Expo Router Stack presented as one page sheet (`src/app/bounty-post/`). The 悬赏 tab
gets a native toolbar 「+」. `SheetFrame` moves from `src/features/payment/` to `src/ui/` so both features can use it.
No SQL changes: the step 1 contracts (`publish_bounty`, `coin_balance`, `publish_blocked`) are consumed as built.

**Tech stack:** Expo SDK 57 (React Native 0.86), TypeScript 6, Expo Router (Stack inside a `pageSheet`), `@expo/ui`
SwiftUI (`Host`, `Form`, `Section`, `TextField`, `Picker`, `DatePicker`, `Button`, `ConfirmationDialog`), `bun test`,
Supabase JS client, `verification/ui` (Python + AXe). New dependency: `expo-crypto` (`randomUUID()`, docs:
https://docs.expo.dev/versions/v57.0.0/sdk/crypto/), installed with `bunx expo install expo-crypto`.

**Spec:** `docs/specs/2026-10-11-bounty-design.md` (approved): Implementation order step 3; Decisions rows Posting
entry, Form shape, Reward, Text limits, Category, Coin cost, Unpaid poster, Expiry, Location; Errors and degradation
rows "Posting … fails", "No balance and no free post left", "Publishing blocked by unpaid items"; UI/UX rows 1A, 2A,
13A and the screen classes (posting form and confirm are system screens). Canvas: page 05, board 「悬赏 · 开工前（一）
发布与申请」 (`BountyPickPost`), questions 1 and 2, option A, including the three extra 2A states. Built contracts:
`docs/plans/2026-10-26-bounty-schema.md` ("Rejection reasons") and `supabase/migrations/20261026001000_bounty_publish.sql`.

## Global constraints

- Zero comments in TypeScript and Python unless they explain unexpected behaviour or a hidden invariant (AGENTS.md
  Conventions). No JSDoc.
- iOS only; no Android code, stubs or scripts. Never disable code signing. `ios/` is never edited by hand; after
  `bunx expo install expo-crypto` run `pod install` in `ios/` before the next verify build.
- New dependency: `expo-crypto` only. No other packages. `expo-location` stays out of this step (board step 4).
- `src/features/bounty/` does not import any other feature (`payment`, `payee`, `home`, `account`). Routes in
  `src/app/` compose features. Shared code goes to `src/lib/` or `src/ui/`.
- Native UI: forms are `@expo/ui` SwiftUI `Form` in a `Host`; menus, date pickers, confirmation dialogs and alerts
  are the system ones; never imitate a platform control in RN. Pinned bottom actions use `SheetFrame` /
  `SheetActions` (moved to `src/ui/`) with `PillButton`.
- No user-facing string is hard-coded; every key exists in `zh-Hans`, `en` and `ms`
  (`src/lib/i18n/resources.test.ts` enforces parity and placeholders). Copy is written zh-Hans first; `ms` is checked
  for truncation.
- Tokens only: no raw colours, font sizes or font families in `src/features/bounty/` or `src/ui/`
  (`node scripts/design-check.mjs`).
- Every interactive element has a VoiceOver label and a 44 pt target; controls a case touches have a `testID`.
- Data integrity (AGENTS.md): the draft is persisted before publish is sent; a failed publish never clears it; a
  publish is never replayed automatically; the button shows progress until the RPC answers; a cost or blocked status
  that failed to load is shown as failed with 重试, never as "free" or "unblocked".
- Text lengths are counted in Unicode code points (`[...text].length`) to match Postgres `char_length`; titles,
  place labels and addresses are trimmed before counting, as the RPC does (`btrim`).
- Files under 500 lines; components under 300 lines.
- End of every task, judged by exit status (capture `$?` before any pipe): `bun test`, `bunx tsc --noEmit`,
  `bun run lint -- <changed .ts/.tsx files>`, `bun run format:check`, `node scripts/design-check.mjs` (tasks touching
  `src/`), `node scripts/check-story-map.mjs`, `node scripts/check-specs.mjs --dir docs/specs`. Each new UI case is run
  once by its author: `bun run verify:build` then `bun run verify:ui <case>` (zh-Hans light), screenshots opened before
  reporting. `bun run verify:smoke` runs once in Task 10.
- Commits: Conventional Commits with scope `bounty` (`feat(bounty): …`, `test(bounty): …`); no AI co-author lines.

## Decided UI (do not re-ask)

| Item | Decision | Source |
| --- | --- | --- |
| Only entry | The manual 「+」 opens the form; no 问小貘 path in v1 | Decisions "Posting entry" |
| Form shape | Full-height sheet, native grouped `Form`; fixed rows title, category, reward on top; optional rows as 「＋ 添加…」 rows that expand in place; exact address appears only after a place; no online/offline toggle | 1A; "Form shape" |
| Form chrome | 取消 left, title 发悬赏, 下一步 right (prominent); reward footer 「整数，RM 1–500。做完后由你直接付给对方。」; section header 「加点细节 · 都可以不填」; footer 「草稿只存在这台手机上，退出也不会丢。」; title row shows a `n/60` counter | Canvas 1A |
| Category | System menu (`Picker` with `pickerStyle('menu')`) over the eight slugs, each with its `CategorySticker` colour/glyph where the menu allows | 1A; "Category" |
| Reward | Number pad, whole RM 1–500, stored as `reward_sen = RM × 100` | 1A; "Reward" |
| Limits | Title ≤ 60, place label ≤ 80, description ≤ 500, exact address ≤ 120 | "Text limits" |
| Confirm | Pushed inside the same sheet; system screen titled 确认发布 with back; list-card preview, summary rows (place + exact address note, time, description first line), one 发布费 row, a refund footer, primary 发出去 pinned at the bottom | 2A |
| Cost states | Free: 「本月免费 · 还剩 n/3」, button 发出去. Coin: 「1 貘币 · 余额 N」, footer 「本月 3 次免费已用完…貘币退回」, button 「发出去 · 1 貘币」. Blocked: warning notice 「先付清再发新的」 listing the unpaid payments, primary 「去付款」, 发出去 disabled under it. No slot and no coin: 「1 貘币 · 余额 0」 in urgent, notice 「还差 1 貘币」 with the next free date and 「帮别人办成一单也会得貘币」, button 「需要 1 貘币」 disabled; no purchase | 2A extra states; "Coin cost"; "Unpaid poster" |
| Unpaid hint | Tapping 「+」 while `publish_blocked()` shows the reason once; the form still opens and the draft is kept; confirm blocks as in 2A | 13A |
| Draft | Unsent drafts stay on this device only | Data flow "Client"; KICKOFF 2026-10-11 |
| Failure | Progress until the RPC answers, then 「没发出去，再试一次」; the form stays filled; nothing replayed | Errors and degradation |
| After publish | The sheet closes. The fly-to-stack motion is step 9. The bounty shows up on the board (step 4) and in live cards (step 6) under the freshness rule | Brief; Implementation order 4, 6, 9 |
| Screen class | Form and confirm are everyday system screens: grouped background, type stickers only, no full-size mascot | Screen classes |
| Photo sticker row | Not shown until step 9 builds the cut-out | Implementation order 9 |

## Open UI questions (answer before Task 5 starts)

Answered 2026-10-27: all ★ (A) — canvas 16A–25A, spec UI table.

Each has a recommendation (★). Pace rule: no implementation task starts with an open UI question; Tasks 1–4 have no
UI and may start now.

1. **Where 「+」 sits on the 悬赏 tab.** The canvas never drew it.
   - A ★ Native toolbar button (`Stack.Toolbar` right, SF Symbol `plus`, label 「发悬赏」) in the 悬赏 nav bar, as on
     我的 → 收款方式. Always reachable, HIG standard.
   - B A 「+」 beside the 「能接的悬赏」 section title. Next to the list, but scrolls away and the board (step 4)
     owns that row.
   - C Both. Two entries for one action.
2. **How 13A shows the reason.**
   - A ★ The form sheet opens, then a system alert: title 「先付清再发新的」, body names the unpaid count and amount,
     buttons 「去付款」 and 「先写着」. One interruption per tap; nothing stays on the form.
   - B A warning `NoticeCard` at the top of the form for that session. Calmer, but it stays on screen, so it is not
     "once".
   - C Alert only the first time per blocked period (stored flag), silent afterwards. Fewer interruptions; the
     confirm screen still blocks.
3. **Place and exact address in this step.** The RPC needs coordinates with every place label; there is no place
   picker on the canvas, `expo-location` arrives in step 4 and maps in step 8.
   - A ★ Step 3 ships without the 地点 / 精确地址 rows; bounties post without a place (allowed). A place picker goes
     on the canvas before step 4 and is built there.
   - B Step 3 installs `expo-location` and offers 「用当前位置」 plus a typed label. Wrong when the place is not where
     the poster stands.
   - C Place search with MapKit `MKLocalSearchCompleter` in `modules/tapiro-kit` now. Right answer long-term, but a
     new native piece in a form step.
4. **Shape of the 「＋ 时间」 row.** The server allows a deadline, a window, or both; the canvas row says
   「截止或时间段」.
   - A ★ The row expands to a segmented `Picker` 截止 / 时间段 and the matching `DatePicker`(s) (compact style, now
     to now + 30 days, 5-minute steps). One kind at a time; a 「移除」 row collapses it.
   - B Two separate rows 「＋ 截止时间」 and 「＋ 时间段」, both allowed together.
   - C Deadline only in v1; window later.
5. **Validation feedback on 下一步.**
   - A ★ As the payee forms: 下一步 is always enabled; on tap the first error shows as an urgent `NoticeCard` at the
     top of the form and focus stays; the error clears on the next edit.
   - B 下一步 disabled until the three fixed fields are valid; length errors cannot happen (fields cap input).
   - C Inline red footer under each wrong section.
6. **How a draft is discarded.** 取消 and swipe-down keep it (canvas footer).
   - A ★ A red 「清空草稿」 row at the end of the form, shown only when the draft is not empty, confirmed by a system
     action sheet.
   - B 取消 on a non-empty draft asks 「保留草稿 / 删除草稿」 (Mail style); swipe-down blocked while dirty.
   - C No discard; the user clears fields by hand.
7. **Feedback after a successful publish in this step** (the board, live card and fly-to-stack land in steps 4, 6, 9,
   so nothing on screen changes yet).
   - A ★ Close the sheet with the success haptic (`notificationAsync(Success)`); the 「+」 then opens an empty form.
   - B Close the sheet and show a system alert 「发出去了」 with when it expires. Clear, but an alert for success is
     un-iOS and becomes redundant in step 9.
   - C Keep the sheet open on a 「发出去了」 page with 好的. A screen that step 9 replaces.
8. **Where 「去付款」 goes** (confirm screen and the 13A alert).
   - A ★ Close the post sheet (draft kept) and open the built pay sheet (`/pay/[id]`) for the oldest unpaid payment.
   - B Push the pay sheet over the post sheet (sheet on sheet).
   - C Close the post sheet and return to 悬赏 home, where the pay card is first in the stack.
9. **The poster line in the confirm preview card.** The canvas card shows 「小林 · 靠谱」; the tier read
   (`reputation_snapshots`) is not wired in the app yet.
   - A ★ Preview shows sticker, title, place label and time line, and reward; no poster line and no distance (it is
     your own post). Step 4's board card adds poster and tier.
   - B Add the poster name and tier now (a new read of `reputation_snapshots`).
10. **Defaults of the fixed fields on an empty draft.**
    - A ★ No category chosen (menu placeholder 「选类型」) and an empty reward; both required.
    - B Category defaults to 其他, reward empty.
    - C Category 其他 and reward RM 5 prefilled.

## Motion

| Motion | Purpose | Gate | Build |
| --- | --- | --- | --- |
| Optional row expands in place | continuity | Frequent form interaction: system Form insertion only | SwiftUI default row insertion via `@expo/ui` `withAnimation` default; no custom curve |
| Push form → confirm, back | navigation | System | Native Stack push |
| Sheet present / dismiss | navigation | System | Native page sheet |
| 发出去 progress | status | System | `PillButton loading` (built `ActivityIndicator`, finite by nature; no ESLint exception needed) |
| Success haptic on publish (if Q7 A) | feedback | Not motion; one haptic for one meaning (design-language 11) | `expo-haptics` success |
| Published sticker flies into the stack | continuity | Passed (spec) | **Not here: step 9** |

No `withRepeat`, no Reanimated in this step. If an answer above adds motion, it is offered through `animate-expo`
first.

## Contracts

Server (built, consumed as is):

```ts
// supabase.rpc('publish_bounty', PublishArgs) → PublishResult; replay with the same id returns the first outcome
type PublishArgs = {
  id: string;                // client uuid v4, one per draft
  title: string;             // trimmed 1..60
  category: BountyCategory;  // 8 slugs, src/lib/stickers/category.ts
  reward_sen: number;        // 100..50000, multiple of 100
  description: string | null;      // 1..500
  place_label: string | null;      // with latitude/longitude together, 1..80
  latitude: number | null;
  longitude: number | null;
  address: string | null;          // only with a place, 1..120
  starts_at: string | null;        // ISO; future; ≤ now + 30 d
  ends_at: string | null;          // > starts_at; needs starts_at
  deadline_at: string | null;      // future; ≤ now + 30 d; ≥ starts_at
};
type PublishResult = { id: string; status: 'open' | string; charge: 'free' | 'coin'; expiresAt: string };
// Rejections arrive as PostgrestError { code, message }: message is the slug.
//   'publish_blocked' (55000), 'no_balance' (55000), 'invalid_bounty' (22023), check violation code '23514'.
// supabase.rpc('coin_balance') → { coins: number; freePostsLeft: number; freePostsPerMonth: 3; nextFreeAt: string }
// supabase.rpc('publish_blocked') → boolean
// payments select (RLS: own rows) where payer_id = me and (state = 'due' or (state = 'marked_paid' and nudged_at
//   is not null)), with payee display names from profiles; isUnpaid() in src/lib/unpaid.ts mirrors the SQL
```

Client (new):

```ts
// src/features/bounty/post/types.ts
export type TimeChoice =
  | { kind: 'none' }
  | { kind: 'deadline'; deadlineAt: string }
  | { kind: 'window'; startsAt: string; endsAt: string };

export type PostDraft = {
  id: string;                 // uuid from expo-crypto; reused for every retry of this draft
  title: string;
  category: BountyCategory | null;
  rewardText: string;         // digits as typed
  description: string | null; // null = row not added
  time: TimeChoice;
  place: { label: string; latitude: number; longitude: number; address: string | null } | null; // Q3
  updatedAt: string;
};

export type DraftError =
  | 'titleEmpty' | 'titleTooLong' | 'categoryEmpty' | 'rewardEmpty' | 'rewardRange'
  | 'descriptionTooLong' | 'placeTooLong' | 'addressTooLong'
  | 'timePast' | 'timeTooFar' | 'windowOrder';

export type UnpaidSummary = { paymentId: string; payeeName: string; amountSen: number; createdAt: string };

export type PostStatus = {
  blocked: boolean;
  unpaid: UnpaidSummary[];    // oldest first
  coins: number;
  freePostsLeft: number;
  freePostsPerMonth: number;
  nextFreeAt: string;
};

export type CostLine =
  | { kind: 'free'; left: number; of: number }
  | { kind: 'coin'; balance: number }
  | { kind: 'none'; nextFreeAt: string }
  | { kind: 'blocked'; unpaid: UnpaidSummary[]; under: 'free' | 'coin' | 'none' };

export type PublishFailure = 'blocked' | 'noBalance' | 'invalid' | 'failed';
export type PublishOutcome = { ok: true; result: PublishResult } | { ok: false; reason: PublishFailure };

export type PostService = {
  status(): Promise<PostStatus>;
  publish(args: PublishArgs): Promise<PublishOutcome>;
};

// src/features/bounty/post/validate.ts
export function checkDraft(draft: PostDraft, now: Date): { ok: true; args: PublishArgs } | { ok: false; error: DraftError };
export function codePoints(text: string): number;
export function parseReward(text: string): number | null; // whole RM 1..500 → sen, else null

// src/features/bounty/post/cost.ts
export function costLine(status: PostStatus): CostLine;

// src/features/bounty/post/publishError.ts
export function toFailure(error: unknown): PublishFailure;

// src/features/bounty/post/draftStore.ts
export function createDraftStore(storage: DraftStorage, newId: () => string): {
  load(userId: string): PostDraft;          // stored draft or a fresh one with a new id
  update(userId: string, patch: Partial<PostDraft>): void; // persists synchronously
  clear(userId: string): void;              // only after a successful publish or 清空草稿
  isEmpty(draft: PostDraft): boolean;
  subscribe(listener: () => void): () => void;
  getSnapshot(): PostDraft | null;
};
export type DraftStorage = { read(userId: string): unknown; write(userId: string, draft: PostDraft | null): void };
```

Verify launch arguments (fixture service, `uiVerify` only):

| Argument | Values | Effect |
| --- | --- | --- |
| `-uiVerifyPostCost` | `free` (default, 2/3 left), `last` (1/3), `coin` (0 free, 4 coins), `none` (0 free, 0 coins) | `status()` cost fields |
| `-uiVerifyUnpaid` | `none` (default), `two` (阿杰 RM 15, Lily RM 6), `old` (one payment 8 days old) | `status()` blocked + unpaid; `old`/`two` also make `publish` reject `blocked` |
| `-uiVerifyPublish` | `ok` (default), `failOnce` (first call `failed`, then ok), `fail` (always `failed`) | `publish()` outcome; `none` cost makes `publish` reject `noBalance` |
| `-uiVerifyStatusFail` | `1` | first `status()` throws, then succeeds |
| `-uiVerifyBountyDraft` | `none` (default), `demo`, `worst` | seeds the stored draft before the first read |

The fixture `publish` records every id it accepted and returns the first outcome for a repeated id, like the RPC.

## File structure

| Action | Path | Responsibility |
| --- | --- | --- |
| Create | `src/features/bounty/index.ts` | Public exports: `PostForm`, `PostConfirm`, `useStartPost`, fixture ids |
| Create | `src/features/bounty/post/types.ts` | Types above |
| Create | `src/features/bounty/post/validate.ts` (+ `.test.ts`) | Code-point limits, reward parse, time rules, `checkDraft` → `PublishArgs` |
| Create | `src/features/bounty/post/cost.ts` (+ `.test.ts`) | `costLine`, next-free date in Malaysia time |
| Create | `src/features/bounty/post/publishError.ts` (+ `.test.ts`) | PostgrestError → `PublishFailure` |
| Create | `src/features/bounty/post/postService.ts` (+ `.test.ts`) | Supabase `status()` and `publish()` |
| Create | `src/features/bounty/post/postService.integration.ts` | Local-stack round trip (add to `test:stack`) |
| Create | `src/features/bounty/post/fixturePostService.ts` (+ `.test.ts`) | Verify-mode service per the argument table |
| Create | `src/features/bounty/post/draftStore.ts` (+ `.test.ts`) | Draft lifecycle, id reuse, persistence |
| Create | `src/features/bounty/post/draftStorage.ts` | `Settings` key `tapiro.bountyDraft.<userId>`; fixture seed in verify mode |
| Create | `src/features/bounty/post/fixtureDrafts.ts` | `demo` and `worst` drafts |
| Create | `src/features/bounty/post/services.ts` | Wires fixture or Supabase service, draft store, `randomUUID` |
| Create | `src/features/bounty/post/usePostFlow.ts` | Status load, publish with in-flight guard, failure state, `useStartPost` (13A) |
| Create | `src/features/bounty/post/PostForm.tsx` | 1A form: fixed rows, error notice, chrome |
| Create | `src/features/bounty/post/OptionalRows.tsx` | 「＋ 添加…」 rows: time, description (place per Q3) |
| Create | `src/features/bounty/post/PostConfirm.tsx` | 2A confirm: preview, summary, cost row, notices, pinned actions |
| Create | `src/features/bounty/post/CostSection.tsx` | Cost row and its four states |
| Create | `src/ui/TaskCard.tsx` | List-card layout (sticker, title, meta line, reward); reused by step 4 |
| Move | `src/features/payment/SheetFrame.tsx` → `src/ui/SheetFrame.tsx` | Shared pinned-actions frame; payment imports updated; `testID` becomes a prop (payment passes `pay-sheet`) |
| Create | `src/app/bounty-post/_layout.tsx` | Nested Stack: `index` (form), `confirm` |
| Create | `src/app/bounty-post/index.tsx`, `src/app/bounty-post/confirm.tsx` | Routes composing the bounty feature with `useSignedInUser` |
| Modify | `src/app/_layout.tsx` | Register `bounty-post` as a `pageSheet` with `headerShown: false` (inner Stack owns headers) |
| Modify | `src/app/(tabs)/bounty/index.tsx` or `_layout.tsx` | 「+」 toolbar button (Q1) calling `useStartPost` |
| Create | `src/lib/i18n/locales/bounty/{zh-Hans,en,ms}.ts` | `bounty.category.*`, `bounty.post.*` copy |
| Modify | `src/lib/i18n/locales/{zh-Hans,en,ms}.ts` | Import the `bounty` namespace |
| Create | `src/debug/BountyScenes.tsx`; Modify `src/debug/scenes.tsx` | Scenes `bounty-post`, `bounty-confirm` |
| Create | `verification/ui/bounty.py` | Helpers: `open_post`, `fill_fixed`, `next_step`, `assert_cost` |
| Create | `verification/ui/cases/bounty_post_*.py` | Cases listed per task |
| Modify | `verification/ui/README.md` | Arguments and cases rows |
| Modify | `docs/story-map.md` | `bounty.post.*` rows: coverage names and new criteria |
| Modify | `package.json`, `bun.lock`, `app.json` (if the plugin needs it) | `expo-crypto` via `bunx expo install` |

## Task 1: Draft model, validation, cost line and failure mapping (no UI)

**Files:** `src/features/bounty/post/{types,validate,cost,publishError}.ts` and their `.test.ts`

**Interfaces**

- Consumes: `BountyCategory`, `bountyCategory` from `src/lib/stickers/category.ts`; `isUnpaid` from `src/lib/unpaid.ts`
- Produces: `PostDraft`, `DraftError`, `checkDraft`, `parseReward`, `codePoints`, `costLine`, `toFailure` (Tasks 2–8)

**Steps**

- [ ] Write failing tests in `validate.test.ts`: title `'  '` → `titleEmpty`; 60 code points with emoji (`'😀'.repeat(60)`)
      passes and 61 fails `titleTooLong` (the JS `.length` would be 120); reward `''` → `rewardEmpty`; `'0'`, `'501'`,
      `'1.5'`, `'08'`-style leading zeros (accept `'08'` as 8), `'５'` (full-width) → expected values; RM 1 → 100 sen,
      RM 500 → 50000; description 500 ok, 501 → `descriptionTooLong`; empty description after trim → `null` arg; deadline
      in the past → `timePast`; deadline beyond 30 days → `timeTooFar`; window with end ≤ start → `windowOrder`; place
      label 81 → `placeTooLong`; address 121 → `addressTooLong`; address without place cannot be built (type-level).
      `checkDraft` returns exact `PublishArgs` (snake_case names of the RPC, ISO strings, `null` for absent).
- [ ] Write failing tests in `cost.test.ts`: `free` 2/3, `last` 1/3, `coin` balance 4, `none` with `nextFreeAt`, blocked
      wins over each of the three; unpaid sorted oldest first.
- [ ] Write failing tests in `publishError.test.ts`: `{ message: 'publish_blocked', code: '55000' }` → `blocked`;
      `no_balance` → `noBalance`; `invalid_bounty` and code `23514` → `invalid`; `TypeError('Network request failed')`,
      `undefined`, unknown slugs → `failed`.
- [ ] Implement the four modules to pass.
- [ ] Run the end-of-task checks; commit `feat(bounty): post draft validation, cost line and failure mapping`.

## Task 2: Post service, fixtures and `expo-crypto`

**Files:** `postService.ts` (+ test), `postService.integration.ts`, `fixturePostService.ts` (+ test), `services.ts`,
`package.json`, `bun.lock`

**Interfaces**

- Consumes: `getSupabase()` from `src/lib/supabase`; `uiVerify`, `uiVerifyArgument` from `src/lib/uiVerify.ts`
- Produces: `PostService`, `postService` singleton, `newDraftId()` (Tasks 3, 7, 8)

**Steps**

- [ ] `bunx expo install expo-crypto`; `pod install` in `ios/`; confirm `randomUUID` in
      `node_modules/expo-crypto/build/*.d.ts`.
- [ ] Unit test `postService.test.ts` with a stub client: `status()` calls `publish_blocked` and `coin_balance` and
      the unpaid payments read in parallel, maps names from `profiles`, filters with `isUnpaid`; `publish()` passes
      the args unchanged and maps errors through `toFailure`; a thrown network error becomes `{ ok: false, reason: 'failed' }`.
- [ ] Unit test `fixturePostService.test.ts`: every argument row in "Verify launch arguments"; a repeated id returns the
      first outcome and records one publish; `failOnce` then ok with the same id publishes once.
- [ ] Implement both services and `services.ts` (fixture when `uiVerify`, else Supabase).
- [ ] `postService.integration.ts` against the local stack (`bun run db:start`): sign up a user, `status()` shows
      `freePostsLeft` 3; publish → `charge: 'free'`; same id again → same result and `freePostsLeft` 2 (one charge);
      add it to the `test:stack` script.
- [ ] Checks; commit `feat(bounty): post service with verify fixtures`.

## Task 3: Draft store on the device

**Files:** `draftStore.ts` (+ test), `draftStorage.ts`, `fixtureDrafts.ts`

**Interfaces**

- Consumes: `newDraftId` (Task 2), `Settings` from `react-native`
- Produces: `draftStore` (Tasks 5–8)

**Steps**

- [ ] Failing tests with an in-memory `DraftStorage`: `load` on nothing returns an empty draft with a new id and does
      not write; `update` writes immediately and `load` after a "restart" (new store, same storage) returns it; the id
      stays the same across updates and failed publishes; `clear` removes it and the next `load` has a new id; drafts
      are per user (user B never sees A's draft); a corrupt stored value (wrong shape, unknown category) is dropped to
      an empty draft without throwing; `isEmpty` is true only when every field is blank.
- [ ] Implement; `draftStorage.ts` uses `Settings.get/set` under `tapiro.bountyDraft.<userId>` (synchronous, so the
      draft is persisted before publish is sent). In verify mode `-uiVerifyBountyDraft demo|worst` seeds the fixture
      user's key once at module load.
- [ ] `fixtureDrafts.ts`: `demo` = 「帮我取个快递」, `pickup`, RM 8, deadline today 18:00 (or +2 h if past), description
      「Shopee 包裹在 Sunway Geo 管理处…」; `worst` = 60-code-point title mixing Chinese, Latin and one emoji, `other`,
      RM 500, 500-code-point description, a window of the longest locale format.
- [ ] Checks; commit `feat(bounty): keep the post draft on the device`.

## Task 4: Copy in three languages

**Files:** `src/lib/i18n/locales/bounty/{zh-Hans,en,ms}.ts`, the three root locale files

**Steps**

- [ ] Add `bounty.category.{pickup,buy,queue,handle,move,accompany,study,other}` (代取, 代买, 代排, 代办, 搬运, 陪同,
      课业, 其他) and `bounty.post.*`: form (title placeholder, counter, labels 类型 / 赏金, 选类型, reward footer, section
      header, 「＋ 时间」, 截止 / 时间段, 开始 / 结束, 「＋ 说明」, 移除, draft footer, 清空草稿 + action-sheet copy,
      取消, 发悬赏, 下一步, every `DraftError`), confirm (确认发布, 发布费, 本月免费, 还剩 {{left}}/{{of}}, 1 貘币 · 余额
      {{balance}}, three footers, 「发出去」, 「发出去 · 1 貘币」, 「需要 1 貘币」, 「去付款」, 「先付清再发新的」 with
      plural/one-old variants naming names and amounts, 「还差 1 貘币」 with `{{date}}`, earn line, 「没发出去，再试一次」,
      cost load failed + 重试, `invalid` copy 「有一项要改一下」 that returns to the form), 13A alert copy (Q2), the 「+」
      label 「发悬赏」. Plural keys use i18next `_one` / `_other`.
- [ ] Write zh-Hans first, then en, then ms; keep ms within the 1A row widths (checked by the `ms` cases).
- [ ] `bun test src/lib/i18n` passes (parity, placeholders); commit `feat(bounty): posting copy in zh-Hans, en, ms`.

## Task 5: Route, 「+」 and the 1A form with fixed rows

Starts only after open questions 1, 5, 6 and 10 are answered.

**Files:** `src/ui/SheetFrame.tsx` (moved), payment imports, `src/app/bounty-post/*`, `src/app/_layout.tsx`, the 悬赏
tab route, `PostForm.tsx`, `src/features/bounty/index.ts`, `src/debug/BountyScenes.tsx`, `src/debug/scenes.tsx`,
`verification/ui/bounty.py`, cases `bounty_post_form`, `bounty_post_draft`

**Interfaces**

- Consumes: `draftStore`, `checkDraft`, `CategorySticker`, `NoticeCard`, `SheetFrame`
- Produces: `PostForm({ userId, onNext, onClose })`, route `/bounty-post`

**Steps**

- [ ] Move `SheetFrame`/`SheetActions`/`SheetLayer` to `src/ui/SheetFrame.tsx` with a `testID` prop; update the
      payment imports; `pay_*` cases are selected by the shared path and run at the milestone.
- [ ] Prove the nested Stack in a page sheet first: `src/app/bounty-post/_layout.tsx` with `index` and `confirm`,
      registered in the root `Stack.Protected guard={stage === 'ready'}` as `{ presentation: 'pageSheet', headerShown:
      false }`; the inner Stack shows a native header with back on `confirm`. Run it once on the Simulator before
      building the form. If the inner header or back does not render, stop and report (do not fake a header in RN).
- [ ] 「+」 per Q1 with `testID="bounty-post-open"` and label `t('bounty.post.open')`; it calls `router.push('/bounty-post')`.
- [ ] `PostForm`: toolbar 取消 (`bounty-post-cancel`) / title / 下一步 (`bounty-post-next`, prominent, accent tint);
      `Form` sections: title `TextField` (`bounty-post-title`, `maxLength` 60 as a guard, counter `n/60`), category
      `Picker` menu (`bounty-post-category`, placeholder per Q10), reward `TextField` with `keyboardType('number-pad')`
      and an `RM` leading label (`bounty-post-reward`), reward footer; error `NoticeCard` per Q5
      (`bounty-post-error`); draft footer; 清空草稿 per Q6 (`bounty-post-clear`). Every edit calls `draftStore.update`.
      下一步 runs `checkDraft`; valid → `onNext()` pushes `confirm`.
- [ ] Scene `bounty-post` renders `PostForm` for the fixture user with `onNext` and `onClose` as no-ops that set a
      visible marker, for cases that only need the form.
- [ ] Case `bounty_post_form` (DEPS `src/features/bounty/`, `src/app/bounty-post/`, `src/app/(tabs)/bounty/`,
      `verification/ui/bounty.py`; `ARGS -uiVerifySignedIn onboarded`; `LOCALES ['zh-Hans', 'ms']`): 「+」 opens the
      sheet titled `ui.t('bounty.post.title')`; 下一步 on empty shows `bounty.post.error.titleEmpty`; the category menu
      lists all eight `ui.t('bounty.category.*')` labels; typing 0 and 501 shows `rewardRange`; a valid form reaches
      `ui.t('bounty.post.confirm.title')`; every touched control passes `assert_touch_target`; screenshot of the filled
      form and the error; a pixel check that the background is `systemGroupedBackground` in the run's appearance.
- [ ] Case `bounty_post_draft`: type a title and reward, 取消, reopen → values kept; swipe the sheet down, reopen →
      kept; relaunch the app → kept; 清空草稿 → confirm → fields empty. Each assertion reads the field value before and
      after, so it fails if the draft were not restored.
- [ ] Checks; run both cases once; commit `feat(bounty): post form with fixed rows and a device draft`.

## Task 6: Optional rows

Starts after Q3 and Q4.

**Files:** `OptionalRows.tsx`, `PostForm.tsx`, case `bounty_post_optional`

**Steps**

- [ ] Rows 「＋ 时间」 (`bounty-post-add-time`) and 「＋ 说明」 (`bounty-post-add-description`) as `Button` rows with
      SF Symbol `plus`; tapping replaces the row in place with the real input. Time per Q4: segmented `Picker`
      (`bounty-post-time-kind`), `DatePicker`(s) bounded now…now + 30 d (`bounty-post-deadline`,
      `bounty-post-start`, `bounty-post-end`), and 移除 (`bounty-post-remove-time`). Description: multi-line
      `TextField` (vertical axis, 3–8 lines, `maxLength` 500, counter `n/500`), 移除 when empty.
- [ ] Place and exact address per Q3. With A: no rows, and `place` stays `null`. With B or C: 「＋ 地点」, and 精确地址
      appears only after a place exists (1A), footer 「只给选中的人看」.
- [ ] No photo-sticker row (step 9).
- [ ] Unit additions in `validate.test.ts` for any rule the rows add.
- [ ] Case `bounty_post_optional` (`LOCALES ['zh-Hans', 'ms']`): add time, choose 截止, pick a time, add 说明, type text;
      the counter reads the code-point count; 移除 collapses the time row back to 「＋ 时间」; reaching confirm shows the
      chosen time and the description's first line. Screenshots with rows collapsed and expanded.
- [ ] Checks; run once; commit `feat(bounty): optional time and description rows`.

## Task 7: Confirm screen 2A and publishing

Starts after Q7, Q8 and Q9.

**Files:** `src/ui/TaskCard.tsx`, `PostConfirm.tsx`, `CostSection.tsx`, `usePostFlow.ts`, `src/app/bounty-post/confirm.tsx`,
scene `bounty-confirm`, cases `bounty_post_publish`, `bounty_post_coin`, `bounty_post_no_balance`, `bounty_post_blocked`,
`bounty_post_failed`

**Interfaces**

- Consumes: `postService`, `draftStore`, `checkDraft`, `costLine`, `createInFlightGuard` (`src/lib/inFlightGuard.ts`),
  `PillButton`, `NoticeCard`, `SheetFrame`, `formatRinggit`
- Produces: `PostConfirm({ userId, onPublished, onPay(paymentId), onBack })`

**Steps**

- [ ] Unit tests for `usePostFlow` logic (a plain reducer in `usePostFlow.ts`, tested without React): status
      `loading → ready | failed`; publish allowed only in `ready` and not `blocked`/`none`; publish sets `busy`, a
      second tap while busy does nothing; `failed` keeps the draft and the id; `blocked`/`noBalance` rejection reloads
      status and shows the matching state; `invalid` returns the user to the form with its error; success clears the
      draft once and calls `onPublished` once.
- [ ] `TaskCard` in `src/ui`: category sticker (≤ 48 pt, type icon only), title (wraps, 2 lines max on the preview),
      meta line (place label · time), reward in `--text-reward` SF Rounded; no raw sizes. Preview content per Q9.
- [ ] `PostConfirm`: `SheetFrame` with the preview section, summary section (time with the same formatter the board
      will use, description first line; place rows per Q3), `CostSection` (`bounty-post-cost`) showing exactly one
      state of "Decided UI → Cost states", the refund footer, and pinned `SheetActions`:
      - free / coin: `PillButton` 发出去 or 「发出去 · 1 貘币」 (`bounty-post-publish`), `loading` while busy;
      - blocked: 「去付款」 primary (`bounty-post-pay`) above a disabled 发出去;
      - none: disabled 「需要 1 貘币」 (`bounty-post-publish`, disabled);
      - status loading: disabled 发出去; status failed: urgent notice 「发布费没加载出来」 with 重试
        (`bounty-post-cost-retry`) and no cost value shown.
      While busy: header back hidden and the sheet's swipe-to-dismiss off (`gestureEnabled: false`), restored after
      the answer.
- [ ] Publish: `draftStore` already holds the latest values (synchronous write); `checkDraft` at tap time (times may
      have passed) → `postService.publish(args)` with the draft's id. Success → `draftStore.clear`, the post-publish
      behaviour per Q7, `router.dismiss` of the sheet. Failure `failed` → urgent notice 「没发出去，再试一次」
      (`bounty-post-failed`) and the button stays 发出去; the retry sends the same id. Nothing retries automatically.
- [ ] 「去付款」 per Q8 (with A: `router.dismiss()` then `router.push('/pay/[id]')` with the oldest unpaid id; the route
      composes it, the feature only calls `onPay(id)`).
- [ ] Scene `bounty-confirm` renders `PostConfirm` with the `demo` draft for cases that start on confirm.
- [ ] Cases (all `ARGS -uiVerifySignedIn onboarded -uiVerifyBountyDraft demo` plus the row's arguments; DEPS as Task 5
      plus `src/ui/TaskCard.tsx`, `src/ui/SheetFrame.tsx`):
      - `bounty_post_publish` (`-uiVerifyPostCost free`): the preview shows the title, `RM 8`; the cost row reads
        `ui.t('bounty.post.cost.free', left=2, of=3)`; 发出去 is pinned below the form (`pay.assert_pinned` pattern,
        44 pt); tapping it shows progress, the sheet closes, home is back, and reopening 「+」 shows an empty form
        (the draft was cleared). Video of the tap.
      - `bounty_post_coin` (`coin`): cost `1 貘币 · 余额 4`, coin footer, button 「发出去 · 1 貘币」; publish succeeds.
      - `bounty_post_no_balance` (`none`, `LOCALES ['zh-Hans', 'ms']`): urgent balance 0, 「还差 1 貘币」 notice with the
        formatted next-free date, the earn line, disabled 「需要 1 貘币」; tapping it does nothing (sheet stays, draft
        stays); no purchase control on screen.
      - `bounty_post_blocked` (`-uiVerifyUnpaid two`, `LOCALES ['zh-Hans', 'ms']`): notice 「先付清再发新的」 names 阿杰
        RM 15 and Lily RM 6; 「去付款」 primary, 发出去 disabled; 「去付款」 opens the pay sheet for 阿杰's payment
        (per Q8); reopening 「+」 still shows the draft.
      - `bounty_post_failed` (`-uiVerifyPublish failOnce`): first 发出去 shows 「没发出去，再试一次」 and the form values
        are intact after going back; the second 发出去 succeeds and closes the sheet. A `-uiVerifyStatusFail 1` pass
        in the same case shows the cost-failed notice, not a free line, until 重试.
- [ ] Checks; run each case once; commit `feat(bounty): confirm screen with cost line, blocked states and publish`.

## Task 8: 13A hint on 「+」

Starts after Q2.

**Files:** `usePostFlow.ts` (`useStartPost`), the 悬赏 tab route, case `bounty_post_unpaid_hint`

**Steps**

- [ ] Unit test: `useStartPost` logic opens the form immediately, requests `status()` once per tap, shows the hint only
      when `blocked` is true, and shows nothing when the status load fails (the confirm screen will show the failure).
- [ ] Implement per Q2; the hint's 「去付款」 follows Q8; its other button leaves the form open with the draft.
- [ ] Case `bounty_post_unpaid_hint` (`-uiVerifyUnpaid old`): tapping 「+」 shows the reason (the 8-day variant
      copy) over the open form; the other button leaves the form with the seeded draft; going to confirm shows the 2A
      blocked state. A second pass without `-uiVerifyUnpaid` asserts no hint appears (`ui.gone`), so the first
      assertion can fail.
- [ ] Checks; run once; commit `feat(bounty): show the unpaid reason when 「+」 is tapped`.

## Task 9: Worst-case data (break-ui)

**Files:** `fixtureDrafts.ts`, case `bounty_post_worst`; fixes found in Tasks 5–7 files

**Steps**

- [ ] Run `break-ui` on the form and confirm with: the `worst` draft (60-code-point title, 500-code-point description,
      RM 500), an RM 1 draft, a draft with no optional rows, `-uiVerifyFixture worst` (40-character names in the
      blocked notice with RM 12,345.60), two and one unpaid payments, ms copy, light and dark at the default text size.
- [ ] Case `bounty_post_worst` (`LOCALES ['zh-Hans', 'ms']`, `-uiVerifyBountyDraft worst -uiVerifyUnpaid two
      -uiVerifyFixture worst`): the title wraps without truncating the reward; the reward reads `RM 500` in full; the
      pinned buttons stay 44 pt and fully above the home indicator; the notice text is complete after scrolling; the
      description counter reads 500/500. Screenshots of form and confirm in both scroll positions.
- [ ] Fix every break found (layout only; no copy shortening without the user), re-run the case; commit
      `fix(bounty): worst-case layout of the post form and confirm`.

## Task 10: Story map, README and the PR gate

**Files:** `docs/story-map.md`, `verification/ui/README.md`, this plan ("Deviations and rulings")

**Steps**

- [ ] `docs/story-map.md`, story `bounty.post` stays `building` (ai-draft, sticker and photo are later steps):
      - `bounty.post.manual` → `ui:bounty_post_form, ui:bounty_post_publish`
      - `bounty.post.limits` → add `unit:src/features/bounty/post/validate.test.ts`, `ui:bounty_post_form`
      - `bounty.post.cost` → add `unit:src/features/bounty/post/cost.test.ts`, `ui:bounty_post_coin`
      - `bounty.post.publish-blocked` → add `ui:bounty_post_blocked`
      - `bounty.post.no-balance` → add `ui:bounty_post_no_balance`
      - `bounty.post.replay` → add `unit:src/features/bounty/post/fixturePostService.test.ts`,
        `int:src/features/bounty/post/postService.integration.ts`
      - new `bounty.post.draft` 「草稿只存在这台手机上：关掉、失败、重启都还在，发出去后才清空」 →
        `unit:src/features/bounty/post/draftStore.test.ts`, `ui:bounty_post_draft`
      - new `bounty.post.optional` 「时间和说明按需添加，在原位展开」 → `ui:bounty_post_optional`
      - new `bounty.post.failure` 「发布失败显示没发出去，表单保持，重试用同一条，不自动重发」 →
        `unit:src/features/bounty/post/usePostFlow.test.ts`, `ui:bounty_post_failed`
      - new `bounty.post.unpaid-hint` 「有欠款时点 + 先提示一次原因，表单照样打开」 → `ui:bounty_post_unpaid_hint`
      - new `bounty.post.worst` 「60 字标题、500 字说明、RM 500 和 RM 1 在表单和确认页都排得下」 → `ui:bounty_post_worst`
      Use the test names exactly as written in the files. `node scripts/check-story-map.mjs` passes.
- [ ] README: add the five launch arguments and the ten case rows.
- [ ] Run `bun run verify:smoke` and `bun run verify:ui --affected` (zh-Hans light); open every screenshot.
- [ ] Record deviations and rulings (answers to Q1–Q10, anything changed during build) under "Deviations and
      rulings" in this plan; commit `docs(bounty): step 3 story map and verification notes`.

## Deviations and rulings

Collected for the bounty spec's Implementation Record (written when the bounty spec is implemented, not in step 3).

**Answers to Q1–Q10 (16A–25A):** all A. 「+」 is a native `Stack.Toolbar` button on 悬赏; 13A is a system alert 「先付清再发新的」
with 先写着 / 去付款 over the opened form; no place or exact-address rows; the time row is a segmented 截止 / 时间段 with compact
date pickers; validation is an urgent `NoticeCard` on 下一步; 清空草稿 is a red row with a system action sheet; after
publish the sheet closes with the success haptic; 去付款 closes the post sheet (draft kept) and opens `/pay/[id]` for the
oldest unpaid payment; the preview has no poster line or distance; an empty draft has no category and no reward.

**Changed during the build:**

1. Draft clearing wrote `null` to `Settings`, which RN drops, so a cleared or published draft came back after a relaunch
   (Task 3 code). Clearing now writes `''`. `-uiVerifyBountyDraft none` now clears the stored draft; omitted keeps it.
2. `@expo/ui` `TextField` can miss the last `onTextChange` when keys arrive fast; the form reads the native values back
   on blur, 下一步 and 取消. The counter can lag one character while typing.
3. Text fields only focus inside their 22 pt text frame; `FieldRow` makes the whole 44 pt row focus the field. The
   system menu `Picker` (34 pt high, full row width) and the segmented control (32 pt) keep their system size.
4. 「+」, 取消 and 下一步 are toolbar buttons without identifiers; cases find them by their localized label.
5. `keyboardType('numeric')` (maps to the number pad) instead of `number-pad`, which `@expo/ui` 57 does not offer.
6. No 5-minute minute step in the date pickers (`@expo/ui` has no minute interval); new times start on a 5-minute step.
7. Optional rows appear without `withAnimation` (React-driven rows; `withAnimation` animates native state only).
8. 「移除」 for the description shows only while it is empty.
9. A local `checkDraft` failure at publish time returns to the form with its error (`formError` store); a server
   `invalid` shows 「有一项要改一下」 with 回去修改.
10. Blocked confirm also shows the underlying cost row under the warning; the 0-coin state is an urgent notice with the
    next free date (Malaysia day) and the earn line, no purchase control.
11. `TaskCard` is a SwiftUI composition (sticker hosted from RN): an RN row inside `RNHostView` in a Form row was
    measured at its unwrapped width and pushed RM 500 off the card (Task 9). Step 4's board may need its own list row.
12. Publish callbacks are passed per call (`flow.publish(handlers)`) instead of through a ref (React Compiler lint).
13. `-uiVerifyStatusFail` is consumed by the 「+」 status check, so the cost-failure case starts on `bounty-confirm`.
14. Copy added: confirm summary keys (today, tomorrow, deadlineAt, windowAt, time, description, rewardLabel) and debug
    scene titles in three locales; en/ms day words lower-case inside sentences. en/ms still need the copy review.

## Not in this plan

| Item | Owning step |
| --- | --- |
| Place picker / place search, and the 地点 · 精确地址 rows (if Q3 = A) | Step 4 (needs `expo-location`; canvas item first) |
| Board list, distance, where the published bounty appears for others | Step 4 |
| Live card 「等人申请」 for the poster, the bounty live-item source | Step 6 |
| Close (cancel) an open bounty from the UI (`close_bounty` exists) | Step 6 status screen |
| Photo → die-cut sticker row and upload | Step 9 |
| Publish fly-to-stack animation and card pop | Step 9 |
| 问小貘 drafting into the confirm form with 撤销 | Step 10 (after foundation step 8) |
| Buying 貘币 | Foundation step 5 |
| Push after the first post | Step 11 (after foundation step 9) |
| Gates and 先付 options in the form | Step 12, by decision |

## Final acceptance

- [ ] All tasks committed; `bun test`, `bunx tsc --noEmit`, lint on changed files, `bun run format:check`,
      `node scripts/design-check.mjs`, `check-specs`, `check-story-map` pass; `bun run test:stack` passes against the
      local stack.
- [ ] Cases `bounty_post_form`, `bounty_post_draft`, `bounty_post_optional`, `bounty_post_publish`, `bounty_post_coin`,
      `bounty_post_no_balance`, `bounty_post_blocked`, `bounty_post_failed`, `bounty_post_unpaid_hint`,
      `bounty_post_worst` each ran once (zh-Hans light) with screenshots opened; `verify:smoke` passes. Dark, `en` and
      `ms` run at the bounty milestone.
- [ ] Deviations and rulings collected for the spec's Implementation Record (written when the bounty spec is
      implemented, not in this step).
